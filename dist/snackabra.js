var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
const version = '2.0.0-alpha.5 (build 093)';
export const NEW_CHANNEL_MINIMUM_BUDGET = 8 * 1024 * 1024;
export const SBStorageTokenPrefix = 'LM2r';
export function _check_SBStorageToken(data) {
    return (data.hash && typeof data.hash === 'string' && data.hash.length > 0
        && (!data.size || Number.isInteger(data.size) && data.size > 0)
        && (!data.motherChannel || typeof data.motherChannel === 'string')
        && (!data.created || Number.isInteger(data.created))
        && (!data.used || typeof data.used === 'boolean'));
}
export function validate_SBStorageToken(data) {
    if (!data)
        throw new SBError(`invalid SBStorageToken (null or undefined)`);
    else if (data[SB_STORAGE_TOKEN_SYMBOL])
        return data;
    else if (typeof data === 'string' && data.slice(0, 4) === SBStorageTokenPrefix)
        return { [SB_STORAGE_TOKEN_SYMBOL]: true, hash: data };
    else if (_check_SBStorageToken(data)) {
        return { ...data, [SB_STORAGE_TOKEN_SYMBOL]: true };
    }
    else {
        if (DBG)
            console.error('invalid SBStorageToken ... trying to ingest:\n', data);
        throw new SBError(`invalid SBStorageToken`);
    }
}
export function _check_SBChannelHandle(data) {
    return (data.userPrivateKey && typeof data.userPrivateKey === 'string' && data.userPrivateKey.length > 0
        && (!data.channelId || (typeof data.channelId === 'string' && data.channelId.length === 43))
        && (!data.channelServer || typeof data.channelServer === 'string')
        && (!data.channelData || _check_SBChannelData(data.channelData)));
}
export function validate_SBChannelHandle(data) {
    if (!data)
        throw new SBError(`invalid SBChannelHandle (null or undefined)`);
    else if (data[SB_CHANNEL_HANDLE_SYMBOL])
        return data;
    else if (_check_SBChannelHandle(data)) {
        return { ...data, [SB_CHANNEL_HANDLE_SYMBOL]: true };
    }
    else {
        if (DBG2)
            console.error('invalid SBChannelHandle ... trying to ingest:\n', data);
        throw new SBError(`invalid SBChannelHandle`);
    }
}
export function _check_SBChannelData(data) {
    return (data.channelId && data.channelId.length === 43
        && data.ownerPublicKey && typeof data.ownerPublicKey === 'string' && data.ownerPublicKey.length > 0
        && (!data.storageToken || validate_SBStorageToken(data.storageToken)));
}
export function validate_SBChannelData(data) {
    if (!data)
        throw new SBError(`invalid SBChannelData (null or undefined)`);
    else if (_check_SBChannelData(data)) {
        return data;
    }
    else {
        if (DBG)
            console.error('invalid SBChannelData ... trying to ingest:\n', data);
        throw new SBError(`invalid SBChannelData`);
    }
}
export function validate_Message(data) {
    if (!data)
        throw new SBError(`invalid Message (null or undefined)`);
    else if (data.body !== undefined && data.body !== null
        && data.channelId && typeof data.channelId === 'string' && data.channelId.length === 43
        && data.sender && typeof data.sender === 'string' && data.sender.length === 43
        && data.senderPublicKey && typeof data.senderPublicKey === 'string' && data.senderPublicKey.length > 0
        && data.senderTimestamp && Number.isInteger(data.senderTimestamp)
        && data.serverTimestamp && Number.isInteger(data.serverTimestamp)
        && data._id && typeof data._id === 'string' && data._id.length === 75) {
        return data;
    }
    else {
        if (DBG)
            console.error('invalid Message ... trying to ingest:\n', data);
        throw new SBError(`invalid Message`);
    }
}
export function validate_ChannelApiBody(body) {
    if (!body)
        throw new SBError(`invalid ChannelApiBody (null or undefined)`);
    else if (body[SB_CHANNEL_API_BODY_SYMBOL])
        return body;
    else if (body.channelId && body.channelId.length === 43
        && body.path && typeof body.path === 'string' && body.path.length > 0
        && body.userId && typeof body.userId === 'string' && body.userId.length === 43
        && body.userPublicKey && body.userPublicKey.length > 0
        && (!body.isOwner || typeof body.isOwner === 'boolean')
        && (!body.apiPayloadBuf || body.apiPayloadBuf instanceof ArrayBuffer)
        && body.timestamp && Number.isInteger(body.timestamp)
        && body.sign && body.sign instanceof ArrayBuffer) {
        return { ...body, [SB_CHANNEL_API_BODY_SYMBOL]: true };
    }
    else {
        if (DBG)
            console.error('invalid ChannelApiBody ... trying to ingest:\n', body);
        throw new SBError(`invalid ChannelApiBody`);
    }
}
export function validate_ChannelMessage(body) {
    if (!body)
        throw new SBError(`invalid ChannelMessage (null or undefined)`);
    else if (body[SB_CHANNEL_MESSAGE_SYMBOL])
        return body;
    else if ((body.f && typeof body.f === 'string' && body.f.length === 43)
        && (body.c && body.c instanceof ArrayBuffer)
        && (body.ts && Number.isInteger(body.ts))
        && (body.iv && body.iv instanceof Uint8Array && body.iv.length === 12)
        && (body.s && body.s instanceof ArrayBuffer)
        && (!body.sts || Number.isInteger(body.sts))
        && (!body.salt || body.salt instanceof ArrayBuffer && body.salt.byteLength === 16)
        && (!body._id || (typeof body._id === 'string' && body._id.length === 86))
        && (!body.ready || typeof body.ready === 'boolean')
        && (!body.timestampPrefix || (typeof body.timestampPrefix === 'string' && body.timestampPrefix.length === 26))
        && (!body.channelId || (typeof body.channelId === 'string' && body.channelId.length === 43))
        && (!body.i2 || (typeof body.i2 === 'string' && /^[a-zA-Z0-9_]{4}$/.test(body.i2)))
        && (body.ttl === undefined || (Number.isInteger(body.ttl) && body.ttl >= 0 && body.ttl <= 15))) {
        return { ...body, [SB_CHANNEL_MESSAGE_SYMBOL]: true };
    }
    else {
        if (DBG2)
            console.error('invalid ChannelMessage ... trying to ingest:\n', body);
        throw new SBError(`invalid ChannelMessage`);
    }
}
export function stripChannelMessage(msg, serverMode = false) {
    if (DBG2)
        console.log('stripping message:\n', msg);
    const ret = {};
    if (msg.f !== undefined)
        ret.f = msg.f;
    else
        throw new SBError("ERROR: missing 'f' ('from') in message");
    if (msg.c !== undefined)
        ret.c = msg.c;
    else
        throw new SBError("ERROR: missing 'ec' ('encrypted contents') in message");
    if (msg.iv !== undefined)
        ret.iv = msg.iv;
    else if (!(msg.stringMessage) === true)
        throw new SBError("ERROR: missing 'iv' ('nonce') in message");
    if (msg.salt !== undefined)
        ret.salt = msg.salt;
    else
        throw new SBError("ERROR: missing 'salt' in message");
    if (msg.s !== undefined)
        ret.s = msg.s;
    else if (!(msg.stringMessage) === true)
        throw new SBError("ERROR: missing 's' ('signature') in message");
    if (msg.ts !== undefined)
        ret.ts = msg.ts;
    else
        throw new SBError("ERROR: missing 'ts' ('timestamp') in message");
    if (msg.sts !== undefined)
        ret.sts = msg.sts;
    else if (serverMode)
        throw new SBError("ERROR: missing 'sts' ('servertimestamp') in message");
    if (msg.ttl !== undefined && msg.ttl !== 0xF)
        ret.ttl = msg.ttl;
    if (msg.t !== undefined)
        ret.t = msg.t;
    if (msg.i2 !== undefined && msg.i2 !== '____')
        ret.i2 = msg.i2;
    return ret;
}
var DBG = false;
var DBG2 = false;
var DBG0 = false;
if (DBG0)
    console.log("++++ Setting DBG0 to TRUE ++++");
if (globalThis.configuration && globalThis.configuration.DEBUG === true) {
    DBG = true;
    if (DBG)
        console.warn("++++ Setting DBG to TRUE based on 'configuration.DEBUG' ++++");
    if (globalThis.configuration.DEBUG2 === true) {
        DBG2 = true;
        if (DBG)
            console.warn("++++ ALSO setting DBG2 (verbose) ++++");
    }
}
function setDebugLevel(dbg1, dbg2) {
    DBG = dbg1;
    if (dbg2)
        DBG2 = dbg1 && dbg2;
    if (DBG)
        console.warn("++++ [setDebugLevel]: setting DBG to TRUE ++++");
    if (DBG2)
        console.warn("++++ [setDebugLevel]: ALSO setting DBG2 to TRUE (verbose) ++++");
}
export const msgTtlToSeconds = [0, -1, -1, 60, 300, 1800, 14400, 129600, 864000, -1, -1, -1, -1, -1, Infinity];
export const msgTtlToString = ['Ephemeral', '<reserved>', '<reserved>', 'One minute', 'Five minutes', 'Thirty minutes', 'Four hours', '36 hours', '10 days', '<reserved>', '<reserved>', '<reserved>', '<reserved>', '<reserved>', 'Permastore (no TTL)'];
const currentSBOHVersion = '3';
if (typeof WeakRef === "undefined") {
    class PolyfillWeakRef {
        _target;
        constructor(target) {
            this._target = target;
        }
        deref() {
            return this._target;
        }
    }
    Object.defineProperty(PolyfillWeakRef.prototype, Symbol.toStringTag, {
        value: 'WeakRef',
        configurable: true,
    });
    globalThis.WeakRef = PolyfillWeakRef;
}
export function _check_SBObjectHandle(h) {
    return ((!h.version || h.version === currentSBOHVersion)
        && h.id && typeof h.id === 'string' && h.id.length === 43
        && (!h.key || (typeof h.key === 'string' && h.key.length === 43))
        && (!h.verification || typeof h.verification === 'string' || typeof h.verification === 'object')
        && (!h.iv || typeof h.iv === 'string' || h.iv instanceof Uint8Array)
        && (!h.salt || typeof h.salt === 'string' || h.salt instanceof ArrayBuffer));
}
export function validate_SBObjectHandle(h) {
    if (!h)
        throw new SBError(`invalid SBObjectHandle (null or undefined)`);
    else if (h[SB_OBJECT_HANDLE_SYMBOL])
        return h;
    else if (_check_SBObjectHandle(h)) {
        return { ...h, [SB_OBJECT_HANDLE_SYMBOL]: true };
    }
    else {
        if (DBG)
            console.error('invalid SBObjectHandle ... trying to ingest:\n', h);
        throw new SBError(`invalid SBObjectHandle`);
    }
}
export async function stringify_SBObjectHandle(h) {
    if (h.iv)
        h.iv = typeof h.iv === 'string' ? h.iv : arrayBufferToBase62(h.iv);
    if (h.salt)
        h.salt = typeof h.salt === 'string' ? h.salt : arrayBufferToBase62(h.salt);
    h.verification = await h.verification;
    return validate_SBObjectHandle(h);
}
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
export class MessageQueue {
    queue = [];
    resolve = null;
    reject = null;
    closed = false;
    error = null;
    enqueue(item) {
        if (DBG)
            console.log(`[MessageQueue] Enqueueing. There were ${this.queue.length} messages in queue`);
        if (this.closed)
            throw new SBError('[MessageQueue] Error, trying to enqueue to closed queue');
        if (this.resolve) {
            this.resolve(item);
            this.resolve = null;
            this.reject = null;
        }
        else {
            this.queue.push(item);
        }
    }
    async dequeue() {
        if (DBG)
            console.log(`[MessageQueue] Dequeueing. There are ${this.queue.length} messages left`);
        if (this.queue.length > 0) {
            const item = this.queue.shift();
            if (this.closed)
                return Promise.reject(item);
            else {
                if (DBG)
                    console.log(SEP, SEP, SEP, `[MessageQueue] Dequeueing. Returning item.\n`, item, SEP);
                return Promise.resolve(item);
            }
        }
        else {
            if (this.closed)
                return null;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        }
    }
    isEmpty() {
        return this.queue.length === 0;
    }
    close(reason) {
        if (DBG0)
            console.log(`[MessageQueue] Closing. There are ${this.queue.length} messages left. Close reason: ${reason}`);
        this.closed = true;
        this.error = reason || 'close';
        if (this.reject)
            this.reject(this.error);
    }
    async drain(reason) {
        if (DBG0)
            console.log(`[MessageQueue] Draining.`);
        if (!this.closed)
            this.close(reason || 'drain');
        while (this.queue.length > 0) {
            if (DBG)
                console.log(`[MessageQueue] Draining. There are ${this.queue.length} messages left.`);
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }
}
async function closeSocket(socket) {
    console.log("[closeSocket] closing socket", socket);
    if (socket.readyState !== WebSocket.CLOSED)
        await new Promise((resolve) => {
            socket.addEventListener('close', () => {
                console.log("[Snackabra.closeSocket] ... socket confirmed closed", socket);
                resolve();
            }, { once: true });
            socket.close(1000);
        });
    else {
        console.warn('[Snackabra] websocket already closed');
    }
}
export class SBError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        if (typeof Error.captureStackTrace === 'function')
            Error.captureStackTrace(this, this.constructor);
        else
            this.stack = (new Error(message)).stack;
        if (DBG2) {
            let atLine = null;
            if (this.stack) {
                const stackLines = this.stack.split("\n");
                for (let i = 1; i < stackLines.length; i++) {
                    if (stackLines[i].trim().startsWith("at")) {
                        atLine = `${stackLines[i].trim()}`;
                        break;
                    }
                }
            }
            if (atLine !== null)
                console.log('\n', SEP, 'SBError():\n', "'" + message + "'", '\n', atLine, '\n', SEP);
            else
                console.log('\n', SEP, 'SBError():\n', message, '\n', SEP);
        }
    }
}
export function jsonParseWrapper(str, loc, reviver) {
    while (str && typeof str === 'string') {
        try {
            str = JSON.parse(str, reviver);
        }
        catch (e) {
            throw new SBError(`JSON.parse() error${loc ? ` at ${loc}` : ''}: ${e}\nString (possibly nested) was: ${str}`);
        }
    }
    return str;
}
const simpleJsonPattern = /^\s*[\[\{].*[\]\}]\s*$/;
export function jsonOrString(str) {
    if (str === null)
        return null;
    if (typeof str === 'string') {
        if (simpleJsonPattern.test(str)) {
            try {
                str = JSON.parse(str);
                return str;
            }
            catch (e) {
                return null;
            }
        }
        else {
            return str;
        }
    }
    else {
        return null;
    }
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
async function SBFetch(input, init) {
    const controller = new AbortController();
    const id = Symbol('fetch');
    Snackabra.activeFetches.set(id, controller);
    try {
        const response = await fetch(input, { ...init, signal: controller.signal });
        if (Snackabra.isShutdown) {
            await response.body?.cancel('shutDown');
            throw new SBError('Fetch aborted (shutDown)');
        }
        return response;
    }
    catch (error) {
        if (error instanceof SBError)
            throw error;
        const errStr = `${error}`;
        if (errStr.indexOf('connection closed before message completed') !== -1 ||
            errStr.indexOf('Connection reset by peer') !== -1 ||
            errStr.indexOf('The connection was reset') !== -1 ||
            errStr.indexOf('The server closed the connection') !== -1 ||
            errStr.indexOf('Please try sending the request again.') !== -1) {
            console.warn(`... got error ('${errStr}'), retrying fetch() once again`);
            try {
                return await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(fetch(input, { ...init, signal: controller.signal }));
                    }, 0);
                });
            }
            catch (e) {
                console.error('... got an error on retrying fetch()');
                const msg = `[SBFetch] Error performing fetch() (after RETRY): ${error}`;
                throw new SBError(msg);
            }
        }
        else {
            const msg = `[SBFetch] Error performing fetch() (this might be normal): ${error}`;
            throw new SBError(msg);
        }
    }
    finally {
        Snackabra.activeFetches.delete(id);
    }
}
var sbFetch = SBFetch;
export async function SBApiFetch(input, init) {
    let response;
    try {
        response = await sbFetch(input, init);
        if (!response)
            throw new SBError("[SBApiFetch] Server did not respond (might be expected)");
        if (!response.ok) {
            const text = await response.text();
            let msg = '[SBApiFetch] Server responded with error\n';
            if (response.status)
                msg += `  Status code: ('${response.status}')\n`;
            if (response.statusText)
                msg += `  Status text: ('${response.statusText}')\n`;
            if (text)
                msg += `  Error msg:   ('${text}')\n`;
            if (DBG)
                console.log(msg);
            throw new SBError(msg);
        }
        const contentType = response.headers.get('content-type');
        var retValue;
        if (!contentType)
            throw new SBError("[SBApiFetch] No content header in server response");
        if (contentType.indexOf("application/json") !== -1) {
            const json = await response.json();
            if (DBG2)
                console.log(`[SBApiFetch] json ('${json}'):\n`, json);
            retValue = jsonParseWrapper(json, "L489");
        }
        else if (contentType.indexOf("application/octet-stream") !== -1) {
            retValue = extractPayload(await response.arrayBuffer()).payload;
        }
        else if (contentType.indexOf("text/plain") !== -1) {
            retValue = await response.text();
            throw new SBError(`[SBApiFetch] Server responded with text/plain (?):\n('${retValue}')`);
        }
        else {
            throw new SBError(`[SBApiFetch] Server responded with unknown content-type header ('${contentType}')`);
        }
        if (!retValue || retValue.error || retValue.success === false) {
            let apiErrorMsg = '[SBApiFetch] No server response, or cannot parse, or error in response';
            if (response.status)
                apiErrorMsg += ' [' + response.status + ']';
            if (retValue?.error)
                apiErrorMsg += ': ' + retValue.error;
            if (DBG2)
                console.error("[SBApiFetch] error:\n", apiErrorMsg);
            throw new SBError(apiErrorMsg);
        }
        else {
            if (DBG2)
                console.log("[SBApiFetch] Success:\n", SEP, input, '\n', SEP, retValue, '\n', SEP);
            return (retValue);
        }
    }
    catch (e) {
        if (DBG2)
            console.error(`[SBApiFetch] caught error: ${e}`);
        if (response && response.body && !response.body.locked) {
            if (DBG2)
                console.log('[SBApiFetch] cancelling response body');
            await response.body.cancel();
        }
        if (e instanceof SBError)
            throw e;
        else
            throw new SBError(`[SBApiFetch] caught error: ${e}`);
    }
}
function WrapError(e) {
    const pre = ' *ErrorStart* ', post = ' *ErrorEnd* ';
    if (e instanceof SBError) {
        return e;
    }
    else if (e instanceof Error) {
        if (DBG)
            console.error('[WrapError] Error: \n', e);
        return new SBError(pre + e.message + post);
    }
    else
        return new SBError(pre + String(e) + post);
}
function _sb_exception(loc, msg) {
    const m = '[_sb_exception] << SB lib error (' + loc + ': ' + msg + ') >>';
    throw new SBError(m);
}
function _sb_assert(val, msg) {
    if (!(val)) {
        const m = ` <<<<[_sb_assert] assertion failed: '${msg}'>>>> `;
        if (DBG)
            console.trace(m);
        throw new SBError(m);
    }
}
function _appendBuffer(buffer1, buffer2) {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
}
export const base64url = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const b64urlRegex = /^([A-Za-z0-9\-_]*)(={0,2})$/;
function arrayBufferToBase64url(buffer) {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    let result = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const b1 = bytes[i], b2 = bytes[i + 1], b3 = bytes[i + 2];
        result += base64url[b1 >> 2] +
            base64url[((b1 & 0x03) << 4) | (b2 >> 4)] +
            (b2 !== undefined ? base64url[((b2 & 0x0f) << 2) | (b3 >> 6)] : '') +
            (b3 !== undefined ? base64url[b3 & 0x3f] : '');
    }
    return result;
}
function base64ToArrayBuffer(s) {
    s = s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (!b64urlRegex.test(s))
        throw new SBError(`invalid character in b64 string (after cleanup: '${s}')`);
    const len = s.length;
    const bytes = new Uint8Array(len * 3 / 4);
    for (let i = 0, p = 0; i < len; i += 4) {
        const [a, b, c, d] = [s[i], s[i + 1], s[i + 2], s[i + 3]].map(ch => base64url.indexOf(ch));
        bytes[p++] = (a << 2) | (b >> 4);
        if (c !== -1)
            bytes[p++] = ((b & 15) << 4) | (c >> 2);
        if (d !== -1)
            bytes[p++] = ((c & 3) << 6) | d;
    }
    return bytes;
}
export const base62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const base62zero = base62[0];
export const b62regex = /^[A-Za-z0-9]*$/;
export const base62regex = b62regex;
export function isBase62Encoded(value) {
    return b62regex.test(value);
}
const N = 32;
const M = new Map(), invM = new Map();
for (let X = 1; X <= N; X++) {
    const Y = Math.ceil((X * 8) / Math.log2(62));
    M.set(X, Y);
    invM.set(Y, X);
}
const maxChunk = M.get(N);
function arrayBufferToBase62(buffer) {
    function _arrayBufferToBase62(buffer, c) {
        let result = '', n = 0n;
        for (const byte of buffer)
            n = (n << 8n) | BigInt(byte);
        for (; n > 0n; n = n / 62n)
            result = base62[Number(n % 62n)] + result;
        return result.padStart(M.get(c), base62zero);
    }
    if (buffer === null || buffer === undefined)
        throw new SBError('arrayBufferToBase62: buffer is null or undefined');
    const buf = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    let result = '';
    for (let l = buf.byteLength, i = 0, c; l > 0; i += c, l -= c) {
        c = l >= N ? N : l;
        result += _arrayBufferToBase62(buf.slice(i, i + c), c);
    }
    return result;
}
function base62ToArrayBuffer(s) {
    if (!b62regex.test(s))
        throw new SBError('base62ToArrayBuffer32: must be alphanumeric (0-9A-Za-z).');
    function _base62ToArrayBuffer(s, t) {
        try {
            let n = 0n, buffer = new Uint8Array(t);
            for (let i = 0; i < s.length; i++)
                n = n * 62n + BigInt(base62.indexOf(s[i]));
            if (n > 2n ** BigInt(t * 8) - 1n)
                throw new SBError('base62ToArrayBuffer: Invalid Base62 string.');
            for (let i = t - 1; i >= 0; i--, n >>= 8n)
                buffer[i] = Number(n & 0xffn);
            return buffer;
        }
        catch (e) {
            throw new SBError('base62ToArrayBuffer: Invalid Base62 string.');
        }
    }
    try {
        let j = 0, result = new Uint8Array(s.length * 6 / 8);
        for (let i = 0, c, newBuf; i < s.length; i += c, j += newBuf.byteLength) {
            c = Math.min(s.length - i, maxChunk);
            newBuf = _base62ToArrayBuffer(s.slice(i, i + c), invM.get(c));
            result.set(newBuf, j);
        }
        return result.buffer.slice(0, j);
    }
    catch (e) {
        throw e;
    }
}
export function base62ToBase64(s) {
    return arrayBufferToBase64url(base62ToArrayBuffer(s));
}
export function base64ToBase62(s) {
    return arrayBufferToBase62(base64ToArrayBuffer(s));
}
const base62mi = "0123456789ADMRTxQjrEywcLBdHpNufk";
const base62Regex = new RegExp(`[${base62mi}.concat(' ')]`);
export function b32encode(num) {
    const charMap = base62mi;
    if (num < 0 || num > 0x7ffff)
        throw new Error('Input number is out of range. Expected a 19-bit integer.');
    let bitsArr15 = [
        (num >> 14) & 0x1f,
        (num >> 9) & 0x1f,
        (num >> 4) & 0x1f,
        (num) & 0x0f
    ];
    bitsArr15[3] |= (bitsArr15[0] ^ bitsArr15[1] ^ bitsArr15[2]) & 0x10;
    return bitsArr15.map(val => charMap[val]).join('');
}
export function b32process(str) {
    const substitutions = {
        "o": "0", "O": "0", "i": "1", "I": "1",
        "l": "1", "z": "2", "Z": "2", "s": "5",
        "S": "5", "b": "6", "G": "6", "a": "9",
        "g": "9", "q": "9", "m": "M", "t": "T",
        "X": "x", "J": "j", "e": "E", "Y": "y",
        "W": "w", "C": "c", "P": "p", "n": "N",
        "h": "N", "U": "u", "v": "u", "V": "u",
        "F": "f", "K": "k"
    };
    let processedStr = '';
    for (let char of str)
        processedStr += substitutions[char] || char;
    return processedStr;
}
export function b32decode(encoded) {
    if (!base62Regex.test(encoded))
        throw new Error(`Input string contains invalid characters (${encoded}) - use 'process()'.`);
    let bin = Array.from(encoded)
        .map(c => base62mi.indexOf(c));
    if (bin.reduce((a, b) => (a ^ b)) & 0x10)
        return null;
    return (((bin[0] * 32 + bin[1]) * 32 + bin[2]) * 16 + (bin[3] & 0x0f));
}
function is32BitSignedInteger(number) {
    const MIN32 = -2147483648, MAX32 = 2147483647;
    return (typeof number === 'number' && number >= MIN32 && number <= MAX32 && number % 1 === 0);
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
    if (value instanceof Uint8Array)
        return '8';
    if (typeof value === 'boolean')
        return 'b';
    if (value instanceof DataView)
        return 'v';
    if (value instanceof Date)
        return 'd';
    if (value instanceof Map)
        return 'm';
    if (typeof value === 'number')
        return is32BitSignedInteger(value) ? 'i' : 'n';
    if (value !== null && typeof value === 'object' && value.constructor === Object)
        return 'o';
    if (value instanceof Set)
        return 't';
    if (typeof value === 'string')
        return 's';
    if (value instanceof WeakRef)
        return 'w';
    if (typeof value === 'object' && typeof value.then === 'function')
        console.error("[getType] Trying to serialize a Promise - did you forget an 'await'?");
    else if (typeof value === 'object' && typeof value.toJSON === 'function')
        return 'j';
    else
        console.error('[getType] Unsupported for object:', value);
    throw new SBError('Unsupported type');
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
                            throw new SBError(`Failed to assemble payload for ${key}`);
                        BufferList.push(payload);
                        break;
                    case 'j':
                        const jsonValue = new TextEncoder().encode(JSON.stringify(value));
                        BufferList.push(jsonValue.buffer);
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
                            throw new SBError(`Failed to assemble payload for ${key}`);
                        BufferList.push(mapPayload);
                        break;
                    case 'a':
                        const arrayValue = new Array();
                        value.forEach((v) => {
                            arrayValue.push(v);
                        });
                        const arrayPayload = _assemblePayload(arrayValue);
                        if (!arrayPayload)
                            throw new SBError(`Failed to assemble payload for ${key}`);
                        BufferList.push(arrayPayload);
                        break;
                    case 't':
                        const setValue = new Array();
                        value.forEach((v) => {
                            setValue.push(v);
                        });
                        const setPayload = _assemblePayload(setValue);
                        if (!setPayload)
                            throw new SBError(`Failed to assemble payload for ${key}`);
                        BufferList.push(setPayload);
                        break;
                    case 'w':
                    case '0':
                        BufferList.push(new ArrayBuffer(0));
                        break;
                    case 'u':
                        BufferList.push(new ArrayBuffer(0));
                        break;
                    case 'v':
                    default:
                        console.error(`[assemblePayload] Unsupported type: ${type}`);
                        throw new SBError(`Unsupported type: ${type}`);
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
    if (DBG && data instanceof ArrayBuffer)
        console.warn('[assemblePayload] Warning: data is already an ArrayBuffer, make sure you are not double-encoding');
    const mainPayload = _assemblePayload({ ver003: true, payload: data });
    if (!mainPayload)
        return null;
    return _appendBuffer(new Uint8Array([0xAA, 0xBB, 0xBB, 0xAA]), mainPayload);
}
function deserializeValue(buffer, type) {
    switch (type) {
        case 'o':
            return _extractPayload(buffer);
        case 'j':
            return jsonParseWrapper(new TextDecoder().decode(buffer), "L1322");
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
                throw new SBError(`Failed to assemble payload for ${type}`);
            return Object.values(arrayPayload);
        case 'm':
            const mapPayload = _extractPayload(buffer);
            if (!mapPayload)
                throw new SBError(`Failed to assemble payload for ${type}`);
            const map = new Map();
            for (const key in mapPayload) {
                map.set(mapPayload[key][0], mapPayload[key][1]);
            }
            return map;
        case 't':
            const setPayload = _extractPayload(buffer);
            if (!setPayload)
                throw new SBError(`Failed to assemble payload for ${type}`);
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
            throw new SBError(`Unsupported type: ${type}`);
    }
}
function _extractPayload(payload) {
    const parsingMsgError = 'Cannot parse metadata, this is not a well-formed payload';
    try {
        const metadataSize = new Uint32Array(payload.slice(0, 4))[0];
        const decoder = new TextDecoder();
        const json = decoder.decode(payload.slice(4, 4 + metadataSize));
        let metadata;
        try {
            metadata = jsonParseWrapper(json, "L1290");
        }
        catch (e) {
            throw new SBError(parsingMsgError);
        }
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
        if (e instanceof Error && e.message === parsingMsgError)
            throw e;
        throw new SBError('[extractPayload] exception <<' + e + '>> [/extractPayload]');
    }
}
export function extractPayload(value) {
    const verifySignature = (v) => new Uint32Array(v, 0, 1)[0] === 0xAABBBBAA;
    const msg = 'Invalid payload signature (this is not a payload)';
    if (!verifySignature(value)) {
        if (DBG)
            console.error('\n', SEP, msg, '\n', value, SEP);
        throw new SBError(msg);
    }
    return _extractPayload(value.slice(4));
}
export var KeyPrefix;
(function (KeyPrefix) {
    KeyPrefix["SBPublicKey"] = "PNk";
    KeyPrefix["SBPrivateKey"] = "Xj3";
    KeyPrefix["SBDehydratedKey"] = "XjZ";
})(KeyPrefix || (KeyPrefix = {}));
var KeySubPrefix;
(function (KeySubPrefix) {
    KeySubPrefix["CompressedEven"] = "2";
    KeySubPrefix["CompressedOdd"] = "3";
    KeySubPrefix["Uncompressed"] = "4";
    KeySubPrefix["Dehydrated"] = "x";
})(KeySubPrefix || (KeySubPrefix = {}));
function ySign(y) {
    if (typeof y === 'string')
        y = base64ToArrayBuffer(y);
    const yBytes = new Uint8Array(y);
    return (yBytes[yBytes.length - 1] & 1) === 1 ? 1 : 0;
}
function parseSB384string(input) {
    try {
        if (input.length <= 4)
            return undefined;
        const prefix = input.slice(0, 4);
        const data = input.slice(4);
        switch (prefix.slice(0, 3)) {
            case KeyPrefix.SBPublicKey:
                {
                    switch (prefix[3]) {
                        case KeySubPrefix.Uncompressed: {
                            const combined = base62ToArrayBuffer(data);
                            if (combined.byteLength !== (48 * 2))
                                return undefined;
                            const yBytes = combined.slice(48, 96);
                            return {
                                x: arrayBufferToBase64url(combined.slice(0, 48)),
                                y: arrayBufferToBase64url(yBytes),
                                ySign: ySign(yBytes)
                            };
                        }
                        case KeySubPrefix.CompressedEven:
                        case KeySubPrefix.CompressedOdd: {
                            const ySign = prefix[3] === KeySubPrefix.CompressedEven ? 0 : 1;
                            const xBuf = base62ToArrayBuffer(data);
                            if (xBuf.byteLength !== 48)
                                return undefined;
                            const { x: xBase64, y: yBase64 } = decompressP384(arrayBufferToBase64url(xBuf), ySign);
                            return {
                                x: xBase64,
                                y: yBase64,
                                ySign: ySign,
                            };
                        }
                        default: {
                            console.error("KeySubPrefix not recognized");
                        }
                    }
                }
                break;
            case KeyPrefix.SBPrivateKey:
                {
                    switch (prefix[3]) {
                        case KeySubPrefix.Uncompressed: {
                            const combined = base62ToArrayBuffer(data);
                            if (combined.byteLength !== (48 * 3))
                                return undefined;
                            const yBytes = combined.slice(48, 96);
                            return {
                                x: arrayBufferToBase64url(combined.slice(0, 48)),
                                y: arrayBufferToBase64url(yBytes),
                                ySign: ySign(yBytes),
                                d: arrayBufferToBase64url(combined.slice(96, 144))
                            };
                        }
                        case KeySubPrefix.CompressedEven:
                        case KeySubPrefix.CompressedOdd: {
                            const ySign = prefix[3] === KeySubPrefix.CompressedEven ? 0 : 1;
                            const combined = base62ToArrayBuffer(data);
                            if (combined.byteLength !== (48 * 2))
                                return undefined;
                            const xBuf = combined.slice(0, 48);
                            const { x: xBase64, y: yBase64 } = decompressP384(arrayBufferToBase64url(xBuf), ySign);
                            return {
                                x: xBase64,
                                y: yBase64,
                                ySign: ySign,
                                d: arrayBufferToBase64url(combined.slice(48, 96))
                            };
                        }
                        case KeySubPrefix.Dehydrated: {
                            console.error("parseSB384string() - you need to rehydrate first ('hydrateKey()')");
                            return undefined;
                        }
                        default: {
                            console.error("KeySubPrefix not recognized");
                        }
                    }
                }
                break;
            default: {
                console.error("KeyPrefix not recognized");
            }
        }
        return undefined;
    }
    catch (e) {
        console.error("parseSB384string() - malformed input, exception: ", e);
        return undefined;
    }
}
function xdySignToPrivateKey(x, d, ySign) {
    if (!x || x.length !== 64 || !d || d.length !== 64 || ySign === undefined)
        return undefined;
    const combined = new Uint8Array(2 * 48);
    combined.set(base64ToArrayBuffer(x), 0);
    combined.set(base64ToArrayBuffer(d), 48);
    return KeyPrefix.SBPrivateKey + (ySign === 0 ? KeySubPrefix.CompressedEven : KeySubPrefix.CompressedOdd) + arrayBufferToBase62(combined);
}
export function hydrateKey(privKey, pubKey) {
    if (privKey.length <= 4)
        return undefined;
    const prefix = privKey.slice(0, 4);
    switch (prefix.slice(0, 3)) {
        case KeyPrefix.SBPublicKey:
            return privKey;
        case KeyPrefix.SBPrivateKey:
            {
                switch (prefix[3]) {
                    case KeySubPrefix.Uncompressed:
                    case KeySubPrefix.CompressedEven:
                    case KeySubPrefix.CompressedOdd:
                        return privKey;
                    case KeySubPrefix.Dehydrated: {
                        if (!pubKey) {
                            console.error("hydrateKey() - you need to provide pubKey to hydrate");
                            return undefined;
                        }
                        const privKeyData = privKey.slice(4);
                        const combined = base62ToArrayBuffer(privKeyData);
                        const dBytes = combined.slice(0, 48);
                        const d = arrayBufferToBase64url(dBytes);
                        const jwk = parseSB384string(pubKey);
                        if (!jwk || !jwk.x || jwk.ySign === undefined) {
                            console.error("hydrateKey() - failed to parse public key");
                            return undefined;
                        }
                        return xdySignToPrivateKey(jwk.x, d, jwk.ySign);
                    }
                    default: {
                        console.error("KeySubPrefix not recognized");
                    }
                }
            }
            break;
        default: {
            console.error("KeyPrefix not recognized");
        }
    }
    return undefined;
}
export class SBCrypto {
    generateIdKey(buf) {
        if (!(buf instanceof ArrayBuffer))
            throw new TypeError('Input must be an ArrayBuffer');
        return new Promise((resolve, reject) => {
            try {
                crypto.subtle.digest('SHA-512', buf).then((digest) => {
                    const _id = digest.slice(0, 32);
                    const _key = digest.slice(32);
                    resolve({
                        idBinary: _id,
                        keyMaterial: _key
                    });
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }
    async generateKeys() {
        try {
            return await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-384' }, true, ['deriveKey']);
        }
        catch (e) {
            throw new SBError('generateKeys() exception (' + e + ')');
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
                    throw new SBError('importKey() - invalid JsonWebKey');
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
                console.log(SEP, SEP);
                console.error(msg);
                console.log(format);
                console.log(key);
                console.log(type);
                console.log(extractable);
                console.log(keyUsages);
                console.log(SEP, SEP);
            }
            throw new SBError(msg);
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
    async encrypt(data, key, params) {
        if (data === null)
            throw new SBError('no contents');
        if (!params.iv)
            throw new SBError('no nonce');
        if (!params.name)
            params.name = 'AES-GCM';
        else
            _sb_assert(params.name === 'AES-GCM', "Must be AES-GCM (L1951)");
        return crypto.subtle.encrypt(params, key, data);
    }
    async wrap(body, sender, encryptionKey, salt, signingKey) {
        const payload = assemblePayload(body);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const timestamp = await Snackabra.dateNow();
        const view = new DataView(new ArrayBuffer(8));
        view.setFloat64(0, timestamp);
        return ({
            f: sender,
            c: await sbCrypto.encrypt(payload, encryptionKey, { iv: iv, additionalData: view }),
            iv: iv,
            salt: salt,
            s: await sbCrypto.sign(signingKey, payload),
            ts: timestamp,
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
}
export function Memoize(target, propertyKey, descriptor) {
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
export function Ready(target, propertyKey, descriptor) {
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
const SB_CLASS_ARRAY = ['SBMessage', 'SBObjectHandle', 'SBChannelHandle', 'ChannelApiBody'];
const SB_CHANNEL_MESSAGE_SYMBOL = Symbol('SB_CHANNEL_MESSAGE_SYMBOL');
const SB_CHANNEL_API_BODY_SYMBOL = Symbol('SB_CHANNEL_API_BODY_SYMBOL');
const SB_CHANNEL_HANDLE_SYMBOL = Symbol('SBChannelHandle');
const SB_MESSAGE_SYMBOL = Symbol.for('SBMessage');
const SB_OBJECT_HANDLE_SYMBOL = Symbol.for('SBObjectHandle');
const SB_STORAGE_TOKEN_SYMBOL = Symbol.for('SBStorageToken');
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
const SEP = '\n' + '='.repeat(76) + '\n';
const SEPx = '='.repeat(76) + '\n';
function modPow(base, exponent, modulus) {
    if (modulus === 1n)
        return 0n;
    let result = 1n;
    base = base % modulus;
    while (exponent > 0n) {
        if (exponent % 2n === 1n)
            result = (result * base) % modulus;
        exponent = exponent >> 1n;
        base = (base * base) % modulus;
    }
    return result;
}
function decompressP384(xBase64, signY) {
    const prime = BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffff'), b = BigInt('0xb3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aef'), pIdent = (prime + 1n) / 4n;
    const xBytes = new Uint8Array(base64ToArrayBuffer(xBase64));
    const xHex = '0x' + Array.from(xBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    var x = BigInt(xHex);
    var y = modPow(x * x * x - 3n * x + b, pIdent, prime);
    if (y % 2n !== BigInt(signY))
        y = prime - y;
    const yHex = y.toString(16).padStart(96, '0');
    const yBytes = new Uint8Array(yHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const yBase64 = arrayBufferToBase64url(yBytes);
    return { x: xBase64, y: yBase64 };
}
class SB384 {
    sb384Ready;
    static ReadyFlag = Symbol('SB384ReadyFlag');
    #private;
    #x;
    #y;
    #ySign;
    #d;
    #privateUserKey;
    #publicUserKey;
    #signKey;
    #hash;
    #hashB32;
    errorState = false;
    constructor(key, forcePrivate) {
        this[SB384.ReadyFlag] = false;
        this.sb384Ready = new Promise(async (resolve, reject) => {
            try {
                if (!key) {
                    if (DBG2)
                        console.log("SB384() - generating new key pair");
                    const keyPair = await sbCrypto.generateKeys();
                    const _jwk = await sbCrypto.exportKey('jwk', keyPair.privateKey);
                    _sb_assert(_jwk && _jwk.x && _jwk.y && _jwk.d, 'INTERNAL');
                    this.#private = true;
                    this.#x = _jwk.x;
                    this.#y = _jwk.y;
                    this.#d = _jwk.d;
                    if (DBG2)
                        console.log("#### FROM SCRATCH", this.#private);
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
                        throw new SBError('ERROR creating SB384 object: invalid key (must be a JsonWebKey | SBUserPublicKey | SBUserPrivateKey, or omitted)');
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
                    throw new SBError('ERROR creating SB384 object: invalid key (must be a JsonWebKey, SBUserId, or omitted)');
                }
                if (DBG2)
                    console.log("SB384() constructor; x/y/d:\n", this.#x, "\n", this.#y, "\n", this.#d);
                if (this.#private)
                    this.#privateUserKey = await sbCrypto.importKey('jwk', this.jwkPrivate, 'ECDH', true, ['deriveKey']);
                this.#publicUserKey = await sbCrypto.importKey('jwk', this.jwkPublic, 'ECDH', true, []);
                if (this.#private) {
                    const newJwk = { ...this.jwkPrivate, key_ops: ['sign'] };
                    if (DBG2)
                        console.log('starting jwk (private):\n', newJwk);
                    this.#signKey = await crypto.subtle.importKey("jwk", newJwk, {
                        name: "ECDSA",
                        namedCurve: "P-384",
                    }, true, ['sign']);
                }
                else {
                    const newJwk = { ...this.jwkPublic, key_ops: ['verify'] };
                    if (DBG2)
                        console.log('starting jwk (public):\n', newJwk);
                    this.#signKey = await crypto.subtle.importKey("jwk", newJwk, {
                        name: "ECDSA",
                        namedCurve: "P-384",
                    }, true, ['verify']);
                }
                const channelBytes = _appendBuffer(base64ToArrayBuffer(this.#x), base64ToArrayBuffer(this.#y));
                const rawHash = await crypto.subtle.digest('SHA-256', channelBytes);
                this.#hash = arrayBufferToBase62(rawHash);
                const hashBigInt = BigInt('0x' + Array.from(new Uint8Array(rawHash)).map(b => b.toString(16).padStart(2, '0')).join('')) >> 28n;
                this.#hashB32 = Array.from({ length: 12 }, (_, i) => b32encode(Number((hashBigInt >> BigInt(19 * (11 - i))) & 0x7ffffn))).join('');
                if (DBG2)
                    console.log("SB384() constructor; hash:\n", this.#hash);
                this.#ySign = ySign(this.#y);
                if (DBG2)
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
    get hashB32() { return this.#hashB32; }
    get userId() { return this.hash; }
    get ownerChannelId() {
        return this.hash;
    }
    get privateKey() {
        if (!this.private)
            throw new SBError(`this is a public key, there is no 'privateKey' value`);
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
    get ySign() {
        _sb_assert(this.#ySign !== null, "ySign() - ySign is not available (fatal)");
        return this.#ySign;
    }
    get userPublicKey() {
        _sb_assert(this.#x && (this.#ySign !== undefined), "userPublicKey() - sufficient key info is not available (fatal)");
        return KeyPrefix.SBPublicKey + (this.#ySign === 0 ? KeySubPrefix.CompressedEven : KeySubPrefix.CompressedOdd) + base64ToBase62(this.#x);
    }
    get userPrivateKey() {
        _sb_assert(this.#private, 'userPrivateKey() - not a private key, there is no userPrivateKey');
        const key = xdySignToPrivateKey(this.#x, this.#d, this.#ySign);
        _sb_assert(key !== undefined, "userPrivateKey() - failed to construct key, probably missing info (fatal)");
        return key;
    }
    get userPrivateKeyDehydrated() {
        _sb_assert(this.#private && this.#d, "userPrivateKey() - not a private key, and/or 'd' is missing, there is no userPrivateKey");
        return (KeyPrefix.SBPrivateKey + KeySubPrefix.Dehydrated + base64ToBase62(this.#d));
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
], SB384.prototype, "hashB32", null);
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
], SB384.prototype, "ySign", null);
__decorate([
    Memoize
], SB384.prototype, "userPublicKey", null);
__decorate([
    Memoize
], SB384.prototype, "userPrivateKey", null);
__decorate([
    Memoize
], SB384.prototype, "userPrivateKeyDehydrated", null);
export class Protocol_AES_GCM_256 {
    #masterKey;
    #keyInfo;
    constructor(passphrase, keyInfo) {
        this.#keyInfo = keyInfo;
        this.#masterKey = this.initializeMasterKey(passphrase);
    }
    setChannel(_channel) {
    }
    async initializeMasterKey(passphrase) {
        const salt = this.#keyInfo.salt1;
        const iterations = this.#keyInfo.iterations1;
        const hash = this.#keyInfo.hash1;
        _sb_assert(salt && iterations && hash, "Protocol_AES_GCM_256.initializeMasterKey() - insufficient key info (fatal)");
        const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
        const masterKeyBuffer = await crypto.subtle.deriveBits({
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: hash
        }, baseKey, 256);
        return crypto.subtle.importKey('raw', masterKeyBuffer, { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
    }
    static async genKey() {
        return {
            salt1: crypto.getRandomValues(new Uint8Array(16)).buffer,
            iterations1: 100000,
            iterations2: 10000,
            hash1: 'SHA-256',
            summary: 'PBKDF2 - SHA-256 - AES-GCM',
        };
    }
    async #getMessageKey(salt) {
        const derivedKey = await crypto.subtle.deriveKey({
            'name': 'PBKDF2',
            'salt': salt,
            'iterations': this.#keyInfo.iterations2,
            'hash': this.#keyInfo.hash1
        }, await this.#masterKey, { 'name': 'AES-GCM', 'length': 256 }, true, ['encrypt', 'decrypt']);
        return derivedKey;
    }
    async encryptionKey(msg) {
        _sb_assert(msg.salt, "Protocol called without salt (Internal Error)");
        if (DBG2)
            console.log("CALLING Protocol_AES_GCM_384.encryptionKey(), salt:", msg.salt);
        return this.#getMessageKey(msg.salt);
    }
    async decryptionKey(_channel, msg) {
        if (!msg.salt) {
            console.warn("Salt should always be present in ChannelMessage");
            return undefined;
        }
        if (DBG)
            console.log("CALLING Protocol_AES_GCM_384.decryptionKey(), salt:", msg.salt);
        return this.#getMessageKey(msg.salt);
    }
}
export class Protocol_ECDH {
    #channel;
    #keyMap = new Map();
    constructor() { }
    setChannel(channel) {
        this.#channel = channel;
    }
    async encryptionKey(msg) {
        _sb_assert(this.#channel, "[Protocol_ECDH] Error, need to know channel (L2511)");
        await this.#channel.ready;
        const channelId = this.#channel.channelId;
        _sb_assert(channelId, "Internal Error (L2565)");
        const sendTo = msg.t ? msg.t : this.#channel.channelData.ownerPublicKey;
        return this.#getKey(channelId, sendTo, this.#channel.privateKey);
    }
    async decryptionKey(channel, msg) {
        await channel.ready;
        const channelId = channel.channelId;
        _sb_assert(channelId, "Internal Error (L2594)");
        const sentFrom = channel.visitors.get(msg.f);
        if (!sentFrom) {
            console.error("Protocol_ECDH.key() - sentFrom is unknown");
            return undefined;
        }
        return this.#getKey(channelId, sentFrom, channel.privateKey);
    }
    async #getKey(channelId, publicKey, privateKey) {
        const key = channelId + "_" + publicKey;
        if (!this.#keyMap.has(key)) {
            const newKey = await crypto.subtle.deriveKey({
                name: 'ECDH',
                public: (await new SB384(publicKey).ready).publicKey
            }, privateKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
            this.#keyMap.set(key, newKey);
            if (DBG2)
                console.log("++++ Protocol_ECDH.key() - newKey:", newKey);
        }
        const res = this.#keyMap.get(key);
        _sb_assert(res, "Internal Error (L2584/2611)");
        if (DBG2)
            console.log("++++ Protocol_ECDH.key() - res:", res);
        return res;
    }
}
export class SBChannelKeys extends SB384 {
    #channelId;
    sbChannelKeysReady;
    static ReadyFlag = Symbol('SBChannelKeysReadyFlag');
    #channelData;
    channelServer;
    constructor(handleOrKey) {
        let channelServer;
        if (handleOrKey === null)
            throw new SBError(`SBChannelKeys constructor: you cannot pass 'null'`);
        if (handleOrKey) {
            if (typeof handleOrKey === 'string') {
                const ownerPrivateKey = handleOrKey;
                super(ownerPrivateKey, true);
            }
            else if (_check_SBChannelHandle(handleOrKey)) {
                const handle = validate_SBChannelHandle(handleOrKey);
                channelServer = handle.channelServer;
                super(handle.userPrivateKey, true);
                this.#channelId = handle.channelId;
                this.#channelData = handle.channelData;
            }
            else {
                throw new SBError(`SBChannelKeys() constructor: invalid parameter (must be SBChannelHandle or SBUserPrivateKey)`);
            }
        }
        else {
            super();
        }
        if (!channelServer)
            channelServer = Snackabra.defaultChannelServer;
        if (channelServer[channelServer.length - 1] === '/')
            this.channelServer = channelServer.slice(0, -1);
        this.channelServer = channelServer;
        this[SBChannelKeys.ReadyFlag] = false;
        this.sbChannelKeysReady = new Promise(async (resolve, reject) => {
            try {
                if (DBG)
                    console.log("SBChannelKeys() constructor.");
                await this.sb384Ready;
                _sb_assert(this.private, "Internal Error (L2476)");
                if (!this.#channelId) {
                    this.#channelId = this.ownerChannelId;
                    this.#channelData = {
                        channelId: this.#channelId,
                        ownerPublicKey: this.userPublicKey,
                    };
                }
                else if (!this.#channelData) {
                    if (!this.channelServer)
                        throw new SBError("SBChannelKeys() constructor: either key is owner key, or handle contains channelData, or channelServer is provided ...");
                    if (DBG)
                        console.log("++++ SBChannelKeys being initialized from server");
                    var cpk = await this.callApi('/getChannelKeys');
                    cpk = validate_SBChannelData(cpk);
                    _sb_assert(cpk.channelId === this.#channelId, "Internal Error (L2493)");
                    this.#channelData = cpk;
                }
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
    async buildApiBody(path, apiPayload) {
        await this.sb384Ready;
        const timestamp = await Snackabra.dateNow();
        const viewBuf = new ArrayBuffer(8);
        const view = new DataView(viewBuf);
        view.setFloat64(0, timestamp);
        const pathAsArrayBuffer = new TextEncoder().encode(path).buffer;
        const prefixBuf = _appendBuffer(viewBuf, pathAsArrayBuffer);
        const apiPayloadBuf = apiPayload ? assemblePayload(apiPayload) : undefined;
        const sign = await sbCrypto.sign(this.signKey, apiPayloadBuf ? _appendBuffer(prefixBuf, apiPayloadBuf) : prefixBuf);
        const apiBody = {
            channelId: this.#channelId,
            path: path,
            userId: this.userId,
            userPublicKey: this.userPublicKey,
            timestamp: timestamp,
            sign: sign
        };
        if (apiPayloadBuf)
            apiBody.apiPayloadBuf = apiPayloadBuf;
        return validate_ChannelApiBody(apiBody);
    }
    callApi(path, apiPayload) {
        _sb_assert(this.channelServer, "[ChannelApi.callApi] channelServer is unknown (you can just set it, eg 'channel.channelServer = ...')");
        if (DBG)
            console.log("ChannelApi.callApi: calling fetch with path:", path);
        if (DBG2)
            console.log("... and body:", apiPayload);
        _sb_assert(this.#channelId && path, "Internal Error (L2528)");
        return new Promise(async (resolve, reject) => {
            const init = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream"',
                },
                body: assemblePayload(await this.buildApiBody(path, apiPayload))
            };
            if (DBG2)
                console.log("==== ChannelApi.callApi: calling fetch with init:\n", init);
            SBApiFetch(this.channelServer + '/api/v2/channel/' + this.#channelId + path, init)
                .then((ret) => { resolve(ret); })
                .catch((e) => {
                if (e instanceof SBError)
                    reject(e);
                else
                    reject("[Channel.callApi] Error: " + WrapError(e));
            });
        });
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
const MAX_SB_BODY_SIZE = 64 * 1024;
class Channel extends SBChannelKeys {
    channelReady;
    static ReadyFlag = Symbol('ChannelReadyFlag');
    locked = false;
    static defaultProtocol = new Protocol_ECDH();
    protocol = Channel.defaultProtocol;
    visitors = new Map();
    sendQueue = new MessageQueue();
    isClosed = false;
    constructor(handleOrKey, protocol) {
        if (DBG)
            console.log("Channel() constructor called with handleOrKey:\n", handleOrKey);
        if (handleOrKey === null)
            super();
        else
            super(handleOrKey);
        this.protocol = protocol ? protocol : Channel.defaultProtocol;
        this
            .messageQueueManager()
            .then(() => { if (DBG0)
            console.log("Channel() constructor - messageQueueManager() is DONE"); })
            .catch(e => { throw e; });
        this.channelReady =
            this.sbChannelKeysReady
                .then(() => {
                this.visitors.set(this.channelId, this.channelData.ownerPublicKey);
                this[Channel.ReadyFlag] = true;
                this.protocol.setChannel(this);
                return this;
            })
                .catch(e => { throw e; });
    }
    get ready() {
        _sb_assert(!this.isClosed, "[Channel] Channel is closed, blocking on'ready' will reject");
        return this.channelReady;
    }
    get ChannelReadyFlag() { return this[Channel.ReadyFlag]; }
    get api() { return this; }
    async extractMessage(msgRaw) {
        if (!msgRaw)
            return undefined;
        if (DBG2)
            console.log("[extractMessage] Extracting message:", msgRaw);
        if (msgRaw instanceof ArrayBuffer)
            throw new SBError('[Channel.extractMessage] Message is an ArrayBuffer (did you forget extractPayload()?)');
        try {
            msgRaw = validate_ChannelMessage(msgRaw);
            if (!msgRaw) {
                if (DBG0)
                    console.warn("++++ [extractMessage]: message is not valid (probably an error)", msgRaw);
                return undefined;
            }
            const f = msgRaw.f;
            if (!f) {
                console.error("++++ [extractMessage]: no sender userId hash in message (probably an error)");
                return undefined;
            }
            if (!this.visitors.has(f)) {
                if (DBG0)
                    console.log("++++ [extractMessage]: need to update visitor table ...");
                const visitorMap = await this.callApi('/getPubKeys');
                if (!visitorMap || !(visitorMap instanceof Map)) {
                    if (DBG0)
                        console.error("++++ [extractMessage]: visitorMap is not valid (probably an error)");
                    return undefined;
                }
                if (DBG0)
                    console.log(SEP, "visitorMap:\n", visitorMap, "\n", SEP);
                for (const [k, v] of visitorMap) {
                    if (DBG0)
                        console.log("++++ [extractMessage]: adding visitor:", k, v);
                    this.visitors.set(k, v);
                }
            }
            _sb_assert(this.visitors.has(f), `Cannot find sender userId hash ${f} in public key map`);
            _sb_assert(this.protocol, "Protocol not set (internal error)");
            const k = await this.protocol?.decryptionKey(this, msgRaw);
            if (!k) {
                if (DBG0 || DBG)
                    console.error("++++ [extractMessage]: no decryption key provided by protocol (probably an error)");
                return undefined;
            }
            if (!msgRaw.ts)
                throw new SBError(`unwrap() - no timestamp in encrypted message`);
            const { c: t, iv: iv } = msgRaw;
            _sb_assert(t, "[unwrap] No contents in encrypted message (probably an error)");
            const view = new DataView(new ArrayBuffer(8));
            view.setFloat64(0, msgRaw.ts);
            let bodyBuffer;
            try {
                bodyBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv, additionalData: view }, k, t);
            }
            catch (e) {
                if (DBG0 || DBG)
                    console.error("[extractMessage] Could not decrypt message (exception) [L2898]:", e.message);
                return undefined;
            }
            if (!msgRaw._id)
                msgRaw._id = Channel.composeMessageKey(this.channelId, msgRaw.sts, msgRaw.i2);
            if (DBG && msgRaw.ttl !== undefined && msgRaw.ttl !== 15)
                console.warn(`[extractMessage] TTL->EOL missing (TTL set to ${msgRaw.ttl}) [L2762]`);
            const msg = {
                body: extractPayload(bodyBuffer).payload,
                channelId: this.channelId,
                sender: f,
                senderPublicKey: this.visitors.get(f),
                senderTimestamp: msgRaw.ts,
                serverTimestamp: msgRaw.sts,
                _id: msgRaw._id,
            };
            if (DBG2)
                console.log("[Channel.extractMessage] Extracted message (before validation):", msg.body);
            return validate_Message(msg);
        }
        catch (e) {
            if (DBG0 || DBG)
                console.error("[extractMessage] Could not process message (exception) [L2782]:", e.message);
            return undefined;
        }
    }
    async extractMessageMap(msgMap) {
        const ret = new Map();
        for (const [k, v] of msgMap) {
            const msg = await this.extractMessage(v);
            if (msg)
                ret.set(k, msg);
        }
        return ret;
    }
    packageMessage(contents, options = {}) {
        if (DBG2)
            console.log("[Channel#packageMessage] - contents:\n", contents, "options:\n", options);
        let msg = {
            f: this.userId,
            unencryptedContents: contents,
        };
        if (options) {
            if (options.sendTo)
                msg.t = options.sendTo;
            if (options.subChannel)
                throw new SBError(`wrapMessage(): subChannel not yet supported`);
            if (options.ttl !== undefined)
                msg.ttl = options.ttl;
            if (options.sendString) {
                _sb_assert(typeof contents === 'string', "[packageMessage] sendString is true, but contents is not a string");
                _sb_assert(options.ttl === undefined || options.ttl === 0, `[packageMessage] sendString implies TTL=0 (we got ${options.ttl})`);
                msg.ttl = 0;
                msg.stringMessage = true;
            }
        }
        if (msg.stringMessage !== true) {
            msg.protocol = options.protocol ? options.protocol : this.protocol;
            if (msg.ttl === undefined)
                msg.ttl = 15;
            if (!msg.salt)
                msg.salt = crypto.getRandomValues(new Uint8Array(16)).buffer;
            if (!msg.iv)
                msg.iv = crypto.getRandomValues(new Uint8Array(12));
        }
        return msg;
    }
    async finalizeMessage(msg) {
        if (!msg.ts)
            msg.ts = await Snackabra.dateNow();
        _sb_assert(!(msg.stringMessage === true), "[Channel.finalizeMessage()] stringMessage is true, finalizing should not be called (internal error)");
        const payload = assemblePayload(msg.unencryptedContents);
        _sb_assert(payload, "wrapMessage(): failed to assemble payload");
        _sb_assert(payload.byteLength < MAX_SB_BODY_SIZE, `[Channel.finalizeMessage]: body must be smaller than ${MAX_SB_BODY_SIZE / 1024} KiB (we got ${payload.byteLength / 1024} KiB)})`);
        msg.ts = await Snackabra.dateNow();
        const view = new DataView(new ArrayBuffer(8));
        view.setFloat64(0, msg.ts);
        _sb_assert(msg.protocol, "[Channel.finalizeMessage()] Protocol not set (internal error)");
        msg.c = await sbCrypto.encrypt(payload, await msg.protocol.encryptionKey(msg), { iv: msg.iv, additionalData: view });
        msg.s = await sbCrypto.sign(this.signKey, msg.c);
        return stripChannelMessage(msg);
    }
    #_send(msg) {
        return new Promise(async (resolve, reject) => {
            await this.ready;
            const content = msg.stringMessage === true
                ? msg.unencryptedContents
                : await this.finalizeMessage(msg);
            await this.callApi('/send', content)
                .then((rez) => { resolve(rez); })
                .catch((e) => { reject(e); });
        });
    }
    async send(contents, options = {}) {
        return new Promise(async (resolve, reject) => {
            if (DBG2)
                console.log(SEP, "[Channel.send] called.", SEP, "contents:\n", contents);
            const msg = this.packageMessage(contents, options);
            if (DBG2)
                console.log(SEP, "packed message:\n", msg);
            if (DBG0 && msg.ttl !== undefined)
                console.log(SEP, "enqueuing message with TTL value: ", msg.ttl, SEP);
            this.sendQueue.enqueue({
                msg: msg,
                resolve: resolve,
                reject: reject,
                _send: this.#_send.bind(this),
                retryCount: options.retries !== undefined ? options.retries : 0
            });
            if (DBG2)
                console.log(SEPx);
        });
    }
    create(storageToken, channelServer = this.channelServer) {
        if (DBG)
            console.log("==== Channel.create() called with storageToken:", storageToken, "and channelServer:", channelServer);
        _sb_assert(storageToken !== null, '[Channel.create] Missing storage token');
        if (channelServer)
            this.channelServer = channelServer;
        _sb_assert(this.channelServer, '[Channel.create] Missing channel server (neither provided nor in channelKeys)');
        return new Promise(async (resolve, reject) => {
            await this.channelReady;
            this.channelData.storageToken = validate_SBStorageToken(storageToken);
            if (DBG)
                console.log("Will try to create channel with channelData:", this.channelData);
            this.callApi('/budd', this.channelData)
                .then(() => {
                this.channelServer = channelServer;
                _sb_assert(this.channelData && this.channelData.channelId && this.userPrivateKey, 'Internal Error [L2546]');
                resolve(this);
            }).catch((e) => { reject("Channel.create() failed: " + WrapError(e)); });
        });
    }
    getLastMessageTimes() {
        throw new SBError("Channel.getLastMessageTimes(): deprecated");
    }
    getLatestTimestamp() {
        return this.callApi('/getLatestTimestamp');
    }
    async messageQueueManager() {
        if (DBG)
            console.log(SEP, "[messageQueueManager] Channel message queue is starting up", SEP);
        await this.ready;
        if (DBG)
            console.log(SEP, "[messageQueueManager] ... continuing to start up", SEP);
        let keepRunning = true;
        while (keepRunning) {
            await this.sendQueue.dequeue()
                .then(async (qMsg) => {
                if (DBG2)
                    console.log(SEP, "[messageQueueManager] ... pulled 'msg' from queue:\n", qMsg?.msg.unencryptedContents, SEP);
                if (qMsg) {
                    if (DBG2)
                        console.log(SEP, "[messageQueueManager] Channel message queue is calling '_send' on message\n", qMsg.msg.unencryptedContents);
                    if (DBG2)
                        console.log(qMsg.msg);
                    let latestError = null;
                    while (qMsg.retryCount-- >= 0) {
                        if (DBG2)
                            console.log(SEP, "[messageQueueManager] ... trying message send (", qMsg.retryCount, "retries left)\n", qMsg.msg.unencryptedContents, SEP);
                        try {
                            const ret = await qMsg._send(qMsg.msg);
                            if (DBG2)
                                console.log(SEP, "[messageQueueManager] Got response from registered '_send':\n", ret, SEP);
                            qMsg.resolve(ret);
                            break;
                        }
                        catch (e) {
                            if (DBG2)
                                console.log(SEP, "[messageQueueManager] Got exception from '_send' operation, might retry", e, SEP);
                            latestError = '[ERROR] ' + e;
                        }
                    }
                    qMsg.reject(latestError);
                }
                else {
                    if (DBG2)
                        console.log("[messageQueueManager] Channel message queue is empty and closed");
                    keepRunning = false;
                }
            })
                .catch((e) => {
                if (e === 'shutDown') {
                    if (DBG2)
                        console.log("[messageQueueManager] Channel message queue is shutting down");
                    return;
                }
                else {
                    if (DBG2)
                        console.error("[messageQueueManager] Channel message queue is shutting down with error:", e);
                    throw new SBError("[messageQueueManager] Channel message queue is shutting down with error: " + e.message);
                }
            });
        }
    }
    async close() {
        if (DBG)
            console.log("[Channel.close] called (will drain queue)");
        this.isClosed = true;
        await this.sendQueue.drain('shutDown');
    }
    getMessageKeys(prefix = '0') {
        return new Promise(async (resolve, _reject) => {
            await this.channelReady;
            _sb_assert(this.channelId, "Channel.getMessageKeys: no channel ID (?)");
            const { keys, historyShard } = (await this.callApi('/getMessageKeys', { prefix: prefix }));
            if (DBG)
                console.log("getMessageKeys\n", keys);
            if (!keys || keys.size === 0)
                console.warn("[Channel.getMessageKeys] Warning: no messages (empty/null response); not an error but perhaps unexpected?");
            resolve({ keys, historyShard });
        });
    }
    getRawMessageMap(messageKeys) {
        if (DBG)
            console.log("[getRawMessageMap] called with messageKeys:", messageKeys);
        if (messageKeys.size === 0)
            throw new SBError("[getRawMessageMap] no message keys provided");
        return new Promise(async (resolve, _reject) => {
            await this.channelReady;
            _sb_assert(this.channelId, "[getRawMessageMap] no channel ID (?)");
            const messagePayloads = await this.callApi('/getMessages', messageKeys);
            _sb_assert(messagePayloads, "[getRawMessageMap] no messages (empty/null response)");
            if (DBG2)
                console.log(SEP, SEP, "[getRawMessageMap] - here are the raw ones\n", messagePayloads, SEP, SEP);
            resolve(messagePayloads);
        });
    }
    getMessageMap(messageKeys) {
        if (DBG)
            console.log("Channel.getDecryptedMessages() called with messageKeys:", messageKeys);
        if (messageKeys.size === 0)
            throw new SBError("[getMessageMap] no message keys provided");
        return new Promise(async (resolve, _reject) => {
            await this.channelReady;
            const messagePayloads = await this.callApi('/getMessages', messageKeys);
            const messages = new Map();
            for (const [k, v] of messagePayloads) {
                try {
                    messages.set(k, validate_ChannelMessage(extractPayload(v).payload));
                }
                catch (e) {
                    if (DBG)
                        console.warn(SEP, "[getMessageMap] Failed extract and/or to validate message:", SEP, v, SEP, e, SEP);
                }
            }
            resolve(await this.extractMessageMap(messages));
        });
    }
    getHistory() {
        return new Promise(async (resolve, _reject) => {
            await this.channelReady;
            _sb_assert(this.channelId, "Channel.getHistory: no channel ID (?)");
            const response = await this.callApi('/getHistory');
            resolve(response);
        });
    }
    setPage(options) {
        var { page, prefix, type } = options;
        _sb_assert(page, "Channel.setPage: no page (contents) provided");
        prefix = prefix || 12;
        type = type || 'sb384payloadV3';
        if (type) {
            return this.callApi('/setPage', {
                page: page,
                type: type,
                prefix: prefix,
            });
        }
        else {
            return this.callApi('/setPage', page);
        }
    }
    async getPage() {
        const prefix = this.hashB32;
        if (DBG)
            console.log(`==== ChannelApi.getPage: calling fetch with: ${prefix}`);
        const page = await sbFetch(this.channelServer + '/api/v2/page/' + prefix)
            .catch((e) => { throw new SBError(`[Channel.getPage] fetch failed: ${e}`); });
        const contentType = page.headers.get('content-type');
        if (contentType !== 'sb384payloadV3')
            throw new SBError("[Channel.getPage] Can only handle 'sb384payloadV3' content type, use 'fetch()'");
        const buf = await page.arrayBuffer();
        return extractPayload(buf).payload;
    }
    acceptVisitor(userId) { return this.callApi('/acceptVisitor', { userId: userId }); }
    getCapacity() { return (this.callApi('/getCapacity')); }
    getAdminData() { return this.callApi('/getAdminData'); }
    getMother() {
        return this.getAdminData().then((adminData) => {
            return adminData.motherChannel;
        });
    }
    isLocked() {
        return this.getAdminData().then((adminData) => {
            return adminData.locked;
        });
    }
    lock() { return this.callApi('/lockChannel'); }
    updateCapacity(capacity) { return this.callApi('/setCapacity', { capacity: capacity }); }
    getChannelKeys() { return this.callApi('/getChannelKeys'); }
    getPubKeys() { return this.callApi('/getPubKeys'); }
    getStorageLimit() { return (this.callApi('/getStorageLimit')); }
    async getStorageToken(size) { return validate_SBStorageToken(await this.callApi('/getStorageToken', { size: size })); }
    budd(options) {
        return new Promise(async (resolve, reject) => {
            var { targetChannel, size } = options || {};
            if (!targetChannel) {
                targetChannel = (await new Channel().ready).handle;
                if (DBG)
                    console.log("\n", SEP, "[budd()]: no target channel provided, using new channel:\n", SEP, targetChannel, "\n", SEP);
            }
            else if (this.channelId === targetChannel.channelId) {
                reject(new Error("[budd()]: source and target channels are the same, probably an error"));
                return;
            }
            if (!size)
                size = NEW_CHANNEL_MINIMUM_BUDGET;
            if (size !== Infinity && Math.abs(size) > await this.getStorageLimit()) {
                reject(new Error(`[budd()]: storage amount (${size}) is more than current storage limit`));
                return;
            }
            const targetChannelData = targetChannel.channelData;
            if (!targetChannelData) {
                reject(new Error(`[budd()]: target channel has no channel data, probably an error`));
                return;
            }
            try {
                targetChannelData.storageToken = await this.getStorageToken(size);
                if (DBG)
                    console.log(`[budd()]: requested ${size}, got storage token:`, targetChannelData.storageToken);
                const targetChannelApi = await new Channel(targetChannel).ready;
                if (!targetChannelApi.channelServer)
                    targetChannelApi.channelServer = this.channelServer;
                const newChannelData = validate_SBChannelData(await targetChannelApi.callApi('/budd', targetChannelData));
                if (targetChannel.channelId !== newChannelData.channelId) {
                    console.warn("[budd()]: target channel ID changed, should not happen, error somewhere\n", SEP);
                    console.warn("targetChannel:", targetChannel, "\n", SEP);
                    console.warn("newChannelData:", newChannelData, "\n", SEP);
                    reject(new Error(`[budd()]: target channel ID changed, should not happen, error somewhere`));
                    return;
                }
                if (!newChannelData.storageToken)
                    console.warn("[budd()]: target channel has no storage token, possibly an error, should be returned from server");
                const newHandle = {
                    [SB_CHANNEL_HANDLE_SYMBOL]: true,
                    channelId: newChannelData.channelId,
                    userPrivateKey: targetChannel.userPrivateKey,
                    channelServer: this.channelServer,
                    channelData: newChannelData
                };
                if (DBG)
                    console.log("[budd()]: success, newHandle:", newHandle);
                resolve(validate_SBChannelHandle(newHandle));
            }
            catch (e) {
                reject('[budd] Could not get storage token from server, are you sure about the size?');
                return;
            }
        });
    }
    static LOWEST_TIMESTAMP = '0'.repeat(26);
    static HIGHEST_TIMESTAMP = '3'.repeat(26);
    static timestampToBase4String(tsNum) {
        return tsNum.toString(4).padStart(22, "0") + "0000";
    }
    static base4stringToDate(tsStr) {
        const ts = parseInt(tsStr.slice(0, -4), 4);
        return new Date(ts).toISOString();
    }
    static getLexicalExtremes(set) {
        if (set.size === 0)
            return [];
        let min, max = min = set.values().next().value;
        for (const value of set) {
            if (value < min)
                min = value;
            if (value > max)
                max = value;
        }
        return [min, max];
    }
    static messageKeySetToPrefix = (keys) => {
        if (keys.size === 0)
            return '0';
        const [lowest, highest] = Channel.getLexicalExtremes(keys);
        _sb_assert(lowest && highest, "[timestampLongestPrefix]: no lowest or highest (internal error?)");
        const { timestamp: s1 } = Channel.deComposeMessageKey(lowest);
        const { timestamp: s2 } = Channel.deComposeMessageKey(highest);
        let i = 0;
        while (i < s1.length && i < s2.length && s1[i] === s2[i])
            i++;
        return s1.substring(0, i);
    };
    static timestampLongestPrefix = (s1, s2) => {
        if (s1 && s2 && typeof s1 === 'string' && typeof s2 === 'string' && s1.length === 26 && s2.length === 26) {
            let i = 0;
            while (i < s1.length && i < s2.length && s1[i] === s2[i])
                i++;
            return s1.substring(0, i);
        }
        else
            throw new SBError(`[timestampLongestPrefix]: invalid input:\n '${s1}' or '${s2}'`);
    };
    static timestampRegex = /^[0-3]{26}$/;
    static base4StringToTimestamp(tsStr) {
        if (!tsStr || typeof tsStr !== 'string' || tsStr.length !== 26 || !Channel.timestampRegex.test(tsStr))
            return 0;
        return parseInt(tsStr.slice(0, -4), 4);
    }
    static base4StringToDate(tsStr) {
        const ts = Channel.base4StringToTimestamp(tsStr);
        if (ts)
            return new Date(ts).toISOString();
        else
            return '';
    }
    static deComposeMessageKey(key) {
        const regex = /^([a-zA-Z0-9]{43})_([_a-zA-Z0-9]{4})_([0-3]{26})$/;
        const match = key.match(regex);
        if (match && match.length >= 4)
            return { channelId: match[1], i2: match[2], timestamp: match[3] };
        else
            return { channelId: '', i2: '', timestamp: '' };
    }
    static composeMessageKey(channelId, timestamp, subChannel = '____') {
        return `${channelId}_${subChannel ?? '____'}_${Channel.timestampToBase4String(timestamp)}`;
    }
}
__decorate([
    Memoize,
    Ready
], Channel.prototype, "api", null);
__decorate([
    Ready
], Channel.prototype, "getLatestTimestamp", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "setPage", null);
__decorate([
    Ready
], Channel.prototype, "getPage", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "acceptVisitor", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "getCapacity", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "getAdminData", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "getMother", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "isLocked", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "lock", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "updateCapacity", null);
__decorate([
    Ready,
    Memoize
], Channel.prototype, "getChannelKeys", null);
__decorate([
    Ready
], Channel.prototype, "getPubKeys", null);
__decorate([
    Ready
], Channel.prototype, "getStorageLimit", null);
__decorate([
    Ready
], Channel.prototype, "getStorageToken", null);
__decorate([
    Ready,
    Owner
], Channel.prototype, "budd", null);
const WEBSOCKET_MESSAGE_TIMEOUT = 20000;
const WEBSOCKET_SETUP_TIMEOUT = 2000;
const WEBSOCKET_RETRY_COUNT = 3;
const WEBSOCKET_PING_INTERVAL = 1000;
class ChannelSocket extends Channel {
    channelSocketReady;
    static ReadyFlag = Symbol('ChannelSocketReadyFlag');
    #ws;
    #socketServer;
    onMessage = (_m) => { _sb_assert(false, "[ChannelSocket] NO MESSAGE HANDLER"); };
    #ack = new Map();
    #ackTimer = new Map();
    #traceSocket = false;
    lastTimestampPrefix = '0'.repeat(26);
    #pingInterval = 0;
    constructor(handleOrKey, onMessage, protocol) {
        _sb_assert(onMessage, '[ChannelSocket] constructor: no onMessage handler provided');
        if (typeof handleOrKey === 'string') {
            super(handleOrKey, protocol);
        }
        else {
            const handle = validate_SBChannelHandle(handleOrKey);
            super(handle, protocol);
            if (handle.channelServer)
                this.channelServer = handle.channelServer;
        }
        if (!this.channelServer)
            this.channelServer = Snackabra.defaultChannelServer;
        this[_a.ReadyFlag] = false;
        this.#socketServer = this.channelServer.replace(/^http/, 'ws');
        this.onMessage = onMessage;
        this.channelSocketReady = this.#channelSocketReadyFactory();
    }
    #setupPing() {
        if (DBG0)
            console.log(SEP, "[ChannelSocket] Setting up 'ping' messages ... ", SEP);
        this.#pingInterval = setInterval(() => {
            if (this.isClosed) {
                console.error("[ChannelSocket] we are closed, removing ping interval");
                return;
            }
            Snackabra.haveNotHeardFromServer();
        }, WEBSOCKET_PING_INTERVAL * 0.5);
        this.#ws.websocket.send('ping');
    }
    #channelSocketReadyFactory() {
        return new Promise(async (resolve, reject) => {
            if (DBG)
                console.log("++++ STARTED ChannelSocket.readyPromise()");
            await this.sbChannelKeysReady;
            const url = this.#socketServer + '/api/v2/channel/' + this.channelId + '/websocket';
            this.#ws = {
                url: url,
                ready: false,
                closed: false,
                timeout: WEBSOCKET_MESSAGE_TIMEOUT
            };
            if (!this.#ws.websocket || this.#ws.websocket.readyState === 3 || this.#ws.websocket.readyState === 2) {
                if (this.#ws.websocket) {
                    console.warn("[ChannelSocket] websocket is in a bad state, closing it ... will await");
                    await closeSocket(this.#ws.websocket);
                    Snackabra.addChannelSocket(this);
                }
                const apiBodyBuf = assemblePayload(await this.buildApiBody(url));
                _sb_assert(apiBodyBuf, "Internal Error [L3598]");
                this.#ws.websocket = new WebSocket(url + "?apiBody=" + arrayBufferToBase62(apiBodyBuf));
                Snackabra.addChannelSocket(this);
            }
            if (DBG)
                console.log(SEP, "++++ readyPromise() - setting up websocket message listener", SEP);
            const thisWsWebsocket = this.#ws.websocket;
            const initialListener = async (e) => {
                if (!e.data) {
                    if (DBG0 || DBG)
                        console.error("[ChannelSocket] received empty message");
                    reject("[ChannelSocket] received empty message (should be a 'ready' message)");
                }
                let serverReadyMessage = null;
                if (typeof e.data === 'string') {
                    serverReadyMessage = jsonParseWrapper(e.data, "L3909");
                }
                else if (e.data instanceof ArrayBuffer) {
                    serverReadyMessage = extractPayload(e.data).payload;
                }
                else if (e.data instanceof Blob) {
                    serverReadyMessage = extractPayload(await e.data.arrayBuffer()).payload;
                }
                else {
                    _sb_exception("L3987", "[ChannelSocket] received something other than string or ArrayBuffer");
                }
                if (serverReadyMessage) {
                    if (serverReadyMessage.ready) {
                        if (DBG0 || DBG)
                            console.log("++++ readyPromise() - received ready message, switching to main message processor:\n", e.data);
                        if (serverReadyMessage.latestTimestamp) {
                            this.lastTimestampPrefix = serverReadyMessage.latestTimestamp;
                            if (DBG2)
                                console.log("++++ readyPromise() - received latestTimestamp:", this.lastTimestampPrefix);
                        }
                        else
                            console.warn("[ChannelSocket] received 'ready' message without 'latestTimestamp'");
                        thisWsWebsocket.removeEventListener('message', initialListener);
                        thisWsWebsocket.addEventListener('message', this.#processMessage);
                        this.#setupPing();
                        this[_a.ReadyFlag] = true;
                        resolve(this);
                    }
                    else {
                        reject("[ChannelSocket] received something other than 'ready' as first message:\n" + JSON.stringify(e.data));
                    }
                }
                else {
                    const msg = "[ChannelSocket] received empty message, or could not parse it (should be a 'ready' message)";
                    if (DBG0 || DBG)
                        console.error(msg);
                    reject(msg);
                }
            };
            this.#ws.websocket.addEventListener('message', initialListener);
            let resolveTimeout = setTimeout(() => {
                if (!this[_a.ReadyFlag]) {
                    const msg = "[ChannelSocket] Socket not resolving after waiting, fatal.";
                    console.warn(msg);
                    reject(msg);
                }
                else {
                    if (DBG2)
                        console.log("[ChannelSocket] resolved correctly", this);
                }
            }, WEBSOCKET_SETUP_TIMEOUT);
            this.#ws.websocket.addEventListener('open', async () => {
                this.#ws.closed = false;
                if (resolveTimeout) {
                    clearTimeout(resolveTimeout);
                    resolveTimeout = undefined;
                }
                await this.ready;
                if (DBG)
                    console.log("++++++++ readyPromise() sending init");
                this.#ws.websocket.send('ready');
                if (DBG)
                    console.log("++++++++ readyPromise() ... no immediate errors for init");
            });
            this.#ws.websocket.addEventListener('close', (e) => {
                this.#ws.closed = true;
                if (!e.wasClean) {
                    console.log(`[ChannelSocket] closed but NOT cleanly: ${e.reason} from ${this.channelServer}`);
                }
                else {
                    if (e.reason.includes("does not have an owner"))
                        reject(`No such channel on this server (${this.channelServer})`);
                    else
                        console.log('[ChannelSocket] Closed (cleanly), with reason: ', e.reason);
                }
                reject('wbSocket() closed before it was opened (?)');
            });
            this.#ws.websocket.addEventListener('error', (e) => {
                this.#ws.closed = true;
                if (DBG)
                    console.log('[ChannelSocket] Error: ', e);
                reject('[ChannelSocket] Websocket error event ' + e);
            });
        });
    }
    #processMessage = async (e) => {
        _sb_assert(!this.errorState, "[ChannelSocket] in error state (Internal Error L4018)");
        const msg = e.data;
        if (DBG2)
            console.log(SEP, "[ChannelSocket] Received socket message:\n", msg, SEP);
        var message = null;
        _sb_assert(msg, "[ChannelSocket] received empty message");
        Snackabra.heardFromServer();
        if (typeof msg === 'string') {
            const _message = jsonOrString(msg);
            if (!_message)
                _sb_exception("L3287", "[ChannelSocket] Cannot parse message: " + msg);
            if (typeof _message === 'string') {
                if (Channel.timestampRegex.test(_message)) {
                    if (DBG2)
                        console.log("[ChannelSocket] Received 'latestTimestamp' message:", _message);
                    Snackabra.heardFromServer();
                    if (_message > this.lastTimestampPrefix) {
                        if (DBG0)
                            console.log(SEP, "[ChannelSocket] Received newer timestamp, will request those messages", SEP);
                        this.#ws.websocket.send(this.lastTimestampPrefix);
                    }
                    setTimeout(() => {
                        if (this.#ws.closed)
                            return;
                        if (DBG2)
                            console.log("[ChannelSocket] Sending 'ping' (timestamp request) message.");
                        this.#ws.websocket.send('ping');
                    }, WEBSOCKET_PING_INTERVAL);
                    return;
                }
                else {
                    if (DBG0 || DBG2)
                        console.log("[ChannelSocket] Received simple string message, will forward\n", _message);
                    this.onMessage(_message);
                    return;
                }
            }
            else {
                if (DBG0 || DBG)
                    console.log("[ChannelSocket] Received unrecognized 'string' message, will discard:\n", _message);
                this.#ws.websocket.send(assemblePayload({ error: `Cannot parse 'string' message (''${_message})` }));
                return;
            }
        }
        else if (msg instanceof ArrayBuffer) {
            message = extractPayload(msg).payload;
        }
        else if (msg instanceof Blob) {
            message = extractPayload(await msg.arrayBuffer()).payload;
        }
        else {
            this.#ws.websocket.send(assemblePayload({ error: `Received unknown 'type' of message (??)` }));
            return;
        }
        _sb_assert(message, "[ChannelSocket] cannot extract message");
        if (message.ready) {
            if (DBG0 || DBG)
                console.log("++++++++ #processMessage: received ready message\n", message);
            return;
        }
        if (message.error) {
            console.error("++++++++ #processMessage: received error message\n", message);
            return;
        }
        message = validate_ChannelMessage(message);
        if (DBG2)
            console.log(SEP, "[ChannelSocket] Received (extracted/validated) socket message:\n", message, "\n", SEP);
        if (!message.channelId)
            message.channelId = this.channelId;
        _sb_assert(message.channelId === this.channelId, "[ChannelSocket] received message for wrong channel?");
        if (this.#traceSocket)
            console.log("[ChannelSocket] Received socket message:", message);
        _sb_assert(message.c && message.c instanceof ArrayBuffer, "[ChannelSocket] Internal Error (L3675)");
        const hash = await crypto.subtle.digest('SHA-256', message.c);
        const ack_id = arrayBufferToBase64url(hash);
        if (DBG)
            console.log("[ChannelSocket] Received message with hash:", ack_id);
        const r = this.#ack.get(ack_id);
        if (r) {
            if (DBG || this.#traceSocket)
                console.log(`++++++++ #processMessage: found matching ack for id ${ack_id}`);
            this.#ack.delete(ack_id);
            r("success");
        }
        const t = this.#ackTimer.get(ack_id);
        if (t) {
            if (DBG2 || this.#traceSocket)
                console.log(`++++++++ #processMessage: clearing matching ack timeout for id ${ack_id}`);
            clearTimeout(t);
            this.#ackTimer.delete(ack_id);
        }
        if (DBG2)
            console.log("[ChannelSocket] New message, client andserver time stamp: ", message.sts);
        const m = await this.extractMessage(message);
        if (m) {
            if (DBG)
                console.log("[ChannelSocket] Repackaged and will deliver 'Message':", m);
            this.onMessage(m);
        }
        else {
            if (DBG)
                console.log("[ChannelSocket] Message could not be parsed, will not deliver");
        }
    };
    get ready() {
        _sb_assert(!this.errorState, "[ChannelSocket] in error state (Internal Error L4104)");
        _sb_assert(!this.isClosed, "[ChannelSocket] We are closed, blocking on'ready' will reject");
        return this.channelSocketReady;
    }
    get ChannelSocketReadyFlag() { return this[_a.ReadyFlag]; }
    get status() {
        if (!this.#ws || !this.#ws.websocket)
            return 'CLOSED';
        else
            switch (this.#ws.websocket.readyState) {
                case 0: return 'CONNECTING';
                case 1: return 'OPEN';
                case 2: return 'CLOSING';
                default: return 'CLOSED';
            }
    }
    set enableTrace(b) {
        this.#traceSocket = b;
        if (b)
            console.log("==== jslib ChannelSocket: Tracing enabled ====");
    }
    #_send(msg) {
        _sb_assert(!this.errorState, "[ChannelSocket] in error state (Internal Error L4130)");
        if (DBG2)
            console.log("[ChannelSocket] #_send() called");
        return new Promise(async (resolve, reject) => {
            if (DBG2)
                console.log(SEP, "++++++++ [ChannelSocket.#_send()] called, will return promise to send:", msg.unencryptedContents, SEP);
            if (this.#ws.closed) {
                if (DBG2)
                    console.error("[ChannelSocket] #_send() to a CLOSED socket");
                reject('<websocket closed>');
                return;
            }
            if (msg.stringMessage === true) {
                try {
                    const contents = msg.unencryptedContents;
                    if (DBG2)
                        console.log("[ChannelSocket] actually sending string message:", contents);
                    this.#ws.websocket.send(contents);
                    resolve("success");
                }
                catch (e) {
                    reject(`<websocket error upon send() of a string message: ${e}>`);
                    return;
                }
            }
            else {
                msg = await this.finalizeMessage(msg);
                const messagePayload = assemblePayload(msg);
                if (!messagePayload) {
                    reject("ChannelSocket.send(): no message payload (Internal Error)");
                    return;
                }
                const hash = await crypto.subtle.digest('SHA-256', msg.c);
                const messageHash = arrayBufferToBase64url(hash);
                if (DBG2 || this.#traceSocket)
                    console.log("++++++++ ChannelSocket.send(): Which has hash:", messageHash);
                this.#ack.set(messageHash, resolve);
                this.#ackTimer.set(messageHash, setTimeout(async () => {
                    if (this.#ack.has(messageHash)) {
                        this.#ack.delete(messageHash);
                        if (Snackabra.isShutdown) {
                            reject("shutDown");
                            return;
                        }
                        if (DBG)
                            console.error(`[ChannelSocket] websocket request timed out (no ack) after ${this.#ws.timeout}ms (${messageHash})`);
                        reject(`<websocket request timed out (no ack) after ${this.#ws.timeout}ms (${messageHash})>`);
                        return;
                    }
                    else {
                        if (DBG || this.#traceSocket)
                            console.log("++++++++ ChannelSocket.send() completed sending");
                        resolve("<received ACK, success, message sent and mirrored back>");
                    }
                }, this.#ws.timeout));
                if (DBG2)
                    console.log("[ChannelSocket] actually sending message:", messagePayload);
                try {
                    if (DBG2)
                        console.log("[ChannelSocket] actually sending message:", messagePayload);
                    this.#ws.websocket.send(messagePayload);
                }
                catch (e) {
                    console.error("Failed to send on socket:\n", e, '\n', new Error().stack);
                    reject(`<websocket error upon send() of a message: ${e}>`);
                    return;
                }
            }
        });
    }
    async send(contents, options) {
        if (DBG2)
            console.log("++++ ChannelSocket.send() called ...");
        await this.ready;
        _sb_assert(this.#ws && this.#ws.websocket, "[ChannelSocket.send()] called before ready");
        if (DBG2)
            console.log(SEP, "[ChannelSocket] sending, contents:\n", JSON.stringify(contents), SEP);
        if (this.#ws.closed) {
            if (this.#traceSocket)
                console.info("send() triggered reset of #readyPromise() (normal)");
            this.channelSocketReady = this.#channelSocketReadyFactory();
            this[_a.ReadyFlag] = false;
        }
        return new Promise(async (resolve, reject) => {
            if (!this.ChannelSocketReadyFlag)
                reject("ChannelSocket.send() is NOT ready, perhaps it's resetting?");
            const readyState = this.#ws.websocket.readyState;
            switch (readyState) {
                case 1:
                    this.sendQueue.enqueue({
                        msg: this.packageMessage(contents, options),
                        resolve: resolve,
                        reject: reject,
                        _send: this.#_send.bind(this),
                        retryCount: WEBSOCKET_RETRY_COUNT
                    });
                    break;
                case 0:
                case 2:
                case 3:
                    const errMsg = `[ChannelSocket.send()] Tried sending but socket not OPEN - it is ${readyState === 0 ? 'CONNECTING' : readyState === 2 ? 'CLOSING' : 'CLOSED'}`;
                    reject(errMsg);
                    break;
                default:
                    _sb_exception('ChannelSocket', `socket in unknown state (${readyState})`);
            }
        });
    }
    reset() {
        if (DBG0)
            console.trace("++++ ChannelSocket.reset() called ... for ChannelID:", this.channelId);
        if (this.#ws && this.#ws.websocket) {
            if (this.#ws.websocket.readyState === 1) {
                this.#ws.websocket.close();
            }
            this.#ws.closed = true;
            Snackabra.removeChannelSocket(this);
            this.channelSocketReady = this.#channelSocketReadyFactory();
        }
    }
    async close() {
        if (DBG0 || DBG)
            console.log("++++ ChannelSocket.close() called ... closing down stuff ...");
        this.isClosed = true;
        clearInterval(this.#pingInterval);
        if (this.#ws && this.#ws.websocket && this.#ws.websocket.readyState === 1) {
            if (DBG0)
                console.log("++++ ChannelSocket.close() ... sending close message ...");
            this.#ws.websocket.send('close');
        }
        else {
            if (DBG0)
                console.log("++++ ChannelSocket.close() ... no open socket to send close message ...", this.#ws?.websocket);
        }
        await super.close();
        Snackabra.removeChannelSocket(this);
        this[_a.ReadyFlag] = false;
    }
}
_a = ChannelSocket;
__decorate([
    VerifyParameters
], ChannelSocket.prototype, "send", null);
function validate_Shard(s) {
    if (!s)
        throw new SBError(`invalid SBObjectHandle (null or undefined)`);
    else if (s.version === '3'
        && (typeof s.id === 'string' && s.id.length === 43 && b62regex.test(s.id))
        && (s.iv instanceof Uint8Array && s.iv.byteLength === 12)
        && (s.salt instanceof ArrayBuffer && s.salt.byteLength === 16)
        && (s.data instanceof ArrayBuffer && s.actualSize === s.data.byteLength))
        return s;
    else
        throw new SBError(`invalid Shard`);
}
export class StorageApi {
    #storageServer;
    constructor(stringOrPromise) {
        this.#storageServer = Promise.resolve(stringOrPromise).then((s) => {
            const storageServer = s;
            _sb_assert(typeof storageServer === 'string', 'StorageApi() constructor requires a string (for storageServer)');
            return storageServer;
        });
    }
    async getStorageServer() { return this.#storageServer; }
    static padBuf(buf) {
        const dataSize = buf.byteLength;
        let _target;
        if ((dataSize + 4) < 4096)
            _target = 4096;
        else if ((dataSize + 4) < 1048576)
            _target = 2 ** Math.ceil(Math.log2(dataSize + 4));
        else
            _target = (Math.ceil((dataSize + 4) / 1048576)) * 1048576;
        let finalArray = _appendBuffer(buf, (new Uint8Array(_target - dataSize)).buffer);
        (new DataView(finalArray)).setUint32(_target - 4, dataSize);
        if (DBG2)
            console.log("padBuf bytes:", finalArray.slice(-4));
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
    static getObjectKey(fileHashBuffer, salt) {
        return new Promise((resolve, reject) => {
            try {
                sbCrypto.importKey('raw', fileHashBuffer, 'PBKDF2', false, ['deriveBits', 'deriveKey']).then((keyMaterial) => {
                    crypto.subtle.deriveKey({
                        'name': 'PBKDF2',
                        'salt': salt,
                        'iterations': 100000,
                        'hash': 'SHA-256'
                    }, keyMaterial, { 'name': 'AES-GCM', 'length': 256 }, true, ['encrypt', 'decrypt'])
                        .then((key) => {
                        resolve(key);
                    });
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }
    async storeData(contents, budgetSource) {
        try {
            const buf = assemblePayload(contents);
            if (!buf)
                throw new SBError("[storeData] failed to assemble payload");
            const bufSize = buf.byteLength;
            const paddedBuf = _b.padBuf(buf);
            const fullHash = await sbCrypto.generateIdKey(paddedBuf);
            const storageServer = await this.getStorageServer();
            const requestQuery = storageServer + '/api/v2/storeRequest?id=' + arrayBufferToBase62(fullHash.idBinary);
            const keyInfo = await SBApiFetch(requestQuery);
            if (!keyInfo.salt || !keyInfo.iv)
                throw new SBError('[storeData] Failed to get key info (salt, nonce) from storage server');
            const id = arrayBufferToBase62(fullHash.idBinary);
            const key = await _b.getObjectKey(fullHash.keyMaterial, keyInfo.salt);
            const encryptedData = await sbCrypto.encrypt(paddedBuf, key, { iv: keyInfo.iv });
            let storageToken;
            if (budgetSource instanceof Channel) {
                storageToken = await budgetSource.getStorageToken(encryptedData.byteLength);
            }
            else if (_check_SBChannelHandle(budgetSource)) {
                storageToken = await (await new Channel(budgetSource).ready).getStorageToken(encryptedData.byteLength);
            }
            else if (_check_SBStorageToken(budgetSource)) {
                storageToken = validate_SBStorageToken(budgetSource);
            }
            else {
                throw new SBError("[storeData] invalid budget source (needs to be a channel, channel handle, or storage token)");
            }
            const storeQuery = storageServer + '/api/v2/storeData?id=' + id;
            const init = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream"',
                },
                body: assemblePayload({
                    id: id,
                    iv: keyInfo.iv,
                    salt: keyInfo.salt,
                    storageToken: storageToken,
                    data: encryptedData
                })
            };
            console.log("5555 5555 [storeData] storeQuery:", SEP, storeQuery, SEP);
            const result = await SBApiFetch(storeQuery, init);
            const r = {
                [SB_OBJECT_HANDLE_SYMBOL]: true,
                version: currentSBOHVersion,
                id: id,
                key: arrayBufferToBase62(fullHash.keyMaterial),
                iv: keyInfo.iv,
                salt: keyInfo.salt,
                actualSize: bufSize,
                verification: result.verification,
                storageServer: storageServer,
            };
            if (DBG)
                console.log("storeData() - success, handle:", r, encryptedData);
            return (r);
        }
        catch (error) {
            console.error("[storeData] failed:", error);
            if (error instanceof SBError)
                throw error;
            throw new SBError(`[storeData] failed to store data: ${error}`);
        }
    }
    async #_fetchData(useServer, url, h) {
        try {
            let shard = await SBApiFetch(useServer + url, { method: 'GET' });
            shard = validate_Shard(shard);
            _sb_assert(h.key, "object handle 'key' is missing, cannot decrypt");
            h.iv = shard.iv;
            h.salt = shard.salt;
            h.data = new WeakRef(shard.data);
            h.actualSize = shard.actualSize;
            if (DBG2)
                console.log("fetchData(), handle (and data) at this point:", h, shard.data);
            const h_key = base62ToArrayBuffer(h.key);
            const decryptionKey = await _b.getObjectKey(h_key, h.salt);
            const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: h.iv }, decryptionKey, shard.data);
            const buf = this.#unpadData(decryptedData);
            if (DBG2)
                console.log("shard.data (decrypted and unpadded):", buf);
            h.payload = extractPayload(buf).payload;
            h.data = new WeakRef(shard.data);
            return (h);
        }
        catch (error) {
            if (DBG)
                console.log(`fetchData(): trying to get object on '${useServer}' failed: '${error}'`);
            return (null);
        }
    }
    async fetchData(handle) {
        const h = validate_SBObjectHandle(handle);
        if (DBG)
            console.log("fetchData(), handle:", h);
        if (h.data && h.data instanceof WeakRef && h.data.deref())
            return (h);
        const verification = await h.verification;
        const server1 = h.storageServer ? h.storageServer : null;
        const server2 = 'http://localhost:3841';
        const server3 = await this.getStorageServer();
        for (const server of [server1, server2, server3]) {
            if (!server)
                continue;
            if (DBG)
                console.log('\n', SEP, "fetchData(), trying server: ", server, '\n', SEP);
            const queryString = '/api/v2/fetchData?id=' + h.id + '&verification=' + verification;
            const result = await this.#_fetchData(server, queryString, h);
            if (result !== null) {
                if (DBG)
                    console.log(`[fetchData] success: fetched from '${server}'`, result);
                result.storageServer = server;
                return (result);
            }
        }
        throw new SBError(`[fetchData] failed to fetch from any server`);
    }
    static getData(handle) {
        const h = validate_SBObjectHandle(handle);
        if (!h.data)
            return undefined;
        if (h.data instanceof WeakRef) {
            const dref = h.data.deref();
            if (dref)
                return dref;
            else
                return undefined;
        }
        else if (h.data instanceof ArrayBuffer) {
            return h.data;
        }
        else {
            throw new SBError('Invalid data type in handle');
        }
    }
    static getPayload(handle) {
        const h = validate_SBObjectHandle(handle);
        if (h.payload)
            return h.payload;
        const data = _b.getData(h);
        if (!data)
            throw new SBError('[getPayload] no data or payload in handle, use fetchData()');
        return extractPayload(data).payload;
    }
}
_b = StorageApi;
__decorate([
    Memoize
], StorageApi.prototype, "getStorageServer", null);
class EventEmitter {
    static events = {};
    static on(eventName, listener) {
        if (!this.events[eventName])
            this.events[eventName] = [];
        this.events[eventName].push(listener);
    }
    static off(eventName, listener) {
        if (!this.events[eventName])
            return;
        const index = this.events[eventName].indexOf(listener);
        if (index > -1)
            this.events[eventName].splice(index, 1);
    }
    static emit(eventName, ...args) {
        const listeners = this.events[eventName];
        if (!listeners || listeners.length === 0)
            return;
        listeners.forEach(listener => listener(...args));
    }
}
class Snackabra extends EventEmitter {
    #channelServer;
    #storage;
    #version = version;
    #channelServerInfo;
    static lastTimeStamp = 0;
    static activeFetches = new Map();
    static #activeChannelSockets = new Set();
    static isShutdown = false;
    static lastTimestampPrefix = '0'.repeat(26);
    static #latestPing = Date.now();
    static onlineStatus = 'unknown';
    static defaultChannelServer = 'http://localhost:3845';
    constructor(channelServer, options) {
        super();
        console.warn(`==== CREATING Snackabra object generation: ${this.#version} ====`);
        _sb_assert(typeof channelServer === 'string', '[Snackabra] Takes channel server URL as parameter');
        if (channelServer)
            Snackabra.defaultChannelServer = channelServer;
        if (typeof options === 'boolean')
            options = { DEBUG: options };
        if (options && options.DEBUG && options.DEBUG === true)
            DBG = true;
        if (options && DBG && options.DEBUG2 && options.DEBUG2 === true)
            DBG2 = true;
        if (DBG)
            console.warn("++++ Snackabra constructor: setting DBG to TRUE ++++");
        if (DBG2)
            console.warn("++++ Snackabra constructor: ALSO setting DBG2 to TRUE (verbose) ++++");
        if (options && options.sbFetch) {
            console.log("++++ Snackabra constructor: setting custom fetch function ++++");
            sbFetch = options.sbFetch;
        }
        this.#channelServer = channelServer;
        this.#storage = new StorageApi(new Promise((resolve, reject) => {
            if (DBG)
                console.log(`++++ Snackabra constructor: fetching storage server name from '${this.#channelServer + '/api/v2/info'}' ++++`);
            SBApiFetch(this.#channelServer + '/api/v2/info')
                .then((retValue) => {
                if (DBG)
                    console.log("Channel server info:", retValue);
                _sb_assert(retValue.storageServer, 'Channel server did not provide storage server name, cannot initialize');
                this.#channelServerInfo = retValue;
                if (DBG)
                    console.log("Channel server info:", this.#channelServerInfo);
                resolve(retValue.storageServer);
            })
                .catch((error) => {
                if (!Snackabra.isShutdown) {
                    console.error("[Snackabra] fetching storage server name failed (fatal):\n", error);
                    reject(error);
                }
            });
        }));
    }
    static async dateNow() {
        let timestamp = Date.now();
        if (timestamp <= Snackabra.lastTimeStamp) {
            timestamp = Snackabra.lastTimeStamp + 1;
        }
        Snackabra.lastTimeStamp = timestamp;
        return timestamp;
    }
    static heardFromServer() {
        Snackabra.#latestPing = Date.now();
        switch (Snackabra.onlineStatus) {
            case 'offline':
                if (DBG)
                    console.info("[Snackabra] We are BACK online");
                this.emit('online');
                this.emit('reconnected');
                Snackabra.onlineStatus = 'online';
                break;
            case 'online':
                break;
            case 'unknown':
                if (DBG)
                    console.info("[Snackabra] We are now ONLINE");
                this.emit('online');
                Snackabra.onlineStatus = 'online';
                break;
        }
        this.checkUnknownNetworkStatus();
    }
    static checkUnknownNetworkStatus() {
        if (Snackabra.#activeChannelSockets.size === 0) {
            if (Snackabra.onlineStatus !== 'unknown')
                this.emit('unknownNetworkStatus');
            Snackabra.onlineStatus = 'unknown';
        }
    }
    static haveNotHeardFromServer() {
        if (Date.now() - Snackabra.#latestPing > WEBSOCKET_PING_INTERVAL * 1.1) {
            if (DBG0)
                console.warn("[Snackabra] 'ping' message seems to have timed out");
            if (Snackabra.onlineStatus === 'online') {
                if (Snackabra.#activeChannelSockets.size > 0) {
                    if (DBG)
                        console.warn("[Snackabra] OFFLINE");
                    Snackabra.onlineStatus = 'offline';
                    this.emit('offline');
                }
                else {
                    if (DBG)
                        console.warn("[Snackabra] No active channel sockets, online status is now UNKNOWN");
                    Snackabra.onlineStatus = 'unknown';
                    Snackabra.onlineStatus = 'offline';
                    this.emit('unknownNetworkStatus');
                }
            }
        }
        this.checkUnknownNetworkStatus();
    }
    static addChannelSocket(socket) {
        Snackabra.#activeChannelSockets.add(socket);
    }
    static removeChannelSocket(socket) {
        if (Snackabra.#activeChannelSockets.has(socket))
            Snackabra.#activeChannelSockets.delete(socket);
        this.checkUnknownNetworkStatus();
    }
    async getPage(prefix) {
        if (DBG)
            console.log(`==== Snackabra.getPage: calling fetch with: ${prefix}`);
        return extractPayload(await SBApiFetch(this.#channelServer + '/api/v2/page/' + prefix));
    }
    create(budgetChannelOrToken) {
        _sb_assert(budgetChannelOrToken !== null, '[create channel] Invalid parameter (null)');
        return new Promise(async (resolve, reject) => {
            try {
                var _storageToken;
                if (budgetChannelOrToken instanceof Channel) {
                    const budget = budgetChannelOrToken;
                    await budget.ready;
                    if (!budget.channelServer)
                        budget.channelServer = this.#channelServer;
                    _storageToken = await budget.getStorageToken(NEW_CHANNEL_MINIMUM_BUDGET);
                }
                else {
                    try {
                        _storageToken = validate_SBStorageToken(budgetChannelOrToken);
                    }
                    catch (e) {
                        reject('Invalid parameter to create() - need a token or a budget channel');
                        return;
                    }
                }
                _sb_assert(_storageToken, '[create channel] Failed to get storage token for the provided channel');
                const channelKeys = await new Channel().ready;
                channelKeys.channelServer = this.#channelServer;
                channelKeys.create(_storageToken)
                    .then((c) => { resolve(c.handle); })
                    .catch((e) => { reject(e); });
            }
            catch (e) {
                const msg = `Creating channel did not succeed: ${e}`;
                console.error(msg);
                reject(msg);
            }
        });
    }
    connect(handleOrKey, onMessage) {
        let handle;
        if (typeof handleOrKey === 'string') {
            handle = {
                userPrivateKey: handleOrKey
            };
        }
        else {
            handle = handleOrKey;
        }
        _sb_assert(handle && handle.userPrivateKey, '[Snackabra.connect] Invalid parameter (at least need owner private key)');
        if (handle.channelServer && handle.channelServer !== this.#channelServer)
            throw new SBError(`[Snackabra.connect] channel server in handle ('${handle.channelServer}') does not match what SB was set up with ('${this.#channelServer}')`);
        if (!handle.channelServer)
            handle.channelServer = this.#channelServer;
        if (DBG)
            console.log("++++ Snackabra.connect() ++++", handle);
        if (onMessage)
            return new ChannelSocket(handle, onMessage);
        else
            return new Channel(handle);
    }
    static async closeAll() {
        console.log(SEP, "==== Snackabra.closeAll() called ====", SEP);
        if (Snackabra.isShutdown) {
            console.warn("closeAll() called, but it was already shutting down");
            return;
        }
        Snackabra.isShutdown = true;
        Snackabra.activeFetches.forEach(controller => controller.abort('Snackabra.closeAll() called'));
        Snackabra.activeFetches.clear();
        await Promise.all(Array.from(Snackabra.#activeChannelSockets).map(close));
        console.log("... waiting for everything to close ...");
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    get storage() { return this.#storage; }
    async getStorageServer() { return this.#storage.getStorageServer(); }
    get crypto() { return sbCrypto; }
    get version() { return this.#version; }
}
__decorate([
    Memoize
], Snackabra.prototype, "storage", null);
__decorate([
    Memoize
], Snackabra.prototype, "getStorageServer", null);
export { SB384, Channel, ChannelSocket, Snackabra, arrayBufferToBase64url, base64ToArrayBuffer, arrayBufferToBase62, base62ToArrayBuffer, version, setDebugLevel, };
export var SB = {
    Snackabra: Snackabra,
    Channel: Channel,
    SBCrypto: SBCrypto,
    SB384: SB384,
    arrayBufferToBase64url: arrayBufferToBase64url,
    base64ToArrayBuffer: base64ToArrayBuffer,
    arrayBufferToBase62: arrayBufferToBase62,
    base62ToArrayBuffer: base62ToArrayBuffer,
    sbCrypto: sbCrypto,
    version: version,
    setDebugLevel: setDebugLevel,
};
if (!globalThis.SB)
    globalThis.SB = SB;
console.warn(`==== SNACKABRA jslib (re)loaded, version '${globalThis.SB.version}' ====`);
//# sourceMappingURL=snackabra.js.map