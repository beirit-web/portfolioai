async function readMetadata(page, html) {
  return page.evaluate(source => {
    const doc = source ? new DOMParser().parseFromString(source, "text/html") : document;
    const content = selector => doc.querySelector(selector)?.getAttribute("content");
    return {
      title: doc.title,
      description: content('meta[name="description"]'),
      robots: content('meta[name="robots"]'),
      canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      ogTitle: content('meta[property="og:title"]'),
      ogDescription: content('meta[property="og:description"]'),
      ogUrl: content('meta[property="og:url"]'),
      twitterTitle: content('meta[name="twitter:title"]'),
      twitterDescription: content('meta[name="twitter:description"]'),
      twitterUrl: content('meta[name="twitter:url"]'),
    };
  }, html);
}

module.exports = { readMetadata };
