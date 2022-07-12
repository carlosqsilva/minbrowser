import debounce from "lodash.debounce";
import * as searchbar from "../searchbar";
import { autocompleteURL } from "../shared/autocomplete";

import { urlParser } from "../shared/urlParser";
import { searchEngine } from "../searchEngine/renderer";
import { l } from "../../../localization";
import { currentTab, stateUI } from "../store";

const ddgAttribution = l("resultsFromDDG");

function removeTags(text) {
  return text.replace(/<.*?>/g, "");
}

interface Answer {
  title: string;
  descriptionBlock: string;
  attribution: string;
  colorCircle?: number | string;
  url?: string;
  image?: string;
}

const instantAnswers = {
  color_code: (searchText, answer): Answer => {
    const data: Answer = {
      title: searchText,
      descriptionBlock: answer.replace(/\n/g, " · ").replace(/\s~\s/g, " · "),
      attribution: ddgAttribution,
    };

    const rgb = answer.split(" ~ ").filter((format) => {
      return format.startsWith("RGBA");
    });

    if (rgb[0]) {
      data.colorCircle = rgb[0];
    }

    return data;
  },
  currency_in: (searchText, answer): Answer => {
    let title = "";
    if (typeof answer === "string") {
      // there is only one currency
      title = answer;
    } else {
      // multiple currencies
      const currencyArr: string[] = [];
      for (var countryCode in answer) {
        currencyArr.push(answer[countryCode] + " (" + countryCode + ")");
      }

      title = currencyArr.join(", ");
    }

    let descriptionBlock: string;
    if (answer.data) {
      descriptionBlock = answer.data.title;
    } else {
      descriptionBlock = l("DDGAnswerSubtitle");
    }

    return {
      title: title,
      descriptionBlock: descriptionBlock,
      attribution: ddgAttribution,
    };
  },
};

interface Topic {
  Result: string;
  Text: string;
  FirstURL: string;
}

const pluginName = "instantAnswers";

const showRelatedTopics = (topics: Topic[]) => {
  topics.slice(0, 3).forEach((item) => {
    // the DDG api returns the entity name inside an <a> tag
    const entityName = item.Result.replace(/.*>(.+?)<.*/g, "$1");

    // the text starts with the entity name, remove it
    const desc = item.Text.replace(entityName, "");

    // try to convert the given url to a wikipedia link
    const entityNameRegex = /https:\/\/duckduckgo.com\/(.*?)\/?$/;

    let url: string;
    if (entityNameRegex.test(item.FirstURL)) {
      url =
        "https://wikipedia.org/wiki/" +
        entityNameRegex.exec(item.FirstURL)?.[1]!;
    } else {
      url = item.FirstURL;
    }

    searchbar.addResult(
      pluginName,
      {
        title: entityName,
        descriptionBlock: desc,
        url: url,
      },
      true
    );
  });
};

function showSearchbarInstantAnswers(text, input, event) {
  // only make requests to the DDG api if DDG is set as the search engine
  if (searchEngine.getCurrent().name !== "DuckDuckGo") {
    return;
  }

  // don't make a request if the searchbar has already closed

  if (stateUI.editorHidden) {
    return;
  }

  fetch(
    "https://api.duckduckgo.com/?t=min&skip_disambig=1&no_redirect=1&format=json&q=" +
      encodeURIComponent(text)
  )
    .then((data) => data.json())
    .then((res) => {
      searchbar.resetPlugin(pluginName);

      let data: Answer;

      const hasAnswer =
        instantAnswers[res.AnswerType] ||
        (res.Answer && typeof res.Answer === "string");

      // if there is a custom format for the answer, use that
      if (instantAnswers[res.AnswerType]) {
        data = instantAnswers[res.AnswerType](text, res.Answer);

        // use the default format
      } else if (
        res.Abstract ||
        (res.Answer && typeof res.Answer === "string")
      ) {
        data = {
          title:
            (typeof res.Answer === "string" && removeTags(res.Answer)) ||
            removeTags(res.Heading),
          descriptionBlock: res.Abstract || l("DDGAnswerSubtitle"),
          attribution: ddgAttribution,
          url: res.AbstractURL || text,
        };

        if (res.Image && !res.ImageIsLogo) {
          data.image = res.Image;
          if (data.image?.startsWith("/")) {
            // starting 11/2020, the DDG API returns relative URLs rather than absolute ones
            data.image = "https://duckduckgo.com" + data.image;
          }
        }

        // show a disambiguation
      } else if (res.RelatedTopics) {
        showRelatedTopics(res.RelatedTopics);
      }

      if (data) {
        // answers are more relevant, they should be displayed at the top
        if (hasAnswer) {
          searchbar.setTopAnswer(pluginName, data);
        } else {
          searchbar.addResult(pluginName, data, true);
        }
      }

      // suggested site links
      if (
        searchbar.getResultCount("places") < 4 &&
        res.Results &&
        res.Results[0] &&
        res.Results[0].FirstURL
      ) {
        const url = res.Results[0].FirstURL;

        const suggestedSiteData: searchbar.Result = {
          icon: "carbon:earth-filled",
          title: urlParser.basicURL(url),
          url: url,
          className: "ddg-answer",
        };

        if (searchbar.getTopAnswer()) {
          searchbar.addResult(pluginName, suggestedSiteData);
        } else {
          if (event && event.keyCode !== 8) {
            // don't autocomplete if delete key pressed
            const autocompletionType = autocompleteURL(input, url);

            if (autocompletionType !== -1) {
              suggestedSiteData.fakeFocus = true;
            }
          }

          searchbar.setTopAnswer(pluginName, suggestedSiteData);
        }
      }

      // if we're showing a location, show a "Search on OpenStreetMap" link

      const entitiesWithLocations = [
        "location",
        "country",
        "u.s. state",
        "protected area",
      ];

      if (entitiesWithLocations.indexOf(res.Entity) !== -1) {
        searchbar.addResult(pluginName, {
          icon: "carbon:search",
          title: res.Heading,
          secondaryText: l("searchWith").replace("%s", "OpenStreetMap"),
          className: "ddg-answer",
          url:
            "https://www.openstreetmap.org/search?query=" +
            encodeURIComponent(res.Heading),
        });
      }
    })
    .catch((e) => {
      console.error(e);
    });
}

export const instantAnswer: searchbar.Plugin = {
  name: pluginName,
  showResults: debounce(showSearchbarInstantAnswers, 150),
  trigger: (text: string) => {
    return (
      text.length > 3 && !urlParser.isPossibleURL(text) && !currentTab().private
    );
  },
};
