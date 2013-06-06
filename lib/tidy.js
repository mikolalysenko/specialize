"use strict"

var falafel = require("falafel")

function tidy(src) {
  var result = falafel(src, function(node) {
    if(node.type === "BlockStatement") {
      if(node.body.length === 1) {
        node.update(node.body[0].source())
      }
    }
  })
  return result + ""
}

module.exports = tidy