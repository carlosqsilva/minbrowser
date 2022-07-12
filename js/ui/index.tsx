import { render } from "solid-js/web";
import { Navbar } from "./navbar";
import { SearchBar } from "./searchbar";
import { Overlay } from "./overlay";
import { Webviews } from "./webviews";
import { DownloadBar } from "./downloadManager";
import { PageSearch } from "./pageSearch";
import { startNewSession } from "./session";
import { startSearchbarPlugins } from "./searchbarPlugins";

startSearchbarPlugins();

const App = () => {
  return (
    <>
      <Navbar />
      <SearchBar />
      <Overlay />
      <Webviews />
      <PageSearch />
      <DownloadBar />
    </>
  );
};

render(() => <App />, document.getElementById("root"));

startNewSession();

import "./keybindings";
import "./navbar/tabActivity";
import "./navbar/tabColor";

import "./webviewMenu";
import "./contextMenu";
import "./menuRenderer";
