import { formatDate } from "../util/format";

function extractFromDocument(doc: Document) {
  const dateItem = doc.querySelector(
    '[itemprop*="dateCreated"], [itemprop*="datePublished"], [property="article:published_time"]'
  );

  if (dateItem) {
    try {
      let d = Date.parse(dateItem.getAttribute("content"));

      if (Number.isNaN(d)) {
        // for <time> elements
        d = Date.parse(dateItem.getAttribute("datetime"));
      }

      if (Number.isNaN(d)) {
        // for washington post
        d = Date.parse(dateItem.textContent);
      }

      return formatDate(d);
    } catch (e) {
      console.warn(e);
    }

    return null;
  }
}

function extractDateURL(url: string) {
  try {
    // look for a url with a yyyy/mm/dd format
    const urlmatch = url.match(/\/([0-9]{4})\/([0-9]{1,2})\/([0-9]{1,2})/);

    if (urlmatch) {
      const d = new Date();
      d.setFullYear(parseInt(urlmatch[1]));
      d.setMonth(parseInt(urlmatch[2]) - 1);
      d.setDate(parseInt(urlmatch[3]));
      return formatDate(d);
    }
  } catch (e) {
    console.warn(e);
  }

  return null;
}

export function extractDate(doc: Document, articleURL: string) {
  const date = extractFromDocument(doc);
  return date ? date : extractDateURL(articleURL);
}
