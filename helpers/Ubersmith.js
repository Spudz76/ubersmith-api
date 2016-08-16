'use strict';
var P = require('bluebird')
//var dns = require('dns')
var fs = require('graceful-fs')
var ObjectManage = require('object-manage')
var path = require('path')

var api = require('./api')
var UserError = require('./UserError')

//make some promises
//P.promisifyAll(dns)

/**
 * Ubersmith Public Interaction Helper
 * @param {object} opts
 * @constructor
 */
var Ubersmith = function(opts){
  //setup options
  this.opts = new ObjectManage({
    username: '',
    password: '',
    domain: 'cdn.oose.io',
    ubersmith: {
      host: null,
      port: 5971
    }
  })
  this.opts.$load(opts)
  //set properties
  this.api = {}
  this.authenticated = false
  this.connected = false
  this.session = {}
}

/**
 * Check if we are connected
 * @return {boolean}
 */
Ubersmith.prototype.isConnected = function(){
  return this.connected
}

/**
 * Check if we are authenticated
 * @return {boolean}
 */
Ubersmith.prototype.isAuthenticated = function(){
  return this.authenticated
}

/**
 * Set the session statically
 * @param {string} sessionToken
 * @return {Ubersmith}
 */
Ubersmith.prototype.setSession = function(sessionToken){
  this.session = {token: sessionToken}
  this.authenticated = true
  return this
}

/**
 * Select a ubersmith and prepare for connection
 * @param {string} host
 * @param {number} port
 * @return {P}
 */
Ubersmith.prototype.connect = function(host,port){
  var that = this
  return P.try(function(){
    if(host){
      that.opts.ubersmith.host = host
      if(port) that.opts.ubersmith.port = port
      that.connected = true
      that.api = api.ubersmith(that.opts.ubersmith)
    } else {
      if(!that.opts.ubersmith.host) that.opts.ubersmith.host = that.opts.domain
      if(!that.opts.ubersmith.port) that.opts.ubersmith.port = port || 5971
      that.connected = true
      that.api = api.ubersmith(that.opts.ubersmith)
    }
    return host || that.opts.ubersmith.host
  })
}

/**
 * Authenticate the session
 * @param {string} username
 * @param {string} password
 * @return {P}
 */
Ubersmith.prototype.login = function(username,password){
  var that = this
  return that.api.postAsync({
    url: that.api.url('/user/login'),
    json: {
      username: username || that.opts.username,
      password: password || that.opts.password
    }
  })
    .spread(that.api.validateResponse())
    .spread(function(res,body){
      if(!body.session)
        throw new UserError('Login failed, no session')
      that.session = body.session
      that.authenticated = true
      return that.session
    })
    .catch(that.api.handleNetworkError)
}

/**
 * Prepare call and renew session if needed
 * @param {object} request
 * @param {object} session
 * @return {P}
 */
Ubersmith.prototype.prepare = function(request,session){
  var that = this
  if(!request) request = that.api
  if(!session) session = that.session
  var client = api.setSession(session,request,'X-OOSE-Token')
  if(!that.isConnected()) throw new UserError('Not connected')
  if(!that.isAuthenticated()) throw new UserError('Not authenticated')
  return P.try(function(){
    return client
  })
}

/**
 * Logout
 * @return {P}
 */
Ubersmith.prototype.logout = function(){
  var that = this
  var client = {}
  return that.prepare()
    .then(function(result){
      client = result
      return client.postAsync({
        url: client.url('/user/logout'),
        json: true
      })
    })
    .spread(that.api.validateResponse())
    .spread(function(res,body){
      that.authenticated = false
      return body
    })
    .catch(that.handleNetworkError)
}

/**
 * Content detail
 * @param {string} sha1
 * @return {P}
 */
Ubersmith.prototype.contentDetail = function(sha1){
  var that = this
  var client = {}
  return that.prepare()
    .then(function(result){
      client = result
      return client.postAsync({
        url: client.url('/content/detail'),
        json: {
          sha1: sha1
        }
      })
    })
    .spread(that.api.validateResponse())
    .spread(function(res,body){
      return body
    })
    .catch(that.handleNetworkError)
}

/**
 * Upload a file from a path
 * @param {string} filepath
 * @return {P}
 */
Ubersmith.prototype.contentUpload = function(filepath){
  var that = this
  var client = {}
  return that.prepare()
    .then(function(result){
      client = result
      return client.postAsync({
        url: client.url('/content/upload'),
        json: true,
        formData: {
          file: fs.createReadStream(path.resolve(filepath))
        }
      })
    })
    .spread(that.api.validateResponse())
    .spread(function(res,body){
      return body
    })
    .catch(that.handleNetworkError)
}

/**
 * Retrieve content from a URL
 * @param {object} request
 * @param {string} fileExtension
 * @return {P}
 */
Ubersmith.prototype.contentRetrieve = function(request,fileExtension){
  var that = this
  var client = {}
  if(!fileExtension) fileExtension = path.extname(request.url).replace('.','')
  return that.prepare()
    .then(function(result){
      client = result
      return client.postAsync({
        url: client.url('/content/retrieve'),
        json: {
          request: request,
          extension: fileExtension
        }
      })
    })
    .spread(that.api.validateResponse())
    .spread(function(res,body){
      return body
    })
    .catch(that.handleNetworkError)
}

/**
 * Purchase Content
 * @param {string} sha1
 * @param {string} ext
 * @param {array} referrer
 * @param {number} life
 * @return {P}
 */
Ubersmith.prototype.contentPurchase = function(sha1,ext,referrer,life){
  var that = this
  var client = {}
  return that.prepare()
    .then(function(result){
      client = result
      return client.postAsync({
        url: client.url('/content/purchase'),
        json: {
          sha1: sha1,
          ext: ext,
          referrer: referrer,
          life: life
        }
      })
    })
    .spread(that.api.validateResponse())
    .spread(function(res,body){
      return body
    })
    .catch(that.handleNetworkError)
}

/**
 * Remove purchase
 * @param {string} token
 * @return {P}
 */
Ubersmith.prototype.contentPurchaseRemove = function(token){
  var that = this
  var client = {}
  return that.prepare()
    .then(function(result){
      client = result
      return client.postAsync({
        url: client.url('/content/purchase/remove'),
        json: {
          token: token
        }
      })
    })
    .spread(that.api.validateResponse())
    .spread(function(res,body){
      return body
    })
    .catch(that.handleNetworkError)
}

/**
 * Output a purchase URL
 * @param {object} purchase
 * @param {string} name
 * @return {string}
 */
Ubersmith.prototype.urlPurchase = function(purchase,name){
  var that = this
  name = name || 'video'
  return '//' + that.opts.domain + '/' +
    purchase.token + '/' + name + '.' + purchase.ext
}

/**
 * Output a static URL
 * @param {string} sha1
 * @param {string} ext
 * @param {string} name
 * @return {string}
 */
Ubersmith.prototype.urlStatic = function(sha1,ext,name){
  var that = this
  name = name || 'file'
  ext = ext || 'bin'
  return '//' + that.opts.domain + '/static/' +
    sha1 + '/' + name + '.' + ext
}

/**
 * Export Ubersmith
 * @type {Ubersmith}
 */
module.exports = Ubersmith
