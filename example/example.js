var specialize = require("../specialize.js")

//Create a test function
function testFunc(a, pred) {
  if(pred(a)) {
    console.log("predicate was true")
    return a + 10
  }
  console.log("predicate was false")
  return a - 10
}

//Specialize
var specialized = specialize(testFunc, undefined, function(x) { return x > 0 })

//Prints out 11
console.log(specialized(1))

//Prints out -11
console.log(specialized(-1))
