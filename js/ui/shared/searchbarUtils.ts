import { urlParser } from "./urlParser";

// export function createHeading(data) {
//   const heading = document.createElement("h4");
//   heading.className = "searchbar-heading";
//   heading.textContent = data.text || "";
//   return heading;
// }

// attempts to shorten a page title, removing unimportant text like the site name
export function getRealTitle(text: string) {
  // don't try to parse URL's
  if (urlParser.isURL(text)) {
    return text;
  }

  const possibleCharacters = ["|", ":", " - ", " — "];

  for (const char of possibleCharacters) {
    // var char = possibleCharacters[i]
    // match url's of pattern: title | website name
    const titleChunks = text.split(char);

    if (titleChunks.length >= 2) {
      const titleChunksTrimmed = titleChunks.map((c) => c.trim());
      if (
        titleChunksTrimmed[titleChunksTrimmed.length - 1].length < 5 ||
        titleChunksTrimmed[titleChunksTrimmed.length - 1].length /
          text.length <=
          0.3
      ) {
        return titleChunks.slice(0, -1).join(char);
      }
    }
  }

  // fallback to the regular title

  return text;
}
