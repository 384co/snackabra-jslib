var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const version = '2.0.0-alpha.5 (build 16)';
const NEW_CHANNEL_MINIMUM_BUDGET = 32 * 1024 * 1024;
var DBG = true;
var DBG2 = false;
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
        throw new Error(m);
    }
}
export function encryptedContentsMakeBinary(o) {
    try {
        let t;
        let iv;
        if (DBG2) {
            console.log("=+=+=+=+ processing content");
            console.log(o.content.constructor.name);
        }
        if (typeof o.content === 'string') {
            try {
                t = base64ToArrayBuffer(decodeURIComponent(o.content));
            }
            catch (e) {
                throw new Error("EncryptedContents is string format but not base64 (?)");
            }
        }
        else {
            const ocn = o.content.constructor.name;
            _sb_assert((ocn === 'ArrayBuffer') || (ocn === 'Uint8Array'), 'undetermined content type in EncryptedContents object');
            t = o.content;
        }
        if (DBG2)
            console.log("=+=+=+=+ processing nonce");
        if (typeof o.iv === 'string') {
            if (DBG2) {
                console.log("got iv as string:");
                console.log(structuredClone(o.iv));
            }
            iv = base64ToArrayBuffer(decodeURIComponent(o.iv));
            if (DBG2) {
                console.log("this was turned into array:");
                console.log(structuredClone(iv));
            }
        }
        else if ((o.iv.constructor.name === 'Uint8Array') || (o.iv.constructor.name === 'ArrayBuffer')) {
            if (DBG2) {
                console.log("it's an array already");
            }
            iv = new Uint8Array(o.iv);
        }
        else {
            if (DBG2)
                console.log("probably a dictionary");
            try {
                iv = new Uint8Array(Object.values(o.iv));
            }
            catch (e) {
                if (DBG) {
                    console.error("ERROR: cannot figure out format of iv (nonce), here's the input object:");
                    console.error(o.iv);
                }
                _sb_assert(false, "undetermined iv (nonce) type, see console");
            }
        }
        if (DBG2) {
            console.log("decided on nonce as:");
            console.log(iv);
        }
        _sb_assert(iv.length == 12, `encryptedContentsMakeBinary(): nonce should be 12 bytes but is not (${iv.length})`);
        return { content: t, iv: iv };
    }
    catch (e) {
        const msg = `encryptedContentsMakeBinary() failed: ${e}`;
        if (DBG)
            console.error(msg);
        throw new Error(msg);
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
export function jsonParseWrapper(str, loc) {
    while (str && typeof str === 'string') {
        try {
            str = JSON.parse(str);
        }
        catch (e) {
            throw new Error(`JSON.parse() error${loc ? ` at ${loc}` : ''}: ${e}\nString (possibly nested) was: ${str}`);
        }
    }
    return str;
}
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
export function assemblePayload(data) {
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
export function extractPayload(payload) {
    try {
        const metadataSize = new Uint32Array(payload.slice(0, 4))[0];
        const decoder = new TextDecoder();
        const _metadata = jsonParseWrapper(decoder.decode(payload.slice(4, 4 + metadataSize)), 'L533');
        const startIndex = 4 + metadataSize;
        if (!_metadata.version)
            _metadata['version'] = '001';
        switch (_metadata['version']) {
            case '001': {
                return extractPayloadV1(payload);
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
export function encodeB64Url(input) {
    return input.replaceAll('+', '-').replaceAll('/', '_');
}
export function decodeB64Url(input) {
    input = input.replaceAll('-', '+').replaceAll('_', '/');
    const pad = input.length % 4;
    if (pad) {
        if (pad === 1) {
            throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding');
        }
        input += new Array(5 - pad).join('=');
    }
    return input;
}
var KeyPrefix;
(function (KeyPrefix) {
    KeyPrefix["SBPublicKey"] = "PNk2";
    KeyPrefix["SBAES256Key"] = "X881";
    KeyPrefix["SBPrivateKey"] = "Xj3p";
})(KeyPrefix || (KeyPrefix = {}));
export function isSBKey(key) {
    return key && Object.values(KeyPrefix).includes(key.prefix);
}
class SBCrypto {
    #knownKeys = new Map();
    SBKeyToJWK(key) {
        if (!isSBKey(key))
            return key;
        switch (key.prefix) {
            case KeyPrefix.SBPublicKey: {
                return {
                    crv: "P-384",
                    ext: true,
                    key_ops: [],
                    kty: "EC",
                    x: key.x,
                    y: key.y
                };
            }
            case KeyPrefix.SBPrivateKey: {
                return {
                    crv: "P-384",
                    d: key.d,
                    ext: true,
                    key_ops: ["deriveKey"],
                    kty: "EC",
                    x: key.x,
                    y: key.y
                };
            }
            case KeyPrefix.SBAES256Key: {
                return {
                    k: key.k,
                    alg: "A256GCM",
                    key_ops: ["encrypt", "decrypt"],
                    kty: "oct"
                };
            }
            default: {
                throw new Error(`SBKeyToJWK() - unknown key prefix: ${key.prefix}`);
            }
        }
    }
    JWKToSBKey(key, forcePublic = false) {
        if (!key)
            return undefined;
        if (key.kty === "oct" && key.alg === "A256GCM" && key.k && key.k.length === 43) {
            return {
                prefix: KeyPrefix.SBAES256Key,
                k: base64ToBase62(key.k)
            };
        }
        if (key.kty === "EC" && key.crv === "P-384" && key.x && key.y) {
            if (key.x.length !== 64 || key.y.length !== 64)
                return undefined;
            if ((key.d && key.d.length === 64) && !forcePublic) {
                return {
                    prefix: KeyPrefix.SBPrivateKey,
                    x: key.x,
                    y: key.y,
                    d: key.d
                };
            }
            return {
                prefix: KeyPrefix.SBPublicKey,
                x: key.x,
                y: key.y
            };
        }
        return undefined;
    }
    SBKeyToString(key) {
        const prefix = key.prefix;
        switch (prefix) {
            case KeyPrefix.SBAES256Key: {
                return prefix + base64ToBase62(key.k);
            }
            case KeyPrefix.SBPublicKey: {
                const publicKey = key;
                const combined = new Uint8Array(48 * 2);
                combined.set(base64ToArrayBuffer(publicKey.x), 0);
                combined.set(base64ToArrayBuffer(publicKey.y), 48);
                return prefix + arrayBufferToBase62(combined);
            }
            case KeyPrefix.SBPrivateKey: {
                const privateKey = key;
                const combined = new Uint8Array(3 * 48);
                combined.set(base64ToArrayBuffer(privateKey.x), 0);
                combined.set(base64ToArrayBuffer(privateKey.y), 48);
                combined.set(base64ToArrayBuffer(privateKey.d), 96);
                return prefix + arrayBufferToBase62(combined);
            }
            default: {
                throw new Error("Unknown SBKey type.");
            }
        }
    }
    JWKToSBUserId(key) {
        const sbKey = this.JWKToSBKey(key, true);
        return sbKey
            ? this.SBKeyToString(sbKey)
            : undefined;
    }
    StringToSBKey(input) {
        try {
            if (input.length < 4)
                return undefined;
            const prefix = input.slice(0, 4);
            const data = input.slice(4);
            switch (prefix) {
                case KeyPrefix.SBAES256Key: {
                    if (data.length !== 43)
                        return undefined;
                    const k = base62ToArrayBuffer(data);
                    return {
                        prefix: KeyPrefix.SBAES256Key,
                        k: arrayBufferToBase64(k)
                    };
                }
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
            console.error("StringToSBKey() - malformed input, exception: ", e);
            return undefined;
        }
    }
    StringToJWK(userId) {
        const key = this.StringToSBKey(userId);
        if (!key)
            return undefined;
        return this.SBKeyToJWK(key);
    }
    async addKnownKey(key) {
        try {
            if (!key)
                return;
            if (isSBKey(key))
                key = this.SBKeyToJWK(key);
            if (typeof key === 'string') {
                const hash = await sbCrypto.sb384Hash(key);
                if (!hash)
                    return;
                if (this.#knownKeys.has(hash)) {
                    if (DBG)
                        console.log(`addKnownKey() - key already known: ${hash}, skipping upgrade check`);
                }
                else {
                    const newInfo = {
                        hash: hash,
                        jwk: key,
                        key: await sbCrypto.importKey('jwk', key, 'ECDH', true, ['deriveKey'])
                    };
                    this.#knownKeys.set(hash, newInfo);
                }
            }
            else if (key instanceof SB384) {
                await key.ready;
                const hash = key.hash;
                const newInfo = {
                    hash: hash,
                    jwk: key.jwk,
                    key: key.key
                };
                this.#knownKeys.set(hash, newInfo);
            }
            else if (key instanceof CryptoKey) {
                const hash = await this.sb384Hash(key);
                if (!hash)
                    return;
                if (!this.#knownKeys.has(hash)) {
                    const newInfo = {
                        hash: hash,
                        jwk: await sbCrypto.exportKey('jwk', key),
                        key: key,
                    };
                    this.#knownKeys.set(hash, newInfo);
                }
            }
            else {
                throw new Error("addKnownKey() - invalid key type (must be string or SB384-derived)");
            }
        }
        catch (e) {
            console.error("**** addKnownKey() - key / exception:", key, e);
            throw e;
        }
    }
    lookupKeyGlobal(hash) {
        return this.#knownKeys.get(hash);
    }
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
    async #generateHash(rawBytes) {
        try {
            const MAX_REHASH_ITERATIONS = 160;
            let count = 0;
            let hash = arrayBufferToBase64(rawBytes);
            while (!b62regex.test(hash)) {
                if (count++ > MAX_REHASH_ITERATIONS)
                    throw new Error(`generateChannelHash() - exceeded ${MAX_REHASH_ITERATIONS} iterations:`);
                rawBytes = await crypto.subtle.digest('SHA-384', rawBytes);
                hash = arrayBufferToBase64(rawBytes);
            }
            return arrayBufferToBase64(rawBytes);
        }
        catch (e) {
            console.error("sb384Hash() failed", e);
            console.error("tried working from channelBytes:");
            console.error(rawBytes);
            throw new Error(`sb384Hash() exception (${e})`);
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
    async sb384Hash(key) {
        if (key instanceof CryptoKey)
            key = await this.exportKey('jwk', key)
                .catch(() => {
                return undefined;
            });
        if (!key)
            return undefined;
        if (key && key.x && key.y) {
            const xBytes = base64ToArrayBuffer(decodeB64Url(key.x));
            const yBytes = base64ToArrayBuffer(decodeB64Url(key.y));
            const channelBytes = _appendBuffer(xBytes, yBytes);
            return await this.#generateHash(channelBytes);
        }
        else {
            if (DBG) {
                console.error(`[sb384Hash] invalid JsonWebKey (missing x and/or y)`, key);
            }
            return undefined;
        }
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
                if (jsonKey.kty === 'EC')
                    this.addKnownKey(importedKey);
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
                const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data);
                if (returnType === 'encryptedContents') {
                    resolve({
                        content: arrayBufferToBase64(encrypted),
                        iv: arrayBufferToBase64(iv)
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
    wrap(k, b, bodyType) {
        return new Promise((resolve) => {
            let a;
            if (bodyType === 'string') {
                a = sbCrypto.str2ab(b);
            }
            else {
                a = b;
            }
            sbCrypto.encrypt(a, k).then((c) => { resolve(c); });
        });
    }
    unwrap(k, o, returnType) {
        return new Promise(async (resolve, reject) => {
            try {
                const { content: t, iv: iv } = encryptedContentsMakeBinary(o);
                const d = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, k, t);
                if (returnType === 'string')
                    resolve(new TextDecoder().decode(d));
                else if (returnType === 'arrayBuffer')
                    resolve(d);
            }
            catch (e) {
                if (DBG)
                    console.error(`unwrap(): cannot unwrap/decrypt - rejecting: ${e}`);
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
                    sign = await crypto.subtle.sign('HMAC', secretKey, encoded);
                    resolve(arrayBufferToBase64(sign));
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
    verify(verifyKey, sign, contents) {
        return new Promise((resolve, reject) => {
            try {
                crypto.subtle
                    .verify('HMAC', verifyKey, base64ToArrayBuffer(sign), sbCrypto.str2ab(contents))
                    .then((verified) => { resolve(verified); });
            }
            catch (e) {
                reject(WrapError(e));
            }
        });
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
    async channelKeyStringsToCryptoKeys(keyStrings) {
        return new Promise(async (resolve, reject) => {
            let ownerKeyParsed = jsonParseWrapper(keyStrings.ownerKey, '2593');
            Promise.all([
                sbCrypto.importKey('jwk', ownerKeyParsed, 'ECDH', true, []),
                sbCrypto.importKey('jwk', jsonParseWrapper(keyStrings.encryptionKey, '2296'), 'AES', true, ['encrypt', 'decrypt']),
                sbCrypto.importKey('jwk', jsonParseWrapper(keyStrings.signKey, '2597'), 'ECDH', true, ['deriveKey']),
                sbCrypto.importKey('jwk', sbCrypto.extractPubKey(jsonParseWrapper(keyStrings.signKey, '2598')), 'ECDH', true, []),
            ])
                .then(async (v) => {
                if (DBG)
                    console.log("++++++++ readyPromise() processed first batch of keys");
                const ownerKey = v[0];
                const encryptionKey = v[1];
                const signKey = v[2];
                const publicSignKey = v[3];
                resolve({
                    ownerKey: ownerKey,
                    encryptionKey: encryptionKey,
                    signKey: signKey,
                    publicSignKey: publicSignKey
                });
            })
                .catch((e) => {
                console.error(`readyPromise(): failed to import keys: ${e}`);
                reject(e);
            });
        });
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
            const prop = `${obj}ReadyFlag`;
            if (prop in this) {
                const rf = "readyFlag";
                _sb_assert(this[rf], `${propertyKey} getter accessed but object ${obj} not 'ready' (fatal)`);
            }
            const retValue = get.call(this);
            _sb_assert(retValue != null, `${propertyKey} getter accessed in object type ${obj}, which reports 'ready' but return value is NULL (fatal)`);
            return retValue;
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
const sbCrypto = new SBCrypto();
class SB384 {
    ready;
    sb384Ready;
    #SB384ReadyFlag = false;
    #private;
    #userKey;
    #jwk;
    #hash;
    constructor(key, forcePrivate = false) {
        this.ready = new Promise(async (resolve, reject) => {
            try {
                if (!key) {
                    if (DBG2)
                        console.log("SB384() - generating new key pair");
                    const keyPair = await sbCrypto.generateKeys();
                    this.#private = true;
                    this.#userKey = keyPair.privateKey;
                    this.#jwk = await sbCrypto.exportKey('jwk', this.#userKey);
                    _sb_assert(this.#jwk, `ERROR creating SB384 object: failed to export key to jwk format`);
                }
                else if (key instanceof Object && 'kty' in key) {
                    if (key.d) {
                        this.#private = true;
                    }
                    else {
                        this.#private = false;
                        if (forcePrivate)
                            throw new Error(`ERROR creating SB384 object: key provided is not the requested private`);
                    }
                    this.#jwk = key;
                    this.#userKey = await sbCrypto
                        .importKey('jwk', this.#jwk, 'ECDH', true, ['deriveKey'])
                        .catch((e) => { throw e; });
                }
                else if (typeof key === 'string') {
                    const _sbUserKey = sbCrypto.StringToSBKey(key);
                    if (!_sbUserKey)
                        throw new Error(`ERROR creating SB384 object: failed to import SBUserId`);
                    if (_sbUserKey.prefix === KeyPrefix.SBPublicKey) {
                        this.#private = false;
                        if (forcePrivate)
                            throw new Error(`ERROR creating SB384 object: key provided is not the requested private`);
                    }
                    else if (_sbUserKey.prefix === KeyPrefix.SBPrivateKey) {
                        this.#private = true;
                    }
                    else
                        throw new Error(`ERROR creating SB384 object: invalid key (neither public nor private)`);
                    this.#jwk = sbCrypto.SBKeyToJWK(_sbUserKey);
                    if (this.#private)
                        this.#userKey = await sbCrypto.importKey('jwk', this.#jwk, 'ECDH', true, ['deriveKey']);
                    else
                        this.#userKey = await sbCrypto.importKey('jwk', this.#jwk, 'ECDH', true, []);
                }
                else {
                    throw new Error('ERROR creating SB384 object: invalid key (must be a JsonWebKey, SBUserId, or omitted)');
                }
                this.#hash = await sbCrypto.sb384Hash(this.#jwk);
                if (DBG2)
                    console.log("SB384() - constructor wrapping up", this);
                sbCrypto.addKnownKey(this);
                this.#SB384ReadyFlag = true;
                resolve(this);
            }
            catch (e) {
                reject('ERROR creating SB384 object failed: ' + WrapError(e));
            }
        });
        this.sb384Ready = this.ready;
    }
    get readyFlag() { return this.#SB384ReadyFlag; }
    get private() { return this.#private; }
    get hash() { return this.#hash; }
    get ownerChannelId() {
        if (!this.private)
            throw new Error(`ownerChannelId() - not a private key, cannot be an owner key`);
        return this.hash;
    }
    get jwk() { return this.#jwk; }
    get key() { return this.#userKey; }
    get exportable_pubKey() { return sbCrypto.extractPubKey(this.#jwk); }
    get userKeyString() {
        if (!this.private)
            throw new Error(`userKeyString() - not a private key, there is no userKeyString`);
        return sbCrypto.SBKeyToString(sbCrypto.JWKToSBKey(this.#jwk));
    }
    get userId() { return sbCrypto.SBKeyToString(sbCrypto.JWKToSBKey(this.jwk, true)); }
}
__decorate([
    Memoize
], SB384.prototype, "readyFlag", null);
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
], SB384.prototype, "ownerChannelId", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "jwk", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "key", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "exportable_pubKey", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "userKeyString", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "userId", null);
class SBChannelKeys extends SB384 {
    ready;
    sbChannelKeysReady;
    #SBChannelKeysReadyFlag = false;
    #owner = false;
    #channelKeys;
    #channelData;
    #encryptionKey;
    #channelServer;
    #channelId;
    #channelSignKey;
    constructor(source, handleOrJWK, channelKeyStrings) {
        switch (source) {
            case 'handle':
                {
                    const handle = handleOrJWK;
                    super(handle.userKeyString, true);
                    this.#channelServer = handle.channelServer;
                    if (this.#channelServer && this.#channelServer[this.#channelServer.length - 1] === '/')
                        this.#channelServer = this.#channelServer.slice(0, -1);
                    this.#channelId = handle.channelId;
                }
                break;
            case 'jwk':
                {
                    const keys = handleOrJWK;
                    super(keys, true);
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
        this.ready = new Promise(async (resolve, reject) => {
            try {
                await this.sb384Ready;
                if (source === 'jwk' || source === 'new') {
                    this.#channelId = this.hash;
                    this.#owner = true;
                }
                if (channelKeyStrings) {
                    if (DBG)
                        console.log("++++ SBChannelKeys initialized from key strings");
                    await this.#setKeys(await sbCrypto.channelKeyStringsToCryptoKeys(channelKeyStrings));
                }
                else if (this.#channelServer) {
                    if (DBG)
                        console.log("++++ SBChannelKeys initialized from channel server");
                    await SBFetch(this.#channelServer + '/api/room/' + this.#channelId + '/getChannelKeys', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                    })
                        .then((response) => {
                        if (!response.ok)
                            reject("ChannelEndpoint(): failed to get channel keys (network response not ok)");
                        return response.json();
                    })
                        .then(async (data) => {
                        if (data.error)
                            reject("ChannelEndpoint(): failed to get channel keys (error in response)");
                        await this.#setKeys(await sbCrypto.channelKeyStringsToCryptoKeys(data));
                        this.#SBChannelKeysReadyFlag = true;
                        resolve(this);
                    })
                        .catch((e) => { throw (e); });
                }
                else {
                    if (DBG)
                        console.log("++++ SBChannelKeys initialized from scratch");
                    if (this.#channelData)
                        throw new Error(`newKeys() called but channelData already exists (already initialized)`);
                    this.#owner = true;
                    const encryptionKey = await crypto.subtle.generateKey({
                        name: 'AES-GCM',
                        length: 256
                    }, true, ['encrypt', 'decrypt']);
                    this.#encryptionKey = encryptionKey;
                    const exportable_encryptionKey = await crypto.subtle.exportKey('jwk', encryptionKey);
                    const signKeyPair = await crypto.subtle.generateKey({
                        name: 'ECDH', namedCurve: 'P-384'
                    }, true, ['deriveKey']);
                    const exportable_signKey = await crypto.subtle.exportKey('jwk', signKeyPair.privateKey);
                    this.#channelData = {
                        roomId: this.hash,
                        ownerKey: JSON.stringify(this.exportable_pubKey),
                        encryptionKey: JSON.stringify(exportable_encryptionKey),
                        signKey: JSON.stringify(exportable_signKey),
                    };
                }
                this.#SBChannelKeysReadyFlag = true;
                resolve(this);
            }
            catch (e) {
                reject('ERROR creating SBChannelKeys object failed: ' + WrapError(e));
            }
        });
        this.sbChannelKeysReady = this.ready;
    }
    async #setKeys(k) {
        if (DBG2)
            console.log("[channel.#setKeys] set channelkeys to 'k':", k);
        this.#channelKeys = k;
        _sb_assert(k, "Channel.importKeys: no channel keys (?)");
        _sb_assert(this.#channelKeys.publicSignKey, "Channel.importKeys: no public sign key (?)");
        _sb_assert(this.private && this.key, "setKeys(): no private key (?)");
        this.#channelSignKey = await sbCrypto.deriveKey(this.key, this.#channelKeys.publicSignKey, 'HMAC', false, ['sign', 'verify']);
    }
    get readyFlag() { return this.#SBChannelKeysReadyFlag; }
    get encryptionKey() { return this.#encryptionKey; }
    get channelSignKey() { return this.#channelSignKey; }
    get owner() { return this.#owner; }
    get channelData() { return this.#channelData; }
    get keys() { return this.#channelKeys; }
    get channelId() { return this.#channelId; }
    get channelServer() { return this.#channelServer; }
    set channelServer(channelServer) {
        _sb_assert(!this.#channelServer, "ChannelServer already set on this SBChannelKeys object - can't change");
        this.#channelServer = channelServer;
    }
}
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "readyFlag", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "encryptionKey", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "channelSignKey", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "owner", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "channelData", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "keys", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "channelId", null);
__decorate([
    Memoize,
    Ready
], SBChannelKeys.prototype, "channelServer", null);
class SBMessage {
    channel;
    [SB_MESSAGE_SYMBOL] = true;
    ready;
    contents;
    #encryptionKey;
    #sendToPubKey;
    MAX_SB_BODY_SIZE = 64 * 1024 * 1.5;
    constructor(channel, bodyParameter = '', sendToJsonWebKey) {
        this.channel = channel;
        if (typeof bodyParameter === 'string') {
            this.contents = { encrypted: false, isVerfied: false, contents: bodyParameter, sign: '', image: '', imageMetaData: {} };
        }
        else {
            this.contents = { encrypted: false, isVerfied: false, contents: '', sign: '', image: bodyParameter.image, imageMetaData: bodyParameter.imageMetaData };
        }
        let body = this.contents;
        let bodyJson = JSON.stringify(body);
        if (sendToJsonWebKey)
            this.#sendToPubKey = sbCrypto.extractPubKey(sendToJsonWebKey);
        _sb_assert(bodyJson.length < this.MAX_SB_BODY_SIZE, `SBMessage(): body must be smaller than ${this.MAX_SB_BODY_SIZE / 1024} KiB (we got ${bodyJson.length / 1024})})`);
        this.ready = new Promise((resolve) => {
            channel.channelReady.then(async () => {
                this.contents.senderUserId = this.channel.userId;
                const signKey = this.channel.channelSignKey;
                const sign = sbCrypto.sign(signKey, body.contents);
                const image_sign = sbCrypto.sign(signKey, this.contents.image);
                const imageMetadata_sign = sbCrypto.sign(signKey, JSON.stringify(this.contents.imageMetaData));
                if (this.#sendToPubKey) {
                    this.#encryptionKey = await sbCrypto.deriveKey(this.channel.key, await sbCrypto.importKey("jwk", this.#sendToPubKey, "ECDH", true, []), "AES", false, ["encrypt", "decrypt"]);
                }
                else {
                    const lockedKey = this.channel.keys.lockedKey;
                    console.log('==== SBMessage() picking what key to use for channel (and this is channel.keys.lockedKey):', this.channel, lockedKey);
                    this.#encryptionKey = lockedKey ? lockedKey : this.channel.keys.encryptionKey;
                }
                Promise.all([sign, image_sign, imageMetadata_sign]).then((values) => {
                    this.contents.sign = values[0];
                    this.contents.image_sign = values[1];
                    this.contents.imageMetadata_sign = values[2];
                    this.contents.imgObjVersion = '2';
                    resolve(this);
                });
            });
        });
    }
    get encryptionKey() { return this.#encryptionKey; }
    get sendToPubKey() { return this.#sendToPubKey; }
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
function oldChannelConstructorInterface(sbServer, userKey, channelId) {
    const _sbKey = sbCrypto.JWKToSBKey(userKey);
    _sb_assert(_sbKey && _sbKey.prefix === KeyPrefix.SBPrivateKey, "Unable to import JWK (keys)");
    const _userKeyString = sbCrypto.SBKeyToString(_sbKey);
    _sb_assert(_userKeyString, "Unable to import JWK (keys)");
    return {
        channelId: channelId,
        userKeyString: _userKeyString,
        channelServer: sbServer.channel_server
    };
}
class Channel extends SBChannelKeys {
    ready;
    channelReady;
    #ChannelReadyFlag = false;
    motd = '';
    locked = false;
    adminData;
    verifiedGuest = false;
    #cursor = '';
    constructor(sbServerOrHandle, userKey, channelId) {
        let _handle;
        if (typeof sbServerOrHandle === 'object' && 'channelId' in sbServerOrHandle && 'userKeyString' in sbServerOrHandle) {
            _sb_assert((!userKey) && (!channelId), "If you pass a handle, you cannot pass other parameters");
            _handle = sbServerOrHandle;
        }
        else {
            console.warn("Deprecated channel constructor used, please update your code");
            _sb_assert(userKey && channelId, "If first parameter is SBServer, you must also pass both userKey and channelId");
            _handle = oldChannelConstructorInterface(sbServerOrHandle, userKey, channelId);
        }
        if (!_handle.channelServer)
            throw new Error("Channel(): no channel server provided");
        super('handle', _handle);
        this.ready =
            this.sbChannelKeysReady
                .then(() => {
                this.#ChannelReadyFlag = true;
                return this;
            })
                .catch(e => { throw e; });
        this.channelReady = this.ready;
    }
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
            const token_data = new Date().getTime().toString();
            authString = token_data + '.' + await sbCrypto.sign(this.channelSignKey, token_data);
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
            init.body = fullBody;
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
        const keys = this.keys;
        let encryptionKey = keys.lockedKey ? keys.lockedKey : keys.encryptionKey;
        if (z) {
            let m = {
                type: 'encrypted',
                channelID: z[1],
                timestampPrefix: z[2],
                _id: z[1] + z[2],
                encrypted_contents: encryptedContentsMakeBinary(m01)
            };
            let unwrapped;
            try {
                unwrapped = await sbCrypto.unwrap(encryptionKey, m.encrypted_contents, 'string');
            }
            catch (e) {
                if (encryptionKey === keys.lockedKey) {
                    try {
                        encryptionKey = keys.encryptionKey;
                        unwrapped = await sbCrypto.unwrap(encryptionKey, m.encrypted_contents, 'string');
                    }
                    catch (e) {
                        const msg = `ERROR: cannot decrypt message with either locked or unlocked key`;
                        if (DBG)
                            console.error(msg);
                        return (undefined);
                    }
                }
                else {
                    const msg = `ERROR: cannot decrypt message with either locked or unlocked key`;
                    if (DBG)
                        console.error(msg);
                    return (undefined);
                }
            }
            let m2 = { ...m, ...jsonParseWrapper(unwrapped, 'L1977') };
            if (m2.contents) {
                m2.text = m2.contents;
            }
            m2.user = {
                name: m2.sender_username ? m2.sender_username : 'Unknown',
                _id: m2.sender_pubKey
            };
            if ((m2.verificationToken) && (!m2.sender_pubKey)) {
                if (DBG)
                    console.error('ERROR: message with verification token is lacking sender identity (cannot be verified).');
                return (undefined);
            }
            const senderPubKey = await sbCrypto.importKey('jwk', m2.sender_pubKey, 'ECDH', true, []);
            const verifyKey = await sbCrypto.deriveKey(keys.signKey, senderPubKey, 'HMAC', false, ['sign', 'verify']);
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
            if (m2.whispered === true) {
                console.error("ERROR: whisper not yet implemented in SB 2.0");
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
                        this.#cursor = lastMessage._id || lastMessage.id || '';
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
    downloadData() {
        return new Promise((resolve, reject) => {
            this.#callApi('/downloadData')
                .then((data) => {
                console.log("From downloadData:");
                console.log(data);
                Promise.all(Object
                    .keys(data)
                    .filter((v) => {
                    const regex = new RegExp(this.channelId);
                    if (v.match(regex)) {
                        const message = jsonParseWrapper(data[v], "L3318");
                        if (message.hasOwnProperty('encrypted_contents')) {
                            if (DBG)
                                console.log("Received message: ", message);
                            return message;
                        }
                    }
                })
                    .map((v) => {
                    const message = jsonParseWrapper(data[v], "L3327");
                    if (DBG2)
                        console.log(v, message.encrypted_contents, this.keys);
                    return this.deCryptChannelMessage(v, message.encrypted_contents);
                }))
                    .then((unfilteredDecryptedMessageArray) => unfilteredDecryptedMessageArray.filter((v) => Boolean(v)))
                    .then((decryptedMessageArray) => {
                    let storage = {};
                    decryptedMessageArray.forEach((message) => {
                        if (!message.control && message.imageMetaData.imageId) {
                            const f_control_msg = decryptedMessageArray.find((ctrl_msg) => ctrl_msg.id && ctrl_msg.id == message.imageMetaData.imageId);
                            const p_control_msg = decryptedMessageArray.find((ctrl_msg) => ctrl_msg.id && ctrl_msg.id == message.imageMetaData.previewId);
                            storage[`${message.imageMetaData.imageId}.f`] = f_control_msg?.verificationToken;
                            storage[`${message.imageMetaData.previewId}.p`] = p_control_msg?.verificationToken;
                        }
                    });
                    resolve({ storage: storage, channel: data });
                });
            }).catch((error) => {
                reject(error);
            });
        });
    }
    uploadChannel(channelData) {
        return this.#callApi('/uploadRoom', channelData);
    }
    authorize(ownerPublicKey, serverSecret) {
        return this.#callApi('/authorizeRoom', { roomId: this.channelId, SERVER_SECRET: serverSecret, ownerKey: ownerPublicKey });
    }
    postPubKey(_exportable_pubKey) {
        throw new Error("postPubKey() deprecated");
    }
    storageRequest(byteLength) {
        return this.#callApi('/storageRequest?size=' + byteLength);
    }
    lock(key) {
        console.warn("WARNING: lock() on channel api is in the process of being updated and tested ...");
        return new Promise(async (resolve, reject) => {
            if (this.locked || this.keys.lockedKey)
                reject(new Error("lock(): channel already locked (rotating key not yet supported"));
            if (!this.owner)
                reject(new Error("lock(): only owner can lock channel"));
            const _locked_key = key ? key : await crypto.subtle.generateKey({
                name: 'AES-GCM', length: 256
            }, true, ['encrypt', 'decrypt']);
            const _exportable_locked_key = await crypto.subtle.exportKey('jwk', _locked_key);
            this.#callApi('/lockRoom')
                .then((data) => {
                if (data.locked === true) {
                    this.acceptVisitor(this.userId)
                        .then(() => {
                        if (DBG)
                            console.log("lock(): succeded with lock key:", _exportable_locked_key);
                        this.locked = true;
                        this.keys.lockedKey = _locked_key;
                        resolve({ locked: this.locked, lockedKey: _exportable_locked_key });
                    })
                        .catch((error) => { reject(new Error(`was unable to accept 'myself': ${error}`)); });
                }
                else {
                    reject(new Error(`lock(): failed to lock channel, did not receive confirmation. (data: ${data})`));
                }
            }).catch((error) => { reject(new Error(`api call to /lockRoom failed ${error}`)); });
        });
    }
    acceptVisitor(userId) {
        console.warn("WARNING: acceptVisitor() on channel api has not been tested/debugged fully ..");
        return new Promise(async (resolve, reject) => {
            const pubKey = sbCrypto.StringToJWK(userId);
            if (!pubKey)
                reject(new Error("acceptVisitor(): could not determine public key from SBUserId (should be able to)"));
            const shared_key = await sbCrypto.deriveKey(this.key, await sbCrypto.importKey('jwk', pubKey, 'ECDH', false, []), 'AES', false, ['encrypt', 'decrypt']);
            const _encrypted_locked_key = await sbCrypto.encrypt(sbCrypto.str2ab(JSON.stringify(this.keys.lockedKey)), shared_key);
            resolve(this.#callApi('/acceptVisitor', {
                userId: userId, encryptedLockedKey: JSON.stringify(_encrypted_locked_key)
            }));
        });
    }
    ownerKeyRotation() {
        throw new Error("ownerKeyRotation() replaced by new budd() approach");
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
                        userKeyString: theUser.userKeyString,
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
], Channel.prototype, "readyFlag", null);
__decorate([
    Memoize,
    Ready
], Channel.prototype, "api", null);
__decorate([
    Ready
], Channel.prototype, "updateCapacity", null);
__decorate([
    Ready
], Channel.prototype, "getCapacity", null);
__decorate([
    Ready
], Channel.prototype, "getStorageLimit", null);
__decorate([
    Ready
], Channel.prototype, "getMother", null);
__decorate([
    Ready
], Channel.prototype, "getJoinRequests", null);
__decorate([
    ExceptionReject
], Channel.prototype, "isLocked", null);
__decorate([
    Ready
], Channel.prototype, "setMOTD", null);
__decorate([
    Ready
], Channel.prototype, "getAdminData", null);
__decorate([
    Ready
], Channel.prototype, "downloadData", null);
__decorate([
    Ready
], Channel.prototype, "uploadChannel", null);
__decorate([
    Ready
], Channel.prototype, "authorize", null);
__decorate([
    Ready
], Channel.prototype, "postPubKey", null);
__decorate([
    Ready
], Channel.prototype, "storageRequest", null);
__decorate([
    Ready
], Channel.prototype, "lock", null);
__decorate([
    Ready
], Channel.prototype, "acceptVisitor", null);
__decorate([
    Ready
], Channel.prototype, "ownerKeyRotation", null);
__decorate([
    Ready
], Channel.prototype, "budd", null);
class ChannelSocket extends Channel {
    ready;
    channelSocketReady;
    #ChannelSocketReadyFlag = false;
    #ws;
    #socketServer;
    #onMessage = this.#noMessageHandler;
    #ack = new Map();
    #traceSocket = false;
    #resolveFirstMessage = () => { _sb_exception('L2461', 'this should never be called'); };
    #firstMessageEventHandlerReference = (_e) => { _sb_exception('L2462', 'this should never be called'); };
    constructor(sbServerOrHandle, onMessage, key, channelId) {
        if (typeof sbServerOrHandle !== 'object')
            throw new Error("ChannelSocket(): first argument must be SBServer or SBChannelHandle");
        _sb_assert(onMessage, 'ChannelSocket(): no onMessage handler provided');
        if (sbServerOrHandle.hasOwnProperty('channelId') && sbServerOrHandle.hasOwnProperty('userId')) {
            const handle = sbServerOrHandle;
            if (!handle.channelServer)
                throw new Error("ChannelSocket(): no channel server provided (required)");
            super(handle);
            this.#socketServer = handle.channelServer.replace(/^http/, 'ws');
        }
        else if (sbServerOrHandle.hasOwnProperty('channel_server') && sbServerOrHandle.hasOwnProperty('channel_ws') && sbServerOrHandle.hasOwnProperty('storage_server')) {
            const sbServer = sbServerOrHandle;
            _sb_assert(sbServer.channel_ws, 'ChannelSocket(): no websocket server name provided');
            if (!key)
                throw new Error("ChannelSocket(): no key provided");
            if (!channelId)
                throw new Error("ChannelSocket(): no channelId provided");
            super(sbServer, key, channelId);
            this.#socketServer = sbServer.channel_ws;
        }
        else {
            throw new Error("ChannelSocket(): first argument must be SBServer or SBChannelHandle");
        }
        this.#onMessage = onMessage;
        const url = this.#socketServer + '/api/room/' + channelId + '/websocket';
        this.#ws = {
            url: url,
            ready: false,
            closed: false,
            timeout: 2000
        };
        this.ready = this.channelSocketReady = this.#channelSocketReadyFactory();
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
        _sb_assert(message.ready, 'got roomKeys but channel reports it is not ready (?)');
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
        let message = typeof msg === 'string' ? new SBMessage(this, msg) : msg;
        _sb_assert(this.#ws.websocket, "ChannelSocket.send() called before ready");
        if (this.#ws.closed) {
            if (this.#traceSocket)
                console.info("send() triggered reset of #readyPromise() (normal)");
            this.ready = this.channelSocketReady = this.#channelSocketReadyFactory();
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
                            sbCrypto.wrap(message.encryptionKey, JSON.stringify(message.contents), 'string')
                                .then((wrappedMessage) => {
                                const m = JSON.stringify({
                                    encrypted_contents: wrappedMessage,
                                    recipient: message.sendToPubKey ? message.sendToPubKey : undefined
                                });
                                if (this.#traceSocket) {
                                    console.log("++++++++ ChannelSocket.send(): sending message:");
                                    console.log(wrappedMessage.content.slice(0, 100) + "  ...  " + wrappedMessage.content.slice(-100));
                                }
                                crypto.subtle.digest('SHA-256', new TextEncoder().encode(wrappedMessage.content))
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
    get exportable_owner_pubKey() { return this.keys.ownerKey; }
}
__decorate([
    Ready
], ChannelSocket.prototype, "onMessage", null);
__decorate([
    VerifyParameters
], ChannelSocket.prototype, "send", null);
__decorate([
    Memoize,
    Ready
], ChannelSocket.prototype, "exportable_owner_pubKey", null);
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
class StorageApi {
    storageServer;
    constructor(sbServerOrStorageServer) {
        if (typeof sbServerOrStorageServer === 'object') {
            this.storageServer = sbServerOrStorageServer.storage_server;
        }
        else if (typeof sbServerOrStorageServer === 'string') {
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
                resolve({ salt: new Uint8Array(par.salt), iv: new Uint8Array(par.iv) });
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
                const data = await sbCrypto.encrypt(image, key, iv, 'arrayBuffer');
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
                const iv = new Uint8Array(data.iv);
                const salt = new Uint8Array(data.salt);
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
                    sbCrypto.unwrap(image_key, { content: encrypted_image, iv: iv }, 'arrayBuffer').then((padded_img) => {
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
    async retrieveImage(imageMetaData, controlMessages, imageId, imageKey, imageType, imgObjVersion) {
        console.trace("retrieveImage()");
        console.log(imageMetaData);
        const id = imageId ? imageId : imageMetaData.previewId;
        const key = imageKey ? imageKey : imageMetaData.previewKey;
        const type = imageType ? imageType : 'p';
        const objVersion = imgObjVersion ? imgObjVersion : (imageMetaData.imgObjVersion ? imageMetaData.imgObjVersion : '2');
        const control_msg = controlMessages.find((ctrl_msg) => ctrl_msg.id && ctrl_msg.id == id);
        console.log(control_msg);
        if (control_msg) {
            _sb_assert(control_msg.verificationToken, "retrieveImage(): verificationToken missing (?)");
            _sb_assert(control_msg.id, "retrieveImage(): id missing (?)");
            const obj = {
                type: type,
                version: objVersion,
                id: control_msg.id,
                key: key,
                verification: new Promise((resolve, reject) => {
                    if (control_msg.verificationToken)
                        resolve(control_msg.verificationToken);
                    else
                        reject("retrieveImage(): verificationToken missing (?)");
                })
            };
            const img = await this.fetchData(obj);
            console.log(img);
            return { 'url': 'data:image/jpeg;base64,' + arrayBufferToBase64(img, 'b64') };
        }
        else {
            return { 'error': 'Failed to fetch data - missing control message for that image' };
        }
    }
}
class Snackabra {
    channelServer;
    storageServer;
    #storage;
    #version = version;
    constructor(sbServerOrChannelServer, setDBG = false, setDBG2) {
        console.warn(`==== CREATING Snackabra object generation: ${this.#version} ====`);
        if (setDBG === true)
            DBG = true;
        if (setDBG2 && (setDBG2 === true))
            (DBG2 = true) && (DBG);
        if (DBG)
            console.warn("++++ Snackabra constructor ++++ setting DBG to TRUE ++++");
        if (DBG2)
            console.warn("++++ Snackabra constructor ++++ ALSO setting DBG2 to TRUE ++++");
        if (typeof sbServerOrChannelServer === 'object') {
            const sbServer = sbServerOrChannelServer;
            _sb_assert(sbServer.channel_server && sbServer.storage_server, "Snackabra() ERROR: missing channel_server or storage_server");
            this.channelServer = sbServer.channel_server;
            this.storageServer = sbServer.storage_server;
        }
        else if (typeof sbServerOrChannelServer === 'string') {
            this.channelServer = sbServerOrChannelServer;
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
    create(sbServerOrSB384, serverSecretOrBudgetChannel, keys) {
        return new Promise(async (resolve, reject) => {
            try {
                let _budgetChannel;
                let _storageToken;
                let _serverSecret;
                let _sbChannelKeys;
                if (sbServerOrSB384 instanceof SB384) {
                    _sbChannelKeys = new SBChannelKeys('jwk', sbServerOrSB384.jwk);
                }
                else if (typeof sbServerOrSB384 === 'object') {
                    const sbServer = sbServerOrSB384;
                    if (sbServer.channel_server !== this.channelServer) {
                        const msg = `Channel server mismatch: ${sbServer.channel_server} vs ${this.channelServer}`;
                        console.error(msg);
                        reject(msg);
                        return;
                    }
                    _sbChannelKeys = keys ? new SBChannelKeys('jwk', keys) : new SBChannelKeys('new');
                }
                else {
                    const msg = `Wrong parameters to create channel: ${sbServerOrSB384}`;
                    console.error(msg);
                    reject(msg);
                    return;
                }
                _budgetChannel = (serverSecretOrBudgetChannel instanceof Channel) ? serverSecretOrBudgetChannel : undefined;
                if (serverSecretOrBudgetChannel && typeof serverSecretOrBudgetChannel === 'string')
                    _serverSecret = serverSecretOrBudgetChannel;
                await _sbChannelKeys.ready;
                if (_budgetChannel) {
                    _storageToken = await _budgetChannel.getStorageToken(NEW_CHANNEL_MINIMUM_BUDGET);
                    if (!_storageToken)
                        reject('[create channel] Failed to get storage token for the provided channel');
                }
                _sb_assert(_sbChannelKeys &&
                    _sbChannelKeys.channelData &&
                    _sbChannelKeys.channelData.roomId &&
                    _sbChannelKeys.channelData.ownerKey &&
                    _sbChannelKeys.channelData.encryptionKey &&
                    _sbChannelKeys.channelData.signKey &&
                    (_storageToken || _serverSecret), 'Unable to determine required parameters');
                const channelData = {
                    roomId: _sbChannelKeys?.channelData.roomId,
                    ownerKey: _sbChannelKeys?.channelData.ownerKey,
                    encryptionKey: _sbChannelKeys?.channelData.encryptionKey,
                    signKey: _sbChannelKeys?.channelData.signKey,
                    storageToken: _storageToken,
                    SERVER_SECRET: _serverSecret,
                };
                const data = new TextEncoder().encode(JSON.stringify(channelData));
                let resp = await SBFetch(this.channelServer + '/api/room/' + channelData.roomId + '/uploadRoom', {
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
                    channelId: channelData.roomId,
                    userKeyString: _sbChannelKeys.userKeyString,
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
            userKeyString: handle.userKeyString,
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
export { SB384, SBMessage, Channel, ChannelSocket, SBObjectHandle, Snackabra, SBCrypto, arrayBufferToBase64, sbCrypto, version, };
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