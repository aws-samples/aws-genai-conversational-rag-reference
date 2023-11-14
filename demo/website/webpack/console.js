import console from 'console-browserify'

// shim for Node require("node:console").Console constructor
export function Console () {
  return console
}
