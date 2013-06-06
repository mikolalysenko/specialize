"use strict"

var doTest = require("./driver/driver.js")

require("tape")(function(t) {
  doTest(t, function(a, b) {
    return a(b)
  }, [
    function(x) { return x * 10 },
    undefined
  ],
  [[1],[2],[3],[1000]])
})