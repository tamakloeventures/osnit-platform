const ThreatLexicon = require('./ThreatLexicon');
const ContextAnalyzer = require('./ContextAnalyzer');
const TargetMatcher = require('./TargetMatcher');
const RiskEngine = require('./RiskEngine');
const AlertPrioritizer = require('./AlertPrioritizer');

class ThreatDetectionEngine {
  /**
   * The main entry point for threat analysis.
   * @param {string} text - The content to analyze.
   * @param {Object} protectee - The protectee object from the database (name, title, keywords, locations).
   * @returns {Object} - The fully explainable analysis result.
   */
  analyze(text, protectee) {
    // 1. Lexical Scan (Does the text contain threat words?)
    const lexicalMatches = ThreatLexicon.scanText(text);

    // 2. Context Analysis (Is it a news report, sarcasm, etc.?)
    const contextResult = ContextAnalyzer.analyze(text);

    // 3. Target Matching (How specifically is the protectee targeted?)
    const targetResult = TargetMatcher.match(text, protectee);

    // 4. Risk Calculation (Combine the above into a score and severity)
    const riskResult = RiskEngine.calculate(lexicalMatches, contextResult, targetResult);

    // 5. Alert Prioritization (Final queue recommendation + imminent check)
    const priorityResult = AlertPrioritizer.prioritize(riskResult, text);

    // 6. Return the unified, explainable result
    return {
      // Core required fields (backward compatible with existing aiService shape)
      threatLevel: riskResult.severity.toLowerCase(), // 'low', 'moderate', 'high', 'critical'
      threatScore: riskResult.riskScore,
      confidence: contextResult.confidence,
      keywords: lexicalMatches.map(m => m.keyword),
      summary: riskResult.explanation,

      // New explainability fields
      severity: riskResult.severity,
      category: riskResult.category,
      context: contextResult.context,
      contextReason: contextResult.reason,
      riskScore: riskResult.riskScore,
      scoreBreakdown: riskResult.scoreBreakdown,
      explanation: riskResult.explanation,
      disclaimer: riskResult.disclaimer,
      
      // Matched indicators for the dashboard
      matchedIndicators: lexicalMatches,
      targetMatches: targetResult.matches,

      // Priority fields
      reviewPriority: priorityResult.reviewPriority,
      isImminent: priorityResult.isImminent,
      analystRecommendation: priorityResult.analystRecommendation,

      // Metadata
      aiModel: 'osnit-threat-engine-v1'
    };
  }
}

module.exports = new ThreatDetectionEngine();
