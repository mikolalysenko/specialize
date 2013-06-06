"use strict"

var genericSlice = require("generic-slice")
var specialize = require("../../specialize.js")

function testSpecializer(t, func, args, inputs) {
  //First generate bound function
  function boundFunc() {
    var local_args = genericSlice(arguments, 0)
    for(var i=0; i<args.length; ++i) {
      if(args[i] !== undefined) {
        local_args[i] = args[i]
      }
    }
    return func.apply(this, local_args)
  }
  
  //Next generate specialized function
  var binding_args = args.slice(0)
  binding_args.unshift(func)
  var specializedFunc = specialize.apply(undefined, binding_args)

  //Test functions out
  t.plan(inputs.length)
  for(var i=0; i<inputs.length; ++i) {
    t.same(specializedFunc.apply(undefined, inputs[i]), boundFunc.apply(undefined, inputs[i]))
  }
}

module.exports = testSpecializer