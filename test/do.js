"use strict"

var doTest = require("./driver/driver.js")

require("tape")(function(t) {
  doTest(t, function(a, b) {
    var r = 0
    do {
      r += b
    } while(a(r))
    return r
  }, [
    function(x) { return x < 100 },
    undefined
  ],
  [[1],[2.4],[3.2],[4],[1000.1]])
})