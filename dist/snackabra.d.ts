declare const version = "2.0.0-alpha.5 (build 24)";
export declare const NEW_CHANNEL_MINIMUM_BUDGET: number;
export interface SBChannelHandle {
    [SB_CHANNEL_HANDLE_SYMBOL]?: boolean;
    channelId: SBChannelId;
    userPrivateKey: SBUserPrivateKey;
    channelServer?: string;
}
export interface Dictionary<T> {
    [index: string]: T;
}
export interface ChannelData {
    channelId: SBChannelId;
    ownerPublicKey: SBUserPublicKey;
    channelPublicKey: SBUserPublicKey;
    storageToken?: string;
}
export type ChannelMessageTypes = 'ack' | 'keys' | 'invalid' | 'ready' | 'encrypted' | 'control';
export interface ChannelMessage {
    type: ChannelMessageTypes;
    _id?: string;
    timestampPrefix?: string;
    channelID?: SBChannelId;
    encryptedContents?: EncryptedContents;
    contents?: ArrayBuffer;
    sign?: ArrayBuffer;
    senderUserId?: SBUserId;
    verificationToken?: string;
}
export interface ChannelAdminData {
    room_id?: SBChannelId;
    join_requests: Array<SBUserId>;
    capacity: number;
}
export interface EncryptParams {
    name?: string;
    iv?: ArrayBuffer;
    additionalData?: BufferSource;
    tagLength?: number;
}
export interface EncryptedContents {
    content: ArrayBuffer;
    iv: ArrayBuffer;
    timestamp?: number;
    sender?: SBUserId;
    sign?: ArrayBuffer;
}
export declare const msgTtlToSeconds: number[];
export declare const msgTtlToString: string[];
export interface SBMessageContents {
    contents?: ArrayBuffer;
    senderUserId?: SBUserId;
    sign?: ArrayBuffer;
    ttl?: number;
}
export type SBObjectType = 'f' | 'p' | 'b' | 't';
export type SBObjectHandleVersions = '1' | '2';
export declare namespace Interfaces {
    interface SBObjectHandle_base {
        [SB_OBJECT_HANDLE_SYMBOL]?: boolean;
        version?: SBObjectHandleVersions;
        type?: SBObjectType;
        verification?: Promise<string> | string;
        iv?: ArrayBuffer | string;
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
export declare class MessageBus {
    #private;
    bus: Dictionary<any>;
    subscribe(event: string, handler: CallableFunction): void;
    unsubscribe(event: string, handler: CallableFunction): void;
    publish(event: string, ...args: unknown[]): void;
}
declare function SBFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
export declare function getRandomValues(buffer: Uint8Array): Uint8Array;
export declare function base64ToArrayBuffer(str: string): Uint8Array;
export declare function compareBuffers(a: Uint8Array | ArrayBuffer | null, b: Uint8Array | ArrayBuffer | null): boolean;
declare function arrayBufferToBase64(buffer: BufferSource | ArrayBuffer | Uint8Array | null, variant?: 'b64' | 'url'): string;
export declare function arrayBufferToBase62(buffer: ArrayBuffer): string;
export declare function base62ToArrayBuffer(s: string): ArrayBuffer;
export type Base62Encoded = string & {
    _brand?: 'Base62Encoded';
};
export declare function base62ToArrayBuffer32(s: Base62Encoded): ArrayBuffer;
export declare function arrayBuffer32ToBase62(buffer: ArrayBuffer): Base62Encoded;
export declare function base62ToBase64(s: Base62Encoded): string;
export declare function base64ToBase62(s: string): Base62Encoded;
export declare function isBase62Encoded(value: string | Base62Encoded): value is Base62Encoded;
export declare function partition(str: string, n: number): void;
export declare function jsonParseWrapper(str: string | null, loc?: string, reviver?: (this: any, key: string, value: any) => any): any;
export interface SBPayload {
    [index: string]: ArrayBuffer;
}
export declare function assemblePayload2(data: SBPayload): ArrayBuffer | null;
export declare function assemblePayload(data: any): ArrayBuffer | null;
export declare function extractPayload2(payload: ArrayBuffer): SBPayload;
export declare function extractPayload(value: ArrayBuffer): any;
export declare function encodeB64Url(input: string): string;
export declare function decodeB64Url(input: string): string;
export declare enum KeyPrefix {
    SBPublicKey = "PNk2",
    SBPrivateKey = "Xj3p"
}
export declare class SBCrypto {
    #private;
    generateIdKey(buf: ArrayBuffer): Promise<{
        id_binary: ArrayBuffer;
        key_material: ArrayBuffer;
    }>;
    extractPubKey(privateKey: JsonWebKey): JsonWebKey | null;
    compareHashWithKey(hash: SB384Hash, key: JsonWebKey | null): Promise<boolean>;
    verifyChannelId(owner_key: JsonWebKey, channel_id: SBChannelId): Promise<boolean>;
    generateKeys(): Promise<CryptoKeyPair>;
    importKey(format: KeyFormat, key: BufferSource | JsonWebKey, type: 'ECDH' | 'AES' | 'PBKDF2', extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    exportKey(format: 'jwk', key: CryptoKey): Promise<JsonWebKey | undefined>;
    deriveKey(privateKey: CryptoKey, publicKey: CryptoKey, type: 'AES-GCM' | 'HMAC', extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    encrypt(data: BufferSource, key: CryptoKey, params: EncryptParams, returnType?: 'encryptedContents'): Promise<EncryptedContents>;
    encrypt(data: BufferSource, key: CryptoKey, params: EncryptParams, returnType?: 'arrayBuffer'): Promise<ArrayBuffer>;
    wrap(k: CryptoKey, b: ArrayBuffer): Promise<EncryptedContents>;
    unwrap(k: CryptoKey, o: EncryptedContents): Promise<ArrayBuffer>;
    sign(secretKey: CryptoKey, contents: ArrayBuffer): Promise<ArrayBuffer>;
    verify(verifyKey: CryptoKey, sign: ArrayBuffer, contents: ArrayBuffer): Promise<boolean>;
    str2ab(string: string): Uint8Array;
    ab2str(buffer: Uint8Array): string;
    compareKeys(key1: Dictionary<any>, key2: Dictionary<any>): boolean;
}
declare const SB_CHANNEL_HANDLE_SYMBOL: unique symbol;
declare const SB_MESSAGE_SYMBOL: unique symbol;
declare const SB_OBJECT_HANDLE_SYMBOL: unique symbol;
export declare const sbCrypto: SBCrypto;
export type SB384Hash = string;
export type SBUserId = SB384Hash;
export type SBChannelId = SB384Hash;
export type SBUserPublicKey = string;
export type SBUserPrivateKey = string;
declare class SB384 {
    #private;
    sb384Ready: Promise<SB384>;
    static ReadyFlag: symbol;
    constructor(key?: CryptoKey | JsonWebKey | SBUserPublicKey | SBUserPrivateKey, forcePrivate?: boolean);
    get SB384ReadyFlag(): boolean;
    set SB384ReadyFlag(v: boolean);
    get ready(): Promise<SB384>;
    get private(): boolean;
    get hash(): SB384Hash;
    get userId(): SB384Hash;
    get ownerChannelId(): string;
    get privateKey(): CryptoKey;
    get publicKey(): CryptoKey;
    get jwkPrivate(): JsonWebKey;
    get jwkPublic(): JsonWebKey;
    get userPublicKey(): SBUserPublicKey;
    get userPrivateKey(): SBUserPrivateKey;
}
export declare class SBChannelKeys extends SB384 {
    #private;
    sbChannelKeysReady: Promise<SBChannelKeys>;
    private SBChannelKeysReadyFlag;
    channelServer?: string;
    constructor(source: 'handle', handle: SBChannelHandle);
    constructor(source: 'jwk', handleOrJWK: JsonWebKey);
    constructor(source: 'new');
    get ready(): Promise<SBChannelKeys>;
    get readyFlag(): boolean;
    get channelData(): ChannelData;
    get owner(): boolean;
    get channelId(): string | undefined;
    get encryptionKey(): CryptoKey;
    get signKey(): CryptoKey;
    get channelPrivateKey(): CryptoKey;
    get channelPublicKey(): CryptoKey;
}
declare class SBMessage {
    #private;
    channel: Channel;
    [SB_MESSAGE_SYMBOL]: boolean;
    ready: Promise<SBMessage>;
    contents?: SBMessageContents;
    MAX_SB_BODY_SIZE: number;
    constructor(channel: Channel, contents: any, ttl?: number);
    get encryptionKey(): CryptoKey | undefined;
    send(): Promise<string>;
}
declare class Channel extends SBChannelKeys {
    #private;
    channelReady: Promise<Channel>;
    motd?: string;
    locked?: boolean;
    adminData?: Dictionary<any>;
    verifiedGuest: boolean;
    constructor(handle: SBChannelHandle);
    get ready(): Promise<Channel>;
    get readyFlag(): boolean;
    get api(): this;
    deCryptChannelMessage(m00: string, m01: EncryptedContents): Promise<ChannelMessage | undefined>;
    getLastMessageTimes(): void;
    getOldMessages(currentMessagesLength?: number, paginate?: boolean): Promise<Array<ChannelMessage>>;
    send(_msg: SBMessage | string): Promise<string>;
    updateCapacity(capacity: number): Promise<any>;
    getCapacity(): Promise<any>;
    getStorageLimit(): Promise<any>;
    getMother(): Promise<any>;
    getJoinRequests(): Promise<any>;
    isLocked(): Promise<boolean>;
    setMOTD(motd: string): Promise<any>;
    getAdminData(): Promise<ChannelAdminData>;
    authorize(ownerPublicKey: Dictionary<any>, serverSecret: string): Promise<any>;
    storageRequest(byteLength: number): Promise<Dictionary<any>>;
    acceptVisitor(userId: SBUserId): void;
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
    constructor(handle: SBChannelHandle, onMessage: (m: ChannelMessage) => void);
    get ready(): Promise<ChannelSocket>;
    get readyFlag(): boolean;
    get status(): "CLOSED" | "CONNECTING" | "OPEN" | "CLOSING";
    set onMessage(f: (m: ChannelMessage) => void);
    get onMessage(): (m: ChannelMessage) => void;
    set enableTrace(b: boolean);
    send(msg: SBMessage | any): Promise<string>;
}
declare class SBObjectHandle implements Interfaces.SBObjectHandle_base {
    #private;
    version: SBObjectHandleVersions;
    shardServer?: string;
    iv?: ArrayBuffer | string;
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
    constructor(sbServerOrStorageServer: string);
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
    create(owner: SB384, budget: Channel): Promise<SBChannelHandle>;
    connect(handle: SBChannelHandle, onMessage?: (m: ChannelMessage) => void): ChannelSocket;
    get storage(): StorageApi;
    get crypto(): SBCrypto;
    get version(): string;
}
export { SB384, SBMessage, Channel, ChannelSocket, SBObjectHandle, Snackabra, arrayBufferToBase64, version, };
export declare var SB: {
    Snackabra: typeof Snackabra;
    SBMessage: typeof SBMessage;
    Channel: typeof Channel;
    SBCrypto: typeof SBCrypto;
    SB384: typeof SB384;
    arrayBufferToBase64: typeof arrayBufferToBase64;
    sbCrypto: SBCrypto;
    version: string;
};
//# sourceMappingURL=snackabra.d.ts.map