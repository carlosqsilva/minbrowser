export function create() {
  const container = document.createElement("div");
  container.className = "progress-bar-container";

  const pb = document.createElement("div");
  pb.className = "progress-bar p0";
  pb.hidden = true;
  container.appendChild(pb);

  return container;
}

export function update(bar: HTMLElement, status: string) {
  if (status === "start") {
    const loadID = Date.now().toString();
    bar.setAttribute("loading", loadID); // we need to use unique ID's to ensure that the same page that was loading initialy is the same page that is loading 4 seconds later
    setTimeout(() => {
      if (bar.getAttribute("loading") === loadID) {
        bar.hidden = false;
        requestAnimationFrame(() => {
          bar.className = "progress-bar p25";
        });
      }
    }, 4000);
  } else {
    bar.setAttribute("loading", "false");
    if (bar.classList.contains("p25")) {
      bar.className = "progress-bar p100";
      setTimeout(() => {
        bar.className = "progress-bar p0";
        bar.hidden = true;
      }, 500);
    }
  }
}
