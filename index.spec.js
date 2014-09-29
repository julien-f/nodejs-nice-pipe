'use strict';

//====================================================================

var nicePipe = require('./');

var expect = require('chai').expect;
var through = require('through2');

//====================================================================

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
  return through.obj(opts, spyTransform, spyFlush);
}

//====================================================================

it('sets up a pipeline', function (done) {
  var stream1 = makeSpyStream();
  var stream2 = makeSpyStream();
  var stream3 = makeSpyStream();

  var pipeline = [
    stream1,
    stream2,
    stream3,
  ];
  nicePipe(pipeline);

  var value = {};
  stream1.write(value);

  // Pipe last stream to a test stream.
  stream3.pipe(through.obj(function () {
    // Test pipeline.
    pipeline.forEach(function (stream) {
      expect(stream.chunks).to.have.members([value]);
    });

    stream1.end();
  }));
  stream3.on('end', function () {
    pipeline.forEach(function (stream) {
      expect(stream.flushed).to.be.true;
    });

    done();
  });
});

it('ignores falsy values', function (done) {
  var stream1 = makeSpyStream();
  var stream2 = makeSpyStream();

  var pipeline = [
    null,
    stream1,
    void 0,
    stream2,
    false,
  ];
  nicePipe(pipeline);

  var value = {};
  stream1.write(value);

  stream2.pipe(through.obj(function () {
    // Test pipeline.
    pipeline.forEach(function (stream) {
      if (stream) {
        expect(stream.chunks).to.have.members([value]);
      }
    });

    stream1.end();
  }));
  stream2.on('end', function () {
    pipeline.forEach(function (stream) {
      if (stream) {
        expect(stream.flushed).to.be.true;
      }
    });

    done();
  });
});

it('forwards errors down', function (done) {
  var stream1 = makeSpyStream();
  var stream2 = makeSpyStream();

  var pipeline = [
    stream1,
    stream2,
  ];
  nicePipe(pipeline);

  var error = {};

  stream2.on('error', function (actual) {
    expect(actual).to.equal(error);
    done();
  });

  stream1.emit('error', error);
});
