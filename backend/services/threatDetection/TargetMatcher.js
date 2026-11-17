class TargetMatcher {
  /**
   * Calculates how specifically the text targets the protectee.
   * @param {string} text - The content to analyze.
   * @param {Object} protectee - The protectee object from the database (needs name, keywords, locations).
   * @returns {Object} - { score, matches, reason }
   */
  match(text, protectee) {
    if (!protectee) {
      return { score: 0, matches: [], reason: 'No protectee provided.' };
    }

    const lowerText = text.toLowerCase();
    let score = 0;
    const matches = [];

    // 1. Direct Name Match (High Specificity)
    if (protectee.name && lowerText.includes(protectee.name.toLowerCase())) {
      score += 50;
      matches.push(`Direct name match: ${protectee.name}`);
    }

    // 2. Title Match (Medium Specificity)
    if (protectee.title && lowerText.includes(protectee.title.toLowerCase())) {
      score += 20;
      matches.push(`Title match: ${protectee.title}`);
    }

    // 3. Keyword/Alias Match (Medium Specificity)
    if (protectee.keywords && Array.isArray(protectee.keywords)) {
      for (const kw of protectee.keywords) {
        // Avoid double-counting if the keyword is the exact name
        if (kw.toLowerCase() === (protectee.name || '').toLowerCase()) continue;
        
        if (lowerText.includes(kw.toLowerCase())) {
          score += 15;
          matches.push(`Keyword match: ${kw}`);
        }
      }
    }

    // 4. Location Match (Contextual Specificity)
    if (protectee.locations && Array.isArray(protectee.locations)) {
      for (const loc of protectee.locations) {
        if (lowerText.includes(loc.toLowerCase())) {
          score += 15;
          matches.push(`Location match: ${loc}`);
        }
      }
    }

    // Cap the score at 100
    score = Math.min(score, 100);

    let reason = matches.length > 0 
      ? `Found ${matches.length} target indicator(s).` 
      : 'No direct target indicators found.';

    return {
      score: score,
      matches: matches,
      reason: reason
    };
  }
}

module.exports = new TargetMatcher();
