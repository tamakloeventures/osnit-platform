const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// Load environment variables FIRST
dotenv.config();

const app = express();

// Create Prisma with driver adapter (required for Prisma 7)
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Make Prisma available globally so services can use it
global.prisma = prisma;

// NOW import services (they depend on global.prisma)
const aiService = require('./services/aiService');
const collectionService = require('./services/collectionService');
const vettingService = require('./services/vettingService');

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// ============ HEALTH CHECK ============
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'Error',
      database: 'disconnected',
      error: error.message,
    });
  }
});

// ============ ALERTS ============
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      include: { protectee: true, vetting: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/alerts', async (req, res) => {
  try {
    const {
      source,
      content,
      url,
      riskScore,
      protecteeId,
      author,
      location,
      platform,
      createdBy,
    } = req.body;

    const alert = await prisma.alert.create({
      data: {
        source: source || 'Unknown',
        content: content || 'No content',
        url: url || null,
        riskScore: riskScore || 50,
        aiConfidence: 0.75,
        status: 'PENDING',
        protecteeId: protecteeId,
        author: author || null,
        location: location || null,
        platform: platform || null,
        createdBy: createdBy || 'System',
        sourceUrl: url || null,
      },
    });

    res.json(alert);
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/alerts/:id', async (req, res) => {
  try {
    const { status, analystNote } = req.body;
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { status, analystNote, updatedAt: new Date() },
    });
    res.json(alert);
  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ PROTECTEES ============
app.get('/api/protectees', async (req, res) => {
  try {
    const protectees = await prisma.protectee.findMany({
      include: { alerts: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
    res.json(protectees);
  } catch (error) {
    console.error('Get protectees error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/protectees', async (req, res) => {
  try {
    const { name, title, keywords, locations } = req.body;
    const protectee = await prisma.protectee.create({
      data: {
        name,
        title,
        keywords: keywords || [],
        locations: locations || [],
        status: 'ACTIVE',
      },
    });
    res.json(protectee);
  } catch (error) {
    console.error('Create protectee error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ STATS ============
app.get('/api/stats', async (req, res) => {
  try {
    const [
      totalAlerts,
      pendingAlerts,
      confirmedAlerts,
      falsePositives,
      totalProtectees,
    ] = await Promise.all([
      prisma.alert.count(),
      prisma.alert.count({ where: { status: 'PENDING' } }),
      prisma.alert.count({ where: { status: 'CONFIRMED' } }),
      prisma.alert.count({ where: { status: 'FALSE_POSITIVE' } }),
      prisma.protectee.count(),
    ]);
    res.json({
      totalAlerts,
      pendingAlerts,
      confirmedAlerts,
      falsePositives,
      totalProtectees,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ VETTING ============
app.get('/api/vetting/pending', async (req, res) => {
  try {
    const alerts = await vettingService.getPendingAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Vetting error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vetting/review/:id', async (req, res) => {
  try {
    const { decision, notes } = req.body;
    const { id } = req.params;
    const result = await vettingService.reviewAlert(id, 'system', decision, notes);
    res.json(result);
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/vetting/stats', async (req, res) => {
  try {
    const stats = await vettingService.getVettingStats();
    res.json(stats);
  } catch (error) {
    console.error('Vetting stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ THREATS ============
app.get('/api/threats/search/:protecteeId', async (req, res) => {
  try {
    const { protecteeId } = req.params;
    const { keyword } = req.query;
    const results = await vettingService.searchPastThreats(protecteeId, { keyword });
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/threats/timeline/:protecteeId', async (req, res) => {
  try {
    const { protecteeId } = req.params;
    const timeline = await vettingService.getThreatTimeline(protecteeId);
    res.json(timeline);
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/threats/report/:protecteeId', async (req, res) => {
  try {
    const { protecteeId } = req.params;
    const report = await vettingService.generateRiskReport(protecteeId);
    res.json(report);
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ COLLECTED DATA ============
app.get('/api/collected', async (req, res) => {
  try {
    const data = await prisma.collectedData.findMany({
      where: { isProcessed: true },
      include: { aiAnalysis: true, protectee: true },
      orderBy: { collectedAt: 'desc' },
      take: 50,
    });
    res.json(data);
  } catch (error) {
    console.error('Collected data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ MONITORING ============
app.get('/api/monitoring/configs', async (req, res) => {
  try {
    const configs = await prisma.monitoringConfig.findMany({
      include: { protectee: true },
    });
    res.json(configs);
  } catch (error) {
    console.error('Monitoring configs error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/monitoring/configs', async (req, res) => {
  try {
    const { name, sourceType, keywords, protecteeId } = req.body;
    const result = await prisma.monitoringConfig.create({
      data: { name, sourceType, keywords, protecteeId, isActive: true },
    });
    res.json(result);
  } catch (error) {
    console.error('Create monitoring config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ USERS ============
app.post('/api/users', async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    const user = await prisma.user.create({
      data: { email, name, password, role: role || 'ANALYST' },
    });
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ AI ANALYSIS ============
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, protecteeName } = req.body;
    const result = await aiService.analyzeContent(text, protecteeName);
    res.json(result);
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ DEBUG ============
app.get('/api/debug', async (req, res) => {
  try {
    const latest = await prisma.alert.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        source: true,
        content: true,
        author: true,
        location: true,
        createdAt: true,
      },
    });
    res.json({
      latestAlert: latest,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;

try {
  collectionService.startScheduledCollection();
} catch (error) {
  console.error('Failed to start scheduled collection:', error);
}

app.listen(PORT, () => {
  console.log(`🚀 OSNIT Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
