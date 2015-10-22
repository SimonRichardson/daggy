var λ = require('fantasy-helpers');

/**
  ## `daggy.tagged(arguments)`

  Creates a new constructor with the given field names as
  arguments and properties. Allows `instanceof` checks with
  returned constructor.

  ```javascript
  var Tuple3 = daggy.tagged('x', 'y', 'z');

  var _123 = Tuple3(1, 2, 3); // optional new keyword
  _123.x == 1 && _123.y == 2 && _123.z == 3; // true
  _123 instanceof Tuple3; // true
  ```
**/
function tagged() {
    var fields = [].slice.apply(arguments);

    function toString(args) {
      var x = [].slice.apply(args);
      return function() {
        var values = x.map(function(y) { return y.toString(); });
        return '(' + values.join(', ') + ')';
      };
    }
    
    function wrapped() {
        var self = λ.getInstance(this, wrapped),
            i;

        if(arguments.length != fields.length)
            throw new TypeError('Expected ' + fields.length + ' arguments, got ' + arguments.length);

        for(i = 0; i < fields.length; i++)
            self[fields[i]] = arguments[i];

        self.toString = toString(arguments);

        return self;
    }
    wrapped._length = fields.length;
    return wrapped;
}

/**
  ## `daggy.taggedSum(constructors)`

  Creates a constructor for each key in `constructors`. Returns a
  function with each constructor as a property. Allows
  `instanceof` checks for each constructor and the returned
  function.

  ```javascript
  var Option = daggy.taggedSum({
      Some: ['x'],
      None: []
  });

  Option.Some(1) instanceof Option.Some; // true
  Option.Some(1) instanceof Option; // true
  Option.None instanceof Option; // true

  function incOrZero(o) {
      return o.cata({
          Some: function(x) {
              return x + 1;
          },
          None: function() {
              return 0;
          }
      });
  }
  incOrZero(Option.Some(1)); // 2
  incOrZero(Option.None); // 0
  ```
**/
function taggedSum(constructors) {
    var key,
        ctor;

    function definitions() {
        throw new TypeError('Tagged sum was called instead of one of its properties.');
    }

    function makeCata(key) {
        return function(dispatches) {
            var fields = constructors[key],
                args = [],
                i;

            if(!dispatches[key])
                throw new TypeError("Constructors given to cata didn't include: " + key);

            for(i = 0; i < fields.length; i++)
                args.push(this[fields[i]]);

            return dispatches[key].apply(this, args);
        };
    }

    function makeProto(key) {
        var proto = λ.create(definitions.prototype);
        proto.cata = makeCata(key);
        return proto;
    }

    function constant(x) {
      return function() { return x; };
    }

    for(key in constructors) {
        if(!constructors[key].length) {
            definitions[key] = makeProto(key);
            definitions[key].toString = constant('()');
            continue;
        }
        ctor = tagged.apply(null, constructors[key]);
        definitions[key] = ctor;
        definitions[key].prototype = makeProto(key);
        definitions[key].prototype.constructor = ctor;
    }

    return definitions;
}

exports = module.exports = {
    tagged: tagged,
    taggedSum: taggedSum
};
