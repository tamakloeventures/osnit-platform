const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// Import services
const aiService = require('./services/aiService');
const collectionService = require('./services/collectionService');
const vettingService = require('./services/vettingService');

dotenv.config();

const app = express();
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Make Prisma available globally for services
global.prisma = prisma;

// ============ CORS CONFIGURATION ============
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// ============ HEALTH CHECK ============
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'Error', database: 'disconnected', error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/alerts', async (req, res) => {
  try {
    const { source, content, url, riskScore, protecteeId } = req.body;
    const alert = await prisma.alert.create({
      data: { source, content, url, riskScore, aiConfidence: 0.75, status: 'PENDING', protecteeId },
    });
    res.json(alert);
  } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/protectees', async (req, res) => {
  try {
    const { name, title, keywords, locations } = req.body;
    const protectee = await prisma.protectee.create({
      data: { name, title, keywords: keywords || [], locations: locations || [], status: 'ACTIVE' },
    });
    res.json(protectee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STATS ============
app.get('/api/stats', async (req, res) => {
  try {
    const [totalAlerts, pendingAlerts, confirmedAlerts, falsePositives, totalProtectees] = await Promise.all([
      prisma.alert.count(),
      prisma.alert.count({ where: { status: 'PENDING' } }),
      prisma.alert.count({ where: { status: 'CONFIRMED' } }),
      prisma.alert.count({ where: { status: 'FALSE_POSITIVE' } }),
      prisma.protectee.count(),
    ]);
    res.json({ totalAlerts, pendingAlerts, confirmedAlerts, falsePositives, totalProtectees });
  } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
});

// ============ COLLECTION ============
app.post('/api/collection/run', async (req, res) => {
  try {
    const { configId } = req.body;
    if (configId) {
      const config = await prisma.monitoringConfig.findUnique({ where: { id: configId } });
      if (!config) return res.status(404).json({ error: 'Config not found' });
      
      let results = [];
      if (config.sourceType === 'Twitter') {
        results = await collectionService.collectTwitter(config.keywords, config.protecteeId);
      } else if (config.sourceType === 'News') {
        const feeds = config.config?.feeds || ['https://feeds.bbci.co.uk/news/rss.xml'];
        results = await collectionService.collectRSS(feeds, config.protecteeId);
      }
      res.json({ message: 'Collection completed', count: results.length });
    } else {
      await collectionService.runScheduledCollection();
      res.json({ message: 'All collections completed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ VETTING ============
app.get('/api/vetting/pending', async (req, res) => {
  try {
    const alerts = await vettingService.getPendingAlerts();
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vetting/review/:id', async (req, res) => {
  try {
    const { decision, notes, escalationLevel } = req.body;
    const { id } = req.params;
    const result = await vettingService.reviewAlert(id, 'system', decision, notes, escalationLevel);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/vetting/stats', async (req, res) => {
  try {
    const stats = await vettingService.getVettingStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PAST THREATS SEARCH ============
app.get('/api/threats/search/:protecteeId', async (req, res) => {
  try {
    const { protecteeId } = req.params;
    const { keyword, startDate, endDate, source, minRiskScore, maxRiskScore, status, limit, offset } = req.query;
    
    const results = await vettingService.searchPastThreats(protecteeId, {
      keyword, startDate, endDate, source,
      minRiskScore: minRiskScore ? parseFloat(minRiskScore) : undefined,
      maxRiskScore: maxRiskScore ? parseFloat(maxRiskScore) : undefined,
      status,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/threats/timeline/:protecteeId', async (req, res) => {
  try {
    const { protecteeId } = req.params;
    const { period, months } = req.query;
    const timeline = await vettingService.getThreatTimeline(protecteeId, period || 'monthly', months ? parseInt(months) : 12);
    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/threats/report/:protecteeId', async (req, res) => {
  try {
    const { protecteeId } = req.params;
    const report = await vettingService.generateRiskReport(protecteeId);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/collected', async (req, res) => {
  try {
    const data = await prisma.collectedData.findMany({
      where: { isProcessed: true },
      include: { aiAnalysis: true, protectee: true },
      orderBy: { collectedAt: 'desc' },
      take: 50
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MONITORING CONFIGS ============
app.get('/api/monitoring/configs', async (req, res) => {
  try {
    const configs = await prisma.monitoringConfig.findMany({
      include: { protectee: true }
    });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/monitoring/configs', async (req, res) => {
  try {
    const { name, sourceType, keywords, protecteeId, schedule, config } = req.body;
    const result = await prisma.monitoringConfig.create({
      data: { name, sourceType, keywords, protecteeId, schedule: schedule || '*/15 * * * *', config: config || {}, isActive: true }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/monitoring/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const result = await prisma.monitoringConfig.update({
      where: { id },
      data: { isActive }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ USERS ============
app.post('/api/users', async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password, // In production, hash this!
        role: role || 'ANALYST'
      }
    });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DATA SOURCE ROUTES ============
const dataSourceService = require('./services/dataSourceService');

// PEP Screening
app.get('/api/intelligence/pep/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { country } = req.query;
    const results = await dataSourceService.searchPEP(name, country);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Full Intelligence Scan
app.post('/api/intelligence/scan', async (req, res) => {
  try {
    const { protecteeId, protecteeName, keywords } = req.body;
    const results = await dataSourceService.runFullIntelligenceScan(
      protecteeName,
      protecteeId,
      keywords || [protecteeName]
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// News Collection
app.post('/api/intelligence/news', async (req, res) => {
  try {
    const { keywords, protecteeId } = req.body;
    const results = await dataSourceService.collectNews(keywords, protecteeId);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Corporate Registry
app.get('/api/intelligence/corporate/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const results = await dataSourceService.searchCorporateRegistry(name);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign Finance
app.get('/api/intelligence/campaign/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { year } = req.query;
    const results = await dataSourceService.searchCampaignFinance(name, year);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;

// Start scheduled collection
collectionService.startScheduledCollection();

app.listen(PORT, () => {
  console.log(`🚀 OSNIT Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
