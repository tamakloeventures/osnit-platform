class AlertPrioritizer {
  /**
   * Finalizes the review priority and flags imminent threats.
   * @param {Object} riskResult - The output from RiskEngine.calculate()
   * @param {string} text - The original text (to scan for urgency words)
   * @returns {Object} - { reviewPriority, isImminent, analystRecommendation }
   */
  prioritize(riskResult, text) {
    const lowerText = text.toLowerCase();
    
    // Words that indicate the threat is happening very soon
    const imminentKeywords = ['tomorrow', 'tonight', 'today', 'now', 'in an hour', 'this week', 'next week', 'planning to', 'about to'];
    const isImminent = imminentKeywords.some(kw => lowerText.includes(kw));

    // Escalate priority if imminent
    let reviewPriority = riskResult.priority;
    let analystRecommendation = '';

    if (isImminent && (riskResult.severity === 'HIGH' || riskResult.severity === 'CRITICAL')) {
      reviewPriority = 'IMMEDIATE (IMMINENT)';
      analystRecommendation = 'URGENT: Immediate threat indicated by both severity and time-sensitive language.';
    } else if (riskResult.severity === 'CRITICAL') {
      reviewPriority = 'IMMEDIATE';
      analystRecommendation = 'Review immediately. Critical threat indicators found.';
    } else if (riskResult.severity === 'HIGH') {
      reviewPriority = 'URGENT';
      analystRecommendation = 'Review urgently. High threat indicators found.';
    } else if (riskResult.severity === 'MODERATE') {
      reviewPriority = 'ELEVATED';
      analystRecommendation = 'Review when possible. Moderate indicators found.';
    } else if (riskResult.severity === 'LOW') {
      reviewPriority = 'STANDARD';
      analystRecommendation = 'Likely false positive or low-level chatter. Monitor only.';
    } else {
      reviewPriority = 'INFORMATIONAL';
      analystRecommendation = 'No action required. Informational only.';
    }

    return {
      reviewPriority: reviewPriority,
      isImminent: isImminent,
      analystRecommendation: analystRecommendation
    };
  }
}

module.exports = new AlertPrioritizer();
