import { Tab } from "./tabState/tab";

export class TabStack {
  public depth: number = 10;
  public stack: Partial<Tab>[] = []

  constructor(tabStack?: TabStack) {
    this.stack = tabStack?.stack || []
  }
  
  public pop = () => {
    return this.stack.pop()
  }
  
  public push(closedTab: Partial<Tab>) {
    // Do not store private tabs or blank tabs
    if (closedTab.private || closedTab.url === "") {
      return;
    }

    if (this.stack.length >= this.depth) {
      this.stack.shift();
    }

    console.log()

    this.stack.push(closedTab);
  }
}
