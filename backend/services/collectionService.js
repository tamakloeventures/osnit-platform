const { PrismaClient } = require('@prisma/client');
const aiService = require('./aiService');
const cron = require('node-cron');

// Use the global Prisma instance or create one with adapter
let prisma;
try {
  // Try to use the global instance from server.js
  prisma = global.prisma;
  if (!prisma) {
    // If not available, create one with adapter
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

class CollectionService {
  async storeCollectedData(data) {
    try {
      const existing = await prisma.collectedData.findFirst({
        where: { sourceId: data.sourceId, source: data.source }
      });
      if (existing) return existing;

      const collected = await prisma.collectedData.create({
        data: {
          source: data.source,
          sourceId: data.sourceId,
          content: data.content,
          url: data.url,
          author: data.author,
          postedDate: data.postedDate,
          protecteeId: data.protecteeId,
          isProcessed: false,
          rawData: data.rawData || null
        }
      });

      await this.analyzeCollectedData(collected.id);
      return collected;
    } catch (error) {
      console.error('Store error:', error);
      return null;
    }
  }

  async analyzeCollectedData(collectedId) {
    try {
      const collected = await prisma.collectedData.findUnique({
        where: { id: collectedId },
        include: { protectee: true }
      });

      if (!collected) return;

      const protecteeName = collected.protectee?.name || '';
      const aiResult = await aiService.analyzeContent(collected.content, protecteeName);

      const analysis = await prisma.aiAnalysis.create({
        data: {
          collectedDataId: collected.id,
          sentiment: aiResult.sentiment,
          sentimentScore: aiResult.sentimentScore,
          threatLevel: aiResult.threatLevel,
          threatScore: aiResult.threatScore,
          entities: aiResult.entities,
          keywords: aiResult.keywords,
          riskFactors: aiResult.riskFactors,
          summary: aiResult.summary,
          confidence: aiResult.confidence,
          aiModel: 'natural + custom-rules'
        }
      });

      await prisma.collectedData.update({
        where: { id: collected.id },
        data: { isProcessed: true }
      });

      // Create search index
      await prisma.threatSearchIndex.create({
        data: {
          searchableText: `${collected.content} ${aiResult.keywords?.join(' ') || ''}`,
          collectedDataId: collected.id,
          protecteeId: collected.protecteeId,
          source: collected.source,
          date: collected.postedDate,
          threatScore: aiResult.threatScore || 0,
          status: aiResult.threatLevel || 'low',
          keywords: aiResult.keywords || []
        }
      });

      // Create alert if high risk
      if (aiResult.threatLevel === 'high' || aiResult.threatScore >= 60) {
        await this.createAlert(collected, analysis);
      }

      return analysis;
    } catch (error) {
      console.error('AI Analysis error:', error);
    }
  }

  async createAlert(collected, analysis) {
    try {
      const existing = await prisma.alert.findFirst({
        where: { content: collected.content.substring(0, 100) }
      });
      if (existing) return existing;

      const alert = await prisma.alert.create({
        data: {
          source: collected.source,
          content: collected.content,
          url: collected.url,
          riskScore: analysis.threatScore || 0,
          aiConfidence: analysis.confidence || 0.5,
          status: 'PENDING',
          protecteeId: collected.protecteeId,
          isHistorical: false,
          originalDate: collected.postedDate,
        }
      });

      await prisma.vetting.create({
        data: {
          alertId: alert.id,
          status: 'PENDING',
          aiConfidence: analysis.confidence || 0.5,
        }
      });

      console.log(`🔴 Alert created: ${alert.id}`);
      return alert;
    } catch (error) {
      console.error('Alert creation error:', error);
    }
  }

  async collectTwitter(keywords, protecteeId) {
    console.log('📱 Twitter collection would run here with:', keywords);
    return [];
  }

  async collectRSS(feedUrls, protecteeId) {
    console.log('📰 RSS collection would run here with:', feedUrls);
    return [];
  }

  startScheduledCollection() {
    cron.schedule('*/15 * * * *', async () => {
      console.log('🔄 Running scheduled collection...');
      const configs = await prisma.monitoringConfig.findMany({
        where: { isActive: true },
        include: { protectee: true }
      });

      for (const config of configs) {
        try {
          let results = [];
          if (config.sourceType === 'Twitter') {
            results = await this.collectTwitter(config.keywords, config.protecteeId);
          } else if (config.sourceType === 'News') {
            const feeds = config.config?.feeds || ['https://feeds.bbci.co.uk/news/rss.xml'];
            results = await this.collectRSS(feeds, config.protecteeId);
          }
          
          if (results.length > 0) {
            await prisma.monitoringConfig.update({
              where: { id: config.id },
              data: { lastRun: new Date() }
            });
          }
          
          console.log(`📊 ${config.name}: collected ${results.length} items`);
        } catch (error) {
          console.error(`Collection error for ${config.name}:`, error);
        }
      }
    });
    console.log('⏰ Scheduled collection started (every 15 minutes)');
  }
}

module.exports = new CollectionService();
