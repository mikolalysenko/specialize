"use strict"

var doTest = require("./driver/driver.js")

require("tape")(function(t) {
  doTest(t, function(a, b, c) {
    if(a(c)) {
      return "a"
    } else if(b(c)) {
      return "b"
    } else {
      return "?"
    }
  }, [
    function(x) { return x < 0 },
    function(x) { return x < 10},
    undefined
  ],
  [[-10], [1], [10]])
})