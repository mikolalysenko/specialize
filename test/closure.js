"use strict"

var doTest = require("./driver/driver.js")

require("tape")(function(t) {
  doTest(t, function(a, b, c) {
    return c(a,b)
  }, [undefined, undefined, function(x,y) { return x+y }],
  [[1,2],[2,-1],[3,10],[4,6501],[5,-10101]])
})