"use strict"

var falafel = require("falafel")
var lexicalScope = require("lexical-scope")
var uniq = require("uniq")

function inGlobalScope(identifier) {
  if(typeof(window) !== "undefined") {
    return identifier in window
  } else if(typeof(self) !== "undefined") {
    return identifier in self
  } else if(typeof(GLOBAL) !== "undefined") {
    return identifier in GLOBAL
  } else {
    return false
  }
}

function getArgs(src) {
  var args = []
  falafel(src, function(node) {
    var i
    if(node.type === "FunctionExpression" &&
       node.parent.parent.parent.type === "Program") {
      args = new Array(node.params.length)
      for(i=0; i<node.params.length; ++i) {
        args[i] = node.params[i].name
      }
    }
  })
  return args
}

function lift(func, prefix, skip_return) {
  var src       = "(" + func + ")()"
  var scope     = lexicalScope(src)
  
  //Check globals, but make exception for stuff that is already in scope
  for(var i=0; i<scope.globals.implicit; ++i) {
    if(!inGlobalScope(scope.globals.implicit[i])) {
      throw new Error("Can't inline free variables")
    }
  }
  if(scope.globals.exported.length > 0) {
    throw new Error("Can't inline exported variables")
  }
  if(scope.globals.implicit.indexOf("eval") > 0) {
    throw new Error("Can't inline eval()")
  }

  var result    = ""
  var ret_label = "label_" + prefix + "body"
  var ret_val   = "return_" + prefix + "val"
  var variables = skip_return ? [] : [ret_val]
  var orig_arg_names = getArgs(src)
  var next_arg_names = new Array(orig_arg_names.length)
  for(var i=0; i<orig_arg_names.length; ++i) {
    next_arg_names[i] = ["arg_", prefix, i].join("")
  }
  
  falafel(src, function(node) {
    if(node.type === "Identifier") {
      if(node.parent.type === "MemberExpression") {
        if((node.parent.property === node && !node.parent.computed)) {
          return
        }
      }
      var n = node.name
      var i = orig_arg_names.indexOf(n)
      if(i >= 0) {
        node.update(next_arg_names[i])
      } else if(n === "arguments") {
        throw new Error("variadic arguments unsupported")
      } else if(inGlobalScope(n)) {
        return
      } else {
        node.update(prefix + node.source().trim())
      }
    } else if(node.type === "VariableDeclarator") {
      variables.push(node.id.source())
    } else if(node.type === "FunctionExpression") {
      if(node.parent.parent.parent.type === "Program") {
        result = node.body.source()
      } else {
        throw new Error("Local closures not supported yet")
      }
    } else if(node.type === "ReturnStatement") {
      if(!skip_return) {
        node.update(["{", ret_val, "=(", node.argument.source().trim(), "); break ", ret_label, ";}\n" ].join(""))
      }
    } else if(node.type === "VariableDeclaration") {
      if(node.kind !== "var") {
        throw new Error(node.kind + " statement not supported")
      }
      var n_source = []
      for(var i=0; i<node.declarations.length; ++i) {
        var decl = node.declarations[i]
        if(decl.init) {
          n_source.push([ decl.id.source().trim(), "=(", decl.init.source().trim(), ")\n"].join(""))
        }
      }
      node.update(n_source.join(","))
    } else if(node.type === "WithStatement") {
      throw new Error("with statement not supported")
    } else if(node.type === "TryStatement") {
      throw new Error("try statement not supported")
    }
  })

  //Compress variables
  variables.sort()
  uniq(variables)

  //Throw out the rest of the stuff
  return {
    args:   next_arg_names,
    vars:   variables,
    ret:    ret_val,
    body:   skip_return ? result : [ret_label, ": do ", result, " while(0)" ].join("")
  }
}

module.exports = lift

