"use strict"

var GRID_SIZE = 64 * 1024
var ITERS     = 10000

//A generic 1D cellular automata implementation
function updateCA(rule, state, next_state) {
  var n = state.length, i
  next_state[0] = rule(state[n-1], state[0], state[1])
  for(i=1; i<n-1; ++i) {
    next_state[i] = rule(state[i-1], state[i], state[i+1])
  }
  next_state[n-1] = rule(state[n-2], state[n-1], state[0])
}

//Update rule for Wolfram 30 type CA:  http://mathworld.wolfram.com/Rule30.html
function wolfram30(a, b, c) {
  return (30 & (1<<(4*a + 2 * b + c))) ? 1 : 0
}

//Create bound and specialized version
var boundUpdate = updateCA.bind(undefined, wolfram30)
var specializedUpdate = require("../specialize")(updateCA, wolfram30)

//Initialize state
var state0 = new Uint8Array(GRID_SIZE)
var state1 = new Uint8Array(GRID_SIZE)
state0[0] = 1

//Measure time for bound method
var start = Date.now()
for(var i=0; i<ITERS; i+=2) {
  boundUpdate(state0, state1)
  boundUpdate(state1, state0)
}
var elapsed = Date.now() - start
console.log("Time for bind: ", elapsed)

//Reset state
for(var i=0; i<state0.length; ++i) {
  state0[i] = 0
}
state0[0] = 1

//Measure time for specialized
var start = Date.now()
for(var i=0; i<ITERS; i+=2) {
  specializedUpdate(state0, state1)
  specializedUpdate(state1, state0)
}
var elapsed = Date.now() - start
console.log("Time for specialized: ", elapsed)

