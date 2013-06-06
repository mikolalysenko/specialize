"use strict"

var doTest = require("./driver/driver.js")

require("tape")(function(t) {
  doTest(t, function(a, b, c) {
    return a + b + c
  }, [undefined, 1, 10],
  [[1],[2],[3],[4],[5]])
})