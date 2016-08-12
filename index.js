/*!
 * uber_api_client
 * MIT Licensed
 */
'use strict'
const VERSION = '1.2'

/**
 * Module dependencies.
 * @private
 */
var REST = require('restler-bluebird')

/**
 * Create Ubersmith API restler.service
 *
 * @public
 * @param {Object} [options]
 * @return {Function} middleware
 */
var uber = REST.service(
  function(options){
    options = options || { baseURL: 'http://localhost/' }
    // value of the content type response header
    this.ContentType = null
    // value of the content length response header
    this.ContentSize = null
    // value of the filename value in the content disposition response header
    this.contentFilename = null
  }
  ,
  {
    method: 'get',
    query: '',
    data: undefined,
    parser: undefined,
    xml2js: {},
    encoding: 'utf8',
    decoding: 'utf8',
    headers: {
      'Accept': '*/*',
      'User-Agent': 'Ubersmith API Client NodeJS/' + VERSION
    },
    username: '',
    password: '',
    accessToken: '',
    multipart: false,
    client: '',
    followRedirects: true,
    timeout: 30,
    rejectUnauthorized: true,
    agent: undefined
  }
  ,
  {
    /**
     * Set an option
     *
     * @param {string} opt option name
     * @param val value
     */
    setOption: function(opt,val){
      return (this.defaults[opt] = val)
    },
    /**
     * Get option(s)
     *
     * @param {?string} opt
     * @param def value to return if option is not set
     * @return mixed
     */
    getOption: function(opt,def){
      if('undefined' === typeof opt){
        return this.defaults
      }
      if('undefined' !== typeof this.defaults[opt]){
        return this.defaults[opt]
      }
      if('undefined' !== typeof def){
        return def
      }
      return null
    },
    getContentType: function(){ return this.ContentType },
    getContentSize: function(){ return this.ContentSize },
    getContentFilename: function(){ return this.ContentFilename },
    call: function(method,params){
      method = method || 'uber.method_list'
      params = params || {}
      return this.postJson(this.baseURL + '/api/2.0/',
        {
          query: {
            method: method
          },
          headers: {
            'Accept-Encoding': 'gzip',
            'Expect': ''
          },
          data: params
        }
      )
    }
  }
)

/**
 * Module exports.
 * @public
 */
module.exports = uber
module.exports.loadPlugin = function(filename,namespace){
  // Load methods from plugin module
  var methods = require(filename) || {}
  if('string' !== typeof namespace && 'undefined' !== typeof methods._namespace){
    namespace = methods._namespace
  } else namespace = 'RTFM'
  // NOTE: this overloads without checking... careful what you wish for
  if('object' !== typeof this.prototype[namespace]){
    this.prototype[namespace] = {}
  }
  var T = this
  var NS = this.prototype[namespace]
  Object.keys(methods).forEach(function(k){
    var ref = methods[k]
    if('' === ref){
      ref = function(a){return T.call(k,a)}
    }
    NS[k] = ref
  })
}
