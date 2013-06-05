specialize
==========
An optimizing implementation of [partial function evaluation](http://en.wikipedia.org/wiki/Partial_evaluation) for JavaScript in JavaScript.  Speed ups for free!

**NOTE** This is still very early and is not well tested.  It probably has lots of bugs!

Example
=======

```javascript
var specialize = require("specialize")

//Create a test function
function testFunc(a, pred) {
  if(pred(a)) {
    return a + 10
  }
  return a - 10
}

//Specialize
var specialized = specialize(testFunc, undefined, function(x) { return x > 0 })

//Prints out 11
console.log(specialized(1))

//Prints out -11
console.log(specialized(-1))
```

`require("specialize")(func, arg1, arg2, ...)`
----------------------------------------------
Optimizes `func` by binding static values from arguments to the scope of function.

* `func` is the function to bind
* `arg1, arg2, ...` are the arguments for the function to specialize.  Pass in `undefined` to skip specialization.

**Returns** A specialized version of `func`

## Limitations

Because objects have properties that can change over time this code doesn't support inlining objects.  If you do pass an object it gets bound dynamically, just like calling bind() and so there isn't much benefit to this library.  It is also possible to inline functions which use variables from their outside scope.  An exception is made for variables in the global namespace even though this is not technically correct (since they could be rebound in a shadowing closure).  This is a conscientious choice, and if you want to overload globals then you should just use bind().

What it can do is inline constant values and *some* closures for well encapsulated functions, giving a substantial speed up with little loss of flexibility.

## Credits
(c) 2013 Mikola Lysenko. MIT License
