let hex = require('/Users/seankinahan/hex/bindings/hex.js')

console.log("All Exported Data: ")
console.log(hex)

let myObject = {}
myObject.key = "k"
myObject.value = "v"

console.log(hex.set(myObject))

console.log(hex.get(myObject.key))


