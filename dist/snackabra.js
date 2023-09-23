var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const version = '1.1.25 (pre) build 02';
var DBG = false;
var DBG2 = false;
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
    if (init)
        return fetch(input, init);
    else
        return fetch(input, { method: 'GET' });
}
function WrapError(e) {
    if (e instanceof Error)
        return e;
    else
        return new Error(String(e));
}
function _sb_exception(loc, msg) {
    const m = '<< SB lib error (' + loc + ': ' + msg + ') >>';
    throw new Error(m);
}
function _sb_assert(val, msg) {
    if (!(val)) {
        const m = `<< SB assertion error: ${msg} >>`;
        throw new Error(m);
    }
}
async function newChannelData(keys) {
    const owner384 = new SB384(keys);
    await owner384.ready;
    const exportable_pubKey = owner384.exportable_pubKey;
    const exportable_privateKey = owner384.exportable_privateKey;
    const channelId = owner384.hash;
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
    };
    return { channelData: channelData, exportable_privateKey: exportable_privateKey };
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
        _sb_assert(iv.length == 12, `unwrap(): nonce should be 12 bytes but is not (${iv.length})`);
        return { content: t, iv: iv };
    }
    catch (e) {
        console.error('encryptedContentsMakeBinary() failed:');
        console.error(e);
        console.trace();
        console.log(e.stack);
        throw e;
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
    const z = b64_regex.exec(base64);
    if (z)
        return (z[0] === base64);
    else
        return false;
}
function ensureSafe(base64) {
    const z = b64_regex.exec(base64);
    _sb_assert((z) && (z[0] === base64), 'ensureSafe() tripped: something is not URI safe');
    return base64;
}
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
        _sb_exception('L509', 'arrayBufferToBase64() -> null paramater');
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
const base62Regex = /^(a32\.)?[0-9A-Za-z]{43}$/;
export function base62ToArrayBuffer32(s) {
    if (!base62Regex.test(s))
        throw new Error(`base62ToArrayBuffer32: string must match: ${base62Regex}`);
    s = s.slice(4);
    let n = 0n;
    for (let i = 0; i < s.length; i++) {
        const digit = BigInt(base62.indexOf(s[i]));
        n = n * 62n + digit;
    }
    if (n > 2n ** 256n - 1n)
        throw new Error(`base62ToArrayBuffer32: value exceeds 256 bits.`);
    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);
    for (let i = 0; i < 8; i++) {
        const uint32 = Number(BigInt.asUintN(32, n));
        view.setUint32((8 - i - 1) * 4, uint32);
        n = n >> 32n;
    }
    return buffer;
}
export function arrayBuffer32ToBase62(buffer) {
    if (buffer.byteLength !== 32)
        throw new Error('arrayBuffer32ToBase62: buffer must be exactly 32 bytes (256 bits).');
    let result = '';
    for (let n = BigInt('0x' + Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')); n > 0n; n = n / 62n)
        result = base62[Number(n % 62n)] + result;
    return 'a32.' + result.padStart(43, '0');
}
export function base62ToBase64(s) {
    return arrayBufferToBase64(base62ToArrayBuffer32(s));
}
export function base64ToBase62(s) {
    return arrayBuffer32ToBase62(base64ToArrayBuffer(s));
}
export function isBase62Encoded(value) {
    return base62Regex.test(value);
}
function _appendBuffer(buffer1, buffer2) {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
}
export function simpleRand256() {
    return crypto.getRandomValues(new Uint8Array(1))[0];
}
const base32mi = '0123456789abcdefyhEjkLmNHpFrRTUW';
export function simpleRandomString(n, code) {
    if (code == 'base32mi') {
        const z = crypto.getRandomValues(new Uint8Array(n));
        let r = '';
        for (let i = 0; i < n; i++)
            r += base32mi[z[i] & 31];
        return r;
    }
    _sb_exception('simpleRandomString', 'code ' + code + ' not supported');
    return '';
}
export function cleanBase32mi(s) {
    return s.replace(/[OoQD]/g, '0').replace(/[lIiJ]/g, '1').replace(/[Zz]/g, '2').replace(/[A]/g, '4').replace(/[Ss]/g, '5').replace(/[G]/g, '6').replace(/[t]/g, '7').replace(/[B]/g, '8').replace(/[gq]/g, '9').replace(/[C]/g, 'c').replace(/[Y]/g, 'y').replace(/[KxX]/g, 'k').replace(/[M]/g, 'm').replace(/[n]/g, 'N').replace(/[P]/g, 'p').replace(/[uvV]/g, 'U').replace(/[w]/g, 'w');
}
export function partition(str, n) {
    throw (`partition() not tested on TS yet - (${str}, ${n})`);
}
export function jsonParseWrapper(str, loc) {
    if (str == null)
        return null;
    try {
        return JSON.parse(str);
    }
    catch (error) {
        try {
            let s2 = '';
            let s3 = '';
            let str2 = str;
            while (str2 != (s3 = s2, s2 = str2, str2 = str2?.match(/^(['"])(.*)\1$/m)?.[2]))
                return JSON.parse(`'${s3}'`);
        }
        catch {
            try {
                return JSON.parse(str.slice(1, -1));
            }
            catch {
                throw new Error(`JSON.parse() error at ${loc} (tried eval and slice)\nString was: ${str}`);
            }
        }
    }
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
class SBCrypto {
    #knownKeys = new Map();
    async addKnownKey(key) {
        if (!key)
            return;
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
                    pubKeyJson: key,
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
                pubKeyJson: key.exportable_pubKey,
                key: key.privateKey,
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
                    pubKeyJson: await sbCrypto.exportKey('jwk', key),
                    key: key,
                };
                this.#knownKeys.set(hash, newInfo);
            }
        }
        else {
            throw new Error("addKnownKey() - invalid key type (must be string or SB384-derived)");
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
                        id: arrayBufferToBase64(_id),
                        key: arrayBufferToBase64(_key)
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
            const b62regex = /^[0-9A-Za-z]+$/;
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
            throw new Error('sb384Hash() - invalid key (JsonWebKey) - missing x and/or y');
        }
    }
    async compareHashWithKey(hash, key) {
        if (!hash || !key)
            return false;
        let x = key.x;
        let y = key.y;
        if (!(x && y)) {
            try {
                const tryParse = JSON.parse(key);
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
            }
            else {
                importedKey = await crypto.subtle.importKey(format, key, keyAlgorithms[type], extractable, keyUsages);
            }
            this.addKnownKey(importedKey);
            return (importedKey);
        }
        catch (e) {
            console.error(`... importKey() error: ${e}:`);
            console.log(format);
            console.log(key);
            console.log(type);
            console.log(extractable);
            console.log(keyUsages);
            throw new Error('importKey() exception (' + e + ')');
        }
    }
    async exportKey(format, key) {
        return await crypto.subtle
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
                        content: ensureSafe(arrayBufferToBase64(encrypted)),
                        iv: ensureSafe(arrayBufferToBase64(iv))
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
                console.error(`unwrap(): unknown issue - rejecting: ${e}`);
                console.trace();
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
    lookupKey(key, array) {
        for (let i = 0; i < array.length; i++)
            if (sbCrypto.compareKeys(key, array[i]))
                return i;
        return -1;
    }
    async channelKeyStringsToCryptoKeys(keyStrings) {
        return new Promise(async (resolve, reject) => {
            let ownerKeyParsed = jsonParseWrapper(keyStrings.ownerKey, 'L1513');
            Promise.all([
                sbCrypto.importKey('jwk', ownerKeyParsed, 'ECDH', false, []),
                sbCrypto.importKey('jwk', jsonParseWrapper(keyStrings.encryptionKey, 'L2250'), 'AES', false, ['encrypt', 'decrypt']),
                sbCrypto.importKey('jwk', jsonParseWrapper(keyStrings.signKey, 'L2251'), 'ECDH', true, ['deriveKey']),
                sbCrypto.importKey('jwk', sbCrypto.extractPubKey(jsonParseWrapper(keyStrings.signKey, 'L2252')), 'ECDH', true, []),
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
                    ownerPubKeyX: ownerKeyParsed.x,
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
                _sb_assert(this[rf], `${propertyKey} getter accessed but object ${obj} not ready (fatal)`);
            }
            const retValue = get.call(this);
            _sb_assert(retValue != null, `${propertyKey} getter accessed in object type ${obj} but returns NULL (fatal)`);
            return retValue;
        };
    }
}
const SB_CLASS_ARRAY = ['SBMessage', 'SBObjectHandle'];
const SB_MESSAGE_SYMBOL = Symbol.for('SBMessage');
const SB_OBJECT_HANDLE_SYMBOL = Symbol.for('SBObjectHandle');
function isSBClass(s) {
    return typeof s === 'string' && SB_CLASS_ARRAY.includes(s);
}
function SBValidateObject(obj, type) {
    switch (type) {
        case 'SBMessage': return SB_MESSAGE_SYMBOL in obj;
        case 'SBObjectHandle': return SB_OBJECT_HANDLE_SYMBOL in obj;
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
const sbCrypto = new SBCrypto();
const SBKnownServers = [
    {
        channel_server: 'https://channel.384co.workers.dev',
        channel_ws: 'wss://channel.384co.workers.dev',
        storage_server: 'https://storage.384co.workers.dev',
        shard_server: 'https://shard.3.8.4.land'
    },
    {
        channel_server: 'https://r.384co.workers.dev',
        channel_ws: 'wss://r.384co.workers.dev',
        storage_server: 'https://s.384co.workers.dev'
    },
];
class SB384 {
    ready;
    sb384Ready;
    #SB384ReadyFlag = false;
    #exportable_pubKey;
    #exportable_privateKey;
    #privateKey;
    #hash;
    constructor(key) {
        this.ready = new Promise(async (resolve, reject) => {
            try {
                if (key) {
                    if (!key.d) {
                        const msg = 'ERROR creating SB384 object: invalid key (must be a PRIVATE key)';
                        console.error(msg);
                        reject(msg);
                    }
                    this.#exportable_privateKey = key;
                    const pk = sbCrypto.extractPubKey(key);
                    _sb_assert(pk, 'unable to extract public key');
                    this.#exportable_pubKey = pk;
                    this.#privateKey = await sbCrypto.importKey('jwk', key, 'ECDH', true, ['deriveKey']);
                }
                else {
                    const keyPair = await sbCrypto.generateKeys();
                    this.#privateKey = keyPair.privateKey;
                    this.#exportable_pubKey = await sbCrypto.exportKey('jwk', keyPair.publicKey);
                    this.#exportable_privateKey = await sbCrypto.exportKey('jwk', keyPair.privateKey);
                }
                this.#hash = await sbCrypto.sb384Hash(this.#exportable_pubKey);
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
    get exportable_pubKey() { return this.#exportable_pubKey; }
    get exportable_privateKey() { return this.#exportable_privateKey; }
    get privateKey() { return this.#privateKey; }
    get ownerChannelId() { return this.hash; }
    get hash() { return this.#hash; }
    get _id() { return JSON.stringify(this.exportable_pubKey); }
}
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
], SB384.prototype, "ownerChannelId", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "hash", null);
__decorate([
    Memoize,
    Ready
], SB384.prototype, "_id", null);
class SBMessage {
    ready;
    channel;
    contents;
    #encryptionKey;
    #sendToPubKey;
    [SB_MESSAGE_SYMBOL] = true;
    MAX_SB_BODY_SIZE = 64 * 1024 * 1.5;
    constructor(channel, bodyParameter = '', sendToJsonWebKey) {
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
        this.channel = channel;
        this.ready = new Promise((resolve) => {
            channel.channelReady.then(async () => {
                this.contents.sender_pubKey = this.channel.exportable_pubKey;
                if (channel.userName)
                    this.contents.sender_username = channel.userName;
                const signKey = this.channel.channelSignKey;
                const sign = sbCrypto.sign(signKey, body.contents);
                const image_sign = sbCrypto.sign(signKey, this.contents.image);
                const imageMetadata_sign = sbCrypto.sign(signKey, JSON.stringify(this.contents.imageMetaData));
                if (this.#sendToPubKey) {
                    this.#encryptionKey = await sbCrypto.deriveKey(this.channel.privateKey, await sbCrypto.importKey("jwk", this.#sendToPubKey, "ECDH", true, []), "AES", false, ["encrypt", "decrypt"]);
                }
                else {
                    this.#encryptionKey = this.channel.keys.encryptionKey;
                }
                Promise.all([sign, image_sign, imageMetadata_sign]).then((values) => {
                    this.contents.sign = values[0];
                    this.contents.image_sign = values[1];
                    this.contents.imageMetadata_sign = values[2];
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
class Channel extends SB384 {
    channelReady;
    #ChannelReadyFlag = false;
    #sbServer;
    motd = '';
    locked = false;
    owner = false;
    admin = false;
    adminData;
    verifiedGuest = false;
    userName = '';
    #channelKeys;
    #channelSignKey;
    #channelId;
    #cursor = '';
    #channelApi = '';
    #channelServer = '';
    constructor(sbServer, key, channelId) {
        console.log("CONSTRUCTOR new channel");
        _sb_assert(channelId, "Channel(): as of jslib 1.1.x the channelId must be provided");
        super(key);
        this.#sbServer = sbServer;
        this.#channelId = channelId;
        this.#channelApi = sbServer.channel_server + '/api/';
        this.#channelServer = sbServer.channel_server + '/api/room/';
        this.channelReady = new Promise(async (resolve, reject) => {
            await this.sb384Ready;
            SBFetch(this.#sbServer.channel_server + '/api/room/' + this.#channelId + '/getChannelKeys', {
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
                await this.#loadKeys(data);
                this.#ChannelReadyFlag = true;
                resolve(this);
            })
                .catch((e) => { reject("ChannelApi Error [1]: " + WrapError(e)); });
        });
    }
    async #setKeys(k) {
        this.#channelKeys = k;
        if (DBG) {
            console.log("set channelkeys to 'k':");
            console.log(k);
        }
        _sb_assert(this.#channelKeys, "Channel.importKeys: no channel keys (?)");
        _sb_assert(this.#channelKeys.publicSignKey, "Channel.importKeys: no public sign key (?)");
        _sb_assert(this.privateKey, "Channel.importKeys: no private key (?)");
        this.#channelSignKey = await sbCrypto.deriveKey(this.privateKey, this.#channelKeys.publicSignKey, 'HMAC', false, ['sign', 'verify']);
    }
    async #loadKeys(keyStrings) {
        if (DBG) {
            console.log("loading keys:");
            console.log(keyStrings);
        }
        await this.#setKeys(await sbCrypto.channelKeyStringsToCryptoKeys(keyStrings));
    }
    get keys() { return this.#channelKeys; }
    get sbServer() { return this.#sbServer; }
    get readyFlag() { return this.#ChannelReadyFlag; }
    get api() { return this; }
    get channelId() { return this.#channelId; }
    get channelSignKey() { return (this.#channelSignKey); }
    getLastMessageTimes() {
        return new Promise((resolve, reject) => {
            SBFetch(this.#channelApi + '/getLastMessageTimes', {
                method: 'POST', body: JSON.stringify([this.channelId])
            }).then((response) => {
                if (!response.ok) {
                    reject(new Error('Network response was not OK'));
                }
                return response.json();
            }).then((message_times) => {
                resolve(message_times[this.channelId]);
            }).catch((e) => {
                reject(e);
            });
        });
    }
    getOldMessages(currentMessagesLength = 100, paginate = false) {
        return new Promise(async (resolve, reject) => {
            if (!this.#ChannelReadyFlag) {
                if (DBG)
                    console.log("Channel.getOldMessages: channel not ready (we will wait)");
                await (this.channelReady);
                if (!this.#channelKeys)
                    reject("Channel.getOldMessages: no channel keys (?) despite waiting");
            }
            let cursorOption = '';
            if (paginate)
                cursorOption = '&cursor=' + this.#cursor;
            SBFetch(this.#channelServer + this.channelId + '/oldMessages?currentMessagesLength=' + currentMessagesLength + cursorOption, {
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
                    .map((v) => deCryptChannelMessage(v, messages[v].encrypted_contents, this.#channelKeys)))
                    .then((unfilteredDecryptedMessageArray) => unfilteredDecryptedMessageArray.filter((v) => Boolean(v)))
                    .then((decryptedMessageArray) => {
                    let lastMessage = decryptedMessageArray[decryptedMessageArray.length - 1];
                    if (lastMessage)
                        this.#cursor = lastMessage._id || lastMessage.id || '';
                    if (DBG2)
                        console.log(decryptedMessageArray);
                    resolve(decryptedMessageArray);
                });
            }).catch((e) => {
                reject(e);
            });
        });
    }
    async #callApi(path, body) {
        if (DBG)
            console.log("#callApi:", path);
        if (!this.#ChannelReadyFlag) {
            console.log("ChannelApi.#callApi: channel not ready (we will wait)");
            await (this.channelReady);
        }
        const method = body ? 'POST' : 'GET';
        return new Promise(async (resolve, reject) => {
            await (this.ready);
            let authString = '';
            const token_data = new Date().getTime().toString();
            authString = token_data + '.' + await sbCrypto.sign(this.channelSignKey, token_data);
            let init = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': authString
                }
            };
            if (body)
                init.body = JSON.stringify(body);
            await (this.ready);
            SBFetch(this.#channelServer + this.channelId + path, init)
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
    updateCapacity(capacity) { return this.#callApi('/updateRoomCapacity?capacity=' + capacity); }
    getCapacity() { return (this.#callApi('/getRoomCapacity')); }
    getStorageLimit() { return (this.#callApi('/getStorageLimit')); }
    getMother() { return (this.#callApi('/getMother')); }
    getJoinRequests() { return this.#callApi('/getJoinRequests'); }
    isLocked() { return new Promise((resolve) => (this.#callApi('/roomLocked')).then((d) => resolve(d.locked === true))); }
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
                    return deCryptChannelMessage(v, message.encrypted_contents, this.keys);
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
    lock() {
        console.warn("WARNING: lock() on channel api has not been tested/debugged fully ..");
        return new Promise(async (resolve, reject) => {
            if (this.keys.lockedKey == null && this.admin) {
                const _locked_key = await crypto.subtle.generateKey({
                    name: 'AES-GCM', length: 256
                }, true, ['encrypt', 'decrypt']);
                const _exportable_locked_key = await crypto.subtle.exportKey('jwk', _locked_key);
                this.#callApi('/lockRoom')
                    .then((data) => {
                    if (data.locked) {
                        this.acceptVisitor(JSON.stringify(this.exportable_pubKey))
                            .then(() => {
                            resolve({ locked: data.locked, lockedKey: _exportable_locked_key });
                        });
                    }
                })
                    .catch((error) => { reject(error); });
            }
            else {
                reject(new Error('no lock key or not admin'));
            }
        });
    }
    acceptVisitor(pubKey) {
        console.warn("WARNING: acceptVisitor() on channel api has not been tested/debugged fully ..");
        return new Promise(async (resolve, reject) => {
            if (!this.privateKey)
                reject(new Error("acceptVisitor(): no private key"));
            const shared_key = await sbCrypto.deriveKey(this.privateKey, await sbCrypto.importKey('jwk', jsonParseWrapper(pubKey, 'L2276'), 'ECDH', false, []), 'AES', false, ['encrypt', 'decrypt']);
            const _encrypted_locked_key = await sbCrypto.encrypt(sbCrypto.str2ab(JSON.stringify(this.keys.lockedKey)), shared_key);
            resolve(this.#callApi('/acceptVisitor', {
                pubKey: pubKey, lockedKey: JSON.stringify(_encrypted_locked_key)
            }));
        });
    }
    ownerKeyRotation() {
        throw new Error("ownerKeyRotation() replaced by new budd() approach");
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
                    if (this.#channelId == targetChannel)
                        throw new Error("[budd()]: You can't specify the same channel as targetChannel");
                    if (keys)
                        throw new Error("[budd()]: You can't specify both a target channel and keys");
                    resolve(this.#callApi(`/budd?targetChannel=${targetChannel}&transferBudget=${storage}`));
                }
                else {
                    const { channelData, exportable_privateKey } = await newChannelData(keys);
                    let resp = await this.#callApi(`/budd?targetChannel=${channelData.roomId}&transferBudget=${storage}`, channelData);
                    if (resp.success) {
                        resolve({ channelId: channelData.roomId, key: exportable_privateKey });
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
], Channel.prototype, "keys", null);
__decorate([
    Memoize,
    Ready
], Channel.prototype, "sbServer", null);
__decorate([
    Memoize,
    Ready
], Channel.prototype, "readyFlag", null);
__decorate([
    Memoize,
    Ready
], Channel.prototype, "api", null);
__decorate([
    Memoize,
    Ready
], Channel.prototype, "channelId", null);
__decorate([
    Memoize,
    Ready
], Channel.prototype, "channelSignKey", null);
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
function noMessageHandler(_m) { _sb_assert(false, "NO MESSAGE HANDLER"); }
export class ChannelSocket extends Channel {
    ready;
    channelSocketReady;
    #ChannelSocketReadyFlag = false;
    #ws;
    #sbServer;
    #onMessage = noMessageHandler;
    #ack = new Map();
    #traceSocket = false;
    #resolveFirstMessage = () => { _sb_exception('L2461', 'this should never be called'); };
    #firstMessageEventHandlerReference = (_e) => { _sb_exception('L2462', 'this should never be called'); };
    constructor(sbServer, onMessage, key, channelId) {
        super(sbServer, key, channelId);
        _sb_assert(sbServer.channel_ws, 'ChannelSocket(): no websocket server name provided');
        _sb_assert(onMessage, 'ChannelSocket(): no onMessage handler provided');
        const url = sbServer.channel_ws + '/api/room/' + channelId + '/websocket';
        this.#onMessage = onMessage;
        this.#sbServer = sbServer;
        this.#ws = {
            url: url,
            ready: false,
            closed: false,
            timeout: 2000
        };
        this.ready = this.channelSocketReady = this.#channelSocketReadyFactory();
    }
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
                    _sb_assert(this.exportable_pubKey, "ChannelSocket.readyPromise(): no exportable pub key?");
                    this.#ws.init = { name: JSON.stringify(this.exportable_pubKey) };
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
                if (DBG) {
                    console.log("++++++++ #processMessage: received message:");
                    console.log(m01.encrypted_contents.content);
                }
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
                        const m = await deCryptChannelMessage(m00, m01.encrypted_contents, this.keys);
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
        console.log("FIRST MESSAGE HANDLER CALLED");
        const blocker = this.#insideFirstMessageHandler.bind(this);
        this.#ws.websocket.addEventListener('message', blocker);
        this.#ws.websocket.removeEventListener('message', this.#firstMessageEventHandlerReference);
        if (DBG) {
            console.log("++++++++ readyPromise() received ChannelKeysMessage:");
            console.log(e);
        }
        const message = jsonParseWrapper(e.data, 'L2239');
        if (DBG)
            console.log(message);
        _sb_assert(message.ready, 'got roomKeys but channel reports it is not ready (?)');
        this.motd = message.motd;
        this.locked = message.roomLocked;
        const exportable_owner_pubKey = jsonParseWrapper(message.keys.ownerKey, 'L2246');
        _sb_assert(this.keys.ownerPubKeyX === exportable_owner_pubKey.x, 'ChannelSocket.readyPromise(): owner key mismatch??');
        _sb_assert(this.readyFlag, '#ChannelReadyFlag is false, parent not ready (?)');
        this.owner = sbCrypto.compareKeys(exportable_owner_pubKey, this.exportable_pubKey);
        this.admin = false;
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
        console.log(`==== jslib ChannelSocket: Tracing ${b ? 'en' : 'dis'}abled ====`);
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
                            if (this.#traceSocket) {
                                console.log("Wrapping message contents:");
                                console.log(Object.assign({}, message.contents));
                            }
                            sbCrypto.wrap(message.encryptionKey, JSON.stringify(message.contents), 'string')
                                .then((wrappedMessage) => {
                                const m = JSON.stringify({
                                    encrypted_contents: wrappedMessage,
                                    recipient: message.sendToPubKey ? message.sendToPubKey : undefined
                                });
                                console.log("++++++++ ChannelSocket.send(): sending message:");
                                console.log(wrappedMessage.content);
                                crypto.subtle.digest('SHA-256', new TextEncoder().encode(wrappedMessage.content))
                                    .then((hash) => {
                                    const messageHash = arrayBufferToBase64(hash);
                                    if (DBG) {
                                        console.log("Which has hash:");
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
export class ChannelEndpoint extends Channel {
    constructor(sbServer, key, channelId) {
        super(sbServer, key, channelId);
    }
    send(_m, _messageType) {
        return new Promise((_resolve, reject) => {
            reject('ChannelEndpoint.send(): send outside ChannelSocket not yet implemented');
        });
    }
    set onMessage(_f) {
        _sb_assert(false, "ChannelEndpoint.onMessage: send/receive outside ChannelSocket not yet implemented");
    }
}
async function deCryptChannelMessage(m00, m01, keys) {
    const z = messageIdRegex.exec(m00);
    let encryptionKey = keys.encryptionKey;
    if (z) {
        let m = {
            type: 'encrypted',
            channelID: z[1],
            timestampPrefix: z[2],
            _id: z[1] + z[2],
            encrypted_contents: encryptedContentsMakeBinary(m01)
        };
        const unwrapped = await sbCrypto.unwrap(encryptionKey, m.encrypted_contents, 'string');
        let m2 = { ...m, ...jsonParseWrapper(unwrapped, 'L1977') };
        if (m2.contents) {
            m2.text = m2.contents;
        }
        m2.user = {
            name: m2.sender_username ? m2.sender_username : 'Unknown',
            _id: m2.sender_pubKey
        };
        if ((m2.verificationToken) && (!m2.sender_pubKey)) {
            console.error('ERROR: message with verification token is lacking sender identity (cannot be verified).');
            return (undefined);
        }
        const senderPubKey = await sbCrypto.importKey('jwk', m2.sender_pubKey, 'ECDH', true, []);
        const verifyKey = await sbCrypto.deriveKey(keys.signKey, senderPubKey, 'HMAC', false, ['sign', 'verify']);
        const v = await sbCrypto.verify(verifyKey, m2.sign, m2.contents);
        if (!v) {
            console.error("***** signature is NOT correct for message (rejecting)");
            console.log("verifyKey:");
            console.log(Object.assign({}, verifyKey));
            console.log("m2.sign");
            console.log(Object.assign({}, m2.sign));
            console.log("m2.contents");
            console.log(structuredClone(m2.contents));
            console.log("Message:");
            console.log(Object.assign({}, m2));
            console.trace();
            return (undefined);
        }
        if (m2.whispered === true) {
        }
        return (m2);
    }
    else {
        console.log("++++++++ #processMessage: ERROR - cannot parse channel ID / timestamp, invalid message");
        console.log(Object.assign({}, m00));
        console.log(Object.assign({}, m01));
        return (undefined);
    }
}
export class SBObjectHandle {
    version = '1';
    #_type = 'b';
    #id;
    #key;
    #id32;
    #key32;
    #verification;
    iv;
    salt;
    fileName;
    dateAndTime;
    shardServer;
    fileType;
    lastModified;
    actualSize;
    savedSize;
    constructor(options) {
        const { version, type, id, key, id32, key32, verification, iv, salt, fileName, dateAndTime, shardServer, fileType, lastModified, actualSize, savedSize, } = options;
        if (type)
            this.#_type = type;
        if (version)
            this.version = version;
        if (id)
            this.id = id;
        if (key)
            this.key = key;
        if (id32)
            this.id32 = id32;
        if (key32)
            this.key32 = key32;
        if (verification)
            this.#verification = verification;
        this.iv = iv;
        this.salt = salt;
        this.fileName = fileName;
        this.dateAndTime = dateAndTime;
        this.shardServer = shardServer;
        this.fileType = fileType;
        this.lastModified = lastModified;
        this.actualSize = actualSize;
        this.savedSize = savedSize;
    }
    set id(value) { _assertBase64(value); this.#id = value; this.#id32 = base64ToBase62(value); }
    get id() { _sb_assert(this.#id, 'object handle identifier is undefined'); return this.#id; }
    set key(value) { _assertBase64(value); this.#key = value; this.#key32 = base64ToBase62(value); }
    get key() { _sb_assert(this.#key, 'object handle identifier is undefined'); return this.#key; }
    set id32(value) {
        if (!isBase62Encoded(value))
            throw new Error('Invalid base62 encoded ID');
        this.#id32 = value;
        this.#id = base62ToBase64(value);
    }
    set key32(value) {
        if (!isBase62Encoded(value))
            throw new Error('Invalid base62 encoded Key');
        this.#key32 = value;
        this.#key = base62ToBase64(value);
    }
    get id32() { _sb_assert(this.#id32, 'object handle id (32) is undefined'); return this.#id32; }
    get key32() { _sb_assert(this.#key32, 'object handle key (32) is undefined'); return this.#key32; }
    set verification(value) { this.#verification = value; }
    get verification() {
        _sb_assert(this.#verification, 'object handle verification is undefined');
        return this.#verification;
    }
    get type() { return this.#_type; }
}
class StorageApi {
    server;
    shardServer;
    channelServer;
    constructor(server, channelServer, shardServer) {
        this.server = server + '/api/v1';
        this.channelServer = channelServer + '/api/room/';
        if (shardServer)
            this.shardServer = shardServer + '/api/v1';
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
        if (DBG2) {
            console.log("#padBuf bytes:");
            console.log(finalArray.slice(-4));
        }
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
    #getObjectKey(fileHash, _salt) {
        return new Promise((resolve, reject) => {
            try {
                sbCrypto.importKey('raw', base64ToArrayBuffer(decodeURIComponent(fileHash)), 'PBKDF2', false, ['deriveBits', 'deriveKey']).then((keyMaterial) => {
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
            SBFetch(this.server + "/storeRequest?name=" + image_id + "&type=" + type)
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
    #_storeObject(image, image_id, keyData, type, roomId, iv, salt) {
        return new Promise((resolve, reject) => {
            this.#getObjectKey(keyData, salt).then((key) => {
                sbCrypto.encrypt(image, key, iv, 'arrayBuffer').then((data) => {
                    SBFetch(this.channelServer + roomId + '/storageRequest?size=' + data.byteLength)
                        .then((r) => r.json())
                        .then((storageTokenReq) => {
                        if (storageTokenReq.hasOwnProperty('error'))
                            reject(`storage token request error (${storageTokenReq.error})`);
                        let storageToken = JSON.stringify(storageTokenReq);
                        this.storeData(type, image_id, iv, salt, storageToken, data)
                            .then((resp_json) => {
                            if (resp_json.error)
                                reject(`storeObject() failed: ${resp_json.error}`);
                            if (resp_json.image_id != image_id)
                                reject(`received imageId ${resp_json.image_id} but expected ${image_id}`);
                            resolve(resp_json.verification_token);
                        })
                            .catch((e) => {
                            console.log("ERROR in _storeObject(): ${e}");
                            reject(e);
                        });
                    });
                });
            });
        });
    }
    getObjectMetadata(buf, type) {
        return new Promise((resolve, reject) => {
            const paddedBuf = this.#padBuf(buf);
            sbCrypto.generateIdKey(paddedBuf).then((fullHash) => {
                this.#_allocateObject(fullHash.id, type)
                    .then((p) => {
                    const r = {
                        [SB_OBJECT_HANDLE_SYMBOL]: true,
                        version: '1',
                        type: type,
                        id: fullHash.id,
                        key: fullHash.key,
                        iv: p.iv,
                        salt: p.salt,
                        paddedBuffer: paddedBuf
                    };
                    resolve(r);
                })
                    .catch((e) => reject(e));
            });
        });
    }
    storeObject(buf, type, roomId, metadata) {
        return new Promise((resolve, reject) => {
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
            if (!metadata) {
                const paddedBuf = this.#padBuf(buf);
                sbCrypto.generateIdKey(paddedBuf).then((fullHash) => {
                    this.#_allocateObject(fullHash.id, type)
                        .then((p) => {
                        const r = {
                            [SB_OBJECT_HANDLE_SYMBOL]: true,
                            version: '1',
                            type: type,
                            id: fullHash.id,
                            key: fullHash.key,
                            id32: base64ToBase62(fullHash.id),
                            key32: base64ToBase62(fullHash.key),
                            iv: p.iv,
                            salt: p.salt,
                            actualSize: bufSize,
                            verification: this.#_storeObject(paddedBuf, fullHash.id, fullHash.key, type, roomId, p.iv, p.salt)
                        };
                        resolve(r);
                    })
                        .catch((e) => reject(e));
                });
            }
            else {
                const r = {
                    [SB_OBJECT_HANDLE_SYMBOL]: true,
                    version: '1',
                    type: type,
                    id: metadata.id,
                    key: metadata.key,
                    iv: metadata.iv,
                    salt: metadata.salt,
                    actualSize: bufSize,
                    verification: this.#_storeObject(metadata.paddedBuffer, metadata.id, metadata.key, type, roomId, metadata.iv, metadata.salt)
                };
                resolve(r);
            }
        });
    }
    storeRequest(fileId) {
        return new Promise((resolve, reject) => {
            SBFetch(this.server + '/storeRequest?name=' + fileId)
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
    storeData(type, fileId, iv, salt, storageToken, data) {
        return new Promise((resolve, reject) => {
            SBFetch(this.server + '/storeData?type=' + type + '&key=' + ensureSafe(fileId), {
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
                this.#getObjectKey(h.key, salt).then((image_key) => {
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
    fetchData(h, returnType = 'arrayBuffer') {
        return new Promise(async (resolve, reject) => {
            if (!h)
                reject('SBObjectHandle is null or undefined');
            const verificationToken = await h.verification;
            const useServer = h.shardServer ? h.shardServer + '/api/v1' : (this.shardServer ? this.shardServer : this.server);
            if (DBG)
                console.log("fetchData(), fetching from server: " + useServer);
            SBFetch(useServer + '/fetchData?id=' + ensureSafe(h.id) + '&type=' + h.type + '&verification_token=' + verificationToken, { method: 'GET' })
                .then((response) => {
                if (!response.ok)
                    reject(new Error('Network response was not OK'));
                return response.arrayBuffer();
            })
                .then((payload) => {
                return this.#processData(payload, h);
            })
                .then((payload) => {
                if (returnType === 'string')
                    resolve(sbCrypto.ab2str(new Uint8Array(payload)));
                else
                    resolve(payload);
            })
                .catch((error) => { reject(error); });
        });
    }
    async retrieveImage(imageMetaData, controlMessages, imageId, imageKey, imageType) {
        console.trace("retrieveImage()");
        console.log(imageMetaData);
        const id = imageId ? imageId : imageMetaData.previewId;
        const key = imageKey ? imageKey : imageMetaData.previewKey;
        const type = imageType ? imageType : 'p';
        const control_msg = controlMessages.find((ctrl_msg) => ctrl_msg.id && ctrl_msg.id == id);
        console.log(control_msg);
        if (control_msg) {
            _sb_assert(control_msg.verificationToken, "retrieveImage(): verificationToken missing (?)");
            _sb_assert(control_msg.id, "retrieveImage(): id missing (?)");
            const obj = {
                type: type,
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
    #storage;
    #channel;
    #preferredServer;
    #version = version;
    constructor(args, DEBUG = false) {
        console.warn(`==== CREATING Snackabra object generation: ${this.version} ====`);
        if (args) {
            this.#preferredServer = Object.assign({}, args);
            this.#storage = new StorageApi(args.storage_server, args.channel_server, args.shard_server ? args.shard_server : undefined);
            if (DEBUG)
                DBG = true;
            if (DBG)
                console.warn("++++ Snackabra constructor ++++ setting DBG to TRUE ++++");
        }
    }
    connect(onMessage, key, channelId) {
        if (DBG) {
            console.log("++++ Snackabra.connect() ++++");
            if (key)
                console.log(key);
            if (channelId)
                console.log(channelId);
        }
        return new Promise(async (resolve) => {
            if (this.#preferredServer)
                resolve(new ChannelSocket(this.#preferredServer, onMessage, key, channelId));
            else
                resolve(Promise.any(SBKnownServers.map((s) => (new ChannelSocket(s, onMessage, key, channelId)).ready)));
        });
    }
    create(sbServer, serverSecret, keys) {
        return new Promise(async (resolve, reject) => {
            try {
                const { channelData, exportable_privateKey } = await newChannelData(keys);
                channelData.SERVER_SECRET = serverSecret;
                const data = new TextEncoder().encode(JSON.stringify(channelData));
                let resp = await SBFetch(sbServer.channel_server + '/api/room/' + channelData.roomId + '/uploadRoom', {
                    method: 'POST',
                    body: data
                });
                resp = await resp.json();
                if (resp.success) {
                    resolve({ channelId: channelData.roomId, key: exportable_privateKey, server: sbServer.channel_server });
                }
                else {
                    reject(JSON.stringify(resp));
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
    get version() {
        return this.#version;
    }
}
export { Channel, SBMessage, Snackabra, SBCrypto, SB384, arrayBufferToBase64, sbCrypto, version, };
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