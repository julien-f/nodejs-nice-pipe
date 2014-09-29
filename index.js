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

//====================================================================

// TODO: implements unpipe on error fix.

// TODO: implements write in pipeline.

function nicePipe(opts, streams) {
  if (arguments.length === 1) {
    streams = opts;
    opts = {};
  } else {
    opts = {};
  }

  var current;

  forEach(streams, function (stream) {
    // Ignore all falsy values (undefined, null, etc.).
    if (!stream) {
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
exports = module.exports = nicePipe;
