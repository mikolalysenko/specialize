"use strict"

var GRID_SIZE = 64 * 1024
var ITERS     = 45000

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
  return (30 & (1<<(4*a + 2*b + c))) ? 1 : 0
}

//Initialize state
var state0 = new Uint8Array(GRID_SIZE)
var state1 = new Uint8Array(GRID_SIZE)

//Test driver
function runBenchmark(name, func) {
  var i
  for(i=0; i<state0.length; ++i) {
    state0[i] = 0
  }
  state0[0] = 1

  //Warm up
  for(var i=0; i<100; ++i) {
    func(state0, state1)
    func(state1, state0)
  }

  var start = Date.now()
  for(var i=0; i<ITERS; i+=2) {
    func(state0, state1)
    func(state1, state0)
  }
  var elapsed = Date.now() - start
  console.log("Time for", name, "---", elapsed, "ms")
}

//Run the different cases
function manualInline(cur_state, next_state) {
  var n = cur_state.length, i
  next_state[0] = (30 & (1<<(4*cur_state[n-1] + 2 * cur_state[0] + cur_state[1]))) ? 1 : 0
  for(i=1; i<n-1; ++i) {
    next_state[i] = (30 & (1<<(4*cur_state[i-1] + 2 * cur_state[i] + cur_state[i+1]))) ? 1 : 0
  }
  next_state[n-1] = (30 & (1<<(4*cur_state[n-2] + 2 * cur_state[n-1] + cur_state[0]))) ? 1 : 0
}
runBenchmark("manual inline", manualInline)

var boundUpdate = updateCA.bind(undefined, wolfram30)
runBenchmark("bind()", boundUpdate)

var closureUpdate = function(s0, s1) {
  updateCA(wolfram30, s0, s1)
}
runBenchmark("closure", closureUpdate)

var specializedUpdate = require("../specialize")(updateCA, wolfram30)
runBenchmark("specialize()", specializedUpdate)
