export const metaThemeValues = {
  light: "#fff",
  dark: "rgb(36, 41, 47)",
  sepia: "rgb(247, 231, 199)",
};

export function isNight() {
  const hours = new Date().getHours();
  return hours > 21 || hours < 6;
}
