'use strict';

//====================================================================

function forEach(array, iterator) {
  var i, n;

  for (i = 0, n = array.length; i < n; ++i) {
    if (iterator(array[i], i, array) === false) {
      break;
    }
  }
}

var isArray = Array.isArray || (function (toS) {
  var tag = toS.call([]);
  return function isArray(obj) {
    return toS.call(obj) === tag;
  };
})(Object.prototype.toString);

//====================================================================

// TODO: implements unpipe on error fix.

// TODO: implements write in pipeline.

function nicePipeCore(streams, current) {
  forEach(streams, function (stream) {
    // Ignore all falsy values (undefined, null, etc.).
    if (!stream) {
      return;
    }

    if (isArray(stream)) {
      current = nicePipeCore(stream, current);
      return;
    }

    if (current) {
      current.on('error', function forwardError(error) {
        stream.emit('error', error);
      });

      current = current.pipe(stream);
    } else {
      current = stream;
    }
  });

  return current;
}

function nicePipe(streams) {
  return nicePipeCore(streams);
}
exports = module.exports = nicePipe;
