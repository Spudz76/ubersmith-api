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
var REST = require('restler')

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
    this.baseURL = options.baseURL
    // value of the content type response header
    this.ContentType = null
    // value of the content length response header
    this.ContentSize = null
    // value of the filename value in the content disposition response header
    this.ContentFilename = null
    var defaults = {
      baseURL: 'http://localhost/',
      method: 'postJson',
      encoding: 'utf8',
      decoding: 'utf8',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Ubersmith API Client NodeJS/' + VERSION
      },
      timeout: 30
    }
    Object.keys(options).forEach(function(k){
      if(options[k] !== defaults[k]){
        defaults[k] = options[k]
      }
    })
    this.defaults = defaults
  }
  ,{},
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
      console.log(require('util').inspect(this,true,10))
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
    },
    loadPlugin: function(filename,namespace){
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
          ref = function(a){return T.call(k,a)}
        }
        NS[k] = ref
      })
    }
  }
)

/**
 * Module exports.
 * @public
 */
module.exports = uber
