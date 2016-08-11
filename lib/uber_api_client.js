'use strict';
const VERSION = '1.2'

var REST   = require('restler-bluebird')
var util   = require('util')
var events = require('events')
var http   = require('http')
var https  = require('https')
var URL    = require('url')
var qs     = require('qs')
var iconv  = require('iconv-lite')

function mixin(target,source){
  var src = source || {}
  Object.keys(src).forEach(function(key) {
    target[key] = src[key]
  })
  return target
}

function UberRequest(options){
  events.EventEmitter.call(this)
  this.options =
  {
    'debug': false,
    'server': 'http://localhost/',
    'headers': {
      'User-Agent': 'Ubersmith API Client NodeJS/' + VERSION
    },
    'timeout': 30,
    'json_req': false,
    'format': '',
    'orig_user': null,
    'orig_ip': null,
    'user': {
      'name': '',
      'auth': ''
    },
    'certificate': null,
    'certpass': null
  }
  mixin(this.options, options || {})
  this.options.userpwd = this.options.username + ':' + this.options.userauth

  this.headers = {
    'Host': this.url.host,
    'User-Agent': this.options.useragent,
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate'
  }
  mixin(this.headers, options.headers || {})
}
util.inherits(Request, events.EventEmitter)

mixin(Request.prototype,{
  // value of the content type response header
  ContentType: null,
  // value of the content length response header
  ContentSize: null,
  // value of the filename value in the content disposition response header
  contentFilename: null,
  /**
   * Set an option
   *
   * @param {string} opt option name
   * @param val value
   */
  setOption: function(opt,val){
    return (this.options[opt] = val)
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
      return this.options
    }
    if('undefined' !== typeof this.options[opt]){
      return this.options[opt]
    }
    if('undefined' !== typeof def){
      return def
    }
    return null
  },
  getContentType: function(){ return this.ContentType },
  getContentSize: function(){ return this.ContentSize },
  getContentFilename: function (){ return this.ContentFilename },
  call: function(method,params){
    method = method || 'uber.method_list'
    params = params || []

    this.debug('API:',this)

    var url = rtrim(this.options.server,'/') + '/api/2.0/?method=' + urlencode(method)
    if(this.getOption('format')){
      url = url + '&format=' + urlencode(this.getOption('format'))
    }

    // setup headers
    var headers = [
      'Accept-Encoding: gzip',
      'Expect:'
    ]
    if (this.getOption('json_req')) {
      // use json request format
      headers.push('Content-type: application/json')
      if(Array.isArray(params)){
        params = json_encode($params)
      }
    } else {
      // use regular post requests
      if(Array.isArray(params)){
        params = this.curl_postfields($params)
      }
    }
    if(this.getOption('orig_user')){
      headers.push('X-Ubersmith-Orig-User: ' + this.getOption('orig_user'))
    }
    if (this.getOption('orig_ip')) {
      headers.push('X-Ubersmith-Orig-IP: ' + this.getOption('orig_ip'))
    }

    this.debug('URL:',$url);
    this.debug('Params:',$params);
    $curl = curl_init($url);
    curl_setopt($curl,CURLOPT_POST,1);
    curl_setopt($curl,CURLOPT_POSTFIELDS,    $params);
    curl_setopt($curl,CURLOPT_FAILONERROR,   true);
    curl_setopt($curl,CURLOPT_RETURNTRANSFER,1);
    // user-agent & request headers
    curl_setopt($curl,CURLOPT_USERAGENT,     this.getOption('useragent'));
    curl_setopt($curl,CURLOPT_HTTPHEADER,    $headers);
    // timeout
    curl_setopt($curl,CURLOPT_TIMEOUT,       this.getOption('timeout'));
    // follow up to 2 redirects
    curl_setopt($curl,CURLOPT_FOLLOWLOCATION,1);
    curl_setopt($curl,CURLOPT_MAXREDIRS,     2);
    curl_setopt($curl,CURLOPT_HEADERFUNCTION,array($this, 'read_header'));

    // set auth stuff
    $userpwd = this.getOption('userpwd');
    if (!empty($userpwd)) {
      curl_setopt($curl, CURLOPT_USERPWD, $userpwd);
    }

    // ssl options
    if (substr($url,0,5) === 'https') {
      // set CA file
      if (file_exists(dirname(__FILE__) .'/cacert.pem')) {
        curl_setopt($curl,CURLOPT_CAINFO,dirname(__FILE__) .'/cacert.pem');
      }

      // ssl client certificate and password
      $certificate = this.getOption('certificate');
      if (!empty($certificate)) {
        curl_setopt($curl,CURLOPT_SSLCERT,$certificate);

        $certpass = this.getOption('certpass');
        if (!empty($certpass)) {
          curl_setopt($curl,CURLOPT_SSLCERTPASSWD,$certpass);
        }
      }
    }

    // handle response
    REST.post(url,{})
    $response = curl_exec($curl);
    if ($response === false) {
      $errnum = curl_errno($curl);
      $errstr = curl_error($curl);
      curl_close($curl);
      this.debug('cURL Error:', $errstr);
      return this.raiseError('cURL Error: '. $errstr,$errnum);
    }
    this.ContentType = curl_getinfo($curl,CURLINFO_CONTENT_TYPE);
    this.ContentSize = curl_getinfo($curl,CURLINFO_CONTENT_LENGTH_DOWNLOAD);
    curl_close($curl);

    this.debug('Response:',$response);

    switch (this.ContentType) {
    case 'application/json';
      $result = json_decode($response,true);
      if (!$result) {
        return this.raiseError('json error encountered: '. json_last_error(),-1);
      }

      if (empty($result['status'])) {
        return this.raiseMethodError($result['error_message'],$result['error_code']);
      }

      return $result['data'];
    case 'application/xml':
      return $response;
      break;
    case 'application/pdf':
      // an example of header() calls to use for pdfs in your controller
      //header('Content-type: application/pdf');
      //header('Content-Length: '. $uber->getContentSize());
      //header('Content-Disposition: inline; filename='. $uber->getContentFilename());
      return $response;
      break;
    case 'image/png':
      // an examples of header() calls to use for pngs in your controller
      //header('Content-type: application/pdf');
      //header('Content-Length: '. $uber->getContentSize());
      //header('Content-Disposition: inline; filename='. $uber->getContentFilename());
      return $response;
      break;
    case 'text/html':
    default:
      return $response;
    }
  },
  // flatten multi-dimensional params array
  curl_postfields: function(formdata,numeric_prefix,_parent){
    numeric_prefix = numeric_prefix || ''
    _parent = _parent || null
    var postdata = {}
    formdata.forEach(function(k,v){
      if(!empty(_parent)){
        k = _parent .'[' + k + ']'
      } else if(is_numeric(k)){
        k = numeric_prefix + k
      }
      if(is_array(v) || is_object(v)) {
        postdata = array_merge(postdata,this.curl_postfields(v,numeric_prefix,k))
      } else {
        postdata[k] = v
      }
    })
    return postdata
  },
  // reads all the response headers one by one from curl
  read_header: function(ch,header){
    var len = strlen(header)
    var pos = stripos(header,'filename=')
    if(pos !== FALSE){
      this.ContentFilename = substr(header,pos + 9)
    }
    return len
  },
  // throw an UberException if an error occurs
  raiseError: function(text,code){
    // we can throw exceptions from the SPL as well
    if('undefined' === typeof code) code = 1
    throw new UberException(text,code)
  },
  // throw an UberMethodException if a method status was false
  raiseMethodError: function(text,code){
    // we can throw exceptions from the SPL as well
    if('undefined' === typeof code) code = 1
    throw new UberMethodException(text,code)
  },
  /**
   * internal function for displaying debug information
   */
  debug: function(text,info){
    if(this.getOption('debug')){
      print text ."\n\n"
      print_r(info)
      print "\n\n"
    }
  }
})

// a backend error occured (e.g. curl failed)
class UberException extends Exception { }

// the method call failed, i.e. status was false
class UberMethodException extends Exception { }

// end of script
