import { render } from "solid-js/web";
import { Navbar } from "./navbar";
import { Tabs } from "./tabs";
import { TabEditor } from "./tabEditor";

const App = () => {
  return (
    <>
      <Navbar>
        <TabEditor />
        <Tabs />
      </Navbar>
    </>
  );
};

render(() => <App />, document.getElementById("root"));
