// @ts-check

const searchbarPlugins = require("./searchbarPlugins.js");

const urlParser = require("../util/urlParser.js");
const searchEngine = require("../util/searchEngine.js");
const debounce = require("lodash.debounce");
const { tasks } = require("../tabState");

function showSearchSuggestions(text, input, event) {
  const suggestionsURL = searchEngine.getCurrent().suggestionsURL;

  if (!suggestionsURL) {
    searchbarPlugins.reset("searchSuggestions");
    return;
  }

  if (
    searchbarPlugins.getResultCount() -
      searchbarPlugins.getResultCount("searchSuggestions") >
    3
  ) {
    searchbarPlugins.reset("searchSuggestions");
    return;
  }

  fetch(suggestionsURL.replace("%s", encodeURIComponent(text)), {
    cache: "force-cache",
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (results) {
      searchbarPlugins.reset("searchSuggestions");

      if (searchbarPlugins.getResultCount() > 3) {
        return;
      }

      if (results) {
        results = results[1].slice(0, 3);
        results.forEach(function (result) {
          var data = {
            title: result,
            url: result,
          };

          if (urlParser.isPossibleURL(result)) {
            // website suggestions
            data.icon = "carbon:earth-filled";
          } else {
            // regular search results
            data.icon = "carbon:search";
          }

          searchbarPlugins.addResult("searchSuggestions", data);
        });
      }
    });
}

function initialize() {
  searchbarPlugins.register("searchSuggestions", {
    index: 4,
    trigger: function (text) {
      return (
        !!text &&
        text.indexOf("!") !== 0 &&
        !tasks.tabs.get(tasks.tabs.getSelected()).private
      );
    },
    showResults: debounce(showSearchSuggestions, 50),
  });
}

module.exports = { initialize };
