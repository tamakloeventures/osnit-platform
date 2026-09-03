// Use the global Prisma instance or create one with adapter
let prisma;
try {
  prisma = global.prisma;
  if (!prisma) {
    const { PrismaClient } = require('@prisma/client');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
  }
} catch (error) {
  console.error('Prisma initialization error:', error);
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
}

const axios = require('axios');

class DataSourceService {
  constructor() {
    this.sources = {
      openSecrets: {
        baseUrl: 'https://www.opensecrets.org/api/',
        apiKey: process.env.OPENSECRETS_API_KEY,
        enabled: !!process.env.OPENSECRETS_API_KEY
      },
      littleSis: {
        baseUrl: 'https://api.littlesis.org/',
        apiKey: process.env.LITTLESIS_API_KEY,
        enabled: !!process.env.LITTLESIS_API_KEY
      },
      aleph: {
        baseUrl: 'https://aleph.occrp.org/api/',
        apiKey: process.env.ALEPH_API_KEY,
        enabled: !!process.env.ALEPH_API_KEY
      }
    };
    console.log('✅ Data Source Service initialized');
  }

  // ============ PEP SCREENING ============
  async searchPEP(name, country) {
    const results = [];

    try {
      const response = await axios.get(`https://api.opensanctions.org/search/default?q=${encodeURIComponent(name)}`);
      if (response.data.results) {
        response.data.results.forEach(item => {
          if (item.schema === 'Person' || item.schema === 'LegalPerson') {
            results.push({
              source: 'OpenSanctions',
              type: item.schema,
              name: item.caption || name,
              country: item.properties?.country || country || 'Unknown',
              risk: item.properties?.risk || 'Medium',
              reason: item.properties?.reason || 'Politically Exposed Person',
              url: item.url || null,
            });
          }
        });
      }
    } catch (error) {
      console.log('⚠️ OpenSanctions API error (may require API key)');
    }

    if (this.sources.aleph.enabled) {
      try {
        const response = await axios.get(`${this.sources.aleph.baseUrl}entities?q=${encodeURIComponent(name)}&schema=Person`, {
          headers: { 'Authorization': `Bearer ${this.sources.aleph.apiKey}` }
        });
        if (response.data.results) {
          response.data.results.forEach(item => {
            results.push({
              source: 'Aleph',
              type: item.schema,
              name: item.properties?.name || name,
              country: item.properties?.country || country || 'Unknown',
              risk: item.collections?.includes('pep') ? 'High' : 'Medium',
              reason: item.properties?.summary || 'Public figure',
              url: item.links?.self || null,
            });
          });
        }
      } catch (error) {
        console.log('⚠️ Aleph API error');
      }
    }

    return results;
  }

  // ============ CAMPAIGN FINANCE ============
  async searchCampaignFinance(candidateName, year = 2024) {
    const results = [];

    if (this.sources.openSecrets.enabled) {
      try {
        const response = await axios.get(`${this.sources.openSecrets.baseUrl}`, {
          params: {
            method: 'candidateSummary',
            cid: candidateName,
            apikey: this.sources.openSecrets.apiKey,
            output: 'json'
          }
        });
        if (response.data.response) {
          results.push({
            source: 'OpenSecrets',
            candidate: response.data.response.candidate || candidateName,
            totalRaised: response.data.response.total_raised || 'N/A',
            totalSpent: response.data.response.total_spent || 'N/A',
            cashOnHand: response.data.response.cash_on_hand || 'N/A',
            year: year
          });
        }
      } catch (error) {
        console.log('⚠️ OpenSecrets API error');
      }
    }

    return results;
  }

  // ============ NEWS COLLECTION ============
  async collectNews(keywords, protecteeId) {
    const results = [];
    
    try {
      const feeds = [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
        'https://www.aljazeera.com/xml/rss/all.xml',
        'https://feeds.reuters.com/reuters/worldNews'
      ];

      const Parser = require('rss-parser');
      const parser = new Parser();

      for (const feedUrl of feeds) {
        try {
          const feed = await parser.parseURL(feedUrl);
          for (const item of feed.items.slice(0, 5)) {
            const title = item.title || '';
            const content = (item.contentSnippet || item.content || '');
            
            const matchesKeyword = keywords.some(kw => 
              title.toLowerCase().includes(kw.toLowerCase()) || 
              content.toLowerCase().includes(kw.toLowerCase())
            );

            if (matchesKeyword) {
              results.push({
                source: 'News',
                title: title,
                content: content.substring(0, 500),
                url: item.link,
                publishedAt: item.pubDate || new Date().toISOString(),
                protecteeId: protecteeId
              });
            }
          }
        } catch (feedError) {
          console.log(`⚠️ Error fetching ${feedUrl}:`, feedError.message);
        }
      }
    } catch (error) {
      console.error('News collection error:', error);
    }

    return results;
  }

  // ============ SOCIAL MEDIA MONITORING ============
  async collectSocialMedia(keywords, protecteeId) {
    const results = [];

    if (process.env.TWITTER_BEARER_TOKEN) {
      try {
        const TwitterApi = require('twitter-api-v2');
        const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
        
        const query = keywords.map(k => `"${k}"`).join(' OR ');
        const tweets = await client.v2.search(query, {
          'tweet.fields': ['created_at', 'author_id', 'public_metrics'],
          max_results: 10
        });

        if (tweets.data) {
          tweets.data.forEach(tweet => {
            results.push({
              source: 'Twitter',
              content: tweet.text,
              author: tweet.author_id || 'Unknown',
              postedAt: tweet.created_at || new Date().toISOString(),
              url: `https://twitter.com/i/web/status/${tweet.id}`,
              protecteeId: protecteeId,
              metrics: tweet.public_metrics || {}
            });
          });
        }
      } catch (error) {
        console.log('⚠️ Twitter API error:', error.message);
      }
    }

    return results;
  }

  // ============ CORPORATE REGISTRY ============
  async searchCorporateRegistry(name) {
    const results = [];

    if (process.env.OPENCORPORATES_API_KEY) {
      try {
        const response = await axios.get(`https://api.opencorporates.com/v0.4/companies/search`, {
          params: {
            q: name,
            api_token: process.env.OPENCORPORATES_API_KEY
          }
        });
        
        if (response.data.results?.companies) {
          response.data.results.companies.forEach(company => {
            results.push({
              name: company.company.name,
              jurisdiction: company.company.jurisdiction_code,
              registrationNumber: company.company.registration_number,
              status: company.company.current_status,
              url: company.company.opencorporates_url,
            });
          });
        }
      } catch (error) {
        console.log('⚠️ OpenCorporates API error');
      }
    }

    return results;
  }

  // ============ RUN ALL DATA SOURCES ============
  async runFullIntelligenceScan(protecteeName, protecteeId, keywords) {
    console.log(`🔍 Running full intelligence scan for: ${protecteeName}`);

    const results = {
      pep: [],
      news: [],
      social: [],
      corporate: [],
      campaign: []
    };

    try {
      results.pep = await this.searchPEP(protecteeName);
      results.news = await this.collectNews(keywords, protecteeId);
      results.social = await this.collectSocialMedia(keywords, protecteeId);
      results.corporate = await this.searchCorporateRegistry(protecteeName);
      results.campaign = await this.searchCampaignFinance(protecteeName);

      console.log(`✅ Scan complete: ${results.pep.length} PEPs, ${results.news.length} news, ${results.social.length} social`);

      await this.storeScanResults(protecteeId, results);
      return results;
    } catch (error) {
      console.error('Full scan error:', error);
      return results;
    }
  }

  // ============ STORE SCAN RESULTS ============
  async storeScanResults(protecteeId, results) {
    try {
      const entries = [];

      results.pep.forEach(pep => {
        entries.push({
          source: pep.source,
          content: `PEP detected: ${pep.name} (${pep.country}) - ${pep.reason}`,
          author: 'PEP Screening',
          postedDate: new Date(),
          protecteeId: protecteeId,
          rawData: pep
        });
      });

      results.news.forEach(news => {
        entries.push({
          source: 'News',
          content: news.title + '\n' + news.content,
          url: news.url,
          author: 'News Collection',
          postedDate: new Date(news.publishedAt),
          protecteeId: protecteeId,
          rawData: news
        });
      });

      results.social.forEach(social => {
        entries.push({
          source: social.source,
          content: social.content,
          url: social.url,
          author: social.author,
          postedDate: new Date(social.postedAt),
          protecteeId: protecteeId,
          rawData: social
        });
      });

      results.corporate.forEach(corp => {
        entries.push({
          source: 'Corporate Registry',
          content: `Company: ${corp.name} (${corp.jurisdiction}) - Status: ${corp.status}`,
          url: corp.url,
          author: 'Corporate Registry',
          postedDate: new Date(),
          protecteeId: protecteeId,
          rawData: corp
        });
      });

      for (const entry of entries) {
        await prisma.collectedData.create({
          data: entry
        });
      }

      console.log(`✅ Stored ${entries.length} intelligence items`);

    } catch (error) {
      console.error('Store error:', error);
    }
  }
}

module.exports = new DataSourceService();
