# nice-pipe

[![Build Status](https://img.shields.io/travis/julien-f/nodejs-nice-pipe/master.svg)](http://travis-ci.org/julien-f/nodejs-nice-pipe)
[![Dependency Status](https://david-dm.org/julien-f/nodejs-nice-pipe/status.svg?theme=shields.io)](https://david-dm.org/julien-f/nodejs-nice-pipe)
[![devDependency Status](https://david-dm.org/julien-f/nodejs-nice-pipe/dev-status.svg?theme=shields.io)](https://david-dm.org/julien-f/nodejs-nice-pipe#info=devDependencies)

> Nicer Node.js pipes.

## Issues with Node pipes

### Errors are not forwarded

Errors are not forwarded down the chain and you must handle them on
each stream or they will be thrown from the main loop.

On possible work-around is to use a dedicated
[domain](http://nodejs.org/api/domain.html) but:

- you should not handle continue after an error as been thrown;
- this API is not stable;
- it is a bit cumbersome to set up.

### Streams unpipe on error

This can be a problem when you want to continue using a pipeline even
if an error as occurred.

This is a common practice in build systems and gulp.js is also working
on it on [its side](https://github.com/gulpjs/gulp/issues/358).

**Not implemented yet.**

## Install

Download [manually](https://github.com/julien-f/nodejs-nice-pipe/releases) or with package-manager.

#### [npm](https://npmjs.org/package/nice-pipe)

Install globally if you want to use the CLI:

```
npm install --global nice-pipe
```

Install locally if you want to use it as a library:

```
npm install --save nice-pipe
```

## Usage

```javascript
const nicePipe = require("nice-pipe");

const parse = true;

const pipeline = nicePipe([
  process.stdin,

  // Falsy values are silently ignored.
  parse && require("csv2json")(),

  process.stdout,
]);

pipeline.on("error", function (error) {
  console.error(error);
});
```

## Contributions

Contributions are _very_ welcomed, either on the documentation or on
the code.

You may:

- report any [issue](https://github.com/julien-f/nodejs-nice-pipe/issues)
  you've encountered;
- fork and create a pull request.

## License

ISC © [Julien Fontanet](http://julien.isonoe.net)
