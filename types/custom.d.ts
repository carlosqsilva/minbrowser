export {}

declare global {
  type LooseType<t extends string> = T | Omit<string, T> 
  
  type argkeys = LooseType<"lang", "type", "app-name", "app-path", "app-version", "use-data-path"> 
  
  interface Window {
    globalArgs: {
      [K in argkeys]: string
    }
  }

  var URLToOpen: string | null
}
