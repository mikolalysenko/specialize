"use strict"

var doTest = require("./driver/driver.js")

require("tape")(function(t) {
  doTest(t, function(a, b, c, d, e) {
    var y = 0
    for(var i=a(e); b(i); i = c(i)) {
      y = d(i, y)
    }
    return y  + e
  }, [
    function(x) { return x + 1 },
    function(x) { return x < 100 },
    function(x) { return x + 5 },
    function(x,y) { return x * y + 1 },
    undefined
  ],
  [[0],[1],[2],[3],[4],[-1],[1000.1]])
})