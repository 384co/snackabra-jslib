var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a;
const version = '2.0.0-alpha.5 (build 31)';
export const NEW_CHANNEL_MINIMUM_BUDGET = 32 * 1024 * 1024;
export function validate_SBChannelData(data) {
    if (!data)
        throw new Error(`invalid SBChannelData (null or undefined)`);
    else if (data.channelId && data.channelId.length === 43
        && data.ownerPublicKey && data.ownerPublicKey.length > 0
        && (!data.storageToken || data.storageToken.length > 0)) {
        return data;
    }
    else {
        if (DBG)
            console.error('invalid SBChannelData ... trying to ingest:\n', data);
        throw new Error(`invalid SBChannelData`);
    }
}
export function validate_ChannelApiBody(body) {
    if (!body)
        throw new Error(`invalid ChannelApiBody (null or undefined)`);
    else if (body[SB_CHANNEL_API_BODY_SYMBOL])
        return body;
    else if (body.channelId && body.channelId.length === 43
        && body.path && typeof body.path === 'string' && body.path.length > 0
        && body.userId && typeof body.userId === 'string' && body.userId.length === 43
        && body.userPublicKey && body.userPublicKey.length > 0
        && (!body.isOwner || typeof body.isOwner === 'boolean')
        && (!body.apiPayload || body.apiPayload instanceof ArrayBuffer)
        && body.timestamp && typeof body.timestamp === 'number'
        && body.sign && body.sign instanceof ArrayBuffer) {
        return { ...body, [SB_CHANNEL_API_BODY_SYMBOL]: true };
    }
    else {
        if (DBG)
            console.error('invalid ChannelApiBody ... trying to ingest:\n', body);
        throw new Error(`invalid ChannelApiBody`);
    }
}
export function validate_ChannelMessage(body) {
    if (!body)
        throw new Error(`invalid ChannelMessage (null or undefined)`);
    else if (body[SB_CHANNEL_MESSAGE_SYMBOL])
        return body;
    else if ((!body._id || typeof body._id === 'string' && body._id.length === 86)
        && (!body.ready || typeof body.ready === 'boolean')
        && (!body.tx || typeof body.tx === 'string' && body.tx.length === 26)
        && (!body.i || typeof body.i === 'string' && body.i.length === 43)
        && (!body.c || body.c instanceof ArrayBuffer)
        && (!body.f || typeof body.f === 'string' && body.f.length === 43)
        && (!body.ec || body.ec instanceof ArrayBuffer)
        && (!body.ts || typeof body.ts === 'number')
        && (!body.ttl || typeof body.ttl === 'number')
        && (!body.iv || body.iv instanceof ArrayBuffer)
        && (!body.s || body.s instanceof ArrayBuffer)) {
        return { ...body, [SB_CHANNEL_MESSAGE_SYMBOL]: true };
    }
    else {
        if (DBG)
            console.error('invalid ChannelMessage ... trying to ingest:\n', body);
        throw new Error(`invalid ChannelMessage`);
    }
}
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
            fetch(input, init ?? { method: 'GET', headers: { 'Content-Type': 'application/json' } })
                .then((response) => {
                resolve(response);
            }).catch((error) => { throw error; });
        }
        catch (e) {
            const msg = `[SBFetch] Error (fetch exception, might be normal operation): ${e}`;
            console.warn(msg);
            reject(msg);
        }
    });
}
function SBApiFetch(input, init) {
    return new Promise((resolve, reject) => {
        SBFetch(input, init)
            .then(async (response) => {
            var retValue;
            if (!response || !response.ok)
                reject("[SBApiFetch] Network response was not 'ok' (fatal)");
            const contentType = response.headers.get('content-type');
            if (!contentType) {
                reject("[SBApiFetch] Server response missing content-type header (?)");
                return;
            }
            if (contentType && contentType.indexOf("application/json") !== -1) {
                retValue = jsonParseWrapper(await response.json(), "L489");
            }
            else if (contentType.indexOf("application/octet-stream") !== -1) {
                retValue = extractPayload(await response.arrayBuffer()).payload;
            }
            else {
                reject("SBApiFetch] Server responded with unknown content-type header (?)");
                return;
            }
            if (!retValue || retValue.error || (retValue.success && !retValue.success)) {
                let apiErrorMsg = '[SBApiFetch] Network or Server error or cannot parse response';
                if (response.status)
                    apiErrorMsg += ' [' + response.status + ']';
                if (retValue?.error)
                    apiErrorMsg += ': ' + retValue.error;
                if (DBG)
                    console.error("[SBApiFetch] error:\n", apiErrorMsg);
                reject(new Error(apiErrorMsg));
            }
            else {
                if (DBG)
                    console.log("ChannelApi.#callApi: success\n", retValue);
                resolve(retValue);
            }
        }).catch((error) => {
            reject(error);
        });
    });
}
function WrapError(e) {
    const pre = ' ***ERRORMSGSTART*** ', post = ' ***ERRORMSGEND*** ';
    if (e instanceof Error) {
        if (DBG)
            console.error('[WrapError] Error: \n', e);
        return new Error(pre + e.message + post);
    }
    else
        return new Error(pre + String(e) + post);
}
function _sb_exception(loc, msg) {
    const m = '[_sb_exception] << SB lib error (' + loc + ': ' + msg + ') >>';
    throw new Error(m);
}
function _sb_assert(val, msg) {
    if (!(val)) {
        const m = ` <<<<[_sb_assert] assertion failed: '${msg}'>>>> `;
        if (DBG)
            console.trace(m);
        throw new Error(m);
    }
}
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
        const metadata = jsonParseWrapper(json, "L1290");
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
        _sb_assert(privateKey && publicKey, "Either private or public key is null or undefined (L1836)");
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
    async encrypt(data, key, params) {
        if (data === null)
            throw new Error('no contents');
        if (!params.iv)
            throw new Error('no nonce');
        if (!params.name)
            params.name = 'AES-GCM';
        else
            _sb_assert(params.name === 'AES-GCM', "Must be AES-GCM (L1951)");
        return crypto.subtle.encrypt(params, key, data);
    }
    async wrap(body, sender, encryptionKey, signingKey) {
        _sb_assert(body && sender && encryptionKey && signingKey, "wrapMessage(): missing required parameter(2)");
        const payload = assemblePayload(body);
        _sb_assert(payload, "wrapMessage(): failed to assemble payload");
        _sb_assert(payload.byteLength < MAX_SB_BODY_SIZE, `wrapMessage(): body must be smaller than ${MAX_SB_BODY_SIZE / 1024} KiB (we got ${payload.byteLength / 1024} KiB)})`);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const timestamp = Math.round(Date.now() / 25) * 25;
        const view = new DataView(new ArrayBuffer(8));
        view.setFloat64(0, timestamp);
        const message = {
            c: payload,
            ec: await sbCrypto.encrypt(payload, encryptionKey, { iv: iv, additionalData: view }),
            iv: iv,
            f: sender,
            s: await sbCrypto.sign(signingKey, payload),
            ts: timestamp,
        };
        return message;
    }
    unwrap(k, o) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!o.ts)
                    throw new Error(`unwrap() - no timestamp in encrypted message`);
                const { ec: t, iv: iv } = o;
                _sb_assert(t, "no contents in encrypted message");
                const view = new DataView(new ArrayBuffer(8));
                view.setFloat64(0, o.ts);
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
    sign(signKey, contents) {
        return crypto.subtle.sign({ name: "ECDSA", hash: { name: "SHA-384" }, }, signKey, contents);
    }
    verify(verifyKey, sign, contents) {
        return crypto.subtle.verify({ name: "ECDSA", hash: { name: "SHA-384" }, }, verifyKey, sign, contents);
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
const SB_CLASS_ARRAY = ['SBMessage', 'SBObjectHandle', 'SBChannelHandle', 'ChannelApiBody'];
const SB_CHANNEL_MESSAGE_SYMBOL = Symbol('SB_CHANNEL_MESSAGE_SYMBOL');
const SB_CHANNEL_API_BODY_SYMBOL = Symbol('SB_CHANNEL_API_BODY_SYMBOL');
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
class SB384 {
    sb384Ready;
    static ReadyFlag = Symbol('SB384ReadyFlag');
    #private;
    #x;
    #y;
    #d;
    #privateUserKey;
    #publicUserKey;
    #signKey;
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
                if (this.#private) {
                    const newJwk = { ...this.jwkPrivate, key_ops: ['sign'] };
                    if (DBG)
                        console.log('starting jwk (private):\n', newJwk);
                    this.#signKey = await crypto.subtle.importKey("jwk", newJwk, {
                        name: "ECDSA",
                        namedCurve: "P-384",
                    }, true, ['sign']);
                }
                else {
                    const newJwk = { ...this.jwkPublic, key_ops: ['verify'] };
                    if (DBG)
                        console.log('starting jwk (public):\n', newJwk);
                    this.#signKey = await crypto.subtle.importKey("jwk", newJwk, {
                        name: "ECDSA",
                        namedCurve: "P-384",
                    }, true, ['verify']);
                }
                const channelBytes = _appendBuffer(base64ToArrayBuffer(this.#x), base64ToArrayBuffer(this.#y));
                this.#hash = arrayBufferToBase62(await crypto.subtle.digest('SHA-256', channelBytes));
                if (DBG2)
                    console.log("SB384() constructor; hash:\n", this.#hash);
                if (DBG)
                    console.log("SB384() - constructor wrapping up", this);
                this[SB384.ReadyFlag] = true;
                resolve(this);
            }
            catch (e) {
                reject('ERROR creating SB384 object failed: ' + WrapError(e));
            }
        });
    }
    get SB384ReadyFlag() { return this[SB384.ReadyFlag]; }
    get ready() { return this.sb384Ready; }
    get private() { return this.#private; }
    get hash() { return this.#hash; }
    get userId() { return this.hash; }
    get ownerChannelId() {
        return this.hash;
    }
    get privateKey() {
        if (!this.private)
            throw new Error(`this is a public key, there is no 'privateKey' value`);
        return this.#privateUserKey;
    }
    get signKey() { return this.#signKey; }
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
], SB384.prototype, "signKey", null);
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
    static ReadyFlag = Symbol('SBChannelKeysReadyFlag');
    #channelData;
    channelServer;
    constructor(handle) {
        if (handle) {
            super(handle.userPrivateKey, true);
            if (handle.channelServer) {
                this.channelServer = handle.channelServer;
                if (this.channelServer[this.channelServer.length - 1] === '/')
                    this.channelServer = this.channelServer.slice(0, -1);
            }
            this.#channelId = handle.channelId;
        }
        else {
            super();
        }
        this[SBChannelKeys.ReadyFlag] = false;
        this.sbChannelKeysReady = new Promise(async (resolve, reject) => {
            if (DBG)
                console.log("SBChannelKeys() constructor.");
            await this.sb384Ready;
            try {
                if (handle) {
                    if (handle.channelData) {
                        this.#channelData = handle.channelData;
                    }
                    else {
                        _sb_assert(this.channelServer, "SBChannelKeys() constructor: need either channelKeys or channelServer");
                        if (DBG)
                            console.log("++++ SBChannelKeys being initialized from server");
                        var cpk = await SBApiFetch(this.channelServer + '/api/v2/channel/' + this.#channelId + '/getChannelKeys', { method: 'GET', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: this.userId }) });
                        cpk = validate_SBChannelData(cpk);
                        _sb_assert(cpk.channelId === this.#channelId && cpk.ownerPublicKey, "SBChannelKeys(): failed to get channel keys (invalid or incomplete response)");
                        this.#channelData = cpk;
                    }
                }
                else {
                    this.#channelId = this.ownerChannelId;
                    this.#channelData = {
                        channelId: this.#channelId,
                        ownerPublicKey: this.userPublicKey,
                    };
                }
                _sb_assert(this.SB384ReadyFlag, "SBChannelKeys(): parent SB384 object is not ready (?)");
                this[SBChannelKeys.ReadyFlag] = true;
                resolve(this);
            }
            catch (e) {
                reject('[SBChannelKeys] constructor failed. ' + WrapError(e));
            }
        });
    }
    get ready() { return this.sbChannelKeysReady; }
    get SBChannelKeysReadyFlag() { return this[SBChannelKeys.ReadyFlag]; }
    get channelData() { return this.#channelData; }
    get owner() { return this.private && this.ownerChannelId && this.channelId && this.ownerChannelId === this.channelId; }
    get channelId() { return this.#channelId; }
    get handle() {
        return {
            [SB_CHANNEL_HANDLE_SYMBOL]: true,
            channelId: this.channelId,
            userPrivateKey: this.userPrivateKey,
            channelServer: this.channelServer,
            channelData: this.channelData
        };
    }
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
], SBChannelKeys.prototype, "handle", null);
const MAX_SB_BODY_SIZE = 64 * 1024 * 1.5;
class SBMessage {
    channel;
    [SB_MESSAGE_SYMBOL] = true;
    ready;
    message;
    #encryptionKey;
    constructor(channel, contents, ttl) {
        this.channel = channel;
        this.ready = new Promise(async (resolve) => {
            await channel.channelReady;
            this.#encryptionKey = await this.channel.protocol.key();
            this.message = await sbCrypto.wrap(contents, this.channel.userId, this.#encryptionKey, this.channel.privateKey);
            this.message.ttl = ttl ? ttl : 0xF;
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
export class BasicProtocol {
    #key;
    #channel;
    constructor(channel) {
        this.#channel = channel;
        this.#key = window.crypto.subtle.generateKey({
            name: "AES-GCM",
            length: 256,
        }, true, ["encrypt", "decrypt"]);
        this.#key.then((k) => {
            console.log("[BasicProtocol] generated random key for this session:\n", k);
        });
    }
    key() {
        return this.#key;
    }
    get channel() { return this.#channel; }
}
class Channel extends SBChannelKeys {
    channelReady;
    static ReadyFlag = Symbol('ChannelReadyFlag');
    locked = false;
    adminData;
    verifiedGuest = false;
    #cursor = '';
    #protocol;
    constructor(handle, protocol) {
        super(handle);
        this.#protocol = protocol ? protocol : new BasicProtocol(this);
        this.channelReady =
            this.sbChannelKeysReady
                .then(() => {
                this[Channel.ReadyFlag] = true;
                return this;
            })
                .catch(e => { throw e; });
    }
    get ready() { return this.channelReady; }
    get ChannelReadyFlag() { return this[Channel.ReadyFlag]; }
    get protocol() { return this.#protocol; }
    get api() { return this; }
    #callApi(path, apiPayload) {
        _sb_assert(this.channelServer, "[ChannelApi.#callApi] channelServer is unknown");
        if (DBG)
            console.log("ChannelApi.#callApi: calling fetch with path:", path, "body:", apiPayload);
        _sb_assert(this.channelId && path, "Internal Error (L2864)");
        return new Promise(async (resolve, reject) => {
            await this.channelReady;
            const timestamp = Math.round(Date.now() / 25) * 25;
            const viewBuf = new ArrayBuffer(8);
            const view = new DataView(viewBuf);
            view.setFloat64(0, timestamp);
            const pathAsArrayBuffer = new TextEncoder().encode(path).buffer;
            const prefixBuf = _appendBuffer(viewBuf, pathAsArrayBuffer);
            const apiPayloadBuf = apiPayload ? assemblePayload(apiPayload) : undefined;
            const sign = await sbCrypto.sign(this.signKey, apiPayloadBuf ? _appendBuffer(prefixBuf, apiPayloadBuf) : prefixBuf);
            const apiBody = {
                channelId: this.channelId,
                path: path,
                userId: this.userId,
                userPublicKey: this.userPublicKey,
                apiPayload: apiPayloadBuf,
                timestamp: timestamp,
                sign: sign
            };
            const init = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream"',
                },
                body: assemblePayload(validate_ChannelApiBody(apiBody))
            };
            if (DBG)
                console.log("==== ChannelApi.#callApi: calling fetch with init:\n", init);
            SBApiFetch(this.channelServer + '/api/v2/channel/' + this.channelId + path, init)
                .then((ret) => { resolve(ret); })
                .catch((e) => { reject("[Channel.#callApi] Error: " + WrapError(e)); });
        });
    }
    create(storageToken, channelServer) {
        _sb_assert(storageToken !== null, '[Channel.create] Missing storage token');
        _sb_assert(channelServer || this.channelServer, '[Channel.create] Missing channel server');
        channelServer = channelServer ? channelServer : this.channelServer;
        return new Promise(async (resolve, reject) => {
            await this.channelReady;
            this.channelData.storageToken = storageToken;
            if (DBG)
                console.log("Will try to create channel with channelData:", this.channelData);
            this.#callApi('/create', this.channelData)
                .then(() => {
                this.channelServer = channelServer;
                _sb_assert(this.channelData && this.channelData.channelId && this.userPrivateKey, 'Internal Error [L2546]');
                resolve({
                    [SB_CHANNEL_HANDLE_SYMBOL]: true,
                    channelId: this.channelData.channelId,
                    userPrivateKey: this.userPrivateKey,
                    channelServer: this.channelServer,
                    channelData: this.channelData
                });
            }).catch((e) => { reject("Channel.create() failed: " + WrapError(e)); });
        });
    }
    async deCryptChannelMessage(m00, m01) {
        if (DBG)
            console.log("Asked to decrypt:", m00, m01);
        return undefined;
    }
    getLastMessageTimes() {
        throw new Error("Channel.getLastMessageTimes(): not supported in 2.0 yet");
    }
    getOldMessages(currentMessagesLength = 100, paginate = false) {
        return new Promise(async (resolve, reject) => {
            _sb_assert(this.channelId, "Channel.getOldMessages: no channel ID (?)");
            let cursorOption = paginate ? '&cursor=' + this.#cursor : '';
            const messages = await this.#callApi('/oldMessages?currentMessagesLength=' + currentMessagesLength + cursorOption);
            _sb_assert(messages, "Channel.getOldMessages: no messages (empty/null response)");
            if (DBG)
                console.log("getOldMessages\n", messages);
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
    storageRequest(byteLength) {
        return this.#callApi('/storageRequest?size=' + byteLength);
    }
    lock() {
        return this.#callApi('/lockChannel');
    }
    acceptVisitor(userId) {
        return this.#callApi('/acceptVisitor', { userId: userId });
    }
    async getStorageToken(size) {
        const storageTokenReq = await this.#callApi(`/storageRequest?size=${size}`);
        _sb_assert(!storageTokenReq.hasOwnProperty('error'), `storage token request error (${storageTokenReq.error})`);
        if (DBG)
            console.log("getStorageToken():", storageTokenReq);
        return storageTokenReq;
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
], Channel.prototype, "protocol", null);
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
    Ready
], Channel.prototype, "storageRequest", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "lock", null);
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
    static ReadyFlag = Symbol('ChannelSocketReadyFlag');
    #ws;
    #socketServer;
    #onMessage = this.#noMessageHandler;
    #ack = new Map();
    #traceSocket = false;
    constructor(handle, onMessage) {
        _sb_assert(onMessage, 'ChannelSocket(): no onMessage handler provided');
        if (!handle.hasOwnProperty('channelId') || !handle.hasOwnProperty('userPrivateKey'))
            throw new Error("ChannelSocket(): first argument must be valid SBChannelHandle");
        if (!handle.channelServer)
            throw new Error("ChannelSocket(): no channel server provided (required)");
        super(handle);
        this[_a.ReadyFlag] = false;
        this.#socketServer = handle.channelServer.replace(/^http/, 'ws');
        this.#onMessage = onMessage;
        const url = this.#socketServer + '/api/v2/channel/' + handle.channelId + '/websocket';
        this.#ws = {
            url: url,
            ready: false,
            closed: false,
            timeout: 2000
        };
        this.channelSocketReady = this.#channelSocketReadyFactory();
    }
    #noMessageHandler(_m) { _sb_assert(false, "NO MESSAGE HANDLER"); }
    async #processMessage(msg) {
        if (DBG)
            console.log("Received socket message:", msg);
    }
    #channelSocketReadyFactory() {
        return new Promise(async (resolve, reject) => {
            if (DBG)
                console.log("++++ STARTED ChannelSocket.readyPromise()");
            const url = this.#ws.url;
            if (!this.#ws.websocket || this.#ws.websocket.readyState === 3 || this.#ws.websocket.readyState === 2)
                this.#ws.websocket = new WebSocket(url);
            this.#ws.websocket.addEventListener('message', this.#processMessage);
            this.#ws.websocket.addEventListener('open', async () => {
                this.#ws.closed = false;
                await this.ready;
                if (DBG)
                    console.log("++++++++ readyPromise() sending init");
                this.#ws.websocket.send(JSON.stringify({ ready: true }));
            });
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
                if (!this[_a.ReadyFlag]) {
                    const msg = "ChannelSocket() - this socket is not resolving (waited 10s) ...";
                    console.warn(msg);
                    reject(msg);
                }
                else {
                    if (DBG)
                        console.log("ChannelSocket() - this socket resolved", this);
                }
            }, 10000);
            this[_a.ReadyFlag] = true;
            resolve(this);
        });
    }
    get ready() { return this.channelSocketReady; }
    get ChannelSocketReadyFlag() { return this[_a.ReadyFlag]; }
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
            this[_a.ReadyFlag] = false;
        }
        return new Promise(async (resolve, reject) => {
            await message.ready;
            await this.ready;
            if (!this.ChannelSocketReadyFlag)
                reject("ChannelSocket.send() is confused - ready or not?");
            switch (this.#ws.websocket.readyState) {
                case 1:
                    if (this.#traceSocket)
                        console.log("++++++++ ChannelSocket.send() will send message:", Object.assign({}, message));
                    const messagePayload = assemblePayload(message);
                    _sb_assert(messagePayload, "ChannelSocket.send(): failed to assemble message");
                    const hash = await crypto.subtle.digest('SHA-256', messagePayload);
                    const messageHash = arrayBufferToBase64(hash);
                    if (this.#traceSocket) {
                        console.log("++++++++ ChannelSocket.send():Which has hash:");
                        console.log(messageHash);
                    }
                    this.#ack.set(messageHash, resolve);
                    this.#ws.websocket.send(messagePayload);
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
                    break;
                case 3:
                case 0:
                case 2:
                    const errMsg = 'socket not OPEN - either CLOSED or in the state of CONNECTING/CLOSING';
                    reject(errMsg);
            }
        });
    }
}
_a = ChannelSocket;
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
    constructor(storageServer) {
        _sb_assert(typeof storageServer === 'string', 'StorageApi() constructor requires a string (for storageServer)');
        this.storageServer = storageServer;
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
                const par = extractPayload(b).payload;
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
                const data = await sbCrypto.encrypt(image, key, { iv: iv });
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
                const data = extractPayload(payload).payload;
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
                    sbCrypto.unwrap(image_key, { c: encrypted_image, iv: iv }).then((padded_img) => {
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
        _sb_assert(typeof channelServer === 'string', '[Snackabra] Invalid parameter type for constructor');
        if (setDBG && setDBG === true)
            DBG = true;
        if (DBG && setDBG2 && setDBG2 === true)
            DBG2 = true;
        if (DBG)
            console.warn("++++ Snackabra constructor: setting DBG to TRUE ++++");
        if (DBG2)
            console.warn("++++ Snackabra constructor: ALSO setting DBG2 to TRUE (verbose) ++++");
        this.channelServer = channelServer;
        this.storageServer = "TODO";
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
    create(budgetChannelOrToken) {
        _sb_assert(budgetChannelOrToken !== null, '[create channel] Invalid parameter (null)');
        return new Promise(async (resolve, reject) => {
            try {
                let _storageToken;
                if (typeof budgetChannelOrToken === 'string') {
                    _storageToken = budgetChannelOrToken;
                }
                else if (budgetChannelOrToken instanceof Channel) {
                    const budget = budgetChannelOrToken;
                    await budget.ready;
                    _storageToken = await budget.getStorageToken(NEW_CHANNEL_MINIMUM_BUDGET);
                }
                else {
                    reject('Invalid parameter to create() - need a token or a budget channel');
                }
                _sb_assert(_storageToken, '[create channel] Failed to get storage token for the provided channel');
                const channelKeys = await new Channel().ready;
                channelKeys.channelServer = this.channelServer;
                channelKeys.create(_storageToken)
                    .then((handle) => { resolve(handle); })
                    .catch((e) => { reject(e); });
            }
            catch (e) {
                const msg = `Creating channel did not succeed: ${e}`;
                console.error(msg);
                reject(msg);
            }
        });
    }
    connect(handle, onMessage) {
        _sb_assert(handle && handle.channelId && handle.userPrivateKey, '[connect] Invalid parameter (missing info)');
        if (handle.channelServer && handle.channelServer !== this.channelServer)
            throw new Error('SBChannelHandle channelId does not match channelServer (use a different Snackabra object)');
        const newChannelHandle = { ...handle, ...{ [SB_CHANNEL_HANDLE_SYMBOL]: true, channelServer: this.channelServer } };
        if (DBG)
            console.log("++++ Snackabra.connect() ++++", newChannelHandle);
        if (onMessage)
            return new ChannelSocket(newChannelHandle, (m) => { console.log("MESSAGE (not caught):", m); });
        else
            return new Channel(newChannelHandle);
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