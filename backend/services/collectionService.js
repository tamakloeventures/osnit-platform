const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const cron = require('node-cron');

let prisma = global.prisma;
if (!prisma) {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  prisma = new PrismaClient({ adapter });
}

class CollectionService {
  constructor() {}

  async collectRSS(feedUrls, protecteeId) {
    const Parser = require('rss-parser');
    const parser = new Parser({
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    
    const results = [];
    const protectee = await prisma.protectee.findUnique({ where: { id: protecteeId } });

    if (!protectee) return [];

    for (const url of feedUrls) {
      try {
        const feed = await parser.parseURL(url);
        for (const item of feed.items) {
          const content = (item.title || '') + ' ' + (item.contentSnippet || '');
          
          results.push({
            source: 'News',
            sourceId: item.guid || item.link,
            content: content,
            url: item.link,
            author: item.creator || 'News Source',
            postedDate: new Date(item.pubDate || new Date()),
            protecteeId: protecteeId,
          });
        }
      } catch (err) {
        console.error(`RSS Error (${url}):`, err.message);
      }
    }
    return results;
  }

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
        }
      });

      const protectee = await prisma.protectee.findUnique({ where: { id: data.protecteeId } });
      const aiService = require('./aiService');
      
      // THIS IS THE AI ENGINE RUNNING
      const analysis = await aiService.analyzeContent(data.content, protectee);

      await prisma.aiAnalysis.create({
        data: {
          collectedDataId: collected.id,
          sentiment: 'neutral',
          threatLevel: analysis.severity,
          threatScore: analysis.riskScore,
          keywords: analysis.keywords,
          confidence: analysis.confidence,
          summary: analysis.summary,
          aiModel: analysis.aiModel || 'keyword-fallback',
        }
      });

      await prisma.collectedData.update({
        where: { id: collected.id },
        data: { isProcessed: true }
      });

      // Only create an alert if the AI score is MODERATE or higher
      if (['MODERATE', 'HIGH', 'CRITICAL'].includes(analysis.severity)) {
        const alert = await prisma.alert.create({
          data: {
            source: data.source,
            content: data.content,
            url: data.url,
            riskScore: analysis.riskScore,
            aiConfidence: analysis.confidence,
            status: 'PENDING',
            protecteeId: data.protecteeId,
            author: data.author,
            location: 'Unknown', 
            createdBy: 'AI System',
            sourceUrl: data.url,
            severity: analysis.severity,
            category: analysis.category,
            context: analysis.context,
            reviewPriority: analysis.reviewPriority,
            scoreBreakdown: analysis.scoreBreakdown
          }
        });
        console.log(`🔴 Threat Alert created: ${alert.id} (${analysis.severity})`);
      }

      return collected;
    } catch (error) {
      console.error('Store Error:', error);
    }
  }

  startScheduledCollection() {
    cron.schedule('0 * * * *', async () => {
      console.log('🔄 Running hourly news collection...');
      const protectees = await prisma.protectee.findMany({ where: { status: 'ACTIVE' } });
      
      for (const protectee of protectees) {
        // Use Google News RSS to search for the protectee's name
        const query = encodeURIComponent(protectee.name);
        const googleNewsUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
        
        const newItems = await this.collectRSS([googleNewsUrl], protectee.id);
        for (const item of newItems) {
          await this.storeCollectedData(item);
        }
      }
    });
    console.log('⏰ Scheduled collection started (every hour)');
  }
}

module.exports = new CollectionService();
