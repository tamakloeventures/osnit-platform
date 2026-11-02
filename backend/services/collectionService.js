const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const cron = require('node-cron');

// Initialize Prisma safely. If it hangs, the connect_timeout in DATABASE_URL will stop it.
let prisma = global.prisma;
if (!prisma) {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  prisma = new PrismaClient({ adapter });
}

class CollectionService {
  constructor() {
    // No imports here. Everything is lazy-loaded inside methods to prevent startup crashes.
  }

  async analyzeContent(text, protecteeName) {
    // Temporary safe keyword check. No external APIs.
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
    // Lazy-load the parser only when this method is called
    const Parser = require('rss-parser');
    const parser = new Parser();
    const results = [];
    const protectee = await prisma.protectee.findUnique({ where: { id: protecteeId } });

    if (!protectee) return [];

    for (const url of feedUrls) {
      try {
        const feed = await parser.parseURL(url);
        for (const item of feed.items) {
          const content = (item.title || '') + ' ' + (item.contentSnippet || '');
          if (protectee.name && content.toLowerCase().includes(protectee.name.toLowerCase())) {
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
      const analysis = await this.analyzeContent(data.content, protectee.name);

      await prisma.aiAnalysis.create({
        data: {
          collectedDataId: collected.id,
          sentiment: 'neutral',
          threatLevel: analysis.threatLevel,
          threatScore: analysis.threatScore,
          keywords: analysis.keywords,
          confidence: analysis.confidence,
          summary: analysis.summary,
          aiModel: 'keyword-fallback',
        }
      });

      await prisma.collectedData.update({
        where: { id: collected.id },
        data: { isProcessed: true }
      });

      if (analysis.threatLevel === 'high') {
        const alert = await prisma.alert.create({
          data: {
            source: data.source,
            content: data.content,
            url: data.url,
            riskScore: analysis.threatScore,
            aiConfidence: analysis.confidence,
            status: 'PENDING',
            protecteeId: data.protecteeId,
            author: data.author,
            location: 'Unknown', 
            createdBy: 'AI System',
            sourceUrl: data.url,
          }
        });

        // Lazy-load email only if a threat is found
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.ALERT_EMAIL) {
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
          });
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ALERT_EMAIL,
            subject: `🚨 HIGH RISK THREAT DETECTED: ${protectee.name}`,
            text: `A potential threat was detected against ${protectee.name}.\n\nContent: ${data.content}\nLink: ${data.url}\n\nPlease log in to the OSNIT dashboard to review.`
          };
          transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error('Email Alert Error:', err);
            else console.log('✅ Email Alert Sent:', info.response);
          });
        }

        console.log(`🔴 Alert created & Email Sent: ${alert.id}`);
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
      for (const config of configs) {
        if (config.sourceType === 'News') {
          const feeds = config.config?.feeds || ['https://feeds.bbci.co.uk/news/world/rss.xml'];
          const newItems = await this.collectRSS(feeds, config.protecteeId);
          for (const item of newItems) {
            await this.storeCollectedData(item);
          }
        }
      }
    });
    console.log('⏰ Scheduled collection started (every hour)');
  }
}

module.exports = new CollectionService();
