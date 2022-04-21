/* global importScripts db performance searchPlaces postMessage fullTextPlacesSearch */

console.log("worker started ", performance.now());

import { score as stringScore } from "string_score";

import Dexie from "dexie";
import { stemmer } from "stemmer";

import { db, Place } from "../util/database";
import { nonLetterRegex } from "../../ext/xregexp/nonLetterRegex";

const spacesRegex = /[+\s._/-]+/g; // things that could be considered spaces
const oneDayInMS = 24 * 60 * 60 * 1000; // one day in milliseconds
const whitespaceRegex = /\s+/g;
const ignoredCharactersRegex = /[']+/g;
const oneWeekAgo = Date.now() - oneDayInMS * 7;
const maxItemAge = oneDayInMS * 42; // the oldest an item can be to remain in the database

// cache history in memory for faster searching. This actually takes up very little space, so we can cache everything.
let historyInMemoryCache: Place[] = [];
let doneLoadingHistoryCache = false;

const stopWords = {
  "": true,
  a: true,
  able: true,
  about: true,
  across: true,
  after: true,
  all: true,
  almost: true,
  also: true,
  am: true,
  among: true,
  an: true,
  and: true,
  any: true,
  are: true,
  as: true,
  at: true,
  be: true,
  because: true,
  been: true,
  but: true,
  by: true,
  can: true,
  cannot: true,
  could: true,
  dear: true,
  did: true,
  do: true,
  does: true,
  either: true,
  else: true,
  ever: true,
  every: true,
  for: true,
  from: true,
  get: true,
  got: true,
  had: true,
  has: true,
  have: true,
  he: true,
  her: true,
  hers: true,
  him: true,
  his: true,
  how: true,
  however: true,
  i: true,
  if: true,
  in: true,
  into: true,
  is: true,
  it: true,
  its: true,
  just: true,
  least: true,
  let: true,
  like: true,
  likely: true,
  may: true,
  me: true,
  might: true,
  most: true,
  must: true,
  my: true,
  neither: true,
  no: true,
  nor: true,
  not: true,
  of: true,
  off: true,
  often: true,
  on: true,
  only: true,
  or: true,
  other: true,
  our: true,
  own: true,
  rather: true,
  said: true,
  say: true,
  says: true,
  she: true,
  should: true,
  since: true,
  so: true,
  some: true,
  than: true,
  that: true,
  the: true,
  their: true,
  them: true,
  then: true,
  there: true,
  these: true,
  they: true,
  this: true,
  tis: true,
  to: true,
  too: true,
  twas: true,
  us: true,
  wants: true,
  was: true,
  we: true,
  were: true,
  what: true,
  when: true,
  where: true,
  which: true,
  while: true,
  who: true,
  whom: true,
  why: true,
  will: true,
  with: true,
  would: true,
  yet: true,
  you: true,
  your: true,
};

function calculateHistoryScore(item: Place) {
  // item.boost - how much the score should be multiplied by. Example - 0.05
  let fs = item.lastVisit * (1 + 0.036 * Math.sqrt(item.visitCount));

  // bonus for short url's
  if (item.url.length < 20) {
    fs += (30 - item.url.length) * 2500;
  }

  if (item.boost) {
    fs += fs * item.boost;
  }

  return fs;
}

function cleanupHistoryDatabase() {
  // removes old history entries
  db.places
    .where("lastVisit")
    .below(Date.now() - maxItemAge)
    .and((item) => item.isBookmarked === false)
    .delete();
}

setTimeout(cleanupHistoryDatabase, 20000); // don't run immediately on startup, since is might slow down searchbar search.
setInterval(cleanupHistoryDatabase, 60 * 60 * 1000);

function processSearchText(text: string) {
  // the order of these transformations is important - for example, spacesRegex removes / characters, so protocols must be removed before it runs
  return text
    .toLowerCase()
    .split("?")[0]
    .replace("http://", "")
    .replace("https://", "")
    .replace("www.", "")
    .replace(spacesRegex, " ");
}

function searchPlaces(searchText, callback, options) {
  function processSearchItem(item) {
    if (limitToBookmarks && !item.isBookmarked) {
      return;
    }
    const itextURL = processSearchText(item.url);
    let itext = itextURL;

    if (item.url !== item.title) {
      itext += " " + item.title.toLowerCase().replace(spacesRegex, " ");
    }

    if (item.tags) {
      itext += " " + item.tags.join(" ");
    }

    const tindex = itext.indexOf(st);

    // if the url contains the search string, count as a match
    // prioritize matches near the beginning of the url
    if (tindex === 0) {
      item.boost = itemStartBoost; // large amount of boost for this
      matches.push(item);
    } else if (tindex !== -1) {
      item.boost = exactMatchBoost;
      matches.push(item);
    } else {
      // if all of the search words (split by spaces, etc) exist in the url, count it as a match, even if they are out of order

      if (substringSearchEnabled) {
        let substringMatch = true;

        // check if the search text matches but is out of order
        for (let i = 0; i < swl; i++) {
          if (itext.indexOf(searchWords[i]) === -1) {
            substringMatch = false;
            break;
          }
        }

        if (substringMatch) {
          item.boost = 0.125 * swl + 0.02 * stl;
          matches.push(item);
          return;
        }
      }

      if (item.visitCount !== 1 || item.lastVisit > oneWeekAgo) {
        // if the item has been visited more than once, or has been visited in the last week, we should calculate the fuzzy score. Otherwise, it is ignored. This reduces the number of bad results and increases search speed.
        const score = stringScore(itextURL, st, 0);

        if (score > 0.4 + 0.00075 * itextURL.length) {
          item.boost = score * 0.5;

          if (score > 0.62) {
            item.boost += 0.33;
          }

          matches.push(item);
        }
      }
    }
  }

  const matches: Place[] = [];
  const st = processSearchText(searchText);
  const stl = searchText.length;
  const searchWords = st.split(" ");
  const swl = searchWords.length;
  let substringSearchEnabled = false;
  const itemStartBoost = Math.min(2.5 * stl, 10);
  const exactMatchBoost = 0.4 + 0.075 * stl;
  const limitToBookmarks = options && options.searchBookmarks;
  const resultsLimit = (options && options.limit) || 100;

  if (searchText.indexOf(" ") !== -1) {
    substringSearchEnabled = true;
  }

  for (let i = 0; i < historyInMemoryCache.length; i++) {
    if (matches.length > resultsLimit * 2) {
      break;
    }
    processSearchItem(historyInMemoryCache[i]);
  }

  matches.sort((a, b) => {
    // we have to re-sort to account for the boosts applied to the items
    return calculateHistoryScore(b) - calculateHistoryScore(a);
  });

  // clean up
  matches.forEach((match) => {
    match.boost = 0;
  });

  callback(matches.slice(0, resultsLimit));
}

function addToHistoryCache(item) {
  if (item.isBookmarked) {
    tagIndex.addPage(item);
  }
  delete item.pageHTML;
  delete item.searchIndex;

  historyInMemoryCache.push(item);
}

function addOrUpdateHistoryCache(item) {
  delete item.pageHTML;
  delete item.searchIndex;

  let oldItem;

  for (let i = 0; i < historyInMemoryCache.length; i++) {
    if (historyInMemoryCache[i].url === item.url) {
      oldItem = historyInMemoryCache[i];
      historyInMemoryCache[i] = item;
      break;
    }
  }

  if (!oldItem) {
    historyInMemoryCache.push(item);
  }

  if (oldItem) {
    tagIndex.onChange(oldItem, item);
  }
}

function loadHistoryInMemory() {
  historyInMemoryCache = [];

  db.places
    .orderBy("visitCount")
    .reverse()
    .each((item) => {
      addToHistoryCache(item);
    })
    .then(() => {
      // if we have enough matches during the search, we exit. In order for this to work, frequently visited sites have to come first in the cache.
      historyInMemoryCache.sort((a, b) => {
        return calculateHistoryScore(b) - calculateHistoryScore(a);
      });

      doneLoadingHistoryCache = true;
    });
}

function tokenize(string: string): string[] {
  return string
    .trim()
    .toLowerCase()
    .replace(ignoredCharactersRegex, "")
    .replace(nonLetterRegex, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(whitespaceRegex)
    .filter((token) => {
      return !stopWords[token] && token.length <= 100;
    })
    .map((token) => stemmer(token))
    .slice(0, 20000);
}

const tagIndex = {
  totalDocs: 0,
  termDocCounts: {},
  termTags: {},
  tagTagMap: {},
  tagCounts: {},
  tagUpdateTimes: {},
  getPageTokens: (page: Place) => {
    let urlChunk = "";
    try {
      // ignore the TLD, since it doesn't predict tags very well
      urlChunk = new URL(page.url).hostname.split(".").slice(0, -1).join(".");
    } catch (e) {}
    let tokens = tokenize(page.title + " " + urlChunk);

    let generic = ["www", "com", "net", "html", "pdf", "file"];
    tokens = tokens.filter((t) => t.length > 2 && !generic.includes(t));

    return tokens;
  },
  addPage: (page: Place) => {
    if (page.tags.length === 0) {
      return;
    }

    tagIndex.totalDocs++;

    const tokens = tagIndex.getPageTokens(page);

    tokens
      .filter((t, i) => tokens.indexOf(t) === i)
      .forEach((token) => {
        if (!tagIndex.termDocCounts[token]) {
          tagIndex.termDocCounts[token] = 1;
        } else {
          tagIndex.termDocCounts[token]++;
        }
      });

    page.tags.forEach((tag) => {
      tokens.forEach((token) => {
        if (!tagIndex.termTags[token]) {
          tagIndex.termTags[token] = {};
        }
        if (tagIndex.termTags[token][tag]) {
          tagIndex.termTags[token][tag]++;
        } else {
          tagIndex.termTags[token][tag] = 1;
        }
      });
    });

    page.tags.forEach((t1) => {
      if (!tagIndex.tagCounts[t1]) {
        tagIndex.tagCounts[t1] = 1;
      } else {
        tagIndex.tagCounts[t1]++;
      }
      page.tags.forEach((t2) => {
        if (t1 === t2) {
          return;
        }
        if (!tagIndex.tagTagMap[t1]) {
          tagIndex.tagTagMap[t1] = {};
        }

        if (!tagIndex.tagTagMap[t1][t2]) {
          tagIndex.tagTagMap[t1][t2] = 1;
        } else {
          tagIndex.tagTagMap[t1][t2]++;
        }
      });
    });

    page.tags.forEach((tag) => {
      if (
        !tagIndex.tagUpdateTimes[tag] ||
        page.lastVisit > tagIndex.tagUpdateTimes[tag]
      ) {
        tagIndex.tagUpdateTimes[tag] = page.lastVisit;
      }
    });
  },
  removePage: (page: Place) => {
    if (page.tags.length === 0) {
      return;
    }

    tagIndex.totalDocs--;

    const tokens = tagIndex.getPageTokens(page);

    tokens
      .filter((t, i) => tokens.indexOf(t) === i)
      .forEach((token) => {
        if (tagIndex.termDocCounts[token]) {
          tagIndex.termDocCounts[token]--;
        }
      });

    page.tags.forEach((tag) => {
      tokens.forEach((token) => {
        if (tagIndex.termTags[token] && tagIndex.termTags[token][tag]) {
          tagIndex.termTags[token][tag]--;
        }
      });
    });

    page.tags.forEach((t1) => {
      if (tagIndex.tagCounts[t1]) {
        tagIndex.tagCounts[t1]--;
      }

      page.tags.forEach((t2) => {
        if (t1 === t2) {
          return;
        }
        if (!tagIndex.tagTagMap[t1]) {
          tagIndex.tagTagMap[t1] = {};
        }

        if (tagIndex.tagTagMap[t1] && tagIndex.tagTagMap[t1][t2]) {
          tagIndex.tagTagMap[t1][t2]--;
        }
      });
    });
  },
  onChange: (oldPage: Place, newPage: Place) => {
    tagIndex.removePage(oldPage);
    tagIndex.addPage(newPage);
  },
  getAllTagsRanked: (page: Place) => {
    const tokens = tagIndex.getPageTokens(page);
    // get term frequency
    const terms = {};
    tokens.forEach((t) => {
      if (!terms[t]) {
        terms[t] = 1;
      } else {
        terms[t]++;
      }
    });

    const probs = {};

    for (var term in terms) {
      const tf = terms[term] / tokens.length;
      const idf = Math.log(
        tagIndex.totalDocs / (tagIndex.termDocCounts[term] || 1)
      );
      const tfidf = tf * idf;

      if (tagIndex.termTags[term]) {
        for (var tag in tagIndex.termTags[term]) {
          if (tagIndex.tagCounts[tag] < 2) {
            continue;
          }
          if (!probs[tag]) {
            probs[tag] = 0;
          }
          probs[tag] +=
            (tagIndex.termTags[term][tag] / tagIndex.tagCounts[tag]) * tfidf;
        }
      }
    }

    let probsArr = Object.keys(tagIndex.tagCounts).map((key) => {
      return { tag: key, value: probs[key] || 0 };
    });

    probsArr = probsArr.sort((a, b) => {
      return b.value - a.value;
    });

    return probsArr;
  },
  getSuggestedTags: (page: Place) => {
    return tagIndex
      .getAllTagsRanked(page)
      .filter((p) => p.value > 0.25)
      .map((p) => p.tag);
  },
  getSuggestedItemsForTags: (tags: string[]) => {
    let set = historyInMemoryCache
      .filter((i) => i.isBookmarked)
      .map((p) => {
        return { page: p, tags: tagIndex.getSuggestedTags(p) };
      });

    set = set.filter((result) => {
      for (var i = 0; i < tags.length; i++) {
        if (!result.tags.includes(tags[i])) {
          return false;
        }
      }
      return true;
    });

    return set.map((i) => i.page).slice(0, 50);
  },
  autocompleteTags: (searchTags: string[]) => {
    // find which tags are most frequently associated with the searched tags
    const tagScores: { score: number; tag: string }[] = [];

    for (var tag in tagIndex.tagCounts) {
      var score = tagIndex.tagCounts[tag];
      searchTags.forEach((searchTag) => {
        // tagtagMap[searchTag][tag] holds the number of items that have both searchTag and tag
        if (tagIndex.tagTagMap[searchTag]) {
          score *= tagIndex.tagTagMap[searchTag][tag] || 0;
        } else {
          score = 0;
        }
      });

      // prefer tags with a recently-visited (or created) page
      score *= Math.max(
        2 -
          (Date.now() - tagIndex.tagUpdateTimes[tag]) /
            (14 * 24 * 60 * 60 * 1000),
        1
      );

      tagScores.push({ tag, score });
    }

    return tagScores
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((i) => i.tag);
  },
};

function fullTextQuery(tokens: string[]) {
  return db.transaction("r", db.places, function* () {
    // Parallell search for all tokens - just select resulting primary keys
    const tokenMatches = yield Dexie.Promise.all(
      tokens.map((prefix) =>
        db.places.where("searchIndex").equals(prefix).primaryKeys()
      )
    );

    // count of the number of documents containing each token, used for tf-idf calculation

    const tokenMatchCounts = {};
    for (var i = 0; i < tokens.length; i++) {
      tokenMatchCounts[tokens[i]] = tokenMatches[i].length;
    }

    const docResults: Place[] = [];

    /*
    A document matches if each search token is either 1) contained in the title, URL, or tags,
    even if it's part of a larger word, or 2) a word in the full-text index.
     */
    historyInMemoryCache.forEach((item) => {
      const itext = (
        item.url +
        " " +
        item.title +
        " " +
        item.tags.join(" ")
      ).toLowerCase();
      let matched = true;
      for (var i = 0; i < tokens.length; i++) {
        if (!tokenMatches[i].includes(item.id) && !itext.includes(tokens[i])) {
          matched = false;
          break;
        }
      }
      if (matched) {
        docResults.push(item);
      }
    });

    /* Finally select entire documents from intersection.
    To improve perf, we only read the full text of 100 documents for ranking,
     but this could mean we miss relevant documents. So sort them based on page
     score (recency + visit count) and then only read the 100 highest-ranking ones,
     since these are most likely to be in the final results.
    */
    const ordered = docResults
      .sort((a, b) => calculateHistoryScore(b) - calculateHistoryScore(a))
      .map((i) => i.id)
      .slice(0, 100) as number[];

    return {
      documents: yield db.places.where("id").anyOf(ordered).toArray(),
      tokenMatchCounts,
    };
  });
}

function fullTextPlacesSearch(searchText, callback) {
  const searchWords = tokenize(searchText);
  const sl = searchWords.length;

  if (searchWords.length === 0) {
    callback([]);
    return;
  }

  fullTextQuery(searchWords)
    .then((queryResults) => {
      // @ts-ignore
      const docs = queryResults.documents;

      const totalCounts = {};
      for (let i = 0; i < sl; i++) {
        totalCounts[searchWords[i]] = 0;
      }

      const docTermCounts = {};
      const docIndexes = {};

      // find the number and position of the search terms in each document
      docs.forEach((doc) => {
        const termCount = {};
        const index = doc.searchIndex.concat(tokenize(doc.title));
        const indexList: number[] = [];

        for (let i = 0; i < sl; i++) {
          let count = 0;
          const token = searchWords[i];

          let idx = index.indexOf(token);

          while (idx !== -1) {
            count++;
            indexList.push(idx);
            idx = index.indexOf(token, idx + 1);
          }

          termCount[searchWords[i]] = count;
          totalCounts[searchWords[i]] += count;
        }

        docTermCounts[doc.url] = termCount;
        docIndexes[doc.url] = indexList.sort((a, b) => a - b);
      });

      const dl = docs.length;

      for (let i = 0; i < dl; i++) {
        const doc = docs[i];
        const indexLen = doc.searchIndex.length;
        const termCounts = docTermCounts[doc.url];

        if (!doc.boost) {
          doc.boost = 0;
        }

        // add boost when search terms appear close to each other

        const indexList = docIndexes[doc.url];
        let totalWordDistanceBoost = 0;

        for (let n = 1; n < indexList.length; n++) {
          const distance = indexList[n] - indexList[n - 1];
          if (distance < 50) {
            totalWordDistanceBoost += Math.pow(50 - distance, 2) * 0.000075;
          }
          if (distance === 1) {
            totalWordDistanceBoost += 0.05;
          }
        }

        doc.boost += Math.min(totalWordDistanceBoost, 7.5);

        // calculate bm25 score
        // https://en.wikipedia.org/wiki/Okapi_BM25

        const k1 = 1.5;
        const b = 0.75;

        let bm25 = 0;
        for (let x = 0; x < sl; x++) {
          // @ts-ignore
          const nqi = queryResults.tokenMatchCounts[searchWords[x]];
          const bmIdf = Math.log(
            (historyInMemoryCache.length - nqi + 0.5) / (nqi + 0.5) + 1
          );

          const tf = termCounts[searchWords[x]];
          const scorePart2 =
            (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (indexLen / 500))); // 500 is estimated average page length

          bm25 += bmIdf * scorePart2;
        }

        doc.boost += bm25;

        // generate a search snippet for the document

        const snippetIndex = doc.extractedText
          ? doc.extractedText.split(/\s+/g)
          : [];

        // array of 0 or 1 - 1 indicates this item in the snippetIndex is a search word
        const mappedArr = snippetIndex.map((w) =>
          searchWords.includes(
            stemmer(w.toLowerCase().replace(nonLetterRegex, ""))
          )
            ? 1
            : 0
        );

        // find the bounds of the max subarray within mappedArr
        let indexBegin = -10;
        let indexEnd = 0;
        let currentScore = 0;
        let maxScore = 0;
        let maxBegin = -10;
        let maxEnd = 0;
        for (let i2 = 0; i2 < mappedArr.length; i2++) {
          if (indexBegin >= 0) {
            currentScore -= mappedArr[indexBegin];
          }
          currentScore += mappedArr[indexEnd];
          if (
            currentScore > maxScore ||
            (currentScore > 0 &&
              currentScore === maxScore &&
              indexBegin - maxBegin <= 1)
          ) {
            maxBegin = indexBegin;
            maxEnd = indexEnd;
            maxScore = currentScore;
          }
          indexBegin++;
          indexEnd++;
        }

        // include a few words before the start of the match
        maxBegin = maxBegin - 2;

        // shift a few words farther back if doing so makes the snippet start at the beginning of a phrase or sentence
        for (
          let bound = maxBegin;
          bound >= maxBegin - 10 && bound > 0;
          bound--
        ) {
          if (
            snippetIndex[bound].endsWith(".") ||
            snippetIndex[bound].endsWith(",")
          ) {
            maxBegin = bound + 1;
            break;
          }
        }

        const snippet = snippetIndex.slice(maxBegin, maxEnd + 5).join(" ");
        if (snippet) {
          doc.searchSnippet = snippet + "...";
        }

        // these properties are never used, and sending them from the worker takes a long time
        delete doc.pageHTML;
        delete doc.extractedText;
        delete doc.searchIndex;
      }

      callback(docs);
    })
    .catch((e) => console.error(e));
}

loadHistoryInMemory();

onmessage = (e) => {
  const action = e.data.action;
  const pageData = e.data.pageData;
  const flags = e.data.flags || {};
  const searchText = e.data.text && e.data.text.toLowerCase();
  const callbackId = e.data.callbackId;
  const options = e.data.options;

  if (action === "getPlace") {
    let found = false;
    for (let i = 0; i < historyInMemoryCache.length; i++) {
      if (historyInMemoryCache[i].url === pageData.url) {
        postMessage({
          result: historyInMemoryCache[i],
          callbackId: callbackId,
        });
        found = true;
        break;
      }
    }
    if (!found) {
      postMessage({
        result: null,
        callbackId: callbackId,
      });
    }
  }

  if (action === "getAllPlaces") {
    postMessage({
      result: historyInMemoryCache,
      callbackId: callbackId,
    });
  }

  if (action === "updatePlace") {
    db.transaction("rw", db.places, () => {
      db.places
        .where("url")
        .equals(pageData.url)
        .first((item) => {
          var isNewItem = false;
          if (!item) {
            isNewItem = true;
            item = {
              url: pageData.url,
              title: pageData.url,
              color: null,
              visitCount: 0,
              lastVisit: Date.now(),
              pageHTML: "",
              extractedText: pageData.extractedText,
              searchIndex: [],
              isBookmarked: false,
              tags: [],
              metadata: {},
            };
          }
          for (const key in pageData) {
            if (key === "extractedText") {
              item.searchIndex = tokenize(pageData.extractedText);
              item.extractedText = pageData.extractedText;
            } else if (key === "tags") {
              // ensure tags are never saved with spaces in them
              item.tags = pageData.tags.map((t) => t.replace(/\s/g, "-"));
            } else {
              item[key] = pageData[key];
            }
          }

          if (flags.isNewVisit) {
            item.visitCount++;
            item.lastVisit = Date.now();
          }

          db.places.put(item);
          if (isNewItem) {
            addToHistoryCache(item);
          } else {
            addOrUpdateHistoryCache(item);
          }
          postMessage({
            result: null,
            callbackId: callbackId,
          });
        })
        .catch((err) => {
          console.warn("failed to update history.");
          console.warn("page url was: " + pageData.url);
          console.error(err);
        });
    });
  }

  if (action === "deleteHistory") {
    db.places.where("url").equals(pageData.url).delete();

    // delete from the in-memory cache
    for (let i = 0; i < historyInMemoryCache.length; i++) {
      if (historyInMemoryCache[i].url === pageData.url) {
        historyInMemoryCache.splice(i, 1);
      }
    }
  }

  if (action === "deleteAllHistory") {
    db.places
      .filter((item) => item.isBookmarked === false)
      .delete()
      .then(() => {
        loadHistoryInMemory();
      });
  }

  if (action === "getSuggestedTags") {
    postMessage({
      result: tagIndex.getSuggestedTags(
        // @ts-ignore
        historyInMemoryCache.find((i) => i.url === pageData.url)
      ),
      callbackId: callbackId,
    });
  }

  if (action === "getAllTagsRanked") {
    postMessage({
      result: tagIndex.getAllTagsRanked(
        // @ts-ignore
        historyInMemoryCache.find((i) => i.url === pageData.url)
      ),
      callbackId: callbackId,
    });
  }

  if (action === "getSuggestedItemsForTags") {
    postMessage({
      result: tagIndex.getSuggestedItemsForTags(pageData.tags),
      callbackId: callbackId,
    });
  }

  if (action === "autocompleteTags") {
    postMessage({
      result: tagIndex.autocompleteTags(pageData.tags),
      callbackId: callbackId,
    });
  }

  if (action === "searchPlaces") {
    // do a history search
    searchPlaces(
      searchText,
      (matches) => {
        postMessage({
          result: matches,
          callbackId: callbackId,
        });
      },
      options
    );
  }

  if (action === "searchPlacesFullText") {
    fullTextPlacesSearch(searchText, (matches) => {
      matches.sort((a, b) => {
        return calculateHistoryScore(b) - calculateHistoryScore(a);
      });

      postMessage({
        result: matches.slice(0, 100),
        callbackId: callbackId,
      });
    });
  }

  if (action === "getPlaceSuggestions") {
    function returnSuggestionResults() {
      const cTime = Date.now();

      let results = historyInMemoryCache
        .slice()
        .filter((i) => cTime - i.lastVisit < 604800000);

      for (let i = 0; i < results.length; i++) {
        results[i].hScore = calculateHistoryScore(results[i]);
      }

      results = results.sort((a, b) => {
        return b.hScore! - a.hScore!;
      });

      postMessage({
        result: results.slice(0, 100),
        callbackId: callbackId,
      });
    }

    if (historyInMemoryCache.length > 10 || doneLoadingHistoryCache) {
      returnSuggestionResults();
    } else {
      setTimeout(returnSuggestionResults, 100);
    }
  }
};
