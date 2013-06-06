"use strict"

var test = require("tape")
var doTest = require("./driver/driver.js")

test(function(t) {
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

test(function(t) {
  doTest(t, function(a, b, c, d) {
    var r = 0
    for(var i=a(); b(i); i=c(i, d)) {
      r += i
    }
    return r
  }, [
    function() { return 10 },
    undefined,
    function(x,y) { return x + y },
    undefined
  ],
  [[function(x) { return x < 100 }, 1],[function(x) { return x < 100 }, 2],[function(x) { return x < 100 }, 3],[function(x) { return x < 100 }, 4]])
})

test(function(t) {
  doTest(t, function(a, b, c, d) {
    var r = 0
    for(var i=a(); b(i); i=c(i, d)) {
      r += i
    }
    return r
  }, [
    function() { return 10 },
    undefined,
    undefined,
    undefined
  ],
  [[function(x) { return x < 100 }, function(x,y) { return x + y }, 1],
   [function(x) { return x < 100 }, function(x,y) { return x + y }, 2],
   [function(x) { return x < 100 }, function(x,y) { return x + y }, 3],
   [function(x) { return x < 100 }, function(x,y) { return x + y }, 4]])
})