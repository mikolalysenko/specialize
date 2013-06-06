"use strict"

var doTest = require("./driver/driver.js")

require("tape")(function(t) {
  doTest(t, function(a, b, c, d) {
    return d + (c ? (10*a) + b : (2*a) + b)
  }, [
    1, "foo", false, undefined
  ],
  [[1],[2],[3],[1000]])
})