const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const Parser = require('rss-parser');
const { InferenceClient } = require('@huggingface/inference');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// Initialize Prisma
let prisma = global.prisma;
if (!prisma) {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  prisma = new PrismaClient({ adapter });
}

// Initialize Hugging Face Client
const hf = new InferenceClient(process.env.HF_TOKEN);

// Initialize Email Transporter (Using Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

class CollectionService {
  constructor() {
    this.parser = new Parser();
  }

  // 1. REAL AI ANALYSIS (Zero-Shot Classification)
  async analyzeContent(text, protecteeName) {
    try {
      const result = await hf.zeroShotClassification({
        model: 'facebook/bart-large-mnli',
        inputs: text,
        parameters: {
          candidate_labels: ['threat of violence', 'political complaint', 'general news', 'positive support'],
          multi_label: false,
        },
      });

      const topLabel = result.labels[0];
      const confidence = result.scores[0];

      let threatLevel = 'low';
      let threatScore = 20;

      if (topLabel === 'threat of violence' && confidence > 0.7) {
        threatLevel = 'high';
        threatScore = 95;
      } else if (topLabel === 'threat of violence' && confidence > 0.4) {
        threatLevel = 'medium';
        threatScore = 60;
      } else if (topLabel === 'political complaint') {
        threatLevel = 'low';
        threatScore = 30;
      }

      return {
        threatLevel,
        threatScore,
        confidence: confidence,
        keywords: [topLabel],
        summary: `AI classified this as: ${topLabel}`,
      };
    } catch (error) {
      console.error('AI Error:', error);
      return { threatLevel: 'low', threatScore: 0, confidence: 0, keywords: [], summary: 'AI analysis failed' };
    }
  }

  // 2. REAL RSS SCRAPING
  async collectRSS(feedUrls, protecteeId) {
    const results = [];
    const protectee = await prisma.protectee.findUnique({ where: { id: protecteeId } });

    if (!protectee) return [];

    for (const url of feedUrls) {
      try {
        const feed = await this.parser.parseURL(url);
        for (const item of feed.items) {
          const content = (item.title || '') + ' ' + (item.contentSnippet || '');
          
          // Check if the protectee's name is mentioned
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

  // 3. SAVE & TRIGGER ALERTS
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
          aiModel: 'facebook/bart-large-mnli',
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

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: process.env.ALERT_EMAIL,
          subject: `🚨 HIGH RISK THREAT DETECTED: ${protectee.name}`,
          text: `A potential threat was detected against ${protectee.name}.\n\nSource: ${data.source}\nContent: ${data.content}\nLink: ${data.url}\n\nPlease log in to the OSNIT dashboard to review.`
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) console.error('Email Alert Error:', err);
          else console.log('✅ Email Alert Sent:', info.response);
        });

        console.log(`🔴 Alert created & Email Sent: ${alert.id}`);
      }

      return collected;
    } catch (error) {
      console.error('Store Error:', error);
    }
  }

  // 4. SCHEDULER
  startScheduledCollection() {
    cron.schedule('0 * * * *', async () => {
      console.log('🔄 Running hourly news collection...');
      
      const configs = await prisma.monitoringConfig.findMany({
        where: { isActive: true },
      });

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
