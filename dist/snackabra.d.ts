declare const version = "2.0.0-alpha.5 (build 41)";
export declare const NEW_CHANNEL_MINIMUM_BUDGET: number;
export interface SBChannelHandle {
    [SB_CHANNEL_HANDLE_SYMBOL]?: boolean;
    channelId: SBChannelId;
    userPrivateKey: SBUserPrivateKey;
    channelServer?: string;
    channelData?: SBChannelData;
}
export declare function validate_SBChannelHandle(data: SBChannelHandle): SBChannelHandle;
export interface SBChannelData {
    channelId: SBChannelId;
    ownerPublicKey: SBUserPublicKey;
    storageToken?: SBStorageToken;
}
export declare function validate_SBChannelData(data: any): SBChannelData;
export type SBStorageToken = string;
export interface Dictionary<T> {
    [index: string]: T;
}
export interface Message {
    body: any;
    channelId: SBChannelId;
    sender: SBUserId;
    senderPublicKey: SBUserPublicKey;
    senderTimestamp: number;
    serverTimestamp: number;
    eol?: number;
    _id: string;
}
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
    c?: ArrayBuffer;
    iv?: Uint8Array;
    salt?: ArrayBuffer;
    s?: ArrayBuffer;
    ts?: number;
    channelId?: SBChannelId;
    i2?: string;
    timestampPrefix?: string;
    _id?: string;
    unencryptedContents?: any;
    ready?: boolean;
    t?: SBUserId;
    ttl?: number;
}
export declare function validate_ChannelMessage(body: ChannelMessage): ChannelMessage;
export interface ChannelAdminData {
    channelId: SBChannelId;
    channelData: SBChannelData;
    channelCapacity: number;
    locked: boolean;
    accepted: Set<SBUserId>;
    visitors: Map<SBUserId, SBUserPublicKey>;
    storageLimit: number;
    motherChannel: SBChannelId;
    lastTimestamp: number;
}
export interface EncryptParams {
    name?: string;
    iv?: ArrayBuffer;
    additionalData?: BufferSource;
    tagLength?: number;
}
declare function setDebugLevel(dbg1: boolean, dbg2?: boolean): void;
export declare const msgTtlToSeconds: number[];
export declare const msgTtlToString: string[];
export type SBObjectType = 'f' | 'p' | 'b' | 't';
export type SBObjectHandleVersions = '1' | '2';
export declare namespace Interfaces {
    interface SBObjectHandle_base {
        [SB_OBJECT_HANDLE_SYMBOL]?: boolean;
        version?: SBObjectHandleVersions;
        type?: SBObjectType;
        verification?: Promise<string> | string;
        iv?: Uint8Array | string;
        salt?: ArrayBuffer | string;
        fileName?: string;
        dateAndTime?: string;
        fileType?: string;
        lastModified?: number;
        actualSize?: number;
        savedSize?: number;
    }
    interface SBObjectHandle_v1 extends SBObjectHandle_base {
        version: '1';
        id: string;
        key: string;
        id32?: Base62Encoded;
        key32?: Base62Encoded;
    }
    interface SBObjectHandle_v2 extends SBObjectHandle_base {
        version: '2';
        id: Base62Encoded;
        key: Base62Encoded;
    }
    type SBObjectHandle = SBObjectHandle_v1 | SBObjectHandle_v2;
}
export type SB384Hash = string;
export type SBUserId = SB384Hash;
export type SBChannelId = SB384Hash;
export type SBUserPublicKey = string;
export type SBUserPrivateKey = string;
export declare class MessageBus {
    #private;
    bus: Dictionary<any>;
    subscribe(event: string, handler: CallableFunction): void;
    unsubscribe(event: string, handler: CallableFunction): void;
    publish(event: string, ...args: unknown[]): void;
}
export declare function jsonParseWrapper(str: string | null, loc?: string, reviver?: (this: any, key: string, value: any) => any): any;
export declare function compareBuffers(a: Uint8Array | ArrayBuffer | null, b: Uint8Array | ArrayBuffer | null): boolean;
export declare function getRandomValues(buffer: Uint8Array): Uint8Array;
declare function SBFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
declare function base64ToArrayBuffer(str: string): Uint8Array;
declare function arrayBufferToBase64(buffer: BufferSource | ArrayBuffer | Uint8Array | null, variant?: 'b64' | 'url'): string;
export declare function encodeB64Url(input: string): string;
export declare function decodeB64Url(input: string): string;
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
        id_binary: ArrayBuffer;
        key_material: ArrayBuffer;
    }>;
    generateKeys(): Promise<CryptoKeyPair>;
    importKey(format: KeyFormat, key: BufferSource | JsonWebKey, type: 'ECDH' | 'AES' | 'PBKDF2', extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    exportKey(format: 'jwk', key: CryptoKey): Promise<JsonWebKey | undefined>;
    encrypt(data: BufferSource, key: CryptoKey, params: EncryptParams): Promise<ArrayBuffer>;
    wrap(body: any, sender: SBUserId, encryptionKey: CryptoKey, salt: ArrayBuffer, signingKey: CryptoKey, options?: MessageOptions): Promise<ChannelMessage>;
    unwrap(k: CryptoKey, o: ChannelMessage): Promise<ArrayBuffer>;
    sign(signKey: CryptoKey, contents: ArrayBuffer): Promise<ArrayBuffer>;
    verify(verifyKey: CryptoKey, sign: ArrayBuffer, contents: ArrayBuffer): Promise<boolean>;
    str2ab(string: string): Uint8Array;
    ab2str(buffer: Uint8Array): string;
}
declare const SB_CHANNEL_MESSAGE_SYMBOL: unique symbol;
declare const SB_CHANNEL_API_BODY_SYMBOL: unique symbol;
declare const SB_CHANNEL_HANDLE_SYMBOL: unique symbol;
declare const SB_MESSAGE_SYMBOL: unique symbol;
declare const SB_OBJECT_HANDLE_SYMBOL: unique symbol;
export declare const sbCrypto: SBCrypto;
declare class SB384 {
    #private;
    sb384Ready: Promise<SB384>;
    static ReadyFlag: symbol;
    constructor(key?: CryptoKey | JsonWebKey | SBUserPublicKey | SBUserPrivateKey, forcePrivate?: boolean);
    get SB384ReadyFlag(): any;
    get ready(): Promise<SB384>;
    get private(): boolean;
    get hash(): SB384Hash;
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
export declare class SBChannelKeys extends SB384 {
    #private;
    sbChannelKeysReady: Promise<SBChannelKeys>;
    static ReadyFlag: symbol;
    channelServer?: string;
    constructor(handleOrKey?: SBChannelHandle | SBUserPrivateKey);
    get ready(): Promise<SBChannelKeys>;
    get SBChannelKeysReadyFlag(): any;
    get channelData(): SBChannelData;
    get owner(): boolean | "" | undefined;
    get channelId(): string | undefined;
    get handle(): SBChannelHandle;
    callApi(path: string): Promise<any>;
    callApi(path: string, apiPayload: any): Promise<any>;
}
export interface MessageOptions {
    ttl?: number;
    sendTo?: SBUserId;
    subChannel?: string;
    protocol?: SBProtocol;
}
declare class SBMessage {
    #private;
    channel: Channel;
    contents: any;
    options: MessageOptions;
    [SB_MESSAGE_SYMBOL]: boolean;
    sbMessageReady: Promise<SBMessage>;
    static ReadyFlag: symbol;
    salt: ArrayBuffer;
    constructor(channel: Channel, contents: any, options?: MessageOptions);
    get ready(): Promise<SBMessage>;
    get SBMessageReadyFlag(): any;
    get message(): ChannelMessage;
    send(): Promise<string>;
}
export interface SBProtocol {
    encryptionKey(msg: SBMessage): Promise<CryptoKey>;
    decryptionKey(channel: Channel, msg: ChannelMessage): Promise<CryptoKey | undefined>;
}
export declare class Protocol_AES_GCM_256 implements SBProtocol {
    #private;
    private entropy;
    private iterations;
    constructor(entropy: string, iterations?: number);
    encryptionKey(msg: SBMessage): Promise<CryptoKey>;
    decryptionKey(_channel: Channel, msg: ChannelMessage): Promise<CryptoKey | undefined>;
}
export declare class Protocol_ECDH implements SBProtocol {
    #private;
    constructor();
    encryptionKey(msg: SBMessage): Promise<CryptoKey>;
    decryptionKey(channel: any, msg: ChannelMessage): Promise<CryptoKey | undefined>;
}
declare class Channel extends SBChannelKeys {
    #private;
    protocol?: SBProtocol | undefined;
    channelReady: Promise<Channel>;
    static ReadyFlag: symbol;
    locked?: boolean;
    adminData?: Dictionary<any>;
    visitors: Map<SBUserId, SBUserPrivateKey>;
    constructor();
    constructor(key: SBUserPrivateKey, protocol?: SBProtocol);
    constructor(handle: SBChannelHandle, protocol?: SBProtocol);
    get ready(): Promise<Channel>;
    get ChannelReadyFlag(): boolean;
    get api(): this;
    create(storageToken: SBStorageToken, channelServer?: SBChannelId): Promise<SBChannelHandle>;
    deCryptChannelMessage(channel: Channel, id: string, buf: ArrayBuffer): Promise<any>;
    getLastMessageTimes(): void;
    getMessageKeys(currentMessagesLength?: number, paginate?: boolean): Promise<Set<string>>;
    getMessages(messageKeys: Set<string>): Promise<Map<string, ChannelMessage>>;
    send(msg: SBMessage | any): Promise<string>;
    getChannelKeys(): Promise<SBChannelData>;
    getPubKeys(): Promise<Map<SBUserId, SBUserPublicKey>>;
    updateCapacity(capacity: number): Promise<any>;
    getCapacity(): Promise<any>;
    getStorageLimit(): Promise<any>;
    getMother(): Promise<any>;
    getJoinRequests(): Promise<any>;
    isLocked(): Promise<boolean>;
    storageRequest(byteLength: number): Promise<Dictionary<any>>;
    lock(): Promise<{
        success: boolean;
    }>;
    acceptVisitor(userId: SBUserId): Promise<any>;
    getStorageToken(size: number): Promise<string>;
    budd(): Promise<SBChannelHandle>;
    budd(options: {
        keys?: JsonWebKey;
        storage?: number;
        targetChannel?: SBChannelId;
    }): Promise<SBChannelHandle>;
}
declare class ChannelSocket extends Channel {
    #private;
    channelSocketReady: Promise<ChannelSocket>;
    static ReadyFlag: symbol;
    constructor(handle: SBChannelHandle, onMessage: (m: Message) => void);
    get ready(): Promise<ChannelSocket>;
    get ChannelSocketReadyFlag(): boolean;
    get status(): "CLOSED" | "CONNECTING" | "OPEN" | "CLOSING";
    set onMessage(f: (m: Message) => void);
    get onMessage(): (m: Message) => void;
    set enableTrace(b: boolean);
    send(msg: SBMessage | any): Promise<string>;
}
declare class SBObjectHandle implements Interfaces.SBObjectHandle_base {
    #private;
    version: SBObjectHandleVersions;
    shardServer?: string;
    iv?: Uint8Array | string;
    salt?: ArrayBuffer | string;
    fileName?: string;
    dateAndTime?: string;
    fileType?: string;
    lastModified?: number;
    actualSize?: number;
    savedSize?: number;
    constructor(options: Interfaces.SBObjectHandle);
    set id_binary(value: ArrayBuffer);
    set key_binary(value: ArrayBuffer);
    set id(value: ArrayBuffer | string | Base62Encoded);
    set key(value: ArrayBuffer | string | Base62Encoded);
    get id(): string;
    get key(): string;
    get id64(): string;
    get id32(): Base62Encoded;
    get key64(): string;
    get key32(): Base62Encoded;
    set verification(value: Promise<string> | string);
    get verification(): Promise<string> | string;
    get type(): SBObjectType;
}
export declare class StorageApi {
    #private;
    storageServer: string;
    constructor(storageServer: string);
    storeObject(type: string, fileId: Base62Encoded, iv: ArrayBuffer, salt: ArrayBuffer, storageToken: string, data: ArrayBuffer): Promise<Dictionary<any>>;
    storeData(buf: BodyInit | Uint8Array, type: SBObjectType, channelOrHandle: SBChannelHandle | Channel): Promise<Interfaces.SBObjectHandle>;
    fetchData(handle: Interfaces.SBObjectHandle, returnType: 'string'): Promise<string>;
    fetchData(handle: Interfaces.SBObjectHandle, returnType?: 'arrayBuffer'): Promise<ArrayBuffer>;
}
declare class Snackabra {
    #private;
    channelServer: string;
    storageServer: string | string;
    sbFetch: typeof SBFetch;
    constructor(channelServer: string, setDBG?: boolean, setDBG2?: boolean);
    attach(handle: SBChannelHandle): Promise<Channel>;
    create(budgetChannel: Channel): Promise<SBChannelHandle>;
    create(storageToken: SBStorageToken): Promise<SBChannelHandle>;
    connect(handle: SBChannelHandle): Channel;
    connect(handle: SBChannelHandle, onMessage: (m: ChannelMessage) => void): ChannelSocket;
    get storage(): StorageApi;
    get crypto(): SBCrypto;
    get version(): string;
}
export { SB384, SBMessage, Channel, ChannelSocket, SBObjectHandle, Snackabra, arrayBufferToBase64, base64ToArrayBuffer, arrayBufferToBase62, base62ToArrayBuffer, version, setDebugLevel, };
export declare var SB: {
    Snackabra: typeof Snackabra;
    SBMessage: typeof SBMessage;
    Channel: typeof Channel;
    SBCrypto: typeof SBCrypto;
    SB384: typeof SB384;
    arrayBufferToBase64: typeof arrayBufferToBase64;
    base64ToArrayBuffer: typeof base64ToArrayBuffer;
    arrayBufferToBase62: typeof arrayBufferToBase62;
    base62ToArrayBuffer: typeof base62ToArrayBuffer;
    sbCrypto: SBCrypto;
    version: string;
    setDebugLevel: typeof setDebugLevel;
};
//# sourceMappingURL=snackabra.d.ts.map