var debug = require('debug')('crawler:debug')
var osmosis = require('osmosis')
var onetime = require('onetime')
var inherits = require('inherits')
var url = require('url')
var EventEmitter = require('events')

/*
crawling a site recursively
*/

inherits(Crawler, EventEmitter)
module.exports = Crawler

function Crawler (opts) {
  if (!(this instanceof Crawler)) return new Crawler(opts)
  this.init()
  this.options(opts)
}

Crawler.prototype.init = function init () {
  // default options
  Object.assign(
    this, {
      // defaults
      osmosis: {
        ignore_http_errors: false,
        tries: 1
      },

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
      linkIgnores: ':starts-with(javascript)',

      // crawl variables
      pending: 1,
      pages: 0,
      links: 0,
      errors: 0,
      collectedErrors: [],
      timer: null,
      visited: [],
      brokenLinks: {}
    }
  )
}

Crawler.prototype.options = function options (opts) {
  Object.assign(
    this,
    // options overwrites
    opts
  )
}

Crawler.prototype.crawl = function crawl (uri, opts) {
  var self = this

  // options
  self.options(Object.assign({
    uri: uri
  }, opts))
  debug('osmosis options', self.osmosis)

  /*
  helper functions
  */
  function done () {
    var err
    if (self.collectedErrors.length > 0 || Object.keys(self.brokenLinks).length > 0) {
      err = {}
      if (self.collectedErrors.length > 0) err.errors = self.collectedErrors
      if (Object.keys(self.brokenLinks).length > 0) err.brokenLinks = self.brokenLinks
    }
    debug('done', err)
    self.emit('done', err)
  }

  // make sure the final done is only called once
  var fin = onetime(done)

  // timers for idle based done, because osmosis is great, but not reliant on calling done -(
  function windup () {
    reset()
    self.timer = setTimeout(fin, self.timeout)
  }

  function reset () {
    if (self.timer) clearTimeout(self.timer)
  }

  /*
  recursive crawl definition
  */
  function _crawl (uri, _done) {
    windup()
    var pageUrl = url.parse(uri)
    var pageData = {}
    var linkData = {}
    osmosis
      .config(self.osmosis)
      .get(url.format(pageUrl))
      .set(self.pageDataSelectors)
      .then(function (context, data, next) {
        windup()
        self.pending--
        self.pages++
        data.pathname = data.url = context.location.pathname
        debug('page data', self.pending, data.pathname, data)
        pageData = data
        self.emit('page', pageData, context, next)
        next(context)
      })
      .find(self.linkTags)
      .fail(self.linkIgnores)
      .set(self.linkSelectors)
      .then(function (context, data, next) {
        windup()
        debug('data', data)
        var linkUrl = url.parse(data.url)
        data.pathname = linkUrl.pathname
        linkData = data

        // do not follow external links
        if (!self.followExternalLinks && linkUrl.host && linkUrl.host !== pageUrl.host) return next(context, data)

        var linkBaseUrl = url.resolve(url.format(pageUrl), pageData.pathname)
        var linkUri = url.parse(url.resolve(linkBaseUrl, data.url))
        if (!self.visited[linkUri.pathname]) {
          self.emit('link', data, pageData, context, next)
          self.visited[linkUri.pathname] = {}
          self.visited[linkUri.pathname][pageData.pathname] = data.pathname
          self.pending++
          self.links++
          debug('follow new link', linkUri.pathname)
          _crawl(url.format(linkUri), function _crawlDone () {
            debug('follow new link done', linkUri.pathname)
            next(context, data)
          })
        } else {
          self.visited[linkUri.pathname][pageData.pathname] = data.pathname
          next(context, data)
        }
      })
      .log(windup)
      .error(function (err) {
        windup()
        self.errors++
        debug('error', err, self.errors)
        if (err.statusCode) {
          var pathname = err.url.pathname
          err.brokenLink = {}
          err.brokenLink[pathname] = self.visited[pathname]
          self.brokenLinks[pathname] = self.visited[pathname]
        }
        self.collectedErrors.push(err)
        self.emit('error', err, pageData, linkData)
      })
      .done(function () {
        debug('page done', self.pending, self.errors, self.pages, self.links)
        if (self.pending - self.errors > 1) windup()
        _done()
      })
  }

  _crawl(self.uri, fin)
}
