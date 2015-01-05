'use strict';

//====================================================================

var stream = require('stream');

var Duplex = stream.Duplex;
var Readable = stream.Readable;
var Writable = stream.Writable;

var isReadable = require('is-readable-stream');
var isWritable = require('is-writable-stream');

//====================================================================

function forEach(array, iterator) {
  var i, n;

  for (i = 0, n = array.length; i < n; ++i) {
    if (iterator(array[i], i, array) === false) {
      break;
    }
  }
}

var toString = Object.prototype.toString;

var isArray = Array.isArray || (function (tag) {
  return function isArray(obj) {
    return toString.call(obj) === tag;
  };
})(toString.call([]));

//--------------------------------------------------------------------

function proxyRead(proxy, readable) {
  function forward() {
    var data;
    do {
      data = readable.read();
    } while (data !== null && proxy.push(data));
  }

  proxy._read = forward;
  readable.on('readable', forward);

  readable.on('end', function forwardEnd() {
    proxy.push(null);
  });
}

function proxyWrite(proxy, writable) {
  proxy._write = function _write(chunk, encoding, callback) {
    return writable.write(chunk, encoding, callback);
  };

  proxy.on('finish', function () {
    writable.end();
  });

  writable.on('finish', function () {
    proxy.end();
  });
}

//====================================================================

// State is maintained with these global variables.
// It is ok because the code is completely synchronous.
var current;
var first;
var forwardError;

// TODO: implements unpipe on error fix.
//
// Possibilities:
// 1. remove default error handler;
// 2. repipe on error.

function nicePipeCore(streams) {
  forEach(streams, function (stream) {
    // Ignore all falsy values (undefined, null, etc.).
    if (!stream) {
      return;
    }

    if (isArray(stream)) {
      nicePipeCore(stream, current);
      return;
    }

    stream.on('error', forwardError);

    if (current) {
      current = current.pipe(stream);
    } else {
      first = current = stream;
    }
  });
}

function nicePipe(streams) {
  var pipeline;

  // Initialize state.
  current = first = undefined;
  forwardError = function forwardError(error) {
    pipeline.emit('error', error);
  };

  nicePipeCore(isArray(streams) ? streams : arguments);

  // Only one stream.
  if (current === first) {
    // Remove superfluous error forwarder.
    current.removeListener('error', forwardError);

    return current;
  }

  // Create the pipeline.
  if (isWritable(first)) {
    if (isReadable(current)) {
      pipeline = new Duplex({
        objectMode: true,
      });
      proxyRead(pipeline, current);
    } else {
      pipeline = new Writable({
        objectMode: true,
      });
    }
    proxyWrite(pipeline, first);
  } else if (isReadable(current)) {
    pipeline = new Readable({
      objectMode: true,
    });
    proxyRead(pipeline, current);
  }

  return pipeline;
}
exports = module.exports = nicePipe;
