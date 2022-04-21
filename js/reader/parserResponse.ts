const regexMatch = /charset=([a-zA-Z0-9-]+)/
export function parseResponse(response: Response) {
  let charset = "utf-8";
  // @ts-ignore
  for (let header of response.headers.entries()) {
    if (header[0].toLowerCase() === "content-type") {
      const charsetMatch = header[1].match(regexMatch);
      if (charsetMatch) {
        charset = charsetMatch[1];
      }
    }
  }

  const decoder = new TextDecoder(charset);
  return response.arrayBuffer().then((buffer) => decoder.decode(buffer));
}