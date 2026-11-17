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

  async analyzeContent(text, protecteeName) {
    const threatKeywords = ['kill', 'attack', 'bomb', 'shoot', 'destroy'];
    const hasThreat = threatKeywords.some(kw => text.toLowerCase().includes(kw));
    return {
      threatLevel: hasThreat ? 'high' : 'low',
      threatScore: hasThreat ? 90 : 10,
      confidence: hasThreat ? 0.9 : 0.1,
      keywords: hasThreat ? ['threat'] : ['safe'],
      summary: hasThreat ? 'Keyword threat detected' : 'No threat detected',
    };
  }

  async collectRSS(feedUrls, protecteeId) {
    const Parser = require('rss-parser');
    // Add headers to avoid being blocked, and handle bad XML
    const parser = new Parser({
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      customFields: { item: ['description'] }
    });
    
    const results = [];
    const protectee = await prisma.protectee.findUnique({ where: { id: protecteeId } });

    if (!protectee) return [];

    const searchTerms = [
      protectee.name,
      protectee.title,
      ...(protectee.keywords || [])
    ].filter(Boolean).map(t => t.toLowerCase());

    console.log(`Scanning for: ${searchTerms.join(', ')}`);

    for (const url of feedUrls) {
      try {
        const feed = await parser.parseURL(url);
        for (const item of feed.items) {
          const content = (item.title || '') + ' ' + (item.contentSnippet || '');
          const lowerContent = content.toLowerCase();
          
          const isMatch = searchTerms.some(term => lowerContent.includes(term));

          if (isMatch) {
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

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.ALERT_EMAIL) {
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
          });
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ALERT_EMAIL,
            subject: `🚨 ${analysis.severity} THREAT DETECTED: ${protectee.name}`,
            text: `A potential threat was detected against ${protectee.name}.\n\nContent: ${data.content}\nLink: ${data.url}\n\nSeverity: ${analysis.severity}\n\nPlease log in to review.`
          };
          transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error('Email Alert Error:', err);
            else console.log('✅ Email Alert Sent:', info.response);
          });
        }
        console.log(`🔴 Alert created: ${alert.id}`);
      }

      return collected;
    } catch (error) {
      console.error('Store Error:', error);
    }
  }

  startScheduledCollection() {
    cron.schedule('0 * * * *', async () => {
      console.log('🔄 Running hourly news collection...');
      const configs = await prisma.monitoringConfig.findMany({ where: { isActive: true } });
      const feeds = ["https://www.myjoyonline.com/feed/", "https://www.adomonline.com/feed/", "https://www.ghanaweb.com/GhanaHomePage/rss/news.xml", "https://3news.com/feed/"];
      for (const config of configs) {
        const newItems = await this.collectRSS(feeds, config.protecteeId);
        for (const item of newItems) {
          await this.storeCollectedData(item);
        }
      }
    });
    console.log('⏰ Scheduled collection started (every hour)');
  }
}

module.exports = new CollectionService();
