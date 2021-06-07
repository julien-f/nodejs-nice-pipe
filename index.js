"use strict";

// ===================================================================

const EventEmitter = require("events").EventEmitter;

let stream;
try {
  // eslint-disable-next-line node/no-missing-require
  stream = require("readable-stream");
} catch (_) {
  stream = require("stream");
}

const Duplex = stream.Duplex;
const Readable = stream.Readable;
const Writable = stream.Writable;

const isReadable = require("is-stream").readable;
const isWritable = require("is-stream").writable;

// ===================================================================

const arrayPush = Array.prototype.push;

function forEach(array, iterator) {
  let i, n;

  for (i = 0, n = array.length; i < n; ++i) {
    iterator(array[i], i, array);
  }
}

const isArray =
  Array.isArray ||
  (function (toString) {
    const tag = toString.call([]);
    return function isArray(obj) {
      return toString.call(obj) === tag;
    };
  })(Object.prototype.toString);

// -------------------------------------------------------------------

function makeEventProxy(source, target) {
  const emit = target.emit;

  return function (eventName) {
    source.on(eventName, function () {
      const args = [eventName];
      arrayPush.apply(args, arguments);

      emit.apply(target, args);
    });
  };
}

function proxyRead(proxy, readable) {
  proxy._read = function () {
    let data;
    do {
      data = readable.read();
    } while (data !== null && proxy.push(data));
  };

  readable.once("end", function () {
    proxy.push(null);
  });

  const proxyEvent = makeEventProxy(readable, proxy);
  proxyEvent("close");
  proxyEvent("readable");
}

function proxyWrite(proxy, writable) {
  proxy._write = function (chunk, encoding, callback) {
    return writable.write(chunk, encoding, callback);
  };

  proxy.once("finish", function () {
    writable.end();
  });
  writable.once("finish", function () {
    proxy.end();
  });

  const proxyEvent = makeEventProxy(writable, proxy);
  proxyEvent("drain");
}

// ===================================================================

// State is maintained with these global variables.
// It is ok because the code is completely synchronous.
let current;
let first;
let forwardError;

// TODO: implements unpipe on error fix.
//
// Possibilities:
// 1. remove default error handler
// 2. repipe on error.

function nicePipeCore(stream) {
  // Ignore all falsy values (undefined, null, etc.).
  if (!stream) {
    return;
  }

  if (isArray(stream)) {
    forEach(stream, nicePipeCore);
    return;
  }

  stream.on("error", forwardError);

  if (current) {
    current = current.pipe(stream);
  } else {
    first = current = stream;
  }
}

function nicePipe(streams) {
  let pipeline;

  forwardError = function (error) {
    pipeline.emit("error", error);
  };

  nicePipeCore(streams);

  // Only one stream.
  if (current === first) {
    // Remove superfluous error forwarder.
    current.removeListener("error", forwardError);

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
  } else {
    pipeline = new EventEmitter();
  }

  return pipeline;
}

module.exports = function nicePipeWrapper(streams) {
  try {
    if (!isArray(streams)) {
      streams = [];
      arrayPush.apply(streams, arguments);
    }

    return nicePipe(streams);
  } finally {
    current = first = forwardError = undefined;
  }
};
