/* Copyright (c) 2020-2022 Magnusson Institute, All Rights Reserved
   Distributed under GPL-v03, see 'LICENSE' file for details */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/**
 * List of known servers. Nota bene: known does not mean *trusted*;
 * currently this will be mostly development servers. Please let us
 * know if there are global servers you would like us to add.
 */
const SBKnownServers = [
    {
        channel_server: 'http://localhost:4001',
        channel_ws: 'ws://localhost:4001',
        storage_server: 'http://localhost:4000'
    },
    {
        channel_server: 'https://r.somethingstuff.workers.dev/',
        channel_ws: 'wss://r.somethingstuff.workers.dev/',
        storage_server: 'https://s.somethingstuff.workers.dev/'
    },
    {
        channel_server: 'https://r.384co.workers.dev/',
        channel_ws: 'wss://r.384co.workers.dev/',
        storage_server: 'https://s.384co.workers.dev/'
    }
];
/**
 * Force EncryptedContents object to binary (interface
 * supports either string or arrays)
 */
export function encryptedContentsMakeBinary(o) {
    let t;
    let iv;
    if (typeof o.content === 'string') {
        t = base64ToArrayBuffer(decodeURIComponent(o.content));
    }
    else {
        // console.log(structuredClone(o))
        const ocn = o.content.constructor.name;
        _sb_assert((ocn === 'ArrayBuffer') || (ocn === 'Uint8Array'), 'undetermined content type in EncryptedContents object');
        t = o.content;
    }
    // console.log("=+=+=+=+ processing nonce")
    if (typeof o.iv === 'string') {
        // console.log("got iv as string:")
        // console.log(structuredClone(o.iv))
        iv = base64ToArrayBuffer(decodeURIComponent(o.iv));
        // console.log("this was turned into array:")
        // console.log(structuredClone(iv))
    }
    else if (o.iv.constructor.name === 'Uint8Array') {
        iv = o.iv;
    }
    else {
        // probably a dictionary
        try {
            iv = new Uint8Array(Object.values(o.iv));
        }
        catch (e) {
            console.error("ERROR: cannot figure out format of iv (nonce), here's the input object:");
            console.error(o.iv);
            _sb_assert(false, "undetermined iv (nonce) type, see console");
        }
    }
    _sb_assert(iv.length == 12, `unwrap(): nonce should be 12 bytes but is not (${iv.length})`);
    return { content: t, iv: iv };
}
// interface ChannelMessage1 {
//   // currently we can't do a regex match here, and i can't figure
//   // out a more clever way of collapsing this.  TODO maybe we should
//   // change the message format
//   [key: string]: ChannelMessage2,
//   message: { [prop: string]: any },
// }
// export type ChannelMessageV1 = ChannelMessage1 | ChannelMessage2 | ChannelAckMessage
//#region - not so core stuff
/******************************************************************************************************/
/**
 * SB simple events (mesage bus) class
 */
export class MessageBus {
    bus = {};
    /**
     * Safely returns handler for any event
     */
    #select(event) {
        return this.bus[event] || (this.bus[event] = []);
    }
    /**
     * Subscribe. 'event' is a string, special case '*' means everything
     *  (in which case the handler is also given the message)
     */
    subscribe(event, handler) {
        this.#select(event).push(handler);
    }
    /**
     * Unsubscribe
     */
    unsubscribe(event, handler) {
        let i = -1;
        if (this.bus[event]) {
            if ((i = this.bus[event].findLastIndex((e) => e == handler)) != -1) {
                this.bus[event].splice(i, 1);
            }
            else {
                console.info(`fyi: asked to remove a handler but it's not there`);
            }
        }
        else {
            console.info(`fyi: asked to remove a handler but the event is not there`);
        }
    }
    /**
     * Publish
     */
    publish(event, ...args) {
        for (const handler of this.#select('*')) {
            handler(event, ...args);
        }
        for (const handler of this.#select(event)) {
            handler(...args);
        }
    }
}
/*
  For possible future use with cleaner identifiers:

  * #uniqueID() {
    let i = 0;
    while (true) {
      i += 1;
      yield i;
    }
  }
*/
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
export function _sb_exception(loc, msg) {
    const m = '<< SB lib error (' + loc + ': ' + msg + ') >>';
    // for now disabling this to keep node testing less noisy
    // console.error(m);
    throw new Error(m);
}
// internal - general handling of paramaters that might be promises
// (basically the "anti" of resolve, if it's *not* a promise then
// it becomes one
export function _sb_resolve(val) {
    if (val.then) {
        // it's already a promise
        // console.log('it is a promise')
        return val;
    }
    else {
        // console.log('it was not a promise')
        return new Promise((resolve) => resolve(val));
    }
}
// internal - handle assertions
export function _sb_assert(val, msg) {
    if (!(val)) {
        const m = `<< SB assertion error: ${msg} >>`;
        // debugger;
        throw new Error(m);
    }
}
//#endregion
//#region - crypto and translation stuff used by SBCrypto etc
/******************************************************************************************************/
/**
 * Fills buffer with random data
 */
export function getRandomValues(buffer) {
    if (buffer.byteLength < (4096)) {
        return crypto.getRandomValues(buffer);
    }
    else {
        // larger blocks should really only be used for testing
        _sb_assert(!(buffer.byteLength % 1024), 'getRandomValues(): large requested blocks must be multiple of 1024 in size');
        // console.log(`will set ${buffer.byteLength} random bytes`)
        // const t0 = Date.now()
        let i = 0;
        try {
            for (i = 0; i < buffer.byteLength; i += 1024) {
                let t = new Uint8Array(1024);
                // this doesn't actually have enough entropy, we should just hash here anyweay
                crypto.getRandomValues(t);
                // console.log(`offset is ${i}`)
                buffer.set(t, i);
            }
        }
        catch (e) {
            console.log(`got an error on index i=${i}`);
            console.log(e);
            console.trace();
        }
        // console.log(`created ${buffer.byteLength} random byte buffer in ${Date.now() - t0} millisends`)
        return buffer;
    }
}
// for later use - message ID formats
const messageIdRegex = /([A-Za-z0-9+/_\-=]{64})([01]{42})/;
// Strict b64 check:
// const b64_regex = new RegExp('^(?:[A-Za-z0-9+/_\-]{4})*(?:[A-Za-z0-9+/_\-]{2}==|[A-Za-z0-9+/_\-]{3}=)?$')
// But we will go (very) lenient:
const b64_regex = /^([A-Za-z0-9+/_\-=]*)$/;
// stricter - only accepts URI friendly:
const url_regex = /^([A-Za-z0-9_\-=]*)$/;
/**
 * Returns 'true' if (and only if) string is well-formed base64.
 * Works same on browsers and nodejs.
 */
export function _assertBase64(base64) {
    // return (b64_regex.exec(base64)?.[0] === base64);
    const z = b64_regex.exec(base64);
    if (z)
        return (z[0] === base64);
    else
        return false;
}
// refactor helper - replace encodeURIComponent everywhere
function ensureSafe(base64) {
    const z = b64_regex.exec(base64);
    _sb_assert((z) && (z[0] === base64), 'ensureSafe() tripped: something is not URI safe');
    return base64;
}
function typedArrayToBuffer(array) {
    console.log('typedArrayToBuffer');
    console.log(typeof array);
    console.log(Object.assign({}, array));
    console.log(Object.assign({}, array.buffer));
    try {
        return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset);
    }
    catch (e) {
        console.log('ERROR in typedArrayTo Buffer');
        console.log(e);
        return array;
    }
}
/**
 * Standardized 'str2ab()' function, string to array buffer.
 * This assumes on byte per character.
 *
 * @param {string} string
 * @return {Uint8Array} buffer
 */
export function str2ab(string) {
    return new TextEncoder().encode(string);
}
/**
 * Standardized 'ab2str()' function, array buffer to string.
 * This assumes one byte per character.
 *
 * @param {Uint8Array} buffer
 * @return {string} string
 */
export function ab2str(buffer) {
    return new TextDecoder('utf-8').decode(buffer);
}
/**
 * based on https://github.com/qwtel/base64-encoding/blob/master/base64-js.ts
 */
const b64lookup = [];
const urlLookup = [];
const revLookup = [];
const CODE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_B64 = CODE + '+/';
const CODE_URL = CODE + '-_';
const PAD = '=';
const MAX_CHUNK_LENGTH = 16383; // must be multiple of 3
for (let i = 0, len = CODE_B64.length; i < len; ++i) {
    b64lookup[i] = CODE_B64[i];
    urlLookup[i] = CODE_URL[i];
    revLookup[CODE_B64.charCodeAt(i)] = i;
}
revLookup['-'.charCodeAt(0)] = 62; // minus
revLookup['_'.charCodeAt(0)] = 63; // underscore
function getLens(b64) {
    const len = b64.length;
    let validLen = b64.indexOf(PAD);
    if (validLen === -1)
        validLen = len;
    const placeHoldersLen = validLen === len ? 0 : 4 - (validLen % 4);
    return [validLen, placeHoldersLen];
}
function _byteLength(validLen, placeHoldersLen) {
    return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen;
}
/**
 * Standardized 'atob()' function, e.g. takes the a Base64 encoded
 * input and decodes it. Note: always returns Uint8Array.
 * Accepts both regular Base64 and the URL-friendly variant,
 * where `+` => `-`, `/` => `_`, and the padding character is omitted.
 *
 * @param {str} base64 string in either regular or URL-friendly representation.
 * @return {Uint8Array} returns decoded binary result
 */
export function base64ToArrayBuffer(str) {
    if (!_assertBase64(str))
        throw new Error(`invalid character in string '${str}'`);
    let tmp;
    switch (str.length % 4) {
        case 2:
            str += '==';
            break;
        case 3:
            str += '=';
            break;
    }
    const [validLen, placeHoldersLen] = getLens(str);
    const arr = new Uint8Array(_byteLength(validLen, placeHoldersLen));
    let curByte = 0;
    const len = placeHoldersLen > 0 ? validLen - 4 : validLen;
    let i;
    for (i = 0; i < len; i += 4) {
        const r0 = revLookup[str.charCodeAt(i)];
        const r1 = revLookup[str.charCodeAt(i + 1)];
        const r2 = revLookup[str.charCodeAt(i + 2)];
        const r3 = revLookup[str.charCodeAt(i + 3)];
        tmp = (r0 << 18) | (r1 << 12) | (r2 << 6) | (r3);
        arr[curByte++] = (tmp >> 16) & 0xff;
        arr[curByte++] = (tmp >> 8) & 0xff;
        arr[curByte++] = (tmp) & 0xff;
    }
    if (placeHoldersLen === 2) {
        const r0 = revLookup[str.charCodeAt(i)];
        const r1 = revLookup[str.charCodeAt(i + 1)];
        tmp = (r0 << 2) | (r1 >> 4);
        arr[curByte++] = tmp & 0xff;
    }
    if (placeHoldersLen === 1) {
        const r0 = revLookup[str.charCodeAt(i)];
        const r1 = revLookup[str.charCodeAt(i + 1)];
        const r2 = revLookup[str.charCodeAt(i + 2)];
        tmp = (r0 << 10) | (r1 << 4) | (r2 >> 2);
        arr[curByte++] = (tmp >> 8) & 0xff;
        arr[curByte++] = tmp & 0xff;
    }
    return arr;
}
function tripletToBase64(lookup, num) {
    return (lookup[num >> 18 & 0x3f] +
        lookup[num >> 12 & 0x3f] +
        lookup[num >> 6 & 0x3f] +
        lookup[num & 0x3f]);
}
function encodeChunk(lookup, view, start, end) {
    let tmp;
    const output = new Array((end - start) / 3);
    for (let i = start, j = 0; i < end; i += 3, j++) {
        tmp =
            ((view.getUint8(i) << 16) & 0xff0000) +
                ((view.getUint8(i + 1) << 8) & 0x00ff00) +
                (view.getUint8(i + 2) & 0x0000ff);
        output[j] = tripletToBase64(lookup, tmp);
    }
    return output.join('');
}
// /* ALTERNATIVE solution below, just needs some typescripting */
//
// const b64ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
// const b64chs = Array.prototype.slice.call(b64ch);
// const b64tab = ((a) => {
//   const tab = {};
//   a.forEach((c, i) => tab[c] = i);
//   return tab;
// })(b64chs);
//
// function base64ToArrayBuffer(asc) {
//   asc = asc.replace(/\s+/g, ''); // collapse any whitespace
//   asc += '=='.slice(2 - (asc.length & 3)); // make it tolerant of padding
//   if (!_assertBase64(asc)) throw new Error('Invalid Character');
//   if (process.browser) {
//     // we could use window.atob but chose not to
//     let u24, bin = '', r1, r2;
//     for (let i = 0; i < asc.length;) {
//       u24 = b64tab[asc.charAt(i++)] << 18 | b64tab[asc.charAt(i++)] << 12 | (r1 = b64tab[asc.charAt(i++)]) << 6 | (r2 = b64tab[asc.charAt(i++)]);
//       bin += r1 === 64 ? _fromCC(u24 >> 16 & 255) : r2 === 64 ? _fromCC(u24 >> 16 & 255, u24 >> 8 & 255) : _fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255);
//     }
//     return str2ab(bin);
//   } else {
//     return _U8Afrom(Buffer.from(asc, 'base64'));
//   }
// }
// TODO: we might want an SB class for what SB thinks of as buffers
const bs2dv = (bs) => bs instanceof ArrayBuffer
    ? new DataView(bs)
    : new DataView(bs.buffer, bs.byteOffset, bs.byteLength);
/**
 * Compare buffers
 */
export function compareBuffers(a, b) {
    if (typeof a != typeof b)
        return false;
    if ((a == null) || (b == null))
        return false;
    const av = bs2dv(a);
    const bv = bs2dv(b);
    if (av.byteLength !== bv.byteLength)
        return false;
    for (let i = 0; i < av.byteLength; i++)
        if (av.getUint8(i) !== bv.getUint8(i))
            return false;
    return true;
}
/**
 * Standardized 'btoa()'-like function, e.g., takes a binary string
 * ('b') and returns a Base64 encoded version ('a' used to be short
 * for 'ascii').
 *
 * @param {bufferSource} ArrayBuffer buffer
 * @return {string} base64 string
 */
export function arrayBufferToBase64(buffer) {
    if (buffer == null) {
        _sb_exception('L509', 'arrayBufferToBase64() -> null paramater');
        return '';
    }
    else {
        // const view = bs2dv(bufferSource)
        // const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        // console.log(buffer)
        // const view = new DataView(buffer)
        const view = bs2dv(buffer);
        const len = view.byteLength;
        const extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
        const len2 = len - extraBytes;
        const parts = new Array(Math.floor(len2 / MAX_CHUNK_LENGTH) + Math.sign(extraBytes));
        const lookup = urlLookup; // Note: yes this will break regular atob()
        const pad = '';
        let j = 0;
        for (let i = 0; i < len2; i += MAX_CHUNK_LENGTH) {
            parts[j++] = encodeChunk(lookup, view, i, (i + MAX_CHUNK_LENGTH) > len2 ? len2 : (i + MAX_CHUNK_LENGTH));
        }
        if (extraBytes === 1) {
            const tmp = view.getUint8(len - 1);
            parts[j] = (lookup[tmp >> 2] +
                lookup[(tmp << 4) & 0x3f] +
                pad + pad);
        }
        else if (extraBytes === 2) {
            const tmp = (view.getUint8(len - 2) << 8) + view.getUint8(len - 1);
            parts[j] = (lookup[tmp >> 10] +
                lookup[(tmp >> 4) & 0x3f] +
                lookup[(tmp << 2) & 0x3f] +
                pad);
        }
        return parts.join('');
    }
}
// /* ALTERNATIVE implementation to above (not yet typescripted) */
// const _fromCC = String.fromCharCode.bind(String);
// const _U8Afrom = (it, fn = (x) => x) => new Uint8Array(Array.prototype.slice.call(it, 0).map(fn));
// function arrayBufferToBase64(buffer) {
//   const u8a = new Uint8Array(buffer);
//   if (process.browser) {
//     // we could use window.btoa but chose not to
//     let u32, c0, c1, c2, asc = '';
//     const maxargs = 0x1000;
//     const strs = [];
//     for (let i = 0, l = u8a.length; i < l; i += maxargs) strs.push(_fromCC.apply(null, u8a.subarray(i, i + maxargs)));
//     const bin = strs.join('');
//     const pad = bin.length % 3;
//     for (let i = 0; i < bin.length;) {
//       if ((c0 = bin.charCodeAt(i++)) > 255 || (c1 = bin.charCodeAt(i++)) > 255 || (c2 = bin.charCodeAt(i++)) > 255) throw new Error('Invalid Character');
//       u32 = (c0 << 16) | (c1 << 8) | c2;
//       asc += b64chs[u32 >> 18 & 63] + b64chs[u32 >> 12 & 63] + b64chs[u32 >> 6 & 63] + b64chs[u32 & 63];
//     }
//     return pad ? asc.slice(0, pad - 3) + '==='.substring(pad) : asc;
//   } else {
//     // nodejs, so has Buffer, just use that
//     return Buffer.from(u8a).toString('base64');
//   }
// }
export function _appendBuffer(buffer1, buffer2) {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
}
// the publicKeyPEM paramater below needs to look like this
// if not given, will use this default (MI/384 has private key)
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
/**
 * Import a PEM encoded RSA public key, to use for RSA-OAEP
 * encryption.  Takes a string containing the PEM encoded key, and
 * returns a Promise that will resolve to a CryptoKey representing
 * the public key.
 *
 * @param {pem} RSA public key, string, PEM format
 * @return {cryptoKey} RSA-OAEP key
 *
 */
export function importPublicKey(pem) {
    if (typeof pem == 'undefined')
        pem = defaultPublicKeyPEM;
    // fetch the part of the PEM string between header and footer
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const start = pem.indexOf(pemHeader);
    const end = pem.indexOf(pemFooter);
    if ((start < 0) || (end < 0))
        _sb_exception('importPublicKey()', 'fail to find BEGIN and/or END string in RSA (PEM) key');
    const pemContents = pem.slice(start + pemHeader.length, end);
    // const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
    // console.log(pemContents)
    const binaryDer = base64ToArrayBuffer(pemContents);
    return crypto.subtle.importKey('spki', binaryDer, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
}
/**
 * Returns random number
 *
 * @return {int} integer 0..255
 *
 */
export function simpleRand256() {
    return crypto.getRandomValues(new Uint8Array(1))[0];
}
const base32mi = '0123456789abcdefyhEjkLmNHpFrRTUW';
/**
 * Returns a random string in requested encoding
 *
 * @param {n} number of characters
 * @param {code} encoding, supported types: 'base32mi'
 * @return {string} random string
 *
 * base32mi: ``0123456789abcdefyhEjkLmNHpFrRTUW``
 */
export function simpleRandomString(n, code) {
    if (code == 'base32mi') {
        // yeah, of course we need to add base64 etc
        const z = crypto.getRandomValues(new Uint8Array(n));
        let r = '';
        for (let i = 0; i < n; i++)
            r += base32mi[z[i] & 31];
        return r;
    }
    _sb_exception('simpleRandomString', 'code ' + code + ' not supported');
    return '';
}
/**
 * Disambiguates strings that are known to be 'base32mi' type
 *
 * ::
 *
 *     'base32mi': '0123456789abcdefyhEjkLmNHpFrRTUW'
 *
 * This is the base32mi disambiguation table ::
 *
 *     [OoQD] -> '0'
 *     [lIiJ] -> '1'
 *     [Zz] -> '2'
 *     [A] -> '4'
 *     [Ss] -> '5'
 *     [G] -> '6'
 *     [t] -> '7'
 *     [B] -> '8'
 *     [gq] -> '9'
 *     [C] -> 'c'
 *     [Y] -> 'y'
 *     [KxX] -> 'k'
 *     [M] -> 'm'
 *     [n] -> 'N'
 *     [P] -> 'p'
 *     [uvV] -> 'U'
 *     [w] -> 'W'
 *
 * Another way to think of it is that this, becomes this ('.' means no change): ::
 *
 *     0123456789abcdefghijklmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVXYZ
 *     ................9.1..1.N0.9.57UUk.248c0EF6.11kLm.0p0.5..Uky2
 *
 */
export function cleanBase32mi(s) {
    // this of course is not the most efficient
    return s.replace(/[OoQD]/g, '0').replace(/[lIiJ]/g, '1').replace(/[Zz]/g, '2').replace(/[A]/g, '4').replace(/[Ss]/g, '5').replace(/[G]/g, '6').replace(/[t]/g, '7').replace(/[B]/g, '8').replace(/[gq]/g, '9').replace(/[C]/g, 'c').replace(/[Y]/g, 'y').replace(/[KxX]/g, 'k').replace(/[M]/g, 'm').replace(/[n]/g, 'N').replace(/[P]/g, 'p').replace(/[uvV]/g, 'U').replace(/[w]/g, 'w');
}
/**
 * Takes an arbitrary dict object, a public key in PEM
 * format, and a callback function: generates a random AES key,
 * wraps that in (RSA) key, and when all done will call the
 * callback function with the results.
 *
 * This function is for direct use in a web page, for example
 * capturing a 'form' input set of data about a user, and
 * sending towards a backend in such a way that the contents
 * can only be decrypted and read off-line (air gapped).
 *
 * @param {dict} dictionary (payload)
 * @param {publicKeyPEM} public key (PEM format)
 * @param {callback} callback function, called with results
 *
 */
export function packageEncryptDict(dict, publicKeyPEM, callback) {
    const clearDataArrayBufferView = str2ab(JSON.stringify(dict));
    const aesAlgorithmKeyGen = { name: 'AES-GCM', length: 256 };
    const aesAlgorithmEncrypt = { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(16)) };
    if (!publicKeyPEM)
        publicKeyPEM = defaultPublicKeyPEM;
    // Create a key generator to produce a one-time-use AES key to encrypt some data
    crypto.subtle.generateKey(aesAlgorithmKeyGen, true, ['encrypt']).then((aesKey) => {
        // we are exporting the symmetric AES key so we can encrypt it using pub key
        crypto.subtle.exportKey('raw', aesKey).then((theKey) => {
            const rsaAlgorithmEncrypt = { name: 'RSA-OAEP' };
            importPublicKey(publicKeyPEM).then((publicKey) => {
                return crypto.subtle.encrypt(rsaAlgorithmEncrypt, publicKey, theKey);
            }).then((buf) => {
                const encryptedAesKey = arrayBufferToBase64(buf);
                return encryptedAesKey;
            }).then((encAesKey) => {
                return Promise.all([crypto.subtle.encrypt(aesAlgorithmEncrypt, aesKey, clearDataArrayBufferView), encAesKey]);
            }).then((arr) => {
                // arr[0] is the encrypted dict in raw format, arr[1] is the aes key encrypted with rsa public key
                const encryptedData = arrayBufferToBase64(arr[0]);
                const postableEncryptedAesKey = arr[1];
                const theContent = ensureSafe(encryptedData);
                const data = {
                    enc_aes_key: ensureSafe(postableEncryptedAesKey),
                    iv: ensureSafe(arrayBufferToBase64(aesAlgorithmEncrypt.iv)),
                    content: theContent
                };
                if (callback) {
                    callback(data);
                }
                else {
                    console.error('(No Callback) Resulting data:');
                    console.error(data);
                }
            });
        });
    });
} // packageEncrypt()
/**
 * Partition
 */
export function partition(str, n) {
    throw (`partition() not tested on TS yet - (${str}, ${n})`);
    // const returnArr = [];
    // let i, l;
    // for (i = 0, l = str.length; i < l; i += n) {
    //   returnArr.push(str.slice(i, l + n));
    // }
    // return returnArr;
}
/**
 * There are many problems with JSON parsing, adding a wrapper to capture more info.
 * The 'loc' parameter should be a (unique) string that allows you to find the usage
 * in the code; one approach is the line number in the file (at some point).
 */
export function jsonParseWrapper(str, loc) {
    // psm: you can't have a return type in TS if the function
    //      might throw an exception
    try {
        return JSON.parse(str);
    }
    catch (error) {
        // sometimes it's an embedded string
        try {
            // This would be simple: 'return JSON.parse(eval(str));'
            // But eval() not safe. Instead we iteratively strip possible wrapping
            // single or double quotation marks. There are various cases where this
            // will not be enough, but we'll add "unwrapping" logic as we find
            // the examples.
            let s2 = '';
            let s3 = '';
            let str2 = str;
            while (str2 != (s3 = s2, s2 = str2, str2 = str2?.match(/^(['"])(.*)\1$/m)?.[2]))
                return JSON.parse(`'${s3}'`);
        }
        catch {
            // let's try one more thing
            try {
                return JSON.parse(str.slice(1, -1));
            }
            catch {
                // i am beginning to dislike TS .. ugh no simple way to get error message
                // see: https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript
                throw new Error(`JSON.parse() error at ${loc} (tried eval and slice)\nString was: ${str}`);
            }
        }
    }
}
/**
 * Deprecated (older version of payloads, for older channels)
 */
export function extractPayloadV1(payload) {
    try {
        const metadataSize = new Uint32Array(payload.slice(0, 4))[0];
        const decoder = new TextDecoder();
        const metadata = jsonParseWrapper(decoder.decode(payload.slice(4, 4 + metadataSize)), 'L476');
        let startIndex = 4 + metadataSize;
        const data = {};
        for (const key in metadata) {
            if (data.key) {
                data[key] = payload.slice(startIndex, startIndex + metadata[key]);
                startIndex += metadata[key];
            }
        }
        return data;
    }
    catch (e) {
        console.error(e);
        return {};
    }
}
/**
 * Assemble payload
 */
export function assemblePayload(data) {
    try {
        // console.log("assemblePayload():")
        // console.log(data)
        const metadata = {};
        metadata['version'] = '002';
        let keyCount = 0;
        let startIndex = 0;
        for (const key in data) {
            // if (data.key)  ... why was this added?
            keyCount++;
            metadata[keyCount.toString()] = { name: key, start: startIndex, size: data[key].byteLength };
            startIndex += data[key].byteLength;
        }
        const encoder = new TextEncoder();
        const metadataBuffer = encoder.encode(JSON.stringify(metadata));
        const metadataSize = new Uint32Array([metadataBuffer.byteLength]);
        // psm: changed to Uint8 .. hope that doesn't break things?
        let payload = _appendBuffer(new Uint8Array(metadataSize.buffer), new Uint8Array(metadataBuffer));
        for (const key in data) {
            // if (data.key) ... why was this added?
            payload = _appendBuffer(new Uint8Array(payload), data[key]);
        }
        // console.log("created payload:")
        // console.log(payload)
        return payload;
    }
    catch (e) {
        console.error(e);
        return null;
    }
}
/**
 * Extract payload - this decodes from our binary (wire) format
 * to a JS object. This provides a binary encoding of any JSON,
 * and it allows some elements of the JSON to be raw (binary).
 */
export function extractPayload(payload) {
    try {
        // number of bytes of meta data (encoded as a 32-bit Uint)
        const metadataSize = new Uint32Array(payload.slice(0, 4))[0];
        // console.info('METADATASIZE: ', metadataSize);
        const decoder = new TextDecoder();
        // extracts the string of meta data and parses
        // console.info('METADATASTRING: ', decoder.decode(payload.slice(4, 4 + metadataSize)));
        const _metadata = jsonParseWrapper(decoder.decode(payload.slice(4, 4 + metadataSize)), 'L533');
        // console.info('METADATA EXTRACTED', JSON.stringify(_metadata))
        // console.log(_metadata)
        // calculate start of actual contents
        const startIndex = 4 + metadataSize;
        if (!_metadata.version)
            _metadata['version'] = '001'; // backwards compat
        // console.info(_metadata['version']);
        switch (_metadata['version']) {
            case '001': {
                // deprecated, older format
                return extractPayloadV1(payload);
            }
            case '002': {
                // console.log('version 2')
                const data = [];
                for (let i = 1; i < Object.keys(_metadata).length; i++) {
                    const _index = i.toString();
                    if (_metadata[_index]) {
                        // console.log(`found entry index ${i}`)
                        const propertyStartIndex = _metadata[_index]['start'];
                        // start (in bytes) of contents
                        // console.info(propertyStartIndex);
                        const size = _metadata[_index]['size'];
                        // where to put it
                        const entry = _metadata[_index];
                        // extracts contents - this supports raw data
                        data[entry['name']] = payload.slice(startIndex + propertyStartIndex, startIndex + propertyStartIndex + size);
                        // console.log(data[entry['name']])
                    }
                    else {
                        console.log(`found nothing for index ${i}`);
                    }
                }
                return data;
            }
            default: {
                throw new Error('Unsupported payload version (' + _metadata['version'] + ') - fatal');
            }
        }
    }
    catch (e) {
        throw new Error('extractPayload() exception (' + e + ')');
    }
}
/**
 * Encode into b64 URL
 */
export function encodeB64Url(input) {
    return input.replaceAll('+', '-').replaceAll('/', '_');
}
/**
 * Decode b64 URL
 */
export function decodeB64Url(input) {
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
//#endregion - crypto and translation stuff used by SBCrypto etc
//#region - SBCrypto
/******************************************************************************************************/
/**
 * SBCrypto contains all the SB specific crypto functions. It should be the only area where
 * SB code uses subtle crypto directly.
 *
 * @class
 * @constructor
 * @public
 */
class SBCrypto {
    /**
     * Extracts (generates) public key from a private key.
     */
    extractPubKey(privateKey) {
        try {
            const pubKey = { ...privateKey };
            delete pubKey.d;
            delete pubKey.dp;
            delete pubKey.dq;
            delete pubKey.q;
            delete pubKey.qi;
            pubKey.key_ops = [];
            return pubKey;
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }
    /**
     * SBCrypto.generatekeys()
     *
     * Generates standard ``ECDH`` keys using ``P-384``.
     */
    generateKeys() {
        return new Promise(async (resolve, reject) => {
            try {
                resolve(await crypto.subtle.generateKey({
                    name: 'ECDH', namedCurve: 'P-384'
                }, true, ['deriveKey']));
            }
            catch (e) {
                reject(e);
            }
        });
    }
    /**
     * SBCrypto.importKey()
     *
     * Import keys
     */
    importKey(format, key, type, extractable, keyUsages) {
        const keyAlgorithms = {
            ECDH: { name: 'ECDH', namedCurve: 'P-384' },
            AES: { name: 'AES-GCM' },
            PBKDF2: 'PBKDF2'
        };
        if (format === 'jwk') {
            return (window.crypto.subtle.importKey('jwk', key, keyAlgorithms[type], extractable, keyUsages));
        }
        else {
            return (window.crypto.subtle.importKey(format, key, keyAlgorithms[type], extractable, keyUsages));
        }
    }
    /**
     * SBCrypto.deriveKey()
     *
     * Derive key.
     */
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
                resolve(await crypto.subtle.deriveKey({
                    name: 'ECDH',
                    public: publicKey
                }, privateKey, keyAlgorithms[type], extractable, keyUsages));
            }
            catch (e) {
                console.error(e, privateKey, publicKey, type, extractable, keyUsages);
                reject(e);
            }
        });
    }
    encrypt(data, key, _iv, returnType = 'encryptedContents') {
        return new Promise(async (resolve, reject) => {
            try {
                if (data === null)
                    reject(new Error('no contents'));
                const iv = ((!_iv) || (_iv === null)) ? crypto.getRandomValues(new Uint8Array(12)) : _iv;
                if (typeof data === 'string')
                    data = (new TextEncoder()).encode(data);
                crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data).then((encrypted) => {
                    // console.log("encrypt() result:")
                    // console.log(encrypted)
                    if (returnType === 'encryptedContents') {
                        resolve({
                            content: ensureSafe(arrayBufferToBase64(encrypted)),
                            iv: ensureSafe(arrayBufferToBase64(iv))
                        });
                    }
                    else {
                        // _sb_assert(_iv, "encrypt() returning a buffer must have nonce assigned (or it will be lost)")
                        resolve(encrypted);
                    }
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }
    wrap(k, b, bodyType) {
        return new Promise((resolve) => {
            let a;
            if (bodyType === 'string') {
                // console.log("wrap() got string:")
                // console.log(b as string)
                a = str2ab(b);
            }
            else {
                a = b;
            }
            // console.log("wrap() is encrypting buffer:")
            // console.log(a)
            sbCrypto.encrypt(a, k).then((c) => { resolve(c); });
        });
    }
    unwrap(k, o, returnType) {
        // console.log("SBCrypto.unwrap(), got k/o:")
        // console.log(k)
        // console.log(o)
        return new Promise(async (resolve, reject) => {
            try {
                const { content: t, iv: iv } = encryptedContentsMakeBinary(o);
                // console.log("======== calling subtle.decrypt with iv, k, t (AES-GCM):")
                // console.log(iv)
                // console.log(k)
                // console.log(t)
                // console.log("======== (end of subtle.decrypt parameters)")
                crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, k, t).then((d) => {
                    if (returnType === 'string') {
                        resolve(new TextDecoder().decode(d));
                    }
                    else if (returnType === 'arrayBuffer') {
                        resolve(d);
                    }
                }).catch((e) => {
                    console.error(`unwrap(): failed to decrypt - rejecting: ${e}`);
                    console.trace();
                    reject(e);
                });
            }
            catch (e) {
                console.error(`unwrap(): unknown issue - rejecting: ${e}`);
                console.trace();
                reject(e);
            }
        });
    }
    /**
     * SBCrypto.sign()
     *
     * Sign
     */
    sign(secretKey, contents) {
        return new Promise(async (resolve, reject) => {
            try {
                const encoder = new TextEncoder();
                const encoded = encoder.encode(contents);
                let sign;
                try {
                    // console.log("signing with:")
                    // console.log(secretKey)
                    sign = await crypto.subtle.sign('HMAC', secretKey, encoded);
                    resolve(ensureSafe(arrayBufferToBase64(sign)));
                }
                catch (error) {
                    reject(error);
                }
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * SBCrypto.verify()
     *
     * Verify signature.
     */
    verify(verifyKey, sign, contents) {
        return new Promise(async (resolve, reject) => {
            try {
                // const _sign = base64ToArrayBuffer(decodeURIComponent(sign));
                const _sign = base64ToArrayBuffer(sign);
                // const encoder = new TextEncoder();
                // const encoded = encoder.encode(contents);
                const encoded = str2ab(contents);
                try {
                    crypto.subtle.verify('HMAC', verifyKey, _sign, encoded).then((verified) => {
                        resolve(verified);
                    });
                }
                catch (e) {
                    reject(e);
                }
            }
            catch (e) {
                reject(e);
            }
        });
    }
    /**
     * SBCrypto.compareKeys()
     *
     * Compare keys, true if the 'same', false if different.
     * TODO: type it up.
     */
    compareKeys(key1, key2) {
        if (key1 != null && key2 != null && typeof key1 === 'object' && typeof key2 === 'object') {
            return key1['x'] === key2['x'] && key1['y'] === key2['y'];
        }
        return false;
    }
} /* SBCrypto */
const sbCrypto = new SBCrypto();
//#endregion - SBCrypto
//#region - local decorators
/******************************************************************************************************/
function Memoize(target, propertyKey, descriptor) {
    if (descriptor.get) {
        let get = descriptor.get;
        descriptor.get = function () {
            const prop = `__${target.constructor.name}__${propertyKey}__`;
            if (this.hasOwnProperty(prop)) {
                const returnValue = this[prop];
                // console.log("Memoize found value in cache")
                // console.log(returnValue)
                return (returnValue);
            }
            else {
                // console.log("Memoize new return value")
                const returnValue = get.call(this);
                Object.defineProperty(this, prop, { configurable: false, enumerable: false, writable: false, value: returnValue });
                // console.log(returnValue)
                return returnValue;
            }
        };
    }
}
function Ready(target, propertyKey, descriptor) {
    if (descriptor.get) {
        // console.log("Checking ready for:")
        // console.log(target.constructor.name)
        let get = descriptor.get;
        descriptor.get = function () {
            // console.log("============= Ready checking this:")
            // console.log(this)
            const obj = target.constructor.name;
            // TODO: the Ready template can probably be simplified
            const prop = `${obj}ReadyFlag`;
            if (prop in this) {
                // console.log(`============= Ready() - checking readyFlag for ${propertyKey}`)
                const rf = "readyFlag";
                // console.log(this[rf])
                _sb_assert(this[rf], `${propertyKey} getter accessed but object ${obj} not ready (fatal)`);
            }
            const retValue = get.call(this);
            _sb_assert(retValue != null, `${propertyKey} getter accessed in object type ${obj} but returns NULL (fatal)`);
            return retValue;
        };
    }
}
//# endregion - local decorators
/**
 * @class
 * @constructor
 * @public
 *
 */
class SB384 {
    ready;
    sb384Ready;
    #SB384ReadyFlag = false; // must be named <class>ReadyFlag
    #exportable_pubKey = null;
    #exportable_privateKey = null;
    #privateKey = null;
    #ownerChannelId = null;
    #keyPair = null;
    /**
     * Basic (core) capability object in SB.
     *
     * Note that all the getters below will throw an exception if the
     * corresponding information is not ready.
     *
     * Like most SB classes, SB384 follows the "ready template" design
     * principle: the object is immediately available upon creation,
     * but isn't "ready" until it says it's ready. See `Channel Class`_
     * example below.
     *
     * @param key a jwk with which to create identity; if not provided,
     * it will 'mint' (generate) them randomly, in other words it will
     * default to creating a new identity ("384").
     *
     */
    constructor(key) {
        // console.log("setting SB384.ready")
        this.ready = new Promise((resolve, reject) => {
            try {
                if (key) {
                    this.#exportable_privateKey = key;
                    const pk = sbCrypto.extractPubKey(key);
                    _sb_assert(pk, 'unable to extract public key');
                    this.#exportable_pubKey = pk;
                    sbCrypto.importKey('jwk', key, 'ECDH', true, ['deriveKey']).then((k) => {
                        this.#privateKey = k;
                        this.#generateRoomId(this.#exportable_pubKey.x, this.#exportable_pubKey.y).then((channelId) => {
                            // console.log('******** setting ownerChannelId')
                            // console.log(channelId)
                            this.#ownerChannelId = channelId;
                            this.#SB384ReadyFlag = true;
                            resolve(this);
                        });
                    });
                }
                else {
                    sbCrypto.generateKeys().then((keyPair) => {
                        this.#privateKey = keyPair.privateKey;
                        this.#keyPair = keyPair;
                        // console.log("========== Public Key part:")
                        // console.log(keyPair.publicKey)
                        Promise.all([
                            // TODO: move these two to SBCrypto and add SBCrypto.exportKey()
                            crypto.subtle.exportKey('jwk', keyPair.publicKey),
                            crypto.subtle.exportKey('jwk', keyPair.privateKey)
                        ]).then((v) => {
                            this.#exportable_pubKey = v[0];
                            this.#exportable_privateKey = v[1];
                            this.#generateRoomId(this.#exportable_pubKey.x, this.#exportable_pubKey.y).then((channelId) => {
                                // console.log('******** setting ownerChannelId')
                                // console.log(channelId)  
                                this.#ownerChannelId = channelId;
                                this.#SB384ReadyFlag = true;
                                resolve(this);
                            });
                        });
                    });
                }
            }
            catch (e) {
                let errMsg = `failed to create Identity(): ${e}`;
                console.error(errMsg);
                // _sb_exception("new Identity()", `failed to create Identity(): ${e}`) // do reject instead
                reject(errMsg);
            }
        });
        this.sb384Ready = this.ready;
    }
    #generateRoomHash(channelBytes) {
        return new Promise(async (resolve, reject) => {
            crypto.subtle.digest('SHA-384', channelBytes).then((channelBytesHash) => {
                const k = encodeB64Url(arrayBufferToBase64(channelBytesHash));
                if (k.includes('-')) {
                    // see earlier discussion - but we constrain to names that are friendly
                    // to both URL/browser environments, and copy-paste functions
                    resolve(this.#generateRoomHash(channelBytesHash)); // tail recursion
                }
                else {
                    resolve(k);
                }
            });
        });
    }
    #generateRoomId(x, y) {
        return new Promise(async (resolve, reject) => {
            const xBytes = base64ToArrayBuffer(decodeB64Url(x));
            const yBytes = base64ToArrayBuffer(decodeB64Url(y));
            const channelBytes = _appendBuffer(xBytes, yBytes);
            resolve(this.#generateRoomHash(channelBytes));
        });
    }
    /** @type {boolean}       */ get readyFlag() { return this.#SB384ReadyFlag; }
    /** @type {JsonWebKey}    */ get exportable_pubKey() { return this.#exportable_pubKey; }
    /** @type {JsonWebKey}    */ get exportable_privateKey() { return this.#exportable_privateKey; }
    /** @type {CryptoKey}     */ get privateKey() { return this.#privateKey; }
    /** @type {CryptoKeyPair} */ get keyPair() { return this.#keyPair; }
    /** @type {JsonWebKey}    */ get _id() { return JSON.stringify(this.exportable_pubKey); }
    /** @type {string}        */ get ownerChannelId() { return this.#ownerChannelId; }
} /* class Identity */
__decorate([
    Memoize
], SB384.prototype, "readyFlag", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "exportable_pubKey", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "exportable_privateKey", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "privateKey", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "keyPair", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "_id", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "ownerChannelId", null);
/**
 * SBMessage
 *
 * @class
 * @constructor
 * @public
 */
class SBMessage {
    ready;
    channel;
    contents;
    /* SBMessage */
    constructor(channel, body = '') {
        // console.log("creating SBMessage on channel:")
        // console.log(channel)
        this.channel = channel;
        this.contents = { encrypted: false, isVerfied: false, contents: body, sign: '', image: '', imageMetaData: {} };
        this.contents.sender_pubKey = this.channel.exportable_pubKey;
        this.ready = new Promise((resolve) => {
            channel.ready.then(() => {
                if (channel.userName)
                    this.contents.sender_username = channel.userName;
                const signKey = this.channel.keys.channelSignKey;
                const sign = sbCrypto.sign(signKey, body);
                const image_sign = sbCrypto.sign(signKey, this.contents.image);
                const imageMetadata_sign = sbCrypto.sign(signKey, JSON.stringify(this.contents.imageMetaData));
                Promise.all([sign, image_sign, imageMetadata_sign]).then(async (values) => {
                    this.contents.sign = values[0];
                    this.contents.image_sign = values[1];
                    this.contents.imageMetadata_sign = values[2];
                    // NOTE: mtg:adding this breaks messages... but I dont understand why
                    // const isVerfied = await this.channel.api.postPubKey(this.channel.exportable_pubKey!)
                    // console.log('here',isVerfied)
                    // this.contents.isVerfied = isVerfied?.success ? true : false
                    resolve(this);
                });
            });
        });
    }
    /**
     * SBMessage.send()
     *
     * @param {SBMessage} message - the message object to send
     */
    send() {
        // console.log("SBMessage.send()")
        // console.log(this)
        return new Promise((resolve, reject) => {
            this.ready.then(() => {
                // message ready
                this.channel.send(this).then((result) => {
                    if (result === "success") {
                        resolve(result);
                    }
                    else {
                        reject(result);
                    }
                });
            });
        });
        // TODO: i've punted on queue here <--- queueMicrotaks maybe?
    }
} /* class SBMessage */
/**
 * SBFile
 * @class
 * @constructor
 * @public
 */
export class SBFile extends SBMessage {
    // encrypted = false
    // contents: string = ''
    // senderPubKey: CryptoKey
    // sign: Promise<string>
    data = {
        previewImage: '',
        fullImage: ''
    };
    // (now extending SBMessage)
    image = '';
    image_sign = '';
    imageMetaData = {};
    // file is an instance of File
    constructor(channel, file /* signKey: CryptoKey, key: CryptoKey */) {
        throw new Error('working on SBFile()!');
        super(channel, '');
        // all is TODO with new image code
        // this.senderPubKey = key;
        // ... done by SBMessage parent?
        // this.sign = sbCrypto.sign(channel.keys.channelSignKey, this.contents);
        // if (file.type.match(/^image/i)) {
        //   this.#asImage(file, signKey)
        // } else {
        //   throw new Error('Unsupported file type: ' + file.type);
        // }
    }
    async #asImage(image, signKey) {
        // TODO: the getfile/restrict should be done by SBImage etc, other stuff is SB messaging
        throw new Error(`#asImage() needs carryover from SBImage etc (${image}, ${signKey})`);
        //   this.data.previewImage = this.#padImage(await(await this.#restrictPhoto(image, 4096, 'image/jpeg', 0.92)).arrayBuffer());
        //   const previewHash: Dictionary = await this.#generateImageHash(this.data.previewImage);
        //   this.data.fullImage = image.byteLength > 15728640 ? this.#padImage(await(await this.#restrictPhoto(image, 15360, 'image/jpeg', 0.92)).arrayBuffer()) : this.#padImage(image);
        //   const fullHash: Dictionary = await this.#generateImageHash(this.data.fullImage);
        //   this.image = await this.#getFileData(await this.#restrictPhoto(image, 15, 'image/jpeg', 0.92), 'url');
        //   this.image_sign = await sbCrypto.sign(signKey, this.image);
        //   this.imageMetaData = JSON.stringify({
        //     imageId: fullHash.id,
        //     previewId: previewHash.id,
        //     imageKey: fullHash.key,
        //     previewKey: previewHash.key
        //   });
        //   this.imageMetadata_sign = await sbCrypto.sign(signKey, this.imageMetaData)
    }
} /* class SBFile */
/** SB384 */
class Channel extends SB384 {
    ready;
    channelReady;
    #ChannelReadyFlag = false; // must be named <class>ReadyFlag
    #sbServer;
    motd = '';
    locked = false;
    owner = false;
    admin = false;
    verifiedGuest = false;
    userName = '';
    #channelId;
    #api;
    /**
     * Join a channel, returns channel object.
     *
     * Currently, you must have an identity when connecting, because every single
     * message is signed by sender. TODO is to look at how to provide a 'listening'
     * mode on channels.
     *
     * Most classes in SB follow the "ready" template: objects can be used
     * right away, but they decide for themselves if they're ready or not.
     *
     * Below is a (complete) example for reference:
  
    .. parsed-literal::
      //
      // Here we create a new channel; for this we need to be specific
      // about what servers to use. This example references local dev
      // (miniflare) servers
      //
      const sb_config = {
        channel_server: \'http\:\/\/localhost\:4001\',
        channel_ws: \'ws://localhost:4001\',
        storage_server: \'http://localhost:4000\'
      }
      //
      // Next we create the orchestrator object, for above endpoints
      //
      const SB = new `Snackabra`_ (sb_config)
      //
      // On these servers, we create a new channel (trivial auth)
      //
      SB.create(sb_config, \'<SECRET>\').then((handle) => {
        //
        // This will return a 'handle', a type that contains all
        // the information you need to keep reference a channel.
        //
        SB.connect(
          //
          // Above we've created a channel, but not connected.
          // Besides some information in the handle, to connect we
          // must provide a message handler for all (new) messages
          //
          (m: ChannelMessage) => { console.log(\`got message: ${m}\`) },
          handle.key,
          handle.channelId
        ).then((c) => c.ready).then((c) => {
          //
          // We are now connected, \'c\' is a `Channel Socket Class`_
          // and can (optionally) pick a name (alias) for ourselves
          //
          c.userName = "TestBot"
          //
          // We can now send messages
          //
          (new `SBMessage`_ (c, "Hello from TestBot!")).send().then((c) => {
            console.log(\`test message sent! (${c})\`) })
        })
      })
    
  
     *
     * @param {Snackabra} sbServer server to join
     * @param {JsonWebKey} key? key to use to join (optional)
     * @param {string} channelId (the :term:`Channel Name`) to find on that server (optional)
     */
    constructor(sbServer, key, channelId) {
        super(key);
        this.#sbServer = sbServer;
        this.#api = new ChannelApi(this);
        // console.log("setting Channel.ready")
        this.ready = new Promise((resolve) => {
            if (channelId) {
                this.#channelId = channelId;
                this.#ChannelReadyFlag = true;
                resolve(this);
            }
            else {
                this.sb384Ready.then((x) => {
                    console.log('using this channelId');
                    console.log(Object.assign({}, this));
                    console.log(Object.assign({}, x));
                    console.log(Object.assign({}, this.ownerChannelId));
                    console.log(Object.assign({}, x));
                    this.#channelId = this.ownerChannelId;
                    this.#ChannelReadyFlag = true;
                    resolve(this);
                });
            }
        });
        this.channelReady = this.ready;
        // console.log("Channel.ready set to:")
        // console.log(this.ready)
    }
    /** @type {ChannelApi} */ get api() { return this.#api; }
    /** @type {SBServer} */ get sbServer() { return this.#sbServer; }
    /** @type {string} */ get channelId() { return this.#channelId; }
    /** @type {boolean} */ get readyFlag() { return this.#ChannelReadyFlag; }
} /* class Channel */
__decorate([
    Memoize,
    Ready
], Channel.prototype, "channelId", null);
function deCryptChannelMessage(m00, m01, keys) {
    // console.log("#%#%#%#%# m01 passed to deCryptChannelMessage()")
    // console.log(structuredClone(m01))
    return new Promise((resolve, reject) => {
        const z = messageIdRegex.exec(m00);
        const encryptionKey = keys.encryptionKey;
        if (z) {
            let m = {
                type: 'encrypted',
                channelID: z[1],
                timestampPrefix: z[2],
                _id: z[1] + z[2],
                encrypted_contents: encryptedContentsMakeBinary(m01)
            };
            sbCrypto.unwrap(encryptionKey, m.encrypted_contents, 'string').then((unwrapped) => {
                let m2 = { ...m, ...JSON.parse(unwrapped) };
                if (m2.contents) {
                    m2.text = m2.contents;
                    // if(!m2?.contents?.hasOwnProperty('isVerfied')){
                    //   m2.contents!.isVerified
                    // }
                }
                m2.user = {
                    name: m2.sender_username ? m2.sender_username : 'Unknown',
                    _id: m2.sender_pubKey
                };
                // console.log("Unwrapped so far:")
                // console.log(structuredClone(unwrapped))
                // console.log("Decrypting message, results after decoding so far:")
                // console.log(structuredClone(m2))
                if ((m2.verificationToken) && (!m2.sender_pubKey)) {
                    // we don't check signature unless we can (obviously)
                    console.info('WARNING: message with verification token is lacking sender identity.\n' +
                        '         This may not be allowed in the future.');
                }
                else {
                    // TODO: we could speed this up by caching imported keys from known senders
                    sbCrypto.importKey('jwk', m2.sender_pubKey, 'ECDH', true, []).then((senderPubKey) => {
                        sbCrypto.deriveKey(keys.signKey, senderPubKey, 'HMAC', false, ['sign', 'verify']).then((verifyKey) => {
                            sbCrypto.verify(verifyKey, m2.sign, m2.contents).then((v) => {
                                if (!v) {
                                    console.log("***** signature is NOT correct message (rejecting)");
                                    console.log("verifyKey:");
                                    console.log(Object.assign({}, verifyKey));
                                    console.log("m2.sign");
                                    console.log(Object.assign({}, m2.sign));
                                    console.log("m2.contents");
                                    console.log(structuredClone(m2.contents));
                                    console.log("Message:");
                                    console.log(Object.assign({}, m2));
                                    console.trace();
                                    reject(null);
                                }
                                resolve(m2);
                            });
                        });
                    });
                }
            });
        }
        else {
            console.log("++++++++ #processMessage: ERROR - cannot parse channel ID / timestamp, invalid message");
            console.log(Object.assign({}, m00));
            console.log(Object.assign({}, m01));
            reject(null);
        }
    });
}
/**
 *
 * ChannelSocket
 *
 *  Class managing connections
 */
export class ChannelSocket extends Channel {
    ready;
    #ChannelSocketReadyFlag = false; // must be named <class>ReadyFlag
    // #channelId: string
    #ws;
    #keys;
    #exportable_owner_pubKey = null;
    #sbServer;
    adminData; // TODO: add getter
    // #queue: Array<SBMessage> = [];
    #onMessage; // CallableFunction // the user message handler
    #ack = [];
    #traceSocket = false;
    /**
     * ChannelSocket
     *
     * @param sbServer: {SBServer}
     *
     * */
    constructor(sbServer, onMessage, key, channelId) {
        // console.log("----ChannelSocket.constructor() start:")
        // console.log(sbServer)
        // console.log("----ChannelSocket.constructor() ... end")
        super(sbServer, key, channelId /*, identity ? identity : new Identity() */); // initialize 'channel' parent       
        const url = sbServer.channel_ws + '/api/room/' + channelId + '/websocket';
        this.#onMessage = onMessage;
        this.#sbServer = sbServer;
        this.#ws = {
            url: url,
            websocket: new WebSocket(url),
            ready: false,
            closed: false,
            timeout: 2000
        };
        // console.log("setting ChannelSocket.ready")
        this.ready = this.#readyPromise();
    }
    /* ChannelSocket
      internal to channelsocket: this always gets all messages; certain
      protocol aspects are low-level (independent of 'app') and those
      are handled here. others are never delivered 'raw', for example
      encrypted messages are always decrypted */
    #processMessage(m) {
        if (this.#traceSocket) {
            console.log("got raw message (string):");
            console.log(structuredClone(m));
        }
        const data = jsonParseWrapper(m, 'L1489');
        if (this.#traceSocket) {
            console.log("... json unwrapped version of raw message:");
            console.log(Object.assign({}, data));
        }
        if (data.ack) {
            const r = this.#ack[data._id];
            if (r) {
                console.log(`++++++++ found matching ack for id ${data._id} (on first check?)`);
                delete this.#ack[data._id];
                r("success"); // resolve
            }
        }
        else if (data.nack) {
            console.error('Nack received');
            this.#ws.closed = true;
            // if (this.#websocket) this.#websocket.close()
        }
        else if (typeof this.#onMessage === 'function') {
            const message = data;
            try {
                // console.log("++++++++ #processMessage: will attempt to decipher ...:")
                let m01 = Object.entries(message)[0][1];
                // @ts-ignore
                if (Object.keys(m01)[0] === 'encrypted_contents') {
                    const m00 = Object.entries(data)[0][0];
                    // the 'iv' field as incoming should be base64 encoded, with 16 b64
                    // characters translating here to 12 bytes
                    const iv_b64 = m01.encrypted_contents.iv;
                    if ((iv_b64) && (_assertBase64(iv_b64)) && (iv_b64.length == 16)) {
                        m01.encrypted_contents.iv = base64ToArrayBuffer(iv_b64);
                    }
                    else {
                        console.error('processMessage() - iv is malformed, should be 16-char b64 string (ignoring)');
                    }
                    if (this.#traceSocket) {
                        console.log("vvvvvv - calling deCryptChannelMessage() with arg1, arg2, arg3:");
                        console.log(structuredClone(m00));
                        console.log(structuredClone(m01.encrypted_contents));
                        console.log(structuredClone(this.keys));
                        console.log("^^^^^^ - (end parameter list)");
                    }
                    deCryptChannelMessage(m00, m01.encrypted_contents, this.keys)
                        .then((m) => {
                        if (this.#traceSocket)
                            console.log(Object.assign({}, m));
                        this.#onMessage(m);
                    })
                        .catch(() => { console.log('Error processing message, dropping it'); });
                }
                else if (m01.type === 'ack') {
                    if (this.#traceSocket)
                        console.log("++++++++ Received 'ack'");
                    const ack_id = m01._id;
                    const r = this.#ack[ack_id];
                    if (r) {
                        if (this.#traceSocket)
                            console.log(`++++++++ found matching ack for id ${ack_id}`);
                        // console.log(r)
                        delete this.#ack[ack_id];
                        r("success"); // resolve
                    }
                    else {
                        console.info(`WARNING: did not find matching ack for id ${ack_id}`);
                    }
                }
                else {
                    // 
                    // TODO: other message types (low level?) are parsed here ...
                    //
                    console.log("++++++++ #processMessage: can't decipher message, passing along unchanged:");
                    console.log(Object.assign({}, message));
                    this.#onMessage(message); // 'as string' ?
                }
            }
            catch (e) {
                console.log(`++++++++ #processMessage: caught exception while decyphering (${e}), passing it along unchanged`);
                this.#onMessage(message); // 'as string' ?
                // console.error(`#processmessage: cannot handle locked channels yet (${e})`)
                // TODO: locked key might never resolve (if we don't have it)
                // unwrapped = await sbCrypto.unwrap(this.keys.lockedKey, message.encrypted_contents, 'string')
            }
            // TODO: re-enable local storage of messages
            // _localStorage.setItem(this.#channel.channelId + '_lastSeenMessage', id.slice(this.#channel.channelId.length));
            // if (message._id) _localStorage.setItem(this.#channel.channelId + '_lastSeenMessage', message._id)
            // return JSON.stringify(unwrapped);
        }
        else {
            _sb_exception('ChannelSocket', 'received message but there is no handler');
        }
    }
    /* ChannelSocket */
    #readyPromise() {
        const url = this.#ws.url;
        let backlog = [];
        let processingKeys = false;
        return new Promise((resolve, reject) => {
            try {
                // if (this.#ws.websocket) this.#ws.websocket.close() // keep clean
                if (this.#ws.websocket.readyState === 3) {
                    // it's been closed
                    this.#ws.websocket = new WebSocket(url);
                }
                else if (this.#ws.websocket.readyState === 2) {
                    console.log("STRANGE - trying to use a ChannelSocket that is in the process of closing ...");
                    this.#ws.websocket = new WebSocket(url);
                }
                this.#ws.websocket.addEventListener('open', () => {
                    this.#ws.closed = false;
                    this.channelReady.then(() => {
                        // console.log("++++++++ readyPromise() has identity:")
                        // console.log(id)
                        this.#ws.init = { name: JSON.stringify(this.exportable_pubKey) }; // TODO: sometimes this is null?
                        // console.log("++++++++ readyPromise() constructed init:")
                        // console.log(this.#ws.init)
                        this.#ws.websocket.send(JSON.stringify(this.#ws.init));
                        // note: not ready until channel responds with keys
                    });
                });
                this.#ws.websocket.addEventListener('message', (e) => {
                    // the 'root' administrative messages are processed first before
                    // anything else can be processed, when this is done it self-replaces
                    // console.log("++++++++ readyPromise() received ChannelKeysMessage:")
                    // console.log(e)
                    if (processingKeys) {
                        backlog.push(e.data);
                        // console.log("++++++++ readyPromise() pushing message to backlog:")
                        // console.log(e)
                        return;
                    }
                    processingKeys = true; // helps not drop messages
                    // const message: ChannelKeysMessage = deserializeMessage(e.data, 'channelKeys')! as ChannelKeysMessage
                    const message = JSON.parse(e.data);
                    // console.log(message)
                    _sb_assert(message.ready, 'got roomKeys but channel reports it is not ready (?)');
                    this.motd = message.motd;
                    this.locked = message.roomLocked;
                    const exportable_owner_pubKey = JSON.parse(message.keys.ownerKey);
                    this.#exportable_owner_pubKey = exportable_owner_pubKey;
                    // console.log(this.#exportable_owner_pubKey )
                    Promise.all([
                        sbCrypto.importKey('jwk', JSON.parse(message.keys.ownerKey), 'ECDH', false, []),
                        sbCrypto.importKey('jwk', JSON.parse(message.keys.encryptionKey), 'AES', false, ['encrypt', 'decrypt']),
                        sbCrypto.importKey('jwk', JSON.parse(message.keys.signKey), 'ECDH', true, ['deriveKey']),
                        sbCrypto.importKey('jwk', sbCrypto.extractPubKey(JSON.parse(message.keys.signKey)), 'ECDH', true, []),
                        // this.identity!.privateKey // we know we have id by now
                    ]).then((v) => {
                        // console.log("++++++++ readyPromise() processed first batch of keys")
                        const ownerKey = v[0];
                        const encryptionKey = v[1];
                        const signKey = v[2];
                        const publicSignKey = v[3];
                        const privateKey = this.privateKey;
                        Promise.all([
                            // we derive the HMAC key we use when *we* sign outgoing messages
                            sbCrypto.deriveKey(privateKey, publicSignKey, 'HMAC', false, ['sign', 'verify'])
                        ]).then((w) => {
                            // console.log("++++++++ readyPromise() second phase of key processing")
                            const channelSignKey = w[0];
                            this.#keys = {
                                ownerKey: ownerKey,
                                encryptionKey: encryptionKey,
                                signKey: signKey,
                                channelSignKey: channelSignKey,
                                privateKey: this.privateKey
                            };
                            // once we have keys we can also query admin info
                            const adminData = this.api.getAdminData();
                            this.owner = sbCrypto.compareKeys(exportable_owner_pubKey, this.exportable_pubKey);
                            Promise.all([
                                adminData,
                            ]).then((d) => {
                                // console.log("++++++++ readyPromise() getting adminData:")
                                // console.log(adminData)
                                this.adminData = d[0];
                                // TODO: until we have better logic here a shim from old code
                                this.admin = this.owner;
                                if (backlog.length > 0) {
                                    // console.log("++++++++ readyPromise() we are queuing up a microtask for message processing")
                                    queueMicrotask(() => {
                                        console.log("++++++++ readyPromise() inside micro task");
                                        for (let d in backlog) {
                                            // console.log("++++++++ pulling this message from the backlog:")
                                            // console.log(e)
                                            this.#processMessage(d);
                                        }
                                    });
                                }
                                else {
                                    // console.log("++++++++ readyPromise() there were NO messages queued up")
                                }
                                // once we've gotten our keys, we substitute the message handler
                                // console.log("++++++++ readyPromise() changing onMessage to processMessage")
                                this.#ws.websocket.addEventListener('message', (e) => {
                                    this.#processMessage(e.data);
                                });
                                // and now we are ready!
                                this.#ChannelSocketReadyFlag = true;
                                // console.log("++++++++ readyPromise() all done - resolving!")
                                resolve(this);
                            });
                        });
                    });
                });
                this.#ws.websocket.addEventListener('close', (e) => {
                    this.#ws.closed = true;
                    if (!e.wasClean) {
                        console.log(`ChannelSocket() was closed (and NOT cleanly: ${e.reason} from ${this.#sbServer.channel_server}`);
                    }
                    else {
                        if (e.reason.includes("does not have an owner"))
                            reject(`No such channel on this server (${this.#sbServer.channel_server})`);
                        else
                            console.log('ChannelSocket() was closed (cleanly): ', e.reason);
                    }
                    reject('wbSocket() closed before it was opened (?)');
                });
                this.#ws.websocket.addEventListener('error', (e) => {
                    this.#ws.closed = true;
                    console.log('ChannelSocket() error: ', e);
                    reject('ChannelSocket creation error (see log)');
                });
            }
            catch (e) {
                this.#ws.closed = true;
                console.error(e);
                reject('failed to create ChannelSocket, see log');
            }
        });
    }
    // @Memoize @Ready get channelId(): string { return this.#channelId }
    set onMessage(f) {
        this.#onMessage = f;
    }
    set enableTrace(b) {
        this.#traceSocket = b;
        console.log(`Tracing ${b ? 'en' : 'dis'}abled`);
    }
    get onMessage() {
        return this.#onMessage;
    }
    /**
     * ChannelSocket.keys
     *
     * Will throw an exception if keys are unknown or not yet loaded
     */
    get keys() {
        if (!this.#keys) {
            _sb_assert(false, "ChannelSocket.keys: not initialized (?)");
        }
        return (this.#keys);
    }
    /**
     * ChannelSocket.sendSbObject()
     *
     * Send SB object (file) on channel socket
     */
    // todo - move to API?
    async sendSbObject(file) {
        return (this.send(file));
        // this.ready.then(() => {
        //   this.#wrap(file /* , this.#keys!.encryptionKey */).then((payload) => this.send(payload));
        // } else {
        //   this.#queue.push(file);
        // }
    }
    /**
      * ChannelSocket.send()
      *
      * Returns a promise that resolves to "success" when sent,
      * or an error message if it fails.
      */
    send(msg) {
        let message;
        if (typeof msg === 'string') {
            message = new SBMessage(this, msg);
        }
        else if (msg instanceof SBMessage) {
            message = msg;
        }
        else {
            message = new SBMessage(this, "ERROR");
            // SBFile for example
            _sb_exception("ChannelSocket.send()", "unknown parameter type");
        }
        // for future inspiration here are more thoughts on making this more iron clad:
        // https://stackoverflow.com/questions/29881957/websocket-connection-timeout
        if (this.#ws.closed) {
            if (this.#traceSocket)
                console.info("send() triggered reset of #readyPromise() (normal)");
            this.ready = this.#readyPromise(); // possible reset of ready 
        }
        return new Promise((resolve, reject) => {
            message.ready.then((message) => {
                this.ready.then(() => {
                    if (this.#traceSocket) {
                        console.log("++++++++ ChannelSocket.send() this message (cloned): ");
                        //console.log(structuredClone(message))
                        console.log(Object.assign({}, message));
                    }
                    if (!this.#ChannelSocketReadyFlag)
                        reject("ChannelSocket.send() is confused - ready or not?");
                    switch (this.#ws.websocket.readyState) {
                        case 1: // OPEN
                            if (this.#traceSocket) {
                                console.log("Wrapping message contents:");
                                console.log(Object.assign({}, message.contents));
                            }
                            sbCrypto.wrap(this.keys.encryptionKey, JSON.stringify(message.contents), 'string').then((wrappedMessage) => {
                                if (this.#traceSocket) {
                                    console.log("ChannelSocket.send():");
                                    console.log(Object.assign({}, wrappedMessage));
                                }
                                const m = JSON.stringify({ encrypted_contents: wrappedMessage });
                                if (this.#traceSocket) {
                                    console.log("++++++++ ChannelSocket.send() got this from wrap:");
                                    console.log(structuredClone(m));
                                    console.log("++++++++ ChannelSocket.send() then got this from JSON.stringify:");
                                    console.log(Object.assign({}, wrappedMessage));
                                }
                                crypto.subtle.digest('SHA-256', new TextEncoder().encode(m)).then((hash) => {
                                    const _id = arrayBufferToBase64(hash);
                                    const ackPayload = { timestamp: Date.now(), type: 'ack', _id: _id };
                                    this.#ack[_id] = resolve;
                                    if (this.#traceSocket) {
                                        console.log('++++++++ ChannelSocket.send() this message:');
                                        console.log(structuredClone(m));
                                    }
                                    this.#ws.websocket.send(m);
                                    // TODO: update protocol so server acks on message
                                    this.#ws.websocket.send(JSON.stringify(ackPayload));
                                    setTimeout(() => {
                                        if (this.#ack[_id]) {
                                            delete this.#ack[_id];
                                            const msg = `Websocket request timed out (no ack) after ${this.#ws.timeout}ms (${_id})`;
                                            console.error(msg);
                                            reject(msg);
                                        }
                                        else {
                                            // normal behavior
                                            if (this.#traceSocket)
                                                console.log("++++++++ ChannelSocket.send() completed sending");
                                            resolve("success");
                                        }
                                    }, this.#ws.timeout);
                                });
                            });
                            break;
                        case 3: // CLOSED
                        case 0: // CONNECTING
                        case 2: // CLOSING
                            const errMsg = 'socket not OPEN - either CLOSED or in the state of CONNECTING/CLOSING';
                            _sb_exception('ChannelSocket', errMsg);
                            reject(errMsg);
                    }
                });
            });
        });
    }
    /** @type {JsonWebKey} */ get exportable_owner_pubKey() { return this.#exportable_owner_pubKey; }
} /* class ChannelSocket */
__decorate([
    Memoize,
    Ready
], ChannelSocket.prototype, "exportable_owner_pubKey", null);
/**
 * Storage API
 * @class
 * @constructor
 * @public
 */
class StorageApi {
    server;
    channelServer; // approves budget, TODO this needs some thought
    constructor(server, channelServer) {
        this.server = server + '/api/v1';
        this.channelServer = channelServer + '/api/room/';
    }
    /**
     * Hashes and splits into two (h1 and h1) signature of data, h1
     * is used to request (salt, iv) pair and then h2 is used for
     * encryption (h2, salt, iv)
     *
     * @param buf blob of data to be stored
     *
     */
    #generateIdKey(buf) {
        return new Promise((resolve, reject) => {
            try {
                crypto.subtle.digest('SHA-512', buf).then((digest) => {
                    const _id = digest.slice(0, 32);
                    const _key = digest.slice(32);
                    resolve({
                        id: ensureSafe(arrayBufferToBase64(_id)),
                        key: ensureSafe(arrayBufferToBase64(_key))
                        // id: arrayBufferToBase64(_id),
                        // key: arrayBufferToBase64(_key)
                    });
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }
    // TODO: his function needs to be cleaned up
    #padBuf(buf) {
        // design change: 12 sizes
        const pad21 = 21; // need 21 bytes margin ... forget why?  ... not good
        let _sizes = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192]; // in KB
        _sizes = _sizes.map((size) => size * 1024);
        const image_size = buf.byteLength;
        // console.log('BEFORE PADDING: ', image_size)
        let _target = 0;
        if (image_size < _sizes[_sizes.length - 1]) {
            for (let i = 0; i < _sizes.length; i++) {
                if (image_size + pad21 < _sizes[i]) {
                    _target = _sizes[i];
                    break;
                }
            }
        }
        else {
            _target = (Math.ceil(image_size / (1024 * 1024))) * 1024 * 1024;
            if (image_size + pad21 >= _target) {
                _target += 1024;
            }
        }
        let _padding_array = [128];
        _target = _target - image_size - pad21;
        // We will finally convert to Uint32Array where each element is 4 bytes
        // So we need (_target/4) - 6 array elements with value 0 (128 bits or 16 bytes or 4 elements to be left empty,
        // last 4 bytes or 1 element to represent the size and 1st element is 128 or 0x80)
        for (let i = 0; i < _target; i++) {
            _padding_array.push(0);
        }
        // _padding_array.push(image_size)
        const _padding = new Uint8Array(_padding_array).buffer;
        // console.log('Padding size: ', _padding.byteLength)
        let final_data = _appendBuffer(buf, _padding);
        final_data = _appendBuffer(final_data, new Uint32Array([image_size]).buffer);
        // console.log('AFTER PADDING: ', final_data.byteLength)
        return final_data;
    }
    #getObjectKey(fileHash, _salt) {
        // was: getFileKey(fileHash: string, _salt: ArrayBuffer) 
        // console.log('getObjectKey with hash and salt:')
        // console.log(fileHash)
        // console.log(_salt)
        return new Promise((resolve, reject) => {
            try {
                // const keyMaterial: CryptoKey = await sbCrypto.importKey('raw', base64ToArrayBuffer(decodeURIComponent(fileHash)), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
                sbCrypto.importKey('raw', base64ToArrayBuffer(decodeURIComponent(fileHash)), 'PBKDF2', false, ['deriveBits', 'deriveKey']).then((keyMaterial) => {
                    // @psm TODO - Support deriving from PBKDF2 in sbCrypto.eriveKey function
                    crypto.subtle.deriveKey({
                        'name': 'PBKDF2',
                        'salt': _salt,
                        'iterations': 100000,
                        'hash': 'SHA-256'
                    }, keyMaterial, { 'name': 'AES-GCM', 'length': 256 }, true, ['encrypt', 'decrypt']).then((key) => {
                        // return key;
                        resolve(key);
                    });
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }
    #_allocateObject(image_id) {
        return new Promise((resolve, reject) => {
            try {
                fetch(this.server + "/storeRequest?name=" + image_id)
                    .then((r) => { /* console.log('got storage reply:'); console.log(r); */ return r.arrayBuffer(); })
                    .then((b) => {
                    // console.log('got b back:')
                    // console.log(b)
                    const par = extractPayload(b);
                    resolve({ salt: par.salt, iv: par.iv });
                });
            }
            catch (e) {
                reject(`storeObject() failed: ${e}`);
            }
        });
    }
    #_storeObject(image, image_id, keyData, type, roomId, iv, salt) {
        // export async function storeImage(image, image_id, keyData, type, roomId)
        return new Promise((resolve, reject) => {
            try {
                this.#getObjectKey(keyData, salt).then((key) => {
                    sbCrypto.encrypt(image, key, iv, 'arrayBuffer').then((data) => {
                        // const storageTokenReq = await(await 
                        fetch(this.channelServer + roomId + '/storageRequest?size=' + data.byteLength)
                            .then((r) => r.json())
                            .then((storageTokenReq) => {
                            if (storageTokenReq.hasOwnProperty('error'))
                                reject('storage token request error');
                            let storageToken = JSON.stringify(storageTokenReq);
                            // console.log("storeObject() data:")
                            // console.log(data)
                            // console.log(image_id)
                            this.storeData(type, image_id, iv, salt, storageToken, data)
                                .then((resp_json) => {
                                if (resp_json.error)
                                    reject(`storeObject() failed: ${resp_json.error}`);
                                if (resp_json.image_id != image_id)
                                    reject(`received imageId ${resp_json.image_id} but expected ${image_id}`);
                                resolve(resp_json.verification_token);
                            });
                        });
                    });
                });
            }
            catch (e) {
                reject(`storeObject() failed: ${e}`);
            }
        });
    }
    /**
     *
     * @param buf
     * @param type
     * @param roomId
     *
     */
    storeObject(buf, type, roomId) {
        // export async function saveImage(sbImage, roomId, sendSystemMessage)
        return new Promise((resolve, reject) => {
            const paddedBuf = this.#padBuf(buf);
            this.#generateIdKey(paddedBuf).then((fullHash) => {
                // return { full: { id: fullHash.id, key: fullHash.key }, preview: { id: previewHash.id, key: previewHash.key } }
                this.#_allocateObject(fullHash.id).then((p) => {
                    // console.log('got these instructions from the storage server:')
                    // storage server returns the salt and nonce it wants us to use
                    // console.log(p)
                    const r = {
                        version: '1',
                        type: type,
                        id: fullHash.id,
                        key: fullHash.key,
                        iv: p.iv,
                        salt: p.salt,
                        verification: this.#_storeObject(paddedBuf, fullHash.id, fullHash.key, type, roomId, p.iv, p.salt)
                    };
                    // console.log("SBObj is:")
                    // console.log(r)
                    resolve(r);
                });
            });
        });
    }
    /**
     * StorageApi.saveFile()
     */
    async saveFile(channel, sbFile) {
        // const metaData: Dictionary = jsonParseWrapper(sbFile.imageMetaData, 'L1732');
        const metaData = sbFile.imageMetaData;
        const fullStorePromise = this.storeImage(sbFile.data.fullImage, metaData.imageId, metaData.imageKey, 'f');
        const previewStorePromise = this.storeImage(sbFile.data.previewImage, metaData.previewId, metaData.previewKey, 'p');
        // TODO: We should probably discuss this in more detail
        Promise.all([fullStorePromise, previewStorePromise]).then((results) => {
            results.forEach((controlData) => {
                // @ts-ignore
                channel.sendSbObject({ ...controlData, control: true });
            });
            // psm: need to generalize classes ... sbFile and sbImage descent from sbMessage?
            // channel.sendSbObject(sbFile);
            channel.send(sbFile);
        });
    }
    /**
     * StorageApi().storeRequest
     */
    storeRequest(fileId) {
        return new Promise((resolve, reject) => {
            fetch(this.server + '/storeRequest?name=' + fileId)
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
    /**
     * StorageApi().storeData()
     */
    storeData(type, fileId, iv, salt, storageToken, data) {
        // async function uploadImage(storageToken, encrypt_data, type, image_id, data)
        return new Promise((resolve, reject) => {
            fetch(this.server + '/storeData?type=' + type + '&key=' + ensureSafe(fileId), {
                // psm: need to clean up these types
                method: 'POST',
                body: assemblePayload({
                    iv: iv,
                    salt: salt,
                    image: data,
                    storageToken: (new TextEncoder()).encode(storageToken),
                    vid: crypto.getRandomValues(new Uint8Array(48))
                })
            })
                .then((response) => {
                if (!response.ok) {
                    reject('response from storage server was not OK');
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
    /**
     * StorageApi().storeImage()
     */
    storeImage(image, image_id, keyData, type) {
        // latest and greatest JS version is in:
        // 384-snackabra-webclient/src/utils/ImageProcessor.js
        throw new Error('StorageApi.storeImate() needs TS version');
    }
    /**
     * StorageApi().fetchData()
     *
     * This assumes you have a complete SBObjectHandle. Note that
     * if you only have the 'id' and 'verification fields, you
     * can reconstruct / request the rest. The current interface
     * will return both nonce, salt, and encrypted data.
     */
    fetchData(h) {
        // console.log('fetchData() for:')
        // console.log(h)
        return new Promise((resolve, reject) => {
            try {
                if (!h)
                    reject('invalid');
                h.verification.then((verificationToken) => {
                    fetch(this.server + '/fetchData?id=' + ensureSafe(h.id) + '&type=' + h.type + '&verification_token=' + verificationToken, { method: 'GET' })
                        .then((response) => {
                        if (!response.ok)
                            reject(new Error('Network response was not OK'));
                        // console.log(response)
                        return response.arrayBuffer();
                    })
                        .then((payload) => {
                        try {
                            let j = JSON.parse(ab2str(new Uint8Array(payload)));
                            if (j.error)
                                reject(`fetchData() error: ${j.error}`);
                        }
                        catch (e) {
                            console.info('fetchData() received payload');
                            // console.log(`did NOT see an error (error: ${e})`)
                            // console.log(payload)
                        }
                        finally {
                            // const extractedData = extractPayload(payload)
                            // console.log('fetchData() returning:')
                            // console.log(extractedData)
                            // resolve(extractedData)
                            const data = extractPayload(payload);
                            const iv = data.iv;
                            if (h.iv)
                                _sb_assert(compareBuffers(iv, h.iv), 'nonce (iv) differs');
                            // console.log('h.iv:')
                            // console.log(h.iv)
                            // console.log('data.iv:')
                            // console.log(data.iv)
                            const salt = data.salt;
                            if (h.salt)
                                _sb_assert(compareBuffers(salt, h.salt), 'nonce (iv) differs');
                            // const image_key: CryptoKey = await this.#getObjectKey(imageMetaData!.previewKey!, salt);
                            this.#getObjectKey(h.key, salt).then((image_key) => {
                                const encrypted_image = data.image;
                                // const padded_img: ArrayBuffer = await sbCrypto.unwrap(image_key, { content: encrypted_image, iv: iv }, 'arrayBuffer')
                                sbCrypto.unwrap(image_key, { content: encrypted_image, iv: iv }, 'arrayBuffer').then((padded_img) => {
                                    const img = this.#unpadData(padded_img);
                                    // psm: issues should throw i think
                                    // if (img.error) {
                                    //   console.error('(Image error: ' + img.error + ')');
                                    //   throw new Error('Failed to fetch data - authentication or formatting error');
                                    // }
                                    resolve(img);
                                });
                            });
                        }
                    });
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * StorageApi().unpadData()
     */
    #unpadData(data_buffer) {
        const _size = new Uint32Array(data_buffer.slice(-4))[0];
        // console.log(`#unpadData - size of object is ${_size}`)
        return data_buffer.slice(0, _size);
    }
    /**
     * StorageApi().retrieveData()
     * retrieves an object from storage
     */
    async retrieveData(msgId, messages, controlMessages) {
        console.log("... need to code up retrieveData() with new typing ..");
        console.log(Object.assign({}, msgId));
        console.log(Object.assign({}, messages));
        console.log(Object.assign({}, controlMessages));
        console.error("... need to code up retrieveData() with new typing ..");
        const imageMetaData = messages.find((msg) => msg._id === msgId).imageMetaData;
        const image_id = imageMetaData.previewId;
        // const control_msg = controlMessages.find((ctrl_msg) => ctrl_msg.id && ctrl_msg.id.startsWith(image_id));
        const control_msg = controlMessages.find((ctrl_msg) => ctrl_msg.id && ctrl_msg.id == image_id);
        if (!control_msg) {
            return { 'error': 'Failed to fetch data - missing control message for that image' };
        }
        // const imageFetch = await this.fetchData(control_msg.id, control_msg.verificationToken);
        const obj = {
            version: '1', type: 'p', id: control_msg.id, key: imageMetaData.previewKey,
            verification: new Promise((resolve) => resolve(control_msg.verificationToken))
        };
        // // const imageFetch = await this.fetchData(control_msg.id!, control_msg.verificationToken);
        // const imageFetch = await this.fetchData(obj);
        // const data = extractPayload(imageFetch);
        // const iv: string = data.iv;
        // const salt: Uint8Array = data.salt;
        // const image_key: CryptoKey = await this.#getObjectKey(imageMetaData!.previewKey!, salt);
        // const encrypted_image: string = data.image;
        // const padded_img: ArrayBuffer = await sbCrypto.unwrap(image_key, { content: encrypted_image, iv: iv }, 'arrayBuffer')
        // const img: ArrayBuffer = this.#unpadData(padded_img);
        // // if (img.error) {
        //   console.error('(Image error: ' + img.error + ')');
        //   throw new Error('Failed to fetch data - authentication or formatting error');
        // }
        const img = await this.fetchData(obj);
        return { 'url': 'data:image/jpeg;base64,' + arrayBufferToBase64(img) };
    }
    /**
     * StorageApi().retrieveDataFromMessage()
     */
    async retrieveDataFromMessage(message, controlMessages) {
        const imageMetaData = typeof message.imageMetaData === 'string' ? jsonParseWrapper(message.imageMetaData, 'L1893') : message.imageMetaData;
        const image_id = imageMetaData.previewId;
        const control_msg = controlMessages.find((ctrl_msg) => ctrl_msg.id && ctrl_msg.id === image_id);
        if (!control_msg)
            return { 'error': 'Failed to fetch data - missing control message for that image' };
        // const obj: 
        // const imageFetch = await this.fetchData(control_msg.id, control_msg.verificationToken);
        // const data = extractPayload(imageFetch);
        // const iv = data.iv;
        // const salt = data.salt;
        // const image_key = await this.#getObjectKey(imageMetaData.previewKey, salt);
        // const encrypted_image = data.image;
        // const padded_img = await sbCrypto.unwrap(image_key, { content: encrypted_image, iv: iv }, 'arrayBuffer')
        // const img = this.#unpadData(padded_img);
        // if (img.error) {
        //   console.error('(Image error: ' + img.error + ')');
        //   throw new Error('Failed to fetch data - authentication or formatting error');
        // }
        const obj = {
            version: '1', type: 'p',
            id: control_msg.id, key: imageMetaData.previewKey,
            verification: new Promise((resolve) => resolve(control_msg.verificationToken))
        };
        const img = await this.fetchData(obj);
        return { 'url': 'data:image/jpeg;base64,' + arrayBufferToBase64(img) };
    }
} /* class StorageApi */
/**
 * Channel API
 * @class
 * @constructor
 * @public
 */
class ChannelApi {
    #sbServer;
    #server; // channel server
    #channel;
    #channelApi;
    #channelServer;
    // #payload: Payload;
    constructor(/* sbServer: Snackabra, */ channel /*, identity?: Identity */) {
        this.#channel = channel;
        this.#sbServer = this.#channel.sbServer;
        this.#server = this.#sbServer.channel_server;
        // this.#payload = new Payload()
        this.#channelApi = this.#server + '/api/';
        this.#channelServer = this.#server + '/api/room/';
        // if (identity) this.#identity = identity!
    }
    /**
     * getLastMessageTimes
     */
    getLastMessageTimes() {
        return new Promise((resolve, reject) => {
            fetch(this.#channelApi + '/getLastMessageTimes', {
                method: 'POST', body: JSON.stringify([this.#channel.channelId])
            }).then((response) => {
                if (!response.ok) {
                    reject(new Error('Network response was not OK'));
                }
                return response.json();
            }).then((message_times) => {
                resolve(message_times[this.#channel.channelId]);
            }).catch((e) => {
                reject(e);
            });
        });
    }
    /**
     * getOldMessages
     */
    getOldMessages(currentMessagesLength) {
        return new Promise((resolve, reject) => {
            // const encryptionKey = this.#channel.keys.encryptionKey
            fetch(this.#channelServer + this.#channel.channelId + '/oldMessages?currentMessagesLength=' + currentMessagesLength, {
                method: 'GET',
            }).then((response) => {
                if (!response.ok) {
                    reject(new Error('Network response was not OK'));
                }
                return response.json();
            }).then((messages) => {
                // console.log("getOldMessages")
                // console.log(structuredClone(Object.values(messages)))
                Promise.all(Object
                    .keys(messages)
                    .filter((v) => messages[v].hasOwnProperty('encrypted_contents'))
                    // .map((v) => { console.log("#*#*#*#*#*#*#"); console.log(structuredClone(messages[v].encrypted_contents)); return v; })
                    .map((v) => deCryptChannelMessage(v, messages[v].encrypted_contents, this.#channel.keys)))
                    .then((decryptedMessageArray) => {
                    // console.log("getOldMessages is returning:")
                    // console.log(decryptedMessageArray)
                    resolve(decryptedMessageArray);
                });
            }).catch((e) => {
                reject(e);
            });
        });
    }
    /**
     * updateCapacity
     */
    updateCapacity(capacity) {
        return new Promise((resolve, reject) => {
            fetch(this.#channelServer + this.#channel.channelId + '/updateRoomCapacity?capacity=' + capacity, {
                method: 'GET', credentials: 'include'
            }).then((response) => {
                if (!response.ok) {
                    reject(new Error('Network response was not OK'));
                }
                return response.json();
            }).then((data) => {
                resolve(data);
            }).catch((e) => {
                reject(e);
            });
        });
    }
    /**
     * getCapacity
     */
    getCapacity() {
        return new Promise((resolve, reject) => {
            fetch(this.#channelServer + this.#channel.channelId + '/getRoomCapacity', {
                method: 'GET', credentials: 'include'
            }).then((response) => {
                if (!response.ok) {
                    reject(new Error('Network response was not OK'));
                }
                return response.json();
            }).then((data) => {
                resolve(data.capacity);
            }).catch((e) => {
                reject(e);
            });
        });
    }
    /**
     * getJoinRequests
     */
    getJoinRequests() {
        return new Promise((resolve, reject) => {
            fetch(this.#channelServer + this.#channel.channelId + '/getJoinRequests', {
                method: 'GET', credentials: 'include'
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
        });
    }
    /**
     * isLocked
     */
    isLocked() {
        return new Promise((resolve, reject) => {
            fetch(this.#channelServer + this.#channel.channelId + '/roomLocked', {
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
    /**
     * Set message of the day
     */
    setMOTD(motd) {
        return new Promise((resolve, reject) => {
            //if (this.#channel.owner) {
            fetch(this.#channelServer + this.#channel.channelId + '/motd', {
                method: 'POST', body: JSON.stringify({ motd: motd }), headers: {
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
            //} else {
            //  reject(new Error('Must be channel owner to get admin data'));
            //}
        });
    }
    /**
     * getAdminData
     */
    getAdminData() {
        return new Promise(async (resolve, reject) => {
            //if (this.#channel.owner) {
            const token_data = new Date().getTime().toString();
            const token_sign = await sbCrypto.sign(this.#channel.keys.channelSignKey, token_data);
            fetch(this.#channelServer + this.#channel.channelId + '/getAdminData', {
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
            ///} else {
            ///  reject(new Error('Must be channel owner to get admin data'));
            //}
        });
    }
    /**
     * downloadData
     */
    downloadData() {
        return new Promise((resolve, reject) => {
            fetch(this.#channelServer + this.#channel.channelId + '/downloadData', {
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
        return new Promise((resolve, reject) => {
            fetch(this.#channelServer + this.#channel.channelId + '/uploadRoom', {
                method: 'POST', body: JSON.stringify(channelData), headers: {
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
        return new Promise((resolve, reject) => {
            fetch(this.#channelServer + this.#channel.channelId + '/authorizeRoom', {
                method: 'POST',
                body: JSON.stringify({ roomId: this.#channel.channelId, SERVER_SECRET: serverSecret, ownerKey: ownerPublicKey })
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
    // we post our pub key if we're first
    postPubKey(_exportable_pubKey) {
        return new Promise((resolve, reject) => {
            fetch(this.#channelServer + this.#channel.channelId + '/postPubKey?type=guestKey', {
                method: 'POST',
                body: JSON.stringify(_exportable_pubKey),
                headers: {
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
        return new Promise((resolve, reject) => {
            fetch(this.#channelServer + this.#channel.channelId + '/storageRequest?size=' + byteLength, {
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
} /* class ChannelAPI */
//#region IndexedKV - our (local storage) KV interface
/******************************************************************************************************/
/**
 * Augments IndexedDB to be used as a KV to easily
 * replace _localStorage for larger and more complex datasets
 *
 * @class
 * @constructor
 * @public
 */
export class IndexedKV {
    db;
    events = new MessageBus();
    options = {
        db: 'MyDB', table: 'default', onReady: () => {
            return;
        },
    };
    // psm: override doesn't seem to be used
    // mtg: we have the option to expose this elswhere, but it might be better to break this out into a helper
    constructor( /* options: IndexedKVOptions */) {
        // psm: hm?
        this.options = Object.assign(this.options, this.options);
        if (typeof this.options.onReady === 'function') {
            this.events.subscribe(`ready`, (e) => {
                this.options.onReady(e);
            });
        }
        // if (!process.browser) {
        //   this.indexedDB = global.indexedDB;
        // } else {
        // }
        const openReq = indexedDB.open(this.options.db);
        openReq.onerror = (event) => {
            console.error(event);
        };
        openReq.onsuccess = (event) => {
            this.db = event.target.result;
            this.events.publish('ready');
        };
        openReq.onerror = (event) => {
            console.error('Database error: ' + event.target.errorCode);
        };
        openReq.onupgradeneeded = (event) => {
            this.db = event.target.result;
            this.db.createObjectStore(this.options.table, { keyPath: 'key' });
            this.#useDatabase();
            this.events.publish('ready');
        };
    }
    openCursor(match, callback) {
        return new Promise((resolve, reject) => {
            const objectStore = this.db.transaction([this.options.table], 'readonly').objectStore(this.options.table);
            const request = objectStore.openCursor(null, 'next');
            request.onsuccess = (event) => {
                resolve(event.target.result);
                const cursor = event.target.result;
                if (cursor) {
                    const regex = new RegExp(`^${match}`);
                    if (cursor.key.match(regex)) {
                        callback(cursor.value.value);
                    }
                    cursor.continue();
                }
                else {
                    resolve(true);
                }
            };
            request.onerror = (event) => {
                reject(event);
            };
        });
    }
    #useDatabase() {
        this.db.onversionchange = () => {
            this.db.close();
            console.info('A new version of this page is ready. Please reload or close this tab!');
        };
    }
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
                }
                else {
                    const requestAdd = objectStore.add({ key: key, value: value });
                    requestAdd.onsuccess = (event) => {
                        resolve(event.target.result);
                    };
                    requestAdd.onerror = (event) => {
                        reject(event);
                    };
                }
            };
        });
    }
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
                }
                else {
                    const requestAdd = objectStore.add({ key: key, value: value });
                    requestAdd.onsuccess = (event) => {
                        resolve(event.target.result);
                    };
                    requestAdd.onerror = (event) => {
                        reject(event);
                    };
                }
            };
        });
    }
    getItem(key) {
        return new Promise((resolve, reject) => {
            const objectStore = this.db.transaction([this.options.table]).objectStore(this.options.table);
            const request = objectStore.get(key);
            request.onerror = (event) => {
                reject(event);
            };
            request.onsuccess = (event) => {
                const data = event?.target?.result;
                if (data?.value) {
                    resolve(data.value);
                }
                else {
                    resolve(null);
                }
            };
        });
    }
    removeItem(key) {
        return new Promise((resolve, reject) => {
            const request = this.db.transaction([this.options.table], 'readwrite')
                .objectStore(this.options.table)
                .delete(key);
            request.onsuccess = () => {
                resolve(true);
            };
            request.onerror = (event) => {
                reject(event);
            };
        });
    }
}
const _localStorage = new IndexedKV();
//#endregion IndexedKV
class Snackabra {
    #storage;
    #channel;
    // #defaultIdentity = new Identity();
    // defaultIdentity?: Identity
    #preferredServer;
    /**
     * Constructor expects an object with the names of the matching servers, for example
     * below shows the miniflare local dev config. Note that 'new Snackabra()' is
     * guaranteed synchronous, so can be 'used' right away. You can optionally call
     * without a parameter in which case SB will ping known servers.
     *
     *
     * ::
     *
     *     {
     *       channel_server: 'http://127.0.0.1:4001',
     *       channel_ws: 'ws://127.0.0.1:4001',
     *       storage_server: 'http://127.0.0.1:4000'
     *     }
     *
     * @param args {SBServer} server names (optional)
     *
     *
     */
    constructor(args) {
        // _sb_assert(args, 'Snackabra(args) - missing args');
        try {
            if (args) {
                this.#preferredServer = Object.assign({}, args);
                this.#storage = new StorageApi(args.storage_server, args.channel_server);
            }
            // this.options = Object.assign(this.options, {
            //   channel_server: args.channel_server,
            //   channel_ws: args.channel_ws,
            //   storage_server: args.storage_server
            // });
            // this.#storage = new StorageApi(args.storage_server, args.channel_server)
        }
        catch (e) {
            if (e.hasOwnProperty('message')) {
                _sb_exception('Snackabra.constructor()', e.message);
            }
            else {
                _sb_exception('Snackabra.constructor()', 'Unknown exception');
            }
        }
    }
    /**
     * Connects to :term:`Channel Name` on this SB config.
     * Returns a (promise to the) channel (socket) object.
     * It will throw an ``AggregateError`` if it fails
     * to find the room anywhere.
     */
    connect(onMessage, key, channelId /*, identity?: SB384 */) {
        // if there's a 'preferred' (only) server then we we can return a promise right away
        // return new Promise<ChannelSocket>((resolve, reject) =>
        //   Promise.any(this.#preferredServer
        //     ? [new ChannelSocket(this.#preferredServer!, onMessage, key, channelId)]
        //     : SBKnownServers.map((s) => (new ChannelSocket(s, onMessage, key, channelId)).ready))
        //     .then((c) => resolve(c))
        //     .catch((e) => { console.log("No known servers responding to channel"); reject(e); })
        return this.#preferredServer
            ? new Promise((resolve) => resolve(new ChannelSocket(this.#preferredServer, onMessage, key, channelId)))
            : Promise.any(SBKnownServers.map((s) => (new ChannelSocket(s, onMessage, key, channelId)).ready));
    }
    /**
     * Creates a new channel. Currently uses trivial authentication.
     * Returns the :term:`Channel Name`. Note that this does not
     * create a channel object, e.g. does not make a connection.
     */
    create(sbServer, serverSecret, keys) {
        return new Promise(async (resolve, reject) => {
            try {
                const owner384 = new SB384(keys);
                const ownerKeyPair = await owner384.ready.then((x) => x.keyPair);
                // const ownerKeyPair: CryptoKeyPair = await crypto.subtle.generateKey({
                //   name: 'ECDH',
                //   namedCurve: 'P-384'
                // }, true, ['deriveKey']);
                const exportable_privateKey = await crypto.subtle.exportKey('jwk', ownerKeyPair.privateKey);
                const exportable_pubKey = await crypto.subtle.exportKey('jwk', ownerKeyPair.publicKey);
                // const channelId: string = await this.#generateRoomId(exportable_pubKey.x, exportable_pubKey.y);
                const channelId = owner384.ownerChannelId;
                const encryptionKey = await crypto.subtle.generateKey({
                    name: 'AES-GCM',
                    length: 256
                }, true, ['encrypt', 'decrypt']);
                const exportable_encryptionKey = await crypto.subtle.exportKey('jwk', encryptionKey);
                const signKeyPair = await crypto.subtle.generateKey({
                    name: 'ECDH', namedCurve: 'P-384'
                }, true, ['deriveKey']);
                const exportable_signKey = await crypto.subtle.exportKey('jwk', signKeyPair.privateKey);
                const channelData = {
                    roomId: channelId,
                    ownerKey: JSON.stringify(exportable_pubKey),
                    encryptionKey: JSON.stringify(exportable_encryptionKey),
                    signKey: JSON.stringify(exportable_signKey),
                    SERVER_SECRET: serverSecret
                };
                const data = new TextEncoder().encode(JSON.stringify(channelData));
                let resp = await fetch(sbServer.channel_server + '/api/room/' + channelId + '/uploadRoom', {
                    method: 'POST',
                    body: data
                });
                resp = await resp.json();
                if (resp.success) {
                    // await this.connect(channelId, identity);
                    _localStorage.setItem(channelId, JSON.stringify(exportable_privateKey));
                    resolve({ channelId: channelId, key: exportable_privateKey });
                }
                else {
                    reject(new Error(JSON.stringify(resp)));
                }
            }
            catch (e) {
                reject(e);
            }
        });
    }
    get channel() {
        return this.#channel;
    }
    get storage() {
        return this.#storage;
    }
    get crypto() {
        return sbCrypto;
    }
    // get identity(): Identity {
    //   // return this.#identity;
    //   return this.#defaultIdentity
    // }
    // set identity(identity: Identity) {
    //   this.#defaultIdentity = identity
    // }
    // // These are just helper methods, we can still access from SB.channel.socket.send externally
    // sendMessage(message: SBMessage) {
    //   this.channel.send(message);
    // }
    sendFile(file) {
        this.storage.saveFile(this.#channel, file);
    }
} /* class Snackabra */
export { 
// ChannelMessage,
Channel, SBMessage, Snackabra, SBCrypto, };
//# sourceMappingURL=snackabra.js.map