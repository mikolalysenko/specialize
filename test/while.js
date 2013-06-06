"use strict"

var doTest = require("./driver/driver.js")

require("tape")(function(t) {
  doTest(t, function(a, b) {
    var r = 0
    while(a(r)) {
      r += b
    }
    return r
  }, [
    function(x) { return x < 100 },
    undefined
  ],
  [[1],[2.4],[3.2],[4],[1000.1]])
})