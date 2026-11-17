class RiskEngine {
  /**
   * Calculates the final explainable risk score.
   * @param {Array} lexicalMatches - From ThreatLexicon.scanText()
   * @param {Object} contextResult - From ContextAnalyzer.analyze()
   * @param {Object} targetResult - From TargetMatcher.match()
   * @returns {Object} - The fully explainable risk assessment.
   */
  calculate(lexicalMatches, contextResult, targetResult) {
    // 1. Base Threat Score (Highest category weight found)
    let baseThreatScore = 0;
    let highestCategory = 'none';
    
    if (lexicalMatches && lexicalMatches.length > 0) {
      const sortedMatches = [...lexicalMatches].sort((a, b) => b.weight - a.weight);
      baseThreatScore = sortedMatches[0].weight;
      highestCategory = sortedMatches[0].category;
    }

    // 2. Target Specificity (Weighted at 40%)
    const targetSpecificityScore = (targetResult ? targetResult.score : 0) * 0.4;

    // 3. Calculate Raw Score (Max 100) BEFORE context discount
    let rawScore = Math.min(Math.round(baseThreatScore + targetSpecificityScore), 100);

    // 4. Apply Context Multiplier to the ENTIRE score
    const contextMultiplier = contextResult ? contextResult.multiplier : 1.0;
    let finalScore = Math.round(rawScore * contextMultiplier);

    // 5. Determine Severity
    let severity = 'INFORMATIONAL';
    let priority = 'LOW';

    if (finalScore >= 85) {
      severity = 'CRITICAL';
      priority = 'IMMEDIATE';
    } else if (finalScore >= 65) {
      severity = 'HIGH';
      priority = 'URGENT';
    } else if (finalScore >= 40) {
      severity = 'MODERATE';
      priority = 'ELEVATED';
    } else if (finalScore >= 15) {
      severity = 'LOW';
      priority = 'STANDARD';
    }

    // 6. Build Explainability Array
    const scoreBreakdown = [];

    if (baseThreatScore > 0) {
      scoreBreakdown.push({
        factor: 'Threat Language',
        value: baseThreatScore,
        reason: `Found ${highestCategory.replace('_', ' ')} language.`
      });
    }

    if (targetSpecificityScore > 0) {
      scoreBreakdown.push({
        factor: 'Target Specificity',
        value: Math.round(targetSpecificityScore),
        reason: targetResult.reason
      });
    }

    if (contextMultiplier < 1.0) {
      scoreBreakdown.push({
        factor: 'Contextual Discount',
        value: `x${contextMultiplier}`,
        reason: contextResult.reason
      });
    }

    // 7. Generate Summary Explanation
    let explanation = `Automated assessment: ${severity} severity. `;
    if (finalScore === 0) {
      explanation += 'No credible threat indicators found.';
    } else {
      explanation += `Risk score is ${finalScore}/100. `;
      if (baseThreatScore > 0) {
        explanation += `It contains ${highestCategory.replace('_', ' ')} language. `;
      }
      if (targetResult && targetResult.score > 0) {
        explanation += `The target was specifically identified (${targetResult.matches.join(', ')}). `;
      }
      if (contextMultiplier < 1.0) {
        explanation += `However, the overall risk was reduced because ${contextResult.reason.toLowerCase()}`;
      }
    }

    return {
      riskScore: finalScore,
      severity: severity,
      priority: priority,
      category: highestCategory,
      scoreBreakdown: scoreBreakdown,
      explanation: explanation.trim(),
      disclaimer: 'This is a heuristic score, not a statistically validated probability.'
    };
  }
}

module.exports = new RiskEngine();
