const { l } = require("../../localization");

// creating formatters is slow, so we we reuse the same one for every call
const formatterInstance = new Intl.DateTimeFormat(navigator.language, {
  year: "numeric",
  month: "long",
});

const msPerDay = 24 * 60 * 60 * 1000;

export function formatRelativeDate(date: number) {
  const currentTime = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0);
  startOfToday.setMinutes(0);
  startOfToday.setSeconds(0);
  const timeElapsedToday = currentTime - startOfToday.getTime();

  const relativeDateRanges = [
    [0, 60000, l("timeRangeJustNow")],
    [60000, 300000, l("timeRangeMinutes")],
    [300000, 3600000, l("timeRangeHour")],
    [3600000, timeElapsedToday, l("timeRangeToday")],
    [timeElapsedToday, timeElapsedToday + msPerDay, l("timeRangeYesterday")],
    [timeElapsedToday + msPerDay, 604800000, l("timeRangeWeek")],
    [604800000, 2592000000, l("timeRangeMonth")],
  ];

  const diff = Date.now() - date;
  for (const relativeRange of relativeDateRanges) {
    if (relativeRange[0] <= diff && relativeRange[1] >= diff) {
      return relativeRange[2];
    }
  }

  return formatterInstance.format(new Date(date));
}
