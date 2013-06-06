"use strict"

var falafel = require("falafel")

function tidy(src) {
  var result = ""
  falafel("(function(){"+src+"})()", function(node) {
    if(node.type === "BlockStatement") {
      if(node.body.length === 1) {
        node.update(node.body[0].source())
      }
    }
    if(node.type === "FunctionExpression" &&
       node.parent.parent.parent.type === "Program") {
        result = node.body.source()
    }
  })
  return result
}

module.exports = tidy