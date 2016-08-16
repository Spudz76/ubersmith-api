/*!
 * uber_api_client
 * MIT Licensed
 */
'use strict'
const VERSION = '1.2'

var _DUMP = function(obj){
  console.log(require('util').inspect(obj,true,10))
}

/**
 * Module dependencies.
 * @private
 */
var ObjectManage = require('object-manage')

/**
 * Ubersmith API Client Object Constructor
 *
 * @public
 * @param {Object} [options]
 * @return {Function} middleware
 */
var uber = function(options){
  /**
   * API Helper
   * @type {object}
   */
  this.api = require('./helpers/api')

  /**
   * Network Error
   * @type {NetworkError}
   */
  this.NetworkError = require('./helpers/NetworkError')

  /**
   * Not Found Error
   * @type {NotFoundError}
   */
  this.NotFoundError = require('./helpers/NotFoundError')

  /**
   * User space error
   * @type {UserError}
   */
  this.UserError = require('./helpers/UserError')

  /**
   * Ubersmith helper
   * @type {Ubersmith}
   */
  this.Ubersmith = require('./helpers/Ubersmith')

  this.ContentType = ''
  this.ContentSize = ''
  this.ContentFilename = ''

  this.client = this.api.ubersmith({
    maxSockets: Infinity,
    sessionTokenName: 'X-OOSE-Token',
    headers: {
      'User-Agent': 'Ubersmith API Client NodeJS/' + VERSION
    },
    ubersmith: {
      port: 443,
      host: 'manage.esited.com',
      username: 'esitednoc',
      password: '26nXqfKhY4tD2KdtQN9FRCMv2QdQZhGy'
    }
  })

  this.loadPlugin = function(filename,namespace){
    // Load methods from plugin module
    var methods = require('./lib/' + filename) || {}
    if('string' !== typeof namespace && 'undefined' !== typeof methods._namespace){
      namespace = methods._namespace
    } else namespace = filename
    // NOTE: this overloads without checking... careful what you wish for
    if('object' !== typeof this[namespace]){
      this[namespace] = {}
    }
    var T = this
    var NS = this[namespace]
    Object.keys(methods).forEach(function(k){
      var ref = methods[k]
      if('' === ref){
        ref = function(a){return T.call(namespace + '.' + k,a)}
      }
      NS[k] = ref
    })
  }

  this.call = function(method,params){
    method = method || 'uber.method_list'
    params = params || {}
    var opts = new ObjectManage()
    opts.$load(this.getOption(),{
      headers: {
        'Accept-Encoding': 'gzip',
        'Accept': 'application/json'
      },
      query: {method: method}
    })
    var apiOpt = opts.$get()
    _DUMP(apiOpt)
    _DUMP(params)
    return this.json('POST','/api/2.0/',params,apiOpt)
  }

  /**
   * Set an option
   *
   * @param {string} opt option name
   * @param val value
   */
  this.setOption = function(opt,val){
    return (this.defaults[opt] = val)
  }

  /**
   * Get option(s)
   *
   * @param {?string} opt
   * @param def value to return if option is not set
   * @return mixed
   */
  this.getOption = function(opt,def){
    if('undefined' === typeof opt){
      return this.REST.defaults
    }
    if('undefined' !== typeof this.REST.defaults[opt]){
      return this.REST.defaults[opt]
    }
    if('undefined' !== typeof def){
      return def
    }
    return null
  }
  this.getContentType = function(){ return this.ContentType }
  this.getContentSize = function(){ return this.ContentSize }
  this.getContentFilename = function(){ return this.ContentFilename }
}

/**
 * Module exports.
 * @public
 */
module.exports = uber
