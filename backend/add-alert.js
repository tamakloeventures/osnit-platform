const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const aiService = require('./services/aiService');
require('dotenv').config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const protectee = await prisma.protectee.findFirst();
  if (!protectee) return console.error("❌ Add a protectee first!");

  const testText = "I will shoot Asiedu Nketia at the Kumasi rally tomorrow. I have a gun ready.";
  
  // Run analysis
  const analysis = await aiService.analyzeContent(testText, protectee);
  console.log(`AI Analysis: ${analysis.severity} (${analysis.riskScore}/100)`);

  // Save to DB with explicit fields
  const alert = await prisma.alert.create({
    data: {
      source: 'Manual Test',
      content: testText,
      url: 'https://test.local',
      riskScore: analysis.riskScore,
      aiConfidence: analysis.confidence,
      status: 'PENDING',
      protecteeId: protectee.id,
      author: 'Test Author',
      location: 'Kumasi',
      createdBy: 'System',
      severity: analysis.severity,
      category: analysis.category,
      context: analysis.context,
      reviewPriority: analysis.reviewPriority,
      scoreBreakdown: analysis.scoreBreakdown // This is a JSON array
    }
  });

  console.log(`🚨 Alert created successfully! ID: ${alert.id}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
