const ThreatLexicon = require('./ThreatLexicon');

class ContextAnalyzer {
  constructor() {
    // We will use this to classify text
  }

  /**
   * Analyzes the text to determine the likely context.
   * Returns an object with the context type, confidence, and reason.
   */
  analyze(text) {
    const lowerText = text.toLowerCase();
    const modifiers = ThreatLexicon.getContextModifiers();
    
    // Default state
    let detectedContext = 'unresolved';
    let confidence = 0.5;
    let reason = 'No strong context modifiers found.';
    let multiplier = 1.0;

    // Count matches for each modifier category
    const matches = {};
    
    for (const [modName, modData] of Object.entries(modifiers)) {
      matches[modName] = 0;
      for (const keyword of modData.keywords) {
        // Simple string inclusion check for context words
        if (lowerText.includes(keyword.toLowerCase())) {
          matches[modName]++;
        }
      }
    }

    // Priority Logic: 
    // 1. Denial is the strongest indicator of safety.
    // 2. Hypothetical / Sarcasm / Historical are weak threats.
    // 3. News reporting drops threat levels significantly.
    
    if (matches.denial > 0) {
      detectedContext = 'denial';
      multiplier = modifiers.denial.multiplier;
      confidence = 0.8;
      reason = 'Text contains language indicating a denial of intent or harm.';
    } 
    else if (matches.hypothetical > 0) {
      detectedContext = 'hypothetical';
      multiplier = modifiers.hypothetical.multiplier;
      confidence = 0.7;
      reason = 'Text contains hypothetical phrasing (e.g., "if", "would", "could").';
    } 
    else if (matches.news_reporting > 0) {
      detectedContext = 'news_reporting';
      multiplier = modifiers.news_reporting.multiplier;
      confidence = 0.8;
      reason = 'Text appears to be a news report, quoting officials or third parties.';
    } 
    else if (matches.historical > 0) {
      detectedContext = 'historical';
      multiplier = modifiers.historical.multiplier;
      confidence = 0.8;
      reason = 'Text appears to reference historical events or past dates.';
    }
    else if (matches.sarcasm > 0) {
      detectedContext = 'sarcasm';
      multiplier = modifiers.sarcasm.multiplier;
      confidence = 0.6;
      reason = 'Text contains phrases often used in sarcasm.';
    }
    else if (matches.quoted > 0) {
      detectedContext = 'quoted';
      multiplier = modifiers.quoted.multiplier;
      confidence = 0.6;
      reason = 'Threat language appears within a quoted statement.';
    }

    return {
      context: detectedContext,
      confidence: confidence,
      reason: reason,
      multiplier: multiplier
    };
  }
}

module.exports = new ContextAnalyzer();
