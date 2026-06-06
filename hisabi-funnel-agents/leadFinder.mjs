import fs from 'fs';
import path from 'path';

/**
 * Lead Finder Agent for Hisabi
 * 
 * Searches DuckDuckGo HTML parser for Moroccan freelancer contacts and auto-entrepreneurs,
 * extracting potential leads and saving them to leads.json.
 */
async function searchLeads(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  console.log(`🔍 Searching DuckDuckGo for: "${query}"...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch DDG: ${response.statusText}`);
    }

    const html = await response.text();
    const leads = [];

    // Parse DuckDuckGo HTML results
    const resultBlockRegex = /<div class="result results_links results_links_deep web-result[^"]*">([\s\S]*?)<\/div>/g;
    let match;
    
    while ((match = resultBlockRegex.exec(html)) !== null) {
      const block = match[1];
      
      const titleMatch = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/.exec(block) || /<a class="result__link"[^>]* href="([^"]*)">([\s\S]*?)<\/a>/.exec(block);
      const urlMatch = /href="([^"]*)"/.exec(block);
      const snippetMatch = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/.exec(block);

      if (urlMatch) {
        let title = 'Unknown Title';
        if (titleMatch) {
          title = titleMatch[2] ? titleMatch[2].replace(/<[^>]*>/g, '').trim() : titleMatch[1].replace(/<[^>]*>/g, '').trim();
        }
        let url = urlMatch[1];
        if (url.includes('uddg=')) {
          const parts = url.split('uddg=');
          url = decodeURIComponent(parts[1].split('&')[0]);
        }
        
        let snippet = '';
        if (snippetMatch) {
          snippet = snippetMatch[1].replace(/<[^>]*>/g, '').trim();
        }

        if (!url.includes('duckduckgo.com') && url.startsWith('http')) {
          // Attempt to extract email pattern from snippet or title if present
          const emailMatch = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/.exec(snippet + " " + title);
          const email = emailMatch ? emailMatch[1] : null;

          leads.push({
            title,
            url,
            snippet,
            domain: new URL(url).hostname,
            email,
            dateFound: new Date().toISOString(),
            status: 'new'
          });
        }
      }
    }

    return leads;
  } catch (error) {
    console.error(`❌ Error searching for "${query}":`, error.message);
    return [];
  }
}

export async function runLeadFinder() {
  const queries = [
    'site:ma "freelance" (développeur OR designer OR consultant)',
    'site:ma "freelance" OR "auto-entrepreneur" (photographe OR traducteur OR rédacteur)',
    'site:linkedin.com/in/ "freelance" "Casablanca" OR "Rabat" OR "Maroc"',
    'site:ma "contact" "email" "auto-entrepreneur"'
  ];

  let allLeads = [];
  const leadsFilePath = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), 'leads.json');

  if (fs.existsSync(leadsFilePath)) {
    try {
      allLeads = JSON.parse(fs.readFileSync(leadsFilePath, 'utf8'));
      console.log(`Loaded ${allLeads.length} existing leads.`);
    } catch (e) {
      console.log('No valid existing leads found. Starting fresh.');
    }
  }

  for (const query of queries) {
    const leads = await searchLeads(query);
    console.log(`Found ${leads.length} leads for this query.`);
    
    leads.forEach(newLead => {
      if (!allLeads.some(existingLead => existingLead.url === newLead.url)) {
        allLeads.push(newLead);
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  fs.writeFileSync(leadsFilePath, JSON.stringify(allLeads, null, 2), 'utf8');
  console.log(`\n🎉 Success! Total unique leads saved to ${leadsFilePath}: ${allLeads.length}`);
  return allLeads.length;
}

if (process.argv[1] && process.argv[1].endsWith('leadFinder.mjs')) {
  runLeadFinder();
}
