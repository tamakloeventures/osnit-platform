const fs = require('fs');
const path = require('path');

class ThreatLexicon {
  constructor() {
    this.categories = {};
    this.contextModifiers = {};
    this.isLoaded = false;
    
    // Modular: Drop new JSON files in this folder and add the filename here
    const lexiconFiles = ['en.json', 'gh-african.json'];
    this.loadLexicons(lexiconFiles);
  }

  loadLexicons(files) {
    const lexiconDir = path.join(__dirname, '../../data/lexicons');
    
    try {
      for (const file of files) {
        const filePath = path.join(lexiconDir, file);
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // Merge categories
          if (data.categories) {
            for (const [catName, catData] of Object.entries(data.categories)) {
              if (!this.categories[catName]) {
                this.categories[catName] = {
                  weight: catData.weight,
                  description: catData.description,
                  keywords: []
                };
              }
              // Add keywords, ensuring no duplicates
              const newKeywords = catData.keywords.filter(kw => !this.categories[catName].keywords.includes(kw));
              this.categories[catName].keywords.push(...newKeywords);
            }
          }

          // Merge context modifiers
          if (data.context_modifiers) {
            for (const [modName, modData] of Object.entries(data.context_modifiers)) {
              if (!this.contextModifiers[modName]) {
                this.contextModifiers[modName] = {
                  multiplier: modData.multiplier,
                  keywords: []
                };
              }
              const newKeywords = modData.keywords.filter(kw => !this.contextModifiers[modName].keywords.includes(kw));
              this.contextModifiers[modName].keywords.push(...newKeywords);
            }
          }
        } else {
          console.warn(`⚠️ Lexicon file not found: ${filePath}`);
        }
      }
      this.isLoaded = true;
      console.log(`✅ ThreatLexicon loaded: ${Object.keys(this.categories).length} categories, ${Object.keys(this.contextModifiers).length} context modifiers.`);
    } catch (error) {
      console.error('❌ Failed to load ThreatLexicon:', error);
    }
  }

  /**
   * Get all categories with their weights and keywords.
   */
  getCategories() {
    return this.categories;
  }

  /**
   * Get all context modifiers (news, historical, etc.).
   */
  getContextModifiers() {
    return this.contextModifiers;
  }

  /**
   * Scan text for matches across all categories.
   * Returns an array of matches with category, keyword, weight, and position.
   */
  scanText(text) {
    if (!this.isLoaded) return [];
    
    const matches = [];
    const lowerText = text.toLowerCase();

    for (const [catName, catData] of Object.entries(this.categories)) {
      for (const keyword of catData.keywords) {
        // Use regex to find whole words/phrases to avoid partial matches
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        let match;
        while ((match = regex.exec(lowerText)) !== null) {
          matches.push({
            category: catName,
            keyword: keyword,
            weight: catData.weight,
            index: match.index,
            matchedText: match[0]
          });
        }
      }
    }
    
    return matches;
  }
}

// Export a singleton instance
module.exports = new ThreatLexicon();
