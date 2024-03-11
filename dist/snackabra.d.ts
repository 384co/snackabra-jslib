declare const version = "2.0.0-alpha.5 (build 093)";
export declare const NEW_CHANNEL_MINIMUM_BUDGET: number;
export declare const SBStorageTokenPrefix = "LM2r";
export interface SBStorageToken {
    [SB_STORAGE_TOKEN_SYMBOL]?: boolean;
    hash: string;
    size?: number;
    motherChannel?: SBChannelId;
    created?: number;
    used?: boolean;
}
export declare function _check_SBStorageToken(data: SBStorageToken): boolean | "";
export declare function validate_SBStorageToken(data: SBStorageToken): SBStorageToken;
export interface SBChannelHandle {
    [SB_CHANNEL_HANDLE_SYMBOL]?: boolean;
    userPrivateKey: SBUserPrivateKey;
    channelId?: SBChannelId;
    channelServer?: string;
    channelData?: SBChannelData;
}
export declare function _check_SBChannelHandle(data: SBChannelHandle): boolean | "" | SBStorageToken;
export declare function validate_SBChannelHandle(data: SBChannelHandle): SBChannelHandle;
export interface SBChannelData {
    channelId: SBChannelId;
    ownerPublicKey: SBUserPublicKey;
    storageToken?: SBStorageToken;
}
export declare function _check_SBChannelData(data: SBChannelData): boolean | "" | SBStorageToken;
export declare function validate_SBChannelData(data: any): SBChannelData;
export type SBStorageTokenHash = string;
export interface Message {
    body: any;
    channelId: SBChannelId;
    sender: SBUserId;
    messageTo?: SBUserId;
    senderPublicKey: SBUserPublicKey;
    senderTimestamp: number;
    serverTimestamp: number;
    eol?: number;
    _id: string;
}
export declare function validate_Message(data: Message): Message;
export interface ChannelApiBody {
    [SB_CHANNEL_API_BODY_SYMBOL]?: boolean;
    channelId: SBChannelId;
    path: string;
    userId: SBUserId;
    userPublicKey: SBUserPublicKey;
    isOwner?: boolean;
    timestamp: number;
    sign: ArrayBuffer;
    apiPayloadBuf?: ArrayBuffer;
    apiPayload?: any;
}
export declare function validate_ChannelApiBody(body: any): ChannelApiBody;
export interface ChannelMessage {
    [SB_CHANNEL_MESSAGE_SYMBOL]?: boolean;
    f?: SBUserId;
    c?: ArrayBuffer | string;
    iv?: Uint8Array;
    salt?: ArrayBuffer;
    s?: ArrayBuffer;
    ts?: number;
    channelId?: SBChannelId;
    i2?: string;
    sts?: number;
    timestampPrefix?: string;
    _id?: string;
    unencryptedContents?: any;
    stringMessage?: boolean;
    ready?: boolean;
    error?: string;
    t?: SBUserId;
    ttl?: number;
    protocol?: SBProtocol;
}
export declare function validate_ChannelMessage(body: ChannelMessage): ChannelMessage;
export declare function stripChannelMessage(msg: ChannelMessage, serverMode?: boolean): ChannelMessage;
export interface ChannelAdminData {
    channelId: SBChannelId;
    channelData: SBChannelData;
    capacity: number;
    locked: boolean;
    accepted: Set<SBUserId>;
    visitors: Map<SBUserId, SBUserPublicKey>;
    storageLimit: number;
    motherChannel: SBChannelId;
    latestTimestamp: string;
}
export interface EncryptParams {
    name?: string;
    iv?: ArrayBuffer;
    additionalData?: BufferSource;
    tagLength?: number;
}
declare function setDebugLevel(dbg1: boolean, dbg2?: boolean): void;
export type MessageTtl = 0 | 3 | 4 | 5 | 6 | 7 | 8 | 15;
export declare const msgTtlToSeconds: number[];
export declare const msgTtlToString: string[];
export type SBObjectHandleVersions = '1' | '2' | '3';
export interface SBObjectHandle {
    [SB_OBJECT_HANDLE_SYMBOL]?: boolean;
    id: Base62Encoded;
    verification?: Promise<string> | string;
    version?: SBObjectHandleVersions;
    key?: Base62Encoded;
    iv?: Uint8Array | Base62Encoded;
    salt?: ArrayBuffer | Base62Encoded;
    storageServer?: string;
    data?: WeakRef<ArrayBuffer> | ArrayBuffer;
    payload?: any;
    fileName?: string;
    dateAndTime?: string;
    fileType?: string;
    lastModified?: number;
    actualSize?: number;
    savedSize?: number;
    type?: string;
}
export declare function _check_SBObjectHandle(h: SBObjectHandle): boolean;
export declare function validate_SBObjectHandle(h: SBObjectHandle): SBObjectHandle;
export declare function stringify_SBObjectHandle(h: SBObjectHandle): Promise<SBObjectHandle>;
export type SB384Hash = string;
export type SBUserId = SB384Hash;
export type SBChannelId = SB384Hash;
export type SBUserPublicKey = string;
export type SBUserPrivateKey = string;
export interface MessageHistory {
    type: 'entry' | 'directory';
    version: '20240228001';
    channelId: SBChannelId;
    ownerPublicKey: SBUserPublicKey;
    created: number;
    channelServer?: string;
    from: string;
    to: string;
    count: number;
}
export interface MessageHistoryEntry extends MessageHistory {
    type: 'entry';
    messages: Map<string, ArrayBuffer>;
}
export interface MessageHistoryDirectory extends MessageHistory {
    type: 'directory';
    depth: number;
    lastModified: number;
    shards?: Map<string, SBObjectHandle>;
    subdirectories?: Map<string, MessageHistoryDirectory>;
}
export declare class MessageBus {
    #private;
    bus: {
        [index: string]: any;
    };
    subscribe(event: string, handler: CallableFunction): void;
    unsubscribe(event: string, handler: CallableFunction): void;
    publish(event: string, ...args: unknown[]): void;
}
export declare class MessageQueue<T> {
    private queue;
    private resolve;
    private reject;
    private closed;
    private error;
    enqueue(item: T): void;
    dequeue(): Promise<T | null>;
    isEmpty(): boolean;
    close(reason?: string): void;
    drain(reason?: string): Promise<void>;
}
export declare class SBError extends Error {
    constructor(message: string);
}
export declare function jsonParseWrapper(str: string | null, loc?: string, reviver?: (this: any, key: string, value: any) => any): any;
export declare function jsonOrString(str: string | null): any;
export declare function compareBuffers(a: Uint8Array | ArrayBuffer | null, b: Uint8Array | ArrayBuffer | null): boolean;
export declare function getRandomValues(buffer: Uint8Array): Uint8Array;
export declare function SBApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<any>;
export declare const base64url = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
declare function arrayBufferToBase64url(buffer: ArrayBuffer | Uint8Array): string;
declare function base64ToArrayBuffer(s: string): Uint8Array;
export type Base62Encoded = string & {
    _brand?: 'Base62Encoded';
};
export declare const base62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export declare const b62regex: RegExp;
export declare const base62regex: RegExp;
export declare function isBase62Encoded(value: string | Base62Encoded): value is Base62Encoded;
declare function arrayBufferToBase62(buffer: ArrayBuffer | Uint8Array): string;
declare function base62ToArrayBuffer(s: string): ArrayBuffer;
export declare function base62ToBase64(s: Base62Encoded): string;
export declare function base64ToBase62(s: string): Base62Encoded;
export declare function b32encode(num: number): string;
export declare function b32process(str: string): string;
export declare function b32decode(encoded: string): number | null;
export declare function assemblePayload(data: any): ArrayBuffer | null;
export declare function extractPayload(value: ArrayBuffer): any;
export declare enum KeyPrefix {
    SBPublicKey = "PNk",
    SBPrivateKey = "Xj3",
    SBDehydratedKey = "XjZ"
}
export declare function hydrateKey(privKey: SBUserPrivateKey, pubKey?: SBUserPrivateKey): SBUserPrivateKey | undefined;
export declare class SBCrypto {
    generateIdKey(buf: ArrayBuffer): Promise<{
        idBinary: ArrayBuffer;
        keyMaterial: ArrayBuffer;
    }>;
    generateKeys(): Promise<CryptoKeyPair>;
    importKey(format: KeyFormat, key: BufferSource | JsonWebKey, type: 'ECDH' | 'AES' | 'PBKDF2', extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    exportKey(format: 'jwk', key: CryptoKey): Promise<JsonWebKey | undefined>;
    encrypt(data: BufferSource, key: CryptoKey, params: EncryptParams): Promise<ArrayBuffer>;
    wrap(body: any, sender: SBUserId, encryptionKey: CryptoKey, salt: ArrayBuffer, signingKey: CryptoKey): Promise<ChannelMessage>;
    sign(signKey: CryptoKey, contents: ArrayBuffer): Promise<ArrayBuffer>;
    verify(verifyKey: CryptoKey, sign: ArrayBuffer, contents: ArrayBuffer): Promise<boolean>;
    str2ab(string: string): Uint8Array;
    ab2str(buffer: Uint8Array): string;
}
export declare function Memoize(target: any, propertyKey: string, descriptor?: PropertyDescriptor): void;
export declare function Ready(target: any, propertyKey: string, descriptor?: PropertyDescriptor): void;
declare const SB_CHANNEL_MESSAGE_SYMBOL: unique symbol;
declare const SB_CHANNEL_API_BODY_SYMBOL: unique symbol;
declare const SB_CHANNEL_HANDLE_SYMBOL: unique symbol;
declare const SB_OBJECT_HANDLE_SYMBOL: unique symbol;
declare const SB_STORAGE_TOKEN_SYMBOL: unique symbol;
export declare const sbCrypto: SBCrypto;
declare class SB384 {
    #private;
    sb384Ready: Promise<SB384>;
    static ReadyFlag: symbol;
    errorState: boolean;
    constructor(key?: CryptoKey | JsonWebKey | SBUserPublicKey | SBUserPrivateKey, forcePrivate?: boolean);
    get SB384ReadyFlag(): any;
    get ready(): Promise<SB384>;
    get private(): boolean;
    get hash(): SB384Hash;
    get hashB32(): SB384Hash;
    get userId(): SB384Hash;
    get ownerChannelId(): string;
    get privateKey(): CryptoKey;
    get signKey(): CryptoKey;
    get publicKey(): CryptoKey;
    get jwkPrivate(): JsonWebKey;
    get jwkPublic(): JsonWebKey;
    get ySign(): 0 | 1;
    get userPublicKey(): SBUserPublicKey;
    get userPrivateKey(): SBUserPrivateKey;
    get userPrivateKeyDehydrated(): SBUserPrivateKey;
}
export interface SBProtocol {
    setChannel(channel: Channel): void;
    encryptionKey(msg: ChannelMessage): Promise<CryptoKey>;
    decryptionKey(channel: Channel, msg: ChannelMessage): Promise<CryptoKey | undefined>;
}
export interface Protocol_KeyInfo {
    salt1?: ArrayBuffer;
    salt2?: ArrayBuffer;
    iterations1?: number;
    iterations2?: number;
    hash1?: string;
    hash2?: string;
    summary?: string;
}
export declare class Protocol_AES_GCM_256 implements SBProtocol {
    #private;
    constructor(passphrase: string, keyInfo: Protocol_KeyInfo);
    setChannel(_channel: Channel): void;
    initializeMasterKey(passphrase: string): Promise<CryptoKey>;
    static genKey(): Promise<Protocol_KeyInfo>;
    encryptionKey(msg: ChannelMessage): Promise<CryptoKey>;
    decryptionKey(_channel: Channel, msg: ChannelMessage): Promise<CryptoKey | undefined>;
}
export declare class Protocol_ECDH implements SBProtocol {
    #private;
    constructor();
    setChannel(channel: Channel): void;
    encryptionKey(msg: ChannelMessage): Promise<CryptoKey>;
    decryptionKey(channel: any, msg: ChannelMessage): Promise<CryptoKey | undefined>;
}
export declare class SBChannelKeys extends SB384 {
    #private;
    sbChannelKeysReady: Promise<SBChannelKeys>;
    static ReadyFlag: symbol;
    channelServer: string;
    constructor(handleOrKey?: SBChannelHandle | SBUserPrivateKey);
    get ready(): Promise<SBChannelKeys>;
    get SBChannelKeysReadyFlag(): any;
    get channelData(): SBChannelData;
    get owner(): boolean | "" | undefined;
    get channelId(): string | undefined;
    get handle(): SBChannelHandle;
    buildApiBody(path: string, apiPayload?: any): Promise<ChannelApiBody>;
    callApi(path: string): Promise<any>;
    callApi(path: string, apiPayload: any): Promise<any>;
}
export interface MessageOptions {
    ttl?: number;
    sendTo?: SBUserId;
    subChannel?: string;
    protocol?: SBProtocol;
    sendString?: boolean;
    retries?: number;
}
interface EnqueuedMessage {
    msg: ChannelMessage;
    resolve: (value: any) => any;
    reject: (reason: any) => any;
    _send: (msg: ChannelMessage) => any;
    retryCount: number;
}
declare class Channel extends SBChannelKeys {
    #private;
    channelReady: Promise<Channel>;
    static ReadyFlag: symbol;
    locked?: boolean;
    static defaultProtocol: SBProtocol;
    protocol?: SBProtocol;
    visitors: Map<SBUserId, SBUserPrivateKey>;
    sendQueue: MessageQueue<EnqueuedMessage>;
    isClosed: boolean;
    constructor();
    constructor(newChannel: null, protocol: SBProtocol);
    constructor(key: SBUserPrivateKey, protocol?: SBProtocol);
    constructor(handle: SBChannelHandle, protocol?: SBProtocol);
    get ready(): Promise<Channel>;
    get ChannelReadyFlag(): boolean;
    get api(): this;
    extractMessage(msgRaw: ChannelMessage | undefined): Promise<Message | undefined>;
    extractMessageMap(msgMap: Map<string, ChannelMessage>): Promise<Map<string, Message>>;
    packageMessage(contents: any, options?: MessageOptions): ChannelMessage;
    finalizeMessage(msg: ChannelMessage): Promise<ChannelMessage>;
    send(contents: any, options?: MessageOptions): Promise<string>;
    create(storageToken: SBStorageToken, channelServer?: SBChannelId): Promise<Channel>;
    getLastMessageTimes(): void;
    getLatestTimestamp(): Promise<string>;
    messageQueueManager(): Promise<void>;
    close(): Promise<void>;
    getMessageKeys(prefix?: string): Promise<{
        keys: Set<string>;
        historyShard: SBObjectHandle;
    }>;
    getRawMessageMap(messageKeys: Set<string>): Promise<Map<string, ArrayBuffer>>;
    getMessageMap(messageKeys: Set<string>): Promise<Map<string, Message>>;
    getHistory(): Promise<MessageHistoryDirectory>;
    setPage(options: {
        page: any;
        prefix?: number;
        type?: string;
    }): Promise<any>;
    getPage(): Promise<any>;
    acceptVisitor(userId: SBUserId): Promise<any>;
    getCapacity(): Promise<any>;
    getAdminData(): Promise<ChannelAdminData>;
    getMother(): Promise<string>;
    isLocked(): Promise<boolean>;
    lock(): Promise<{
        success: boolean;
    }>;
    updateCapacity(capacity: number): Promise<any>;
    getChannelKeys(): Promise<SBChannelData>;
    getPubKeys(): Promise<Map<SBUserId, SBUserPublicKey>>;
    getStorageLimit(): Promise<any>;
    getStorageToken(size: number): Promise<SBStorageToken>;
    budd(options?: {
        targetChannel?: SBChannelHandle;
        size?: number;
    }): Promise<SBChannelHandle>;
    static LOWEST_TIMESTAMP: string;
    static HIGHEST_TIMESTAMP: string;
    static timestampToBase4String(tsNum: number): string;
    static base4stringToDate(tsStr: string): string;
    static getLexicalExtremes<T extends number | string>(set: Set<T>): [T, T] | [];
    static messageKeySetToPrefix: (keys: Set<string>) => string;
    static timestampLongestPrefix: (s1: string, s2: string) => string;
    static timestampRegex: RegExp;
    static base4StringToTimestamp(tsStr: string): number;
    static base4StringToDate(tsStr: string): string;
    static deComposeMessageKey(key: string): {
        channelId: string;
        i2: string;
        timestamp: string;
    };
    static composeMessageKey(channelId: SBChannelId, timestamp: number, subChannel?: string): string;
}
declare class ChannelSocket extends Channel {
    #private;
    channelSocketReady: Promise<ChannelSocket>;
    static ReadyFlag: symbol;
    onMessage: (_m: Message | string) => void;
    lastTimestampPrefix: string;
    constructor(handleOrKey: SBChannelHandle | SBUserPrivateKey, onMessage: (m: Message | string) => void, protocol?: SBProtocol);
    get ready(): Promise<ChannelSocket>;
    get ChannelSocketReadyFlag(): boolean;
    get status(): "CLOSED" | "CONNECTING" | "OPEN" | "CLOSING";
    set enableTrace(b: boolean);
    send(contents: any, options?: MessageOptions): Promise<string>;
    reset(): void;
    close(): Promise<void>;
}
export interface Shard {
    version: '3';
    id: Base62Encoded;
    iv: Uint8Array;
    salt: ArrayBuffer;
    actualSize: number;
    data: ArrayBuffer;
}
export declare class StorageApi {
    #private;
    constructor(stringOrPromise: Promise<string> | string);
    getStorageServer(): Promise<string>;
    static padBuf(buf: ArrayBuffer): ArrayBuffer;
    static getObjectKey(fileHashBuffer: BufferSource, salt: ArrayBuffer): Promise<CryptoKey>;
    storeData(contents: any, budgetSource: SBChannelHandle | Channel | SBStorageToken): Promise<SBObjectHandle>;
    fetchData(handle: SBObjectHandle): Promise<SBObjectHandle>;
    static getData(handle: SBObjectHandle): ArrayBuffer | undefined;
    static getPayload(handle: SBObjectHandle): any;
}
declare class EventEmitter {
    private static events;
    static on(eventName: string, listener: Function): void;
    static off(eventName: string, listener: Function): void;
    static emit(eventName: string, ...args: any[]): void;
}
type ServerOnlineStatus = 'online' | 'offline' | 'unknown';
declare class Snackabra extends EventEmitter {
    #private;
    static lastTimeStamp: number;
    static activeFetches: Map<symbol, AbortController>;
    static isShutdown: boolean;
    static lastTimestampPrefix: string;
    static onlineStatus: ServerOnlineStatus;
    static defaultChannelServer: string;
    constructor(channelServer: string, options?: {
        DEBUG?: boolean;
        DEBUG2?: boolean;
        sbFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    } | boolean);
    static dateNow(): Promise<number>;
    static heardFromServer(): void;
    static checkUnknownNetworkStatus(): void;
    static haveNotHeardFromServer(): void;
    static addChannelSocket(socket: ChannelSocket): void;
    static removeChannelSocket(socket: ChannelSocket): void;
    getPage(prefix: string): Promise<any>;
    create(budgetChannel: Channel): Promise<SBChannelHandle>;
    create(storageToken: SBStorageToken): Promise<SBChannelHandle>;
    connect(handleOrKey: SBChannelHandle | SBUserPrivateKey): Channel;
    connect(handleOrKey: SBChannelHandle | SBUserPrivateKey, onMessage: (m: Message | string) => void): ChannelSocket;
    static closeAll(): Promise<void>;
    get storage(): StorageApi;
    getStorageServer(): Promise<string>;
    get crypto(): SBCrypto;
    get version(): string;
}
export { SB384, Channel, ChannelSocket, Snackabra, arrayBufferToBase64url, base64ToArrayBuffer, arrayBufferToBase62, base62ToArrayBuffer, version, setDebugLevel, };
export declare var SB: {
    Snackabra: typeof Snackabra;
    Channel: typeof Channel;
    SBCrypto: typeof SBCrypto;
    SB384: typeof SB384;
    arrayBufferToBase64url: typeof arrayBufferToBase64url;
    base64ToArrayBuffer: typeof base64ToArrayBuffer;
    arrayBufferToBase62: typeof arrayBufferToBase62;
    base62ToArrayBuffer: typeof base62ToArrayBuffer;
    sbCrypto: SBCrypto;
    version: string;
    setDebugLevel: typeof setDebugLevel;
};
//# sourceMappingURL=snackabra.d.ts.map