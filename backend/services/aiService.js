const natural = require('natural');

class AIService {
  constructor() {
    this.initialized = false;
    this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    console.log('✅ AI Service initialized');
  }

  async analyzeContent(text, protecteeName) {
    await this.initialize();

    const results = {
      sentiment: 'neutral',
      sentimentScore: 0,
      threatLevel: 'low',
      threatScore: 0,
      entities: { people: [], places: [], organizations: [] },
      keywords: [],
      riskFactors: [],
      summary: '',
      confidence: 0.5,
      classification: 'unrelated',
      urgency: 'low'
    };

    try {
      // Sentiment Analysis
      const sentimentResult = this.sentimentAnalyzer.getSentiment(text.split(' '));
      results.sentimentScore = sentimentResult;
      if (sentimentResult > 0.2) results.sentiment = 'positive';
      else if (sentimentResult < -0.2) results.sentiment = 'negative';
      else results.sentiment = 'neutral';

      // Threat Detection
      const threatKeywords = ['kill', 'harm', 'attack', 'bomb', 'shoot', 'destroy', 
        'threat', 'danger', 'assassinate', 'violence', 'hurt', 'blood', 'war', 
        'terror', 'explode', 'gun', 'weapon', 'revenge'];
      
      const threatCount = threatKeywords.filter(kw => text.toLowerCase().includes(kw)).length;
      const mentionsProtectee = protecteeName && text.toLowerCase().includes(protecteeName.toLowerCase());

      // Threat Score
      let threatScore = 0;
      if (threatCount > 0) threatScore += Math.min(threatCount * 15, 50);
      if (mentionsProtectee) threatScore += 30;
      if (results.sentiment === 'negative') threatScore += 20;
      if (text.length > 200) threatScore += 5;
      if (text.includes('!')) threatScore += 5;

      results.threatScore = Math.min(threatScore, 100);

      // Threat Level
      if (results.threatScore >= 70) {
        results.threatLevel = 'high';
        results.urgency = 'immediate';
      } else if (results.threatScore >= 40) {
        results.threatLevel = 'medium';
        results.urgency = 'soon';
      } else if (results.threatScore >= 20) {
        results.threatLevel = 'low';
        results.urgency = 'monitor';
      }

      // Classification
      if (threatCount > 0 && mentionsProtectee) results.classification = 'threat';
      else if (mentionsProtectee) results.classification = 'political';
      else if (threatCount > 0) results.classification = 'violence';
      else results.classification = 'unrelated';

      // Entities
      const words = text.split(' ');
      const capitalized = words.filter(w => 
        w.charAt(0) === w.charAt(0).toUpperCase() && 
        w.length > 1 && 
        !['The','This','That','These','Those','A','An','I','You','We','They','He','She','It'].includes(w)
      );
      
      for (let i = 0; i < capitalized.length; i++) {
        if (i < capitalized.length - 1 && 
            capitalized[i+1].charAt(0) === capitalized[i+1].charAt(0).toUpperCase()) {
          results.entities.people.push(`${capitalized[i]} ${capitalized[i+1]}`);
          i++;
        } else {
          results.entities.people.push(capitalized[i]);
        }
      }

      // Keywords
      const stopwords = ['the','a','an','this','that','to','for','of','with','on','at','from','by','in'];
      results.keywords = words
        .filter(w => w.length > 3 && !stopwords.includes(w.toLowerCase()))
        .slice(0, 10);

      // Risk Factors
      if (threatCount > 0) results.riskFactors.push('Contains threat keywords');
      if (mentionsProtectee) results.riskFactors.push('Directly mentions protectee');
      if (results.sentiment === 'negative') results.riskFactors.push('Negative sentiment');
      if (results.threatLevel === 'high') results.riskFactors.push('High risk detected');

      // Summary
      results.summary = text.length > 150 ? text.substring(0, 150) + '...' : text;

      // Confidence
      results.confidence = results.keywords.length > 0 ? 0.8 : 0.5;

    } catch (error) {
      console.error('AI Analysis error:', error);
    }

    return results;
  }
}

module.exports = new AIService();
