export function formatDate(date: number | Date): string {
  return new Intl.DateTimeFormat(navigator.language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatNumber(num: number = 0) {
  if (num > 50000) {
    return new Intl.NumberFormat(navigator.language, {
      notation: "compact",
      maximumSignificantDigits: 4,
    }).format(num);
  } else {
    return new Intl.NumberFormat().format(num);
  }
}