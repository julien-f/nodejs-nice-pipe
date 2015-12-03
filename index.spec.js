'use strict'

/* eslint-env mocha */

// ===================================================================

var nicePipe = require('./')

var expect = require('must')
var isReadable = require('is-stream').readable
var isWritable = require('is-stream').writable
var Readable = require('stream').Readable
var Transform = require('stream').Transform
var Writable = require('stream').Writable

// ===================================================================

expect.prototype.readableStream = function () {
  this.assert(isReadable(this.actual), 'be a readable stream')
}

expect.prototype.writableStream = function () {
  this.assert(isWritable(this.actual), 'be a writable stream')
}

// ===================================================================

function passthroughTransform (chunk, enc, next) {
  next(null, chunk)
}

function through (transform, flush, opts) {
  if (!opts) {
    opts = {}
  }
  opts.objectMode = true

  var stream = new Transform(opts)
  stream._transform = transform || passthroughTransform
  if (flush) {
    stream._flush = flush
  }

  return stream
}

function readable () {
  var stream = new Readable()
  stream._read = function () {
    this.push(null)
  }

  return stream
}

function writable () {
  var stream = new Writable()
  stream._write = function (chunk, enc, next) {
    next()
  }
  return stream
}

// -------------------------------------------------------------------

function spyTransform (chunk, enc, next) {
  ;(this.chunks || (this.chunks = [])).push(chunk)

  next(null, chunk)
}

function spyFlush (next) {
  this.flushed = true

  next()
}

// Create a passthrough stream which remember what passed through it.
function makeSpyStream (opts) {
  return through(spyTransform, spyFlush, opts)
}

// ===================================================================

it('sets up a pipeline', function (done) {
  var stream1 = makeSpyStream()
  var stream2 = makeSpyStream()
  var stream3 = makeSpyStream()

  var streams = [
    stream1,
    stream2,
    stream3
  ]
  var pipeline = nicePipe(streams)
  expect(pipeline).to.be.a.readableStream()
  expect(pipeline).to.be.a.writableStream()

  var value = {}
  pipeline.end(value)

  pipeline.on('data', function (data) {
    expect(data).to.equal(value)

    // Test pipeline.
    streams.forEach(function (stream) {
      expect(stream.chunks).to.eql([value])
    })
  })

  stream3.on('finish', function () {
    streams.forEach(function (stream) {
      expect(stream.flushed).to.be.true()
    })

    done()
  })
})

it('ignores falsy values')

it('forwards errors')

it('handles nested arrays')

it('supports flat parameters instead of an array')

it('writable + readable', function () {
  var pipeline = nicePipe(through(), through())

  expect(pipeline).to.be.a.readableStream()
  expect(pipeline).to.be.a.writableStream()
})

it('non writable + readable', function () {
  var pipeline = nicePipe(readable(), through())

  expect(pipeline).to.be.a.readableStream()
  expect(pipeline).to.not.be.a.writableStream()
})

it('writable + non readable', function () {
  var pipeline = nicePipe(through(), writable())

  expect(pipeline).to.not.be.a.readableStream()
  expect(pipeline).to.be.a.writableStream()
})

it('non writable + non readable', function () {
  var pipeline = nicePipe(readable(), writable())

  expect(pipeline).to.not.be.a.readableStream()
  expect(pipeline).to.not.be.a.writableStream()
})
