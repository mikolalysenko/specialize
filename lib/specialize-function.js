"use strict"

var falafel = require("falafel")
var lift = require("./lift.js")
var uniq = require("uniq")

function specializeFunction(root, name, func) {
  var prefix = "inline_" + name + "_"
  var block  = lift(func, prefix)
  var nvariables = [].concat(root.vars)
                     .concat(block.vars)
                     .concat(block.args)
  
  //Create a temporary variable
  var count = 0
  function scratch() {
    var v = "scratch_" + prefix + (count++)
    nvariables.push(v)
    return v
  }

  //Do the actual inlining
  function inlineClosure(args, out) {
    var result = []
    for(var i=0; i<args.length; ++i) {
      if(i < block.args.length) {
        result.push(explodeExpression(args[i], block.args[i]))
      } else {
        result.push(explodeExpression(args[i], scratch()))
      }
    }
    result.push(block.body)
    result.push(out+"="+block.ret)
    return result.join("\n")
  }
  
  //Special case: for some nodes need to explode only if can't write
  function explodeLValue(node, out_str) {
    if(node.type === "Identifier") {
      return node.source()
    } else if(node.type === "MemberExpression") {
      var obj = scratch()
      out_str.push(explodeExpression(node.object, obj))
      if(node.computed) {
        var prop = scratch()
        out_str.push(explodeExpression(node.property, prop))
        return obj + "[" + prop + "]"
      } else {
        return obj + "." + node.property.source().trim()
      }
    } else {
      throw new Error("Invalid LValue")
    }
  }
  
  //Convert expression to single static assignment form
  function explodeExpression(node, out) {
    switch(node.type) {
      case "Identifier":
        return out + "=" + node.source()
      break
    
      case "Literal":
        return out + "=" + node.source()
      break
    
      case "ThisExpression":
        return out + "=this"
      break
      
      case "ArrayExpression":
        var result = []
          , temporaries = []
        for(var i=0; i<node.elements.length; ++i) {
          temporaries.push(scratch())
          result.push(explodeExpression(node.elements[i], temporaries[i]))
        }
        result.push(out + "=[" + temporaries.join(",") + "]")
        return result.join("\n")
      break
      
      case "ObjectExpression":
        if(node.kind !== "init") {
          throw new Error("get and set not supported for object expressions")
        }
        var result = []
          , out_obj = []
        for(var i=0; i<node.properties.length; ++i) {
          var s = scratch()
          result.push(explodeExpr(node.properties[i].value, s))
          out_obj.push(node.key.source() + ":" + s)
        }
        result.push(out+"={"+out_obj.join(",")+"}")
        return result.join("\n")
      break
      
      case "SequenceExpression":
        var result = [ explodeExpression(node.expressions[0], out) ]
        for(var i=1; i<node.expressions.length; ++i) {
          result.push(explodeExpression(node.expressions[i], scratch()))
        }
        return result.join("\n")
      break
      
      case "UnaryExpression":
        if(node.operator === "delete") {
          var result = []
          var l_str = explodeLValue(node.argument, result)
          result.push(out+"= delete "+l_str)
          return result.join("\n")
        } else {
          var s = scratch()
          return [
            explodeExpression(node.argument, s),
            out+"="+node.operator+s ].join("\n")
        }
      break
      
      case "BinaryExpression":
        var a = scratch()
        var b = scratch()
        return [
          explodeExpression(node.left, a),
          explodeExpression(node.right, b),
          out+"="+a+node.operator+b ].join("\n")
      break
      
      case "AssignmentExpression":
        var result = []
        var l_str = explodeLValue(node.left, result)
        result.push(explodeExpression(node.right, l_str))
        result.push(out + node.operator + l_str)
        return result.join("\n")
      break
      
      case "UpdateExpression":
        var result = []
        var l_str = explodeLValue(node.argument, result)
        if(node.prefix) {
          result.push(out+"="+node.operator+l_str)
        } else {
          result.push(out+"="+l_str+node.operator)
        }
        return result.join("\n")
      break
      
      case "LogicalExpression":
        if(node.operator === "||") {
          return [
            explodeExpression(node.left, out),
            "if(!" + out + "){",
              explodeExpression(node.right, out),
            "}"
          ].join("\n")
        } else if(node.operator === "&&") {
          return [
            explodeExpression(node.left, out),
            "if(" + out + "){",
              explodeExpression(node.right, out),
            "}"
          ].join("\n")
        } else {
          throw new Error("Unrecognized logical operator")
        }
      break
      
      case "ConditionalExpression":
        var s = scratch()
        return [
          explodeExpression(node.test, s),
          "if(" + s + "){",
            explodeExpression(node.consequent, out),
          "} else {",
            explodeExpression(node.alternate, out),
          "}"
        ].join("\n")
      break
      
      case "NewExpression":
        var callee = scratch()
        var result = [ explodeExpression(node.callee, callee) ]
        var new_args = []
        if(node.arguments) {
          for(var i=0; i<node.arguments.length; ++i) {
            new_args.push(scratch())
            result.push( explodeExpression(node.arguments[i], new_args[i]) )
          }
        }
        result.push(out + "=new " + callee + "(" + new_args.join(",") + ")")
        return result.join("\n")
      break
      
      case "MemberExpression":
        var objs = scratch()
        var result = [ explodeExpression(node.object, objs) ]
        if(node.computed) {
          var prop = scratch()
          result.push(explodeExpression(node.property, prop) )
          result.push(out+"="+objs+"["+prop+"]")
        } else {
          result.push(out+"="+objs+"."+node.property.source())
        }
        return result.join("\n")
      break
      
      case "CallExpression":  //Finally!  The one case we care about
        if(node.callee.type === "Identifier" && node.callee.name === name) {
          return inlineClosure(node.arguments, out)
        }
        var result = []
        var arg_names = []
        for(var i=0; i<node.arguments.length; ++i) {
          arg_names.push(scratch())
          result.push(explodeExpression(node.arguments[i], arg_names))
        }
        if(node.callee.type === "Identifier") {
          result.push(out + "=" + node.callee.name.source().trim() + "(" + arg_names.join(",") + ")")
        } else {
          var callee = scratch()
          result.push(explodeExpression(node.callee, callee))
          result.push(out + "=" + callee + "(" + arg_names.join(",") + ")")
        }
        return result.join("\n")
      break
      
      default:
        throw new Error("Unsupported expression type: " + node.type)
    }
  }
  
  //Convert a statement partially to single static assignment form
  function explodeStatement(node) {
    switch(node.type) {
      case "ExpressionStatement":
        node.update(explodeExpression(node.expression, scratch()))
      break
      
      case "IfStatement":
        var s0 = scratch()
        if(node.alternate) {
          node.update([
            "{",
              explodeExpression(node.test, s0),
              "if(" + s0 + ") {",
                node.consequent.source(),
              "} else {",
                node.alternate.source(),
              "}",
            "}"
          ].join("\n"))        
        } else {
          node.update([
            "{",
              explodeExpression(node.test, s0),
              "if(" + s0 + ") {",
                node.consequent.source(),
              "}",
            "}"
          ].join("\n"))
        }
      break
      
      case "SwitchStatement":
        var s0 = scratch()
        var expr = explodeExpression(node.discriminant, s0)
        node.discriminant.update(s0)
        node.update([
          "{",
            expr,
            node.source(),
          "}"
        ].join("\n"))
      break
      
      case "ReturnStatement":
        var s0 = scratch()
        node.update([
          "{",
            explodeExpression(node.argument, s0),
            "return " + s0,
          "}"
        ].join("\n"))
      break
      
      case "ThrowStatement":
        var s0 = scratch()
        node.update([
          "{",
            explodeExpression(node.argument, s0),
            "throw " + s0,
          "}"
        ].join("\n"))
      break
      
      case "WhileStatement":
        var s0 = scratch()
        node.update([
          "while(1) {",
            explodeExpression(node.test, s0),
            "if(" + s0 + ") { break }",
            node.body.source(),
          "}"
        ].join("\n"))
      break
      
      case "DoWhileStatement":
        var s0 = scratch()
        node.update([
          "do {",
            node.body.source(),
            explodeExpression(node.test, s0),
          "} while(" + s0 + ");"
        ].join("\n"))
      break
      
      case "ForStatement":
        var s0 = scratch()
        node.update([
          "do{",      //Need a loop here, not a block statement so that labels work
            node.init ? explodeExpression(node.init, scratch()) : "",
            "while(1) {",
              explodeExpression(node.test, s0),
              "if(" + s0 + ") { break; }",
              node.body.source(),
              explodeExpression(node.update, scratch()),
            "}",
          "} while(0);"
        ].join("\n"))
      break
      
      case "ForInStatement":
        if(node.each) {
          throw new Error("For each unsupported")
        }
        var s0 = scratch()
        node.update([
          "do{",
            explodeExpression(node.right, s0),
            "for(" + node.left.source() + " in " + s0 + ") {",
              node.body.source(),
            "}",
          "} while(0);"
        ].join("\n"))
      break
      
      default:
        throw new Error("Unsupported statement type: " + node.type)
    }
  }
  
  //Convert any statements containing func to single static assignment and inline it.
  var result = ""
  falafel("(function() {" + root.body + "})()", function(node) {
    if(node.type === "Identifier") {
      if(node.name === name) {
        if(node.parent.type === "CallExpression" && node.parent.callee === node) {
          var x = node.parent.parent
          while(x.type.indexOf("Statement") < 0) {
            x = x.parent
          }
          x.needsRewrite = true
        } else {
          throw new Error("Can't inline function when used outside of call")
        }
      }
    } else if(node.needsRewrite) {
      explodeStatement(node)
    } else if(node.type === "FunctionExpression") {
      result = node.body.source()
    }
  })
  
  //Remove duplicate variables
  nvariables.sort()
  uniq(nvariables)
  
  //Update root
  root.vars = nvariables
  root.body = result
}
module.exports = specializeFunction
