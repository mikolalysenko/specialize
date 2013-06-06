"use strict"

var falafel = require("falafel")
var lift = require("./lift.js")
var uniq = require("uniq")
var tidy = require("./tidy.js")

function specializeFunction(root, name, func) {
  var prefix = "inline_" + name + "_"
  var block  = lift(func, prefix)
  var nvariables = [].concat(root.vars)
                     .concat(block.vars)
  
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
    var rewrite = block.body
    for(var i=0; i<args.length; ++i) {
      if(i < block.args.length) {
        if(args[i].needsExplode) {
          result.push(explodeExpression(args[i], block.args[i]))
          nvariables.push(block.args[i])
        } else {
          if(block.inline_args[i]) {
            rewrite = rewrite.replace(new RegExp(block.args[i], "g"), args[i].source())
          } else {
            result.push(block.args[i] + "=" + args[i].source())
            nvariables.push(block.args[i])
          }
        }
      } else if(args[i].needsExplode) {
        result.push(explodeExpression(args[i], scratch()))
      }
    }
    result.push(rewrite.replace(new RegExp(block.ret, "g"), out))
    return result.join("\n")
  }
  
  //Special case: for some nodes need to explode only if can't write
  function explodeLValue(node, out_str) {
    if(node.type === "Identifier") {
      return node.source()
    } else if(node.type === "MemberExpression") {
      if(node.object.needsExplode) {
        var obj = scratch()
        out_str.push(explodeExpression(node.object, obj))
        if(node.computed) {
          if(node.property.needsExplode) {
            var prop = scratch()
            out_str.push(explodeExpression(node.property, prop))
            return obj + "[" + prop + "]"
          } else {
            return obj + "[" + node.property.source().trim() + "]"
          }
        } else {
          return obj + "." + node.property.source().trim()
        }
      } else {
        var obj = node.object.source().trim()
        if(node.computed) {
          if(node.property.needsExplode) {
            var prop = scratch()
            out_str.push(explodeExpression(node.property, prop))
            return obj + "[" + prop + "]"
          } else {
            return obj + "[" + node.property.source().trim() + "]"
          }
        } else {
          return obj + "." + node.property.source().trim()
        }
      }
    } else {
      //Just explode expression
      var s = scratch()
      out_str.push(explodeExpression(node, s))
      return s
    }
  }
  
  //Convert expression to single static assignment form
  function explodeExpression(node, out) {
    if(!node.needsExplode) {
      return out + "=(" + node.source() + ")"
    }
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
          if(node.elements[i].needsExplode) {
            temporaries.push(scratch())
            result.push(explodeExpression(node.elements[i], temporaries[i]))
          } else {
            temporaries.push(node.elements[i].source())
          }
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
          if(node.properties[i].value.needsExplode) {
            var s = scratch()
            result.push(explodeExpr(node.properties[i].value, s))
            out_obj.push(node.properties[i].key.source() + ":" + s)
          } else {
            out_obj.push(node.properties[i].key.source() + ":" + node.properties[i].value.source())
          }
        }
        result.push(out+"={"+out_obj.join(",")+"}")
        return result.join("\n")
      break
      
      case "SequenceExpression":
        var result = [ explodeExpression(node.expressions[0], out) ]
        for(var i=1; i<node.expressions.length; ++i) {
          if(node.expressions[i].needsExplode) {
            result.push(explodeExpression(node.expressions[i], scratch()))
          } else {
            result.push(node.expressions[i].source())
          }
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
        if(node.left.needsExplode) {
          if(node.right.needsExplode) {
            var a = scratch()
            var b = scratch()
            return [
              explodeExpression(node.left, a),
              explodeExpression(node.right, b),
              out+"="+a+node.operator+b ].join("\n")
          } else {
            var a = scratch()
            return [
              explodeExpression(node.left, a),
              out+"="+a+node.operator+"("+node.right.source()+")" ].join("\n")
          }
        } else {
          var b = scratch()
          return [
            explodeExpression(node.right, b),
            out+"=("+node.left.source()+")"+node.operator+b ].join("\n")
        }
      break
      
      case "AssignmentExpression":
        var result = []
        var l_str = explodeLValue(node.left, result)
        if(node.operator === "=") {
          result.push(explodeExpression(node.right, out))
          result.push(l_str + "=" + out)
        } else {
          var s = scratch()
          result.push(explodeExpression(node.right, s))
          result.push(out + "=" + l_str + node.operator + s)
        }
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
        var prefix = node.operator === "||" ? "!" : ""
        if(node.left.needsExplode) {
          if(node.right.needsExplode) {
            return [
              explodeExpression(node.left, out),
              "if(" + prefix + out + "){",
                explodeExpression(node.right, out),
              "}"
            ].join("\n")
          } else {
            return [
              explodeExpression(node.left, out),
              "if(" + prefix + out + "){",
                out + "=" + node.right.source(),
              "}"
            ].join("\n")
          }
        } else {
          return [ "if(" + prefix + "(" + out + "=" + node.left.source() + ")) {",
            explodeExpression(node.right, out),
          "}"].join("\n")
        }
      break
      
      //Exploding ternary operator is similarly complicated, have 7 cases to consider.
      case "ConditionalExpression":
        if(node.test.needsExplode) {
          if(node.consequent.needsExplode) {
            if(node.alternate.needsExplode) {
              var s = scratch()
              return [
                explodeExpression(node.test, s),
                "if(" + s + "){",
                  explodeExpression(node.consequent, out),
                "} else {",
                  explodeExpression(node.alternate, out),
                "}"
              ].join("\n")
            } else {
              var s = scratch()
              return [
                explodeExpression(node.test, s),
                "if(" + s + "){",
                  explodeExpression(node.consequent, out),
                "} else {",
                  out + "=" + node.alternate.source(),
                "}"
              ].join("\n")
            }
          } else {
            if(node.alternate.needsExplode) {
              var s = scratch()
              return [
                explodeExpression(node.test, s),
                "if(" + s + "){",
                  out+"="+node.consequent.source(),
                "} else {",
                  explodeExpression(node.alternate, out),
                "}"
              ].join("\n")
            } else {
              var s = scratch()
              return [
                explodeExpression(node.test, s),
                out + "=" + s + "?" + node.consequent.source() + ":" + node.alternate.source()
              ].join("\n")
            }
          }
        } else {
          if(node.consequent.needsExplode) {
            if(node.alternate.needsExplode) {
              return [
                "if(" + node.test.source() + "){",
                  explodeExpression(node.consequent, out),
                "} else {",
                  explodeExpression(node.alternate, out),
                "}"
              ].join("\n")
            } else {
              return [
                "if(" + node.test.source() + "){",
                  explodeExpression(node.consequent, out),
                "} else {",
                  out + "=" + node.alternate.source(),
                "}"
              ].join("\n")
            }
          } else {
            return [
              "if(" + node.test.source() + "){",
                out + "=" + node.consequent.source(),
              "} else {",
                explodeExpression(node.alternate, out),
              "}"
            ].join("\n")
          }
        }
      break
      
      case "NewExpression":
        var result = []
        var callee
        if(node.callee.needsExplode) {
          callee = scratch()
          result.push(explodeExpression(node.callee, callee))
        } else {
          callee = node.callee.source()
        }
        var new_args = []
        if(node.arguments) {
          for(var i=0; i<node.arguments.length; ++i) {
            if(node.arguments[i].needsExplode) {
              new_args.push(scratch())
              result.push( explodeExpression(node.arguments[i], new_args[i]) )
            } else {
              new_args.push(node.arguments[i].source())
            }
          }
        }
        result.push(out + "=new " + callee + "(" + new_args.join(",") + ")")
        return result.join("\n")
      break
      
      case "MemberExpression":
        var objs
        var result = []
        if(node.object.needsExplode) {
          objs = scratch()
          result.push(explodeExpression(node.object, objs))
        } else {
          objs = node.object.source()
        }
        if(node.computed) {
          var prop
          if(node.property.needsExplode) {
            prop = scratch()
            result.push(explodeExpression(node.property, prop) )
          } else {
            prop = node.property.source()
          }
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
          if(node.arguments[i].needsExplode) {
            arg_names.push(scratch())
            result.push(explodeExpression(node.arguments[i], arg_names[i]))
          } else {
            arg_names.push(node.arguments[i].source())
          }
        }
        var callee
        if(node.callee.needsExplode) {
          callee = scratch()
          result.push(explodeExpression(node.callee, callee))
        } else {
          callee = node.callee.source()
        }
        result.push(out + "=" + callee + "(" + arg_names.join(",") + ")")
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
      
        //Special case: for single assignments just flatten expression
        if(node.expression.type === "AssignmentExpression") {
          node.update([
            "{",
              explodeExpression(node.expression.right, node.expression.left.source()),
            "}\n"
          ].join("\n"))
        } else {
          node.update("{" + explodeExpression(node.expression, scratch()) + "}")
        }
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
            "}\n"
          ].join("\n"))
        } else {
          node.update([
            "{",
              explodeExpression(node.test, s0),
              "if(" + s0 + ") {",
                node.consequent.source(),
              "}",
            "}\n"
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
          "}\n"
        ].join("\n"))
      break
      
      case "ReturnStatement":
        var s0 = scratch()
        node.update([
          "{",
            explodeExpression(node.argument, s0),
            "return " + s0,
          "}\n"
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
            "if(!" + s0 + ") { break }",
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
          "} while(" + s0 + ");\n"
        ].join("\n"))
      break
      
      //7 special cases
      case "ForStatement":
        if(node.init && node.init.needsExplode) {
          if(node.test.needsExplode) {
            if(node._update.needsExplode) {
              //Explode init/test/update
              var s0 = scratch()
              node.update([
                "do{",
                  explodeExpression(node.init, scratch()),
                  "while(1) {",
                    explodeExpression(node.test, s0),
                    "if(!" + s0 + ") { break; }",
                    node.body.source(),
                    explodeExpression(node._update, scratch()),
                  "}",
                "} while(0);\n"
              ].join("\n"))
            } else {
              //Explode init/test
              var s0 = scratch()
              node.update([
                "do{",
                  node.init ? explodeExpression(node.init, scratch()) : "",
                  "while(1) {",
                    explodeExpression(node.test, s0),
                    "if(!" + s0 + ") { break; }",
                    node.body.source(),
                    node._update.source(),
                  "}",
                "} while(0);\n"
              ].join("\n"))
            }
          } else {
            if(node._update.needsExplode) {
              //Explode init/update
              node.update([
                "do{",
                  explodeExpression(node.init, scratch()),
                  "while("+node.test.source() + ") {",
                    node.body.source(),
                    explodeExpression(node._update, scratch()),
                  "}",
                "} while(0);\n"
              ].join("\n"))
            } else {
              //Explode init
              node.update([
                "do{",
                  explodeExpression(node.init, scratch()),
                  "for(;"+node.test.source()+";"+node._update.source()+"){",
                    node.body.source(),
                  "}",
                "} while(0);\n"
              ].join("\n"))
            }
          }
        } else {
          if(node.test.needsExplode) {
            if(node._update.needsExplode) {
              //Explode test/update
              var s0 = scratch()
              node.update([
                "for(" + (node.init ? "" : node.init.source()) + ";;){",
                  explodeExpression(node.test, s0),
                  "if(!"+s0+"){break;}",
                  node.body.source(),
                  explodeExpression(node._update, scratch()),
                "}\n"
              ].join("\n"))
            } else {
              //Explode test
              var s0 = scratch()
              node.update([
                "for(" + (node.init ? "" : node.init.source()) + ";;"+node._update.source()+"){",
                  explodeExpression(node.test, s0),
                  "if(!"+s0+"){break;}",
                  node.body.source(),
                "}\n"
              ].join("\n"))
            }
          } else {
            //Explode update
            node.update([
              "for(" + (node.init ? "" : node.init.source()) + ";" + node.test.source() + ";){",
                node.body.source(),
                explodeExpression(node._update, scratch()),
              "}\n"
            ].join("\n"))
          }
        }
      break
      
      case "ForInStatement":
        if(node.left.needsExplode) {
          if(node.right.needsExplode) {
            var s0 = scratch()
            var pre = [explodeExpression(node.right, s0)]
            var lv = explodeLValue(node.left, pre)
            node.update([
              "do{",
                pre.join("\n"),
                "for(" + node.left.source() + " in " + s0 + ") {",
                  node.body.source(),
                "}",
              "} while(0);\n"
            ].join("\n"))
          } else {
            var pre = []
            var lv = explodeLValue(node.left, pre)
            node.update([
              "do{",
                pre.join("\n"),
                "for(" + lv + " in " + node.right.source() + ") {",
                  node.body.source(),
                "}",
              "} while(0);\n"
            ].join("\n"))
          }
        } else {
          var s0 = scratch()
          var pre = [explodeExpression(node.right, s0)]
          node.update([
            "do{",
              pre.join("\n"),
              "for(" + node.left.source() + " in " + s0 + ") {",
                node.body.source(),
              "}",
            "} while(0);\n"
          ].join("\n"))
        }
      break
      
      default:
        throw new Error("Unsupported statement type: " + node.type)
    }
  }
  
  //Convert any statements containing func to single static assignment and inline it.
  var result = ""
  var src = "(function() {" + root.body + "})()"
  falafel(src, function(node) {
    //monkey-patch the monkey-patching to work around update name conflict
    if(node.parent && node.parent.type === "ForStatement") {
      if(!(node.parent.init === node ||
           node.parent.body === node ||
           node.parent.test === node)) {
        node.parent._update = node
      }
    }
    if(node.type === "Identifier") {
      if(node.name === name) {
        if(node.parent.type === "CallExpression" && node.parent.callee === node) {
          node.needsExplode = true
          var x = node.parent
          while(x.type.indexOf("Statement") < 0) {
            x.needsExplode = true
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
  root.body = tidy(result)
}
module.exports = specializeFunction
