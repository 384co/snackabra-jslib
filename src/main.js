/* Copyright (c) 2020-2022 Magnusson Institute, All Rights Reserved */

/* Distributed under GPL-v03, see 'LICENSE' file for details */

function SB_libraryVersion() {
  if (process.browser)
    return 'This is the BROWSER version of the library';
  else
    return 'This is the NODE.JS version of the library';
}

/* SB simple events (mesage bus) class */
export class MessageBus {
  constructor(args) {
    this.args = args;
    this.bus = {};
  }

  /* for possible future use with cleaner identifiers */
  * #uniqueID() {
    let i = 0;
    while (true) {
      i += 1;
      yield i;
    }
  }

  /* safely returns handler for any event */
  #select(event) {
    return this.bus[event] || (this.bus[event] = []);
  }

  /* 'event' is a string, special case '*' means everything */
  subscribe(event, handler) {
    this.#select(event).push(handler);
  }

  unsubscribe(event, handler) {
    let i = -1;
    if (event in this.bus) {
      if ((i = this.bus[event].findLastIndex((e) => e == handler)) != -1) {
        this.bus[event].splice(i, 1);
      }
    }
  }

  publish(event, ...args) {
    for (const handler of this.#select('*')) {
      handler(event, ...args);
    }
    for (const handler of this.#select(event)) {
      handler(...args);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * @fileoverview Main file for snackabra javascript utilities.
 *               See https://snackabra.io for details.
 * @package
 */

/* TODO - list of modules that main.js can now fully support:
          (note: some MI-internal references)
   m042/src/scripts/components/FormSubmission.js
*/

// the below general exception handler can be improved so us to
// retain the error stack, per:
// https://stackoverflow.com/a/42755876
// class RethrownError extends Error {
//   constructor(message, error){
//     super(message)
//     this.name = this.constructor.name
//     if (!error) throw new Error('RethrownError requires a message and error')
//     this.original_error = error
//     this.stack_before_rethrow = this.stack
//     const message_lines =  (this.message.match(/\n/g)||[]).length + 1
//     this.stack = this.stack.split('\n').slice(0, message_lines+1).join('\n') + '\n' +
//                  error.stack
//   }
// }
// throw new RethrownError(`Oh no a "${error.message}" error`, error)

function _sb_exception(loc, msg) {
  const m = '<< SB lib error (' + loc + ': ' + msg + ') >>';
  console.log(m);
  throw new Error(m);
}

// Parts of this code is based on 'base64.ts':
// raw.githubusercontent.com/dankogai/js-base64/main/base64.mjs which
// was distributed under BSD 3-Clause; we believe our use of the code
// here under GPL v3 is compatible with that license.

const _fromCC = String.fromCharCode.bind(String);

// ****************************************************************
// implement SB flavor of 'btoa'
// ****************************************************************

const _U8Afrom = (it, fn = (x) => x) => new Uint8Array(Array.prototype.slice.call(it, 0).map(fn));

/** Standardized 'btoa()'-like function, e.g., takes a binary string
 ('b') and returns a Base64 encoded version ('a' used to be short
 for 'ascii').

 @param {buffer} Uint8Array buffer
 @return {string} base64 string
 */
function arrayBufferToBase64(buffer) {
  const u8a = new Uint8Array(buffer);
  if (process.browser) {
    // we could use window.btoa but chose not to
    let u32, c0, c1, c2, asc = '';
    const maxargs = 0x1000;
    const strs = [];
    for (let i = 0, l = u8a.length; i < l; i += maxargs) strs.push(_fromCC.apply(null, u8a.subarray(i, i + maxargs)));
    const bin = strs.join('');
    const pad = bin.length % 3;
    for (let i = 0; i < bin.length;) {
      if ((c0 = bin.charCodeAt(i++)) > 255 || (c1 = bin.charCodeAt(i++)) > 255 || (c2 = bin.charCodeAt(i++)) > 255) throw new Error('Invalid Character');
      u32 = (c0 << 16) | (c1 << 8) | c2;
      asc += b64chs[u32 >> 18 & 63] + b64chs[u32 >> 12 & 63] + b64chs[u32 >> 6 & 63] + b64chs[u32 & 63];
    }
    return pad ? asc.slice(0, pad - 3) + '==='.substring(pad) : asc;
  } else {
    // nodejs, so has Buffer, just use that
    return Buffer.from(u8a).toString('base64');
  }
}

// ****************************************************************
// implement SB flavor of 'atob'
// ****************************************************************

const b64ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const b64chs = Array.prototype.slice.call(b64ch);
const b64tab = ((a) => {
  const tab = {};
  a.forEach((c, i) => tab[c] = i);
  return tab;
})(b64chs);

/** Standardized 'atob()' function, e.g. takes the a Base64 encoded
 input and decodes it. Note: always returns Uint8Array.

 @param {string} base64 string
 @return {Uint8Array} returns decoded result
 */
function base64ToArrayBuffer(asc) {
  asc = asc.replace(/\s+/g, ''); // collapse any whitespace
  asc += '=='.slice(2 - (asc.length & 3)); // make it tolerant of padding
  if (!_assertBase64(asc)) throw new Error('Invalid Character');
  if (process.browser) {
    // we could use window.atob but chose not to
    let u24, bin = '', r1, r2;
    for (let i = 0; i < asc.length;) {
      u24 = b64tab[asc.charAt(i++)] << 18 | b64tab[asc.charAt(i++)] << 12 | (r1 = b64tab[asc.charAt(i++)]) << 6 | (r2 = b64tab[asc.charAt(i++)]);
      bin += r1 === 64 ? _fromCC(u24 >> 16 & 255) : r2 === 64 ? _fromCC(u24 >> 16 & 255, u24 >> 8 & 255) : _fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255);
    }
    return str2ab(bin);
  } else {
    return _U8Afrom(Buffer.from(asc, 'base64'));
  }
}

function _appendBuffer(buffer1, buffer2) {
  try {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  } catch (e) {
    console.log(e);
    return {};
  }
};

/* ****************************************************************
 *  These are wrappers to handle both browser and node targets
 *  with the same code. The 'process.browser' value is replaced
 *  by rollup and this whole library is then tree-shaken so
 *  that only either the node-specific or browser-specific code
 *  is retained, into 'index.mjs' and 'browser.mjs' respectively.
 * ****************************************************************/

let _crypto, _fs, _path;
if (process.browser) {
  _crypto = crypto;
} else {
  _fs = await import('fs');
  _path = await import('path');
  _crypto = await import('crypto');
}

function getRandomValues(buffer) {
  return _crypto.getRandomValues(buffer);
}

/**
 Returns 'true' if (and only if) object is of type 'Uint8Array'.
 Works same on browsers and nodejs.
 */
function _assertUint8Array(obj) {
  if (typeof obj === 'object') if (Object.prototype.toString.call(obj) === '[object Uint8Array]') return true;
  return false;
}

const b64_regex = new RegExp('^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$');

/**
 Returns 'true' if (and only if) string is well-formed base64.
 Works same on browsers and nodejs.
 */
function _assertBase64(base64) {
  /* webpack 4 doesn't support optional chaining, requires webpack 5;
     since wp 5 is pretty recent (2020-10-10), we'll avoid using
     optional chaining in this library for a while */
  // return (b64_regex.exec(base64)?.[0] === base64);
  const z = b64_regex.exec(base64);
  if (z) return (z[0] === base64); else return false;
}

/** Standardized 'str2ab()' function, string to array buffer.
 This assumes on byte per character.
 @param {string} string
 @return {Uint8Array} buffer
 */
function str2ab(string) {
  const length = string.length;
  const buffer = new Uint8Array(length);
  for (let i = 0; i < length; i++) buffer[i] = string.charCodeAt(i);
  return buffer;
}

/** Standardized 'ab2str()' function, array buffer to string.
 This assumes one byte per character.
 @param {string} string
 @return {Uint8Array} buffer
 */
function ab2str(buffer) {
  if (!_assertUint8Array(buffer)) _sb_exception('ab2str()', 'parameter is not a Uint8Array buffer'); // this will throw
  return String.fromCharCode.apply(null, new Uint8Array(buffer));
}

/* ****************************************************************
 *  TODO functions - look for duplicates
 * ****************************************************************/

/* TODO
export function verifyCookie(request, env) {
  // room.mjs uses without env, storage with env
}
*/

// the publicKeyPEM paramater below needs to look like this:
const defaultPublicKeyPEM = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAtVedzwPq7OIl84xx9ruV
TAkv+sUPUYeQJ3PtFOJkBSrMyGPErVxjXQQ6nvb+OevQ2t7EhimyQ3bnP7PdeAU2
mWQX6V8LfhJj0ox8Envtw9DF7nEED5aLwnimTjox906j7itXO2xDdJCRuAfpar3u
Tj3d0EAKWFXTBHrorKI0pHCg1opIRsqNjpVnetZn1SweCtArE7YymNRQmoi8XWzj
yCt41fGFoFcmVeE87hiq41NJkE0iMfrmf6QqE91Fp1BSSTD75KEbKPXepS/jl3nV
VFe4tWrHypcT+Uk7I2UBqHnR+AnODVrSxZMzoVnXoYbhDAdReTQ81MrSQ+LW7yZV
rTxa5uYVPIRB6l58dpBEhIGcvEz376fvEwdhEqw9iXm7FchbqX3FQpwDVKvguj+w
jIaV60/hyBaRPO2oD9IhByvL3F+Gq+iwQRXbEgvI8QvkJ1w/WcelytljcwUoYbC5
7VS7EvnoNvMQT+r5RJfoPVPbwsCOFAQCVnzyOPAMZyUn69ycK+rONvrVxkM+c8Q2
8w7do2MDeRWJRf4Va0XceXsN+YcK7g9bqBWrBYJIWzeRiAQ3R6kyaxxbdEhyY3Hl
OlY876IbVmwlWAQ82l9r7ECjBL2nGMjDFm5Lv8TXKC5NHWHwY1b2vfvl6cyGtG1I
OTJj8TMRI6y3Omop3kIfpgUCAwEAAQ==
-----END PUBLIC KEY-----`;

/** Import a PEM encoded RSA public key, to use for RSA-OAEP
 encryption.  Takes a string containing the PEM encoded key, and
 returns a Promise that will resolve to a CryptoKey representing
 the public key.

 @param {PEM} RSA public key, string, PEM format
 @return {cryptoKey} RSA-OAEP key
 */
function importPublicKey(pem) {
  if (!pem) pem = defaultPublicKeyPEM;
  // fetch the part of the PEM string between header and footer
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const start = pem.indexOf(pemHeader);
  const end = pem.indexOf(pemFooter);
  if ((start < 0) || (end < 0)) _sb_exception('importPublicKey()', 'fail to find BEGIN and/or END string in RSA (PEM) key');
  const pemContents = pem.slice(start + pemHeader.length, end);
  // const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
  const binaryDer = base64ToArrayBuffer(pemContents);
  return _crypto.subtle.importKey('spki', binaryDer, {name: 'RSA-OAEP', hash: 'SHA-256'}, true, ['encrypt']);
}

/** Returns random number
 @return {int} integer 0..255
 */
function simpleRand256() {
  return _crypto.getRandomValues(new Uint8Array(1))[0];
}


const base32mi = '0123456789abcdefyhEjkLmNHpFrRTUW';

/** Returns a random string in requested encoding
 @param {n} number of characters
 @param {code} encoding, supported types: 'base32mi'
 @return {string} random string

 'base32mi': '0123456789abcdefyhEjkLmNHpFrRTUW'
 */
function simpleRandomString(n, code) {
  if (code == 'base32mi') {
    // yeah of course we need to add base64 etc
    const z = _crypto.getRandomValues(new Uint8Array(n));
    let r = '';
    for (let i = 0; i < n; i++) r += base32mi[z[i] & 31];
    return r;
  }
  _sb_exception('simpleRandomString', 'code ' + code + ' not supported');
}

/** Disambiguates strings that are known to be 'base32mi' type
 @param {s} string
 @return {string} cleaned up string

 'base32mi': '0123456789abcdefyhEjkLmNHpFrRTUW'

 This is the base32mi disambiguation table:

 [OoQD] -> '0'
 [lIiJ] -> '1'
 [Zz] -> '2'
 [A] -> '4'
 [Ss] -> '5'
 [G] -> '6'
 [t] -> '7'
 [B] -> '8'
 [gq] -> '9'
 [C] -> 'c'
 [Y] -> 'y'
 [KxX] -> 'k'
 [M] -> 'm'
 [n] -> 'N'
 [P] -> 'p'
 [uvV] -> 'U'
 [w] -> 'W'

 Another way to think of it is that this, becomes this ('.' means no change):

 0123456789abcdefghijklmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVXYZ
 ................9.1..1.N0.9.57UUk.248c0EF6.11kLm.0p0.5..Uky2

 */
function cleanBase32mi(s) {
  // this of course is not the most efficient
  return s.replace(/[OoQD]/g, '0').replace(/[lIiJ]/g, '1').replace(/[Zz]/g, '2').replace(/[A]/g, '4').replace(/[Ss]/g, '5').replace(/[G]/g, '6').replace(/[t]/g, '7').replace(/[B]/g, '8').replace(/[gq]/g, '9').replace(/[C]/g, 'c').replace(/[Y]/g, 'y').replace(/[KxX]/g, 'k').replace(/[M]/g, 'm').replace(/[n]/g, 'N').replace(/[P]/g, 'p').replace(/[uvV]/g, 'U').replace(/[w]/g, 'w');
}


/** Takes an arbitrary dict object, a public key in PEM
 format, and a callback function: generates a random AES key,
 wraps that in (RSA) key, and when all done will call the
 callback function with the results

 @param {dict} dictionary (payload)
 @param {publicKeyPEM} public key (PEM format)
 @param {callback} callback function, called with results
 */
function packageEncryptDict(dict, publicKeyPEM, callback) {
  const clearDataArrayBufferView = str2ab(JSON.stringify(dict));
  const aesAlgorithmKeyGen = {name: 'AES-GCM', length: 256};
  const aesAlgorithmEncrypt = {name: 'AES-GCM', iv: _crypto.getRandomValues(new Uint8Array(16))};
  if (!publicKeyPEM) publicKeyPEM = defaultPublicKeyPEM;
  // Create a key generator to produce a one-time-use AES key to encrypt some data
  _crypto.subtle.generateKey(aesAlgorithmKeyGen, true, ['encrypt']).then((aesKey) => {
    // we are exporting the symmetric AES key so we can encrypt it using pub key
    _crypto.subtle.exportKey('raw', aesKey).then((theKey) => {
      // console.log('raw key is:');
      // console.log(theKey);
      // console.log('arrayBufferToBase64 of raw AES key is:');
      // console.log(arrayBufferToBase64(theKey));
      // console.log('raw AES key itself: ');
      // console.log(theKey);
      const rsaAlgorithmEncrypt = {name: 'RSA-OAEP'};
      importPublicKey(publicKeyPEM).then((publicKey) => {
        return _crypto.subtle.encrypt(rsaAlgorithmEncrypt, publicKey, theKey);
      }).then((buf) => {
        const encryptedAesKey = arrayBufferToBase64(buf);
        // console.log('rsa ciphertext of our aes key in base 64 encoding is: ');
        // console.log(encryptedAesKey);
        return encryptedAesKey;
      }).then((encAesKey) => {
        // console.log('IV is:');
        // console.log(arrayBufferToBase64(aesAlgorithmEncrypt.iv));
        return Promise.all([_crypto.subtle.encrypt(aesAlgorithmEncrypt, aesKey, clearDataArrayBufferView), encAesKey]);
      }).then((arr) => {
        // arr[0] is the encrypted dict in raw format, arr[1] is the aes key encrypted with rsa public key
        const encryptedData = arrayBufferToBase64(arr[0]);
        // console.log('this is the encryptedApplication, or arrayBufferToBase64(arr[0])');
        // console.log(arr[0]);
        // console.log(encryptedData);
        const postableEncryptedAesKey = arr[1];
        // console.log(postableEncryptedAesKey);
        const theContent = encodeURIComponent(encryptedData);
        const data = {
          enc_aes_key: encodeURIComponent(postableEncryptedAesKey),
          iv: encodeURIComponent(arrayBufferToBase64(aesAlgorithmEncrypt.iv)),
          content: theContent
        };
        if (callback) {
          callback(data);
        } else {
          console.log('(No Callback) Resulting data:');
          console.log(data);
        }
      });
    });
  });
} // packageEncrypt()

function partition(str, n) {
  const returnArr = [];
  let i, l;
  for (i = 0, l = str.length; i < l; i += n) {
    returnArr.push(str.substr(i, n));
  }
  return returnArr;
}

function extractPayloadV1(payload) {
  try {
    const metadataSize = new Uint32Array(payload.slice(0, 4))[0];
    const decoder = new TextDecoder();
    const metadata = JSON.parse(decoder.decode(payload.slice(4, 4 + metadataSize)));
    let startIndex = 4 + metadataSize;
    const data = {};
    for (const key in metadata) {
      if (data.hasOwnProperty(key)) {
        data[key] = payload.slice(startIndex, startIndex + metadata[key]);
        startIndex += metadata[key];
      }
    }
    return data;
  } catch (e) {
    console.log(e);
    return {};
  }
}

function assemblePayload(data) {
  try {
    const metadata = {};
    metadata['version'] = '002';
    let keyCount = 0;
    let startIndex = 0;
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        keyCount++;
        metadata[keyCount.toString()] = {name: key, start: startIndex, size: data[key].byteLength};
        startIndex += data[key].byteLength;
      }
    }
    const encoder = new TextEncoder();
    const metadataBuffer = encoder.encode(JSON.stringify(metadata));
    const metadataSize = new Uint32Array([metadataBuffer.byteLength]);
    let payload = _appendBuffer(metadataSize.buffer, metadataBuffer);
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        payload = _appendBuffer(payload, data[key]);
      }
    }
    return payload;
  } catch (e) {
    console.log(e);
    return {};
  }
}

function extractPayload(payload) {
  try {
    const metadataSize = new Uint32Array(payload.slice(0, 4))[0];
    const decoder = new TextDecoder();
    console.log('METADATASIZE: ', metadataSize);
    console.log('METADATASTRING: ', decoder.decode(payload.slice(4, 4 + metadataSize)));
    const _metadata = JSON.parse(decoder.decode(payload.slice(4, 4 + metadataSize)));
    console.log('METADATA EXTRACTED', JSON.stringify(_metadata));
    const startIndex = 4 + metadataSize;
    if (!_metadata.hasOwnProperty('version')) {
      _metadata['version'] = '001';
    }
    console.log(_metadata['version']);
    switch (_metadata['version']) {
      case '001':
        return extractPayloadV1(payload);
      case '002':
        const data = {};
        for (let i = 1; i < Object.keys(_metadata).length; i++) {
          const _index = i.toString();
          if (_metadata.hasOwnProperty(_index)) {
            const propertyStartIndex = _metadata[_index]['start'];
            console.log(propertyStartIndex);
            const size = _metadata[_index]['size'];
            data[_metadata[_index]['name']] = payload.slice(startIndex + propertyStartIndex, startIndex + propertyStartIndex + size);
          }
        }
        return data;
      default:
        throw new Error('Unsupported payload version (' + _metadata['version'] + ') - fatal');
    }
  } catch (e) {
    // console.log("HIGH LEVEL ERROR", e.message);
    throw new Error('extractPayload() exception (' + e.message + ')');
  }
}

function encodeB64Url(input) {
  return input.replaceAll('+', '-').replaceAll('/', '_');
}

function decodeB64Url(input) {
  input = input.replaceAll('-', '+').replaceAll('_', '/');

  // Pad out with standard base64 required padding characters
  const pad = input.length % 4;
  if (pad) {
    if (pad === 1) {
      throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding');
    }
    input += new Array(5 - pad).join('=');
  }

  return input;
}

class EventEmitter extends EventTarget {
  on(type, callback) {
    this.addEventListener(type, callback);
  }

  emit(type, data) {
    new Event(type, data);
  }
}

// A class that contains all the SB specific crypto functions
class Crypto {
  extractPubKey(privateKey) {
    try {
      const pubKey = {...privateKey};
      delete pubKey.d;
      delete pubKey.dp;
      delete pubKey.dq;
      delete pubKey.q;
      delete pubKey.qi;
      pubKey.key_ops = [];
      return pubKey;
    } catch (e) {
      console.log(e);
      return {};
    }
  }

  generateKeys() {
    return new Promise(async (resolve, reject) => {
      try {
        resolve(await _crypto.subtle.generateKey({
          name: 'ECDH', namedCurve: 'P-384'
        }, true, ['deriveKey']));
      } catch (e) {
        reject(e);
      }
    });
  }

  importKey(format, key, type, extractable, keyUsages) {
    return new Promise(async (resolve, reject) => {
      const keyAlgorithms = {
        ECDH: {
          name: 'ECDH', namedCurve: 'P-384'
        }, AES: {
          name: 'AES-GCM'
        }, PBKDF2: 'PBKDF2'
      };
      try {
        const response = await _crypto.subtle.importKey(format, key, keyAlgorithms[type], extractable, keyUsages);
        resolve(response);
      } catch (e) {
        console.log(format, key, type, extractable, keyUsages);
        reject(e);
      }
    });
  }

  deriveKey(privateKey, publicKey, type, extractable, keyUsages) {
    return new Promise(async (resolve, reject) => {
      const keyAlgorithms = {
        AES: {
          name: 'AES-GCM', length: 256
        }, HMAC: {
          name: 'HMAC', hash: 'SHA-256', length: 256
        }
      };
      try {
        resolve(await _crypto.subtle.deriveKey({
          name: 'ECDH', public: publicKey
        }, privateKey, keyAlgorithms[type], extractable, keyUsages));
      } catch (e) {
        console.log(privateKey, publicKey, type, extractable, keyUsages);
        reject(e);
      }
    });
  }

  getFileKey(fileHash, _salt) {
    return new Promise(async (resolve, reject) => {
      try {
        const keyMaterial = await this.importKey('raw', base64ToArrayBuffer(decodeURIComponent(fileHash)), 'PBKDF2', false, ['deriveBits', 'deriveKey']);

        // TODO - Support deriving from PBKDF2 in deriveKey function
        const key = await _crypto.subtle.deriveKey({
          'name': 'PBKDF2', // salt: _crypto.getRandomValues(new Uint8Array(16)),
          'salt': _salt, 'iterations': 100000, // small is fine, we want it snappy
          'hash': 'SHA-256'
        }, keyMaterial, {'name': 'AES-GCM', 'length': 256}, true, ['encrypt', 'decrypt']);
        // return key;
        resolve(key);
      } catch (e) {
        reject(e);
      }
    });
  }

  encrypt(contents, secret_key = null, outputType = 'string', _iv = null) {
    return new Promise(async (resolve, reject) => {
      try {
        if (contents === null) {
          reject(new Error('no contents'));
        }
        const iv = _iv === null ? _crypto.getRandomValues(new Uint8Array(12)) : _iv;
        const algorithm = {
          name: 'AES-GCM', iv: iv
        };
        const key = secret_key;
        let data = contents;
        const encoder = new TextEncoder();
        if (typeof contents === 'string') {
          data = encoder.encode(contents);
        }

        let encrypted;
        try {
          encrypted = await _crypto.subtle.encrypt(algorithm, key, data);
        } catch (e) {
          reject(e);
        }
        resolve((outputType === 'string') ? {
          content: encodeURIComponent(arrayBufferToBase64(encrypted)), iv: encodeURIComponent(arrayBufferToBase64(iv))
        } : {content: encrypted, iv: iv});
      } catch (e) {
        console.log(e);
        reject(e);
      }
    });
  }

  decrypt(secretKey, contents, outputType = 'string') {
    return new Promise(async (resolve, reject) => {
      try {
        const ciphertext = typeof contents.content === 'string' ? base64ToArrayBuffer(decodeURIComponent(contents.content)) : contents.content;
        const iv = typeof contents.iv === 'string' ? base64ToArrayBuffer(decodeURIComponent(contents.iv)) : contents.iv;
        const decrypted = await _crypto.subtle.decrypt({
          name: 'AES-GCM', iv: iv
        }, secretKey, ciphertext);
        if (outputType === 'string') {
          resolve(new TextDecoder().decode(decrypted));
        }
        resolve(decrypted);
      } catch (e) {
        reject(e);
      }
    });
  }

  sign(secretKey, contents) {
    return new Promise(async (resolve, reject) => {
      try {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(contents);
        let sign;
        try {
          sign = await _crypto.subtle.sign('HMAC', secretKey, encoded);
          resolve(encodeURIComponent(arrayBufferToBase64(sign)));
        } catch (error) {
          reject(error);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  verify(secretKey, sign, contents) {
    return new Promise(async (resolve, reject) => {
      try {
        const _sign = base64ToArrayBuffer(decodeURIComponent(sign));
        const encoder = new TextEncoder();
        const encoded = encoder.encode(contents);
        try {
          const verified = await _crypto.subtle.verify('HMAC', secretKey, _sign, encoded);
          resolve(verified);
        } catch (e) {
          reject(e);
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  areKeysSame(key1, key2) {
    if (key1 != null && key2 != null && typeof key1 === 'object' && typeof key2 === 'object') {
      return key1['x'] === key2['x'] && key1['y'] === key2['y'];
    }
    return false;
  }
}

const SB_Crypto = new Crypto();

// Identity aka a key for use in SB
class Identity {
  exportable_pubKey;
  exportable_privateKey;
  privateKey;

  constructor(key) {
    return new Promise(async (resolve, reject) => {
      try {
        if (key) {
          await this.#mountKeys(key);
        } else {
          await this.#mintKeys();
        }
        resolve(this);
      } catch (e) {
        reject(e);
      }
    });
  }

  #mintKeys() {
    return new Promise(async (resolve, reject) => {
      try {
        const keyPair = await SB_Crypto.generateKeys();
        this.exportable_pubKey = await _crypto.subtle.exportKey('jwk', keyPair.publicKey);
        this.exportable_privateKey = await _crypto.subtle.exportKey('jwk', keyPair.privateKey);
        this.privateKey = keyPair.privateKey;
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }

  #mountKeys(key) {
    return new Promise(async (resolve, reject) => {
      try {
        this.exportable_privateKey = key;
        this.exportable_pubKey = SB_Crypto.extractPubKey(key);
        this.privateKey = await SB_Crypto.importKey('jwk', key, 'ECDH', true, ['deriveKey']);
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }

  get _id() {
    return JSON.stringify(this.exportable_pubKey);
  }
}

// Takes a message object and turns it into a payload to be used by SB protocol
class Payload { // eslint-disable-line no-unused-vars
  async wrap(contents, key) {
    try {
      return {encrypted_contents: await SB_Crypto.encrypt(JSON.stringify(contents), key, 'string')};
    } catch (e) {
      console.error(e);
      return {error: 'Unable to encrypt payload.'};
    }
  }

  async unwrap(payload, key) {
    try {
      const msg = await SB_Crypto.decrypt(key, payload.encrypted_contents);
      if (msg.error) {
        return {error: msg.error};
      }
      return msg;
    } catch (e) {
      return {error: e.message};
    }
  }
}


// Protocol code that we wrap our WebSocket in
// I will be updating this to send messages and remove the wait to send messages only when ack received
// The benefit is reduced latency in communication protocol
class WS_Protocol { // eslint-disable-line no-unused-vars
  currentWebSocket;
  _id;
  events = new MessageBus();
  options = {
    url: '', onOpen: null, onMessage: null, onClose: null, onError: null, timeout: 30000
  };


  constructor(options) {
    if (!options.url) {
      throw new Error('URL must be set');
    }
    this.options = Object.assign(this.options, options);
    this.join();
  }

  get options() {
    return this.options;
  }

  join() {
    return new Promise((resolve, reject) => {
      try {
        this.currentWebSocket = new WebSocket(this.options.url);
        this.error();
        this.close();
        this.open();
        this.message();
        resolve();
      } catch (e) {
        console.error(e);
        reject(e);
      }
    });
  }

  send = (message) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (this.currentWebSocket.readyState === 1) {
          const hash = await _crypto.subtle
            .digest('SHA-256', new TextEncoder().encode(message));
          const ackPayload = {
            timestamp: Date.now(), type: 'ack', _id: arrayBufferToBase64(hash)
          };
          this.currentWebSocket.send(JSON.stringify(ackPayload));

          const ackResponse = () => {
            this.currentWebSocket.send(message);
            clearTimeout(timeout);
            this.events.unsubscribe('ws_ack_' + ackPayload._id, ackResponse);
            resolve();
          };

          this.events.subscribe('ws_ack_' + ackPayload._id, ackResponse);
          const timeout = setTimeout(() => {
            const error = `Websocket request timed out after ${this.options.timeout}ms`;
            console.error(error);
            this.events.unsubscribe('ws_ack_' + ackPayload._id, ackResponse);
            reject(new Error(error));
          }, this.options.timeout);
        }
      } catch (e) {
        console.error(e);
      }
    });
  };

  async error() {
    this.currentWebSocket.addEventListener('error', (event) => {
      console.log('WebSocket error, reconnecting:', event);
      if (typeof this.options.onError === 'function') {
        this.options.onError(event);
      }
    });
  }

  async close() {
    this.currentWebSocket.addEventListener('close', (event) => {
      console.info('Websocket closed', event);
      if (typeof this.options.onClose === 'function') {
        this.options.onClose(event);
      }
    });
  }

  async message() {
    this.currentWebSocket.addEventListener('message', async (event) => {
      const data = JSON.parse(event.data);

      if (data.ack) {
        this.events.publish('ws_ack_' + data._id);
        return;
      }
      if (data.nack) {
        console.log('Nack received');
        this.close();
        return;
      }
      if (typeof this.options.onMessage === 'function') {
        this.options.onMessage(event);
      }
    });
  }

  get readyState() {
    return this.currentWebSocket.readyState;
  }

  async open() {
    this.currentWebSocket.addEventListener('open', async (event) => {
      if (this.queue.length > 0) {
        for (const i in this.queue) {
          if (this.queue[i]) {
            this.send(JSON.stringify(this.queue[i]));
          }
        }
      }
      this.queue = [];
      if (typeof this.options.onOpen === 'function') {
        this.options.onOpen(event);
      }
    });
    EventEmitter;
  }
}

class Channel {
  _id;
  url;
  identity;
  owner;
  admin;
  verifiedGuest;
  #keys;
  #api;
  #socket;

  constructor(url, identity, channel_id = null) {
    this.url = url;
    this.identity = identity;
    if (channel_id) {
      this._id = channel_id;
    }
    this.#api = new ChannelApi(url, this, identity);
  }

  get keys() {
    return this.#keys;
  }

  get api() {
    return this.#api;
  }

  get socket() {
    return this.#socket;
  }

  loadKeys(keys) {
    return new Promise(async (resolve, reject) => {
      if (keys.ownerKey === null) {
        reject(new Error('Channel does not exist'));
      }
      let _exportable_owner_pubKey = JSON.parse(keys.ownerKey || JSON.stringify({}));
      if (_exportable_owner_pubKey.hasOwnProperty('key')) {
        _exportable_owner_pubKey = typeof _exportable_owner_pubKey.key === 'object' ? _exportable_owner_pubKey.key : JSON.parse(_exportable_owner_pubKey.key);
      }
      try {
        _exportable_owner_pubKey.key_ops = [];
      } catch (error) {
        reject(error);
      }
      const _exportable_room_signKey = JSON.parse(keys.signKey);
      const _exportable_encryption_key = JSON.parse(keys.encryptionKey);
      let _exportable_verifiedGuest_pubKey = JSON.parse(keys.guestKey || null);
      const _exportable_pubKey = keys.exportable_pubKey;
      const _privateKey = keys.privateKey;
      let isVerifiedGuest = false;
      const _owner_pubKey = await SB_Crypto.importKey('jwk', _exportable_owner_pubKey, 'ECDH', false, []);
      if (_owner_pubKey.error) {
        console.log(_owner_pubKey.error);
      }
      const isOwner = SB_Crypto.areKeysSame(_exportable_pubKey, _exportable_owner_pubKey);
      const isAdmin = (document.cookie.split('; ').find((row) => row.startsWith('token_' + this._id)) !== undefined) || (process.env.REACT_APP_ROOM_SERVER !== 's_socket.privacy.app' && isOwner);
      if (!isOwner && !isAdmin) {
        if (_exportable_verifiedGuest_pubKey === null) {
          this.api.postPubKey(_exportable_pubKey);
          _exportable_verifiedGuest_pubKey = {..._exportable_pubKey};
        }
        if (SB_Crypto.areKeysSame(_exportable_verifiedGuest_pubKey, _exportable_pubKey)) {
          isVerifiedGuest = true;
        }
      }

      const _encryption_key = await SB_Crypto.importKey('jwk', _exportable_encryption_key, 'AES', false, ['encrypt', 'decrypt']);

      const _room_privateSignKey = await SB_Crypto.importKey('jwk', _exportable_room_signKey, 'ECDH', true, ['deriveKey']);
      const _exportable_room_signPubKey = SB_Crypto.extractPubKey(_exportable_room_signKey);

      const _room_signPubKey = await SB_Crypto.importKey('jwk', _exportable_room_signPubKey, 'ECDH', true, []);
      const _personal_signKey = await SB_Crypto.deriveKey(_privateKey, _room_signPubKey, 'HMAC', false, ['sign', 'verify']);

      let _shared_key = null;
      if (!isOwner) {
        _shared_key = await SB_Crypto.deriveKey(_privateKey, _owner_pubKey, 'AES', false, ['encrypt', 'decrypt']);
      }

      let _locked_key = null;
      let _exportable_locked_key = localStorage.getItem(this.roomId + '_lockedKey');
      if (_exportable_locked_key !== null) {
        _locked_key = await SB_Crypto.importKey('jwk', JSON.parse(_exportable_locked_key), 'AES', false, ['encrypt', 'decrypt']);
      } else if (keys.locked_key) {
        const _string_locked_key = (await SB_Crypto.decrypt(isOwner ? await SB_Crypto.deriveKey(keys.privateKey, await SB_Crypto.importKey('jwk', keys.exportable_pubKey, 'ECDH', true, []), 'AES', false, ['decrypt']) : _shared_key, JSON.parse(keys.locked_key), 'string')).plaintext;
        _exportable_locked_key = JSON.parse(_string_locked_key);
        _locked_key = await SB_Crypto.importKey('jwk', JSON.parse(_exportable_locked_key), 'AES', false, ['encrypt', 'decrypt']);
      }


      this.#keys = {
        shared_key: _shared_key,
        exportable_owner_pubKey: _exportable_owner_pubKey,
        exportable_verifiedGuest_pubKey: _exportable_verifiedGuest_pubKey,
        personal_signKey: _personal_signKey,
        room_privateSignKey: _room_privateSignKey,
        encryptionKey: _encryption_key,
        locked_key: _locked_key,
        exportable_locked_key: _exportable_locked_key
      };
      this.owner = isOwner;
      this.admin = isAdmin;
      this.verifiedGuest = isVerifiedGuest;
    });
  }

  async unwrapMessages(new_messages) {
    const unwrapped_messages = {};
    for (const id in new_messages) {
      if (new_messages.hasOwnProperty(id) && new_messages[id].hasOwnProperty('encrypted_contents')) {
        if (new_messages[id].hasOwnProperty('encrypted_contents')) {
          try {
            const decryption_key = this.keys.encryptionKey;
            let msg = await this.decrypt(decryption_key, new_messages[id].encrypted_contents);
            if (msg.error) {
              msg = await this.decrypt(this.keys.locked_key, new_messages[id].encrypted_contents);
            }
            console.log(msg);
            const _json_msg = JSON.parse(msg.plaintext);
            console.log(_json_msg);
            if (!_json_msg.hasOwnProperty('control')) {
              unwrapped_messages[id] = _json_msg;
            } else {
              // console.log(_json_msg);
              //this.setState({controlMessages: [...this.state.controlMessages, _json_msg]});
            }
          } catch (e) {
            console.warn(e);
            // Skip the message if decryption fails - its probably due to the user not having <roomId>_lockedKey.
          }
        } else {
          unwrapped_messages[id] = new_messages[id];
        }
        localStorage.setItem(this._id + '_lastSeenMessage', id.slice(this._id.length));
      }
    }
    return unwrapped_messages;
  }
}

// A SB Socket
class ChannelSocket {
  _id;
  connection;
  url;
  events;
  init;
  #keys;
  #queue = Queue;
  #payload = Payload;

  constructor(crypto, queue, wsUrl) {
    this.#queue = queue;
    this.#payload = new Payload();
    this.url = wsUrl;
    return this;
  }

  setKeys(_keys) {
    this.#keys = _keys;
  }

  open(socketId, user) {
    console.log(socketId, user);
    const socketEvents = new MessageBus();
    const options = {
      url: this.url + socketId + '/websocket', onOpen: async (event) => {
        this.init = {name: JSON.stringify(user.exportable_pubKey)};
        await socket.send(JSON.stringify(this.init));
        socketEvents.publish('open', event);
      },
      onMessage: (event) => {
        socketEvents.publish('message', event);
      },
      onClose: (event) => {
        socketEvents.publish('close', event);
      },
      onError: (event) => {
        socketEvents.publish('error', event);
      },
      timeout: 500
    };
    const socket = new WS_Protocol(options);
    this.events = socketEvents;
    this._id = socketId;
    this.connection = socket;
  }

  async send(message, wrap = false) {
    let payload = message;
    try {
      if (wrap) {
        payload = await this.#payload.wrap(message, this.#keys.encryptionKey);
      }
      this.#queue.add({ws: {_id: this._id, url: this.url, init: this.init}, message: payload}, 'wsCallback');
    } catch (e) {
      console.error(e);
    }
  }
}

class StorageApi {
  server;

  constructor(server) {
    this.server = server;
  }

  saveFile(file) {
    if (file instanceof SBFile) {

    } else {
      throw new Error('Only instance of SBFile accepted');
    }
  }

  async #getFileKey(fileHash, _salt) {
    const keyMaterial = await SB_Crypto.importKey('raw', base64ToArrayBuffer(decodeURIComponent(fileHash)), 'PBKDF2', false, ['deriveBits', 'deriveKey']);

    // TODO - Support deriving from PBKDF2 in deriveKey function
    const key = await _crypto.subtle.deriveKey({
      'name': 'PBKDF2', 'salt': _salt, 'iterations': 100000, // small is fine, we want it snappy
      'hash': 'SHA-256'
    }, keyMaterial, {'name': 'AES-GCM', 'length': 256}, true, ['encrypt', 'decrypt']);
    // return key;
    return key;
  }

  saveImage(image, roomId,) {
    return new Promise(async (resolve, reject) => {
      const previewImage = padImage(await (await restrictPhoto(image, 4096, 'image/jpeg', 0.92)).arrayBuffer());
      const previewHash = await generateImageHash(previewImage);
      const fullImage = image.size > 15728640 ? padImage(await (await restrictPhoto(image, 15360, 'image/jpeg', 0.92)).arrayBuffer()) : padImage(await image.arrayBuffer());
      const fullHash = await generateImageHash(fullImage);
      const previewStorePromise = storeImage(previewImage, previewHash.id, previewHash.key, 'p', roomId).then((_x) => {
        if (_x.hasOwnProperty('error')) reject(new Error('Could not store preview: ' + _x['error']));
      });
      const fullStorePromise = storeImage(fullImage, fullHash.id, fullHash.key, 'f', roomId).then((_x) => {
        if (_x.hasOwnProperty('error')) reject(new Error('Could not full image: ' + _x['error']));
      });

      // return { full: { id: fullHash.id, key: fullHash.key }, preview: { id: previewHash.id, key: previewHash.key } }
      resolve({
        full: fullHash.id,
        preview: previewHash.id,
        fullKey: fullHash.key,
        previewKey: previewHash.key,
        fullStorePromise: fullStorePromise,
        previewStorePromise: previewStorePromise
      });
    });
  }

  storeRequest(fileId) {
    return new Promise(async (resolve, reject) => {
      fetch(this.server + '/storeRequest?name=' + fileId, {
        method: 'GET', credentials: 'include', headers: {
          'Content-Type': 'application/json'
        }
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.json();
        })
        .then((data) => {
          resolve(data);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  storeData(type, fileId) {
    return new Promise(async (resolve, reject) => {
      fetch(this.server + '/storeData?type=' + type + '&key=' + encodeURIComponent(fileId), {
        method: 'POST', body: assemblePayload({
          iv: encrypt_data.iv,
          salt: encrypt_data.salt,
          image: data.content,
          storageToken: (new TextEncoder()).encode(storageToken),
          vid: _crypto.getRandomValues(new Uint8Array(48))
        })
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.json();
        })
        .then((data) => {
          resolve(data);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  storeImage(image, image_id, keyData, type) {
    return new Promise(async (resolve, reject) => {
      const storeReqResp = await this.storeRequest(image_id);
      const encrypt_data = extractPayload(storeReqResp);
      const key = await this.#getFileKey(keyData, encrypt_data.salt);
      const data = await SB_Crypto.encrypt(image, key, 'arrayBuffer', encrypt_data.iv);
      const storageTokenReq = await this.storage;
      if (storageTokenReq.hasOwnProperty('error')) {
        return {error: storageTokenReq.error};
      }
      // storageToken = new TextEncoder().encode(storageTokenReq.token);
      const storageToken = JSON.stringify(storageTokenReq);
      const resp = await fetch(STORAGE_SERVER + '/storeData?type=' + type + '&key=' + encodeURIComponent(image_id), {
        method: 'POST', body: assemblePayload({
          iv: encrypt_data.iv,
          salt: encrypt_data.salt,
          image: data.content,
          storageToken: (new TextEncoder()).encode(storageToken),
          vid: _crypto.getRandomValues(new Uint8Array(48))
        })
      });
      const resp_json = await resp.json();
      // console.log("Response for " + type + ": ", resp_json)
      if (resp_json.hasOwnProperty('error')) {
        // TODO - why can't we throw exceptions?
        // Promise.reject(new Error('Server error on storing image (' + resp_json.error + ')'));
        return {error: 'Error: storeImage() failed (' + resp_json.error + ')'};
      }
      return {verificationToken: resp_json.verification_token, id: resp_json.image_id, type: type};
    });
  }

  fetchData(msgId, verificationToken) {
    return new Promise(async (resolve, reject) => {
      fetch(this.server + '/fetchData?id=' + encodeURIComponent(msgId) + '&verification_token=' + verificationToken, {
        method: 'GET'
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.arrayBuffer();
        })
        .then((data) => {
          resolve(data);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  #unpadData(data_buffer) {
    // console.log(data_buffer, typeof data_buffer)
    const _size = new Uint32Array(data_buffer.slice(-4))[0];
    return data_buffer.slice(0, _size);
  }

  async retrieveData(msgId, messages, controlMessages) {
    const imageMetaData = messages.find((msg) => msg._id === msgId).imageMetaData;
    const image_id = imageMetaData.previewId;
    const control_msg = controlMessages.find((msg) => msg.hasOwnProperty('id') && msg.id.startsWith(image_id));
    if (!control_msg) {
      return {'error': 'Failed to fetch data - missing control message for that image'};
    }
    const imageFetch = await this.fetchData(control_msg.id, control_msg.verificationToken);
    const data = extractPayload(imageFetch);
    const iv = data.iv;
    const salt = data.salt;
    const image_key = await this.#getFileKey(imageMetaData.previewKey, salt);
    const encrypted_image = data.image;
    const padded_img = await SB_Crypto.decrypt(image_key, {content: encrypted_image, iv: iv}, 'arrayBuffer');
    const img = this.#unpadData(padded_img.plaintext);
    //console.log(img)
    //console.log("data:image/jpeg;base64,"+this.arrayBufferToBase64(img.plaintext))
    if (img.error) {
      console.log('(Image error: ' + img.error + ')');
      throw new Error('Failed to fetch data - authentication or formatting error');
    }
    return {'url': 'data:image/jpeg;base64,' + arrayBufferToBase64(img)};
  }

  /* Unused Currently
  migrateStorage() {

  }

  fetchDataMigration() {

  }
   */
}

class ChannelApi {
  server;
  #identity;
  #channel;
  #channelApi;
  #channelServer;
  #payload;

  constructor(server, channel, identity) {
    this.server = server;
    this.#channel = channel;
    this.#payload = new Payload();
    this.#channelApi = server + '/api/';
    this.#channelServer = server + '/api/room/';
    this.#identity = identity;
  }

  create(serverSecret) {
    return new Promise(async (resolve, reject) => {
      try {
        const ownerKeyPair = await _crypto.subtle.generateKey({
          name: 'ECDH', namedCurve: 'P-384'
        }, true, ['deriveKey']);
        const exportable_privateKey = await _crypto.subtle.exportKey('jwk', ownerKeyPair.privateKey);
        const exportable_pubKey = await _crypto.subtle.exportKey('jwk', ownerKeyPair.publicKey);
        const channelId = await this.#generateRoomId(exportable_pubKey.x, exportable_pubKey.y);
        this.#channel._id = channelId;
        const encryptionKey = await _crypto.subtle.generateKey({
          name: 'AES-GCM', length: 256
        }, true, ['encrypt', 'decrypt']);
        const exportable_encryptionKey = await _crypto.subtle.exportKey('jwk', encryptionKey);
        const signKeyPair = await _crypto.subtle.generateKey({
          name: 'ECDH', namedCurve: 'P-384'
        }, true, ['deriveKey']);
        const exportable_signKey = await _crypto.subtle.exportKey('jwk', signKeyPair.privateKey);
        const channelData = {
          roomId: channelId,
          ownerKey: JSON.stringify(exportable_pubKey),
          encryptionKey: JSON.stringify(exportable_encryptionKey),
          signKey: JSON.stringify(exportable_signKey),
          SERVER_SECRET: serverSecret
        };
        const data = new TextEncoder().encode(JSON.stringify(channelData));
        const resp = await this.uploadChannel(data);
        if (resp.hasOwnProperty('success')) {
          const keys = {
            ownerKey: channelData.ownerKey,
            encryptionKey: channelData.encryptionKey,
            signKey: channelData.signKey
          };
          this.#channel.loadKeys(keys);
          resolve({
            channelId: channelId,
            exportable_privateKey: exportable_privateKey,
            ...keys

          });
        } else {
          reject(new Error(JSON.stringify(resp)));
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  getLastMessageTimes(_rooms) {
    return new Promise(async (resolve, reject) => {
      fetch(this.#channelApi + '/getLastMessageTimes', {
        method: 'POST', body: JSON.stringify(Object.keys(_rooms))
      }).then((response) => {
        if (!response.ok) {
          reject(new Error('Network response was not OK'));
        }
        return response.json();
      }).then((message_times) => {
        Object.keys(_rooms).forEach((room) => {
          _rooms[room]['lastMessageTime'] = message_times[room];
        });
        resolve(_rooms);
      }).catch((e) => {
        reject(e);
      });
    });
  }

  getOldMessages(currentMessagesLength) {
    return new Promise(async (resolve, reject) => {
      fetch(this.#channelServer + this.#channel._id + +'/oldMessages?currentMessagesLength=' + currentMessagesLength, {
        method: 'GET',
      }).then((response) => {
        if (!response.ok) {
          reject(new Error('Network response was not OK'));
        }
        return response.json();
      }).then(async (_encrypted_messages) => {
        resolve(_encrypted_messages);
      }).catch((e) => {
        reject(e);
      });
    });
  }

  updateCapacity(roomCapacity) {
    return new Promise(async (resolve, reject) => {
      fetch(this.#channelServer + this.#channel._id + '/updateRoomCapacity?capacity=' + roomCapacity, {
        method: 'GET', credentials: 'include'
      }).then((response) => {
        if (!response.ok) {
          reject(new Error('Network response was not OK'));
        }
        return response.json();
      }).then(async (data) => {
        resolve(data);
      }).catch((e) => {
        reject(e);
      });
    });
  }

  getCapacity() {
    return new Promise(async (resolve, reject) => {
      fetch(this.#channelServer + this.#channel._id + '/getRoomCapacity', {
        method: 'GET', credentials: 'include'
      }).then((response) => {
        if (!response.ok) {
          reject(new Error('Network response was not OK'));
        }
        return response.json();
      }).then(async (data) => {
        resolve(data.capacity);
      }).catch((e) => {
        reject(e);
      });
    });
  }

  getJoinRequests() {
    return new Promise(async (resolve, reject) => {
      fetch(this.server + this.#channel._id + '/getJoinRequests', {
        method: 'GET', credentials: 'include'
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.json();
        })
        .then(async (data) => {
          if (data.error) {
            reject(new Error(data.error));
          }
          resolve(data);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  lock() {
    return new Promise(async (resolve, reject) => {
      if (this.#channel.keys.locked_key == null && this.#channel.channel_admin) {
        const _locked_key = await _crypto.subtle.generateKey({
          name: 'AES-GCM', length: 256
        }, true, ['encrypt', 'decrypt']);
        const _exportable_locked_key = await _crypto.subtle.exportKey('jwk', _locked_key);
        fetch(this.server + this.#channel._id + '/lockRoom', {
          method: 'GET', credentials: 'include'
        })
          .then((response) => {
            if (!response.ok) {
              reject(new Error('Network response was not OK'));
            }
            return response.json();
          })
          .then(async (data) => {
            if (data.locked) {
              await this.acceptVisitor(JSON.stringify(this.#identity.exportable_pubKey));
            }
            resolve({locked: data.locked, lockedKey: _exportable_locked_key});
          }).catch((error) => {
          reject(error);
        });
      }
    });
  }

  acceptVisitor(pubKey) {
    return new Promise(async (resolve, reject) => {
      const shared_key = await SB_Crypto.deriveKey(this.#identity.keys.privateKey, await SB_Crypto.importKey('jwk', JSON.parse(pubKey), 'ECDH', false, []), 'AES', false, ['encrypt', 'decrypt']);
      const _encrypted_locked_key = await SB_Crypto.encrypt(JSON.stringify(this.#channel.keys.exportable_locked_key), shared_key, 'string');
      fetch(this.server + this.#channel._id + '/acceptVisitor', {
        method: 'POST',
        body: JSON.stringify({pubKey: pubKey, lockedKey: JSON.stringify(_encrypted_locked_key)}),
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.json();
        })
        .then((data) => {
          resolve(data);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  isLocked() {
    return new Promise(async (resolve, reject) => {
      fetch(this.#channelServer + this.#channel._id + '/roomLocked', {
        method: 'GET', credentials: 'include'
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.json();
        })
        .then((data) => {
          resolve(data.locked);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  setMOTD(motd) {
    return new Promise(async (resolve, reject) => {
      fetch(this.server + this.#channel._id + '/motd', {
        method: 'POST', body: JSON.stringify({motd: motd}), headers: {
          'Content-Type': 'application/json'
        }
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.json();
        })
        .then((data) => {
          resolve(data);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  ownerKeyRotation() {
    return new Promise(async (resolve, reject) => {
      fetch(this.#channelServer + this.#channel._id + '/ownerKeyRotation', {
        method: 'GET', credentials: 'include', headers: {
          'Content-Type': 'application/json'
        }
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.json();
        })
        .then((data) => {
          resolve(data);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  getAdminData() {
    return new Promise(async (resolve, reject) => {
      if (this.#channel.owner) {
        const token_data = new Date().getTime().toString();
        const token_sign = await SB_Crypto.sign(this.#identity.personal_signKey, token_data);
        fetch(this.server + this.#channel._id + '/getAdminData', {
          method: 'GET', credentials: 'include', headers: {
            'authorization': token_data + '.' + token_sign, 'Content-Type': 'application/json'
          }
        })
          .then((response) => {
            if (!response.ok) {
              reject(new Error('Network response was not OK'));
            }
            return response.json();
          })
          .then((data) => {
            if (data.error) {
              reject(new Error(data.error));
            }
            resolve(data);
          }).catch((error) => {
          reject(error);
        });
      } else {
        reject(new Error('Must be channel owner to get admin data'));
      }
    });
  }

  downloadData() {
    return new Promise(async (resolve, reject) => {
      fetch(this.server + this.#channel._id + '/downloadData', {
        method: 'GET', credentials: 'include', headers: {
          'Content-Type': 'application/json'
        }
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.json();
        })
        .then((data) => {
          resolve(data);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  uploadChannel(channelData) {
    return new Promise(async (resolve, reject) => {
      fetch(this.#channelServer + this.#channel._id + '/uploadRoom', {
        method: 'POST', body: channelData, headers: {
          'Content-Type': 'application/json'
        }
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.json();
        })
        .then((data) => {
          resolve(data);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  authorize(ownerPublicKey, serverSecret) {
    return new Promise(async (resolve, reject) => {
      fetch(this.server + this.#channel._id + '/authorizeRoom', {
        method: 'POST', body: {roomId: this.#channel._id, SERVER_SECRET: serverSecret, ownerKey: ownerPublicKey}
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.json();
        })
        .then((data) => {
          resolve(data);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  postPubKey(_exportable_pubKey) {
    return new Promise(async (resolve, reject) => {
      fetch(this.#channelServer + this.#channel._id + '/postPubKey?type=guestKey', {
        method: 'POST', body: JSON.stringify(_exportable_pubKey), headers: {
          'Content-Type': 'application/json'
        }
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.json();
        })
        .then((data) => {
          resolve(data);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  storageRequest(byteLength) {
    return new Promise(async (resolve, reject) => {
      fetch(this.server + this.#channel._id + '/storageRequest?size=' + byteLength, {
        method: 'GET', credentials: 'include', headers: {
          'Content-Type': 'application/json'
        }
      })
        .then((response) => {
          if (!response.ok) {
            reject(new Error('Network response was not OK'));
          }
          return response.json();
        })
        .then((data) => {
          resolve(data);
        }).catch((error) => {
        reject(error);
      });
    });
  }

  // unused
  notifications() {

  }

  //unused
  getPubKeys() {

  }

  // unused
  ownerUnread() {

  }


  // unused
  registerDevice() {

  }

  #generateRoomId(x, y) {
    return new Promise(async (resolve, reject) => {
      try {
        const xBytes = base64ToArrayBuffer(decodeB64Url(x));
        const yBytes = base64ToArrayBuffer(decodeB64Url(y));
        const channelBytes = _appendBuffer(xBytes, yBytes);
        const channelBytesHash = await _crypto.subtle.digest('SHA-384', channelBytes);
        resolve(encodeB64Url(arrayBufferToBase64(channelBytesHash)));
      } catch (e) {
        reject(e);
      }
    });
  }
}

class KV {
  db;
  events = new EventEmitter();

  constructor(options) {
    if (!process.browser) {
      this.db = new FileSystemDB(options);
    } else {
      if (!window.indexedDB) {
        throw new Error('Your browser doesn\'t support a stable version of IndexedDB.');
      }
      this.db = new IndexedKV(options);
    }
  }

  openCursor(match, callback) {
    return this.db.openCursor(match, callback);
  }

  // Set item will insert or replace
  setItem(key, value) {
    return this.db.setItem(key, value);
  };

  //Add item but not replace
  add(key, value) {
    return this.db.add(key, value);
  };

  getItem(key) {
    return this.db.getItem(key);
  };

  removeItem(key) {
    return this.db.removeItem(key);
  };
}

class FileSystemDB {
  path;
  options = {
    db: 'MyDB', table: 'default', onReady: null
  };

  constructor(options) {
    this.options = Object.assign(this.options, options);
    this.#useDatabase();
  }

  openCursor = (match, callback) => {
    return new Promise((resolve, reject) => {

    });
  };

  #useDatabase = () => {
    this.path = _path.join([_path.parse(__dirname), '', this.options.db, this.options.table]);
  };

  // Set item will insert or replace
  setItem = (key, value) => {
    return new Promise((resolve, reject) => {

    });
  };

  //Add item but not replace
  add = (key, value) => {
    return new Promise((resolve, reject) => {
    });
  };

  getItem = (key) => {
    return new Promise((resolve, reject) => {

    });
  };

  removeItem = (key) => {
    return new Promise((resolve, reject) => {

    });
  };
}


// Augments IndexedDB to be used as a KV to easily replace localStorage for larger and more complex datasets
class IndexedKV {
  indexedDB;
  db;
  events = new MessageBus();
  options = {
    db: 'MyDB', table: 'default', onReady: null
  };

  constructor(options) {
    this.options = Object.assign(this.options, options);
    if (typeof this.options.onReady === 'function') {
      this.events.subscribe(`ready`, (e) => {
        this.options.onReady(e);
      });
    }
    if (!process.browser) {
      this.indexedDB = global.indexedDB;
    } else {
      if (!window.indexedDB) {
        console.log('Your browser doesn\'t support a stable version of IndexedDB.');
        return;
      }
      this.indexedDB = window.indexedDB;
    }

    const openReq = this.indexedDB.open(this.options.db);


    openReq.onerror = (event) => {
      console.error(event);
    };

    openReq.onsuccess = (event) => {
      this.db = event.target.result;
      this.events.publish('ready');
    };

    this.indexedDB.onerror = (event) => {
      console.error('Database error: ' + event.target.errorCode);
    };

    openReq.onupgradeneeded = (event) => {
      this.db = event.target.result;
      this.db.createObjectStore(this.options.table, {keyPath: 'key'});
      this.#useDatabase();
      this.events.publish('ready');
    };
  }

  openCursor(match, callback) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.options.table], 'readonly');
      const objectStore = transaction.objectStore(this.options.table);
      const request = objectStore.openCursor(null, 'next');
      request.onsuccess = function(event) {
        resolve(event.target.result);
        const cursor = event.target.result;
        if (cursor) {
          const regex = new RegExp(`^${match}`);
          if (cursor.key.match(regex)) {
            callback(cursor.value.value);
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = function(event) {
        reject(event);
      };
    });
  };

  #useDatabase() {
    this.db.onversionchange = (event) => {
      this.db.close();
      console.log('A new version of this page is ready. Please reload or close this tab!');
    };
  };

  // Set item will insert or replace
  setItem(key, value) {
    return new Promise((resolve, reject) => {
      const objectStore = this.db.transaction([this.options.table], 'readwrite').objectStore(this.options.table);
      const request = objectStore.get(key);
      request.onerror = (event) => {
        reject(event);
      };
      request.onsuccess = (event) => {
        const data = event?.target?.result;

        if (data?.value) {
          data.value = value;
          const requestUpdate = objectStore.put(data);
          requestUpdate.onerror = (event) => {
            reject(event);
          };
          requestUpdate.onsuccess = (event) => {
            const data = event.target.result;
            resolve(data.value);
          };
        } else {
          const requestAdd = objectStore.add({key: key, value: value});
          requestAdd.onsuccess = (event) => {
            resolve(event.target.result);
          };

          requestAdd.onerror = (event) => {
            reject(event);
          };
        }
      };
    });
  };

  //Add item but not replace
  add(key, value) {
    return new Promise((resolve, reject) => {
      const objectStore = this.db.transaction([this.options.table], 'readwrite').objectStore(this.options.table);
      const request = objectStore.get(key);
      request.onerror = (event) => {
        reject(event);
      };
      request.onsuccess = (event) => {
        const data = event?.target?.result;

        if (data?.value) {
          resolve(data.value);
        } else {
          const requestAdd = objectStore.add({key: key, value: value});
          requestAdd.onsuccess = (event) => {
            resolve(event.target.result);
          };

          requestAdd.onerror = (event) => {
            reject(event);
          };
        }
      };
    });
  };

  getItem(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.options.table]);
      const objectStore = transaction.objectStore(this.options.table);
      const request = objectStore.get(key);

      request.onerror = (event) => {
        reject(event);
      };

      request.onsuccess = (event) => {
        const data = event?.target?.result;
        if (data?.value) {
          resolve(data.value);
        } else {
          resolve(null);
        }
      };
    });
  };

  removeItem(key) {
    return new Promise((resolve, reject) => {
      const request = this.db.transaction([this.options.table], 'readwrite')
        .objectStore(this.options.table)
        .delete(key);
      request.onsuccess = (event) => {
        resolve();
      };

      request.onerror = (event) => {
        reject(event);
      };
    });
  };
}

class QueueItem {
  timestamp = Date.now();
  action;
  args;
  _id;

  constructor(body, action) {
    return new Promise(async (resolve, reject) => {
      try {
        this.action = action;
        this.body = body;
        this._id = arrayBufferToBase64(await _crypto.subtle
          .digest('SHA-256', new TextEncoder().encode(JSON.stringify(body))));
        resolve(this);
      } catch (e) {
        reject(e.message);
      }
    });
  }
}

// Manages all the
class Queue {
  cacheDb;
  wsOptions;
  currentWS;
  onOffline;
  lastProcessed = Date.now();
  events = new MessageBus();
  options = {
    name: 'queue_default', processor: false
  };
  _memoryQueue = [];
  ready = false;
  #crypto = new Crypto();

  // Needs to run from the
  constructor(options) {
    this.options = Object.assign(this.options, options);
    this.cacheDb = new IndexedKV({db: 'offline_queue', table: 'items', onReady: this.init});
  }

  init = () => {
    this.ready = true;
    this.queueReady();
  };

  queueReady = async () => {
    this.processQueue();
  };

  ws = (options) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(options);
        this.wsOptions = {
          url: options.url + options._id + '/websocket', onOpen: async (event) => {
            this.init = {name: options.init.name};
            await this.currentWS.currentWebSocket.send(JSON.stringify(this.init));
          }
        };
        this.currentWS = new ManagedWS(this.wsOptions);
        const cachedWs = await this.cacheDb.getItem(`queue_ws_${options._id}`) || null;
        if (!cachedWs) {
          await this.cacheDb.add(`queue_ws_${this.wsOptions._id}`, options);
        }
        resolve(this.currentWS);
      } catch (e) {
        reject(e);
      }
    });
  };

  setLastProcessed = () => {
    this.lastProcessed = Date.now();
  };

  wsSend = (_id, message, socket) => {
    console.log(socket);
    socket.send(JSON.stringify(message)).then(async () => {
      await this.remove(_id);
      this.setLastProcessed();
    }).catch(() => {
      console.log('Your client is offline, your message will be sent when you reconnect');
      if (typeof this.onOffline === 'function') {
        this.events.publish('offline');
        this.onOffline(message);
        this.setLastProcessed();
      }
    });
  };

  wsCallback = (_id, ws, message, ms) => {
    return new Promise(async (resolve, reject) => {
      if (ms) {
        while (Date.now() <= this.lastProcessed + ms) {
          await sleep(ms);
        }
      }
      try {
        if (!this.currentWS) {
          const options = await this.cacheDb.getItem(`queue_ws_${ws._id}`) || false;
          if (options) {
            this.ws(options).then((socket) => {
              this.wsSend(_id, message, socket);
            });
          } else {
            this.ws(ws).then((socket) => {
              this.wsSend(_id, message, socket);
            });
          }
        } else {
          console.log(this.currentWS);
          if (this.currentWS.readyState !== 1) {
            return;
          }
          this.wsSend(_id, message, this.currentWS);
        }
      } catch (e) {
        console.log(e);
        reject(e);
      }
    });
  };

  add = async (args, action) => {
    if (!this.ready) {
      this._memoryQueue.push(await new QueueItem(args, action));
      return;
    }
    const item = await new QueueItem(args, action);
    await this.cacheDb.add(`queued_${item._id}`, item);
    this.processQueue();
  };

  remove = async (_id) => {
    return await this.cacheDb.removeItem(`queued_${_id}`);
  };

  processQueue = async () => {
    if (!this.ready || !this.options.processor) {
      return;
    }
    setInterval(async () => {
      await this.cacheDb.openCursor('queued_', async (item) => {
        if (item.action === 'wsCallback') {
          return await this.wsCallback(item._id, item.body.ws, item.body.message, 250);
        } else {
          try {
            item.action();
          } catch (e) {
            console.error(e);
          }
        }
      });
    }, 2000);
  };
}

class Snackabra {
  MessageBus = MessageBus;
  #channel = Channel;
  #storage = StorageApi;
  #identity = Identity;
  #queue = Queue;
  options = {
    channel_server: null, channel_ws: null, storage_server: null
  };

  setIdentity(keys) {
    return new Promise(async (resolve, reject) => {
      try {
        this.#identity = await new Identity(keys);
        resolve(this.#identity);
      } catch (e) {
        reject(e);
      }
    });
  }

  connect({channel_server, channel_ws, storage_server}, channel_id = null) {
    if (!this.#identity.exportable_pubKey) {
      throw new Error('setIdentity must be called before connecting');
    }
    this.options = Object.assign(this.options, {channel_server, channel_ws, storage_server});
    this.#queue = new Queue({processor: true});
    this.#channel = new Channel(channel_server, this.#identity, channel_id);
    // this.storage = new StorageApi(this.options.storage_server);
    return this;
  }

  get channel() {
    return this.#channel;
  }

  get storage() {
    return this.#storage;
  }

  get crypto() {
    return SB_Crypto;
  }

  get identity() {
    return this.#identity;
  }
}

export {
  Snackabra, SB_libraryVersion, ab2str, str2ab, base64ToArrayBuffer, arrayBufferToBase64, getRandomValues
};

if (process.browser)
  window.Snackabra = new Snackabra();
