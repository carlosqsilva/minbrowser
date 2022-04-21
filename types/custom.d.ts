export {}

declare global {
  type LooseType<T extends string> = T | Omit<string, T> 
  
  var isDarkMode: boolean
  var URLToOpen: string | null
  var createdNewTaskOnStartup: boolean
}
