const fs = require("fs");

let hosts = [];

let HOSTS_FILE = "/etc/hosts";

function truncatedHostsFileLines(data, limit) {
  return data.length > limit
    ? data.substring(0, limit).split("\n").slice(0, -1)
    : data.split("\n");
}

fs.readFile(HOSTS_FILE, "utf8", (err, data) => {
  if (err) {
    console.warn("error retrieving hosts file", err);
    return;
  }

  const hostsMap = {}; // this is used to deduplicate the list

  const lines = truncatedHostsFileLines(data, 128 * 1024);

  lines.forEach((line) => {
    if (line.startsWith("#")) return;
    line.split(/\s/g).forEach((host) => {
      if (
        host.length > 0 &&
        host !== "255.255.255.255" &&
        host !== "broadcasthost" &&
        !hostsMap[host]
      ) {
        hosts.push(host);
        hostsMap[host] = true;
      }
    });
  });
});

export default hosts;
