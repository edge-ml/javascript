var edgeML = (function () {
  'use strict';

  /**
   *
   * @param {number} x 
   * @param {number} y 
   * @param {number} a 
   * @returns {number}
   */
   const lerp = (x, y, a) => x * (1 - a) + y * a;
   /**
    * in place
    * @param {(number | null)[]} arr
    * @param {number | undefined} l value for entries before first known, if undefined first known
    * @param {number | undefined} r value for entries after last known, if undefined last known
    * @return {number[]} 
    */
   const interpolateLinear = (arr, l, r) => {
       let leftmost = l;
       let nullCount = 0;
   
       for (let i = 0; i < arr.length;) {
           if (arr[i] !== null) {
               for (let j = 0; j < nullCount; j++) {
                   arr[i - (nullCount - j)] = typeof leftmost !== 'undefined' ? lerp(leftmost, arr[i], (j + 1) / (nullCount + 1)) : arr[i];
               }
               nullCount = 0;
   
               leftmost = arr[i];
               i++;
               continue;
           }
           for (; arr[i] === null; i++) {
               nullCount++;
           }
       }
       for (let j = 0; j < nullCount; j++) {
           arr[arr.length - (nullCount - j)] = leftmost;
       }
   };

  function getAugmentedNamespace(n) {
    var f = n.default;
  	if (typeof f == "function") {
  		var a = function () {
  			return f.apply(this, arguments);
  		};
  		a.prototype = f.prototype;
    } else a = {};
    Object.defineProperty(a, '__esModule', {value: true});
  	Object.keys(n).forEach(function (k) {
  		var d = Object.getOwnPropertyDescriptor(n, k);
  		Object.defineProperty(a, k, d.get ? d : {
  			enumerable: true,
  			get: function () {
  				return n[k];
  			}
  		});
  	});
  	return a;
  }

  var edgeFel = {exports: {}};

  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.

  // resolves . and .. elements in a path array with directory names there
  // must be no slashes, empty elements, or device names (c:\) in the array
  // (so also no leading and trailing slashes - it does not distinguish
  // relative and absolute paths)
  function normalizeArray(parts, allowAboveRoot) {
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === '.') {
        parts.splice(i, 1);
      } else if (last === '..') {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }

    // if the path is allowed to go above the root, restore leading ..s
    if (allowAboveRoot) {
      for (; up--; up) {
        parts.unshift('..');
      }
    }

    return parts;
  }

  // Split a filename into [root, dir, basename, ext], unix version
  // 'root' is just a slash, or nothing.
  var splitPathRe =
      /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
  var splitPath = function(filename) {
    return splitPathRe.exec(filename).slice(1);
  };

  // path.resolve([from ...], to)
  // posix version
  function resolve() {
    var resolvedPath = '',
        resolvedAbsolute = false;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = (i >= 0) ? arguments[i] : '/';

      // Skip empty and invalid entries
      if (typeof path !== 'string') {
        throw new TypeError('Arguments to path.resolve must be strings');
      } else if (!path) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charAt(0) === '/';
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
      return !!p;
    }), !resolvedAbsolute).join('/');

    return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
  }
  // path.normalize(path)
  // posix version
  function normalize(path) {
    var isPathAbsolute = isAbsolute(path),
        trailingSlash = substr(path, -1) === '/';

    // Normalize the path
    path = normalizeArray(filter(path.split('/'), function(p) {
      return !!p;
    }), !isPathAbsolute).join('/');

    if (!path && !isPathAbsolute) {
      path = '.';
    }
    if (path && trailingSlash) {
      path += '/';
    }

    return (isPathAbsolute ? '/' : '') + path;
  }
  // posix version
  function isAbsolute(path) {
    return path.charAt(0) === '/';
  }

  // posix version
  function join() {
    var paths = Array.prototype.slice.call(arguments, 0);
    return normalize(filter(paths, function(p, index) {
      if (typeof p !== 'string') {
        throw new TypeError('Arguments to path.join must be strings');
      }
      return p;
    }).join('/'));
  }


  // path.relative(from, to)
  // posix version
  function relative(from, to) {
    from = resolve(from).substr(1);
    to = resolve(to).substr(1);

    function trim(arr) {
      var start = 0;
      for (; start < arr.length; start++) {
        if (arr[start] !== '') break;
      }

      var end = arr.length - 1;
      for (; end >= 0; end--) {
        if (arr[end] !== '') break;
      }

      if (start > end) return [];
      return arr.slice(start, end - start + 1);
    }

    var fromParts = trim(from.split('/'));
    var toParts = trim(to.split('/'));

    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
    }

    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push('..');
    }

    outputParts = outputParts.concat(toParts.slice(samePartsLength));

    return outputParts.join('/');
  }

  var sep = '/';
  var delimiter = ':';

  function dirname(path) {
    var result = splitPath(path),
        root = result[0],
        dir = result[1];

    if (!root && !dir) {
      // No dirname whatsoever
      return '.';
    }

    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.substr(0, dir.length - 1);
    }

    return root + dir;
  }

  function basename(path, ext) {
    var f = splitPath(path)[2];
    // TODO: make this comparison case-insensitive on windows?
    if (ext && f.substr(-1 * ext.length) === ext) {
      f = f.substr(0, f.length - ext.length);
    }
    return f;
  }


  function extname(path) {
    return splitPath(path)[3];
  }
  var _polyfillNode_path = {
    extname: extname,
    basename: basename,
    dirname: dirname,
    sep: sep,
    delimiter: delimiter,
    relative: relative,
    join: join,
    isAbsolute: isAbsolute,
    normalize: normalize,
    resolve: resolve
  };
  function filter (xs, f) {
      if (xs.filter) return xs.filter(f);
      var res = [];
      for (var i = 0; i < xs.length; i++) {
          if (f(xs[i], i, xs)) res.push(xs[i]);
      }
      return res;
  }

  // String.prototype.substr - negative index don't work in IE8
  var substr = 'ab'.substr(-1) === 'b' ?
      function (str, start, len) { return str.substr(start, len) } :
      function (str, start, len) {
          if (start < 0) start = str.length + start;
          return str.substr(start, len);
      }
  ;

  var _polyfillNode_path$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    resolve: resolve,
    normalize: normalize,
    isAbsolute: isAbsolute,
    join: join,
    relative: relative,
    sep: sep,
    delimiter: delimiter,
    dirname: dirname,
    basename: basename,
    extname: extname,
    'default': _polyfillNode_path
  });

  var require$$0 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_path$1);

  var _polyfillNode_fs = {};

  var _polyfillNode_fs$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': _polyfillNode_fs
  });

  var require$$1 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_fs$1);

  var hasRequiredEdgeFel;

  function requireEdgeFel () {
  	if (hasRequiredEdgeFel) return edgeFel.exports;
  	hasRequiredEdgeFel = 1;
  	(function (module, exports) {
  		var Module = (() => {
  		  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  		  if (typeof __filename !== 'undefined') _scriptDir = _scriptDir || __filename;
  		  return (
  		function(Module) {
  		  Module = Module || {};

  		var Module=typeof Module!="undefined"?Module:{};var readyPromiseResolve,readyPromiseReject;Module["ready"]=new Promise(function(resolve,reject){readyPromiseResolve=resolve;readyPromiseReject=reject;});var moduleOverrides=Object.assign({},Module);var ENVIRONMENT_IS_WEB=typeof window=="object";var ENVIRONMENT_IS_WORKER=typeof importScripts=="function";var ENVIRONMENT_IS_NODE=typeof process=="object"&&typeof process.versions=="object"&&typeof process.versions.node=="string";var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var read_,readAsync,readBinary;var fs;var nodePath;var requireNodeFS;if(ENVIRONMENT_IS_NODE){if(ENVIRONMENT_IS_WORKER){scriptDirectory=require$$0.dirname(scriptDirectory)+"/";}else {scriptDirectory=__dirname+"/";}requireNodeFS=()=>{if(!nodePath){fs=require$$1;nodePath=require$$0;}};read_=function shell_read(filename,binary){var ret=tryParseAsDataURI(filename);if(ret){return binary?ret:ret.toString()}requireNodeFS();filename=nodePath["normalize"](filename);return fs.readFileSync(filename,binary?undefined:"utf8")};readBinary=filename=>{var ret=read_(filename,true);if(!ret.buffer){ret=new Uint8Array(ret);}return ret};readAsync=(filename,onload,onerror)=>{var ret=tryParseAsDataURI(filename);if(ret){onload(ret);}requireNodeFS();filename=nodePath["normalize"](filename);fs.readFile(filename,function(err,data){if(err)onerror(err);else onload(data.buffer);});};if(process["argv"].length>1){process["argv"][1].replace(/\\/g,"/");}process["argv"].slice(2);process["on"]("uncaughtException",function(ex){if(!(ex instanceof ExitStatus)){throw ex}});process["on"]("unhandledRejection",function(reason){throw reason});Module["inspect"]=function(){return "[Emscripten Module object]"};}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){if(ENVIRONMENT_IS_WORKER){scriptDirectory=self.location.href;}else if(typeof document!="undefined"&&document.currentScript){scriptDirectory=document.currentScript.src;}if(_scriptDir){scriptDirectory=_scriptDir;}if(scriptDirectory.indexOf("blob:")!==0){scriptDirectory=scriptDirectory.substr(0,scriptDirectory.replace(/[?#].*/,"").lastIndexOf("/")+1);}else {scriptDirectory="";}{read_=url=>{try{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.send(null);return xhr.responseText}catch(err){var data=tryParseAsDataURI(url);if(data){return intArrayToString(data)}throw err}};if(ENVIRONMENT_IS_WORKER){readBinary=url=>{try{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}catch(err){var data=tryParseAsDataURI(url);if(data){return data}throw err}};}readAsync=(url,onload,onerror)=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=()=>{if(xhr.status==200||xhr.status==0&&xhr.response){onload(xhr.response);return}var data=tryParseAsDataURI(url);if(data){onload(data.buffer);return}onerror();};xhr.onerror=onerror;xhr.send(null);};}}else;Module["print"]||console.log.bind(console);var err=Module["printErr"]||console.warn.bind(console);Object.assign(Module,moduleOverrides);moduleOverrides=null;if(Module["arguments"])Module["arguments"];if(Module["thisProgram"])Module["thisProgram"];if(Module["quit"])Module["quit"];var wasmBinary;if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];Module["noExitRuntime"]||true;if(typeof WebAssembly!="object"){abort("no native wasm support detected");}var wasmMemory;var ABORT=false;function assert(condition,text){if(!condition){abort(text);}}var UTF8Decoder=typeof TextDecoder!="undefined"?new TextDecoder("utf8"):undefined;function UTF8ArrayToString(heapOrArray,idx,maxBytesToRead){var endIdx=idx+maxBytesToRead;var endPtr=idx;while(heapOrArray[endPtr]&&!(endPtr>=endIdx))++endPtr;if(endPtr-idx>16&&heapOrArray.buffer&&UTF8Decoder){return UTF8Decoder.decode(heapOrArray.subarray(idx,endPtr))}else {var str="";while(idx<endPtr){var u0=heapOrArray[idx++];if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=heapOrArray[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=heapOrArray[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2;}else {u0=(u0&7)<<18|u1<<12|u2<<6|heapOrArray[idx++]&63;}if(u0<65536){str+=String.fromCharCode(u0);}else {var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023);}}}return str}function UTF8ToString(ptr,maxBytesToRead){return ptr?UTF8ArrayToString(HEAPU8,ptr,maxBytesToRead):""}function stringToUTF8Array(str,heap,outIdx,maxBytesToWrite){if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343){var u1=str.charCodeAt(++i);u=65536+((u&1023)<<10)|u1&1023;}if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u;}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63;}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;}else {if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;}}heap[outIdx]=0;return outIdx-startIdx}function stringToUTF8(str,outPtr,maxBytesToWrite){return stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite)}function lengthBytesUTF8(str){var len=0;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127)++len;else if(u<=2047)len+=2;else if(u<=65535)len+=3;else len+=4;}return len}var UTF16Decoder=typeof TextDecoder!="undefined"?new TextDecoder("utf-16le"):undefined;function UTF16ToString(ptr,maxBytesToRead){var endPtr=ptr;var idx=endPtr>>1;var maxIdx=idx+maxBytesToRead/2;while(!(idx>=maxIdx)&&HEAPU16[idx])++idx;endPtr=idx<<1;if(endPtr-ptr>32&&UTF16Decoder){return UTF16Decoder.decode(HEAPU8.subarray(ptr,endPtr))}else {var str="";for(var i=0;!(i>=maxBytesToRead/2);++i){var codeUnit=HEAP16[ptr+i*2>>1];if(codeUnit==0)break;str+=String.fromCharCode(codeUnit);}return str}}function stringToUTF16(str,outPtr,maxBytesToWrite){if(maxBytesToWrite===undefined){maxBytesToWrite=2147483647;}if(maxBytesToWrite<2)return 0;maxBytesToWrite-=2;var startPtr=outPtr;var numCharsToWrite=maxBytesToWrite<str.length*2?maxBytesToWrite/2:str.length;for(var i=0;i<numCharsToWrite;++i){var codeUnit=str.charCodeAt(i);HEAP16[outPtr>>1]=codeUnit;outPtr+=2;}HEAP16[outPtr>>1]=0;return outPtr-startPtr}function lengthBytesUTF16(str){return str.length*2}function UTF32ToString(ptr,maxBytesToRead){var i=0;var str="";while(!(i>=maxBytesToRead/4)){var utf32=HEAP32[ptr+i*4>>2];if(utf32==0)break;++i;if(utf32>=65536){var ch=utf32-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023);}else {str+=String.fromCharCode(utf32);}}return str}function stringToUTF32(str,outPtr,maxBytesToWrite){if(maxBytesToWrite===undefined){maxBytesToWrite=2147483647;}if(maxBytesToWrite<4)return 0;var startPtr=outPtr;var endPtr=startPtr+maxBytesToWrite-4;for(var i=0;i<str.length;++i){var codeUnit=str.charCodeAt(i);if(codeUnit>=55296&&codeUnit<=57343){var trailSurrogate=str.charCodeAt(++i);codeUnit=65536+((codeUnit&1023)<<10)|trailSurrogate&1023;}HEAP32[outPtr>>2]=codeUnit;outPtr+=4;if(outPtr+4>endPtr)break}HEAP32[outPtr>>2]=0;return outPtr-startPtr}function lengthBytesUTF32(str){var len=0;for(var i=0;i<str.length;++i){var codeUnit=str.charCodeAt(i);if(codeUnit>=55296&&codeUnit<=57343)++i;len+=4;}return len}var buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;function updateGlobalBufferAndViews(buf){buffer=buf;Module["HEAP8"]=HEAP8=new Int8Array(buf);Module["HEAP16"]=HEAP16=new Int16Array(buf);Module["HEAP32"]=HEAP32=new Int32Array(buf);Module["HEAPU8"]=HEAPU8=new Uint8Array(buf);Module["HEAPU16"]=HEAPU16=new Uint16Array(buf);Module["HEAPU32"]=HEAPU32=new Uint32Array(buf);Module["HEAPF32"]=HEAPF32=new Float32Array(buf);Module["HEAPF64"]=HEAPF64=new Float64Array(buf);}Module["INITIAL_MEMORY"]||16777216;var wasmTable;var __ATPRERUN__=[];var __ATINIT__=[];var __ATPOSTRUN__=[];function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift());}}callRuntimeCallbacks(__ATPRERUN__);}function initRuntime(){callRuntimeCallbacks(__ATINIT__);}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift());}}callRuntimeCallbacks(__ATPOSTRUN__);}function addOnPreRun(cb){__ATPRERUN__.unshift(cb);}function addOnInit(cb){__ATINIT__.unshift(cb);}function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb);}var runDependencies=0;var dependenciesFulfilled=null;function addRunDependency(id){runDependencies++;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies);}}function removeRunDependency(id){runDependencies--;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies);}if(runDependencies==0){if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback();}}}function abort(what){{if(Module["onAbort"]){Module["onAbort"](what);}}what="Aborted("+what+")";err(what);ABORT=true;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);readyPromiseReject(e);throw e}var dataURIPrefix="data:application/octet-stream;base64,";function isDataURI(filename){return filename.startsWith(dataURIPrefix)}function isFileURI(filename){return filename.startsWith("file://")}var wasmBinaryFile;wasmBinaryFile="data:application/octet-stream;base64,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ayICSQ0BDAILCxAcAAsgDCAIspUhDAsgBkEQaiQAIAEoAgAiAARAIAEgADYCBCAAEBQLIAFBEGokACAMDAELEBsACyEMIAQsAJsBQQBIBEAgBCgCkAEQFAsgBCwAiwFBAE4NAiAEQYABagwBCwJAIAEoAgQgAS0ACyIAIABBGHRBGHVBAEgbQQ9HDQBBACEAIAFBvxBBDxAkDQAgBEEgEBUiBTYCkAEgBEKVgICAgISAgIB/NwKUASAFQQA6ABUgBUHnCykAADcADSAFQeILKQAANwAIIAVB2gspAAA3AAACQCADIARBkAFqEB0gA0EEaiIFRg0AIARBIBAVIgY2AnAgBEKVgICAgISAgIB/NwJ0IAZBADoAFSAGQZ8MKQAANwANIAZBmgwpAAA3AAggBkGSDCkAADcAACADIARB8ABqEB0gBUcEQCAEQSAQFSIANgJgIARClICAgICEgICAfzcCZCAAQQA6ABQgAEHDCygAADYAECAAQbsLKQAANwAIIABBswspAAA3AAAgAyAEQeAAahAdIQAgBCwAa0EASARAIAQoAmAQFAsgACAFRyEACyAELAB7QQBODQAgBCgCcBAUCyAELACbAUEASARAIAQoApABEBQLIABFDQACQCABLAALQQBOBEAgBCABKAIINgJYIAQgASkCADcDUAwBCyAEQdAAaiABKAIAIAEoAgQQFgsgBEEgEBUiADYCkAEgBEKVgICAgISAgIB/NwKUASAAQQA6ABUgAEHnCykAADcADSAAQeILKQAANwAIIABB2gspAAA3AAAgAyAEQZABahAaKgIAIQ8gBEEgEBUiADYCcCAEQpWAgICAhICAgH83AnQgAEEAOgAVIABBnwwpAAA3AA0gAEGaDCkAADcACCAAQZIMKQAANwAAIAMgBEHwAGoQGioCACEMIARBIBAVIgA2AmAgBEKUgICAgISAgIB/NwJkIABBADoAFCAAQcMLKAAANgAQIABBuwspAAA3AAggAEGzCykAADcAAAJ9IAMgBEHgAGoQGioCACEOIwBBEGsiACQAIABBADYCCCAAQgA3AwACQCACKAIEIgEgAigCACICRwRAIAEgAmsiA0EASA0BIAAgAxAVIgE2AgAgACABIANBAnVBAnRqNgIIIAAgASACIAMQGSADajYCBAsCfSAAIQICfyAOi0MAAABPXQRAIA6o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JAAgCiwAC0EASARAIAooAgAQFAsgBCwAC0EATg0BIAQLKAIAEBQLIARBsAFqJAAgDAuOAQICfQF/IwBBEGsiACQAIABBADoABCAAQe3KhfMGNgIAIABBBDoACyAAIAAgAhAlIQMgACwAC0EASARAIAAoAgAQFAsgAigCACIFIAIoAgQiAkcEQCAFIQEDQCAEIAEqAgAgA5OLkiEEIAFBBGoiASACRw0ACwsgBCACIAVrQQJ1s5UhAyAAQRBqJAAgAwuAAwEHfwJAAkACQCAAKAIEIgMgACgCACIFa0EMbSIHQQFqIgJB1qrVqgFJBEAgACgCCCAFa0EMbSIGQQF0IgggAiACIAhJG0HVqtWqASAGQarVqtUASRsiAgRAIAJB1qrVqgFPDQIgAkEMbBAVIQQLIAJBDGwhBiAEIAdBDGxqIQICQCABLAALQQBOBEAgAiABKQIANwIAIAIgASgCCDYCCAwBCyACIAEoAgAgASgCBBAWIAAoAgQhAyAAKAIAIQULIAQgBmohASACQQxqIQQgAyAFRg0CA0AgAkEMayICIANBDGsiAykCADcCACACIAMoAgg2AgggA0IANwIAIANBADYCCCADIAVHDQALIAAgATYCCCAAKAIEIQEgACAENgIEIAAoAgAhAyAAIAI2AgAgASADRg0DA0AgAUEMayIBLAALQQBIBEAgASgCABAUCyABIANHDQALDAMLEBsACxAgAAsgACABNgIIIAAgBDYCBCAAIAI2AgALIAMEQCADEBQLCx4AQQgQByAAEFYiAEGYjwE2AgAgAEG4jwFBARAGAAs3AQF/IwBBEGsiAyQAIANBCGogASACIAAoAgARAQAgAygCCBAKIAMoAggiABAJIANBEGokACAACxgBAX9BDBAVIgBBADYCCCAAQgA3AgAgAAscACAAIAFBCCACpyACQiCIpyADpyADQiCIpxAPCzIBAn8gAEHojgE2AgAgACgCBEEMayIBIAEoAghBAWsiAjYCCCACQQBIBEAgARAUCyAAC5oBACAAQQE6ADUCQCAAKAIEIAJHDQAgAEEBOgA0AkAgACgCECICRQRAIABBATYCJCAAIAM2AhggACABNgIQIANBAUcNAiAAKAIwQQFGDQEMAgsgASACRgRAIAAoAhgiAkECRgRAIAAgAzYCGCADIQILIAAoAjBBAUcNAiACQQFG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CjYCACACIAFBkQkgABAYIABBADYCBCAAQQs2AgAgAiABQYkJIAAQGCAAQQA2AgQgAEEMNgIAIAIgAUGoDCAAEBggAEEANgIEIABBDTYCACACIAFBgAggABAYIABBADYCBCAAQQ42AgAgAiABQZkKIAAQGCAAQQA2AgQgAEEPNgIAIAIgAUGQCiAAEBggAEEANgIEIABBEDYCACACIAFBhQogABAYIABBADYCBCAAQRE2AgAgAiABQcEIIAAQGCAAQQA2AgQgAEESNgIAIAIgAUGSCCAAEBggAEEANgIEIABBEzYCACACIAFBiw0gABAYIABBADYCBCAAQRQ2AgAgAiABQbAIIAAQGCAAQQA2AgQgAEEVNgIAIAIgAUH6DCAAEBggAEEANgIEIABBFjYCACACIAFBmgggABAYIABBADYCBCAAQRc2AgAgAiABQeQMIAAQGCAAQQA2AgQgAEEYNgIAIAIgAUHZCiAAEBggAEEANgIEIABBGTYCACACIAFB+QogABAYIABBADYCBCAAQRo2AgAgAiABQYYLIAAQGCAAQQA2AgQgAEEbNgIAIAIgAUHtDSAAEBggAEEANgIEIABBHDYCACACIAFBqAkgABAYIABBADYCBCAAQR02AgAgAiABQacNIAAQGCAAQQA2AgQgAEEeNgIAIAIgAUGWDSAAEBggAEEANgIEIABBHzYCACACIAFBlxAgABAYIABBADYCBCAAQSA2AgAgAiABQdYQIAAQGCAAQQA2AgQgAEEhNgIAIAIgAUG0CiAAEBggAEEANgIEIABBIjYCACACIAFBogogABAYIABBEGokACABCxQAIAAEQCAAIAAoAgQQOiAAEBQLCw8AQZiQAUGckAEoAgAQKAsFAEHoHwsHACAAKAIEC04AIwBBEGsiASQAIAFBAzoACyABQQA6AAMgAUHQCS8AADsBACABQdIJLQAAOgACIAAgAhBeIAEsAAtBAEgEQCABKAIAEBQLIAFBEGokAAsFAEHGDgsFAEGLEQsFAEHFDAsWACAARQRAQQAPCyAAQZyJARAfQQBHCxoAIAAgASgCCCAFEB4EQCABIAIgAyAEEFALCzcAIAAgASgCCCAFEB4EQCABIAIgAyAEEFAPCyAAKAIIIgAgASACIAMgBCAFIAAoAgAoAhQRCgALpwEAIAAgASgCCCAEEB4EQAJAIAEo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MBAUCyABLABLQQBIBEAgASgCQBAUCyABLABbQQBIBEAgASgCUBAUCyABLAALQQBODQEgASgCABAUDAELIABBADYCCCAAQgA3AgALIAFB4ABqJAALJAECfyAAKAIEIgAQMEEBaiIBEDQiAgR/IAIgACABEBkFQQALCwvHhQGHAQBBgAgLkBBhYnNfZW5lcmd5AG1lYW5fbl9hYnNfbWF4AGZpcnN0X2xvY2F0aW9uX29mX21heABsYXN0X2xvY2F0aW9uX29mX21heABjb3VudF9iZWxvd194AGNvdW50X2Fib3ZlX3gAY291bnRfYmVsb3cAbWVkaWFuX2Fic19kZXYAbWVhbl9hYnNfZGV2AGF2Z19kZXYAc3RkX2RldgB1bnNpZ25lZCBzaG9ydABub25femVyb19jb3VudAByYW5nZV9jb3VudAB1bnNpZ25lZCBpbnQAZmZ0AHNldABnZXQAdmVjdG9yZmxvYXQAbWFwc3RyaW5nZmxvYXQAdWludDY0X3QAa2V5cwB6ZXJvX2Nyb3NzAHNrZXduZXNzAGt1cnRvc2lzAHBvc2l0aXZlX3R1cm5pbmdzAG5lZ2F0aXZlX3R1cm5pbmdzAG1lZGlhbl9hYnNfY2hhbmdlcwBtZWFuX2Fic19jaGFuZ2VzAG1lZGlhbl9jaGFuZ2VzAG1lYW5fY2hhbmdlcwBhYnNfc3VtX29mX2NoYW5nZXMAbWVhbl9nZW9tZXRyaWNfYWJzAHZlY3RvcgBjaGFuZ2VfcXVhbnRpbGVfYWdncgByYW5nZV9jb3VudF9sb3dlcgBjaGFuZ2VfcXVhbnRpbGVfbG93ZXIAbWZjY19udW1fZmlsdGVyAHJhbmdlX2NvdW50X3VwcGVyAGNoYW5nZV9xdWFudGlsZV91cHBlcgB2YXIAdW5zaWduZWQgY2hhcgBxdWFudGlsZV9xAHN0ZDo6ZXhjZXB0aW9uAGF1dG9jb3JyZWxhdGlvbgBmaXJzdF9sb2NhdGlvbl9vZl9taW4AbGFzdF9sb2NhdGlvbl9vZl9taW4AbWVkaWFuAGNvdW50X2JlbG93X21lYW4AY291bnRfYWJvdmVfbWVhbgBtZWFuX25fYWJzX21heF9uAGxwY19hdXRvX24AbHBjY19hdXRvX24AbHBjX24AbHBjY19uAHN1bQBleHRyYWN0U3BlY3RydW0AbWZjY19tAGJvb2wAZXh0cmFjdEFsbABlbXNjcmlwdGVuOjp2YWwAZXh0cmFjdE9uZVZlY3RvcmlhbABwdXNoX2JhY2sAYmFkX2FycmF5X25ld19sZW5ndGgAbHBjY19jZXBfbGVuZ3RoAHVuc2lnbmVkIGxvbmcAc3RkOjp3c3RyaW5nAHZlY3RvcnN0cmluZwBiYXNpY19zdHJpbmcAc3RkOjpzdHJpbmcAc3RkOjp1MTZzdHJpbmcAc3RkOjp1MzJzdHJpbmcAYXV0b2NvcnJlbGF0aW9uX2xhZwByZXNpemUAY291bnRfYWJvdmUAbWZjY19zYW1wbGluZ19yYXRlAEV4dHJhY3Rpb25EZWxlZ2F0ZQByb290X21lYW5fc3F1YXJlAGV4dHJhY3RPbmUAZXh0cmFjdFNvbWUAY2hhbmdlX3F1YW50aWxlAGRvdWJsZQBpbnRlcnF1YXJ0aWxlX3JhbmdlAG1hcDo6YXQ6ICBrZXkgbm90IGZvdW5kAHZvaWQAbHBjAHN0ZDo6YmFkX2FsbG9jAGxwY2MAbWZjYwBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxzaG9ydD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgc2hvcnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgaW50PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxmbG9hdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDhfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGNoYXI+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIGNoYXI+AHN0ZDo6YmFzaWNfc3RyaW5nPHVuc2lnbmVkIGNoYXI+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHNpZ25lZCBjaGFyPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxsb25nPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBsb25nPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxkb3VibGU+AE5TdDNfXzI2dmVjdG9ySWZOU185YWxsb2NhdG9ySWZFRUVFADBGAAAECwAAUE5TdDNfXzI2dmVjdG9ySWZOU185YWxsb2NhdG9ySWZFRUVFAAAAALRGAAAwCwAAAAAAACgLAABQS05TdDNfXzI2dmVjdG9ySWZOU185YWxsb2NhdG9ySWZFRUVFAAAAtEYAAGgLAAABAAAAKAsAAGlpAHYAdmkAWAsAAGxFAABYCwAAFEYAAHZpaWYAAAAAbEUAAFgLAADwRQAAFEYAAHZpaWlmAAAA8EUAAJALAABpaWkABAwAACgLAADwRQAATjEwZW1zY3JpcHRlbjN2YWxFAAAwRgAA8AsAAGlpaWkAQaAYC6ADhEUAACgLAADwRQAAFEYAAGlpaWlmAE5TdDNfXzI2dmVjdG9ySU5TXzEyYmFzaWNfc3RyaW5nSWNOU18xMWNoYXJfdHJhaXRzSWNFRU5TXzlhbGxvY2F0b3JJY0VFRUVOUzRfSVM2X0VFRUUAMEYAADYMAABQTlN0M19fMjZ2ZWN0b3JJTlNfMTJiYXNpY19zdHJpbmdJY05TXzExY2hhcl90cmFpdHNJY0VFTlNfOWFsbG9jYXRvckljRUVFRU5TNF9JUzZfRUVFRQAAtEYAAJQMAAAAAAAAjAwAAFBLTlN0M19fMjZ2ZWN0b3JJTlNfMTJiYXNpY19zdHJpbmdJY05TXzExY2hhcl90cmFpdHNJY0VFTlNfOWFsbG9jYXRvckljRUVFRU5TNF9JUzZfRUVFRQC0RgAA/AwAAAEAAACMDAAA7AwAAGxFAADsDAAAtA0AAE5TdDNfXzIxMmJhc2ljX3N0cmluZ0ljTlNfMTFjaGFyX3RyYWl0c0ljRUVOU185YWxsb2NhdG9ySWNFRUVFAAAwRgAAdA0AAHZpaWkAQdAbC9IFbEUAAOwMAADwRQAAtA0AAHZpaWlpAAAA8EUAAFQNAAAEDAAAjAwAAPBFAAAAAAAAhEUAAIwMAADwRQAAtA0AAGlpaWlpAE5TdDNfXzIzbWFwSU5TXzEyYmFzaWNfc3RyaW5nSWNOU18xMWNoYXJfdHJhaXRzSWNFRU5TXzlhbGxvY2F0b3JJY0VFRUVmTlNfNGxlc3NJUzZfRUVOUzRfSU5TXzRwYWlySUtTNl9mRUVFRUVFAAAAADBGAAAWDgAAUE5TdDNfXzIzbWFwSU5TXzEyYmFzaWNfc3RyaW5nSWNOU18xMWNoYXJfdHJhaXRzSWNFRU5TXzlhbGxvY2F0b3JJY0VFRUVmTlNfNGxlc3NJUzZfRUVOUzRfSU5TXzRwYWlySUtTNl9mRUVFRUVFALRGAACQDgAAAAAAAIgOAABQS05TdDNfXzIzbWFwSU5TXzEyYmFzaWNfc3RyaW5nSWNOU18xMWNoYXJfdHJhaXRzSWNFRU5TXzlhbGxvY2F0b3JJY0VFRUVmTlNfNGxlc3NJUzZfRUVOUzRfSU5TXzRwYWlySUtTNl9mRUVFRUVFAAAAALRGAAAQDwAAAQAAAIgOAAAADwAA8EUAAIQPAAAEDAAAiA4AALQNAAAAAAAAbEUAAIgOAAC0DQAAFEYAAAAAAACMDAAAiA4AAE4yZWQxOEV4dHJhY3Rpb25EZWxlZ2F0ZUUAAAAwRgAAzA8AAFBOMmVkMThFeHRyYWN0aW9uRGVsZWdhdGVFAAC0RgAA8A8AAAAAAADoDwAAUEtOMmVkMThFeHRyYWN0aW9uRGVsZWdhdGVFALRGAAAcEAAAAQAAAOgPAAAMEAAAAAAAABRGAAAMEAAAtA0AACgLAACIDgAAZmlpaWlpAAAAAAAAKAsAAAwQAAC0DQAAKAsAAIgOAABpaWlpaWkAAAAAAACIDgAADBAAAIwMAAAoCwAAiA4AQbAhC5cciA4AAAwQAAAoCwAAiA4AAAQRAAAMEAAAKAsAAE5TdDNfXzI2dmVjdG9ySU4yY28xMG15X2NvbXBsZXhFTlNfOWFsbG9jYXRvcklTMl9FRUVFAAAAMEYAAMwQAABOU3QzX18yMTJiYXNpY19zdHJpbmdJaE5TXzExY2hhcl90cmFpdHNJaEVFTlNfOWFsbG9jYXRvckloRUVFRQAAMEYAAAwRAABOU3QzX18yMTJiYXNpY19zdHJpbmdJd05TXzExY2hhcl90cmFpdHNJd0VFTlNfOWFsbG9jYXRvckl3RUVFRQAAMEYAAFQRAABOU3QzX18yMTJiYXNpY19zdHJpbmdJRHNOU18xMWNoYXJfdHJhaXRzSURzRUVOU185YWxsb2NhdG9ySURzRUVFRQAAADBGAACcEQAATlN0M19fMjEyYmFzaWNfc3RyaW5nSURpTlNfMTFjaGFyX3RyYWl0c0lEaUVFTlNfOWFsbG9jYXRvcklEaUVFRUUAAAAwRgAA6BEAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWNFRQAAMEYAADQSAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lhRUUAADBGAABcEgAATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJaEVFAAAwRgAAhBIAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SXNFRQAAMEYAAKwSAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0l0RUUAADBGAADUEgAATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJaUVFAAAwRgAA/BIAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWpFRQAAMEYAACQTAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lsRUUAADBGAABMEwAATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJbUVFAAAwRgAAdBMAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWZFRQAAMEYAAJwTAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lkRUUAADBGAADEEwAAAAAAAAMAAAAEAAAABAAAAAYAAACD+aIARE5uAPwpFQDRVycA3TT1AGLbwAA8mZUAQZBDAGNR/gC73qsAt2HFADpuJADSTUIASQbgAAnqLgAcktEA6x3+ACmxHADoPqcA9TWCAES7LgCc6YQAtCZwAEF+XwDWkTkAU4M5AJz0OQCLX4QAKPm9APgfOwDe/5cAD5gFABEv7wAKWosAbR9tAM9+NgAJyycARk+3AJ5mPwAt6l8Auid1AOXrxwA9e/EA9zkHAJJSigD7a+oAH7FfAAhdjQAwA1YAe/xGAPCrawAgvM8ANvSaAOOpHQBeYZEACBvmAIWZZQCgFF8AjUBoAIDY/wAnc00ABgYxAMpWFQDJqHMAe+JgAGuMwAAZxEcAzWfDAAno3ABZgyoAi3bEAKYclgBEr90AGVfR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";if(!isDataURI(wasmBinaryFile)){wasmBinaryFile=locateFile(wasmBinaryFile);}function getBinary(file){try{if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}var binary=tryParseAsDataURI(file);if(binary){return binary}if(readBinary){return readBinary(file)}else {throw "both async and sync fetching of the wasm failed"}}catch(err){abort(err);}}function getBinaryPromise(){if(!wasmBinary&&(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER)){if(typeof fetch=="function"&&!isFileURI(wasmBinaryFile)){return fetch(wasmBinaryFile,{credentials:"same-origin"}).then(function(response){if(!response["ok"]){throw "failed to load wasm binary file at '"+wasmBinaryFile+"'"}return response["arrayBuffer"]()}).catch(function(){return getBinary(wasmBinaryFile)})}else {if(readAsync){return new Promise(function(resolve,reject){readAsync(wasmBinaryFile,function(response){resolve(new Uint8Array(response));},reject);})}}}return Promise.resolve().then(function(){return getBinary(wasmBinaryFile)})}function createWasm(){var info={"a":asmLibraryArg};function receiveInstance(instance,module){var exports=instance.exports;Module["asm"]=exports;wasmMemory=Module["asm"]["u"];updateGlobalBufferAndViews(wasmMemory.buffer);wasmTable=Module["asm"]["x"];addOnInit(Module["asm"]["v"]);removeRunDependency();}addRunDependency();function receiveInstantiationResult(result){receiveInstance(result["instance"]);}function instantiateArrayBuffer(receiver){return getBinaryPromise().then(function(binary){return WebAssembly.instantiate(binary,info)}).then(function(instance){return instance}).then(receiver,function(reason){err("failed to asynchronously prepare wasm: "+reason);abort(reason);})}function instantiateAsync(){if(!wasmBinary&&typeof WebAssembly.instantiateStreaming=="function"&&!isDataURI(wasmBinaryFile)&&!isFileURI(wasmBinaryFile)&&!ENVIRONMENT_IS_NODE&&typeof fetch=="function"){return fetch(wasmBinaryFile,{credentials:"same-origin"}).then(function(response){var result=WebAssembly.instantiateStreaming(response,info);return result.then(receiveInstantiationResult,function(reason){err("wasm streaming compile failed: "+reason);err("falling back to ArrayBuffer instantiation");return instantiateArrayBuffer(receiveInstantiationResult)})})}else {return instantiateArrayBuffer(receiveInstantiationResult)}}if(Module["instantiateWasm"]){try{var exports=Module["instantiateWasm"](info,receiveInstance);return exports}catch(e){err("Module.instantiateWasm callback failed with error: "+e);return false}}instantiateAsync().catch(readyPromiseReject);return {}}function callRuntimeCallbacks(callbacks){while(callbacks.length>0){var callback=callbacks.shift();if(typeof callback=="function"){callback(Module);continue}var func=callback.func;if(typeof func=="number"){if(callback.arg===undefined){getWasmTableEntry(func)();}else {getWasmTableEntry(func)(callback.arg);}}else {func(callback.arg===undefined?null:callback.arg);}}}var wasmTableMirror=[];function getWasmTableEntry(funcPtr){var func=wasmTableMirror[funcPtr];if(!func){if(funcPtr>=wasmTableMirror.length)wasmTableMirror.length=funcPtr+1;wasmTableMirror[funcPtr]=func=wasmTable.get(funcPtr);}return func}function ___cxa_allocate_exception(size){return _malloc(size+24)+24}function ExceptionInfo(excPtr){this.excPtr=excPtr;this.ptr=excPtr-24;this.set_type=function(type){HEAPU32[this.ptr+4>>2]=type;};this.get_type=function(){return HEAPU32[this.ptr+4>>2]};this.set_destructor=function(destructor){HEAPU32[this.ptr+8>>2]=destructor;};this.get_destructor=function(){return HEAPU32[this.ptr+8>>2]};this.set_refcount=function(refcount){HEAP32[this.ptr>>2]=refcount;};this.set_caught=function(caught){caught=caught?1:0;HEAP8[this.ptr+12>>0]=caught;};this.get_caught=function(){return HEAP8[this.ptr+12>>0]!=0};this.set_rethrown=function(rethrown){rethrown=rethrown?1:0;HEAP8[this.ptr+13>>0]=rethrown;};this.get_rethrown=function(){return HEAP8[this.ptr+13>>0]!=0};this.init=function(type,destructor){this.set_adjusted_ptr(0);this.set_type(type);this.set_destructor(destructor);this.set_refcount(0);this.set_caught(false);this.set_rethrown(false);};this.add_ref=function(){var value=HEAP32[this.ptr>>2];HEAP32[this.ptr>>2]=value+1;};this.release_ref=function(){var prev=HEAP32[this.ptr>>2];HEAP32[this.ptr>>2]=prev-1;return prev===1};this.set_adjusted_ptr=function(adjustedPtr){HEAPU32[this.ptr+16>>2]=adjustedPtr;};this.get_adjusted_ptr=function(){return HEAPU32[this.ptr+16>>2]};this.get_exception_ptr=function(){var isPointer=___cxa_is_pointer_type(this.get_type());if(isPointer){return HEAPU32[this.excPtr>>2]}var adjusted=this.get_adjusted_ptr();if(adjusted!==0)return adjusted;return this.excPtr};}function ___cxa_throw(ptr,type,destructor){var info=new ExceptionInfo(ptr);info.init(type,destructor);throw ptr}function __embind_register_bigint(primitiveType,name,size,minRange,maxRange){}function getShiftFromSize(size){switch(size){case 1:return 0;case 2:return 1;case 4:return 2;case 8:return 3;default:throw new TypeError("Unknown type size: "+size)}}function embind_init_charCodes(){var codes=new Array(256);for(var i=0;i<256;++i){codes[i]=String.fromCharCode(i);}embind_charCodes=codes;}var embind_charCodes=undefined;function readLatin1String(ptr){var ret="";var c=ptr;while(HEAPU8[c]){ret+=embind_charCodes[HEAPU8[c++]];}return ret}var awaitingDependencies={};var registeredTypes={};var typeDependencies={};var char_0=48;var char_9=57;function makeLegalFunctionName(name){if(undefined===name){return "_unknown"}name=name.replace(/[^a-zA-Z0-9_]/g,"$");var f=name.charCodeAt(0);if(f>=char_0&&f<=char_9){return "_"+name}return name}function createNamedFunction(name,body){name=makeLegalFunctionName(name);return new Function("body","return function "+name+"() {\n"+'    "use strict";'+"    return body.apply(this, arguments);\n"+"};\n")(body)}function extendError(baseErrorType,errorName){var errorClass=createNamedFunction(errorName,function(message){this.name=errorName;this.message=message;var stack=new Error(message).stack;if(stack!==undefined){this.stack=this.toString()+"\n"+stack.replace(/^Error(:[^\n]*)?\n/,"");}});errorClass.prototype=Object.create(baseErrorType.prototype);errorClass.prototype.constructor=errorClass;errorClass.prototype.toString=function(){if(this.message===undefined){return this.name}else {return this.name+": "+this.message}};return errorClass}var BindingError=undefined;function throwBindingError(message){throw new BindingError(message)}var InternalError=undefined;function throwInternalError(message){throw new InternalError(message)}function whenDependentTypesAreResolved(myTypes,dependentTypes,getTypeConverters){myTypes.forEach(function(type){typeDependencies[type]=dependentTypes;});function onComplete(typeConverters){var myTypeConverters=getTypeConverters(typeConverters);if(myTypeConverters.length!==myTypes.length){throwInternalError("Mismatched type converter count");}for(var i=0;i<myTypes.length;++i){registerType(myTypes[i],myTypeConverters[i]);}}var typeConverters=new Array(dependentTypes.length);var unregisteredTypes=[];var registered=0;dependentTypes.forEach((dt,i)=>{if(registeredTypes.hasOwnProperty(dt)){typeConverters[i]=registeredTypes[dt];}else {unregisteredTypes.push(dt);if(!awaitingDependencies.hasOwnProperty(dt)){awaitingDependencies[dt]=[];}awaitingDependencies[dt].push(()=>{typeConverters[i]=registeredTypes[dt];++registered;if(registered===unregisteredTypes.length){onComplete(typeConverters);}});}});if(0===unregisteredTypes.length){onComplete(typeConverters);}}function registerType(rawType,registeredInstance,options={}){if(!("argPackAdvance"in registeredInstance)){throw new TypeError("registerType registeredInstance requires argPackAdvance")}var name=registeredInstance.name;if(!rawType){throwBindingError('type "'+name+'" must have a positive integer typeid pointer');}if(registeredTypes.hasOwnProperty(rawType)){if(options.ignoreDuplicateRegistrations){return}else {throwBindingError("Cannot register type '"+name+"' twice");}}registeredTypes[rawType]=registeredInstance;delete typeDependencies[rawType];if(awaitingDependencies.hasOwnProperty(rawType)){var callbacks=awaitingDependencies[rawType];delete awaitingDependencies[rawType];callbacks.forEach(cb=>cb());}}function __embind_register_bool(rawType,name,size,trueValue,falseValue){var shift=getShiftFromSize(size);name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":function(wt){return !!wt},"toWireType":function(destructors,o){return o?trueValue:falseValue},"argPackAdvance":8,"readValueFromPointer":function(pointer){var heap;if(size===1){heap=HEAP8;}else if(size===2){heap=HEAP16;}else if(size===4){heap=HEAP32;}else {throw new TypeError("Unknown boolean type size: "+name)}return this["fromWireType"](heap[pointer>>shift])},destructorFunction:null});}function ClassHandle_isAliasOf(other){if(!(this instanceof ClassHandle)){return false}if(!(other instanceof ClassHandle)){return false}var leftClass=this.$$.ptrType.registeredClass;var left=this.$$.ptr;var rightClass=other.$$.ptrType.registeredClass;var right=other.$$.ptr;while(leftClass.baseClass){left=leftClass.upcast(left);leftClass=leftClass.baseClass;}while(rightClass.baseClass){right=rightClass.upcast(right);rightClass=rightClass.baseClass;}return leftClass===rightClass&&left===right}function shallowCopyInternalPointer(o){return {count:o.count,deleteScheduled:o.deleteScheduled,preservePointerOnDelete:o.preservePointerOnDelete,ptr:o.ptr,ptrType:o.ptrType,smartPtr:o.smartPtr,smartPtrType:o.smartPtrType}}function throwInstanceAlreadyDeleted(obj){function getInstanceTypeName(handle){return handle.$$.ptrType.registeredClass.name}throwBindingError(getInstanceTypeName(obj)+" instance already deleted");}var finalizationRegistry=false;function detachFinalizer(handle){}function runDestructor($$){if($$.smartPtr){$$.smartPtrType.rawDestructor($$.smartPtr);}else {$$.ptrType.registeredClass.rawDestructor($$.ptr);}}function releaseClassHandle($$){$$.count.value-=1;var toDelete=0===$$.count.value;if(toDelete){runDestructor($$);}}function downcastPointer(ptr,ptrClass,desiredClass){if(ptrClass===desiredClass){return ptr}if(undefined===desiredClass.baseClass){return null}var rv=downcastPointer(ptr,ptrClass,desiredClass.baseClass);if(rv===null){return null}return desiredClass.downcast(rv)}var registeredPointers={};function getInheritedInstanceCount(){return Object.keys(registeredInstances).length}function getLiveInheritedInstances(){var rv=[];for(var k in registeredInstances){if(registeredInstances.hasOwnProperty(k)){rv.push(registeredInstances[k]);}}return rv}var deletionQueue=[];function flushPendingDeletes(){while(deletionQueue.length){var obj=deletionQueue.pop();obj.$$.deleteScheduled=false;obj["delete"]();}}var delayFunction=undefined;function setDelayFunction(fn){delayFunction=fn;if(deletionQueue.length&&delayFunction){delayFunction(flushPendingDeletes);}}function init_embind(){Module["getInheritedInstanceCount"]=getInheritedInstanceCount;Module["getLiveInheritedInstances"]=getLiveInheritedInstances;Module["flushPendingDeletes"]=flushPendingDeletes;Module["setDelayFunction"]=setDelayFunction;}var registeredInstances={};function getBasestPointer(class_,ptr){if(ptr===undefined){throwBindingError("ptr should not be undefined");}while(class_.baseClass){ptr=class_.upcast(ptr);class_=class_.baseClass;}return ptr}function getInheritedInstance(class_,ptr){ptr=getBasestPointer(class_,ptr);return registeredInstances[ptr]}function makeClassHandle(prototype,record){if(!record.ptrType||!record.ptr){throwInternalError("makeClassHandle requires ptr and ptrType");}var hasSmartPtrType=!!record.smartPtrType;var hasSmartPtr=!!record.smartPtr;if(hasSmartPtrType!==hasSmartPtr){throwInternalError("Both smartPtrType and smartPtr must be specified");}record.count={value:1};return attachFinalizer(Object.create(prototype,{$$:{value:record}}))}function RegisteredPointer_fromWireType(ptr){var rawPointer=this.getPointee(ptr);if(!rawPointer){this.destructor(ptr);return null}var registeredInstance=getInheritedInstance(this.registeredClass,rawPointer);if(undefined!==registeredInstance){if(0===registeredInstance.$$.count.value){registeredInstance.$$.ptr=rawPointer;registeredInstance.$$.smartPtr=ptr;return registeredInstance["clone"]()}else {var rv=registeredInstance["clone"]();this.destructor(ptr);return rv}}function makeDefaultHandle(){if(this.isSmartPointer){return makeClassHandle(this.registeredClass.instancePrototype,{ptrType:this.pointeeType,ptr:rawPointer,smartPtrType:this,smartPtr:ptr})}else {return makeClassHandle(this.registeredClass.instancePrototype,{ptrType:this,ptr:ptr})}}var actualType=this.registeredClass.getActualType(rawPointer);var registeredPointerRecord=registeredPointers[actualType];if(!registeredPointerRecord){return makeDefaultHandle.call(this)}var toType;if(this.isConst){toType=registeredPointerRecord.constPointerType;}else {toType=registeredPointerRecord.pointerType;}var dp=downcastPointer(rawPointer,this.registeredClass,toType.registeredClass);if(dp===null){return makeDefaultHandle.call(this)}if(this.isSmartPointer){return makeClassHandle(toType.registeredClass.instancePrototype,{ptrType:toType,ptr:dp,smartPtrType:this,smartPtr:ptr})}else {return makeClassHandle(toType.registeredClass.instancePrototype,{ptrType:toType,ptr:dp})}}function attachFinalizer(handle){if("undefined"===typeof FinalizationRegistry){attachFinalizer=handle=>handle;return handle}finalizationRegistry=new FinalizationRegistry(info=>{releaseClassHandle(info.$$);});attachFinalizer=handle=>{var $$=handle.$$;var hasSmartPtr=!!$$.smartPtr;if(hasSmartPtr){var info={$$:$$};finalizationRegistry.register(handle,info,handle);}return handle};detachFinalizer=handle=>finalizationRegistry.unregister(handle);return attachFinalizer(handle)}function ClassHandle_clone(){if(!this.$$.ptr){throwInstanceAlreadyDeleted(this);}if(this.$$.preservePointerOnDelete){this.$$.count.value+=1;return this}else {var clone=attachFinalizer(Object.create(Object.getPrototypeOf(this),{$$:{value:shallowCopyInternalPointer(this.$$)}}));clone.$$.count.value+=1;clone.$$.deleteScheduled=false;return clone}}function ClassHandle_delete(){if(!this.$$.ptr){throwInstanceAlreadyDeleted(this);}if(this.$$.deleteScheduled&&!this.$$.preservePointerOnDelete){throwBindingError("Object already scheduled for deletion");}detachFinalizer(this);releaseClassHandle(this.$$);if(!this.$$.preservePointerOnDelete){this.$$.smartPtr=undefined;this.$$.ptr=undefined;}}function ClassHandle_isDeleted(){return !this.$$.ptr}function ClassHandle_deleteLater(){if(!this.$$.ptr){throwInstanceAlreadyDeleted(this);}if(this.$$.deleteScheduled&&!this.$$.preservePointerOnDelete){throwBindingError("Object already scheduled for deletion");}deletionQueue.push(this);if(deletionQueue.length===1&&delayFunction){delayFunction(flushPendingDeletes);}this.$$.deleteScheduled=true;return this}function init_ClassHandle(){ClassHandle.prototype["isAliasOf"]=ClassHandle_isAliasOf;ClassHandle.prototype["clone"]=ClassHandle_clone;ClassHandle.prototype["delete"]=ClassHandle_delete;ClassHandle.prototype["isDeleted"]=ClassHandle_isDeleted;ClassHandle.prototype["deleteLater"]=ClassHandle_deleteLater;}function ClassHandle(){}function ensureOverloadTable(proto,methodName,humanName){if(undefined===proto[methodName].overloadTable){var prevFunc=proto[methodName];proto[methodName]=function(){if(!proto[methodName].overloadTable.hasOwnProperty(arguments.length)){throwBindingError("Function '"+humanName+"' called with an invalid number of arguments ("+arguments.length+") - expects one of ("+proto[methodName].overloadTable+")!");}return proto[methodName].overloadTable[arguments.length].apply(this,arguments)};proto[methodName].overloadTable=[];proto[methodName].overloadTable[prevFunc.argCount]=prevFunc;}}function exposePublicSymbol(name,value,numArguments){if(Module.hasOwnProperty(name)){if(undefined===numArguments||undefined!==Module[name].overloadTable&&undefined!==Module[name].overloadTable[numArguments]){throwBindingError("Cannot register public name '"+name+"' twice");}ensureOverloadTable(Module,name,name);if(Module.hasOwnProperty(numArguments)){throwBindingError("Cannot register multiple overloads of a function with the same number of arguments ("+numArguments+")!");}Module[name].overloadTable[numArguments]=value;}else {Module[name]=value;if(undefined!==numArguments){Module[name].numArguments=numArguments;}}}function RegisteredClass(name,constructor,instancePrototype,rawDestructor,baseClass,getActualType,upcast,downcast){this.name=name;this.constructor=constructor;this.instancePrototype=instancePrototype;this.rawDestructor=rawDestructor;this.baseClass=baseClass;this.getActualType=getActualType;this.upcast=upcast;this.downcast=downcast;this.pureVirtualFunctions=[];}function upcastPointer(ptr,ptrClass,desiredClass){while(ptrClass!==desiredClass){if(!ptrClass.upcast){throwBindingError("Expected null or instance of "+desiredClass.name+", got an instance of "+ptrClass.name);}ptr=ptrClass.upcast(ptr);ptrClass=ptrClass.baseClass;}return ptr}function constNoSmartPtrRawPointerToWireType(destructors,handle){if(handle===null){if(this.isReference){throwBindingError("null is not a valid "+this.name);}return 0}if(!handle.$$){throwBindingError('Cannot pass "'+_embind_repr(handle)+'" as a '+this.name);}if(!handle.$$.ptr){throwBindingError("Cannot pass deleted object as a pointer of type "+this.name);}var handleClass=handle.$$.ptrType.registeredClass;var ptr=upcastPointer(handle.$$.ptr,handleClass,this.registeredClass);return ptr}function genericPointerToWireType(destructors,handle){var ptr;if(handle===null){if(this.isReference){throwBindingError("null is not a valid "+this.name);}if(this.isSmartPointer){ptr=this.rawConstructor();if(destructors!==null){destructors.push(this.rawDestructor,ptr);}return ptr}else {return 0}}if(!handle.$$){throwBindingError('Cannot pass "'+_embind_repr(handle)+'" as a '+this.name);}if(!handle.$$.ptr){throwBindingError("Cannot pass deleted object as a pointer of type "+this.name);}if(!this.isConst&&handle.$$.ptrType.isConst){throwBindingError("Cannot convert argument of type "+(handle.$$.smartPtrType?handle.$$.smartPtrType.name:handle.$$.ptrType.name)+" to parameter type "+this.name);}var handleClass=handle.$$.ptrType.registeredClass;ptr=upcastPointer(handle.$$.ptr,handleClass,this.registeredClass);if(this.isSmartPointer){if(undefined===handle.$$.smartPtr){throwBindingError("Passing raw pointer to smart pointer is illegal");}switch(this.sharingPolicy){case 0:if(handle.$$.smartPtrType===this){ptr=handle.$$.smartPtr;}else {throwBindingError("Cannot convert argument of type "+(handle.$$.smartPtrType?handle.$$.smartPtrType.name:handle.$$.ptrType.name)+" to parameter type "+this.name);}break;case 1:ptr=handle.$$.smartPtr;break;case 2:if(handle.$$.smartPtrType===this){ptr=handle.$$.smartPtr;}else {var clonedHandle=handle["clone"]();ptr=this.rawShare(ptr,Emval.toHandle(function(){clonedHandle["delete"]();}));if(destructors!==null){destructors.push(this.rawDestructor,ptr);}}break;default:throwBindingError("Unsupporting sharing policy");}}return ptr}function nonConstNoSmartPtrRawPointerToWireType(destructors,handle){if(handle===null){if(this.isReference){throwBindingError("null is not a valid "+this.name);}return 0}if(!handle.$$){throwBindingError('Cannot pass "'+_embind_repr(handle)+'" as a '+this.name);}if(!handle.$$.ptr){throwBindingError("Cannot pass deleted object as a pointer of type "+this.name);}if(handle.$$.ptrType.isConst){throwBindingError("Cannot convert argument of type "+handle.$$.ptrType.name+" to parameter type "+this.name);}var handleClass=handle.$$.ptrType.registeredClass;var ptr=upcastPointer(handle.$$.ptr,handleClass,this.registeredClass);return ptr}function simpleReadValueFromPointer(pointer){return this["fromWireType"](HEAPU32[pointer>>2])}function RegisteredPointer_getPointee(ptr){if(this.rawGetPointee){ptr=this.rawGetPointee(ptr);}return ptr}function RegisteredPointer_destructor(ptr){if(this.rawDestructor){this.rawDestructor(ptr);}}function RegisteredPointer_deleteObject(handle){if(handle!==null){handle["delete"]();}}function init_RegisteredPointer(){RegisteredPointer.prototype.getPointee=RegisteredPointer_getPointee;RegisteredPointer.prototype.destructor=RegisteredPointer_destructor;RegisteredPointer.prototype["argPackAdvance"]=8;RegisteredPointer.prototype["readValueFromPointer"]=simpleReadValueFromPointer;RegisteredPointer.prototype["deleteObject"]=RegisteredPointer_deleteObject;RegisteredPointer.prototype["fromWireType"]=RegisteredPointer_fromWireType;}function RegisteredPointer(name,registeredClass,isReference,isConst,isSmartPointer,pointeeType,sharingPolicy,rawGetPointee,rawConstructor,rawShare,rawDestructor){this.name=name;this.registeredClass=registeredClass;this.isReference=isReference;this.isConst=isConst;this.isSmartPointer=isSmartPointer;this.pointeeType=pointeeType;this.sharingPolicy=sharingPolicy;this.rawGetPointee=rawGetPointee;this.rawConstructor=rawConstructor;this.rawShare=rawShare;this.rawDestructor=rawDestructor;if(!isSmartPointer&&registeredClass.baseClass===undefined){if(isConst){this["toWireType"]=constNoSmartPtrRawPointerToWireType;this.destructorFunction=null;}else {this["toWireType"]=nonConstNoSmartPtrRawPointerToWireType;this.destructorFunction=null;}}else {this["toWireType"]=genericPointerToWireType;}}function replacePublicSymbol(name,value,numArguments){if(!Module.hasOwnProperty(name)){throwInternalError("Replacing nonexistant public symbol");}if(undefined!==Module[name].overloadTable&&undefined!==numArguments){Module[name].overloadTable[numArguments]=value;}else {Module[name]=value;Module[name].argCount=numArguments;}}function dynCallLegacy(sig,ptr,args){var f=Module["dynCall_"+sig];return args&&args.length?f.apply(null,[ptr].concat(args)):f.call(null,ptr)}function dynCall(sig,ptr,args){if(sig.includes("j")){return dynCallLegacy(sig,ptr,args)}return getWasmTableEntry(ptr).apply(null,args)}function getDynCaller(sig,ptr){var argCache=[];return function(){argCache.length=0;Object.assign(argCache,arguments);return dynCall(sig,ptr,argCache)}}function embind__requireFunction(signature,rawFunction){signature=readLatin1String(signature);function makeDynCaller(){if(signature.includes("j")){return getDynCaller(signature,rawFunction)}return getWasmTableEntry(rawFunction)}var fp=makeDynCaller();if(typeof fp!="function"){throwBindingError("unknown function pointer with signature "+signature+": "+rawFunction);}return fp}var UnboundTypeError=undefined;function getTypeName(type){var ptr=___getTypeName(type);var rv=readLatin1String(ptr);_free(ptr);return rv}function throwUnboundTypeError(message,types){var unboundTypes=[];var seen={};function visit(type){if(seen[type]){return}if(registeredTypes[type]){return}if(typeDependencies[type]){typeDependencies[type].forEach(visit);return}unboundTypes.push(type);seen[type]=true;}types.forEach(visit);throw new UnboundTypeError(message+": "+unboundTypes.map(getTypeName).join([", "]))}function __embind_register_class(rawType,rawPointerType,rawConstPointerType,baseClassRawType,getActualTypeSignature,getActualType,upcastSignature,upcast,downcastSignature,downcast,name,destructorSignature,rawDestructor){name=readLatin1String(name);getActualType=embind__requireFunction(getActualTypeSignature,getActualType);if(upcast){upcast=embind__requireFunction(upcastSignature,upcast);}if(downcast){downcast=embind__requireFunction(downcastSignature,downcast);}rawDestructor=embind__requireFunction(destructorSignature,rawDestructor);var legalFunctionName=makeLegalFunctionName(name);exposePublicSymbol(legalFunctionName,function(){throwUnboundTypeError("Cannot construct "+name+" due to unbound types",[baseClassRawType]);});whenDependentTypesAreResolved([rawType,rawPointerType,rawConstPointerType],baseClassRawType?[baseClassRawType]:[],function(base){base=base[0];var baseClass;var basePrototype;if(baseClassRawType){baseClass=base.registeredClass;basePrototype=baseClass.instancePrototype;}else {basePrototype=ClassHandle.prototype;}var constructor=createNamedFunction(legalFunctionName,function(){if(Object.getPrototypeOf(this)!==instancePrototype){throw new BindingError("Use 'new' to construct "+name)}if(undefined===registeredClass.constructor_body){throw new BindingError(name+" has no accessible constructor")}var body=registeredClass.constructor_body[arguments.length];if(undefined===body){throw new BindingError("Tried to invoke ctor of "+name+" with invalid number of parameters ("+arguments.length+") - expected ("+Object.keys(registeredClass.constructor_body).toString()+") parameters instead!")}return body.apply(this,arguments)});var instancePrototype=Object.create(basePrototype,{constructor:{value:constructor}});constructor.prototype=instancePrototype;var registeredClass=new RegisteredClass(name,constructor,instancePrototype,rawDestructor,baseClass,getActualType,upcast,downcast);var referenceConverter=new RegisteredPointer(name,registeredClass,true,false,false);var pointerConverter=new RegisteredPointer(name+"*",registeredClass,false,false,false);var constPointerConverter=new RegisteredPointer(name+" const*",registeredClass,false,true,false);registeredPointers[rawType]={pointerType:pointerConverter,constPointerType:constPointerConverter};replacePublicSymbol(legalFunctionName,constructor);return [referenceConverter,pointerConverter,constPointerConverter]});}function heap32VectorToArray(count,firstElement){var array=[];for(var i=0;i<count;i++){array.push(HEAP32[(firstElement>>2)+i]);}return array}function runDestructors(destructors){while(destructors.length){var ptr=destructors.pop();var del=destructors.pop();del(ptr);}}function __embind_register_class_constructor(rawClassType,argCount,rawArgTypesAddr,invokerSignature,invoker,rawConstructor){assert(argCount>0);var rawArgTypes=heap32VectorToArray(argCount,rawArgTypesAddr);invoker=embind__requireFunction(invokerSignature,invoker);whenDependentTypesAreResolved([],[rawClassType],function(classType){classType=classType[0];var humanName="constructor "+classType.name;if(undefined===classType.registeredClass.constructor_body){classType.registeredClass.constructor_body=[];}if(undefined!==classType.registeredClass.constructor_body[argCount-1]){throw new BindingError("Cannot register multiple constructors with identical number of parameters ("+(argCount-1)+") for class '"+classType.name+"'! Overload resolution is currently only performed using the parameter count, not actual type info!")}classType.registeredClass.constructor_body[argCount-1]=()=>{throwUnboundTypeError("Cannot construct "+classType.name+" due to unbound types",rawArgTypes);};whenDependentTypesAreResolved([],rawArgTypes,function(argTypes){argTypes.splice(1,0,null);classType.registeredClass.constructor_body[argCount-1]=craftInvokerFunction(humanName,argTypes,null,invoker,rawConstructor);return []});return []});}function new_(constructor,argumentList){if(!(constructor instanceof Function)){throw new TypeError("new_ called with constructor type "+typeof constructor+" which is not a function")}var dummy=createNamedFunction(constructor.name||"unknownFunctionName",function(){});dummy.prototype=constructor.prototype;var obj=new dummy;var r=constructor.apply(obj,argumentList);return r instanceof Object?r:obj}function craftInvokerFunction(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc){var argCount=argTypes.length;if(argCount<2){throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");}var isClassMethodFunc=argTypes[1]!==null&&classType!==null;var needsDestructorStack=false;for(var i=1;i<argTypes.length;++i){if(argTypes[i]!==null&&argTypes[i].destructorFunction===undefined){needsDestructorStack=true;break}}var returns=argTypes[0].name!=="void";var argsList="";var argsListWired="";for(var i=0;i<argCount-2;++i){argsList+=(i!==0?", ":"")+"arg"+i;argsListWired+=(i!==0?", ":"")+"arg"+i+"Wired";}var invokerFnBody="return function "+makeLegalFunctionName(humanName)+"("+argsList+") {\n"+"if (arguments.length !== "+(argCount-2)+") {\n"+"throwBindingError('function "+humanName+" called with ' + arguments.length + ' arguments, expected "+(argCount-2)+" args!');\n"+"}\n";if(needsDestructorStack){invokerFnBody+="var destructors = [];\n";}var dtorStack=needsDestructorStack?"destructors":"null";var args1=["throwBindingError","invoker","fn","runDestructors","retType","classParam"];var args2=[throwBindingError,cppInvokerFunc,cppTargetFunc,runDestructors,argTypes[0],argTypes[1]];if(isClassMethodFunc){invokerFnBody+="var thisWired = classParam.toWireType("+dtorStack+", this);\n";}for(var i=0;i<argCount-2;++i){invokerFnBody+="var arg"+i+"Wired = argType"+i+".toWireType("+dtorStack+", arg"+i+"); // "+argTypes[i+2].name+"\n";args1.push("argType"+i);args2.push(argTypes[i+2]);}if(isClassMethodFunc){argsListWired="thisWired"+(argsListWired.length>0?", ":"")+argsListWired;}invokerFnBody+=(returns?"var rv = ":"")+"invoker(fn"+(argsListWired.length>0?", ":"")+argsListWired+");\n";if(needsDestructorStack){invokerFnBody+="runDestructors(destructors);\n";}else {for(var i=isClassMethodFunc?1:2;i<argTypes.length;++i){var paramName=i===1?"thisWired":"arg"+(i-2)+"Wired";if(argTypes[i].destructorFunction!==null){invokerFnBody+=paramName+"_dtor("+paramName+"); // "+argTypes[i].name+"\n";args1.push(paramName+"_dtor");args2.push(argTypes[i].destructorFunction);}}}if(returns){invokerFnBody+="var ret = retType.fromWireType(rv);\n"+"return ret;\n";}invokerFnBody+="}\n";args1.push(invokerFnBody);var invokerFunction=new_(Function,args1).apply(null,args2);return invokerFunction}function __embind_register_class_function(rawClassType,methodName,argCount,rawArgTypesAddr,invokerSignature,rawInvoker,context,isPureVirtual){var rawArgTypes=heap32VectorToArray(argCount,rawArgTypesAddr);methodName=readLatin1String(methodName);rawInvoker=embind__requireFunction(invokerSignature,rawInvoker);whenDependentTypesAreResolved([],[rawClassType],function(classType){classType=classType[0];var humanName=classType.name+"."+methodName;if(methodName.startsWith("@@")){methodName=Symbol[methodName.substring(2)];}if(isPureVirtual){classType.registeredClass.pureVirtualFunctions.push(methodName);}function unboundTypesHandler(){throwUnboundTypeError("Cannot call "+humanName+" due to unbound types",rawArgTypes);}var proto=classType.registeredClass.instancePrototype;var method=proto[methodName];if(undefined===method||undefined===method.overloadTable&&method.className!==classType.name&&method.argCount===argCount-2){unboundTypesHandler.argCount=argCount-2;unboundTypesHandler.className=classType.name;proto[methodName]=unboundTypesHandler;}else {ensureOverloadTable(proto,methodName,humanName);proto[methodName].overloadTable[argCount-2]=unboundTypesHandler;}whenDependentTypesAreResolved([],rawArgTypes,function(argTypes){var memberFunction=craftInvokerFunction(humanName,argTypes,classType,rawInvoker,context);if(undefined===proto[methodName].overloadTable){memberFunction.argCount=argCount-2;proto[methodName]=memberFunction;}else {proto[methodName].overloadTable[argCount-2]=memberFunction;}return []});return []});}var emval_free_list=[];var emval_handle_array=[{},{value:undefined},{value:null},{value:true},{value:false}];function __emval_decref(handle){if(handle>4&&0===--emval_handle_array[handle].refcount){emval_handle_array[handle]=undefined;emval_free_list.push(handle);}}function count_emval_handles(){var count=0;for(var i=5;i<emval_handle_array.length;++i){if(emval_handle_array[i]!==undefined){++count;}}return count}function get_first_emval(){for(var i=5;i<emval_handle_array.length;++i){if(emval_handle_array[i]!==undefined){return emval_handle_array[i]}}return null}function init_emval(){Module["count_emval_handles"]=count_emval_handles;Module["get_first_emval"]=get_first_emval;}var Emval={toValue:handle=>{if(!handle){throwBindingError("Cannot use deleted val. handle = "+handle);}return emval_handle_array[handle].value},toHandle:value=>{switch(value){case undefined:return 1;case null:return 2;case true:return 3;case false:return 4;default:{var handle=emval_free_list.length?emval_free_list.pop():emval_handle_array.length;emval_handle_array[handle]={refcount:1,value:value};return handle}}}};function __embind_register_emval(rawType,name){name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":function(handle){var rv=Emval.toValue(handle);__emval_decref(handle);return rv},"toWireType":function(destructors,value){return Emval.toHandle(value)},"argPackAdvance":8,"readValueFromPointer":simpleReadValueFromPointer,destructorFunction:null});}function _embind_repr(v){if(v===null){return "null"}var t=typeof v;if(t==="object"||t==="array"||t==="function"){return v.toString()}else {return ""+v}}function floatReadValueFromPointer(name,shift){switch(shift){case 2:return function(pointer){return this["fromWireType"](HEAPF32[pointer>>2])};case 3:return function(pointer){return this["fromWireType"](HEAPF64[pointer>>3])};default:throw new TypeError("Unknown float type: "+name)}}function __embind_register_float(rawType,name,size){var shift=getShiftFromSize(size);name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":function(value){return value},"toWireType":function(destructors,value){return value},"argPackAdvance":8,"readValueFromPointer":floatReadValueFromPointer(name,shift),destructorFunction:null});}function integerReadValueFromPointer(name,shift,signed){switch(shift){case 0:return signed?function readS8FromPointer(pointer){return HEAP8[pointer]}:function readU8FromPointer(pointer){return HEAPU8[pointer]};case 1:return signed?function readS16FromPointer(pointer){return HEAP16[pointer>>1]}:function readU16FromPointer(pointer){return HEAPU16[pointer>>1]};case 2:return signed?function readS32FromPointer(pointer){return HEAP32[pointer>>2]}:function readU32FromPointer(pointer){return HEAPU32[pointer>>2]};default:throw new TypeError("Unknown integer type: "+name)}}function __embind_register_integer(primitiveType,name,size,minRange,maxRange){name=readLatin1String(name);var shift=getShiftFromSize(size);var fromWireType=value=>value;if(minRange===0){var bitshift=32-8*size;fromWireType=value=>value<<bitshift>>>bitshift;}var isUnsignedType=name.includes("unsigned");var checkAssertions=(value,toTypeName)=>{};var toWireType;if(isUnsignedType){toWireType=function(destructors,value){checkAssertions(value,this.name);return value>>>0};}else {toWireType=function(destructors,value){checkAssertions(value,this.name);return value};}registerType(primitiveType,{name:name,"fromWireType":fromWireType,"toWireType":toWireType,"argPackAdvance":8,"readValueFromPointer":integerReadValueFromPointer(name,shift,minRange!==0),destructorFunction:null});}function __embind_register_memory_view(rawType,dataTypeIndex,name){var typeMapping=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array];var TA=typeMapping[dataTypeIndex];function decodeMemoryView(handle){handle=handle>>2;var heap=HEAPU32;var size=heap[handle];var data=heap[handle+1];return new TA(buffer,data,size)}name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":decodeMemoryView,"argPackAdvance":8,"readValueFromPointer":decodeMemoryView},{ignoreDuplicateRegistrations:true});}function __embind_register_std_string(rawType,name){name=readLatin1String(name);var stdStringIsUTF8=name==="std::string";registerType(rawType,{name:name,"fromWireType":function(value){var length=HEAPU32[value>>2];var str;if(stdStringIsUTF8){var decodeStartPtr=value+4;for(var i=0;i<=length;++i){var currentBytePtr=value+4+i;if(i==length||HEAPU8[currentBytePtr]==0){var maxRead=currentBytePtr-decodeStartPtr;var stringSegment=UTF8ToString(decodeStartPtr,maxRead);if(str===undefined){str=stringSegment;}else {str+=String.fromCharCode(0);str+=stringSegment;}decodeStartPtr=currentBytePtr+1;}}}else {var a=new Array(length);for(var i=0;i<length;++i){a[i]=String.fromCharCode(HEAPU8[value+4+i]);}str=a.join("");}_free(value);return str},"toWireType":function(destructors,value){if(value instanceof ArrayBuffer){value=new Uint8Array(value);}var getLength;var valueIsOfTypeString=typeof value=="string";if(!(valueIsOfTypeString||value instanceof Uint8Array||value instanceof Uint8ClampedArray||value instanceof Int8Array)){throwBindingError("Cannot pass non-string to std::string");}if(stdStringIsUTF8&&valueIsOfTypeString){getLength=()=>lengthBytesUTF8(value);}else {getLength=()=>value.length;}var length=getLength();var ptr=_malloc(4+length+1);HEAPU32[ptr>>2]=length;if(stdStringIsUTF8&&valueIsOfTypeString){stringToUTF8(value,ptr+4,length+1);}else {if(valueIsOfTypeString){for(var i=0;i<length;++i){var charCode=value.charCodeAt(i);if(charCode>255){_free(ptr);throwBindingError("String has UTF-16 code units that do not fit in 8 bits");}HEAPU8[ptr+4+i]=charCode;}}else {for(var i=0;i<length;++i){HEAPU8[ptr+4+i]=value[i];}}}if(destructors!==null){destructors.push(_free,ptr);}return ptr},"argPackAdvance":8,"readValueFromPointer":simpleReadValueFromPointer,destructorFunction:function(ptr){_free(ptr);}});}function __embind_register_std_wstring(rawType,charSize,name){name=readLatin1String(name);var decodeString,encodeString,getHeap,lengthBytesUTF,shift;if(charSize===2){decodeString=UTF16ToString;encodeString=stringToUTF16;lengthBytesUTF=lengthBytesUTF16;getHeap=()=>HEAPU16;shift=1;}else if(charSize===4){decodeString=UTF32ToString;encodeString=stringToUTF32;lengthBytesUTF=lengthBytesUTF32;getHeap=()=>HEAPU32;shift=2;}registerType(rawType,{name:name,"fromWireType":function(value){var length=HEAPU32[value>>2];var HEAP=getHeap();var str;var decodeStartPtr=value+4;for(var i=0;i<=length;++i){var currentBytePtr=value+4+i*charSize;if(i==length||HEAP[currentBytePtr>>shift]==0){var maxReadBytes=currentBytePtr-decodeStartPtr;var stringSegment=decodeString(decodeStartPtr,maxReadBytes);if(str===undefined){str=stringSegment;}else {str+=String.fromCharCode(0);str+=stringSegment;}decodeStartPtr=currentBytePtr+charSize;}}_free(value);return str},"toWireType":function(destructors,value){if(!(typeof value=="string")){throwBindingError("Cannot pass non-string to C++ string type "+name);}var length=lengthBytesUTF(value);var ptr=_malloc(4+length+charSize);HEAPU32[ptr>>2]=length>>shift;encodeString(value,ptr+4,length+charSize);if(destructors!==null){destructors.push(_free,ptr);}return ptr},"argPackAdvance":8,"readValueFromPointer":simpleReadValueFromPointer,destructorFunction:function(ptr){_free(ptr);}});}function __embind_register_void(rawType,name){name=readLatin1String(name);registerType(rawType,{isVoid:true,name:name,"argPackAdvance":0,"fromWireType":function(){return undefined},"toWireType":function(destructors,o){return undefined}});}function __emval_incref(handle){if(handle>4){emval_handle_array[handle].refcount+=1;}}function requireRegisteredType(rawType,humanName){var impl=registeredTypes[rawType];if(undefined===impl){throwBindingError(humanName+" has unknown type "+getTypeName(rawType));}return impl}function __emval_take_value(type,argv){type=requireRegisteredType(type,"_emval_take_value");var v=type["readValueFromPointer"](argv);return Emval.toHandle(v)}function _abort(){abort("");}function _emscripten_memcpy_big(dest,src,num){HEAPU8.copyWithin(dest,src,src+num);}function abortOnCannotGrowMemory(requestedSize){abort("OOM");}function _emscripten_resize_heap(requestedSize){HEAPU8.length;abortOnCannotGrowMemory();}embind_init_charCodes();BindingError=Module["BindingError"]=extendError(Error,"BindingError");InternalError=Module["InternalError"]=extendError(Error,"InternalError");init_ClassHandle();init_embind();init_RegisteredPointer();UnboundTypeError=Module["UnboundTypeError"]=extendError(Error,"UnboundTypeError");init_emval();function intArrayToString(array){var ret=[];for(var i=0;i<array.length;i++){var chr=array[i];if(chr>255){chr&=255;}ret.push(String.fromCharCode(chr));}return ret.join("")}var decodeBase64=typeof atob=="function"?atob:function(input){var keyStr="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";var output="";var chr1,chr2,chr3;var enc1,enc2,enc3,enc4;var i=0;input=input.replace(/[^A-Za-z0-9\+\/\=]/g,"");do{enc1=keyStr.indexOf(input.charAt(i++));enc2=keyStr.indexOf(input.charAt(i++));enc3=keyStr.indexOf(input.charAt(i++));enc4=keyStr.indexOf(input.charAt(i++));chr1=enc1<<2|enc2>>4;chr2=(enc2&15)<<4|enc3>>2;chr3=(enc3&3)<<6|enc4;output=output+String.fromCharCode(chr1);if(enc3!==64){output=output+String.fromCharCode(chr2);}if(enc4!==64){output=output+String.fromCharCode(chr3);}}while(i<input.length);return output};function intArrayFromBase64(s){if(typeof ENVIRONMENT_IS_NODE=="boolean"&&ENVIRONMENT_IS_NODE){var buf=Buffer.from(s,"base64");return new Uint8Array(buf["buffer"],buf["byteOffset"],buf["byteLength"])}try{var decoded=decodeBase64(s);var bytes=new Uint8Array(decoded.length);for(var i=0;i<decoded.length;++i){bytes[i]=decoded.charCodeAt(i);}return bytes}catch(_){throw new Error("Converting base64 string to bytes failed.")}}function tryParseAsDataURI(filename){if(!isDataURI(filename)){return}return intArrayFromBase64(filename.slice(dataURIPrefix.length))}var asmLibraryArg={"h":___cxa_allocate_exception,"g":___cxa_throw,"p":__embind_register_bigint,"n":__embind_register_bool,"e":__embind_register_class,"d":__embind_register_class_constructor,"a":__embind_register_class_function,"t":__embind_register_emval,"m":__embind_register_float,"c":__embind_register_integer,"b":__embind_register_memory_view,"l":__embind_register_std_string,"i":__embind_register_std_wstring,"o":__embind_register_void,"j":__emval_decref,"k":__emval_incref,"f":__emval_take_value,"q":_abort,"s":_emscripten_memcpy_big,"r":_emscripten_resize_heap};createWasm();Module["___wasm_call_ctors"]=function(){return (Module["___wasm_call_ctors"]=Module["asm"]["v"]).apply(null,arguments)};var _malloc=Module["_malloc"]=function(){return (_malloc=Module["_malloc"]=Module["asm"]["w"]).apply(null,arguments)};var ___getTypeName=Module["___getTypeName"]=function(){return (___getTypeName=Module["___getTypeName"]=Module["asm"]["y"]).apply(null,arguments)};Module["___embind_register_native_and_builtin_types"]=function(){return (Module["___embind_register_native_and_builtin_types"]=Module["asm"]["z"]).apply(null,arguments)};var _free=Module["_free"]=function(){return (_free=Module["_free"]=Module["asm"]["A"]).apply(null,arguments)};var ___cxa_is_pointer_type=Module["___cxa_is_pointer_type"]=function(){return (___cxa_is_pointer_type=Module["___cxa_is_pointer_type"]=Module["asm"]["B"]).apply(null,arguments)};var calledRun;function ExitStatus(status){this.name="ExitStatus";this.message="Program terminated with exit("+status+")";this.status=status;}dependenciesFulfilled=function runCaller(){if(!calledRun)run();if(!calledRun)dependenciesFulfilled=runCaller;};function run(args){if(runDependencies>0){return}preRun();if(runDependencies>0){return}function doRun(){if(calledRun)return;calledRun=true;Module["calledRun"]=true;if(ABORT)return;initRuntime();readyPromiseResolve(Module);if(Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();postRun();}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(function(){setTimeout(function(){Module["setStatus"]("");},1);doRun();},1);}else {doRun();}}Module["run"]=run;if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()();}}run();


  		  return Module.ready
  		}
  		);
  		})();
  		module.exports = Module;
  } (edgeFel));
  	return edgeFel.exports;
  }

  requireEdgeFel();

  const Module = requireEdgeFel()();
  let _cachedFel;

  const arrToVector = async (arr, type = 'float') => {
      const v = new ((await Module)[`vector${type}`])();
      for (const val of arr) {
          v.push_back(val);
      }
      return v;
  };

  const vectorToArr = (vector) => new Array(vector.size()).fill(0).map((_, i) => vector.get(i));

  const objToMap = async (obj, type = 'float') => {
      const m = new ((await Module)[`mapstring${type}`])();
      for (const [key, val] of Object.entries(obj)) {
          m.set(key, val);
      }
      return m;
  };

  const mapToObj = (map) => {
      const obj = {};
      const keys = vectorToArr(map.keys());
      for (const key of keys) {
          obj[key] = map.get(key);
      }
      return obj
  };

  const extractSome = async (features, inArr, params) => {
      const values = await arrToVector(inArr);
      const delegate = await _getFel();
      const ret = delegate.extractSome(features, values, params);
      const retObj = mapToObj(ret);
      values.delete();
      ret.delete();
      return retObj;
  };

  const _getFel = async () => {
      if (_cachedFel) return _cachedFel;

      _cachedFel = new ((await Module).ExtractionDelegate)();
      return _getFel()
  };

  function cache(fn){
      var NO_RESULT = Symbol("cache");
      var res = NO_RESULT;
      return function () {
          if(res === NO_RESULT) return (res = fn.apply(this, arguments));
          return res;
      };
  }

  const PredictorError = class PredictorError extends Error {};

  /**
   * @namespace
   * @property {(input: number[]) => number[]} predictor 
   * @property {string[]} sensors 
   * @property {number} windowSize 
   * @property {string[]} labels 
   * @property {{ [sensorName: string]: [number, number][] }} store
   */
  const Predictor = class Predictor {
      /**
       * Predictor
       * @param {(input: number[]) => number[]} predictor 
       * @param {string[]} sensors 
       * @param {number} windowSize 
       * @param {string[]} labels 
       * @param scaler 
       */
      constructor(predictor, sensors, windowSize, labels, scaler) {
          /** @type {(input: number[]) => number[]} */
          this.predictor = predictor;
          /** @type {string[]} */
          this.sensors = sensors;
          /** @type {number} */
          this.windowSize = windowSize;
          /** @type {string[]} */
          this.labels = labels; 

          this.scaler = scaler;

          /** @type {{ [sensorName: string]: [number, number][] }} sensorName: [timestamp, value][] */
          this.store = this.sensors.reduce((acc, cur) => {
              acc[cur] = [];
              return acc;
          }, {});
      }

      /**
       * addDatapoint
       * @param {string} sensorName 
       * @param {number} value 
       * @param {number | null} time use a predefined timestamp, or null if the timestamp should be generated
       */
      addDatapoint = (sensorName, value, time = null) => {
          if (typeof value !== 'number') throw new TypeError('Datapoint is not a number');
          if (!this.sensors.includes(sensorName)) throw new TypeError('Sensor is not valid');
          if (time === null) time = Date.now();

          this.store[sensorName].push([time, value]);

          this._updateStore();
      }

      /**
       * @private
       */
      _updateStore() {
          for (const sensorName of this.sensors) {
              if (this.store[sensorName].length > this.windowSize * 4) {
                  this.store[sensorName] = this.store[sensorName].slice(-2 * this.windowSize);
              }
          }
      }

      predict = async () => {
          const samples = Predictor._merge(this.store, this.sensors);
          // const interpolated = Predictor._interpolate(samples, this.sensors.length) // interpolation is somehow broken?
          const window = samples.slice(-this.windowSize);
          if (window.length < this.windowSize) {
              throw new PredictorError("Not enough samples")
          }

          const [featNames, feats] = await Predictor._extract(window, this.sensors.length, this.scaler);
          
          const pred = this.predictor(feats);
          return {
              prediction: this.labels[pred.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0)],
              result: pred,
          }
      }

      /**
       * @param {{ [sensorName: string]: [number, number][] }} store
       * @param {string[]} sensors
       * @return {((number | null)[])[]} ((number | null)[]): [time, ...values], values in the ordering of this.sensors, null for missing values
       */
      static _merge(store, sensors) {
          /** @type {{ [time: number]: { [sensorName: string]: number } }} */
          const out = {};
          for (const sensorName of sensors) {
              for (const [time, value] of store[sensorName]) {
                  out[time] = out[time] || {};
                  out[time][sensorName] = value;
              }
          }
          return Object.entries(out).map(([time, values]) => {
              const arr = [time];
              for (const sensorName of sensors) {
                  arr.push(values[sensorName] || null);
              }
              return arr;
          }).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
      }

      /**
       * from pandas: ‘linear’: Ignore the index and treat the values as *equally* spaced.
       * @param {((number | null)[])[]} frame
       * @param {number} sensorsLength
       * @return {(number[])[]}
       */
      static _interpolate(frame, sensorsLength) {
          const lists = [];
          for (let i = 0; i < sensorsLength; i++) {
              const sensorValues = frame.map(x => x[i+1]);
              interpolateLinear(sensorValues);
              lists[i] = sensorValues;
          }

          return frame.map(([time], i) => {
              const arr = [time];
              for (let j = 0; j < sensorsLength; j++) {
                  arr.push(lists[j][i]);
              }
              return arr;
          })
      }

      /**
       * 
       * @param {(number[])[]} frame 
       * @param {number} sensorsLength
       * @param scaler
       * @returns {number[]}
       */
      static async _extract(frame, sensorsLength, scaler) {
          // cache these
          const felParams = await Predictor.felParams();
          const felFeaturesTSfresh = await Predictor.felFeaturesTSfresh();

          const feats = []; // [features, values]
          for (let i = 0; i < sensorsLength; i++) {
              const toF = frame.map(x => x[i+1]);
              const featureMap = await extractSome(felFeaturesTSfresh, toF, felParams);
              for (const [feat, val] of Object.entries(featureMap)) {
                  feats.push([[i, feat], val]);
              }
          }
          feats.sort(([[aI, aFeat]], [[bI, bFeat]]) => {
              if (aI !== bI) return aI - bI;
              return Predictor.featuresTSfresh.indexOf(aFeat) - Predictor.featuresTSfresh.indexOf(bFeat)
          });
          if (scaler) {
              for (let i = 0; i < feats.length; i++) {
                  feats[i][1] = (feats[i][1] - scaler["center"][i]) / scaler["scale"][i];
              }
          }
          return [feats.map(x => x[0].join('__')), feats.map(x => x[1])]
      }
  };

  /** @type {string[]} features */
  Predictor.featuresTSfresh = [
      "sum",
      "median",
      "mean",
      "length",
      "std_dev",
      "var",
      "root_mean_square",
      "max",
      "abs_max",
      "min" 
  ];
  Predictor.felParams = cache(() => objToMap({"mean_n_abs_max_n": 8, "change_quantile_lower": -0.1, "change_quantile_upper": 0.1, "change_quantile_aggr": 0, "range_count_lower": -1, "range_count_upper": 1, "count_above_x": 0, "count_below_x": 0, "quantile_q": 0.5, "autocorrelation_lag": 1}));
  Predictor.felFeaturesTSfresh = cache(() => arrToVector(Predictor.featuresTSfresh, 'string'));

  var axios$1 = {exports: {}};

  var axios = {exports: {}};

  var bind;
  var hasRequiredBind;

  function requireBind () {
  	if (hasRequiredBind) return bind;
  	hasRequiredBind = 1;

  	bind = function bind(fn, thisArg) {
  	  return function wrap() {
  	    var args = new Array(arguments.length);
  	    for (var i = 0; i < args.length; i++) {
  	      args[i] = arguments[i];
  	    }
  	    return fn.apply(thisArg, args);
  	  };
  	};
  	return bind;
  }

  var utils$2;
  var hasRequiredUtils;

  function requireUtils () {
  	if (hasRequiredUtils) return utils$2;
  	hasRequiredUtils = 1;

  	var bind = requireBind();

  	// utils is a library of generic helper functions non-specific to axios

  	var toString = Object.prototype.toString;

  	// eslint-disable-next-line func-names
  	var kindOf = (function(cache) {
  	  // eslint-disable-next-line func-names
  	  return function(thing) {
  	    var str = toString.call(thing);
  	    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
  	  };
  	})(Object.create(null));

  	function kindOfTest(type) {
  	  type = type.toLowerCase();
  	  return function isKindOf(thing) {
  	    return kindOf(thing) === type;
  	  };
  	}

  	/**
  	 * Determine if a value is an Array
  	 *
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is an Array, otherwise false
  	 */
  	function isArray(val) {
  	  return Array.isArray(val);
  	}

  	/**
  	 * Determine if a value is undefined
  	 *
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if the value is undefined, otherwise false
  	 */
  	function isUndefined(val) {
  	  return typeof val === 'undefined';
  	}

  	/**
  	 * Determine if a value is a Buffer
  	 *
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is a Buffer, otherwise false
  	 */
  	function isBuffer(val) {
  	  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
  	    && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
  	}

  	/**
  	 * Determine if a value is an ArrayBuffer
  	 *
  	 * @function
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
  	 */
  	var isArrayBuffer = kindOfTest('ArrayBuffer');


  	/**
  	 * Determine if a value is a view on an ArrayBuffer
  	 *
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
  	 */
  	function isArrayBufferView(val) {
  	  var result;
  	  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
  	    result = ArrayBuffer.isView(val);
  	  } else {
  	    result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
  	  }
  	  return result;
  	}

  	/**
  	 * Determine if a value is a String
  	 *
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is a String, otherwise false
  	 */
  	function isString(val) {
  	  return typeof val === 'string';
  	}

  	/**
  	 * Determine if a value is a Number
  	 *
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is a Number, otherwise false
  	 */
  	function isNumber(val) {
  	  return typeof val === 'number';
  	}

  	/**
  	 * Determine if a value is an Object
  	 *
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is an Object, otherwise false
  	 */
  	function isObject(val) {
  	  return val !== null && typeof val === 'object';
  	}

  	/**
  	 * Determine if a value is a plain Object
  	 *
  	 * @param {Object} val The value to test
  	 * @return {boolean} True if value is a plain Object, otherwise false
  	 */
  	function isPlainObject(val) {
  	  if (kindOf(val) !== 'object') {
  	    return false;
  	  }

  	  var prototype = Object.getPrototypeOf(val);
  	  return prototype === null || prototype === Object.prototype;
  	}

  	/**
  	 * Determine if a value is a Date
  	 *
  	 * @function
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is a Date, otherwise false
  	 */
  	var isDate = kindOfTest('Date');

  	/**
  	 * Determine if a value is a File
  	 *
  	 * @function
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is a File, otherwise false
  	 */
  	var isFile = kindOfTest('File');

  	/**
  	 * Determine if a value is a Blob
  	 *
  	 * @function
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is a Blob, otherwise false
  	 */
  	var isBlob = kindOfTest('Blob');

  	/**
  	 * Determine if a value is a FileList
  	 *
  	 * @function
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is a File, otherwise false
  	 */
  	var isFileList = kindOfTest('FileList');

  	/**
  	 * Determine if a value is a Function
  	 *
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is a Function, otherwise false
  	 */
  	function isFunction(val) {
  	  return toString.call(val) === '[object Function]';
  	}

  	/**
  	 * Determine if a value is a Stream
  	 *
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is a Stream, otherwise false
  	 */
  	function isStream(val) {
  	  return isObject(val) && isFunction(val.pipe);
  	}

  	/**
  	 * Determine if a value is a FormData
  	 *
  	 * @param {Object} thing The value to test
  	 * @returns {boolean} True if value is an FormData, otherwise false
  	 */
  	function isFormData(thing) {
  	  var pattern = '[object FormData]';
  	  return thing && (
  	    (typeof FormData === 'function' && thing instanceof FormData) ||
  	    toString.call(thing) === pattern ||
  	    (isFunction(thing.toString) && thing.toString() === pattern)
  	  );
  	}

  	/**
  	 * Determine if a value is a URLSearchParams object
  	 * @function
  	 * @param {Object} val The value to test
  	 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
  	 */
  	var isURLSearchParams = kindOfTest('URLSearchParams');

  	/**
  	 * Trim excess whitespace off the beginning and end of a string
  	 *
  	 * @param {String} str The String to trim
  	 * @returns {String} The String freed of excess whitespace
  	 */
  	function trim(str) {
  	  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
  	}

  	/**
  	 * Determine if we're running in a standard browser environment
  	 *
  	 * This allows axios to run in a web worker, and react-native.
  	 * Both environments support XMLHttpRequest, but not fully standard globals.
  	 *
  	 * web workers:
  	 *  typeof window -> undefined
  	 *  typeof document -> undefined
  	 *
  	 * react-native:
  	 *  navigator.product -> 'ReactNative'
  	 * nativescript
  	 *  navigator.product -> 'NativeScript' or 'NS'
  	 */
  	function isStandardBrowserEnv() {
  	  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
  	                                           navigator.product === 'NativeScript' ||
  	                                           navigator.product === 'NS')) {
  	    return false;
  	  }
  	  return (
  	    typeof window !== 'undefined' &&
  	    typeof document !== 'undefined'
  	  );
  	}

  	/**
  	 * Iterate over an Array or an Object invoking a function for each item.
  	 *
  	 * If `obj` is an Array callback will be called passing
  	 * the value, index, and complete array for each item.
  	 *
  	 * If 'obj' is an Object callback will be called passing
  	 * the value, key, and complete object for each property.
  	 *
  	 * @param {Object|Array} obj The object to iterate
  	 * @param {Function} fn The callback to invoke for each item
  	 */
  	function forEach(obj, fn) {
  	  // Don't bother if no value provided
  	  if (obj === null || typeof obj === 'undefined') {
  	    return;
  	  }

  	  // Force an array if not already something iterable
  	  if (typeof obj !== 'object') {
  	    /*eslint no-param-reassign:0*/
  	    obj = [obj];
  	  }

  	  if (isArray(obj)) {
  	    // Iterate over array values
  	    for (var i = 0, l = obj.length; i < l; i++) {
  	      fn.call(null, obj[i], i, obj);
  	    }
  	  } else {
  	    // Iterate over object keys
  	    for (var key in obj) {
  	      if (Object.prototype.hasOwnProperty.call(obj, key)) {
  	        fn.call(null, obj[key], key, obj);
  	      }
  	    }
  	  }
  	}

  	/**
  	 * Accepts varargs expecting each argument to be an object, then
  	 * immutably merges the properties of each object and returns result.
  	 *
  	 * When multiple objects contain the same key the later object in
  	 * the arguments list will take precedence.
  	 *
  	 * Example:
  	 *
  	 * ```js
  	 * var result = merge({foo: 123}, {foo: 456});
  	 * console.log(result.foo); // outputs 456
  	 * ```
  	 *
  	 * @param {Object} obj1 Object to merge
  	 * @returns {Object} Result of all merge properties
  	 */
  	function merge(/* obj1, obj2, obj3, ... */) {
  	  var result = {};
  	  function assignValue(val, key) {
  	    if (isPlainObject(result[key]) && isPlainObject(val)) {
  	      result[key] = merge(result[key], val);
  	    } else if (isPlainObject(val)) {
  	      result[key] = merge({}, val);
  	    } else if (isArray(val)) {
  	      result[key] = val.slice();
  	    } else {
  	      result[key] = val;
  	    }
  	  }

  	  for (var i = 0, l = arguments.length; i < l; i++) {
  	    forEach(arguments[i], assignValue);
  	  }
  	  return result;
  	}

  	/**
  	 * Extends object a by mutably adding to it the properties of object b.
  	 *
  	 * @param {Object} a The object to be extended
  	 * @param {Object} b The object to copy properties from
  	 * @param {Object} thisArg The object to bind function to
  	 * @return {Object} The resulting value of object a
  	 */
  	function extend(a, b, thisArg) {
  	  forEach(b, function assignValue(val, key) {
  	    if (thisArg && typeof val === 'function') {
  	      a[key] = bind(val, thisArg);
  	    } else {
  	      a[key] = val;
  	    }
  	  });
  	  return a;
  	}

  	/**
  	 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
  	 *
  	 * @param {string} content with BOM
  	 * @return {string} content value without BOM
  	 */
  	function stripBOM(content) {
  	  if (content.charCodeAt(0) === 0xFEFF) {
  	    content = content.slice(1);
  	  }
  	  return content;
  	}

  	/**
  	 * Inherit the prototype methods from one constructor into another
  	 * @param {function} constructor
  	 * @param {function} superConstructor
  	 * @param {object} [props]
  	 * @param {object} [descriptors]
  	 */

  	function inherits(constructor, superConstructor, props, descriptors) {
  	  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  	  constructor.prototype.constructor = constructor;
  	  props && Object.assign(constructor.prototype, props);
  	}

  	/**
  	 * Resolve object with deep prototype chain to a flat object
  	 * @param {Object} sourceObj source object
  	 * @param {Object} [destObj]
  	 * @param {Function} [filter]
  	 * @returns {Object}
  	 */

  	function toFlatObject(sourceObj, destObj, filter) {
  	  var props;
  	  var i;
  	  var prop;
  	  var merged = {};

  	  destObj = destObj || {};

  	  do {
  	    props = Object.getOwnPropertyNames(sourceObj);
  	    i = props.length;
  	    while (i-- > 0) {
  	      prop = props[i];
  	      if (!merged[prop]) {
  	        destObj[prop] = sourceObj[prop];
  	        merged[prop] = true;
  	      }
  	    }
  	    sourceObj = Object.getPrototypeOf(sourceObj);
  	  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

  	  return destObj;
  	}

  	/*
  	 * determines whether a string ends with the characters of a specified string
  	 * @param {String} str
  	 * @param {String} searchString
  	 * @param {Number} [position= 0]
  	 * @returns {boolean}
  	 */
  	function endsWith(str, searchString, position) {
  	  str = String(str);
  	  if (position === undefined || position > str.length) {
  	    position = str.length;
  	  }
  	  position -= searchString.length;
  	  var lastIndex = str.indexOf(searchString, position);
  	  return lastIndex !== -1 && lastIndex === position;
  	}


  	/**
  	 * Returns new array from array like object
  	 * @param {*} [thing]
  	 * @returns {Array}
  	 */
  	function toArray(thing) {
  	  if (!thing) return null;
  	  var i = thing.length;
  	  if (isUndefined(i)) return null;
  	  var arr = new Array(i);
  	  while (i-- > 0) {
  	    arr[i] = thing[i];
  	  }
  	  return arr;
  	}

  	// eslint-disable-next-line func-names
  	var isTypedArray = (function(TypedArray) {
  	  // eslint-disable-next-line func-names
  	  return function(thing) {
  	    return TypedArray && thing instanceof TypedArray;
  	  };
  	})(typeof Uint8Array !== 'undefined' && Object.getPrototypeOf(Uint8Array));

  	utils$2 = {
  	  isArray: isArray,
  	  isArrayBuffer: isArrayBuffer,
  	  isBuffer: isBuffer,
  	  isFormData: isFormData,
  	  isArrayBufferView: isArrayBufferView,
  	  isString: isString,
  	  isNumber: isNumber,
  	  isObject: isObject,
  	  isPlainObject: isPlainObject,
  	  isUndefined: isUndefined,
  	  isDate: isDate,
  	  isFile: isFile,
  	  isBlob: isBlob,
  	  isFunction: isFunction,
  	  isStream: isStream,
  	  isURLSearchParams: isURLSearchParams,
  	  isStandardBrowserEnv: isStandardBrowserEnv,
  	  forEach: forEach,
  	  merge: merge,
  	  extend: extend,
  	  trim: trim,
  	  stripBOM: stripBOM,
  	  inherits: inherits,
  	  toFlatObject: toFlatObject,
  	  kindOf: kindOf,
  	  kindOfTest: kindOfTest,
  	  endsWith: endsWith,
  	  toArray: toArray,
  	  isTypedArray: isTypedArray,
  	  isFileList: isFileList
  	};
  	return utils$2;
  }

  var buildURL;
  var hasRequiredBuildURL;

  function requireBuildURL () {
  	if (hasRequiredBuildURL) return buildURL;
  	hasRequiredBuildURL = 1;

  	var utils = requireUtils();

  	function encode(val) {
  	  return encodeURIComponent(val).
  	    replace(/%3A/gi, ':').
  	    replace(/%24/g, '$').
  	    replace(/%2C/gi, ',').
  	    replace(/%20/g, '+').
  	    replace(/%5B/gi, '[').
  	    replace(/%5D/gi, ']');
  	}

  	/**
  	 * Build a URL by appending params to the end
  	 *
  	 * @param {string} url The base of the url (e.g., http://www.google.com)
  	 * @param {object} [params] The params to be appended
  	 * @returns {string} The formatted url
  	 */
  	buildURL = function buildURL(url, params, paramsSerializer) {
  	  /*eslint no-param-reassign:0*/
  	  if (!params) {
  	    return url;
  	  }

  	  var serializedParams;
  	  if (paramsSerializer) {
  	    serializedParams = paramsSerializer(params);
  	  } else if (utils.isURLSearchParams(params)) {
  	    serializedParams = params.toString();
  	  } else {
  	    var parts = [];

  	    utils.forEach(params, function serialize(val, key) {
  	      if (val === null || typeof val === 'undefined') {
  	        return;
  	      }

  	      if (utils.isArray(val)) {
  	        key = key + '[]';
  	      } else {
  	        val = [val];
  	      }

  	      utils.forEach(val, function parseValue(v) {
  	        if (utils.isDate(v)) {
  	          v = v.toISOString();
  	        } else if (utils.isObject(v)) {
  	          v = JSON.stringify(v);
  	        }
  	        parts.push(encode(key) + '=' + encode(v));
  	      });
  	    });

  	    serializedParams = parts.join('&');
  	  }

  	  if (serializedParams) {
  	    var hashmarkIndex = url.indexOf('#');
  	    if (hashmarkIndex !== -1) {
  	      url = url.slice(0, hashmarkIndex);
  	    }

  	    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  	  }

  	  return url;
  	};
  	return buildURL;
  }

  var InterceptorManager_1;
  var hasRequiredInterceptorManager;

  function requireInterceptorManager () {
  	if (hasRequiredInterceptorManager) return InterceptorManager_1;
  	hasRequiredInterceptorManager = 1;

  	var utils = requireUtils();

  	function InterceptorManager() {
  	  this.handlers = [];
  	}

  	/**
  	 * Add a new interceptor to the stack
  	 *
  	 * @param {Function} fulfilled The function to handle `then` for a `Promise`
  	 * @param {Function} rejected The function to handle `reject` for a `Promise`
  	 *
  	 * @return {Number} An ID used to remove interceptor later
  	 */
  	InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  	  this.handlers.push({
  	    fulfilled: fulfilled,
  	    rejected: rejected,
  	    synchronous: options ? options.synchronous : false,
  	    runWhen: options ? options.runWhen : null
  	  });
  	  return this.handlers.length - 1;
  	};

  	/**
  	 * Remove an interceptor from the stack
  	 *
  	 * @param {Number} id The ID that was returned by `use`
  	 */
  	InterceptorManager.prototype.eject = function eject(id) {
  	  if (this.handlers[id]) {
  	    this.handlers[id] = null;
  	  }
  	};

  	/**
  	 * Iterate over all the registered interceptors
  	 *
  	 * This method is particularly useful for skipping over any
  	 * interceptors that may have become `null` calling `eject`.
  	 *
  	 * @param {Function} fn The function to call for each interceptor
  	 */
  	InterceptorManager.prototype.forEach = function forEach(fn) {
  	  utils.forEach(this.handlers, function forEachHandler(h) {
  	    if (h !== null) {
  	      fn(h);
  	    }
  	  });
  	};

  	InterceptorManager_1 = InterceptorManager;
  	return InterceptorManager_1;
  }

  var normalizeHeaderName$1;
  var hasRequiredNormalizeHeaderName;

  function requireNormalizeHeaderName () {
  	if (hasRequiredNormalizeHeaderName) return normalizeHeaderName$1;
  	hasRequiredNormalizeHeaderName = 1;

  	var utils = requireUtils();

  	normalizeHeaderName$1 = function normalizeHeaderName(headers, normalizedName) {
  	  utils.forEach(headers, function processHeader(value, name) {
  	    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
  	      headers[normalizedName] = value;
  	      delete headers[name];
  	    }
  	  });
  	};
  	return normalizeHeaderName$1;
  }

  var AxiosError_1;
  var hasRequiredAxiosError;

  function requireAxiosError () {
  	if (hasRequiredAxiosError) return AxiosError_1;
  	hasRequiredAxiosError = 1;

  	var utils = requireUtils();

  	/**
  	 * Create an Error with the specified message, config, error code, request and response.
  	 *
  	 * @param {string} message The error message.
  	 * @param {string} [code] The error code (for example, 'ECONNABORTED').
  	 * @param {Object} [config] The config.
  	 * @param {Object} [request] The request.
  	 * @param {Object} [response] The response.
  	 * @returns {Error} The created error.
  	 */
  	function AxiosError(message, code, config, request, response) {
  	  Error.call(this);
  	  this.message = message;
  	  this.name = 'AxiosError';
  	  code && (this.code = code);
  	  config && (this.config = config);
  	  request && (this.request = request);
  	  response && (this.response = response);
  	}

  	utils.inherits(AxiosError, Error, {
  	  toJSON: function toJSON() {
  	    return {
  	      // Standard
  	      message: this.message,
  	      name: this.name,
  	      // Microsoft
  	      description: this.description,
  	      number: this.number,
  	      // Mozilla
  	      fileName: this.fileName,
  	      lineNumber: this.lineNumber,
  	      columnNumber: this.columnNumber,
  	      stack: this.stack,
  	      // Axios
  	      config: this.config,
  	      code: this.code,
  	      status: this.response && this.response.status ? this.response.status : null
  	    };
  	  }
  	});

  	var prototype = AxiosError.prototype;
  	var descriptors = {};

  	[
  	  'ERR_BAD_OPTION_VALUE',
  	  'ERR_BAD_OPTION',
  	  'ECONNABORTED',
  	  'ETIMEDOUT',
  	  'ERR_NETWORK',
  	  'ERR_FR_TOO_MANY_REDIRECTS',
  	  'ERR_DEPRECATED',
  	  'ERR_BAD_RESPONSE',
  	  'ERR_BAD_REQUEST',
  	  'ERR_CANCELED'
  	// eslint-disable-next-line func-names
  	].forEach(function(code) {
  	  descriptors[code] = {value: code};
  	});

  	Object.defineProperties(AxiosError, descriptors);
  	Object.defineProperty(prototype, 'isAxiosError', {value: true});

  	// eslint-disable-next-line func-names
  	AxiosError.from = function(error, code, config, request, response, customProps) {
  	  var axiosError = Object.create(prototype);

  	  utils.toFlatObject(error, axiosError, function filter(obj) {
  	    return obj !== Error.prototype;
  	  });

  	  AxiosError.call(axiosError, error.message, code, config, request, response);

  	  axiosError.name = error.name;

  	  customProps && Object.assign(axiosError, customProps);

  	  return axiosError;
  	};

  	AxiosError_1 = AxiosError;
  	return AxiosError_1;
  }

  var transitional;
  var hasRequiredTransitional;

  function requireTransitional () {
  	if (hasRequiredTransitional) return transitional;
  	hasRequiredTransitional = 1;

  	transitional = {
  	  silentJSONParsing: true,
  	  forcedJSONParsing: true,
  	  clarifyTimeoutError: false
  	};
  	return transitional;
  }

  var global$1 = (typeof global !== "undefined" ? global :
    typeof self !== "undefined" ? self :
    typeof window !== "undefined" ? window : {});

  var lookup = [];
  var revLookup = [];
  var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
  var inited = false;
  function init () {
    inited = true;
    var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (var i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }

    revLookup['-'.charCodeAt(0)] = 62;
    revLookup['_'.charCodeAt(0)] = 63;
  }

  function toByteArray (b64) {
    if (!inited) {
      init();
    }
    var i, j, l, tmp, placeHolders, arr;
    var len = b64.length;

    if (len % 4 > 0) {
      throw new Error('Invalid string. Length must be a multiple of 4')
    }

    // the number of equal signs (place holders)
    // if there are two placeholders, than the two characters before it
    // represent one byte
    // if there is only one, then the three characters before it represent 2 bytes
    // this is just a cheap hack to not do indexOf twice
    placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

    // base64 is 4/3 + up to two characters of the original data
    arr = new Arr(len * 3 / 4 - placeHolders);

    // if there are placeholders, only get up to the last complete 4 chars
    l = placeHolders > 0 ? len - 4 : len;

    var L = 0;

    for (i = 0, j = 0; i < l; i += 4, j += 3) {
      tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
      arr[L++] = (tmp >> 16) & 0xFF;
      arr[L++] = (tmp >> 8) & 0xFF;
      arr[L++] = tmp & 0xFF;
    }

    if (placeHolders === 2) {
      tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
      arr[L++] = tmp & 0xFF;
    } else if (placeHolders === 1) {
      tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
      arr[L++] = (tmp >> 8) & 0xFF;
      arr[L++] = tmp & 0xFF;
    }

    return arr
  }

  function tripletToBase64 (num) {
    return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
  }

  function encodeChunk (uint8, start, end) {
    var tmp;
    var output = [];
    for (var i = start; i < end; i += 3) {
      tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
      output.push(tripletToBase64(tmp));
    }
    return output.join('')
  }

  function fromByteArray (uint8) {
    if (!inited) {
      init();
    }
    var tmp;
    var len = uint8.length;
    var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
    var output = '';
    var parts = [];
    var maxChunkLength = 16383; // must be multiple of 3

    // go through the array every three bytes, we'll deal with trailing stuff later
    for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
      parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
    }

    // pad the end with zeros, but make sure to not forget the extra bytes
    if (extraBytes === 1) {
      tmp = uint8[len - 1];
      output += lookup[tmp >> 2];
      output += lookup[(tmp << 4) & 0x3F];
      output += '==';
    } else if (extraBytes === 2) {
      tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
      output += lookup[tmp >> 10];
      output += lookup[(tmp >> 4) & 0x3F];
      output += lookup[(tmp << 2) & 0x3F];
      output += '=';
    }

    parts.push(output);

    return parts.join('')
  }

  function read (buffer, offset, isLE, mLen, nBytes) {
    var e, m;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? (nBytes - 1) : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];

    i += d;

    e = s & ((1 << (-nBits)) - 1);
    s >>= (-nBits);
    nBits += eLen;
    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

    m = e & ((1 << (-nBits)) - 1);
    e >>= (-nBits);
    nBits += mLen;
    for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : ((s ? -1 : 1) * Infinity)
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
  }

  function write (buffer, value, offset, isLE, mLen, nBytes) {
    var e, m, c;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
    var i = isLE ? 0 : (nBytes - 1);
    var d = isLE ? 1 : -1;
    var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

    value = Math.abs(value);

    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }

      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }

    for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

    e = (e << mLen) | m;
    eLen += mLen;
    for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

    buffer[offset + i - d] |= s * 128;
  }

  var toString = {}.toString;

  var isArray = Array.isArray || function (arr) {
    return toString.call(arr) == '[object Array]';
  };

  /*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
   * @license  MIT
   */

  var INSPECT_MAX_BYTES = 50;

  /**
   * If `Buffer.TYPED_ARRAY_SUPPORT`:
   *   === true    Use Uint8Array implementation (fastest)
   *   === false   Use Object implementation (most compatible, even IE6)
   *
   * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
   * Opera 11.6+, iOS 4.2+.
   *
   * Due to various browser bugs, sometimes the Object implementation will be used even
   * when the browser supports typed arrays.
   *
   * Note:
   *
   *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
   *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
   *
   *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
   *
   *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
   *     incorrect length in some situations.

   * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
   * get the Object implementation, which is slower but behaves correctly.
   */
  Buffer$1.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
    ? global$1.TYPED_ARRAY_SUPPORT
    : true;

  /*
   * Export kMaxLength after typed array support is determined.
   */
  kMaxLength();

  function kMaxLength () {
    return Buffer$1.TYPED_ARRAY_SUPPORT
      ? 0x7fffffff
      : 0x3fffffff
  }

  function createBuffer (that, length) {
    if (kMaxLength() < length) {
      throw new RangeError('Invalid typed array length')
    }
    if (Buffer$1.TYPED_ARRAY_SUPPORT) {
      // Return an augmented `Uint8Array` instance, for best performance
      that = new Uint8Array(length);
      that.__proto__ = Buffer$1.prototype;
    } else {
      // Fallback: Return an object instance of the Buffer class
      if (that === null) {
        that = new Buffer$1(length);
      }
      that.length = length;
    }

    return that
  }

  /**
   * The Buffer constructor returns instances of `Uint8Array` that have their
   * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
   * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
   * and the `Uint8Array` methods. Square bracket notation works as expected -- it
   * returns a single octet.
   *
   * The `Uint8Array` prototype remains unmodified.
   */

  function Buffer$1 (arg, encodingOrOffset, length) {
    if (!Buffer$1.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer$1)) {
      return new Buffer$1(arg, encodingOrOffset, length)
    }

    // Common case.
    if (typeof arg === 'number') {
      if (typeof encodingOrOffset === 'string') {
        throw new Error(
          'If encoding is specified then the first argument must be a string'
        )
      }
      return allocUnsafe(this, arg)
    }
    return from(this, arg, encodingOrOffset, length)
  }

  Buffer$1.poolSize = 8192; // not used by this implementation

  // TODO: Legacy, not needed anymore. Remove in next major version.
  Buffer$1._augment = function (arr) {
    arr.__proto__ = Buffer$1.prototype;
    return arr
  };

  function from (that, value, encodingOrOffset, length) {
    if (typeof value === 'number') {
      throw new TypeError('"value" argument must not be a number')
    }

    if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
      return fromArrayBuffer(that, value, encodingOrOffset, length)
    }

    if (typeof value === 'string') {
      return fromString(that, value, encodingOrOffset)
    }

    return fromObject(that, value)
  }

  /**
   * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
   * if value is a number.
   * Buffer.from(str[, encoding])
   * Buffer.from(array)
   * Buffer.from(buffer)
   * Buffer.from(arrayBuffer[, byteOffset[, length]])
   **/
  Buffer$1.from = function (value, encodingOrOffset, length) {
    return from(null, value, encodingOrOffset, length)
  };

  if (Buffer$1.TYPED_ARRAY_SUPPORT) {
    Buffer$1.prototype.__proto__ = Uint8Array.prototype;
    Buffer$1.__proto__ = Uint8Array;
  }

  function assertSize (size) {
    if (typeof size !== 'number') {
      throw new TypeError('"size" argument must be a number')
    } else if (size < 0) {
      throw new RangeError('"size" argument must not be negative')
    }
  }

  function alloc (that, size, fill, encoding) {
    assertSize(size);
    if (size <= 0) {
      return createBuffer(that, size)
    }
    if (fill !== undefined) {
      // Only pay attention to encoding if it's a string. This
      // prevents accidentally sending in a number that would
      // be interpretted as a start offset.
      return typeof encoding === 'string'
        ? createBuffer(that, size).fill(fill, encoding)
        : createBuffer(that, size).fill(fill)
    }
    return createBuffer(that, size)
  }

  /**
   * Creates a new filled Buffer instance.
   * alloc(size[, fill[, encoding]])
   **/
  Buffer$1.alloc = function (size, fill, encoding) {
    return alloc(null, size, fill, encoding)
  };

  function allocUnsafe (that, size) {
    assertSize(size);
    that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
    if (!Buffer$1.TYPED_ARRAY_SUPPORT) {
      for (var i = 0; i < size; ++i) {
        that[i] = 0;
      }
    }
    return that
  }

  /**
   * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
   * */
  Buffer$1.allocUnsafe = function (size) {
    return allocUnsafe(null, size)
  };
  /**
   * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
   */
  Buffer$1.allocUnsafeSlow = function (size) {
    return allocUnsafe(null, size)
  };

  function fromString (that, string, encoding) {
    if (typeof encoding !== 'string' || encoding === '') {
      encoding = 'utf8';
    }

    if (!Buffer$1.isEncoding(encoding)) {
      throw new TypeError('"encoding" must be a valid string encoding')
    }

    var length = byteLength(string, encoding) | 0;
    that = createBuffer(that, length);

    var actual = that.write(string, encoding);

    if (actual !== length) {
      // Writing a hex string, for example, that contains invalid characters will
      // cause everything after the first invalid character to be ignored. (e.g.
      // 'abxxcd' will be treated as 'ab')
      that = that.slice(0, actual);
    }

    return that
  }

  function fromArrayLike (that, array) {
    var length = array.length < 0 ? 0 : checked(array.length) | 0;
    that = createBuffer(that, length);
    for (var i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }
    return that
  }

  function fromArrayBuffer (that, array, byteOffset, length) {
    array.byteLength; // this throws if `array` is not a valid ArrayBuffer

    if (byteOffset < 0 || array.byteLength < byteOffset) {
      throw new RangeError('\'offset\' is out of bounds')
    }

    if (array.byteLength < byteOffset + (length || 0)) {
      throw new RangeError('\'length\' is out of bounds')
    }

    if (byteOffset === undefined && length === undefined) {
      array = new Uint8Array(array);
    } else if (length === undefined) {
      array = new Uint8Array(array, byteOffset);
    } else {
      array = new Uint8Array(array, byteOffset, length);
    }

    if (Buffer$1.TYPED_ARRAY_SUPPORT) {
      // Return an augmented `Uint8Array` instance, for best performance
      that = array;
      that.__proto__ = Buffer$1.prototype;
    } else {
      // Fallback: Return an object instance of the Buffer class
      that = fromArrayLike(that, array);
    }
    return that
  }

  function fromObject (that, obj) {
    if (internalIsBuffer(obj)) {
      var len = checked(obj.length) | 0;
      that = createBuffer(that, len);

      if (that.length === 0) {
        return that
      }

      obj.copy(that, 0, 0, len);
      return that
    }

    if (obj) {
      if ((typeof ArrayBuffer !== 'undefined' &&
          obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
        if (typeof obj.length !== 'number' || isnan(obj.length)) {
          return createBuffer(that, 0)
        }
        return fromArrayLike(that, obj)
      }

      if (obj.type === 'Buffer' && isArray(obj.data)) {
        return fromArrayLike(that, obj.data)
      }
    }

    throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
  }

  function checked (length) {
    // Note: cannot use `length < kMaxLength()` here because that fails when
    // length is NaN (which is otherwise coerced to zero.)
    if (length >= kMaxLength()) {
      throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                           'size: 0x' + kMaxLength().toString(16) + ' bytes')
    }
    return length | 0
  }
  Buffer$1.isBuffer = isBuffer;
  function internalIsBuffer (b) {
    return !!(b != null && b._isBuffer)
  }

  Buffer$1.compare = function compare (a, b) {
    if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
      throw new TypeError('Arguments must be Buffers')
    }

    if (a === b) return 0

    var x = a.length;
    var y = b.length;

    for (var i = 0, len = Math.min(x, y); i < len; ++i) {
      if (a[i] !== b[i]) {
        x = a[i];
        y = b[i];
        break
      }
    }

    if (x < y) return -1
    if (y < x) return 1
    return 0
  };

  Buffer$1.isEncoding = function isEncoding (encoding) {
    switch (String(encoding).toLowerCase()) {
      case 'hex':
      case 'utf8':
      case 'utf-8':
      case 'ascii':
      case 'latin1':
      case 'binary':
      case 'base64':
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return true
      default:
        return false
    }
  };

  Buffer$1.concat = function concat (list, length) {
    if (!isArray(list)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }

    if (list.length === 0) {
      return Buffer$1.alloc(0)
    }

    var i;
    if (length === undefined) {
      length = 0;
      for (i = 0; i < list.length; ++i) {
        length += list[i].length;
      }
    }

    var buffer = Buffer$1.allocUnsafe(length);
    var pos = 0;
    for (i = 0; i < list.length; ++i) {
      var buf = list[i];
      if (!internalIsBuffer(buf)) {
        throw new TypeError('"list" argument must be an Array of Buffers')
      }
      buf.copy(buffer, pos);
      pos += buf.length;
    }
    return buffer
  };

  function byteLength (string, encoding) {
    if (internalIsBuffer(string)) {
      return string.length
    }
    if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
        (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
      return string.byteLength
    }
    if (typeof string !== 'string') {
      string = '' + string;
    }

    var len = string.length;
    if (len === 0) return 0

    // Use a for loop to avoid recursion
    var loweredCase = false;
    for (;;) {
      switch (encoding) {
        case 'ascii':
        case 'latin1':
        case 'binary':
          return len
        case 'utf8':
        case 'utf-8':
        case undefined:
          return utf8ToBytes(string).length
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return len * 2
        case 'hex':
          return len >>> 1
        case 'base64':
          return base64ToBytes(string).length
        default:
          if (loweredCase) return utf8ToBytes(string).length // assume utf8
          encoding = ('' + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer$1.byteLength = byteLength;

  function slowToString (encoding, start, end) {
    var loweredCase = false;

    // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
    // property of a typed array.

    // This behaves neither like String nor Uint8Array in that we set start/end
    // to their upper/lower bounds if the value passed is out of range.
    // undefined is handled specially as per ECMA-262 6th Edition,
    // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
    if (start === undefined || start < 0) {
      start = 0;
    }
    // Return early if start > this.length. Done here to prevent potential uint32
    // coercion fail below.
    if (start > this.length) {
      return ''
    }

    if (end === undefined || end > this.length) {
      end = this.length;
    }

    if (end <= 0) {
      return ''
    }

    // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
    end >>>= 0;
    start >>>= 0;

    if (end <= start) {
      return ''
    }

    if (!encoding) encoding = 'utf8';

    while (true) {
      switch (encoding) {
        case 'hex':
          return hexSlice(this, start, end)

        case 'utf8':
        case 'utf-8':
          return utf8Slice(this, start, end)

        case 'ascii':
          return asciiSlice(this, start, end)

        case 'latin1':
        case 'binary':
          return latin1Slice(this, start, end)

        case 'base64':
          return base64Slice(this, start, end)

        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return utf16leSlice(this, start, end)

        default:
          if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
          encoding = (encoding + '').toLowerCase();
          loweredCase = true;
      }
    }
  }

  // The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
  // Buffer instances.
  Buffer$1.prototype._isBuffer = true;

  function swap (b, n, m) {
    var i = b[n];
    b[n] = b[m];
    b[m] = i;
  }

  Buffer$1.prototype.swap16 = function swap16 () {
    var len = this.length;
    if (len % 2 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 16-bits')
    }
    for (var i = 0; i < len; i += 2) {
      swap(this, i, i + 1);
    }
    return this
  };

  Buffer$1.prototype.swap32 = function swap32 () {
    var len = this.length;
    if (len % 4 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 32-bits')
    }
    for (var i = 0; i < len; i += 4) {
      swap(this, i, i + 3);
      swap(this, i + 1, i + 2);
    }
    return this
  };

  Buffer$1.prototype.swap64 = function swap64 () {
    var len = this.length;
    if (len % 8 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 64-bits')
    }
    for (var i = 0; i < len; i += 8) {
      swap(this, i, i + 7);
      swap(this, i + 1, i + 6);
      swap(this, i + 2, i + 5);
      swap(this, i + 3, i + 4);
    }
    return this
  };

  Buffer$1.prototype.toString = function toString () {
    var length = this.length | 0;
    if (length === 0) return ''
    if (arguments.length === 0) return utf8Slice(this, 0, length)
    return slowToString.apply(this, arguments)
  };

  Buffer$1.prototype.equals = function equals (b) {
    if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
    if (this === b) return true
    return Buffer$1.compare(this, b) === 0
  };

  Buffer$1.prototype.inspect = function inspect () {
    var str = '';
    var max = INSPECT_MAX_BYTES;
    if (this.length > 0) {
      str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
      if (this.length > max) str += ' ... ';
    }
    return '<Buffer ' + str + '>'
  };

  Buffer$1.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
    if (!internalIsBuffer(target)) {
      throw new TypeError('Argument must be a Buffer')
    }

    if (start === undefined) {
      start = 0;
    }
    if (end === undefined) {
      end = target ? target.length : 0;
    }
    if (thisStart === undefined) {
      thisStart = 0;
    }
    if (thisEnd === undefined) {
      thisEnd = this.length;
    }

    if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
      throw new RangeError('out of range index')
    }

    if (thisStart >= thisEnd && start >= end) {
      return 0
    }
    if (thisStart >= thisEnd) {
      return -1
    }
    if (start >= end) {
      return 1
    }

    start >>>= 0;
    end >>>= 0;
    thisStart >>>= 0;
    thisEnd >>>= 0;

    if (this === target) return 0

    var x = thisEnd - thisStart;
    var y = end - start;
    var len = Math.min(x, y);

    var thisCopy = this.slice(thisStart, thisEnd);
    var targetCopy = target.slice(start, end);

    for (var i = 0; i < len; ++i) {
      if (thisCopy[i] !== targetCopy[i]) {
        x = thisCopy[i];
        y = targetCopy[i];
        break
      }
    }

    if (x < y) return -1
    if (y < x) return 1
    return 0
  };

  // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
  // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
  //
  // Arguments:
  // - buffer - a Buffer to search
  // - val - a string, Buffer, or number
  // - byteOffset - an index into `buffer`; will be clamped to an int32
  // - encoding - an optional encoding, relevant is val is a string
  // - dir - true for indexOf, false for lastIndexOf
  function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
    // Empty buffer means no match
    if (buffer.length === 0) return -1

    // Normalize byteOffset
    if (typeof byteOffset === 'string') {
      encoding = byteOffset;
      byteOffset = 0;
    } else if (byteOffset > 0x7fffffff) {
      byteOffset = 0x7fffffff;
    } else if (byteOffset < -0x80000000) {
      byteOffset = -0x80000000;
    }
    byteOffset = +byteOffset;  // Coerce to Number.
    if (isNaN(byteOffset)) {
      // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
      byteOffset = dir ? 0 : (buffer.length - 1);
    }

    // Normalize byteOffset: negative offsets start from the end of the buffer
    if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
    if (byteOffset >= buffer.length) {
      if (dir) return -1
      else byteOffset = buffer.length - 1;
    } else if (byteOffset < 0) {
      if (dir) byteOffset = 0;
      else return -1
    }

    // Normalize val
    if (typeof val === 'string') {
      val = Buffer$1.from(val, encoding);
    }

    // Finally, search either indexOf (if dir is true) or lastIndexOf
    if (internalIsBuffer(val)) {
      // Special case: looking for empty string/buffer always fails
      if (val.length === 0) {
        return -1
      }
      return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
    } else if (typeof val === 'number') {
      val = val & 0xFF; // Search for a byte value [0-255]
      if (Buffer$1.TYPED_ARRAY_SUPPORT &&
          typeof Uint8Array.prototype.indexOf === 'function') {
        if (dir) {
          return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
        } else {
          return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
        }
      }
      return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
    }

    throw new TypeError('val must be string, number or Buffer')
  }

  function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
    var indexSize = 1;
    var arrLength = arr.length;
    var valLength = val.length;

    if (encoding !== undefined) {
      encoding = String(encoding).toLowerCase();
      if (encoding === 'ucs2' || encoding === 'ucs-2' ||
          encoding === 'utf16le' || encoding === 'utf-16le') {
        if (arr.length < 2 || val.length < 2) {
          return -1
        }
        indexSize = 2;
        arrLength /= 2;
        valLength /= 2;
        byteOffset /= 2;
      }
    }

    function read (buf, i) {
      if (indexSize === 1) {
        return buf[i]
      } else {
        return buf.readUInt16BE(i * indexSize)
      }
    }

    var i;
    if (dir) {
      var foundIndex = -1;
      for (i = byteOffset; i < arrLength; i++) {
        if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
          if (foundIndex === -1) foundIndex = i;
          if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
        } else {
          if (foundIndex !== -1) i -= i - foundIndex;
          foundIndex = -1;
        }
      }
    } else {
      if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
      for (i = byteOffset; i >= 0; i--) {
        var found = true;
        for (var j = 0; j < valLength; j++) {
          if (read(arr, i + j) !== read(val, j)) {
            found = false;
            break
          }
        }
        if (found) return i
      }
    }

    return -1
  }

  Buffer$1.prototype.includes = function includes (val, byteOffset, encoding) {
    return this.indexOf(val, byteOffset, encoding) !== -1
  };

  Buffer$1.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
  };

  Buffer$1.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
  };

  function hexWrite (buf, string, offset, length) {
    offset = Number(offset) || 0;
    var remaining = buf.length - offset;
    if (!length) {
      length = remaining;
    } else {
      length = Number(length);
      if (length > remaining) {
        length = remaining;
      }
    }

    // must be an even number of digits
    var strLen = string.length;
    if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

    if (length > strLen / 2) {
      length = strLen / 2;
    }
    for (var i = 0; i < length; ++i) {
      var parsed = parseInt(string.substr(i * 2, 2), 16);
      if (isNaN(parsed)) return i
      buf[offset + i] = parsed;
    }
    return i
  }

  function utf8Write (buf, string, offset, length) {
    return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
  }

  function asciiWrite (buf, string, offset, length) {
    return blitBuffer(asciiToBytes(string), buf, offset, length)
  }

  function latin1Write (buf, string, offset, length) {
    return asciiWrite(buf, string, offset, length)
  }

  function base64Write (buf, string, offset, length) {
    return blitBuffer(base64ToBytes(string), buf, offset, length)
  }

  function ucs2Write (buf, string, offset, length) {
    return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
  }

  Buffer$1.prototype.write = function write (string, offset, length, encoding) {
    // Buffer#write(string)
    if (offset === undefined) {
      encoding = 'utf8';
      length = this.length;
      offset = 0;
    // Buffer#write(string, encoding)
    } else if (length === undefined && typeof offset === 'string') {
      encoding = offset;
      length = this.length;
      offset = 0;
    // Buffer#write(string, offset[, length][, encoding])
    } else if (isFinite(offset)) {
      offset = offset | 0;
      if (isFinite(length)) {
        length = length | 0;
        if (encoding === undefined) encoding = 'utf8';
      } else {
        encoding = length;
        length = undefined;
      }
    // legacy write(string, encoding, offset, length) - remove in v0.13
    } else {
      throw new Error(
        'Buffer.write(string, encoding, offset[, length]) is no longer supported'
      )
    }

    var remaining = this.length - offset;
    if (length === undefined || length > remaining) length = remaining;

    if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
      throw new RangeError('Attempt to write outside buffer bounds')
    }

    if (!encoding) encoding = 'utf8';

    var loweredCase = false;
    for (;;) {
      switch (encoding) {
        case 'hex':
          return hexWrite(this, string, offset, length)

        case 'utf8':
        case 'utf-8':
          return utf8Write(this, string, offset, length)

        case 'ascii':
          return asciiWrite(this, string, offset, length)

        case 'latin1':
        case 'binary':
          return latin1Write(this, string, offset, length)

        case 'base64':
          // Warning: maxLength not taken into account in base64Write
          return base64Write(this, string, offset, length)

        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return ucs2Write(this, string, offset, length)

        default:
          if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
          encoding = ('' + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  };

  Buffer$1.prototype.toJSON = function toJSON () {
    return {
      type: 'Buffer',
      data: Array.prototype.slice.call(this._arr || this, 0)
    }
  };

  function base64Slice (buf, start, end) {
    if (start === 0 && end === buf.length) {
      return fromByteArray(buf)
    } else {
      return fromByteArray(buf.slice(start, end))
    }
  }

  function utf8Slice (buf, start, end) {
    end = Math.min(buf.length, end);
    var res = [];

    var i = start;
    while (i < end) {
      var firstByte = buf[i];
      var codePoint = null;
      var bytesPerSequence = (firstByte > 0xEF) ? 4
        : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
        : 1;

      if (i + bytesPerSequence <= end) {
        var secondByte, thirdByte, fourthByte, tempCodePoint;

        switch (bytesPerSequence) {
          case 1:
            if (firstByte < 0x80) {
              codePoint = firstByte;
            }
            break
          case 2:
            secondByte = buf[i + 1];
            if ((secondByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
              if (tempCodePoint > 0x7F) {
                codePoint = tempCodePoint;
              }
            }
            break
          case 3:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
              if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                codePoint = tempCodePoint;
              }
            }
            break
          case 4:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            fourthByte = buf[i + 3];
            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
              if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                codePoint = tempCodePoint;
              }
            }
        }
      }

      if (codePoint === null) {
        // we did not generate a valid codePoint so insert a
        // replacement char (U+FFFD) and advance only 1 byte
        codePoint = 0xFFFD;
        bytesPerSequence = 1;
      } else if (codePoint > 0xFFFF) {
        // encode to utf16 (surrogate pair dance)
        codePoint -= 0x10000;
        res.push(codePoint >>> 10 & 0x3FF | 0xD800);
        codePoint = 0xDC00 | codePoint & 0x3FF;
      }

      res.push(codePoint);
      i += bytesPerSequence;
    }

    return decodeCodePointsArray(res)
  }

  // Based on http://stackoverflow.com/a/22747272/680742, the browser with
  // the lowest limit is Chrome, with 0x10000 args.
  // We go 1 magnitude less, for safety
  var MAX_ARGUMENTS_LENGTH = 0x1000;

  function decodeCodePointsArray (codePoints) {
    var len = codePoints.length;
    if (len <= MAX_ARGUMENTS_LENGTH) {
      return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
    }

    // Decode in chunks to avoid "call stack size exceeded".
    var res = '';
    var i = 0;
    while (i < len) {
      res += String.fromCharCode.apply(
        String,
        codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
      );
    }
    return res
  }

  function asciiSlice (buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);

    for (var i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i] & 0x7F);
    }
    return ret
  }

  function latin1Slice (buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);

    for (var i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i]);
    }
    return ret
  }

  function hexSlice (buf, start, end) {
    var len = buf.length;

    if (!start || start < 0) start = 0;
    if (!end || end < 0 || end > len) end = len;

    var out = '';
    for (var i = start; i < end; ++i) {
      out += toHex(buf[i]);
    }
    return out
  }

  function utf16leSlice (buf, start, end) {
    var bytes = buf.slice(start, end);
    var res = '';
    for (var i = 0; i < bytes.length; i += 2) {
      res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
    }
    return res
  }

  Buffer$1.prototype.slice = function slice (start, end) {
    var len = this.length;
    start = ~~start;
    end = end === undefined ? len : ~~end;

    if (start < 0) {
      start += len;
      if (start < 0) start = 0;
    } else if (start > len) {
      start = len;
    }

    if (end < 0) {
      end += len;
      if (end < 0) end = 0;
    } else if (end > len) {
      end = len;
    }

    if (end < start) end = start;

    var newBuf;
    if (Buffer$1.TYPED_ARRAY_SUPPORT) {
      newBuf = this.subarray(start, end);
      newBuf.__proto__ = Buffer$1.prototype;
    } else {
      var sliceLen = end - start;
      newBuf = new Buffer$1(sliceLen, undefined);
      for (var i = 0; i < sliceLen; ++i) {
        newBuf[i] = this[i + start];
      }
    }

    return newBuf
  };

  /*
   * Need to make sure that buffer isn't trying to write out of bounds.
   */
  function checkOffset (offset, ext, length) {
    if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
    if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
  }

  Buffer$1.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) checkOffset(offset, byteLength, this.length);

    var val = this[offset];
    var mul = 1;
    var i = 0;
    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }

    return val
  };

  Buffer$1.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      checkOffset(offset, byteLength, this.length);
    }

    var val = this[offset + --byteLength];
    var mul = 1;
    while (byteLength > 0 && (mul *= 0x100)) {
      val += this[offset + --byteLength] * mul;
    }

    return val
  };

  Buffer$1.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 1, this.length);
    return this[offset]
  };

  Buffer$1.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    return this[offset] | (this[offset + 1] << 8)
  };

  Buffer$1.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    return (this[offset] << 8) | this[offset + 1]
  };

  Buffer$1.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);

    return ((this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16)) +
        (this[offset + 3] * 0x1000000)
  };

  Buffer$1.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);

    return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
  };

  Buffer$1.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) checkOffset(offset, byteLength, this.length);

    var val = this[offset];
    var mul = 1;
    var i = 0;
    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }
    mul *= 0x80;

    if (val >= mul) val -= Math.pow(2, 8 * byteLength);

    return val
  };

  Buffer$1.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) checkOffset(offset, byteLength, this.length);

    var i = byteLength;
    var mul = 1;
    var val = this[offset + --i];
    while (i > 0 && (mul *= 0x100)) {
      val += this[offset + --i] * mul;
    }
    mul *= 0x80;

    if (val >= mul) val -= Math.pow(2, 8 * byteLength);

    return val
  };

  Buffer$1.prototype.readInt8 = function readInt8 (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 1, this.length);
    if (!(this[offset] & 0x80)) return (this[offset])
    return ((0xff - this[offset] + 1) * -1)
  };

  Buffer$1.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    var val = this[offset] | (this[offset + 1] << 8);
    return (val & 0x8000) ? val | 0xFFFF0000 : val
  };

  Buffer$1.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    var val = this[offset + 1] | (this[offset] << 8);
    return (val & 0x8000) ? val | 0xFFFF0000 : val
  };

  Buffer$1.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);

    return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
  };

  Buffer$1.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);

    return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
  };

  Buffer$1.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return read(this, offset, true, 23, 4)
  };

  Buffer$1.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return read(this, offset, false, 23, 4)
  };

  Buffer$1.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 8, this.length);
    return read(this, offset, true, 52, 8)
  };

  Buffer$1.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 8, this.length);
    return read(this, offset, false, 52, 8)
  };

  function checkInt (buf, value, offset, ext, max, min) {
    if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
    if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
    if (offset + ext > buf.length) throw new RangeError('Index out of range')
  }

  Buffer$1.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      var maxBytes = Math.pow(2, 8 * byteLength) - 1;
      checkInt(this, value, offset, byteLength, maxBytes, 0);
    }

    var mul = 1;
    var i = 0;
    this[offset] = value & 0xFF;
    while (++i < byteLength && (mul *= 0x100)) {
      this[offset + i] = (value / mul) & 0xFF;
    }

    return offset + byteLength
  };

  Buffer$1.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      var maxBytes = Math.pow(2, 8 * byteLength) - 1;
      checkInt(this, value, offset, byteLength, maxBytes, 0);
    }

    var i = byteLength - 1;
    var mul = 1;
    this[offset + i] = value & 0xFF;
    while (--i >= 0 && (mul *= 0x100)) {
      this[offset + i] = (value / mul) & 0xFF;
    }

    return offset + byteLength
  };

  Buffer$1.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
    if (!Buffer$1.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
    this[offset] = (value & 0xff);
    return offset + 1
  };

  function objectWriteUInt16 (buf, value, offset, littleEndian) {
    if (value < 0) value = 0xffff + value + 1;
    for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
      buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
        (littleEndian ? i : 1 - i) * 8;
    }
  }

  Buffer$1.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
    if (Buffer$1.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value & 0xff);
      this[offset + 1] = (value >>> 8);
    } else {
      objectWriteUInt16(this, value, offset, true);
    }
    return offset + 2
  };

  Buffer$1.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
    if (Buffer$1.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 8);
      this[offset + 1] = (value & 0xff);
    } else {
      objectWriteUInt16(this, value, offset, false);
    }
    return offset + 2
  };

  function objectWriteUInt32 (buf, value, offset, littleEndian) {
    if (value < 0) value = 0xffffffff + value + 1;
    for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
      buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
    }
  }

  Buffer$1.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
    if (Buffer$1.TYPED_ARRAY_SUPPORT) {
      this[offset + 3] = (value >>> 24);
      this[offset + 2] = (value >>> 16);
      this[offset + 1] = (value >>> 8);
      this[offset] = (value & 0xff);
    } else {
      objectWriteUInt32(this, value, offset, true);
    }
    return offset + 4
  };

  Buffer$1.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
    if (Buffer$1.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 24);
      this[offset + 1] = (value >>> 16);
      this[offset + 2] = (value >>> 8);
      this[offset + 3] = (value & 0xff);
    } else {
      objectWriteUInt32(this, value, offset, false);
    }
    return offset + 4
  };

  Buffer$1.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      var limit = Math.pow(2, 8 * byteLength - 1);

      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }

    var i = 0;
    var mul = 1;
    var sub = 0;
    this[offset] = value & 0xFF;
    while (++i < byteLength && (mul *= 0x100)) {
      if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
        sub = 1;
      }
      this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
    }

    return offset + byteLength
  };

  Buffer$1.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      var limit = Math.pow(2, 8 * byteLength - 1);

      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }

    var i = byteLength - 1;
    var mul = 1;
    var sub = 0;
    this[offset + i] = value & 0xFF;
    while (--i >= 0 && (mul *= 0x100)) {
      if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
        sub = 1;
      }
      this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
    }

    return offset + byteLength
  };

  Buffer$1.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
    if (!Buffer$1.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
    if (value < 0) value = 0xff + value + 1;
    this[offset] = (value & 0xff);
    return offset + 1
  };

  Buffer$1.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    if (Buffer$1.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value & 0xff);
      this[offset + 1] = (value >>> 8);
    } else {
      objectWriteUInt16(this, value, offset, true);
    }
    return offset + 2
  };

  Buffer$1.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    if (Buffer$1.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 8);
      this[offset + 1] = (value & 0xff);
    } else {
      objectWriteUInt16(this, value, offset, false);
    }
    return offset + 2
  };

  Buffer$1.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    if (Buffer$1.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value & 0xff);
      this[offset + 1] = (value >>> 8);
      this[offset + 2] = (value >>> 16);
      this[offset + 3] = (value >>> 24);
    } else {
      objectWriteUInt32(this, value, offset, true);
    }
    return offset + 4
  };

  Buffer$1.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    if (value < 0) value = 0xffffffff + value + 1;
    if (Buffer$1.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 24);
      this[offset + 1] = (value >>> 16);
      this[offset + 2] = (value >>> 8);
      this[offset + 3] = (value & 0xff);
    } else {
      objectWriteUInt32(this, value, offset, false);
    }
    return offset + 4
  };

  function checkIEEE754 (buf, value, offset, ext, max, min) {
    if (offset + ext > buf.length) throw new RangeError('Index out of range')
    if (offset < 0) throw new RangeError('Index out of range')
  }

  function writeFloat (buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 4);
    }
    write(buf, value, offset, littleEndian, 23, 4);
    return offset + 4
  }

  Buffer$1.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
    return writeFloat(this, value, offset, true, noAssert)
  };

  Buffer$1.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
    return writeFloat(this, value, offset, false, noAssert)
  };

  function writeDouble (buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 8);
    }
    write(buf, value, offset, littleEndian, 52, 8);
    return offset + 8
  }

  Buffer$1.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
    return writeDouble(this, value, offset, true, noAssert)
  };

  Buffer$1.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
    return writeDouble(this, value, offset, false, noAssert)
  };

  // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
  Buffer$1.prototype.copy = function copy (target, targetStart, start, end) {
    if (!start) start = 0;
    if (!end && end !== 0) end = this.length;
    if (targetStart >= target.length) targetStart = target.length;
    if (!targetStart) targetStart = 0;
    if (end > 0 && end < start) end = start;

    // Copy 0 bytes; we're done
    if (end === start) return 0
    if (target.length === 0 || this.length === 0) return 0

    // Fatal error conditions
    if (targetStart < 0) {
      throw new RangeError('targetStart out of bounds')
    }
    if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
    if (end < 0) throw new RangeError('sourceEnd out of bounds')

    // Are we oob?
    if (end > this.length) end = this.length;
    if (target.length - targetStart < end - start) {
      end = target.length - targetStart + start;
    }

    var len = end - start;
    var i;

    if (this === target && start < targetStart && targetStart < end) {
      // descending copy from end
      for (i = len - 1; i >= 0; --i) {
        target[i + targetStart] = this[i + start];
      }
    } else if (len < 1000 || !Buffer$1.TYPED_ARRAY_SUPPORT) {
      // ascending copy from start
      for (i = 0; i < len; ++i) {
        target[i + targetStart] = this[i + start];
      }
    } else {
      Uint8Array.prototype.set.call(
        target,
        this.subarray(start, start + len),
        targetStart
      );
    }

    return len
  };

  // Usage:
  //    buffer.fill(number[, offset[, end]])
  //    buffer.fill(buffer[, offset[, end]])
  //    buffer.fill(string[, offset[, end]][, encoding])
  Buffer$1.prototype.fill = function fill (val, start, end, encoding) {
    // Handle string cases:
    if (typeof val === 'string') {
      if (typeof start === 'string') {
        encoding = start;
        start = 0;
        end = this.length;
      } else if (typeof end === 'string') {
        encoding = end;
        end = this.length;
      }
      if (val.length === 1) {
        var code = val.charCodeAt(0);
        if (code < 256) {
          val = code;
        }
      }
      if (encoding !== undefined && typeof encoding !== 'string') {
        throw new TypeError('encoding must be a string')
      }
      if (typeof encoding === 'string' && !Buffer$1.isEncoding(encoding)) {
        throw new TypeError('Unknown encoding: ' + encoding)
      }
    } else if (typeof val === 'number') {
      val = val & 255;
    }

    // Invalid ranges are not set to a default, so can range check early.
    if (start < 0 || this.length < start || this.length < end) {
      throw new RangeError('Out of range index')
    }

    if (end <= start) {
      return this
    }

    start = start >>> 0;
    end = end === undefined ? this.length : end >>> 0;

    if (!val) val = 0;

    var i;
    if (typeof val === 'number') {
      for (i = start; i < end; ++i) {
        this[i] = val;
      }
    } else {
      var bytes = internalIsBuffer(val)
        ? val
        : utf8ToBytes(new Buffer$1(val, encoding).toString());
      var len = bytes.length;
      for (i = 0; i < end - start; ++i) {
        this[i + start] = bytes[i % len];
      }
    }

    return this
  };

  // HELPER FUNCTIONS
  // ================

  var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

  function base64clean (str) {
    // Node strips out invalid characters like \n and \t from the string, base64-js does not
    str = stringtrim(str).replace(INVALID_BASE64_RE, '');
    // Node converts strings with length < 2 to ''
    if (str.length < 2) return ''
    // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
    while (str.length % 4 !== 0) {
      str = str + '=';
    }
    return str
  }

  function stringtrim (str) {
    if (str.trim) return str.trim()
    return str.replace(/^\s+|\s+$/g, '')
  }

  function toHex (n) {
    if (n < 16) return '0' + n.toString(16)
    return n.toString(16)
  }

  function utf8ToBytes (string, units) {
    units = units || Infinity;
    var codePoint;
    var length = string.length;
    var leadSurrogate = null;
    var bytes = [];

    for (var i = 0; i < length; ++i) {
      codePoint = string.charCodeAt(i);

      // is surrogate component
      if (codePoint > 0xD7FF && codePoint < 0xE000) {
        // last char was a lead
        if (!leadSurrogate) {
          // no lead yet
          if (codePoint > 0xDBFF) {
            // unexpected trail
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            continue
          } else if (i + 1 === length) {
            // unpaired lead
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            continue
          }

          // valid lead
          leadSurrogate = codePoint;

          continue
        }

        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          leadSurrogate = codePoint;
          continue
        }

        // valid surrogate pair
        codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
      } else if (leadSurrogate) {
        // valid bmp char, but last char was a lead
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
      }

      leadSurrogate = null;

      // encode utf8
      if (codePoint < 0x80) {
        if ((units -= 1) < 0) break
        bytes.push(codePoint);
      } else if (codePoint < 0x800) {
        if ((units -= 2) < 0) break
        bytes.push(
          codePoint >> 0x6 | 0xC0,
          codePoint & 0x3F | 0x80
        );
      } else if (codePoint < 0x10000) {
        if ((units -= 3) < 0) break
        bytes.push(
          codePoint >> 0xC | 0xE0,
          codePoint >> 0x6 & 0x3F | 0x80,
          codePoint & 0x3F | 0x80
        );
      } else if (codePoint < 0x110000) {
        if ((units -= 4) < 0) break
        bytes.push(
          codePoint >> 0x12 | 0xF0,
          codePoint >> 0xC & 0x3F | 0x80,
          codePoint >> 0x6 & 0x3F | 0x80,
          codePoint & 0x3F | 0x80
        );
      } else {
        throw new Error('Invalid code point')
      }
    }

    return bytes
  }

  function asciiToBytes (str) {
    var byteArray = [];
    for (var i = 0; i < str.length; ++i) {
      // Node's code seems to be doing this and not & 0x7F..
      byteArray.push(str.charCodeAt(i) & 0xFF);
    }
    return byteArray
  }

  function utf16leToBytes (str, units) {
    var c, hi, lo;
    var byteArray = [];
    for (var i = 0; i < str.length; ++i) {
      if ((units -= 2) < 0) break

      c = str.charCodeAt(i);
      hi = c >> 8;
      lo = c % 256;
      byteArray.push(lo);
      byteArray.push(hi);
    }

    return byteArray
  }


  function base64ToBytes (str) {
    return toByteArray(base64clean(str))
  }

  function blitBuffer (src, dst, offset, length) {
    for (var i = 0; i < length; ++i) {
      if ((i + offset >= dst.length) || (i >= src.length)) break
      dst[i + offset] = src[i];
    }
    return i
  }

  function isnan (val) {
    return val !== val // eslint-disable-line no-self-compare
  }


  // the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
  // The _isBuffer check is for Safari 5-7 support, because it's missing
  // Object.prototype.constructor. Remove this eventually
  function isBuffer(obj) {
    return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
  }

  function isFastBuffer (obj) {
    return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
  }

  // For Node v0.10 support. Remove this eventually.
  function isSlowBuffer (obj) {
    return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
  }

  var utils$1 = requireUtils();

  /**
   * Convert a data object to FormData
   * @param {Object} obj
   * @param {?Object} [formData]
   * @returns {Object}
   **/

  function toFormData$1(obj, formData) {
    // eslint-disable-next-line no-param-reassign
    formData = formData || new FormData();

    var stack = [];

    function convertValue(value) {
      if (value === null) return '';

      if (utils$1.isDate(value)) {
        return value.toISOString();
      }

      if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
        return typeof Blob === 'function' ? new Blob([value]) : Buffer$1.from(value);
      }

      return value;
    }

    function build(data, parentKey) {
      if (utils$1.isPlainObject(data) || utils$1.isArray(data)) {
        if (stack.indexOf(data) !== -1) {
          throw Error('Circular reference detected in ' + parentKey);
        }

        stack.push(data);

        utils$1.forEach(data, function each(value, key) {
          if (utils$1.isUndefined(value)) return;
          var fullKey = parentKey ? parentKey + '.' + key : key;
          var arr;

          if (value && !parentKey && typeof value === 'object') {
            if (utils$1.endsWith(key, '{}')) {
              // eslint-disable-next-line no-param-reassign
              value = JSON.stringify(value);
            } else if (utils$1.endsWith(key, '[]') && (arr = utils$1.toArray(value))) {
              // eslint-disable-next-line func-names
              arr.forEach(function(el) {
                !utils$1.isUndefined(el) && formData.append(fullKey, convertValue(el));
              });
              return;
            }
          }

          build(value, fullKey);
        });

        stack.pop();
      } else {
        formData.append(parentKey, convertValue(data));
      }
    }

    build(obj);

    return formData;
  }

  module.exports = toFormData$1;

  var toFormData$2 = /*#__PURE__*/Object.freeze({
    __proto__: null
  });

  var require$$9 = /*@__PURE__*/getAugmentedNamespace(toFormData$2);

  var settle;
  var hasRequiredSettle;

  function requireSettle () {
  	if (hasRequiredSettle) return settle;
  	hasRequiredSettle = 1;

  	var AxiosError = requireAxiosError();

  	/**
  	 * Resolve or reject a Promise based on response status.
  	 *
  	 * @param {Function} resolve A function that resolves the promise.
  	 * @param {Function} reject A function that rejects the promise.
  	 * @param {object} response The response.
  	 */
  	settle = function settle(resolve, reject, response) {
  	  var validateStatus = response.config.validateStatus;
  	  if (!response.status || !validateStatus || validateStatus(response.status)) {
  	    resolve(response);
  	  } else {
  	    reject(new AxiosError(
  	      'Request failed with status code ' + response.status,
  	      [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
  	      response.config,
  	      response.request,
  	      response
  	    ));
  	  }
  	};
  	return settle;
  }

  var cookies;
  var hasRequiredCookies;

  function requireCookies () {
  	if (hasRequiredCookies) return cookies;
  	hasRequiredCookies = 1;

  	var utils = requireUtils();

  	cookies = (
  	  utils.isStandardBrowserEnv() ?

  	  // Standard browser envs support document.cookie
  	    (function standardBrowserEnv() {
  	      return {
  	        write: function write(name, value, expires, path, domain, secure) {
  	          var cookie = [];
  	          cookie.push(name + '=' + encodeURIComponent(value));

  	          if (utils.isNumber(expires)) {
  	            cookie.push('expires=' + new Date(expires).toGMTString());
  	          }

  	          if (utils.isString(path)) {
  	            cookie.push('path=' + path);
  	          }

  	          if (utils.isString(domain)) {
  	            cookie.push('domain=' + domain);
  	          }

  	          if (secure === true) {
  	            cookie.push('secure');
  	          }

  	          document.cookie = cookie.join('; ');
  	        },

  	        read: function read(name) {
  	          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  	          return (match ? decodeURIComponent(match[3]) : null);
  	        },

  	        remove: function remove(name) {
  	          this.write(name, '', Date.now() - 86400000);
  	        }
  	      };
  	    })() :

  	  // Non standard browser env (web workers, react-native) lack needed support.
  	    (function nonStandardBrowserEnv() {
  	      return {
  	        write: function write() {},
  	        read: function read() { return null; },
  	        remove: function remove() {}
  	      };
  	    })()
  	);
  	return cookies;
  }

  var isAbsoluteURL;
  var hasRequiredIsAbsoluteURL;

  function requireIsAbsoluteURL () {
  	if (hasRequiredIsAbsoluteURL) return isAbsoluteURL;
  	hasRequiredIsAbsoluteURL = 1;

  	/**
  	 * Determines whether the specified URL is absolute
  	 *
  	 * @param {string} url The URL to test
  	 * @returns {boolean} True if the specified URL is absolute, otherwise false
  	 */
  	isAbsoluteURL = function isAbsoluteURL(url) {
  	  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  	  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  	  // by any combination of letters, digits, plus, period, or hyphen.
  	  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
  	};
  	return isAbsoluteURL;
  }

  var combineURLs;
  var hasRequiredCombineURLs;

  function requireCombineURLs () {
  	if (hasRequiredCombineURLs) return combineURLs;
  	hasRequiredCombineURLs = 1;

  	/**
  	 * Creates a new URL by combining the specified URLs
  	 *
  	 * @param {string} baseURL The base URL
  	 * @param {string} relativeURL The relative URL
  	 * @returns {string} The combined URL
  	 */
  	combineURLs = function combineURLs(baseURL, relativeURL) {
  	  return relativeURL
  	    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
  	    : baseURL;
  	};
  	return combineURLs;
  }

  var buildFullPath;
  var hasRequiredBuildFullPath;

  function requireBuildFullPath () {
  	if (hasRequiredBuildFullPath) return buildFullPath;
  	hasRequiredBuildFullPath = 1;

  	var isAbsoluteURL = requireIsAbsoluteURL();
  	var combineURLs = requireCombineURLs();

  	/**
  	 * Creates a new URL by combining the baseURL with the requestedURL,
  	 * only when the requestedURL is not already an absolute URL.
  	 * If the requestURL is absolute, this function returns the requestedURL untouched.
  	 *
  	 * @param {string} baseURL The base URL
  	 * @param {string} requestedURL Absolute or relative URL to combine
  	 * @returns {string} The combined full path
  	 */
  	buildFullPath = function buildFullPath(baseURL, requestedURL) {
  	  if (baseURL && !isAbsoluteURL(requestedURL)) {
  	    return combineURLs(baseURL, requestedURL);
  	  }
  	  return requestedURL;
  	};
  	return buildFullPath;
  }

  var parseHeaders;
  var hasRequiredParseHeaders;

  function requireParseHeaders () {
  	if (hasRequiredParseHeaders) return parseHeaders;
  	hasRequiredParseHeaders = 1;

  	var utils = requireUtils();

  	// Headers whose duplicates are ignored by node
  	// c.f. https://nodejs.org/api/http.html#http_message_headers
  	var ignoreDuplicateOf = [
  	  'age', 'authorization', 'content-length', 'content-type', 'etag',
  	  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  	  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  	  'referer', 'retry-after', 'user-agent'
  	];

  	/**
  	 * Parse headers into an object
  	 *
  	 * ```
  	 * Date: Wed, 27 Aug 2014 08:58:49 GMT
  	 * Content-Type: application/json
  	 * Connection: keep-alive
  	 * Transfer-Encoding: chunked
  	 * ```
  	 *
  	 * @param {String} headers Headers needing to be parsed
  	 * @returns {Object} Headers parsed into an object
  	 */
  	parseHeaders = function parseHeaders(headers) {
  	  var parsed = {};
  	  var key;
  	  var val;
  	  var i;

  	  if (!headers) { return parsed; }

  	  utils.forEach(headers.split('\n'), function parser(line) {
  	    i = line.indexOf(':');
  	    key = utils.trim(line.substr(0, i)).toLowerCase();
  	    val = utils.trim(line.substr(i + 1));

  	    if (key) {
  	      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
  	        return;
  	      }
  	      if (key === 'set-cookie') {
  	        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
  	      } else {
  	        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
  	      }
  	    }
  	  });

  	  return parsed;
  	};
  	return parseHeaders;
  }

  var isURLSameOrigin;
  var hasRequiredIsURLSameOrigin;

  function requireIsURLSameOrigin () {
  	if (hasRequiredIsURLSameOrigin) return isURLSameOrigin;
  	hasRequiredIsURLSameOrigin = 1;

  	var utils = requireUtils();

  	isURLSameOrigin = (
  	  utils.isStandardBrowserEnv() ?

  	  // Standard browser envs have full support of the APIs needed to test
  	  // whether the request URL is of the same origin as current location.
  	    (function standardBrowserEnv() {
  	      var msie = /(msie|trident)/i.test(navigator.userAgent);
  	      var urlParsingNode = document.createElement('a');
  	      var originURL;

  	      /**
  	    * Parse a URL to discover it's components
  	    *
  	    * @param {String} url The URL to be parsed
  	    * @returns {Object}
  	    */
  	      function resolveURL(url) {
  	        var href = url;

  	        if (msie) {
  	        // IE needs attribute set twice to normalize properties
  	          urlParsingNode.setAttribute('href', href);
  	          href = urlParsingNode.href;
  	        }

  	        urlParsingNode.setAttribute('href', href);

  	        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
  	        return {
  	          href: urlParsingNode.href,
  	          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
  	          host: urlParsingNode.host,
  	          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
  	          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
  	          hostname: urlParsingNode.hostname,
  	          port: urlParsingNode.port,
  	          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
  	            urlParsingNode.pathname :
  	            '/' + urlParsingNode.pathname
  	        };
  	      }

  	      originURL = resolveURL(window.location.href);

  	      /**
  	    * Determine if a URL shares the same origin as the current location
  	    *
  	    * @param {String} requestURL The URL to test
  	    * @returns {boolean} True if URL shares the same origin, otherwise false
  	    */
  	      return function isURLSameOrigin(requestURL) {
  	        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
  	        return (parsed.protocol === originURL.protocol &&
  	            parsed.host === originURL.host);
  	      };
  	    })() :

  	  // Non standard browser envs (web workers, react-native) lack needed support.
  	    (function nonStandardBrowserEnv() {
  	      return function isURLSameOrigin() {
  	        return true;
  	      };
  	    })()
  	);
  	return isURLSameOrigin;
  }

  var CanceledError_1;
  var hasRequiredCanceledError;

  function requireCanceledError () {
  	if (hasRequiredCanceledError) return CanceledError_1;
  	hasRequiredCanceledError = 1;

  	var AxiosError = requireAxiosError();
  	var utils = requireUtils();

  	/**
  	 * A `CanceledError` is an object that is thrown when an operation is canceled.
  	 *
  	 * @class
  	 * @param {string=} message The message.
  	 */
  	function CanceledError(message) {
  	  // eslint-disable-next-line no-eq-null,eqeqeq
  	  AxiosError.call(this, message == null ? 'canceled' : message, AxiosError.ERR_CANCELED);
  	  this.name = 'CanceledError';
  	}

  	utils.inherits(CanceledError, AxiosError, {
  	  __CANCEL__: true
  	});

  	CanceledError_1 = CanceledError;
  	return CanceledError_1;
  }

  var parseProtocol;
  var hasRequiredParseProtocol;

  function requireParseProtocol () {
  	if (hasRequiredParseProtocol) return parseProtocol;
  	hasRequiredParseProtocol = 1;

  	parseProtocol = function parseProtocol(url) {
  	  var match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  	  return match && match[1] || '';
  	};
  	return parseProtocol;
  }

  var xhr;
  var hasRequiredXhr;

  function requireXhr () {
  	if (hasRequiredXhr) return xhr;
  	hasRequiredXhr = 1;

  	var utils = requireUtils();
  	var settle = requireSettle();
  	var cookies = requireCookies();
  	var buildURL = requireBuildURL();
  	var buildFullPath = requireBuildFullPath();
  	var parseHeaders = requireParseHeaders();
  	var isURLSameOrigin = requireIsURLSameOrigin();
  	var transitionalDefaults = requireTransitional();
  	var AxiosError = requireAxiosError();
  	var CanceledError = requireCanceledError();
  	var parseProtocol = requireParseProtocol();

  	xhr = function xhrAdapter(config) {
  	  return new Promise(function dispatchXhrRequest(resolve, reject) {
  	    var requestData = config.data;
  	    var requestHeaders = config.headers;
  	    var responseType = config.responseType;
  	    var onCanceled;
  	    function done() {
  	      if (config.cancelToken) {
  	        config.cancelToken.unsubscribe(onCanceled);
  	      }

  	      if (config.signal) {
  	        config.signal.removeEventListener('abort', onCanceled);
  	      }
  	    }

  	    if (utils.isFormData(requestData) && utils.isStandardBrowserEnv()) {
  	      delete requestHeaders['Content-Type']; // Let the browser set it
  	    }

  	    var request = new XMLHttpRequest();

  	    // HTTP basic authentication
  	    if (config.auth) {
  	      var username = config.auth.username || '';
  	      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
  	      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
  	    }

  	    var fullPath = buildFullPath(config.baseURL, config.url);

  	    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

  	    // Set the request timeout in MS
  	    request.timeout = config.timeout;

  	    function onloadend() {
  	      if (!request) {
  	        return;
  	      }
  	      // Prepare the response
  	      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
  	      var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
  	        request.responseText : request.response;
  	      var response = {
  	        data: responseData,
  	        status: request.status,
  	        statusText: request.statusText,
  	        headers: responseHeaders,
  	        config: config,
  	        request: request
  	      };

  	      settle(function _resolve(value) {
  	        resolve(value);
  	        done();
  	      }, function _reject(err) {
  	        reject(err);
  	        done();
  	      }, response);

  	      // Clean up request
  	      request = null;
  	    }

  	    if ('onloadend' in request) {
  	      // Use onloadend if available
  	      request.onloadend = onloadend;
  	    } else {
  	      // Listen for ready state to emulate onloadend
  	      request.onreadystatechange = function handleLoad() {
  	        if (!request || request.readyState !== 4) {
  	          return;
  	        }

  	        // The request errored out and we didn't get a response, this will be
  	        // handled by onerror instead
  	        // With one exception: request that using file: protocol, most browsers
  	        // will return status as 0 even though it's a successful request
  	        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
  	          return;
  	        }
  	        // readystate handler is calling before onerror or ontimeout handlers,
  	        // so we should call onloadend on the next 'tick'
  	        setTimeout(onloadend);
  	      };
  	    }

  	    // Handle browser request cancellation (as opposed to a manual cancellation)
  	    request.onabort = function handleAbort() {
  	      if (!request) {
  	        return;
  	      }

  	      reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));

  	      // Clean up request
  	      request = null;
  	    };

  	    // Handle low level network errors
  	    request.onerror = function handleError() {
  	      // Real errors are hidden from us by the browser
  	      // onerror should only fire if it's a network error
  	      reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request, request));

  	      // Clean up request
  	      request = null;
  	    };

  	    // Handle timeout
  	    request.ontimeout = function handleTimeout() {
  	      var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
  	      var transitional = config.transitional || transitionalDefaults;
  	      if (config.timeoutErrorMessage) {
  	        timeoutErrorMessage = config.timeoutErrorMessage;
  	      }
  	      reject(new AxiosError(
  	        timeoutErrorMessage,
  	        transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
  	        config,
  	        request));

  	      // Clean up request
  	      request = null;
  	    };

  	    // Add xsrf header
  	    // This is only done if running in a standard browser environment.
  	    // Specifically not if we're in a web worker, or react-native.
  	    if (utils.isStandardBrowserEnv()) {
  	      // Add xsrf header
  	      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
  	        cookies.read(config.xsrfCookieName) :
  	        undefined;

  	      if (xsrfValue) {
  	        requestHeaders[config.xsrfHeaderName] = xsrfValue;
  	      }
  	    }

  	    // Add headers to the request
  	    if ('setRequestHeader' in request) {
  	      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
  	        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
  	          // Remove Content-Type if data is undefined
  	          delete requestHeaders[key];
  	        } else {
  	          // Otherwise add header to the request
  	          request.setRequestHeader(key, val);
  	        }
  	      });
  	    }

  	    // Add withCredentials to request if needed
  	    if (!utils.isUndefined(config.withCredentials)) {
  	      request.withCredentials = !!config.withCredentials;
  	    }

  	    // Add responseType to request if needed
  	    if (responseType && responseType !== 'json') {
  	      request.responseType = config.responseType;
  	    }

  	    // Handle progress if needed
  	    if (typeof config.onDownloadProgress === 'function') {
  	      request.addEventListener('progress', config.onDownloadProgress);
  	    }

  	    // Not all browsers support upload events
  	    if (typeof config.onUploadProgress === 'function' && request.upload) {
  	      request.upload.addEventListener('progress', config.onUploadProgress);
  	    }

  	    if (config.cancelToken || config.signal) {
  	      // Handle cancellation
  	      // eslint-disable-next-line func-names
  	      onCanceled = function(cancel) {
  	        if (!request) {
  	          return;
  	        }
  	        reject(!cancel || (cancel && cancel.type) ? new CanceledError() : cancel);
  	        request.abort();
  	        request = null;
  	      };

  	      config.cancelToken && config.cancelToken.subscribe(onCanceled);
  	      if (config.signal) {
  	        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
  	      }
  	    }

  	    if (!requestData) {
  	      requestData = null;
  	    }

  	    var protocol = parseProtocol(fullPath);

  	    if (protocol && [ 'http', 'https', 'file' ].indexOf(protocol) === -1) {
  	      reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
  	      return;
  	    }


  	    // Send the request
  	    request.send(requestData);
  	  });
  	};
  	return xhr;
  }

  var _null;
  var hasRequired_null;

  function require_null () {
  	if (hasRequired_null) return _null;
  	hasRequired_null = 1;
  	// eslint-disable-next-line strict
  	_null = null;
  	return _null;
  }

  // shim for using process in browser
  // based off https://github.com/defunctzombie/node-process/blob/master/browser.js

  function defaultSetTimout() {
      throw new Error('setTimeout has not been defined');
  }
  function defaultClearTimeout () {
      throw new Error('clearTimeout has not been defined');
  }
  var cachedSetTimeout = defaultSetTimout;
  var cachedClearTimeout = defaultClearTimeout;
  if (typeof global$1.setTimeout === 'function') {
      cachedSetTimeout = setTimeout;
  }
  if (typeof global$1.clearTimeout === 'function') {
      cachedClearTimeout = clearTimeout;
  }

  function runTimeout(fun) {
      if (cachedSetTimeout === setTimeout) {
          //normal enviroments in sane situations
          return setTimeout(fun, 0);
      }
      // if setTimeout wasn't available but was latter defined
      if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
          cachedSetTimeout = setTimeout;
          return setTimeout(fun, 0);
      }
      try {
          // when when somebody has screwed with setTimeout but no I.E. maddness
          return cachedSetTimeout(fun, 0);
      } catch(e){
          try {
              // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
              return cachedSetTimeout.call(null, fun, 0);
          } catch(e){
              // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
              return cachedSetTimeout.call(this, fun, 0);
          }
      }


  }
  function runClearTimeout(marker) {
      if (cachedClearTimeout === clearTimeout) {
          //normal enviroments in sane situations
          return clearTimeout(marker);
      }
      // if clearTimeout wasn't available but was latter defined
      if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
          cachedClearTimeout = clearTimeout;
          return clearTimeout(marker);
      }
      try {
          // when when somebody has screwed with setTimeout but no I.E. maddness
          return cachedClearTimeout(marker);
      } catch (e){
          try {
              // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
              return cachedClearTimeout.call(null, marker);
          } catch (e){
              // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
              // Some versions of I.E. have different rules for clearTimeout vs setTimeout
              return cachedClearTimeout.call(this, marker);
          }
      }



  }
  var queue = [];
  var draining = false;
  var currentQueue;
  var queueIndex = -1;

  function cleanUpNextTick() {
      if (!draining || !currentQueue) {
          return;
      }
      draining = false;
      if (currentQueue.length) {
          queue = currentQueue.concat(queue);
      } else {
          queueIndex = -1;
      }
      if (queue.length) {
          drainQueue();
      }
  }

  function drainQueue() {
      if (draining) {
          return;
      }
      var timeout = runTimeout(cleanUpNextTick);
      draining = true;

      var len = queue.length;
      while(len) {
          currentQueue = queue;
          queue = [];
          while (++queueIndex < len) {
              if (currentQueue) {
                  currentQueue[queueIndex].run();
              }
          }
          queueIndex = -1;
          len = queue.length;
      }
      currentQueue = null;
      draining = false;
      runClearTimeout(timeout);
  }
  function nextTick(fun) {
      var args = new Array(arguments.length - 1);
      if (arguments.length > 1) {
          for (var i = 1; i < arguments.length; i++) {
              args[i - 1] = arguments[i];
          }
      }
      queue.push(new Item(fun, args));
      if (queue.length === 1 && !draining) {
          runTimeout(drainQueue);
      }
  }
  // v8 likes predictible objects
  function Item(fun, array) {
      this.fun = fun;
      this.array = array;
  }
  Item.prototype.run = function () {
      this.fun.apply(null, this.array);
  };
  var title = 'browser';
  var platform = 'browser';
  var browser = true;
  var env = {};
  var argv = [];
  var version = ''; // empty string to avoid regexp issues
  var versions = {};
  var release = {};
  var config = {};

  function noop() {}

  var on = noop;
  var addListener = noop;
  var once = noop;
  var off = noop;
  var removeListener = noop;
  var removeAllListeners = noop;
  var emit = noop;

  function binding(name) {
      throw new Error('process.binding is not supported');
  }

  function cwd () { return '/' }
  function chdir (dir) {
      throw new Error('process.chdir is not supported');
  }function umask() { return 0; }

  // from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
  var performance = global$1.performance || {};
  var performanceNow =
    performance.now        ||
    performance.mozNow     ||
    performance.msNow      ||
    performance.oNow       ||
    performance.webkitNow  ||
    function(){ return (new Date()).getTime() };

  // generate timestamp or delta
  // see http://nodejs.org/api/process.html#process_process_hrtime
  function hrtime(previousTimestamp){
    var clocktime = performanceNow.call(performance)*1e-3;
    var seconds = Math.floor(clocktime);
    var nanoseconds = Math.floor((clocktime%1)*1e9);
    if (previousTimestamp) {
      seconds = seconds - previousTimestamp[0];
      nanoseconds = nanoseconds - previousTimestamp[1];
      if (nanoseconds<0) {
        seconds--;
        nanoseconds += 1e9;
      }
    }
    return [seconds,nanoseconds]
  }

  var startTime = new Date();
  function uptime() {
    var currentTime = new Date();
    var dif = currentTime - startTime;
    return dif / 1000;
  }

  var browser$1 = {
    nextTick: nextTick,
    title: title,
    browser: browser,
    env: env,
    argv: argv,
    version: version,
    versions: versions,
    on: on,
    addListener: addListener,
    once: once,
    off: off,
    removeListener: removeListener,
    removeAllListeners: removeAllListeners,
    emit: emit,
    binding: binding,
    cwd: cwd,
    chdir: chdir,
    umask: umask,
    hrtime: hrtime,
    platform: platform,
    release: release,
    config: config,
    uptime: uptime
  };

  var utils = requireUtils();
  var normalizeHeaderName = requireNormalizeHeaderName();
  var AxiosError = requireAxiosError();
  var transitionalDefaults = requireTransitional();
  var toFormData = require$$9;

  var DEFAULT_CONTENT_TYPE = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  function setContentTypeIfUnset(headers, value) {
    if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
      headers['Content-Type'] = value;
    }
  }

  function getDefaultAdapter() {
    var adapter;
    if (typeof XMLHttpRequest !== 'undefined') {
      // For browsers use XHR adapter
      adapter = requireXhr();
    } else if (typeof browser$1 !== 'undefined' && Object.prototype.toString.call(browser$1) === '[object process]') {
      // For node use HTTP adapter
      adapter = requireXhr();
    }
    return adapter;
  }

  function stringifySafely(rawValue, parser, encoder) {
    if (utils.isString(rawValue)) {
      try {
        (parser || JSON.parse)(rawValue);
        return utils.trim(rawValue);
      } catch (e) {
        if (e.name !== 'SyntaxError') {
          throw e;
        }
      }
    }

    return (encoder || JSON.stringify)(rawValue);
  }

  var defaults = {

    transitional: transitionalDefaults,

    adapter: getDefaultAdapter(),

    transformRequest: [function transformRequest(data, headers) {
      normalizeHeaderName(headers, 'Accept');
      normalizeHeaderName(headers, 'Content-Type');

      if (utils.isFormData(data) ||
        utils.isArrayBuffer(data) ||
        utils.isBuffer(data) ||
        utils.isStream(data) ||
        utils.isFile(data) ||
        utils.isBlob(data)
      ) {
        return data;
      }
      if (utils.isArrayBufferView(data)) {
        return data.buffer;
      }
      if (utils.isURLSearchParams(data)) {
        setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
        return data.toString();
      }

      var isObjectPayload = utils.isObject(data);
      var contentType = headers && headers['Content-Type'];

      var isFileList;

      if ((isFileList = utils.isFileList(data)) || (isObjectPayload && contentType === 'multipart/form-data')) {
        var _FormData = this.env && this.env.FormData;
        return toFormData(isFileList ? {'files[]': data} : data, _FormData && new _FormData());
      } else if (isObjectPayload || contentType === 'application/json') {
        setContentTypeIfUnset(headers, 'application/json');
        return stringifySafely(data);
      }

      return data;
    }],

    transformResponse: [function transformResponse(data) {
      var transitional = this.transitional || defaults.transitional;
      var silentJSONParsing = transitional && transitional.silentJSONParsing;
      var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
      var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

      if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
        try {
          return JSON.parse(data);
        } catch (e) {
          if (strictJSONParsing) {
            if (e.name === 'SyntaxError') {
              throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
            }
            throw e;
          }
        }
      }

      return data;
    }],

    /**
     * A timeout in milliseconds to abort a request. If set to 0 (default) a
     * timeout is not created.
     */
    timeout: 0,

    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',

    maxContentLength: -1,
    maxBodyLength: -1,

    env: {
      FormData: require_null()
    },

    validateStatus: function validateStatus(status) {
      return status >= 200 && status < 300;
    },

    headers: {
      common: {
        'Accept': 'application/json, text/plain, */*'
      }
    }
  };

  utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
    defaults.headers[method] = {};
  });

  utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
    defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
  });

  module.exports = defaults;

  var defaults$1 = /*#__PURE__*/Object.freeze({
    __proto__: null
  });

  var require$$4 = /*@__PURE__*/getAugmentedNamespace(defaults$1);

  var transformData;
  var hasRequiredTransformData;

  function requireTransformData () {
  	if (hasRequiredTransformData) return transformData;
  	hasRequiredTransformData = 1;

  	var utils = requireUtils();
  	var defaults = require$$4;

  	/**
  	 * Transform the data for a request or a response
  	 *
  	 * @param {Object|String} data The data to be transformed
  	 * @param {Array} headers The headers for the request or response
  	 * @param {Array|Function} fns A single function or Array of functions
  	 * @returns {*} The resulting transformed data
  	 */
  	transformData = function transformData(data, headers, fns) {
  	  var context = this || defaults;
  	  /*eslint no-param-reassign:0*/
  	  utils.forEach(fns, function transform(fn) {
  	    data = fn.call(context, data, headers);
  	  });

  	  return data;
  	};
  	return transformData;
  }

  var isCancel;
  var hasRequiredIsCancel;

  function requireIsCancel () {
  	if (hasRequiredIsCancel) return isCancel;
  	hasRequiredIsCancel = 1;

  	isCancel = function isCancel(value) {
  	  return !!(value && value.__CANCEL__);
  	};
  	return isCancel;
  }

  var dispatchRequest;
  var hasRequiredDispatchRequest;

  function requireDispatchRequest () {
  	if (hasRequiredDispatchRequest) return dispatchRequest;
  	hasRequiredDispatchRequest = 1;

  	var utils = requireUtils();
  	var transformData = requireTransformData();
  	var isCancel = requireIsCancel();
  	var defaults = require$$4;
  	var CanceledError = requireCanceledError();

  	/**
  	 * Throws a `CanceledError` if cancellation has been requested.
  	 */
  	function throwIfCancellationRequested(config) {
  	  if (config.cancelToken) {
  	    config.cancelToken.throwIfRequested();
  	  }

  	  if (config.signal && config.signal.aborted) {
  	    throw new CanceledError();
  	  }
  	}

  	/**
  	 * Dispatch a request to the server using the configured adapter.
  	 *
  	 * @param {object} config The config that is to be used for the request
  	 * @returns {Promise} The Promise to be fulfilled
  	 */
  	dispatchRequest = function dispatchRequest(config) {
  	  throwIfCancellationRequested(config);

  	  // Ensure headers exist
  	  config.headers = config.headers || {};

  	  // Transform request data
  	  config.data = transformData.call(
  	    config,
  	    config.data,
  	    config.headers,
  	    config.transformRequest
  	  );

  	  // Flatten headers
  	  config.headers = utils.merge(
  	    config.headers.common || {},
  	    config.headers[config.method] || {},
  	    config.headers
  	  );

  	  utils.forEach(
  	    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
  	    function cleanHeaderConfig(method) {
  	      delete config.headers[method];
  	    }
  	  );

  	  var adapter = config.adapter || defaults.adapter;

  	  return adapter(config).then(function onAdapterResolution(response) {
  	    throwIfCancellationRequested(config);

  	    // Transform response data
  	    response.data = transformData.call(
  	      config,
  	      response.data,
  	      response.headers,
  	      config.transformResponse
  	    );

  	    return response;
  	  }, function onAdapterRejection(reason) {
  	    if (!isCancel(reason)) {
  	      throwIfCancellationRequested(config);

  	      // Transform response data
  	      if (reason && reason.response) {
  	        reason.response.data = transformData.call(
  	          config,
  	          reason.response.data,
  	          reason.response.headers,
  	          config.transformResponse
  	        );
  	      }
  	    }

  	    return Promise.reject(reason);
  	  });
  	};
  	return dispatchRequest;
  }

  var mergeConfig;
  var hasRequiredMergeConfig;

  function requireMergeConfig () {
  	if (hasRequiredMergeConfig) return mergeConfig;
  	hasRequiredMergeConfig = 1;

  	var utils = requireUtils();

  	/**
  	 * Config-specific merge-function which creates a new config-object
  	 * by merging two configuration objects together.
  	 *
  	 * @param {Object} config1
  	 * @param {Object} config2
  	 * @returns {Object} New object resulting from merging config2 to config1
  	 */
  	mergeConfig = function mergeConfig(config1, config2) {
  	  // eslint-disable-next-line no-param-reassign
  	  config2 = config2 || {};
  	  var config = {};

  	  function getMergedValue(target, source) {
  	    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
  	      return utils.merge(target, source);
  	    } else if (utils.isPlainObject(source)) {
  	      return utils.merge({}, source);
  	    } else if (utils.isArray(source)) {
  	      return source.slice();
  	    }
  	    return source;
  	  }

  	  // eslint-disable-next-line consistent-return
  	  function mergeDeepProperties(prop) {
  	    if (!utils.isUndefined(config2[prop])) {
  	      return getMergedValue(config1[prop], config2[prop]);
  	    } else if (!utils.isUndefined(config1[prop])) {
  	      return getMergedValue(undefined, config1[prop]);
  	    }
  	  }

  	  // eslint-disable-next-line consistent-return
  	  function valueFromConfig2(prop) {
  	    if (!utils.isUndefined(config2[prop])) {
  	      return getMergedValue(undefined, config2[prop]);
  	    }
  	  }

  	  // eslint-disable-next-line consistent-return
  	  function defaultToConfig2(prop) {
  	    if (!utils.isUndefined(config2[prop])) {
  	      return getMergedValue(undefined, config2[prop]);
  	    } else if (!utils.isUndefined(config1[prop])) {
  	      return getMergedValue(undefined, config1[prop]);
  	    }
  	  }

  	  // eslint-disable-next-line consistent-return
  	  function mergeDirectKeys(prop) {
  	    if (prop in config2) {
  	      return getMergedValue(config1[prop], config2[prop]);
  	    } else if (prop in config1) {
  	      return getMergedValue(undefined, config1[prop]);
  	    }
  	  }

  	  var mergeMap = {
  	    'url': valueFromConfig2,
  	    'method': valueFromConfig2,
  	    'data': valueFromConfig2,
  	    'baseURL': defaultToConfig2,
  	    'transformRequest': defaultToConfig2,
  	    'transformResponse': defaultToConfig2,
  	    'paramsSerializer': defaultToConfig2,
  	    'timeout': defaultToConfig2,
  	    'timeoutMessage': defaultToConfig2,
  	    'withCredentials': defaultToConfig2,
  	    'adapter': defaultToConfig2,
  	    'responseType': defaultToConfig2,
  	    'xsrfCookieName': defaultToConfig2,
  	    'xsrfHeaderName': defaultToConfig2,
  	    'onUploadProgress': defaultToConfig2,
  	    'onDownloadProgress': defaultToConfig2,
  	    'decompress': defaultToConfig2,
  	    'maxContentLength': defaultToConfig2,
  	    'maxBodyLength': defaultToConfig2,
  	    'beforeRedirect': defaultToConfig2,
  	    'transport': defaultToConfig2,
  	    'httpAgent': defaultToConfig2,
  	    'httpsAgent': defaultToConfig2,
  	    'cancelToken': defaultToConfig2,
  	    'socketPath': defaultToConfig2,
  	    'responseEncoding': defaultToConfig2,
  	    'validateStatus': mergeDirectKeys
  	  };

  	  utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
  	    var merge = mergeMap[prop] || mergeDeepProperties;
  	    var configValue = merge(prop);
  	    (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  	  });

  	  return config;
  	};
  	return mergeConfig;
  }

  var data;
  var hasRequiredData;

  function requireData () {
  	if (hasRequiredData) return data;
  	hasRequiredData = 1;
  	data = {
  	  "version": "0.27.2"
  	};
  	return data;
  }

  var validator;
  var hasRequiredValidator;

  function requireValidator () {
  	if (hasRequiredValidator) return validator;
  	hasRequiredValidator = 1;

  	var VERSION = requireData().version;
  	var AxiosError = requireAxiosError();

  	var validators = {};

  	// eslint-disable-next-line func-names
  	['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
  	  validators[type] = function validator(thing) {
  	    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  	  };
  	});

  	var deprecatedWarnings = {};

  	/**
  	 * Transitional option validator
  	 * @param {function|boolean?} validator - set to false if the transitional option has been removed
  	 * @param {string?} version - deprecated version / removed since version
  	 * @param {string?} message - some message with additional info
  	 * @returns {function}
  	 */
  	validators.transitional = function transitional(validator, version, message) {
  	  function formatMessage(opt, desc) {
  	    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  	  }

  	  // eslint-disable-next-line func-names
  	  return function(value, opt, opts) {
  	    if (validator === false) {
  	      throw new AxiosError(
  	        formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
  	        AxiosError.ERR_DEPRECATED
  	      );
  	    }

  	    if (version && !deprecatedWarnings[opt]) {
  	      deprecatedWarnings[opt] = true;
  	      // eslint-disable-next-line no-console
  	      console.warn(
  	        formatMessage(
  	          opt,
  	          ' has been deprecated since v' + version + ' and will be removed in the near future'
  	        )
  	      );
  	    }

  	    return validator ? validator(value, opt, opts) : true;
  	  };
  	};

  	/**
  	 * Assert object's properties type
  	 * @param {object} options
  	 * @param {object} schema
  	 * @param {boolean?} allowUnknown
  	 */

  	function assertOptions(options, schema, allowUnknown) {
  	  if (typeof options !== 'object') {
  	    throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
  	  }
  	  var keys = Object.keys(options);
  	  var i = keys.length;
  	  while (i-- > 0) {
  	    var opt = keys[i];
  	    var validator = schema[opt];
  	    if (validator) {
  	      var value = options[opt];
  	      var result = value === undefined || validator(value, opt, options);
  	      if (result !== true) {
  	        throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
  	      }
  	      continue;
  	    }
  	    if (allowUnknown !== true) {
  	      throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
  	    }
  	  }
  	}

  	validator = {
  	  assertOptions: assertOptions,
  	  validators: validators
  	};
  	return validator;
  }

  var Axios_1;
  var hasRequiredAxios$2;

  function requireAxios$2 () {
  	if (hasRequiredAxios$2) return Axios_1;
  	hasRequiredAxios$2 = 1;

  	var utils = requireUtils();
  	var buildURL = requireBuildURL();
  	var InterceptorManager = requireInterceptorManager();
  	var dispatchRequest = requireDispatchRequest();
  	var mergeConfig = requireMergeConfig();
  	var buildFullPath = requireBuildFullPath();
  	var validator = requireValidator();

  	var validators = validator.validators;
  	/**
  	 * Create a new instance of Axios
  	 *
  	 * @param {Object} instanceConfig The default config for the instance
  	 */
  	function Axios(instanceConfig) {
  	  this.defaults = instanceConfig;
  	  this.interceptors = {
  	    request: new InterceptorManager(),
  	    response: new InterceptorManager()
  	  };
  	}

  	/**
  	 * Dispatch a request
  	 *
  	 * @param {Object} config The config specific for this request (merged with this.defaults)
  	 */
  	Axios.prototype.request = function request(configOrUrl, config) {
  	  /*eslint no-param-reassign:0*/
  	  // Allow for axios('example/url'[, config]) a la fetch API
  	  if (typeof configOrUrl === 'string') {
  	    config = config || {};
  	    config.url = configOrUrl;
  	  } else {
  	    config = configOrUrl || {};
  	  }

  	  config = mergeConfig(this.defaults, config);

  	  // Set config.method
  	  if (config.method) {
  	    config.method = config.method.toLowerCase();
  	  } else if (this.defaults.method) {
  	    config.method = this.defaults.method.toLowerCase();
  	  } else {
  	    config.method = 'get';
  	  }

  	  var transitional = config.transitional;

  	  if (transitional !== undefined) {
  	    validator.assertOptions(transitional, {
  	      silentJSONParsing: validators.transitional(validators.boolean),
  	      forcedJSONParsing: validators.transitional(validators.boolean),
  	      clarifyTimeoutError: validators.transitional(validators.boolean)
  	    }, false);
  	  }

  	  // filter out skipped interceptors
  	  var requestInterceptorChain = [];
  	  var synchronousRequestInterceptors = true;
  	  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
  	    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
  	      return;
  	    }

  	    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

  	    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  	  });

  	  var responseInterceptorChain = [];
  	  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
  	    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  	  });

  	  var promise;

  	  if (!synchronousRequestInterceptors) {
  	    var chain = [dispatchRequest, undefined];

  	    Array.prototype.unshift.apply(chain, requestInterceptorChain);
  	    chain = chain.concat(responseInterceptorChain);

  	    promise = Promise.resolve(config);
  	    while (chain.length) {
  	      promise = promise.then(chain.shift(), chain.shift());
  	    }

  	    return promise;
  	  }


  	  var newConfig = config;
  	  while (requestInterceptorChain.length) {
  	    var onFulfilled = requestInterceptorChain.shift();
  	    var onRejected = requestInterceptorChain.shift();
  	    try {
  	      newConfig = onFulfilled(newConfig);
  	    } catch (error) {
  	      onRejected(error);
  	      break;
  	    }
  	  }

  	  try {
  	    promise = dispatchRequest(newConfig);
  	  } catch (error) {
  	    return Promise.reject(error);
  	  }

  	  while (responseInterceptorChain.length) {
  	    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  	  }

  	  return promise;
  	};

  	Axios.prototype.getUri = function getUri(config) {
  	  config = mergeConfig(this.defaults, config);
  	  var fullPath = buildFullPath(config.baseURL, config.url);
  	  return buildURL(fullPath, config.params, config.paramsSerializer);
  	};

  	// Provide aliases for supported request methods
  	utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  	  /*eslint func-names:0*/
  	  Axios.prototype[method] = function(url, config) {
  	    return this.request(mergeConfig(config || {}, {
  	      method: method,
  	      url: url,
  	      data: (config || {}).data
  	    }));
  	  };
  	});

  	utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  	  /*eslint func-names:0*/

  	  function generateHTTPMethod(isForm) {
  	    return function httpMethod(url, data, config) {
  	      return this.request(mergeConfig(config || {}, {
  	        method: method,
  	        headers: isForm ? {
  	          'Content-Type': 'multipart/form-data'
  	        } : {},
  	        url: url,
  	        data: data
  	      }));
  	    };
  	  }

  	  Axios.prototype[method] = generateHTTPMethod();

  	  Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
  	});

  	Axios_1 = Axios;
  	return Axios_1;
  }

  var CancelToken_1;
  var hasRequiredCancelToken;

  function requireCancelToken () {
  	if (hasRequiredCancelToken) return CancelToken_1;
  	hasRequiredCancelToken = 1;

  	var CanceledError = requireCanceledError();

  	/**
  	 * A `CancelToken` is an object that can be used to request cancellation of an operation.
  	 *
  	 * @class
  	 * @param {Function} executor The executor function.
  	 */
  	function CancelToken(executor) {
  	  if (typeof executor !== 'function') {
  	    throw new TypeError('executor must be a function.');
  	  }

  	  var resolvePromise;

  	  this.promise = new Promise(function promiseExecutor(resolve) {
  	    resolvePromise = resolve;
  	  });

  	  var token = this;

  	  // eslint-disable-next-line func-names
  	  this.promise.then(function(cancel) {
  	    if (!token._listeners) return;

  	    var i;
  	    var l = token._listeners.length;

  	    for (i = 0; i < l; i++) {
  	      token._listeners[i](cancel);
  	    }
  	    token._listeners = null;
  	  });

  	  // eslint-disable-next-line func-names
  	  this.promise.then = function(onfulfilled) {
  	    var _resolve;
  	    // eslint-disable-next-line func-names
  	    var promise = new Promise(function(resolve) {
  	      token.subscribe(resolve);
  	      _resolve = resolve;
  	    }).then(onfulfilled);

  	    promise.cancel = function reject() {
  	      token.unsubscribe(_resolve);
  	    };

  	    return promise;
  	  };

  	  executor(function cancel(message) {
  	    if (token.reason) {
  	      // Cancellation has already been requested
  	      return;
  	    }

  	    token.reason = new CanceledError(message);
  	    resolvePromise(token.reason);
  	  });
  	}

  	/**
  	 * Throws a `CanceledError` if cancellation has been requested.
  	 */
  	CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  	  if (this.reason) {
  	    throw this.reason;
  	  }
  	};

  	/**
  	 * Subscribe to the cancel signal
  	 */

  	CancelToken.prototype.subscribe = function subscribe(listener) {
  	  if (this.reason) {
  	    listener(this.reason);
  	    return;
  	  }

  	  if (this._listeners) {
  	    this._listeners.push(listener);
  	  } else {
  	    this._listeners = [listener];
  	  }
  	};

  	/**
  	 * Unsubscribe from the cancel signal
  	 */

  	CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
  	  if (!this._listeners) {
  	    return;
  	  }
  	  var index = this._listeners.indexOf(listener);
  	  if (index !== -1) {
  	    this._listeners.splice(index, 1);
  	  }
  	};

  	/**
  	 * Returns an object that contains a new `CancelToken` and a function that, when called,
  	 * cancels the `CancelToken`.
  	 */
  	CancelToken.source = function source() {
  	  var cancel;
  	  var token = new CancelToken(function executor(c) {
  	    cancel = c;
  	  });
  	  return {
  	    token: token,
  	    cancel: cancel
  	  };
  	};

  	CancelToken_1 = CancelToken;
  	return CancelToken_1;
  }

  var spread;
  var hasRequiredSpread;

  function requireSpread () {
  	if (hasRequiredSpread) return spread;
  	hasRequiredSpread = 1;

  	/**
  	 * Syntactic sugar for invoking a function and expanding an array for arguments.
  	 *
  	 * Common use case would be to use `Function.prototype.apply`.
  	 *
  	 *  ```js
  	 *  function f(x, y, z) {}
  	 *  var args = [1, 2, 3];
  	 *  f.apply(null, args);
  	 *  ```
  	 *
  	 * With `spread` this example can be re-written.
  	 *
  	 *  ```js
  	 *  spread(function(x, y, z) {})([1, 2, 3]);
  	 *  ```
  	 *
  	 * @param {Function} callback
  	 * @returns {Function}
  	 */
  	spread = function spread(callback) {
  	  return function wrap(arr) {
  	    return callback.apply(null, arr);
  	  };
  	};
  	return spread;
  }

  var isAxiosError;
  var hasRequiredIsAxiosError;

  function requireIsAxiosError () {
  	if (hasRequiredIsAxiosError) return isAxiosError;
  	hasRequiredIsAxiosError = 1;

  	var utils = requireUtils();

  	/**
  	 * Determines whether the payload is an error thrown by Axios
  	 *
  	 * @param {*} payload The value to test
  	 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
  	 */
  	isAxiosError = function isAxiosError(payload) {
  	  return utils.isObject(payload) && (payload.isAxiosError === true);
  	};
  	return isAxiosError;
  }

  var hasRequiredAxios$1;

  function requireAxios$1 () {
  	if (hasRequiredAxios$1) return axios.exports;
  	hasRequiredAxios$1 = 1;

  	var utils = requireUtils();
  	var bind = requireBind();
  	var Axios = requireAxios$2();
  	var mergeConfig = requireMergeConfig();
  	var defaults = require$$4;

  	/**
  	 * Create an instance of Axios
  	 *
  	 * @param {Object} defaultConfig The default config for the instance
  	 * @return {Axios} A new instance of Axios
  	 */
  	function createInstance(defaultConfig) {
  	  var context = new Axios(defaultConfig);
  	  var instance = bind(Axios.prototype.request, context);

  	  // Copy axios.prototype to instance
  	  utils.extend(instance, Axios.prototype, context);

  	  // Copy context to instance
  	  utils.extend(instance, context);

  	  // Factory for creating new instances
  	  instance.create = function create(instanceConfig) {
  	    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  	  };

  	  return instance;
  	}

  	// Create the default instance to be exported
  	var axios$1 = createInstance(defaults);

  	// Expose Axios class to allow class inheritance
  	axios$1.Axios = Axios;

  	// Expose Cancel & CancelToken
  	axios$1.CanceledError = requireCanceledError();
  	axios$1.CancelToken = requireCancelToken();
  	axios$1.isCancel = requireIsCancel();
  	axios$1.VERSION = requireData().version;
  	axios$1.toFormData = require$$9;

  	// Expose AxiosError class
  	axios$1.AxiosError = requireAxiosError();

  	// alias for CanceledError for backward compatibility
  	axios$1.Cancel = axios$1.CanceledError;

  	// Expose all/spread
  	axios$1.all = function all(promises) {
  	  return Promise.all(promises);
  	};
  	axios$1.spread = requireSpread();

  	// Expose isAxiosError
  	axios$1.isAxiosError = requireIsAxiosError();

  	axios.exports = axios$1;

  	// Allow use of default import syntax in TypeScript
  	axios.exports.default = axios$1;
  	return axios.exports;
  }

  var hasRequiredAxios;

  function requireAxios () {
  	if (hasRequiredAxios) return axios$1.exports;
  	hasRequiredAxios = 1;
  	(function (module) {
  		module.exports = requireAxios$1();
  } (axios$1));
  	return axios$1.exports;
  }

  var axiosExports = requireAxios();

  axiosExports.interceptors.response.use(
    function (res) {
      return { status: res.status, text: res.data };
    },
    function (error) {
      if (!error.response) {
        return Promise.reject("Server error");
      }
      return Promise.reject(
        error.response.status +
          ": " +
          (error.response.data.error
            ? error.response.data.error
            : error.response.data)
      );
    }
  );

  const URLS = {
    uploadDataset: "/api/deviceapi/uploadDataset",
    initDatasetIncrement: "/api/deviceapi/initDatasetIncrement",
    addDatasetIncrement: "/api/deviceapi/addDatasetIncrement",
    addDatasetIncrementBatch: "/api/deviceapi/addDatasetIncrementBatch",
  };

  /**
   * Uploads a whole dataset to a specific project
   * @param {string} url - The url of the backend server
   * @param {string} key - The Device-Api-Key
   * @param {object} dataset - The dataset to upload
   * @returns A Promise indicating success or failure
   */
  async function sendDataset(url, key, dataset) {
    const res = await axiosExports.post(url + URLS.uploadDataset, {
      key: key,
      payload: dataset,
    });
    return res.text.message;
  }

  /**
   *
   * @param {string} url - The url of the backend server
   * @param {string} key - The Device-Api-Key
   * @param {boolean} useDeviceTime - True if you want to use timestamps generated by the server
   * @returns Function to upload single datapoints to one dataset inside a specific project
   */
  async function datasetCollector(
    url,
    key,
    name,
    useDeviceTime,
    metaData,
    datasetLabel
  ) {
    try {
      const data = await axiosExports.post(url + URLS.initDatasetIncrement, {
        deviceApiKey: key,
        name: name,
        metaData: metaData,
      });

      if (!data || !data.text || !data.text.datasetKey) {
        throw new Error("Could not generate datasetCollector");
      }
      const datasetKey = data.text.datasetKey;

      var uploadComplete = false;
      var dataStore = { datasetKey: datasetKey, data: [] };
      var counter = 0;
      var error = undefined;

      /**
       * Uploads a vlaue for a specific timestamp to a datasets timeSeries with name sensorName
       * @param {string} sensorName - The name of the timeSeries to upload the value to
       * @param {number} value - The datapoint to upload
       * @param {number} time - The timestamp assigned to the datapoint
       * @returns A Promise indicating success or failure of upload
       */
      function addDataPoint(time, sensorName, value) {
        if (error) {
          throw new Error(error);
        }
        if (typeof value !== "number") {
          throw new Error("Datapoint is not a number");
        }
        if (!useDeviceTime && typeof time !== "number") {
          throw new Error("Provide a valid timestamp");
        }

        if (useDeviceTime) {
          time = new Date().getTime();
        }

        value = Math.round(value * 100) / 100;

        if (dataStore.data.every((elm) => elm.sensorname !== sensorName)) {
          dataStore.data.push({
            sensorname: sensorName,
            start: time,
            end: time,
            timeSeriesData: [{ timestamp: time, datapoint: value }],
          });
        } else {
          const idx = dataStore.data.findIndex(
            (elm) => elm.sensorname === sensorName
          );
          dataStore.data[idx].timeSeriesData.push({
            timestamp: time,
            datapoint: value,
          });

          if (dataStore.data[idx].start > time) {
            dataStore.data[idx].start = time;
          }
          if (dataStore.data[idx].end < time) {
            dataStore.data[idx].end = time;
          }
        }

        counter++;
        if (counter > 500) {
          upload();
          counter = 0;
          dataStore = { datasetKey: datasetKey, data: [] };
        }
      }

      async function upload(datasetLabel) {
        const tmp_datastore = JSON.parse(JSON.stringify(dataStore));
        try {
          await axiosExports.post(url + URLS.addDatasetIncrementBatch, {
            datasetKey: tmp_datastore.datasetKey,
            data: tmp_datastore.data,
            datasetLabel: datasetLabel,
          });
        } catch (e) {
          error = "Could not upload data";
        }
      }

      /**
       * Synchronizes the server with the data when you have added all data
       */
      async function onComplete() {
        if (uploadComplete) {
          throw new Error("Dataset is already uploaded");
        }
        await upload(datasetLabel);
        if (error) {
          throw new Error(error);
        }
        uploadComplete = true;
      }

      if (useDeviceTime) {
        return {
          addDataPoint: (sensorName, value) =>
            addDataPoint(undefined, sensorName, value),
          onComplete: onComplete,
        };
      } else {
        return {
          addDataPoint: (time, sensorName, value) =>
            addDataPoint(time, sensorName, value),
          onComplete: onComplete,
        };
      }
    } catch (e) {
      throw e;
    }
  }

  var index = { datasetCollector, sendDataset, Predictor };

  return index;

})();
