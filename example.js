/*
search index / broken link crawler
*/
var Crawler = require('./crawler')
var elasticlunr = require('elasticlunr')

var index = elasticlunr(function () {
  this.addField('title')
  this.addField('body')
  this.setRef('url')
})

var crawler = new Crawler({timeout: 1000, osmosis: {tries: 1}})
crawler
  .on('page', function (pageData) {
    console.log('page', pageData)
    pageData.url = pageData.pathname
    // add page to index
    index.addDoc(pageData)
  })
  .on('link', function (linkData, pageData) {
    console.log('link', linkData, pageData)
  })
  .on('error', function (err, pageData, linkData) {
    console.log('error', err.errorType, err.errorMessage)
  })
  .on('done', function (err) {
    if (err) console.log('\n\nbroken links', err.brokenLinks)
    // search index query
    var found = index.search('hallo')
    console.log('\n\nfound hallo', index, found)
  })
  .crawl('http://localhost:8080/')
