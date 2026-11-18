const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { requireAuth, requireRole, JWT_SECRET } = require('./middleware/auth');

dotenv.config();

const app = express();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
global.prisma = prisma;

const aiService = require('./services/aiService');
const collectionService = require('./services/collectionService');
const dataSourceService = require('./services/dataSourceService');
const vettingService = require('./services/vettingService');

app.use(helmet());
app.use(cors({ origin: ['https://osnit-platform.vercel.app', 'http://localhost:3000'], credentials: true }));
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

// ============ AUTHENTICATION ============
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ALERTS ============
app.get('/api/alerts', requireAuth, async (req, res) => {
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

app.post('/api/alerts', requireAuth, async (req, res) => {
  try {
    const {
      source, content, url, protecteeId, author, location
    } = req.body;

    // 1. Fetch the protectee so the AI engine can do target matching
    const protectee = await prisma.protectee.findUnique({ where: { id: protecteeId } });
    
    // 2. Run the text through the Threat Detection Engine
    const analysis = await aiService.analyzeContent(content, protectee || 'Unknown');

    // 3. Save the alert with the AI-generated fields
    const alert = await prisma.alert.create({
      data: {
        source: source || 'Manual Entry',
        content,
        url: url || '',
        riskScore: analysis.riskScore,
        aiConfidence: analysis.confidence,
        status: 'PENDING',
        protecteeId,
        author: author || 'Unknown',
        location: location || 'Unknown',
        createdBy: 'Manual Entry',
        severity: analysis.severity,
        category: analysis.category,
        context: analysis.context,
        reviewPriority: analysis.reviewPriority,
        scoreBreakdown: analysis.scoreBreakdown
      }
    });
    res.json(alert);
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/alerts/:id', requireAuth, async (req, res) => {
  try {
    const { status, analystNote } = req.body;
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { status, analystNote }
    });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/alerts/:id/assessment', requireAuth, async (req, res) => {
  try {
    const { decision, reason, newSeverity } = req.body;
    const alert = await prisma.alert.findUnique({ where: { id: req.params.id } });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    const assessment = await prisma.assessment.create({
      data: {
        alertId: alert.id,
        analystId: req.user.userId,
        decision: decision,
        previousSeverity: alert.severity,
        newSeverity: newSeverity || alert.severity,
        reason: reason || ''
      }
    });

    let newStatus = alert.status;
    if (decision === 'CONFIRMED') newStatus = 'CONFIRMED';
    if (decision === 'DISMISSED') newStatus = 'FALSE_POSITIVE';
    if (decision === 'DOWNGRADED') newStatus = 'INVESTIGATING';

    await prisma.alert.update({
      where: { id: alert.id },
      data: { status: newStatus, severity: newSeverity || alert.severity }
    });

    res.json({ success: true, assessment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PROTECTEES ============
app.get('/api/protectees', requireAuth, async (req, res) => {
  try {
    const protectees = await prisma.protectee.findMany({ orderBy: { name: 'asc' } });
    res.json(protectees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/protectees', requireAuth, async (req, res) => {
  try {
    const { name, title, keywords, locations } = req.body;
    const protectee = await prisma.protectee.create({
      data: { name, title, keywords: keywords || [], locations: locations || [] }
    });
    res.json(protectee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/protectees/:id', requireAuth, async (req, res) => {
  try {
    const { name, title, keywords, locations, status } = req.body;
    const protectee = await prisma.protectee.update({
      where: { id: req.params.id },
      data: { name, title, keywords, locations, status }
    });
    res.json(protectee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STATS ============
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const [totalAlerts, activeProtectees, threatsToday, criticalAlerts] = await Promise.all([
      prisma.alert.count(),
      prisma.protectee.count({ where: { status: 'ACTIVE' } }),
      prisma.alert.count({ where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      prisma.alert.count({ where: { severity: 'CRITICAL' } })
    ]);
    res.json({ totalAlerts, activeProtectees, threatsToday, criticalAlerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ VETTING ============
app.get('/api/vetting/pending', requireAuth, async (req, res) => {
  try {
    const pending = await prisma.vetting.findMany({
      where: { status: 'PENDING' },
      include: { alert: { include: { protectee: true } }, analyst: true }
    });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vetting/review/:id', requireAuth, async (req, res) => {
  try {
    const result = await vettingService.processReview(req.params.id, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/vetting/stats', requireAuth, async (req, res) => {
  try {
    const stats = await vettingService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ THREATS ============
app.get('/api/threats/search/:protecteeId', requireAuth, async (req, res) => {
  try {
    const results = await prisma.threatSearchIndex.findMany({
      where: { protecteeId: req.params.protecteeId },
      orderBy: { date: 'desc' }
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/threats/timeline/:protecteeId', requireAuth, async (req, res) => {
  try {
    const timeline = await prisma.threatSearchIndex.findMany({
      where: { protecteeId: req.params.protecteeId },
      orderBy: { date: 'asc' }
    });
    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/threats/report/:protecteeId', requireAuth, async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { protecteeId: req.params.protecteeId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ totalAlerts: alerts.length, alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ COLLECTED DATA & MANUAL SCAN ============
app.get('/api/collected', requireAuth, async (req, res) => {
  try {
    const data = await prisma.collectedData.findMany({
      orderBy: { collectedAt: 'desc' }, take: 100,
      include: { aiAnalysis: true, protectee: true }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/collect/scan/:protecteeId', requireAuth, async (req, res) => {
  try {
    const protectee = await prisma.protectee.findUnique({ where: { id: req.params.protecteeId } });
    if (!protectee) return res.status(404).json({ error: 'Protectee not found' });

    collectionService.collectRSS([`https://news.google.com/rss/search?q=${encodeURIComponent(protectee.name)}collectionService.collectRSS(["https://citinewsroom.com/feed/", "https://www.myjoyonline.com/feed/", "https://www.adomonline.com/feed/", "https://www.ghanaweb.com/GhanaHomePage/rss/news.xml", "https://3news.com/feed/"], protectee.id)hl=en-US&gl=US&ceid=US:en`], protectee.id).then(async (results) => {
      console.log(`Scan complete for ${protectee.name}: ${results.news?.length || 0} news items`);
    }).catch(err => console.error('Scan error:', err));

    res.json({ message: 'Scan started in the background. Check alerts shortly.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MONITORING CONFIG ============
app.get('/api/monitoring/configs', requireAuth, async (req, res) => {
  try {
    const configs = await prisma.monitoringConfig.findMany({
      include: { protectee: true }
    });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/monitoring/configs', requireAuth, async (req, res) => {
  try {
    const config = await prisma.monitoringConfig.create({ data: req.body });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ USERS ============
app.post('/api/users', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, passwordHash, role: role || 'ANALYST' }
    });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ANALYZE ============
app.post('/api/analyze', requireAuth, async (req, res) => {
  try {
    const { text, protecteeId } = req.body;
    let protecteeObj = null;
    if (protecteeId) {
      protecteeObj = await prisma.protectee.findUnique({ where: { id: protecteeId } });
    }
    const result = await aiService.analyzeContent(text, protecteeObj || 'Unknown');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 OSNIT API running on port ${PORT}`);
});
