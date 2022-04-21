export function enableDarkMode() {
  document.body.classList.add("dark-mode");
  window.isDarkMode = true;
  requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent("themechange"));
  });
}

export function disableDarkMode() {
  document.body.classList.remove("dark-mode");
  window.isDarkMode = false;
  requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent("themechange"));
  });
}
