"use strict"

var doTest = require("./driver/driver.js")

require("tape")(function(t) {
  doTest(t, function(a, b, c) {
    switch(a(b)) {
      case 0:
        return "0!"
      case 1:
        return "1!"
      case 2:
        return "2!"
      default:
        return "?"
    }
  }, [
    function(x) { return x+1 },
    undefined
  ],
  [[-1], [1], [2], [3], [4]])
})