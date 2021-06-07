"use strict";

/* eslint-env jest */

// ===================================================================

const nicePipe = require("./");

const isReadable = require("is-stream").readable;
const isWritable = require("is-stream").writable;
const Readable = require("stream").Readable;
const Transform = require("stream").Transform;
const Writable = require("stream").Writable;

// ===================================================================

expect.extend({
  toBeReadableStream(actual) {
    const pass = isReadable(actual);
    return {
      message: () =>
        `expected ${actual}${pass ? " not" : ""} to be a readable stream`,
      pass,
    };
  },
  toBeWritableStream(actual) {
    const pass = isWritable(actual);
    return {
      message: () =>
        `expected ${actual}${pass ? " not" : ""} to be a writable stream`,
      pass,
    };
  },
});

// ===================================================================

function passthroughTransform(chunk, enc, next) {
  next(null, chunk);
}

function through(transform, flush, opts) {
  if (!opts) {
    opts = {};
  }
  opts.objectMode = true;

  const stream = new Transform(opts);
  stream._transform = transform || passthroughTransform;
  if (flush) {
    stream._flush = flush;
  }

  return stream;
}

function readable() {
  const stream = new Readable();
  stream._read = function () {
    this.push(null);
  };

  return stream;
}

function writable() {
  const stream = new Writable();
  stream._write = function (chunk, enc, next) {
    next();
  };
  return stream;
}

// -------------------------------------------------------------------

function spyTransform(chunk, enc, next) {
  (this.chunks || (this.chunks = [])).push(chunk);

  next(null, chunk);
}

function spyFlush(next) {
  this.flushed = true;

  next();
}

// Create a passthrough stream which remember what passed through it.
function makeSpyStream(opts) {
  return through(spyTransform, spyFlush, opts);
}

// ===================================================================

it("sets up a pipeline", function (done) {
  const stream1 = makeSpyStream();
  const stream2 = makeSpyStream();
  const stream3 = makeSpyStream();

  const streams = [stream1, stream2, stream3];
  const pipeline = nicePipe(streams);
  expect(pipeline).toBeReadableStream();
  expect(pipeline).toBeWritableStream();

  const value = {};
  pipeline.end(value);

  pipeline.on("data", function (data) {
    expect(data).toBe(value);

    // Test pipeline.
    streams.forEach(function (stream) {
      expect(stream.chunks).toEqual([value]);
    });
  });

  stream3.on("finish", function () {
    streams.forEach(function (stream) {
      expect(stream.flushed).toBe(true);
    });

    done();
  });
});

it.skip("ignores falsy values", function () {});

it.skip("forwards errors", function () {});

it.skip("handles nested arrays", function () {});

it.skip("supports flat parameters instead of an array", function () {});

it("writable + readable", function () {
  const pipeline = nicePipe(through(), through());

  expect(pipeline).toBeReadableStream();
  expect(pipeline).toBeWritableStream();
});

it("non writable + readable", function () {
  const pipeline = nicePipe(readable(), through());

  expect(pipeline).toBeReadableStream();
  expect(pipeline).not.toBeWritableStream();
});

it("writable + non readable", function () {
  const pipeline = nicePipe(through(), writable());

  expect(pipeline).not.toBeReadableStream();
  expect(pipeline).toBeWritableStream();
});

it("non writable + non readable", function () {
  const pipeline = nicePipe(readable(), writable());

  expect(pipeline).not.toBeReadableStream();
  expect(pipeline).not.toBeWritableStream();
});
