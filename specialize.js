"use strict"

var genericSlice = require("generic-slice")
var lift = require("./lib/lift.js")
var specializeFunction = require("./lib/specialize-function.js")

var ROOT_PREFIX = "root_"

//Process the arguments for the function.  Group them according to whether they are static or dynamic variables.
function processArguments(args, count) {
  var arg_names     = new Array(count)
  var static_args   = []
  var static_vals   = []
  var dynamic_args  = []
  var i
  for(i=0; i<count; ++i) {
    arg_names[i] = "arg_" + ROOT_PREFIX + i
  }
  for(i=0; i<args.length; ++i) {
    if(args[i] === undefined) {
      dynamic_args.push(arg_names[i])
    } else {
      static_args.push(arg_names[i])
      static_vals.push(args[i])
    }
  }
  for(; i<count; ++i) {
    dynamic_args.push(arg_names[i])
  }
  return {
    arg_names:    arg_names,
    static_args:  static_args,
    static_vals:  static_vals,
    dynamic_args: dynamic_args
  };
}

//Bail out:  If we can't inline stuff in func due to lexical scope or some other reason, just bind dynamically
function dynamicBind(func, args) {
  var body = [
    "return function(", args.dynamic_args.join(","), ") {",
      "return f.call(", ["this"].concat(args.arg_names).join(","), ")",
     "}"].join("")
  var proc = Function.apply(undefined, ["f"].concat(args.static_args).concat([body]))
  return proc.apply(undefined, [func].concat(args.static_vals))
}

//Stupid hack:  To specialize a constant we can just assign to it directly and let the vm takes care of the rest
function specializeConstant(block, name, value) {
  if(typeof value === "string") {
    block.body = [name, "='", value.replace(/'/g, "''"), "'\n", block.body ].join("")
  } else {
    block.body = [name, "=", value, "\n", block.body].join("")
  }
  block.vars.push(name)
}

//Specializes func
function specialize(func) {
  var args = processArguments(genericSlice(arguments, 1), func.length)
  var root
  if(args.static_args.length === 0) {
    return func
  }
  try {
    root = lift(func, ROOT_PREFIX, true)
  } catch(e) {
    console.warn("Bailing out: Could not specialize " + func.name + " - " + e.toString())
    return dynamicBind(func, args)
  }
  
  //Try specializing each of the inputs sequentially
  var bailout_args = []
  var bailout_vals = []
  for(var i=0; i<args.static_args.length; ++i) {
    try {
      switch(typeof args.static_vals[i]) {
        case "number":
        case "boolean":
        case "string":
          specializeConstant(root, args.static_args[i], args.static_vals[i])
        break
        
        case "function":
          specializeFunction(root, args.static_args[i], args.static_vals[i])
        break
        
        default:
          throw new Error("Object inlining not supported")
      }
    } catch(e) {
      console.warn("Bail out when specializing argument " + i + " - " + e)
      bailout_args.push(args.static_args[i])
      bailout_vals.push(args.static_vals[i])
    }
  }
  
  //Assemble result
  var body = [
    "var " + root.vars.join(","),
    root.body,
  ].join("\n")
  
  console.log(body)
  
  if(bailout_args.length === 0) {
    return Function.apply(undefined, [].concat(args.dynamic_args).concat([body]))
  } else {
    body = [ "return function ", func.name, "(", args.dynamic_args.join(","), "){ ", body, "}"].join("")
    bailout_args.push(body)
    var proc = Function.apply(undefined, bailout_args)
    var res = proc.apply(undefined, bailout_vals)
    return res
  }
}
module.exports = specialize
