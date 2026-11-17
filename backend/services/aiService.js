const ThreatDetectionEngine = require('./threatDetection');

class AIService {
  constructor() {
    this.initialized = true;
    console.log('✅ AI Service (Threat Detection Engine) initialized');
  }

  /**
   * Analyzes content for threats.
   * @param {string} text - The text to analyze.
   * @param {string|Object} protecteeData - Either the protectee's name (legacy) or the full protectee object.
   * @returns {Object} - The analysis result.
   */
  async analyzeContent(text, protecteeData) {
    try {
      // Backward compatibility: If a string is passed (like before), convert it to a minimal object
      let protecteeObj = protecteeData;
      if (typeof protecteeData === 'string') {
        protecteeObj = { name: protecteeData, title: '', keywords: [], locations: [] };
      }

      // Call the new modular engine
      const result = ThreatDetectionEngine.analyze(text, protecteeObj);
      return result;

    } catch (error) {
      console.error('❌ AI Analysis error:', error);
      // Fallback safe response if the engine fails
      return {
        threatLevel: 'low',
        threatScore: 0,
        confidence: 0.1,
        keywords: [],
        summary: 'Analysis failed due to an internal error.',
        severity: 'INFORMATIONAL',
        category: 'none',
        riskScore: 0,
        explanation: 'Analysis failed.',
        aiModel: 'error-fallback'
      };
    }
  }
}

module.exports = new AIService();
