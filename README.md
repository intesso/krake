# krake

- simple base library for crawl jobs, based on [osmosis](https://www.npmjs.com/package/osmosis).
- it crawls a website recursively and emits events to take custom actions.


## why

making crawling jobs easier.

## how

**install**

```bash
npm install --save krake
```

**use**

```js
var Crawler = require('krake')
var crawler = new Crawler()
crawler
  .on('page', function (pageData) {
    console.log('page', pageData)
  })
  .on('link', function (linkData) {
    console.log('link', linkData)
  })
  .on('error', function (err, pageData, linkData) {
    console.log('error', err.errorType, err.errorMessage)
  })
  .on('done', function (err) {
    if (err) console.log('broken links', err.brokenLinks)
  })
  .crawl('http://localhost:8080/')
```

see also [example](example.js)

## options

these are the default options:

```js

var crawler = new Crawler({

  // osmosis options: http://rchipka.github.io/node-osmosis/Osmosis.html
  osmosis: {
    ignore_http_errors: false,
    tries: 1
  },

  // krake options
  uri: 'http://localhost:8080',
  followExternalLinks: false,
  timeout: 500,

  pageDataSelectors: {
    title: 'head title',
    body: 'body'
  },
  linkSelectors: {
    url: '@href,@src'
  },
  linkTags: 'a,img,svg',
  linkIgnores: ':starts-with(javascript)'

})

```

## author

Andi Neck | [@andineck](https://twitter.com/andineck) | andi.neck@intesso.com | [intesso](http://intesso.com)


## license

MIT

## style

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)