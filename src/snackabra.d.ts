/******************************************************************************************************/
/**
 * Interfaces
 */
/**
 * SBChannelHandle
 *
 * Complete descriptor of a channel. 'key' is stringified 'jwk' key.
 * The key is always private. If it matches the channelId, then it's
 * an 'owner' key.
 */
export interface SBChannelHandle {
    channelId: string;
    key: JsonWebKey;
}
export interface SBServer {
    channel_server: string;
    channel_ws: string;
    storage_server: string;
}
interface IndexedKVOptions {
    db: string;
    table: string;
    onReady: CallableFunction;
}
declare type StorableDataType = string | number | bigint | boolean | symbol | object;
interface Dictionary {
    [index: string]: any;
}
interface ChannelData {
    roomId?: string;
    channelId?: string;
    ownerKey: string;
    encryptionKey: string;
    signKey: string;
    SERVER_SECRET: string;
}
interface ImageMetaData {
    imageId?: string;
    previewId?: string;
    imageKey?: string;
    previewKey?: string;
}
export interface ChannelMessage {
    type?: ChannelMessageTypes;
    keys?: ChannelKeyStrings;
    _id?: string;
    id?: string;
    timestamp?: number;
    timestampPrefix?: string;
    channelID?: string;
    control?: boolean;
    encrypted_contents?: EncryptedContents;
    contents?: string;
    text?: string;
    sign?: string;
    image?: string;
    image_sign?: string;
    imageMetaData?: ImageMetaData;
    imageMetadata_sign?: string;
    motd?: string;
    ready?: boolean;
    roomLocked?: boolean;
    sender_pubKey?: JsonWebKey;
    sender_username?: string;
    system?: boolean;
    user?: {
        name: string;
        _id?: JsonWebKey;
    };
    verificationToken?: string;
}
/** sample channelKeys contents
 *
 * { "ready": true,
 *    "keys": {
 *            "ownerKey": "{\"crv\":\"P-384\",\"ext\":true,\"key_ops\":[],\"kty\":\"EC\",
 *                        \"x\":\"9s17B4i0Cuf_w9XN_uAq2DFePOr6S3sMFMA95KjLN8akBUWEhPAcuMEMwNUlrrkN\",
 *                        \"y\":\"6dAtcyMbtsO5ufKvlhxRsvjTmkABGlTYG1BrEjTpwrAgtmn6k25GR7akklz9klBr\"}",
 *            "guestKey": "{\"crv\":\"P-384\",\"ext\":true,\"key_ops\":[],\"kty\":\"EC\",
 *                         \"x\":\"Lx0eJcbNuyEfHDobWaZqgy9UO7ppxVIsEpEtvbzkAlIjySh9lY2AvgnACREO6QXD\",
 *                         \"y\":\"zEHPgpsl4jge_Q-K6ekuzi2bQOybnaPT1MozCFQJnXEePBX8emkHriOiwl6P8BAS\"}",
 *            "encryptionKey": "{\"alg\":\"A256GCM\",\"ext\":true,
 *                             \"k\":\"F0sQTTLXDhuvvmgGQLzMoeHPD-SJlFyhfOD-cqejEOU\",
 *                             \"key_ops\":[\"encrypt\",\"decrypt\"],\"kty\":\"oct\"}",
 *            "signKey": "{\"crv\":\"P-384\",
 *                        \"d\":\"KCJHDZ34XgVFsS9-sU09HFzXZhnGCvnDgJ5a8GTSfjuJQaq-1N2acvchPRhknk8B\",
 *                        \"ext\":true,\"key_ops\":[\"deriveKey\"],\"kty\":\"EC\",
 *                        \"x\":\"rdsyBle0DD1hvp2OE2mINyyI87Cyg7FS3tCQUIeVkfPiNOACtFxi6iP8oeYt-Dge\",
 *                        \"y\":\"qW9VP72uf9rgUU117G7AfTkCMncJbT5scIaIRwBXfqET6FYcq20fwSP7R911J2_t\"}"
 *             },
 * "motd": "",
 * "roomLocked": false}
 */
interface ChannelKeyStrings {
    encryptionKey: string;
    guestKey?: string;
    ownerKey: string;
    signKey: string;
    lockedKey?: string;
}
interface ChannelKeys {
    ownerKey: CryptoKey;
    guestKey?: CryptoKey;
    encryptionKey: CryptoKey;
    signKey: CryptoKey;
    lockedKey?: CryptoKey;
    channelSignKey: CryptoKey;
    privateKey: CryptoKey;
}
/** Encryptedcontents

    SB standard wrapping encrypted messages.

    Encryption is done with AES-GCM, 16 bytes of salt (iv), The
    ``contents`` are url-safe base64, same thing with the nonce (iv).
 */
export interface EncryptedContents {
    content: string | ArrayBuffer;
    iv: Uint8Array;
}
/******************************************************************************************************/
export declare type ChannelMessageTypes = 'ack' | 'keys' | 'invalid' | 'ready' | 'encypted';
/******************************************************************************************************/
/**
 * SB simple events (mesage bus) class
 */
export declare class MessageBus {
    #private;
    bus: Dictionary;
    /**
     * Subscribe. 'event' is a string, special case '*' means everything
     *  (in which case the handler is also given the message)
     */
    subscribe(event: string, handler: CallableFunction): void;
    /**
     * Unsubscribe
     */
    unsubscribe(event: string, handler: CallableFunction): void;
    /**
     * Publish
     */
    publish(event: string, ...args: unknown[]): void;
}
/**
 * @fileoverview Main file for snackabra javascript utilities.
 *               See https://snackabra.io for details.
 * @package
 */
export declare function _sb_exception(loc: string, msg: string): void;
export declare function _sb_resolve(val: any): any;
export declare function _sb_assert(val: unknown, msg: string): void;
/******************************************************************************************************/
/**
 * Fills buffer with random data
 */
export declare function getRandomValues(buffer: Uint8Array): Uint8Array;
/**
 * Returns 'true' if (and only if) string is well-formed base64.
 * Works same on browsers and nodejs.
 */
export declare function _assertBase64(base64: string): boolean;
/**
 * Standardized 'str2ab()' function, string to array buffer.
 * This assumes on byte per character.
 *
 * @param {string} string
 * @return {Uint8Array} buffer
 */
export declare function str2ab(string: string): Uint8Array;
/**
 * Standardized 'ab2str()' function, array buffer to string.
 * This assumes one byte per character.
 *
 * @param {Uint8Array} buffer
 * @return {string} string
 */
export declare function ab2str(buffer: Uint8Array): string;
/**
 * Standardized 'atob()' function, e.g. takes the a Base64 encoded
 * input and decodes it. Note: always returns Uint8Array.
 * Accepts both regular Base64 and the URL-friendly variant,
 * where `+` => `-`, `/` => `_`, and the padding character is omitted.
 *
 * @param {str} base64 string in either regular or URL-friendly representation.
 * @return {Uint8Array} returns decoded binary result
 */
export declare function base64ToArrayBuffer(str: string): Uint8Array;
/**
 * Compare buffers
 */
export declare function compareBuffers(a: Uint8Array | ArrayBuffer | null, b: Uint8Array | ArrayBuffer | null): boolean;
/**
 * Standardized 'btoa()'-like function, e.g., takes a binary string
 * ('b') and returns a Base64 encoded version ('a' used to be short
 * for 'ascii').
 *
 * @param {bufferSource} ArrayBuffer buffer
 * @return {string} base64 string
 */
export declare function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array | null): string;
export declare function _appendBuffer(buffer1: Uint8Array | ArrayBuffer, buffer2: Uint8Array | ArrayBuffer): ArrayBuffer;
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
export declare function importPublicKey(pem?: string): Promise<CryptoKey>;
/**
 * Returns random number
 *
 * @return {int} integer 0..255
 *
 */
export declare function simpleRand256(): number;
/**
 * Returns a random string in requested encoding
 *
 * @param {n} number of characters
 * @param {code} encoding, supported types: 'base32mi'
 * @return {string} random string
 *
 * base32mi: ``0123456789abcdefyhEjkLmNHpFrRTUW``
 */
export declare function simpleRandomString(n: number, code: string): string;
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
export declare function cleanBase32mi(s: string): string;
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
export declare function packageEncryptDict(dict: Dictionary, publicKeyPEM: string, callback: CallableFunction): void;
/**
 * Partition
 */
export declare function partition(str: string, n: number): void;
/**
 * There are many problems with JSON parsing, adding a wrapper to capture more info.
 * The 'loc' parameter should be a (unique) string that allows you to find the usage
 * in the code; one approach is the line number in the file (at some point).
 */
export declare function jsonParseWrapper(str: string, loc: string): any;
/**
 * Deprecated (older version of payloads, for older channels)
 */
export declare function extractPayloadV1(payload: ArrayBuffer): Dictionary;
/**
 * Assemble payload
 */
export declare function assemblePayload(data: Dictionary): BodyInit | null;
/**
 * Extract payload - this decodes from our binary (wire) format
 * to a JS object. This provides a binary encoding of any JSON,
 * and it allows some elements of the JSON to be raw (binary).
 */
export declare function extractPayload(payload: ArrayBuffer): Dictionary;
/**
 * Encode into b64 URL
 */
export declare function encodeB64Url(input: string): string;
/**
 * Decode b64 URL
 */
export declare function decodeB64Url(input: string): string;
/******************************************************************************************************/
/**
 * SBCrypto contains all the SB specific crypto functions
 *
 * @class
 * @constructor
 * @public
 */
declare class SBCrypto {
    /**
     * Extracts (generates) public key from a private key.
     */
    extractPubKey(privateKey: JsonWebKey): JsonWebKey | null;
    /**
     * SBCrypto.generatekeys()
     *
     * Generates standard ``ECDH`` keys using ``P-384``.
     */
    generateKeys(): Promise<CryptoKeyPair>;
    /**
     * SBCrypto.importKey()
     *
     * Import keys
     */
    importKey(format: KeyFormat, key: BufferSource | JsonWebKey, type: 'ECDH' | 'AES' | 'PBKDF2', extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    /**
     * SBCrypto.deriveKey()
     *
     * Derive key.
     */
    deriveKey(privateKey: CryptoKey, publicKey: CryptoKey, type: string, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    /**
     * SBCrypto.encrypt()
     *
     * Encrypt. if no nonce (iv) is given, will create it. Returns a Promise
     * that resolves either to raw array buffer or a packaged EncryptedContents.
     * Note that for the former, nonce must be given.
     */
    encrypt(data: BufferSource, key: CryptoKey, _iv?: Uint8Array | null, returnType?: 'encryptedContents'): Promise<EncryptedContents>;
    encrypt(data: BufferSource, key: CryptoKey, _iv?: Uint8Array | null, returnType?: 'arrayBuffer'): Promise<ArrayBuffer>;
    wrap(k: CryptoKey, b: string, bodyType: 'string'): Promise<EncryptedContents>;
    wrap(k: CryptoKey, b: ArrayBuffer, bodyType: 'arrayBuffer'): Promise<EncryptedContents>;
    /**
     * SBCrypto.unwrap
     *
     * Decrypts a wrapped object, returns (promise to) decrypted contents
     * per se (either as a string or arrayBuffer)
     */
    unwrap(k: CryptoKey, o: EncryptedContents, returnType: 'string'): Promise<string>;
    unwrap(k: CryptoKey, o: EncryptedContents, returnType: 'arrayBuffer'): Promise<ArrayBuffer>;
    /**
     * SBCrypto.sign()
     *
     * Sign
     */
    sign(secretKey: CryptoKey, contents: string): Promise<string>;
    /**
     * SBCrypto.verify()
     *
     * Verify signature.
     */
    verify(verifyKey: CryptoKey, sign: string, contents: string): Promise<boolean>;
    /**
     * SBCrypto.compareKeys()
     *
     * Compare keys, true if the 'same', false if different.
     * TODO: type it up.
     */
    compareKeys(key1: Dictionary, key2: Dictionary): boolean;
}
/**
 * SB384 - basic (core) capability object in SB
 * @class
 * @constructor
 * @public
 */
declare class SB384 {
    #private;
    ready: Promise<SB384>;
    sb384Ready: Promise<SB384>;
    /**
     * new SB384()
     * @param key a jwk with which to create identity; if not provided,
     * it will 'mint' (generate) them randomly
     */
    constructor(key?: JsonWebKey);
    get readyFlag(): boolean;
    get exportable_pubKey(): JsonWebKey | null;
    get exportable_privateKey(): JsonWebKey | null;
    get privateKey(): CryptoKey | null;
    get keyPair(): CryptoKeyPair | null;
    get _id(): string;
    get ownerChannelId(): string | null;
}
interface SBMessageContents {
    sender_pubKey?: JsonWebKey;
    sender_username?: string;
    encrypted: boolean;
    isVerfied: boolean;
    contents: string;
    sign: string;
    image: string;
    image_sign?: string;
    imageMetadata_sign?: string;
    imageMetaData?: ImageMetaData;
}
/**
 * SBMessage
 * @class
 * @constructor
 * @public
 */
declare class SBMessage {
    ready: Promise<SBMessage>;
    channel: Channel;
    contents: SBMessageContents;
    constructor(channel: Channel, body?: string, image?: string);
    setImageMetadata(imageMetaData: ImageMetaData): Promise<unknown>;
    /**
     * SBMessage.send()
     *
     * @param {SBMessage} message - the message object to send
     */
    send(): Promise<string>;
}
/**
 * SBFile
 * @class
 * @constructor
 * @public
 */
export declare class SBFile extends SBMessage {
    #private;
    data: Dictionary;
    image: string;
    image_sign: string;
    imageMetaData: ImageMetaData;
    constructor(channel: Channel, file: File);
}
/**
 * Channel
 *
 * @class
 * @constructor
 * @public
 */
declare abstract class Channel extends SB384 {
    #private;
    ready: Promise<Channel>;
    channelReady: Promise<Channel>;
    motd?: string;
    locked?: boolean;
    owner: boolean;
    admin: boolean;
    verifiedGuest: boolean;
    userName: string;
    abstract get keys(): ChannelKeys;
    abstract send(m: SBMessage | string, messageType?: 'string' | 'SBMessage'): Promise<string>;
    abstract set onMessage(f: CallableFunction);
    abstract adminData?: Dictionary;
    constructor(sbServer: SBServer, key?: JsonWebKey, channelId?: string);
    get api(): ChannelApi;
    get sbServer(): SBServer;
    get channelId(): string | undefined;
    get readyFlag(): boolean;
}
/**
 *
 * ChannelSocket
 *
 *  Class managing connections
 */
export declare class ChannelSocket extends Channel {
    #private;
    ready: Promise<ChannelSocket>;
    adminData?: Dictionary;
    constructor(sbServer: SBServer, onMessage: (m: ChannelMessage) => void, key?: JsonWebKey, channelId?: string);
    set onMessage(f: (m: ChannelMessage) => void);
    get onMessage(): (m: ChannelMessage) => void;
    /**
     * ChannelSocket.keys
     *
     * Will throw an exception if keys are unknown or not yet loaded
     */
    get keys(): ChannelKeys;
    /**
     * ChannelSocket.sendSbObject()
     *
     * Send SB object (file) on channel socket
     */
    sendSbObject(file: SBFile): Promise<string>;
    /**
      * ChannelSocket.send()
      *
      * Returns a promise that resolves to "success" when sent,
      * or an error message if it fails.
      */
    send(msg: SBMessage | string): Promise<string>;
    get exportable_owner_pubKey(): JsonWebKey | null;
}
export declare type SBObjectType = 'f' | 'p' | 'b';
export interface SBObjectHandle {
    version: '1';
    type: SBObjectType;
    id: string;
    key: string;
    verification: Promise<string>;
    iv?: Uint8Array;
    salt?: Uint8Array;
}
/**
 * Storage API
 * @class
 * @constructor
 * @public
 */
declare class StorageApi {
    #private;
    server: string;
    channelServer: string;
    constructor(server: string, channelServer: string);
    /**
     *
     * @param buf
     * @param type
     * @param roomId
     * @returns
     */
    storeObject(buf: ArrayBuffer, type: 'f' | 'p' | 'b', roomId: string): Promise<SBObjectHandle>;
    /**
     * StorageApi.saveFile()
     */
    saveFile(channel: Channel, sbFile: SBFile): Promise<void>;
    /**
     * StorageApi().storeRequest
     */
    storeRequest(fileId: string): Promise<ArrayBuffer>;
    /**
     * StorageApi().storeData()
     */
    storeData(type: string, fileId: string, iv: Uint8Array, salt: Uint8Array, storageToken: string, data: ArrayBuffer): Promise<Dictionary>;
    /**
     * StorageApi().storeImage()
     */
    storeImage(image: string | ArrayBuffer, image_id: string, keyData: string, type: string): void;
    /**
     * StorageApi().fetchData()
     *
     * This assumes you have a complete SBObjectHandle. Note that
     * if you only have the 'id' and 'verification fields, you
     * can reconstruct / request the rest. The current interface
     * will return both nonce, salt, and encrypted data.
     */
    fetchData(h: SBObjectHandle): Promise<ArrayBuffer>;
    /**
     * StorageApi().retrieveData()
     * retrieves an object from storage
     */
    retrieveData(msgId: string, messages: Array<ChannelMessage>, controlMessages: Array<ChannelMessage>): Promise<Dictionary>;
    /**
     * StorageApi().retrieveDataFromMessage()
     */
    retrieveDataFromMessage(message: Dictionary, controlMessages: Array<Dictionary>): Promise<{
        error: string;
        url?: undefined;
    } | {
        url: string;
        error?: undefined;
    }>;
}
/**
 * Channel API
 * @class
 * @constructor
 * @public
 */
declare class ChannelApi {
    #private;
    constructor(/* sbServer: Snackabra, */ channel: Channel);
    /**
     * getLastMessageTimes
     */
    getLastMessageTimes(): Promise<unknown>;
    /**
     * getOldMessages
     */
    getOldMessages(currentMessagesLength: number): Promise<Array<ChannelMessage>>;
    /**
     * updateCapacity
     */
    updateCapacity(capacity: number): Promise<unknown>;
    /**
     * getCapacity
     */
    getCapacity(): Promise<unknown>;
    /**
     * getJoinRequests
     */
    getJoinRequests(): Promise<unknown>;
    /**
     * isLocked
     */
    isLocked(): Promise<unknown>;
    /**
     * Set message of the day
     */
    setMOTD(motd: string): Promise<unknown>;
    /**
     * getAdminData
     */
    getAdminData(): Promise<unknown>;
    /**
     * downloadData
     */
    downloadData(): Promise<unknown>;
    uploadChannel(channelData: ChannelData): Promise<unknown>;
    authorize(ownerPublicKey: Dictionary, serverSecret: string): Promise<unknown>;
    postPubKey(_exportable_pubKey: JsonWebKey): Promise<{
        success: boolean;
    }>;
    storageRequest(byteLength: number): Promise<Dictionary>;
}
/******************************************************************************************************/
/**
 * Augments IndexedDB to be used as a KV to easily
 * replace _localStorage for larger and more complex datasets
 *
 * @class
 * @constructor
 * @public
 */
export declare class IndexedKV {
    #private;
    db: IDBDatabase;
    events: MessageBus;
    options: IndexedKVOptions;
    constructor();
    openCursor(match: string, callback: CallableFunction): Promise<unknown>;
    setItem(key: string, value: StorableDataType): Promise<unknown>;
    add(key: string, value: StorableDataType): Promise<unknown>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<unknown>;
}
declare class Snackabra {
    #private;
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
    constructor(args?: SBServer);
    /**
     * Snackabra.connect()
     *
     * Connects to :term:`Channel Name` on this SB config.
     * Returns a (promise to the) channel (socket) object.
     * It will throw an ``AggregateError`` if it fails
     * to find the room anywhere.
     *
     */
    connect(onMessage: (m: ChannelMessage) => void, key?: JsonWebKey, channelId?: string): Promise<ChannelSocket>;
    /**
     * Snackabra.create()
     *
     * Creates a new channel. Currently uses trivial authentication.
     * Returns the :term:`Channel Name`. Note that this does not
     * create a channel object, e.g. does not make a connection.
     * Therefore you need
     *
     * (TODO: token-based approval of storage spend)
     */
    create(sbServer: SBServer, serverSecret: string, keys?: JsonWebKey): Promise<SBChannelHandle>;
    get channel(): Channel;
    get storage(): StorageApi;
    get crypto(): SBCrypto;
    sendFile(file: SBFile): void;
}
export { Channel, SBMessage, Snackabra, SBCrypto, };
