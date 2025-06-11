const { chromium } = require('playwright');

module.exports = async (req, res) => {
  const { domain, keywords } = req.body || {};
  if (!domain || !keywords || !Array.isArray(keywords)) {
    return res.status(400).json({ error: 'Missing domain or keywords[]' });
  }

  const query = `${domain} ${keywords.join(' ')}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`https://www.perplexity.ai/search?q=${encodeURIComponent(query)}`);

  await page.waitForTimeout(5000); // Let page load citations

  const citations = await page.$$eval('a[href^="http"]', links =>
    links
      .filter(link => link.textContent && link.href.includes('http'))
      .slice(0, 10)
      .map(link => ({
        title: link.textContent.trim(),
        snippet: '',
        source: 'Perplexity',
        url: link.href,
        date: new Date().toISOString(),
      }))
  );

  await browser.close();

  return res.status(200).json({ citations });
};
