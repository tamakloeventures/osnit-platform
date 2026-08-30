const { PrismaClient } = require('@prisma/client');

// Use the global Prisma instance or create one
let prisma;
try {
  prisma = global.prisma;
  if (!prisma) {
    const { PrismaPg } = require('@prisma/adapter-pg');
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
  }
} catch (error) {
  console.error('Prisma initialization error:', error);
  prisma = new PrismaClient();
}

class VettingService {
  async getPendingAlerts() {
    return await prisma.alert.findMany({
      where: { status: 'PENDING' },
      include: { protectee: true, vetting: true },
      orderBy: { riskScore: 'desc' }
    });
  }

  async reviewAlert(alertId, analystId, decision, notes, escalationLevel) {
    try {
      const alert = await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: decision === 'CONFIRMED' ? 'CONFIRMED' : 
                 decision === 'FALSE_POSITIVE' ? 'FALSE_POSITIVE' : 
                 'INVESTIGATING',
          analystNote: notes,
          reviewedBy: analystId
        }
      });

      await prisma.vetting.updateMany({
        where: { alertId },
        data: {
          status: 'HUMAN_REVIEWED',
          humanDecision: decision,
          analystNotes: notes,
          analystId,
          reviewedAt: new Date(),
          escalationLevel: escalationLevel || null
        }
      });

      return alert;
    } catch (error) {
      console.error('Review error:', error);
    }
  }

  async escalateAlert(alertId, escalationLevel, reason) {
    try {
      const alert = await prisma.alert.update({
        where: { id: alertId },
        data: { status: 'INVESTIGATING' }
      });

      await prisma.vetting.updateMany({
        where: { alertId },
        data: {
          status: 'ESCALATED',
          escalationLevel,
          analystNotes: reason
        }
      });

      return alert;
    } catch (error) {
      console.error('Escalation error:', error);
    }
  }

  async getVettingStats() {
    try {
      const [pending, confirmed, falsePositives, investigating, escalated] = await Promise.all([
        prisma.alert.count({ where: { status: 'PENDING' } }),
        prisma.alert.count({ where: { status: 'CONFIRMED' } }),
        prisma.alert.count({ where: { status: 'FALSE_POSITIVE' } }),
        prisma.alert.count({ where: { status: 'INVESTIGATING' } }),
        prisma.vetting.count({ where: { status: 'ESCALATED' } })
      ]);
      return { pending, confirmed, falsePositives, investigating, escalated };
    } catch (error) {
      console.error('Stats error:', error);
      return null;
    }
  }

  async searchPastThreats(protecteeId, options = {}) {
    const { keyword, startDate, endDate, source, minRiskScore, maxRiskScore, status, limit = 50, offset = 0 } = options;

    const where = { protecteeId };
    if (keyword) {
      where.OR = [
        { content: { contains: keyword, mode: 'insensitive' } }
      ];
    }
    if (startDate) where.originalDate = { ...where.originalDate, gte: new Date(startDate) };
    if (endDate) where.originalDate = { ...where.originalDate, lte: new Date(endDate) };
    if (source) where.source = source;
    if (minRiskScore) where.riskScore = { ...where.riskScore, gte: minRiskScore };
    if (maxRiskScore) where.riskScore = { ...where.riskScore, lte: maxRiskScore };
    if (status) where.status = status;

    const alerts = await prisma.alert.findMany({
      where,
      include: { protectee: true, vetting: true },
      orderBy: { originalDate: 'desc' },
      take: limit,
      skip: offset
    });

    const collected = await prisma.collectedData.findMany({
      where: {
        protecteeId,
        content: keyword ? { contains: keyword, mode: 'insensitive' } : undefined
      },
      include: { aiAnalysis: true, protectee: true },
      orderBy: { postedDate: 'desc' },
      take: limit,
      skip: offset
    });

    return { alerts, collected, count: alerts.length + collected.length };
  }

  async getThreatTimeline(protecteeId, period = 'monthly', months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const data = await prisma.alert.findMany({
      where: {
        protecteeId,
        originalDate: { gte: startDate }
      },
      orderBy: { originalDate: 'asc' }
    });

    const timeline = {};
    data.forEach(item => {
      const date = new Date(item.originalDate || item.createdAt);
      let key;
      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const week = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!timeline[key]) {
        timeline[key] = { total: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 };
      }
      timeline[key].total++;
      if (item.riskScore >= 70) timeline[key].highRisk++;
      else if (item.riskScore >= 40) timeline[key].mediumRisk++;
      else timeline[key].lowRisk++;
    });

    return timeline;
  }

  async generateRiskReport(protecteeId) {
    const alerts = await prisma.alert.findMany({
      where: { protecteeId },
      include: { vetting: true }
    });

    const collected = await prisma.collectedData.findMany({
      where: { protecteeId },
      include: { aiAnalysis: true }
    });

    const total = alerts.length + collected.length;
    const confirmedThreats = alerts.filter(a => a.status === 'CONFIRMED').length;
    const falsePositives = alerts.filter(a => a.status === 'FALSE_POSITIVE').length;
    const pending = alerts.filter(a => a.status === 'PENDING').length;

    const riskDistribution = { high: 0, medium: 0, low: 0 };
    alerts.forEach(a => {
      if (a.riskScore >= 70) riskDistribution.high++;
      else if (a.riskScore >= 40) riskDistribution.medium++;
      else riskDistribution.low++;
    });

    const sourceBreakdown = {};
    [...alerts, ...collected].forEach(item => {
      const source = item.source || 'Unknown';
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    });

    return {
      protecteeId,
      totalRecords: total,
      alertsCount: alerts.length,
      collectedCount: collected.length,
      confirmedThreats,
      falsePositives,
      pending,
      riskDistribution,
      sourceBreakdown,
      averageRiskScore: alerts.length > 0 ? 
        alerts.reduce((sum, a) => sum + (a.riskScore || 0), 0) / alerts.length : 0
    };
  }
}

module.exports = new VettingService();
