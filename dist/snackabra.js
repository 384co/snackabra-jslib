var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const version = '2.0.0-alpha.5 (build 24)';
export const NEW_CHANNEL_MINIMUM_BUDGET = 32 * 1024 * 1024;
var DBG = true;
var DBG2 = false;
export const msgTtlToSeconds = [0, 60, 300, 1200, 3600, 14400, 64800, 259200, 1036800, 4147200, 31622400, 0, 0, 0, 0, Infinity];
export const msgTtlToString = ['Ephemeral', 'One minute', 'Five minutes', 'Twenty minutes', 'One hour', '4 hours', '18 hours', '72 hours', '12 days', '48 days', 'One year', '<reserved>', '<reserved>', '<reserved>', '<reserved>', 'Permastore (no limit)'];
const currentSBOHVersion = '2';
export class MessageBus {
    bus = {};
    #select(event) {
        return this.bus[event] || (this.bus[event] = []);
    }
    subscribe(event, handler) {
        this.#select(event).push(handler);
    }
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
    publish(event, ...args) {
        for (const handler of this.#select('*')) {
            handler(event, ...args);
        }
        for (const handler of this.#select(event)) {
            handler(...args);
        }
    }
}
function SBFetch(input, init) {
    return new Promise((resolve, reject) => {
        try {
            fetch(input, init ?? { method: 'GET' })
                .then((response) => {
                resolve(response);
            }).catch((error) => {
                const msg = `[SBFetch] Error (fetch through a reject, might be normal): ${error}`;
                console.warn(msg);
                reject(msg);
            });
        }
        catch (e) {
            const msg = `[SBFetch] Error (fetch exception, might be normal operation): ${e}`;
            console.warn(msg);
            reject();
        }
    });
}
function WrapError(e) {
    if (e instanceof Error)
        return e;
    else
        return new Error(String(e));
}
function _sb_exception(loc, msg) {
    const m = '[_sb_exception] << SB lib error (' + loc + ': ' + msg + ') >>';
    throw new Error(m);
}
function _sb_assert(val, msg) {
    if (!(val)) {
        const m = `[_sb_assert] << SB assertion error: ${msg} >>`;
        if (DBG)
            console.trace(m);
        throw new Error(m);
    }
}
export function getRandomValues(buffer) {
    if (buffer.byteLength < (4096)) {
        return crypto.getRandomValues(buffer);
    }
    else {
        _sb_assert(!(buffer.byteLength % 1024), 'getRandomValues(): large requested blocks must be multiple of 1024 in size');
        let i = 0;
        try {
            for (i = 0; i < buffer.byteLength; i += 1024) {
                let t = new Uint8Array(1024);
                crypto.getRandomValues(t);
                buffer.set(t, i);
            }
        }
        catch (e) {
            console.log(`got an error on index i=${i}`);
            console.log(e);
            console.trace();
        }
        return buffer;
    }
}
const messageIdRegex = /([A-Za-z0-9+/_\-=]{64})([01]{42})/;
const b64_regex = /^([A-Za-z0-9+/_\-=]*)$/;
function _assertBase64(base64) {
    return b64_regex.test(base64);
}
const isBase64Encoded = _assertBase64;
const b64lookup = [];
const urlLookup = [];
const revLookup = [];
const CODE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_B64 = CODE + '+/';
const CODE_URL = CODE + '-_';
const PAD = '=';
const MAX_CHUNK_LENGTH = 16383;
for (let i = 0, len = CODE_B64.length; i < len; ++i) {
    b64lookup[i] = CODE_B64[i];
    urlLookup[i] = CODE_URL[i];
    revLookup[CODE_B64.charCodeAt(i)] = i;
}
revLookup['-'.charCodeAt(0)] = 62;
revLookup['_'.charCodeAt(0)] = 63;
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
const bs2dv = (bs) => bs instanceof ArrayBuffer
    ? new DataView(bs)
    : new DataView(bs.buffer, bs.byteOffset, bs.byteLength);
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
function arrayBufferToBase64(buffer, variant = 'url') {
    if (buffer == null) {
        _sb_exception('L893', 'arrayBufferToBase64() -> null paramater');
        return '';
    }
    else {
        const view = bs2dv(buffer);
        const len = view.byteLength;
        const extraBytes = len % 3;
        const len2 = len - extraBytes;
        const parts = new Array(Math.floor(len2 / MAX_CHUNK_LENGTH) + Math.sign(extraBytes));
        const lookup = variant == 'url' ? urlLookup : b64lookup;
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
const base62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const array32regex = /^(a32\.)?[0-9A-Za-z]{43}$/;
const b62regex = /^[0-9a-zA-Z]*$/;
const intervals = new Map([
    [32, 43],
    [16, 22],
    [8, 11],
    [4, 6],
]);
const inverseIntervals = new Map(Array.from(intervals, ([key, value]) => [value, key]));
const inverseKeys = Array.from(inverseIntervals.keys()).sort((a, b) => a - b);
function _arrayBufferToBase62(buffer, c) {
    if (buffer.byteLength !== c || !intervals.has(c))
        throw new Error("[arrayBufferToBase62] Decoding error");
    let result = '';
    for (let n = BigInt('0x' + Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')); n > 0n; n = n / 62n)
        result = base62[Number(n % 62n)] + result;
    return result.padStart(intervals.get(c), '0');
}
export function arrayBufferToBase62(buffer) {
    let l = buffer.byteLength;
    if (l % 4 !== 0)
        throw new Error("[arrayBufferToBase62] Must be multiple of 4 bytes (32 bits).");
    let i = 0;
    let result = '';
    while (l > 0) {
        let c = 2 ** Math.min(Math.floor(Math.log2(l)), 5);
        let chunk = buffer.slice(i, i + c);
        result += _arrayBufferToBase62(chunk, c);
        i += c;
        l -= c;
    }
    return result;
}
function _base62ToArrayBuffer(s, t) {
    let n = 0n;
    try {
        for (let i = 0; i < s.length; i++) {
            const digit = BigInt(base62.indexOf(s[i]));
            n = n * 62n + digit;
        }
        if (n > 2n ** BigInt(t * 8) - 1n)
            throw new Error(`base62ToArrayBuffer: value exceeds ${t * 8} bits.`);
        const buffer = new ArrayBuffer(t);
        const view = new DataView(buffer);
        for (let i = 0; i < (t / 4); i++) {
            const uint32 = Number(BigInt.asUintN(32, n));
            view.setUint32(((t / 4) - i - 1) * 4, uint32);
            n = n >> 32n;
        }
        return buffer;
    }
    catch (e) {
        console.error("[_base62ToArrayBuffer] Error: ", e);
        throw (e);
    }
}
export function base62ToArrayBuffer(s) {
    if (!b62regex.test(s))
        throw new Error('base62ToArrayBuffer32: must be alphanumeric (0-9A-Za-z).');
    let i = 0, j = 0, c, oldC = 43;
    let result = new Uint8Array(s.length);
    try {
        while (i < s.length) {
            c = inverseKeys.filter(num => num <= (s.length - i)).pop();
            if (oldC < 43 && c >= oldC)
                throw new Error('cannot decypher b62 string (incorrect length)');
            oldC = c;
            let chunk = s.slice(i, i + c);
            const newBuf = new Uint8Array(_base62ToArrayBuffer(chunk, inverseIntervals.get(c)));
            result.set(newBuf, j);
            i += c;
            j += newBuf.byteLength;
        }
        return result.buffer.slice(0, j);
    }
    catch (e) {
        console.error("[base62ToArrayBuffer] Error:", e);
        throw (e);
    }
}
export function base62ToArrayBuffer32(s) {
    if (!array32regex.test(s))
        throw new Error(`base62ToArrayBuffer32: string must match: ${array32regex}, value provided was ${s}`);
    return base62ToArrayBuffer(s);
}
export function arrayBuffer32ToBase62(buffer) {
    if (buffer.byteLength !== 32)
        throw new Error('arrayBufferToBase62: buffer must be exactly 32 bytes (256 bits).');
    return arrayBufferToBase62(buffer);
}
export function base62ToBase64(s) {
    return arrayBufferToBase64(base62ToArrayBuffer32(s));
}
export function base64ToBase62(s) {
    return arrayBufferToBase62(base64ToArrayBuffer(s));
}
export function isBase62Encoded(value) {
    return array32regex.test(value);
}
function _appendBuffer(buffer1, buffer2) {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
}
export function partition(str, n) {
    throw (`partition() not tested on TS yet - (${str}, ${n})`);
}
export function jsonParseWrapper(str, loc, reviver) {
    while (str && typeof str === 'string') {
        try {
            str = JSON.parse(str, reviver);
        }
        catch (e) {
            throw new Error(`JSON.parse() error${loc ? ` at ${loc}` : ''}: ${e}\nString (possibly nested) was: ${str}`);
        }
    }
    return str;
}
export function assemblePayload2(data) {
    try {
        const metadata = {};
        metadata['version'] = '002';
        let keyCount = 0;
        let startIndex = 0;
        for (const key in data) {
            keyCount++;
            metadata[keyCount.toString()] = { name: key, start: startIndex, size: data[key].byteLength };
            startIndex += data[key].byteLength;
        }
        const encoder = new TextEncoder();
        const metadataBuffer = encoder.encode(JSON.stringify(metadata));
        const metadataSize = new Uint32Array([metadataBuffer.byteLength]);
        let payload = _appendBuffer(new Uint8Array(metadataSize.buffer), new Uint8Array(metadataBuffer));
        for (const key in data)
            payload = _appendBuffer(new Uint8Array(payload), data[key]);
        return payload;
    }
    catch (e) {
        console.error(e);
        return null;
    }
}
function is32BitSignedInteger(number) {
    const MIN_32_INT = -2147483648;
    const MAX_32_INT = 2147483647;
    return (typeof number === 'number' &&
        number >= MIN_32_INT &&
        number <= MAX_32_INT &&
        number % 1 === 0);
}
function getType(value) {
    if (value === null)
        return '0';
    if (value === undefined)
        return 'u';
    if (Array.isArray(value))
        return 'a';
    if (value instanceof ArrayBuffer)
        return 'x';
    if (typeof value === 'boolean')
        return 'b';
    if (value instanceof DataView)
        return 'v';
    if (value instanceof Date)
        return 'd';
    if (value instanceof Map)
        return 'm';
    if (typeof value === 'number') {
        if (is32BitSignedInteger(value))
            return 'i';
        else
            return 'n';
    }
    if (value !== null && typeof value === 'object' && value.constructor === Object)
        return 'o';
    if (value instanceof Set)
        return 't';
    if (typeof value === 'string')
        return 's';
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
        if (value.constructor.name === 'Uint8Array')
            return '8';
        console.error("[getType] Unsupported typed array:", value.constructor.name);
        return '<unsupported>';
    }
    console.error('[getType] Unsupported for object:', value);
    return '<unsupported>';
}
function _assemblePayload(data) {
    try {
        const metadata = {};
        let keyCount = 0;
        let startIndex = 0;
        let BufferList = [];
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const value = data[key];
                const type = getType(value);
                switch (type) {
                    case 'o':
                        const payload = _assemblePayload(value);
                        if (!payload)
                            throw new Error(`Failed to assemble payload for ${key}`);
                        BufferList.push(payload);
                        break;
                    case 'n':
                        const numberValue = new Uint8Array(8);
                        new DataView(numberValue.buffer).setFloat64(0, value);
                        BufferList.push(numberValue.buffer);
                        break;
                    case 'i':
                        const intValue = new Uint8Array(4);
                        new DataView(intValue.buffer).setInt32(0, value);
                        BufferList.push(intValue.buffer);
                        break;
                    case 'd':
                        const dateValue = new Uint8Array(8);
                        new DataView(dateValue.buffer).setFloat64(0, value.getTime());
                        BufferList.push(dateValue.buffer);
                        break;
                    case 'b':
                        const boolValue = new Uint8Array(1);
                        boolValue[0] = value ? 1 : 0;
                        BufferList.push(boolValue.buffer);
                        break;
                    case 's':
                        const stringValue = new TextEncoder().encode(value);
                        BufferList.push(stringValue);
                        break;
                    case 'x':
                        BufferList.push(value);
                        break;
                    case '8':
                        BufferList.push(value.buffer);
                        break;
                    case 'm':
                        const mapValue = new Array();
                        value.forEach((v, k) => {
                            mapValue.push([k, v]);
                        });
                        const mapPayload = _assemblePayload(mapValue);
                        if (!mapPayload)
                            throw new Error(`Failed to assemble payload for ${key}`);
                        BufferList.push(mapPayload);
                        break;
                    case 'a':
                        const arrayValue = new Array();
                        value.forEach((v) => {
                            arrayValue.push(v);
                        });
                        const arrayPayload = _assemblePayload(arrayValue);
                        if (!arrayPayload)
                            throw new Error(`Failed to assemble payload for ${key}`);
                        BufferList.push(arrayPayload);
                        break;
                    case 't':
                        const setValue = new Array();
                        value.forEach((v) => {
                            setValue.push(v);
                        });
                        const setPayload = _assemblePayload(setValue);
                        if (!setPayload)
                            throw new Error(`Failed to assemble payload for ${key}`);
                        BufferList.push(setPayload);
                        break;
                    case '0':
                        BufferList.push(new ArrayBuffer(0));
                        break;
                    case 'u':
                        BufferList.push(new ArrayBuffer(0));
                        break;
                    case 'v':
                    case '<unsupported>':
                    default:
                        console.error(`[assemblePayload] Unsupported type: ${type}`);
                        throw new Error(`Unsupported type: ${type}`);
                }
                const size = BufferList[BufferList.length - 1].byteLength;
                keyCount++;
                metadata[keyCount.toString()] = { n: key, s: startIndex, z: size, t: type };
                startIndex += size;
            }
        }
        const metadataBuffer = new TextEncoder().encode(JSON.stringify(metadata));
        const metadataSize = new Uint32Array([metadataBuffer.byteLength]);
        let payload = _appendBuffer(new Uint8Array(metadataSize.buffer), new Uint8Array(metadataBuffer));
        for (let i = 0; i < BufferList.length; i++) {
            payload = _appendBuffer(new Uint8Array(payload), BufferList[i]);
        }
        return payload;
    }
    catch (e) {
        console.error(e);
        return null;
    }
}
export function assemblePayload(data) {
    return _assemblePayload({ ver003: true, payload: data });
}
export function extractPayload2(payload) {
    try {
        const metadataSize = new Uint32Array(payload.slice(0, 4))[0];
        const decoder = new TextDecoder();
        const _metadata = jsonParseWrapper(decoder.decode(payload.slice(4, 4 + metadataSize)), 'L533');
        const startIndex = 4 + metadataSize;
        if (!_metadata.version)
            _metadata['version'] = '001';
        switch (_metadata['version']) {
            case '001': {
                throw new Error('extractPayload() exception: version 001 is no longer supported');
            }
            case '002': {
                const data = [];
                for (let i = 1; i < Object.keys(_metadata).length; i++) {
                    const _index = i.toString();
                    if (_metadata[_index]) {
                        const propertyStartIndex = _metadata[_index]['start'];
                        const size = _metadata[_index]['size'];
                        const entry = _metadata[_index];
                        data[entry['name']] = payload.slice(startIndex + propertyStartIndex, startIndex + propertyStartIndex + size);
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
function deserializeValue(buffer, type) {
    switch (type) {
        case 'o':
            return _extractPayload(buffer);
        case 'n':
            return new DataView(buffer).getFloat64(0);
        case 'i':
            return new DataView(buffer).getInt32(0);
        case 'd':
            return new Date(new DataView(buffer).getFloat64(0));
        case 'b':
            return new Uint8Array(buffer)[0] === 1;
        case 's':
            return new TextDecoder().decode(buffer);
        case 'b':
            return buffer;
        case 'a':
            const arrayPayload = _extractPayload(buffer);
            if (!arrayPayload)
                throw new Error(`Failed to assemble payload for ${type}`);
            return Object.values(arrayPayload);
        case 'm':
            const mapPayload = _extractPayload(buffer);
            if (!mapPayload)
                throw new Error(`Failed to assemble payload for ${type}`);
            const map = new Map();
            for (const key in mapPayload) {
                map.set(mapPayload[key][0], mapPayload[key][1]);
            }
            return map;
        case 't':
            const setPayload = _extractPayload(buffer);
            if (!setPayload)
                throw new Error(`Failed to assemble payload for ${type}`);
            const set = new Set();
            for (const key in setPayload) {
                set.add(setPayload[key]);
            }
            return set;
        case 'x':
            return buffer;
        case '8':
            return new Uint8Array(buffer);
        case '0':
            return null;
        case 'u':
            return undefined;
        case 'v':
        case '<unsupported>':
        default:
            throw new Error(`Unsupported type: ${type}`);
    }
}
function _extractPayload(payload) {
    try {
        const metadataSize = new Uint32Array(payload.slice(0, 4))[0];
        const decoder = new TextDecoder();
        const json = decoder.decode(payload.slice(4, 4 + metadataSize));
        const metadata = jsonParseWrapper(json, "L1308");
        const startIndex = 4 + metadataSize;
        const data = {};
        for (let i = 1; i <= Object.keys(metadata).length; i++) {
            const index = i.toString();
            if (metadata[index]) {
                const entry = metadata[index];
                const propertyStartIndex = entry['s'];
                const size = entry['z'];
                const type = entry['t'];
                const buffer = payload.slice(startIndex + propertyStartIndex, startIndex + propertyStartIndex + size);
                data[entry['n']] = deserializeValue(buffer, type);
            }
            else {
                console.log(`found nothing for index ${i}`);
            }
        }
        return data;
    }
    catch (e) {
        throw new Error('extractPayload() exception (' + e + ')');
    }
}
export function extractPayload(value) {
    return _extractPayload(value);
}
export function encodeB64Url(input) {
    return input.replaceAll('+', '-').replaceAll('/', '_');
}
export function decodeB64Url(input) {
    input = input.replaceAll('-', '+').replaceAll('_', '/');
    const pad = input.length % 4;
    if (pad) {
        _sb_assert(pad !== 1, 'InvalidLengthError: Input base64url string is the wrong length to determine padding');
        input += new Array(5 - pad).join('=');
    }
    return input;
}
export var KeyPrefix;
(function (KeyPrefix) {
    KeyPrefix["SBPublicKey"] = "PNk2";
    KeyPrefix["SBPrivateKey"] = "Xj3p";
})(KeyPrefix || (KeyPrefix = {}));
export class SBCrypto {
    generateIdKey(buf) {
        return new Promise((resolve, reject) => {
            try {
                crypto.subtle.digest('SHA-512', buf).then((digest) => {
                    const _id = digest.slice(0, 32);
                    const _key = digest.slice(32);
                    resolve({
                        id_binary: _id,
                        key_material: _key
                    });
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }
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
    async #testHash(channelBytes, channel_id) {
        const MAX_REHASH_ITERATIONS = 160;
        let count = 0;
        let hash = arrayBufferToBase64(channelBytes);
        while (hash !== channel_id) {
            if (count++ > MAX_REHASH_ITERATIONS)
                return false;
            channelBytes = await crypto.subtle.digest('SHA-384', channelBytes);
            hash = arrayBufferToBase64(channelBytes);
        }
        return true;
    }
    async compareHashWithKey(hash, key) {
        if (!hash || !key)
            return false;
        let x = key.x;
        let y = key.y;
        if (!(x && y)) {
            try {
                const tryParse = jsonParseWrapper(key, "L1787");
                if (tryParse.x)
                    x = tryParse.x;
                if (tryParse.y)
                    y = tryParse.y;
            }
            catch {
                return false;
            }
        }
        const xBytes = base64ToArrayBuffer(decodeB64Url(x));
        const yBytes = base64ToArrayBuffer(decodeB64Url(y));
        const channelBytes = _appendBuffer(xBytes, yBytes);
        const sha256 = await crypto.subtle.digest('SHA-256', channelBytes);
        const sha256base62 = arrayBufferToBase62(sha256);
        if (sha256base62 === hash)
            return true;
        else
            return await this.#testHash(channelBytes, hash);
    }
    async verifyChannelId(owner_key, channel_id) {
        return await this.compareHashWithKey(channel_id, owner_key);
    }
    async generateKeys() {
        try {
            return await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-384' }, true, ['deriveKey']);
        }
        catch (e) {
            throw new Error('generateKeys() exception (' + e + ')');
        }
    }
    async importKey(format, key, type, extractable, keyUsages) {
        try {
            let importedKey;
            const keyAlgorithms = {
                ECDH: { name: 'ECDH', namedCurve: 'P-384' },
                AES: { name: 'AES-GCM' },
                PBKDF2: 'PBKDF2'
            };
            if (format === 'jwk') {
                const jsonKey = key;
                if (jsonKey.kty === undefined)
                    throw new Error('importKey() - invalid JsonWebKey');
                if (jsonKey.alg === 'ECDH')
                    jsonKey.alg = undefined;
                importedKey = await crypto.subtle.importKey('jwk', jsonKey, keyAlgorithms[type], extractable, keyUsages);
            }
            else {
                importedKey = await crypto.subtle.importKey(format, key, keyAlgorithms[type], extractable, keyUsages);
            }
            return (importedKey);
        }
        catch (e) {
            const msg = `... importKey() error: ${e}:`;
            if (DBG) {
                console.error(msg);
                console.log(format);
                console.log(key);
                console.log(type);
                console.log(extractable);
                console.log(keyUsages);
            }
            throw new Error(msg);
        }
    }
    async exportKey(format, key) {
        return crypto.subtle
            .exportKey(format, key)
            .catch(() => {
            if (DBG)
                console.warn(`... exportKey() protested, this just means we treat this as undefined`);
            return undefined;
        });
    }
    deriveKey(privateKey, publicKey, type, extractable, keyUsages) {
        return new Promise(async (resolve, reject) => {
            let _keyAlgorithm;
            switch (type) {
                case 'AES-GCM': {
                    _keyAlgorithm = { name: 'AES-GCM', length: 256 };
                    break;
                }
                case 'HMAC': {
                    _keyAlgorithm = { name: 'HMAC', hash: 'SHA-256', length: 256 };
                    break;
                }
                default: {
                    throw new Error(`deriveKey() - unknown type: ${type}`);
                }
            }
            let _key = publicKey;
            if (_key.type === 'private') {
                const _jwk = await this.exportKey('jwk', _key);
                _sb_assert(_jwk, "INTERNAL (L1878)");
                delete _jwk.d;
                delete _jwk.alg;
                _key = await this.importKey('jwk', _jwk, 'ECDH', true, []);
                _sb_assert(_key, "INTERNAL (L1882)");
            }
            _sb_assert(_key.type === 'public', "INTERNAL (L1884)");
            try {
                resolve(await crypto.subtle.deriveKey({
                    name: 'ECDH',
                    public: _key
                }, privateKey, _keyAlgorithm, extractable, keyUsages));
            }
            catch (e) {
                console.error(e, privateKey, publicKey, type, extractable, keyUsages);
                reject(e);
            }
        });
    }
    encrypt(data, key, params, returnType = 'encryptedContents') {
        return new Promise(async (resolve, reject) => {
            try {
                if (data === null)
                    reject(new Error('no contents'));
                if (!params.iv) {
                    _sb_assert(returnType !== 'arrayBuffer', "Must provide nonce if you just want the arraybuffer back (L1959)");
                    params.iv = crypto.getRandomValues(new Uint8Array(12));
                }
                if (!params.name)
                    params.name = 'AES-GCM';
                else
                    _sb_assert(params.name === 'AES-GCM', "Must be AES-GCM (L1951)");
                if (typeof data === 'string')
                    data = (new TextEncoder()).encode(data);
                const encrypted = await crypto.subtle.encrypt(params, key, data);
                if (returnType === 'encryptedContents') {
                    resolve({
                        content: encrypted,
                        iv: params.iv
                    });
                }
                else {
                    resolve(encrypted);
                }
            }
            catch (e) {
                reject(e);
            }
        });
    }
    wrap(k, b) {
        return new Promise((resolve) => {
            const timestamp = Math.round(Date.now() / 25) * 25;
            const view = new DataView(new ArrayBuffer(8));
            view.setFloat64(0, timestamp);
            sbCrypto.encrypt(b, k, { additionalData: view }).then((c) => { resolve({ ...c, ...{ timestamp: timestamp } }); });
        });
    }
    unwrap(k, o) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!o.timestamp)
                    throw new Error(`unwrap() - no timestamp in encrypted contents`);
                const { content: t, iv: iv } = o;
                const view = new DataView(new ArrayBuffer(8));
                view.setFloat64(0, o.timestamp);
                const d = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv, additionalData: view }, k, t);
                resolve(d);
            }
            catch (e) {
                if (DBG)
                    console.error(`unwrap(): cannot unwrap/decrypt - rejecting: ${e}`);
                reject(e);
            }
        });
    }
    async sign(secretKey, contents) {
        return await crypto.subtle.sign('HMAC', secretKey, contents);
    }
    async verify(verifyKey, sign, contents) {
        return await crypto.subtle.verify('HMAC', verifyKey, sign, contents);
    }
    str2ab(string) {
        return new TextEncoder().encode(string);
    }
    ab2str(buffer) {
        return new TextDecoder('utf-8').decode(buffer);
    }
    compareKeys(key1, key2) {
        if (key1 != null && key2 != null && typeof key1 === 'object' && typeof key2 === 'object')
            return key1['x'] === key2['x'] && key1['y'] === key2['y'];
        return false;
    }
}
function Memoize(target, propertyKey, descriptor) {
    if ((descriptor) && (descriptor.get)) {
        let get = descriptor.get;
        descriptor.get = function () {
            const prop = `__${target.constructor.name}__${propertyKey}__`;
            if (this.hasOwnProperty(prop)) {
                const returnValue = this[prop];
                return (returnValue);
            }
            else {
                const returnValue = get.call(this);
                Object.defineProperty(this, prop, { configurable: false, enumerable: false, writable: false, value: returnValue });
                return returnValue;
            }
        };
    }
}
function Ready(target, propertyKey, descriptor) {
    if ((descriptor) && (descriptor.get)) {
        let get = descriptor.get;
        descriptor.get = function () {
            const obj = target.constructor.name;
            const readyFlagSymbol = target.constructor.ReadyFlag;
            _sb_assert(readyFlagSymbol in this, `'readyFlagSymbol' missing yet getter accessed with @Ready pattern (fatal)`);
            _sb_assert(this[readyFlagSymbol], `'${obj}.${propertyKey}' getter accessed but object not 'ready' (fatal)`);
            const retValue = get.call(this);
            _sb_assert(retValue != null, `'${obj}.${propertyKey}' getter accessed but return value will be NULL (fatal)`);
            return retValue;
        };
    }
}
function Owner(target, propertyKey, descriptor) {
    if ((descriptor) && (descriptor.get)) {
        let get = descriptor.get;
        descriptor.get = function () {
            const obj = target.constructor.name;
            if ('owner' in this) {
                const o = "owner";
                _sb_assert(this[o] === true, `${propertyKey} getter or method accessed for object ${obj} but callee is not channel owner`);
            }
            return get.call(this);
        };
    }
}
function VerifyParameters(_target, _propertyKey, descriptor) {
    if ((descriptor) && (descriptor.value)) {
        const operation = descriptor.value;
        descriptor.value = function (...args) {
            for (let x of args) {
                const m = x.constructor.name;
                if (isSBClass(m))
                    _sb_assert(SBValidateObject(x, m), `invalid parameter: ${x} (expecting ${m})`);
            }
            return operation.call(this, ...args);
        };
    }
}
function ExceptionReject(target, _propertyKey, descriptor) {
    if ((descriptor) && (descriptor.value)) {
        const operation = descriptor.value;
        descriptor.value = function (...args) {
            try {
                return operation.call(this, ...args);
            }
            catch (e) {
                console.log(`ExceptionReject: ${WrapError(e)}`);
                console.log(target);
                console.log(_propertyKey);
                console.log(descriptor);
                return new Promise((_resolve, reject) => reject(`Reject: ${WrapError(e)}`));
            }
        };
    }
}
const SB_CLASS_ARRAY = ['SBMessage', 'SBObjectHandle', 'SBChannelHandle'];
const SB_CHANNEL_HANDLE_SYMBOL = Symbol('SBChannelHandle');
const SB_MESSAGE_SYMBOL = Symbol.for('SBMessage');
const SB_OBJECT_HANDLE_SYMBOL = Symbol.for('SBObjectHandle');
function isSBClass(s) {
    return typeof s === 'string' && SB_CLASS_ARRAY.includes(s);
}
function SBValidateObject(obj, type) {
    switch (type) {
        case 'SBMessage': return SB_MESSAGE_SYMBOL in obj;
        case 'SBObjectHandle': return SB_OBJECT_HANDLE_SYMBOL in obj;
        case 'SBChannelHandle': return SB_OBJECT_HANDLE_SYMBOL in obj;
        default: return false;
    }
}
export const sbCrypto = new SBCrypto();
function parseSB384string(input) {
    try {
        if (input.length <= 4)
            return undefined;
        const prefix = input.slice(0, 4);
        const data = input.slice(4);
        switch (prefix) {
            case KeyPrefix.SBPublicKey: {
                const combined = base62ToArrayBuffer(data);
                if (combined.byteLength !== (48 * 2))
                    return undefined;
                return {
                    prefix: KeyPrefix.SBPublicKey,
                    x: arrayBufferToBase64(combined.slice(0, 48)),
                    y: arrayBufferToBase64(combined.slice(48, 96))
                };
            }
            case KeyPrefix.SBPrivateKey: {
                const combined = base62ToArrayBuffer(data);
                if (combined.byteLength !== (48 * 3))
                    return undefined;
                return {
                    prefix: KeyPrefix.SBPrivateKey,
                    x: arrayBufferToBase64(combined.slice(0, 48)),
                    y: arrayBufferToBase64(combined.slice(48, 96)),
                    d: arrayBufferToBase64(combined.slice(96, 144))
                };
            }
            default: {
                return undefined;
            }
        }
    }
    catch (e) {
        console.error("parseSB384string() - malformed input, exception: ", e);
        return undefined;
    }
}
class SB384 {
    sb384Ready;
    static ReadyFlag = Symbol('SB384ReadyFlag');
    #private;
    #x;
    #y;
    #d;
    #privateUserKey;
    #publicUserKey;
    #hash;
    constructor(key, forcePrivate) {
        this[SB384.ReadyFlag] = false;
        this.sb384Ready = new Promise(async (resolve, reject) => {
            try {
                if (!key) {
                    if (DBG)
                        console.log("SB384() - generating new key pair");
                    const keyPair = await sbCrypto.generateKeys();
                    const _jwk = await sbCrypto.exportKey('jwk', keyPair.privateKey);
                    _sb_assert(_jwk && _jwk.x && _jwk.y && _jwk.d, 'INTERNAL');
                    this.#private = true;
                    this.#x = _jwk.x;
                    this.#y = _jwk.y;
                    this.#d = _jwk.d;
                }
                else if (key instanceof CryptoKey) {
                    const _jwk = await sbCrypto.exportKey('jwk', key);
                    _sb_assert(_jwk && _jwk.x && _jwk.y, 'INTERNAL');
                    if (_jwk.d) {
                        this.#private = true;
                        this.#d = _jwk.d;
                    }
                    else {
                        this.#private = false;
                        _sb_assert(!forcePrivate, `ERROR creating SB384 object: key provided is not the requested private`);
                    }
                    this.#x = _jwk.x;
                    this.#y = _jwk.y;
                }
                else if (key && key instanceof Object && 'kty' in key) {
                    const _jwk = key;
                    _sb_assert(_jwk && _jwk.x && _jwk.y, 'Cannot parse format of JWK key');
                    if (key.d) {
                        this.#private = true;
                        this.#d = _jwk.d;
                    }
                    else {
                        this.#private = false;
                        _sb_assert(!forcePrivate, `ERROR creating SB384 object: key provided is not the requested private`);
                    }
                    this.#x = _jwk.x;
                    this.#y = _jwk.y;
                }
                else if (typeof key === 'string') {
                    const tryParse = parseSB384string(key);
                    if (!tryParse)
                        throw new Error('ERROR creating SB384 object: invalid key (must be a JsonWebKey | SBUserPublicKey | SBUserPrivateKey, or omitted)');
                    const { x, y, d } = tryParse;
                    if (d) {
                        this.#private = true;
                        this.#d = d;
                    }
                    else {
                        this.#private = false;
                        _sb_assert(!forcePrivate, `ERROR creating SB384 object: key provided is not the requested private`);
                    }
                    _sb_assert(x && y, 'INTERNAL');
                    this.#x = x;
                    this.#y = y;
                }
                else {
                    throw new Error('ERROR creating SB384 object: invalid key (must be a JsonWebKey, SBUserId, or omitted)');
                }
                if (DBG2)
                    console.log("SB384() constructor; x/y/d:\n", this.#x, "\n", this.#y, "\n", this.#d);
                if (this.#private)
                    this.#privateUserKey = await sbCrypto.importKey('jwk', this.jwkPrivate, 'ECDH', true, ['deriveKey']);
                this.#publicUserKey = await sbCrypto.importKey('jwk', this.jwkPublic, 'ECDH', true, []);
                const channelBytes = _appendBuffer(base64ToArrayBuffer(this.#x), base64ToArrayBuffer(this.#y));
                this.#hash = arrayBufferToBase62(await crypto.subtle.digest('SHA-256', channelBytes));
                if (DBG2)
                    console.log("SB384() constructor; hash:\n", this.#hash);
                this.SB384ReadyFlag = true;
                resolve(this);
            }
            catch (e) {
                reject('ERROR creating SB384 object failed: ' + WrapError(e));
            }
        });
        this.sb384Ready
            .then(() => {
            this.SB384ReadyFlag = true;
            if (DBG2)
                console.log("SB384() - constructor wrapping up, ready:", this.SB384ReadyFlag);
        })
            .catch((e) => { throw e; });
    }
    get SB384ReadyFlag() { return this[SB384.ReadyFlag]; }
    set SB384ReadyFlag(v) { this[SB384.ReadyFlag] = v; }
    get ready() { return this.sb384Ready; }
    get private() { return this.#private; }
    get hash() { return this.#hash; }
    get userId() { return this.hash; }
    get ownerChannelId() {
        if (!this.private)
            throw new Error(`ownerChannelId() - not a private key, cannot be an owner key`);
        return this.hash;
    }
    get privateKey() {
        if (!this.private)
            throw new Error(`this is a public key, there is no 'privateKey' value`);
        return this.#privateUserKey;
    }
    get publicKey() { return this.#publicUserKey; }
    get jwkPrivate() {
        _sb_assert(this.#private, 'jwkPrivate() - not a private key');
        _sb_assert(this.#x && this.#y && this.#d, "JWK key info is not available (fatal)");
        return {
            crv: "P-384",
            ext: true,
            key_ops: ["deriveKey"],
            kty: "EC",
            x: this.#x,
            y: this.#y,
            d: this.#d,
        };
    }
    get jwkPublic() {
        _sb_assert(this.#x && this.#y, "JWK key info is not available (fatal)");
        return {
            crv: "P-384",
            ext: true,
            key_ops: [],
            kty: "EC",
            x: this.#x,
            y: this.#y
        };
    }
    get userPublicKey() {
        _sb_assert(this.#x && this.#y, "userPublicKey() - sufficient key info is not available (fatal)");
        const combined = new Uint8Array(48 * 2);
        combined.set(base64ToArrayBuffer(this.#x), 0);
        combined.set(base64ToArrayBuffer(this.#y), 48);
        return (KeyPrefix.SBPublicKey + arrayBufferToBase62(combined));
    }
    get userPrivateKey() {
        _sb_assert(this.#private, 'userPrivateKey() - not a private key, there is no userPrivateKey');
        _sb_assert(this.#x && this.#y && this.#d, "userPrivateKey() - sufficient key info is not available (fatal)");
        const combined = new Uint8Array(3 * 48);
        combined.set(base64ToArrayBuffer(this.#x), 0);
        combined.set(base64ToArrayBuffer(this.#y), 48);
        combined.set(base64ToArrayBuffer(this.#d), 96);
        return (KeyPrefix.SBPrivateKey + arrayBufferToBase62(combined));
    }
}
__decorate([
    Memoize,
    Ready
], SB384.prototype, "private", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "hash", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "userId", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "ownerChannelId", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "privateKey", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "publicKey", null);
__decorate([
    Memoize
], SB384.prototype, "jwkPrivate", null);
__decorate([
    Memoize
], SB384.prototype, "jwkPublic", null);
__decorate([
    Memoize
], SB384.prototype, "userPublicKey", null);
__decorate([
    Memoize
], SB384.prototype, "userPrivateKey", null);
export class SBChannelKeys extends SB384 {
    #channelId;
    sbChannelKeysReady;
    SBChannelKeysReadyFlag = false;
    #channelData;
    #encryptionKey;
    #signKey;
    channelServer;
    #channelPublicKey;
    #channelPrivateKey;
    constructor(source, handleOrJWK) {
        switch (source) {
            case 'handle':
                {
                    const handle = handleOrJWK;
                    super(handle.userPrivateKey, true);
                    this.channelServer = handle.channelServer;
                    if (this.channelServer && this.channelServer[this.channelServer.length - 1] === '/')
                        this.channelServer = this.channelServer.slice(0, -1);
                    this.#channelId = handle.channelId;
                }
                break;
            case 'jwk':
                {
                    const keys = handleOrJWK;
                    super(keys, true);
                    _sb_assert(this.private, "Channel(): jwk provided but it's not private");
                }
                break;
            case 'new':
                {
                    super();
                }
                break;
            default: {
                throw new Error("Illegal parameters");
            }
        }
        this.sbChannelKeysReady = new Promise(async (resolve, reject) => {
            if (DBG)
                console.log("SBChannelKeys() constructor.");
            await this.sb384Ready;
            try {
                if (!this.#channelId)
                    this.#channelId = this.ownerChannelId;
                const signKeyPair = await crypto.subtle.generateKey({
                    name: 'ECDH', namedCurve: 'P-384'
                }, true, ['deriveKey']);
                this.#channelPrivateKey = signKeyPair.privateKey;
                this.#channelPublicKey = signKeyPair.publicKey;
                const channelKeys = new SB384(this.#channelPrivateKey, true);
                await channelKeys.ready;
                this.#encryptionKey = await sbCrypto.deriveKey(this.privateKey, this.#channelPublicKey, 'AES-GCM', true, ['encrypt', 'decrypt']);
                this.#signKey = await sbCrypto.deriveKey(this.privateKey, this.#channelPublicKey, 'HMAC', true, ['sign', 'verify']);
                this.#channelData = {
                    channelId: this.#channelId,
                    ownerPublicKey: this.userPublicKey,
                    channelPublicKey: channelKeys.userPublicKey,
                };
                this.SBChannelKeysReadyFlag = true;
                resolve(this);
            }
            catch (e) {
                reject('ERROR creating SBChannelKeys object failed: ' + WrapError(e));
            }
        });
    }
    get ready() { return this.sbChannelKeysReady; }
    get readyFlag() { return this.SBChannelKeysReadyFlag; }
    get channelData() { return this.#channelData; }
    get owner() { return this.private && this.ownerChannelId === this.channelId; }
    get channelId() { return this.#channelId; }
    get encryptionKey() { return this.#encryptionKey; }
    get signKey() { return this.#signKey; }
    get channelPrivateKey() { return this.#channelPrivateKey; }
    get channelPublicKey() { return this.#channelPublicKey; }
}
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "channelData", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "owner", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "channelId", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "encryptionKey", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "signKey", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "channelPrivateKey", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "channelPublicKey", null);
class SBMessage {
    channel;
    [SB_MESSAGE_SYMBOL] = true;
    ready;
    contents;
    #encryptionKey;
    MAX_SB_BODY_SIZE = 64 * 1024 * 1.5;
    constructor(channel, contents, ttl) {
        this.channel = channel;
        const payload = assemblePayload(contents);
        _sb_assert(payload, "SBMessage(): failed to assemble payload");
        _sb_assert(payload.byteLength < this.MAX_SB_BODY_SIZE, `SBMessage(): body must be smaller than ${this.MAX_SB_BODY_SIZE / 1024} KiB (we got ${payload.byteLength / 1024} KiB)})`);
        this.ready = new Promise(async (resolve) => {
            await channel.channelReady;
            this.#encryptionKey = this.channel.encryptionKey;
            this.contents = {
                contents: payload,
                senderUserId: this.channel.userId,
                sign: await sbCrypto.sign(this.channel.privateKey, payload),
                ttl: ttl ? ttl : 0xF
            };
            resolve(this);
        });
    }
    get encryptionKey() { return this.#encryptionKey; }
    send() {
        return new Promise((resolve, reject) => {
            this.ready.then(() => {
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
    }
}
__decorate([
    Ready
], SBMessage.prototype, "encryptionKey", null);
class Channel extends SBChannelKeys {
    channelReady;
    #ChannelReadyFlag = false;
    motd = '';
    locked = false;
    adminData;
    verifiedGuest = false;
    #cursor = '';
    constructor(handle) {
        if (!handle.channelServer)
            throw new Error("Channel(): no channel server provided");
        super('handle', handle);
        this.channelReady =
            this.sbChannelKeysReady
                .then(() => {
                this.#ChannelReadyFlag = true;
                return this;
            })
                .catch(e => { throw e; });
    }
    get ready() { return this.channelReady; }
    get readyFlag() { return this.#ChannelReadyFlag; }
    get api() { return this; }
    async #callApi(path, body) {
        if (DBG)
            console.log("#callApi:", path);
        if (!this.#ChannelReadyFlag) {
            if (DBG2)
                console.log("ChannelApi.#callApi: channel not ready (we will wait)");
            await (this.channelReady);
        }
        const method = 'POST';
        return new Promise(async (resolve, reject) => {
            if (!this.channelId)
                reject("ChannelApi.#callApi: no channel ID (?)");
            await (this.ready);
            let authString = '';
            const token_data = (new TextEncoder).encode(new Date().getTime().toString());
            authString = token_data + '.' + arrayBufferToBase64(await sbCrypto.sign(this.privateKey, token_data));
            let init = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': authString,
                }
            };
            let fullBody = {
                userId: this.userId,
                channelID: this.channelId,
                ...body
            };
            init.body = JSON.stringify(fullBody);
            await (this.ready);
            SBFetch(this.channelServer + '/api/room/' + this.channelId + path, init)
                .then(async (response) => {
                const retValue = await response.json();
                if ((!response.ok) || (retValue.error)) {
                    let apiErrorMsg = 'Network or Server error on Channel API call';
                    if (response.status)
                        apiErrorMsg += ' [' + response.status + ']';
                    if (retValue.error)
                        apiErrorMsg += ': ' + retValue.error;
                    reject(new Error(apiErrorMsg));
                }
                else {
                    resolve(retValue);
                }
            })
                .catch((e) => { reject("ChannelApi (SBFetch) Error [2]: " + WrapError(e)); });
        });
    }
    async deCryptChannelMessage(m00, m01) {
        const z = messageIdRegex.exec(m00);
        let encryptionKey = this.encryptionKey;
        if (z) {
            let m = {
                type: 'encrypted',
                channelID: z[1],
                timestampPrefix: z[2],
                _id: z[1] + z[2],
                encrypted_contents: m01
            };
            let unwrapped;
            try {
                unwrapped = await sbCrypto.unwrap(encryptionKey, m.encrypted_contents);
            }
            catch (e) {
                const msg = `ERROR: cannot decrypt message with either locked or unlocked key`;
                if (DBG)
                    console.error(msg);
                return (undefined);
            }
            let m2 = { ...m, ...extractPayload(unwrapped).payload };
            if ((m2.verificationToken) && (!m2.senderUserId)) {
                if (DBG)
                    console.error('ERROR: message with verification token is lacking sender identity (cannot be verified).');
                return (undefined);
            }
            const sender = new SB384(m2.senderUserId);
            await sender.ready;
            const verifyKey = await sbCrypto.deriveKey(this.privateKey, sender.publicKey, 'HMAC', false, ['sign', 'verify']);
            const v = await sbCrypto.verify(verifyKey, m2.sign, m2.contents);
            if (!v) {
                console.error("***** signature is NOT correct for message (rejecting)");
                if (DBG) {
                    console.log("verifyKey:", Object.assign({}, verifyKey));
                    console.log("m2.sign", Object.assign({}, m2.sign));
                    console.log("m2.contents", structuredClone(m2.contents));
                    console.log("Message:", Object.assign({}, m2));
                }
                return (undefined);
            }
            return (m2);
        }
        else {
            console.error(`++++++++ #processMessage: ERROR - cannot parse channel ID / timestamp, invalid message`);
            if (DBG) {
                console.log(Object.assign({}, m00));
                console.log(Object.assign({}, m01));
            }
            return (undefined);
        }
    }
    getLastMessageTimes() {
        throw new Error("Channel.getLastMessageTimes(): not supported in 2.0 yet");
    }
    getOldMessages(currentMessagesLength = 100, paginate = false) {
        return new Promise(async (resolve, reject) => {
            if (!this.channelId) {
                reject("Channel.getOldMessages: no channel ID (?)");
            }
            if (!this.#ChannelReadyFlag) {
                if (DBG)
                    console.log("Channel.getOldMessages: channel not ready (we will wait)");
                await (this.channelReady);
            }
            let cursorOption = '';
            if (paginate)
                cursorOption = '&cursor=' + this.#cursor;
            SBFetch(this.channelServer + '/' + this.channelId + '/oldMessages?currentMessagesLength=' + currentMessagesLength + cursorOption, {
                method: 'GET',
            }).then(async (response) => {
                if (!response.ok)
                    reject(new Error('Network response was not OK'));
                return response.json();
            }).then((messages) => {
                if (DBG) {
                    console.log("getOldMessages");
                    console.log(messages);
                }
                Promise.all(Object
                    .keys(messages)
                    .filter((v) => messages[v].hasOwnProperty('encrypted_contents'))
                    .map((v) => this.deCryptChannelMessage(v, messages[v].encrypted_contents)))
                    .then((unfilteredDecryptedMessageArray) => unfilteredDecryptedMessageArray.filter((v) => Boolean(v)))
                    .then((decryptedMessageArray) => {
                    let lastMessage = decryptedMessageArray[decryptedMessageArray.length - 1];
                    if (lastMessage)
                        this.#cursor = lastMessage._id || '';
                    if (DBG2)
                        console.log(decryptedMessageArray);
                    resolve(decryptedMessageArray);
                })
                    .catch((e) => {
                    const msg = `Channel.getOldMessages(): failed to decrypt messages: ${e}`;
                    console.error(msg);
                    reject(msg);
                });
            }).catch((e) => {
                const msg = `Channel.getOldMessages(): SBFetch failed: ${e}`;
                console.error(msg);
                reject(msg);
            });
        });
    }
    send(_msg) {
        return Promise.reject("Channel.send(): abstract method, must be implemented in subclass");
    }
    updateCapacity(capacity) { return this.#callApi('/updateRoomCapacity?capacity=' + capacity); }
    getCapacity() { return (this.#callApi('/getRoomCapacity')); }
    getStorageLimit() { return (this.#callApi('/getStorageLimit')); }
    getMother() { return (this.#callApi('/getMother')); }
    getJoinRequests() { return this.#callApi('/getJoinRequests'); }
    isLocked() {
        return new Promise((resolve) => (this.#callApi('/roomLocked')).then((d) => {
            this.locked = (d.locked === true);
            resolve(this.locked);
        }));
    }
    setMOTD(motd) { return this.#callApi('/motd', { motd: motd }); }
    getAdminData() { return this.#callApi('/getAdminData'); }
    authorize(ownerPublicKey, serverSecret) {
        return this.#callApi('/authorizeRoom', { roomId: this.channelId, SERVER_SECRET: serverSecret, ownerKey: ownerPublicKey });
    }
    storageRequest(byteLength) {
        return this.#callApi('/storageRequest?size=' + byteLength);
    }
    acceptVisitor(userId) {
        console.warn(`WARNING: acceptVisitor(${userId}) on channel api has not been tested/debugged fully ..`);
    }
    getStorageToken(size) {
        return new Promise((resolve, reject) => {
            this.#callApi(`/storageRequest?size=${size}`)
                .then((storageTokenReq) => {
                if (storageTokenReq.hasOwnProperty('error'))
                    reject(`storage token request error (${storageTokenReq.error})`);
                resolve(JSON.stringify(storageTokenReq));
            })
                .catch((e) => { reject("ChannelApi (getStorageToken) Error [3]: " + WrapError(e)); });
        });
    }
    budd(options) {
        let { keys, storage, targetChannel } = options ?? {};
        return new Promise(async (resolve, reject) => {
            if ((options) && (options.hasOwnProperty('storage')) && (options.storage === undefined))
                reject("If you omit 'storage' it defaults to Infinity, but you cannot set 'storage' to undefined");
            try {
                if (!storage)
                    storage = Infinity;
                if (targetChannel) {
                    if (this.channelId == targetChannel)
                        throw new Error("[budd()]: You can't specify the same channel as targetChannel");
                    if (keys)
                        throw new Error("[budd()]: You can't specify both a target channel and keys");
                    resolve(this.#callApi(`/budd?targetChannel=${targetChannel}&transferBudget=${storage}`));
                }
                else {
                    const theUser = new SB384(keys);
                    await theUser.ready;
                    const channelData = {
                        [SB_CHANNEL_HANDLE_SYMBOL]: true,
                        userPrivateKey: theUser.userPrivateKey,
                        channelServer: this.channelServer,
                        channelId: theUser.hash,
                    };
                    let resp = await this.#callApi(`/budd?targetChannel=${channelData.channelId}&transferBudget=${storage}`, channelData);
                    if (resp.success) {
                        resolve(channelData);
                    }
                    else {
                        reject(JSON.stringify(resp));
                    }
                }
            }
            catch (e) {
                reject(e);
            }
        });
    }
}
__decorate([
    Memoize,
    Ready
], Channel.prototype, "api", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "updateCapacity", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "getCapacity", null);
__decorate([
    Ready
], Channel.prototype, "getStorageLimit", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "getMother", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "getJoinRequests", null);
__decorate([
    ExceptionReject
], Channel.prototype, "isLocked", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "setMOTD", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "getAdminData", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "authorize", null);
__decorate([
    Ready
], Channel.prototype, "storageRequest", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "acceptVisitor", null);
__decorate([
    Ready
], Channel.prototype, "getStorageToken", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "budd", null);
class ChannelSocket extends Channel {
    channelSocketReady;
    #ChannelSocketReadyFlag = false;
    #ws;
    #socketServer;
    #onMessage = this.#noMessageHandler;
    #ack = new Map();
    #traceSocket = false;
    #resolveFirstMessage = () => { _sb_exception('L2461', 'this should never be called'); };
    #firstMessageEventHandlerReference = (_e) => { _sb_exception('L2462', 'this should never be called'); };
    constructor(handle, onMessage) {
        _sb_assert(onMessage, 'ChannelSocket(): no onMessage handler provided');
        if (handle.hasOwnProperty('channelId') && handle.hasOwnProperty('userPrivateKey')) {
            if (!handle.channelServer)
                throw new Error("ChannelSocket(): no channel server provided (required)");
            super(handle);
            this.#socketServer = handle.channelServer.replace(/^http/, 'ws');
        }
        else {
            throw new Error("ChannelSocket(): first argument must be valid SBChannelHandle");
        }
        this.#onMessage = onMessage;
        const url = this.#socketServer + '/api/room/' + this.channelId + '/websocket';
        this.#ws = {
            url: url,
            ready: false,
            closed: false,
            timeout: 2000
        };
        this.channelSocketReady = this.#channelSocketReadyFactory();
    }
    #noMessageHandler(_m) { _sb_assert(false, "NO MESSAGE HANDLER"); }
    #channelSocketReadyFactory() {
        if (DBG)
            console.log("++++ CREATING ChannelSocket.readyPromise()");
        return new Promise((resolve, reject) => {
            if (DBG)
                console.log("++++ STARTED ChannelSocket.readyPromise()");
            this.#resolveFirstMessage = resolve;
            const url = this.#ws.url;
            if (DBG) {
                console.log("++++++++ readyPromise() has url:");
                console.log(url);
            }
            if (!this.#ws.websocket)
                this.#ws.websocket = new WebSocket(this.#ws.url);
            if (this.#ws.websocket.readyState === 3) {
                this.#ws.websocket = new WebSocket(url);
            }
            else if (this.#ws.websocket.readyState === 2) {
                console.warn("STRANGE - trying to use a ChannelSocket that is in the process of closing ...");
                this.#ws.websocket = new WebSocket(url);
            }
            this.#ws.websocket.addEventListener('open', () => {
                this.#ws.closed = false;
                this.channelReady.then(() => {
                    _sb_assert(this.userId, "ChannelSocket.readyPromise(): no userId of channel owner/user?");
                    this.#ws.init = { userId: this.userId };
                    if (DBG) {
                        console.log("++++++++ readyPromise() constructed init:");
                        console.log(this.#ws.init);
                    }
                    this.#ws.websocket.send(JSON.stringify(this.#ws.init));
                });
            });
            this.#firstMessageEventHandlerReference = this.#firstMessageEventHandler.bind(this);
            this.#ws.websocket.addEventListener('message', this.#firstMessageEventHandlerReference);
            this.#ws.websocket.addEventListener('close', (e) => {
                this.#ws.closed = true;
                if (!e.wasClean) {
                    console.log(`ChannelSocket() was closed (and NOT cleanly: ${e.reason} from ${this.channelServer}`);
                }
                else {
                    if (e.reason.includes("does not have an owner"))
                        reject(`No such channel on this server (${this.channelServer})`);
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
            setTimeout(() => {
                if (!this.#ChannelSocketReadyFlag) {
                    console.warn("ChannelSocket() - this socket is not resolving (waited 10s) ...");
                    console.log(this);
                    reject('ChannelSocket() - this socket is not resolving (waited 10s) ...');
                }
                else {
                    if (DBG) {
                        console.log("ChannelSocket() - this socket resolved");
                        console.log(this);
                    }
                }
            }, 10000);
        });
    }
    async #processMessage(msg) {
        let m = msg.data;
        if (this.#traceSocket) {
            console.log("... raw unwrapped message:");
            console.log(structuredClone(m));
        }
        const data = jsonParseWrapper(m, 'L1489');
        if (this.#traceSocket) {
            console.log("... json unwrapped version of raw message:");
            console.log(Object.assign({}, data));
        }
        if (typeof this.#onMessage !== 'function')
            _sb_exception('ChannelSocket', 'received message but there is no handler');
        const message = data;
        try {
            const m01 = Object.entries(message)[0][1];
            if (Object.keys(m01)[0] === 'encrypted_contents') {
                if (DBG)
                    console.log("++++++++ #processMessage: received message:", m01.encrypted_contents.content);
                const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(m01.encrypted_contents.content));
                const ack_id = arrayBufferToBase64(hash);
                if (DBG2)
                    console.log("Received message with hash:", ack_id);
                const r = this.#ack.get(ack_id);
                if (r) {
                    if (this.#traceSocket)
                        console.log(`++++++++ #processMessage: found matching ack for id ${ack_id}`);
                    this.#ack.delete(ack_id);
                    r("success");
                }
                const m00 = Object.entries(data)[0][0];
                const iv_b64 = m01.encrypted_contents.iv;
                if ((iv_b64) && (_assertBase64(iv_b64)) && (iv_b64.length == 16)) {
                    m01.encrypted_contents.iv = base64ToArrayBuffer(iv_b64);
                    try {
                        const m = await this.deCryptChannelMessage(m00, m01.encrypted_contents);
                        if (!m)
                            return;
                        if (this.#traceSocket) {
                            console.log("++++++++ #processMessage: passing to message handler:");
                            console.log(Object.assign({}, m));
                        }
                        this.#onMessage(m);
                    }
                    catch {
                        console.warn('Error decrypting message, dropping (ignoring) message');
                    }
                }
                else {
                    console.error('#processMessage: - iv is malformed, should be 16-char b64 string (ignoring)');
                }
            }
            else {
                console.warn("++++++++ #processMessage: can't decipher message, passing along unchanged:");
                console.log(Object.assign({}, message));
                this.onMessage(message);
            }
        }
        catch (e) {
            console.log(`++++++++ #processMessage: caught exception while decyphering (${e}), passing it along unchanged`);
            this.onMessage(message);
        }
    }
    #insideFirstMessageHandler(e) {
        console.warn("WARNING: firstMessageEventHandler() called recursively (?)");
        console.warn(e);
    }
    #firstMessageEventHandler(e) {
        if (this.#traceSocket)
            console.log("FIRST MESSAGE HANDLER CALLED");
        const blocker = this.#insideFirstMessageHandler.bind(this);
        this.#ws.websocket.addEventListener('message', blocker);
        this.#ws.websocket.removeEventListener('message', this.#firstMessageEventHandlerReference);
        const message = jsonParseWrapper(e.data, 'L2239');
        if (DBG)
            console.log("++++++++ readyPromise() received ChannelKeysMessage:", message);
        _sb_assert(message.ready, `got roomKeys but channel reports it is not ready [${message}]`);
        this.motd = message.motd;
        _sb_assert(this.readyFlag, '#ChannelReadyFlag is false, parent not ready (?)');
        this.locked = message.roomLocked;
        this.adminData = this.api.getAdminData();
        this.#ws.websocket.addEventListener('message', this.#processMessage.bind(this));
        this.#ws.websocket.removeEventListener('message', blocker);
        if (DBG)
            console.log("++++++++ readyPromise() all done - resolving!");
        this.#ChannelSocketReadyFlag = true;
        this.#resolveFirstMessage(this);
    }
    get ready() { return this.channelSocketReady; }
    get readyFlag() { return this.#ChannelSocketReadyFlag; }
    get status() {
        if (!this.#ws.websocket)
            return 'CLOSED';
        else
            switch (this.#ws.websocket.readyState) {
                case 0: return 'CONNECTING';
                case 1: return 'OPEN';
                case 2: return 'CLOSING';
                default: return 'CLOSED';
            }
    }
    set onMessage(f) { this.#onMessage = f; }
    get onMessage() { return this.#onMessage; }
    set enableTrace(b) {
        this.#traceSocket = b;
        if (b)
            console.log("==== jslib ChannelSocket: Tracing enabled ====");
    }
    send(msg) {
        const message = msg instanceof SBMessage ? msg : new SBMessage(this, msg);
        _sb_assert(this.#ws.websocket, "ChannelSocket.send() called before ready");
        if (this.#ws.closed) {
            if (this.#traceSocket)
                console.info("send() triggered reset of #readyPromise() (normal)");
            this.channelSocketReady = this.#channelSocketReadyFactory();
            this.#ChannelSocketReadyFlag = true;
        }
        return new Promise((resolve, reject) => {
            message.ready.then((message) => {
                this.ready.then(() => {
                    if (!this.#ChannelSocketReadyFlag)
                        reject("ChannelSocket.send() is confused - ready or not?");
                    switch (this.#ws.websocket.readyState) {
                        case 1:
                            if (this.#traceSocket)
                                console.log("++++++++ ChannelSocket.send(): Wrapping message contents:", Object.assign({}, message.contents));
                            const messagePayload = assemblePayload(message.contents);
                            _sb_assert(messagePayload, "ChannelSocket.send(): failed to assemble message");
                            sbCrypto.wrap(message.encryptionKey, messagePayload)
                                .then((wrappedMessage) => {
                                const m = JSON.stringify({
                                    encrypted_contents: wrappedMessage,
                                });
                                crypto.subtle.digest('SHA-256', wrappedMessage.content)
                                    .then((hash) => {
                                    const messageHash = arrayBufferToBase64(hash);
                                    if (this.#traceSocket) {
                                        console.log("++++++++ ChannelSocket.send():Which has hash:");
                                        console.log(messageHash);
                                    }
                                    this.#ack.set(messageHash, resolve);
                                    this.#ws.websocket.send(m);
                                    setTimeout(() => {
                                        if (this.#ack.has(messageHash)) {
                                            this.#ack.delete(messageHash);
                                            const msg = `Websocket request timed out (no ack) after ${this.#ws.timeout}ms (${messageHash})`;
                                            console.error(msg);
                                            reject(msg);
                                        }
                                        else {
                                            if (this.#traceSocket)
                                                console.log("++++++++ ChannelSocket.send() completed sending");
                                            resolve("success");
                                        }
                                    }, this.#ws.timeout);
                                });
                            });
                            break;
                        case 3:
                        case 0:
                        case 2:
                            const errMsg = 'socket not OPEN - either CLOSED or in the state of CONNECTING/CLOSING';
                            reject(errMsg);
                    }
                });
            });
        });
    }
}
__decorate([
    Ready
], ChannelSocket.prototype, "onMessage", null);
__decorate([
    VerifyParameters
], ChannelSocket.prototype, "send", null);
class SBObjectHandle {
    version = currentSBOHVersion;
    #_type = 'b';
    #id_binary;
    #key_binary;
    #verification;
    shardServer;
    iv;
    salt;
    fileName;
    dateAndTime;
    fileType;
    lastModified;
    actualSize;
    savedSize;
    constructor(options) {
        const { version, type, id, key, verification, iv, salt, fileName, dateAndTime, fileType, lastModified, actualSize, savedSize, } = options;
        if (type)
            this.#_type = type;
        if (version) {
            this.version = version;
        }
        else {
            if ((key) && (id)) {
                if (isBase62Encoded(key) && isBase62Encoded(id)) {
                    this.version = '2';
                }
                else if (isBase64Encoded(key) && isBase64Encoded(id)) {
                    this.version = '1';
                }
                else {
                    throw new Error('Unable to determine version from key and id');
                }
            }
            else {
                this.version = '2';
            }
        }
        if (id)
            this.id = id;
        if (key)
            this.key = key;
        if (verification)
            this.verification = verification;
        this.iv = iv;
        this.salt = salt;
        this.fileName = fileName;
        this.dateAndTime = dateAndTime;
        this.fileType = fileType;
        this.lastModified = lastModified;
        this.actualSize = actualSize;
        this.savedSize = savedSize;
    }
    set id_binary(value) {
        if (!value)
            throw new Error('Invalid id_binary');
        if (value.byteLength !== 32)
            throw new Error('Invalid id_binary length');
        this.#id_binary = value;
        Object.defineProperty(this, 'id64', {
            get: () => {
                return arrayBufferToBase64(this.#id_binary);
            },
            enumerable: false,
            configurable: false
        });
        Object.defineProperty(this, 'id32', {
            get: () => {
                return arrayBufferToBase62(this.#id_binary);
            },
            enumerable: false,
            configurable: false
        });
    }
    set key_binary(value) {
        if (!value)
            throw new Error('Invalid key_binary');
        if (value.byteLength !== 32)
            throw new Error('Invalid key_binary length');
        this.#key_binary = value;
        Object.defineProperty(this, 'key64', {
            get: () => {
                return arrayBufferToBase64(this.#key_binary);
            },
            enumerable: false,
            configurable: false
        });
        Object.defineProperty(this, 'key32', {
            get: () => {
                return arrayBufferToBase62(this.#key_binary);
            },
            enumerable: false,
            configurable: false
        });
    }
    set id(value) {
        if (typeof value === 'string') {
            if (this.version === '1') {
                if (isBase64Encoded(value)) {
                    this.id_binary = base64ToArrayBuffer(value);
                }
                else {
                    throw new Error('Requested version 1, but id is not b64');
                }
            }
            else if (this.version === '2') {
                if (isBase62Encoded(value)) {
                    this.id_binary = base62ToArrayBuffer32(value);
                }
                else {
                    throw new Error('Requested version 2, but id is not b62');
                }
            }
        }
        else if (value instanceof ArrayBuffer) {
            if (value.byteLength !== 32)
                throw new Error('Invalid ID length');
            this.id_binary = value;
        }
        else {
            throw new Error('Invalid ID type');
        }
    }
    set key(value) {
        if (typeof value === 'string') {
            if (this.version === '1') {
                if (isBase64Encoded(value)) {
                    this.#key_binary = base64ToArrayBuffer(value);
                }
                else {
                    throw new Error('Requested version 1, but key is not b64');
                }
            }
            else if (this.version === '2') {
                if (isBase62Encoded(value)) {
                    this.#key_binary = base62ToArrayBuffer32(value);
                }
                else {
                    throw new Error('Requested version 2, but key is not b62');
                }
            }
        }
        else if (value instanceof ArrayBuffer) {
            if (value.byteLength !== 32)
                throw new Error('Invalid key length');
            this.#key_binary = value;
        }
        else {
            throw new Error('Invalid key type');
        }
    }
    get id() {
        _sb_assert(this.#id_binary, 'object handle id is undefined');
        if (this.version === '1') {
            return arrayBufferToBase64(this.#id_binary);
        }
        else if (this.version === '2') {
            return arrayBufferToBase62(this.#id_binary);
        }
        else {
            throw new Error('Invalid or missing version (internal error, should not happen)');
        }
    }
    get key() {
        _sb_assert(this.#key_binary, 'object handle key is undefined');
        if (this.version === '1') {
            return arrayBufferToBase64(this.#key_binary);
        }
        else if (this.version === '2') {
            return arrayBufferToBase62(this.#key_binary);
        }
        else {
            throw new Error('Invalid or missing version (internal error, should not happen)');
        }
    }
    get id64() { throw new Error('Invalid id_binary'); }
    get id32() { throw new Error('Invalid id_binary'); }
    get key64() { throw new Error('Invalid key_binary'); }
    get key32() { throw new Error('Invalid key_binary'); }
    set verification(value) {
        this.#verification = value;
    }
    get verification() {
        _sb_assert(this.#verification, 'object handle verification is undefined');
        return this.#verification;
    }
    get type() { return this.#_type; }
}
export class StorageApi {
    storageServer;
    constructor(sbServerOrStorageServer) {
        if (typeof sbServerOrStorageServer === 'string') {
            this.storageServer = sbServerOrStorageServer;
        }
        else {
            throw new Error('[StorageApi] Invalid parameter to constructor');
        }
    }
    #padBuf(buf) {
        const image_size = buf.byteLength;
        let _target;
        if ((image_size + 4) < 4096)
            _target = 4096;
        else if ((image_size + 4) < 1048576)
            _target = 2 ** Math.ceil(Math.log2(image_size + 4));
        else
            _target = (Math.ceil((image_size + 4) / 1048576)) * 1048576;
        let finalArray = _appendBuffer(buf, (new Uint8Array(_target - image_size)).buffer);
        (new DataView(finalArray)).setUint32(_target - 4, image_size);
        if (DBG2)
            console.log("#padBuf bytes:", finalArray.slice(-4));
        return finalArray;
    }
    #unpadData(data_buffer) {
        const tail = data_buffer.slice(-4);
        var _size = new DataView(tail).getUint32(0);
        const _little_endian = new DataView(tail).getUint32(0, true);
        if (_little_endian < _size) {
            if (DBG2)
                console.warn("#unpadData - size of shard encoded as little endian (fixed upon read)");
            _size = _little_endian;
        }
        if (DBG2) {
            console.log(`#unpadData - size of object is ${_size}`);
        }
        return data_buffer.slice(0, _size);
    }
    #getObjectKey(fileHashBuffer, _salt) {
        return new Promise((resolve, reject) => {
            try {
                sbCrypto.importKey('raw', fileHashBuffer, 'PBKDF2', false, ['deriveBits', 'deriveKey']).then((keyMaterial) => {
                    crypto.subtle.deriveKey({
                        'name': 'PBKDF2',
                        'salt': _salt,
                        'iterations': 100000,
                        'hash': 'SHA-256'
                    }, keyMaterial, { 'name': 'AES-GCM', 'length': 256 }, true, ['encrypt', 'decrypt']).then((key) => {
                        resolve(key);
                    });
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }
    #_allocateObject(image_id, type) {
        return new Promise((resolve, reject) => {
            SBFetch(this.storageServer + '/api/v1' + "/storeRequest?name=" + arrayBufferToBase62(image_id) + "&type=" + type)
                .then((r) => { return r.arrayBuffer(); })
                .then((b) => {
                const par = extractPayload(b);
                resolve({ salt: par.salt, iv: par.iv });
            })
                .catch((e) => {
                console.warn(`**** ERROR: ${e}`);
                reject(e);
            });
        });
    }
    async #_storeObject(image, image_id, keyData, type, budgetChannel, iv, salt) {
        return new Promise(async (resolve, reject) => {
            try {
                const key = await this.#getObjectKey(keyData, salt);
                const data = await sbCrypto.encrypt(image, key, { iv: iv }, 'arrayBuffer');
                const storageToken = await budgetChannel.getStorageToken(data.byteLength);
                const resp_json = await this.storeObject(type, image_id, iv, salt, storageToken, data);
                if (resp_json.error)
                    reject(`storeObject() failed: ${resp_json.error}`);
                if (resp_json.image_id != image_id)
                    reject(`received imageId ${resp_json.image_id} but expected ${image_id}`);
                resolve(resp_json.verification_token);
            }
            catch (e) {
                const msg = `storeObject() failed: ${e}`;
                console.error(msg);
                reject(msg);
            }
        });
    }
    storeObject(type, fileId, iv, salt, storageToken, data) {
        return new Promise((resolve, reject) => {
            if (typeof type !== 'string') {
                const errMsg = "NEW in 1.2.x - storeData() and storeObject() have switched places, you probably meant to use storeData()";
                console.error(errMsg);
                reject("errMsg");
            }
            SBFetch(this.storageServer + '/storeData?type=' + type + '&key=' + fileId, {
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
    storeData(buf, type, channelOrHandle) {
        return new Promise((resolve, reject) => {
            if (typeof buf === 'string') {
                const errMsg = "NEW in 1.2.x - storeData() and storeObject() have switched places, you probably meant to use storeObject()";
                console.error(errMsg);
                reject("errMsg");
            }
            if (buf instanceof Uint8Array) {
                if (DBG2)
                    console.log('converting Uint8Array to ArrayBuffer');
                buf = new Uint8Array(buf).buffer;
            }
            if (!(buf instanceof ArrayBuffer) && buf.constructor.name != 'ArrayBuffer') {
                if (DBG2)
                    console.log('buf must be an ArrayBuffer:');
                console.log(buf);
                reject('buf must be an ArrayBuffer');
            }
            const bufSize = buf.byteLength;
            const channel = (channelOrHandle instanceof Channel) ? channelOrHandle : new Channel(channelOrHandle);
            const paddedBuf = this.#padBuf(buf);
            sbCrypto.generateIdKey(paddedBuf).then((fullHash) => {
                this.#_allocateObject(fullHash.id_binary, type)
                    .then((p) => {
                    const id32 = arrayBufferToBase62(fullHash.id_binary);
                    const key32 = arrayBufferToBase62(fullHash.key_material);
                    const r = {
                        [SB_OBJECT_HANDLE_SYMBOL]: true,
                        version: currentSBOHVersion,
                        type: type,
                        id: id32,
                        key: key32,
                        iv: p.iv,
                        salt: p.salt,
                        actualSize: bufSize,
                        verification: this.#_storeObject(paddedBuf, id32, fullHash.key_material, type, channel, p.iv, p.salt)
                    };
                    resolve(r);
                })
                    .catch((e) => reject(e));
            });
        });
    }
    #processData(payload, h) {
        return new Promise((resolve, reject) => {
            try {
                let j = jsonParseWrapper(sbCrypto.ab2str(new Uint8Array(payload)), 'L3062');
                if (j.error)
                    reject(`#processData() error: ${j.error}`);
            }
            catch (e) {
            }
            finally {
                const data = extractPayload(payload);
                if (DBG) {
                    console.log("Payload (#processData) is:");
                    console.log(data);
                }
                const iv = new ArrayBuffer(data.iv);
                const salt = new ArrayBuffer(data.salt);
                const handleIV = (!h.iv) ? undefined : (typeof h.iv === 'string') ? base64ToArrayBuffer(h.iv) : h.iv;
                const handleSalt = (!h.salt) ? undefined : (typeof h.salt === 'string') ? base64ToArrayBuffer(h.salt) : h.salt;
                if ((handleIV) && (!compareBuffers(iv, handleIV))) {
                    console.error("WARNING: nonce from server differs from local copy");
                    console.log(`object ID: ${h.id}`);
                    console.log(` local iv: ${arrayBufferToBase64(handleIV)}`);
                    console.log(`server iv: ${arrayBufferToBase64(data.iv)}`);
                }
                if ((handleSalt) && (!compareBuffers(salt, handleSalt))) {
                    console.error("WARNING: salt from server differs from local copy (will use server)");
                    if (!h.salt) {
                        console.log("h.salt is undefined");
                    }
                    else if (typeof h.salt === 'string') {
                        console.log("h.salt is in string form (unprocessed):");
                        console.log(h.salt);
                    }
                    else {
                        console.log("h.salt is in arrayBuffer or Uint8Array");
                        console.log("h.salt as b64:");
                        console.log(arrayBufferToBase64(h.salt));
                        console.log("h.salt unprocessed:");
                        console.log(h.salt);
                    }
                    console.log("handleSalt as b64:");
                    console.log(arrayBufferToBase64(handleSalt));
                    console.log("handleSalt unprocessed:");
                    console.log(handleSalt);
                }
                if (DBG2) {
                    console.log("will use nonce and salt of:");
                    console.log(`iv: ${arrayBufferToBase64(iv)}`);
                    console.log(`salt : ${arrayBufferToBase64(salt)}`);
                }
                var h_key_material;
                if (h.version === '1') {
                    h_key_material = base64ToArrayBuffer(h.key);
                }
                else if (h.version === '2') {
                    h_key_material = base62ToArrayBuffer32(h.key);
                }
                else {
                    throw new Error('Invalid or missing version (internal error, should not happen)');
                }
                this.#getObjectKey(h_key_material, salt).then((image_key) => {
                    const encrypted_image = data.image;
                    if (DBG2) {
                        console.log("data.image:      ");
                        console.log(data.image);
                        console.log("encrypted_image: ");
                        console.log(encrypted_image);
                    }
                    sbCrypto.unwrap(image_key, { content: encrypted_image, iv: iv }).then((padded_img) => {
                        const img = this.#unpadData(padded_img);
                        if (DBG) {
                            console.log("#processData(), unwrapped img: ");
                            console.log(img);
                        }
                        resolve(img);
                    });
                });
            }
        });
    }
    async #_fetchData(useServer, url, h, returnType) {
        const body = { method: 'GET' };
        return new Promise(async (resolve, _reject) => {
            SBFetch(useServer + url, body)
                .then((response) => {
                if (!response.ok)
                    return (null);
                return response.arrayBuffer();
            })
                .then((payload) => {
                if (payload === null)
                    return (null);
                return this.#processData(payload, h);
            })
                .then((payload) => {
                if (payload === null)
                    resolve(null);
                if (returnType === 'string')
                    resolve(sbCrypto.ab2str(new Uint8Array(payload)));
                else
                    resolve(payload);
            })
                .catch((_error) => {
                return (null);
            });
        });
    }
    fetchData(handle, returnType = 'arrayBuffer') {
        return new Promise(async (resolve, reject) => {
            const h = new SBObjectHandle(handle);
            if (!h)
                reject('SBObjectHandle is null or undefined');
            const verificationToken = await h.verification;
            const useServer = this.storageServer + '/api/v1';
            if (DBG)
                console.log("fetchData(), fetching from server: " + useServer);
            const queryString = '/fetchData?id=' + h.id + '&type=' + h.type + '&verification_token=' + verificationToken;
            const result = await this.#_fetchData(useServer, queryString, h, returnType);
            if (result !== null) {
                if (DBG)
                    console.log(`[fetchData] success: fetched from '${useServer}'`, result);
                resolve(result);
            }
            else {
                reject('fetchData() failed');
            }
        });
    }
}
class Snackabra {
    channelServer;
    storageServer;
    #storage;
    #version = version;
    sbFetch = SBFetch;
    constructor(channelServer, setDBG, setDBG2) {
        console.warn(`==== CREATING Snackabra object generation: ${this.#version} ====`);
        if (setDBG && setDBG === true)
            DBG = true;
        if (DBG && setDBG2 && setDBG2 === true)
            DBG2 = true;
        if (DBG)
            console.warn("++++ Snackabra constructor ++++ setting DBG to TRUE ++++");
        if (DBG2)
            console.warn("++++ Snackabra constructor ++++ ALSO setting DBG2 to TRUE ++++");
        if (typeof channelServer === 'string') {
            this.channelServer = channelServer;
            this.storageServer = "TODO";
        }
        else {
            throw new Error('[Snackabra] Invalid parameter type for constructor');
        }
        this.#storage = new StorageApi(this.storageServer);
    }
    attach(handle) {
        return new Promise((resolve, reject) => {
            if (handle.channelId) {
                if (!handle.channelServer) {
                    handle.channelServer = this.channelServer;
                }
                else if (handle.channelServer !== this.channelServer) {
                    reject('SBChannelHandle channelId does not match channelServer');
                }
                resolve(new Channel(handle));
            }
            else {
                reject('SBChannelHandle missing channelId');
            }
        });
    }
    create(owner, budget) {
        return new Promise(async (resolve, reject) => {
            try {
                let _storageToken;
                let _sbChannelKeys;
                if (owner instanceof SB384) {
                    _sbChannelKeys = new SBChannelKeys('jwk', owner.jwkPrivate);
                }
                else {
                    const msg = `Wrong parameters to create channel: ${owner}`;
                    console.error(msg);
                    reject(msg);
                    return;
                }
                _storageToken = await budget.getStorageToken(NEW_CHANNEL_MINIMUM_BUDGET);
                if (!_storageToken)
                    reject('[create channel] Failed to get storage token for the provided channel');
                _sbChannelKeys.channelData.storageToken = _storageToken;
                const data = new TextEncoder().encode(JSON.stringify(_sbChannelKeys.channelData));
                let resp = await SBFetch(this.channelServer + '/api/v2/channel/' + _sbChannelKeys.channelId + '/create', {
                    method: 'POST',
                    body: data
                });
                resp = await resp.json();
                if (!resp.success) {
                    const msg = `Creating channel did not succeed (${JSON.stringify(resp)})`;
                    console.error(msg);
                    reject(msg);
                    return;
                }
                resolve({
                    [SB_CHANNEL_HANDLE_SYMBOL]: true,
                    channelId: _sbChannelKeys.channelId,
                    userPrivateKey: _sbChannelKeys.userPrivateKey,
                    channelServer: this.channelServer
                });
            }
            catch (e) {
                const msg = `Creating channel did not succeed: ${e}`;
                console.error(msg);
                reject(msg);
            }
        });
    }
    connect(handle, onMessage) {
        const newChannelHandle = {
            [SB_CHANNEL_HANDLE_SYMBOL]: true,
            channelId: handle.channelId,
            userPrivateKey: handle.userPrivateKey,
            channelServer: this.channelServer
        };
        if (DBG)
            console.log("++++ Snackabra.connect() ++++", newChannelHandle);
        return new ChannelSocket(newChannelHandle, onMessage ? onMessage :
            (m) => { console.log("MESSAGE (not caught):", m); });
    }
    get storage() {
        if (typeof this.#storage === 'string')
            throw new Error('StorageApi not initialized');
        return this.#storage;
    }
    get crypto() {
        return sbCrypto;
    }
    get version() {
        return this.#version;
    }
}
export { SB384, SBMessage, Channel, ChannelSocket, SBObjectHandle, Snackabra, arrayBufferToBase64, version, };
export var SB = {
    Snackabra: Snackabra,
    SBMessage: SBMessage,
    Channel: Channel,
    SBCrypto: SBCrypto,
    SB384: SB384,
    arrayBufferToBase64: arrayBufferToBase64,
    sbCrypto: sbCrypto,
    version: version
};
if (!globalThis.SB)
    globalThis.SB = SB;
console.warn(`==== SNACKABRA jslib loaded ${globalThis.SB.version} ====`);
//# sourceMappingURL=snackabra.js.map