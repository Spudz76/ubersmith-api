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
    options = options || { baseURL: 'http://localhost' }
    this.REST = REST
    this.baseURL = options.baseURL
    // value of the content type response header
    this.ContentType = null
    // value of the content length response header
    this.ContentSize = null
    // value of the filename value in the content disposition response header
    this.ContentFilename = null
    var defaults = new ObjectManage({
      baseURL: 'http://localhost/',
      method: 'post',
      encoding: 'utf8',
      decoding: 'utf8',
      headers: {
        'User-Agent': 'Ubersmith API Client NodeJS/' + VERSION
      },
      timeout: 30
    })
    defaults.$load(options)
    this.REST.defaults = defaults.$get()
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
        return this.REST.defaults
      }
      if('undefined' !== typeof this.REST.defaults[opt]){
        return this.REST.defaults[opt]
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
          ref = function(a){return T.call(namespace + '.' + k,a)}
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
