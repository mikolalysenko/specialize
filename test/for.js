"use strict"

var doTest = require("./driver/driver.js")

require("tape")(function(t) {
  doTest(t, function(a, b, c, d) {
    var r = 0
    for(var i=a(); b(i); i=c(i, d)) {
      r += i
    }
    return r
  }, [
    function() { return 10 },
    function(x) { return x < 100 },
    function(x,y) { return x + y },
    undefined
  ],
  [[1],[2],[3],[4]])
})