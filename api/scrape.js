// scrape.js (in your api/ directory)
import { chromium } from 'playwright'; // Changed from require()

export default async function handler(req, res) { // Changed module.exports to export default function
  const { domain, keywords } = req.body || {};
  if (!domain || !keywords || !Array.isArray(keywords)) {
    return res.status(400).json({ error: 'Missing domain or keywords[]' });
  }

  const query = `${domain} ${keywords.join(' ')}`;

  let browser; // Declare browser outside try for finally block
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`https://www.perplexity.ai/search?q=${encodeURIComponent(query)}`);

    // Using page.waitForLoadState('networkidle') or a specific selector is more robust
    // than a fixed timeout, but for quick testing, timeout might suffice.
    await page.waitForTimeout(5000); // Let page load citations

    const citations = await page.$$eval('a[href^="http"]', links =>
      links
        .filter(link => link.textContent && link.href.includes('http'))
        .slice(0, 10)
        .map(link => ({
          title: link.textContent.trim(),
          snippet: '', // Perplexity results often don't have explicit snippets on direct link elements
          source: 'Perplexity',
          url: link.href,
          date: new Date().toISOString(),
        }))
    );

    return res.status(200).json({ citations });

  } catch (error) {
    console.error('Error during scraping:', error);
    return res.status(500).json({ error: 'Scraping failed', details: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
