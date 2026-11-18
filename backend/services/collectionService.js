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
          // Extract source name from the URL or feed title
          let sourceName = feed.title || 'News Source';
          if (item.source && item.source._) sourceName = item.source._;

          results.push({
            source: sourceName,
            sourceId: item.guid || item.link,
            content: (item.title || '') + ' ' + (item.contentSnippet || ''),
            url: item.link,
            author: item.creator || item.author || 'Unknown',
            postedDate: new Date(item.pubDate || new Date()),
            protecteeId: protecteeId,
            location: 'Unknown' // We will extract this in the AI step
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
      
      const analysis = await aiService.analyzeContent(data.content, protectee);

      // Try to guess the location from the protectee's known locations
      let detectedLocation = data.location || 'Unknown';
      if (protectee.locations && protectee.locations.length > 0) {
        const lowerContent = data.content.toLowerCase();
        const foundLoc = protectee.locations.find(loc => lowerContent.includes(loc.toLowerCase()));
        if (foundLoc) detectedLocation = foundLoc;
      }

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

      if (['MODERATE', 'HIGH', 'CRITICAL'].includes(analysis.severity)) {
        const alert = await prisma.alert.create({
          data: {
            source: data.source,           // e.g. "Modern Ghana"
            content: data.content,
            url: data.url,
            riskScore: analysis.riskScore,
            aiConfidence: analysis.confidence,
            status: 'PENDING',
            protecteeId: data.protecteeId,
            author: data.author,           // e.g. "John Doe"
            location: detectedLocation,    // e.g. "Kumasi"
            createdBy: 'AI System',
            sourceUrl: data.url,
            severity: analysis.severity,
            category: analysis.category,
            context: analysis.context,
            reviewPriority: analysis.reviewPriority,
            scoreBreakdown: analysis.scoreBreakdown
          }
        });
        console.log(`🔴 Threat Alert created: ${alert.id} (${analysis.severity}) - Location: ${detectedLocation}`);
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
        const query = encodeURIComponent(protectee.name + " when:30d");
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
