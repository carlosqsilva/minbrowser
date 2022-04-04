import os  from "os"

export function empty(node: HTMLElement) {
  var n
  while (n = node.firstElementChild) {
    node.removeChild(n)
  }
}

// export function once(fn) {
//   let value = null
//   return () => {
//     if (value) return value
//     return (value = fn())
//   }
// }

export const platformType = os.platform()