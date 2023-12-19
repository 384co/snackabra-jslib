declare const version = "2.0.0-alpha.5 (build 16)";
export interface SBServer {
    channel_server: string;
    channel_ws: string;
    storage_server: string;
    shard_server?: string;
}
export interface SBChannelHandle {
    [SB_CHANNEL_HANDLE_SYMBOL]?: boolean;
    channelId: SBChannelId;
    userKeyString: SBUserKeyString;
    channelServer?: string;
}
interface Dictionary<T> {
    [index: string]: T;
}
export type SB384Hash = string;
export type SBChannelId = SB384Hash;
interface ChannelData {
    roomId?: SBChannelId;
    channelId?: SBChannelId;
    ownerKey: string;
    encryptionKey: string;
    signKey: string;
    motherChannel?: SBChannelId;
    storageToken?: string;
    SERVER_SECRET?: string;
    size?: number;
}
interface ImageMetaData {
    imgObjVersion?: SBObjectHandleVersions;
    imageId?: string;
    imageKey?: string;
    previewId?: string;
    previewKey?: string;
    previewNonce?: string;
    previewSalt?: string;
}
export interface ChannelMessage {
    type?: ChannelMessageTypes;
    keys?: ChannelKeyStrings;
    _id?: string;
    id?: string;
    timestamp?: number;
    timestampPrefix?: string;
    channelID?: SBChannelId;
    control?: boolean;
    encrypted?: boolean;
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
    replyTo?: JsonWebKey;
    whisper?: string;
    whispered?: boolean;
    sendTo?: SBUserId;
}
export interface ChannelKeys {
    ownerKey: CryptoKey;
    guestKey?: CryptoKey;
    encryptionKey: CryptoKey;
    signKey: CryptoKey;
    publicSignKey: CryptoKey;
    privateKey?: CryptoKey;
    lockedKey?: CryptoKey;
    encryptedLockedKey?: string;
}
interface ChannelKeyStrings {
    encryptionKey: string;
    guestKey?: string;
    ownerKey: string;
    signKey: string;
    encryptedLockedKey?: string;
    error?: string;
}
export interface ChannelAdminData {
    room_id?: SBChannelId;
    join_requests: Array<SBUserId>;
    capacity: number;
}
export interface EncryptedContents {
    content: string | ArrayBuffer;
    iv: string | Uint8Array;
}
export interface EncryptedContentsBin {
    content: ArrayBuffer;
    iv: Uint8Array;
}
export type ChannelMessageTypes = 'ack' | 'keys' | 'invalid' | 'ready' | 'encrypted';
interface SBMessageContents {
    contents: string;
    imgObjVersion?: SBObjectHandleVersions;
    image: string;
    imageMetaData?: ImageMetaData;
    image_sign?: string;
    imageMetadata_sign?: string;
    senderUserId?: SBUserId;
    sender_username?: string;
    encrypted: boolean;
    isVerfied: boolean;
    sign: string;
}
export type SBObjectType = 'f' | 'p' | 'b' | 't';
export type SBObjectHandleVersions = '1' | '2';
export declare namespace Interfaces {
    interface SBObjectHandle_base {
        [SB_OBJECT_HANDLE_SYMBOL]?: boolean;
        version?: SBObjectHandleVersions;
        type?: SBObjectType;
        verification?: Promise<string> | string;
        iv?: Uint8Array | string;
        salt?: Uint8Array | string;
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
export declare function encryptedContentsMakeBinary(o: EncryptedContents): EncryptedContentsBin;
export declare function getRandomValues(buffer: Uint8Array): Uint8Array;
export declare function base64ToArrayBuffer(str: string): Uint8Array;
export declare function compareBuffers(a: Uint8Array | ArrayBuffer | null, b: Uint8Array | ArrayBuffer | null): boolean;
declare function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array | null, variant?: 'b64' | 'url'): string;
export declare function arrayBufferToBase62(buffer: ArrayBuffer): string;
export declare function base62ToArrayBuffer(s: string): ArrayBuffer;
type Base62Encoded = string & {
    _brand?: 'Base62Encoded';
};
export declare function base62ToArrayBuffer32(s: Base62Encoded): ArrayBuffer;
export declare function arrayBuffer32ToBase62(buffer: ArrayBuffer): Base62Encoded;
export declare function base62ToBase64(s: Base62Encoded): string;
export declare function base64ToBase62(s: string): Base62Encoded;
export declare function isBase62Encoded(value: string | Base62Encoded): value is Base62Encoded;
export declare function partition(str: string, n: number): void;
export declare function jsonParseWrapper(str: string | null, loc?: string): any;
export interface SBPayload {
    [index: string]: ArrayBuffer;
}
export declare function extractPayloadV1(payload: ArrayBuffer): SBPayload;
export declare function assemblePayload(data: SBPayload): ArrayBuffer | null;
export declare function extractPayload(payload: ArrayBuffer): SBPayload;
export declare function encodeB64Url(input: string): string;
export declare function decodeB64Url(input: string): string;
type knownKeysInfo = {
    hash: SB384Hash;
    jwk?: JsonWebKey;
    key?: CryptoKey;
};
declare enum KeyPrefix {
    SBPublicKey = "PNk2",
    SBAES256Key = "X881",
    SBPrivateKey = "Xj3p"
}
interface SBAES256Key {
    prefix: KeyPrefix.SBAES256Key;
    k: Base62Encoded;
}
interface SBPrivateKey {
    prefix: KeyPrefix.SBPrivateKey;
    x: Base62Encoded;
    y: Base62Encoded;
    d: Base62Encoded;
}
interface SBPublicKey {
    prefix: KeyPrefix.SBPublicKey;
    x: Base62Encoded;
    y: Base62Encoded;
}
export declare function isSBKey(key: any): key is SBKey;
export type SBKey = SBAES256Key | SBPrivateKey | SBPublicKey;
export type SBUserKey = SBPrivateKey | SBPublicKey;
export type SBUserId = string;
export type SBUserKeyString = string;
type Key = JsonWebKey | SB384 | CryptoKey | SBKey;
declare class SBCrypto {
    #private;
    SBKeyToJWK(key: SBKey | JsonWebKey): JsonWebKey;
    JWKToSBKey(key: JsonWebKey, forcePublic?: boolean): SBKey | undefined;
    SBKeyToString(key: SBKey): SBUserId | SBUserKeyString | string;
    JWKToSBUserId(key: JsonWebKey): SBUserId | undefined;
    StringToSBKey(input: string): SBKey | undefined;
    StringToJWK(userId: SBUserId | SBUserKeyString | string): JsonWebKey | undefined;
    addKnownKey(key: Key): Promise<void>;
    lookupKeyGlobal(hash: SB384Hash): knownKeysInfo | undefined;
    generateIdKey(buf: ArrayBuffer): Promise<{
        id_binary: ArrayBuffer;
        key_material: ArrayBuffer;
    }>;
    extractPubKey(privateKey: JsonWebKey): JsonWebKey | null;
    sb384Hash(key?: JsonWebKey | CryptoKey): Promise<SB384Hash | undefined>;
    compareHashWithKey(hash: SB384Hash, key: JsonWebKey | null): Promise<boolean>;
    verifyChannelId(owner_key: JsonWebKey, channel_id: SBChannelId): Promise<boolean>;
    generateKeys(): Promise<CryptoKeyPair>;
    importKey(format: KeyFormat, key: BufferSource | JsonWebKey, type: 'ECDH' | 'AES' | 'PBKDF2', extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    exportKey(format: 'jwk', key: CryptoKey): Promise<JsonWebKey | undefined>;
    deriveKey(privateKey: CryptoKey, publicKey: CryptoKey, type: string, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    encrypt(data: BufferSource, key: CryptoKey, _iv?: Uint8Array | null, returnType?: 'encryptedContents'): Promise<EncryptedContents>;
    encrypt(data: BufferSource, key: CryptoKey, _iv?: Uint8Array | null, returnType?: 'arrayBuffer'): Promise<ArrayBuffer>;
    wrap(k: CryptoKey, b: string, bodyType: 'string'): Promise<EncryptedContents>;
    wrap(k: CryptoKey, b: ArrayBuffer, bodyType: 'arrayBuffer'): Promise<EncryptedContents>;
    unwrap(k: CryptoKey, o: EncryptedContents, returnType: 'string'): Promise<string>;
    unwrap(k: CryptoKey, o: EncryptedContents, returnType: 'arrayBuffer'): Promise<ArrayBuffer>;
    sign(secretKey: CryptoKey, contents: string): Promise<string>;
    verify(verifyKey: CryptoKey, sign: string, contents: string): Promise<boolean>;
    str2ab(string: string): Uint8Array;
    ab2str(buffer: Uint8Array): string;
    compareKeys(key1: Dictionary<any>, key2: Dictionary<any>): boolean;
    channelKeyStringsToCryptoKeys(keyStrings: ChannelKeyStrings): Promise<ChannelKeys>;
}
declare const SB_CHANNEL_HANDLE_SYMBOL: unique symbol;
declare const SB_MESSAGE_SYMBOL: unique symbol;
declare const SB_OBJECT_HANDLE_SYMBOL: unique symbol;
declare const sbCrypto: SBCrypto;
declare class SB384 {
    #private;
    ready: Promise<SB384>;
    sb384Ready: Promise<SB384>;
    constructor(key?: JsonWebKey | SBUserKeyString, forcePrivate?: boolean);
    get readyFlag(): boolean;
    get private(): boolean;
    get hash(): SB384Hash;
    get ownerChannelId(): string;
    get jwk(): JsonWebKey;
    get key(): CryptoKey;
    get exportable_pubKey(): JsonWebKey;
    get userKeyString(): string;
    get userId(): SBUserId;
}
declare class SBChannelKeys extends SB384 {
    #private;
    ready: Promise<SBChannelKeys>;
    sbChannelKeysReady: Promise<SBChannelKeys>;
    constructor(source: 'handle', handle: SBChannelHandle, channelKeyStrings?: ChannelKeyStrings);
    constructor(source: 'jwk', keys: JsonWebKey, channelKeyStrings?: ChannelKeyStrings);
    constructor(source: 'new');
    get readyFlag(): boolean;
    get encryptionKey(): CryptoKey;
    get channelSignKey(): CryptoKey;
    get owner(): boolean;
    get channelData(): ChannelData;
    get keys(): ChannelKeys;
    get channelId(): string | undefined;
    get channelServer(): string;
    set channelServer(channelServer: string);
}
declare class SBMessage {
    #private;
    channel: Channel;
    [SB_MESSAGE_SYMBOL]: boolean;
    ready: Promise<SBMessage>;
    contents: SBMessageContents;
    MAX_SB_BODY_SIZE: number;
    constructor(channel: Channel, bodyParameter?: SBMessageContents | string, sendToJsonWebKey?: JsonWebKey);
    get encryptionKey(): CryptoKey | undefined;
    get sendToPubKey(): JsonWebKey | undefined;
    send(): Promise<string>;
}
declare class Channel extends SBChannelKeys {
    #private;
    ready: Promise<Channel>;
    channelReady: Promise<Channel>;
    motd?: string;
    locked?: boolean;
    adminData?: Dictionary<any>;
    verifiedGuest: boolean;
    constructor(handle: SBChannelHandle);
    constructor(sbServer: SBServer, userKey: JsonWebKey, channelId: SBChannelId);
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
    downloadData(): Promise<unknown>;
    uploadChannel(channelData: ChannelData): Promise<any>;
    authorize(ownerPublicKey: Dictionary<any>, serverSecret: string): Promise<any>;
    postPubKey(_exportable_pubKey: JsonWebKey): Promise<{
        success: boolean;
    }>;
    storageRequest(byteLength: number): Promise<Dictionary<any>>;
    lock(key?: CryptoKey): Promise<{
        locked: boolean;
        lockedKey: JsonWebKey;
    }>;
    acceptVisitor(userId: SBUserId): Promise<unknown>;
    ownerKeyRotation(): void;
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
    ready: Promise<ChannelSocket>;
    channelSocketReady: Promise<ChannelSocket>;
    constructor(handle: SBChannelHandle, onMessage: (m: ChannelMessage) => void);
    constructor(sbServer: SBServer, onMessage: (m: ChannelMessage) => void, key: JsonWebKey, channelId: string);
    get status(): "CLOSED" | "CONNECTING" | "OPEN" | "CLOSING";
    set onMessage(f: (m: ChannelMessage) => void);
    get onMessage(): (m: ChannelMessage) => void;
    set enableTrace(b: boolean);
    send(msg: SBMessage | string): Promise<string>;
    get exportable_owner_pubKey(): CryptoKey;
}
declare class SBObjectHandle implements Interfaces.SBObjectHandle_base {
    #private;
    version: SBObjectHandleVersions;
    shardServer?: string;
    iv?: Uint8Array | string;
    salt?: Uint8Array | string;
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
declare class StorageApi {
    #private;
    storageServer: string;
    constructor(sbServerOrStorageServer: SBServer | string);
    storeObject(type: string, fileId: Base62Encoded, iv: Uint8Array, salt: Uint8Array, storageToken: string, data: ArrayBuffer): Promise<Dictionary<any>>;
    storeData(buf: BodyInit | Uint8Array, type: SBObjectType, channelOrHandle: SBChannelHandle | Channel): Promise<Interfaces.SBObjectHandle>;
    fetchData(handle: Interfaces.SBObjectHandle, returnType: 'string'): Promise<string>;
    fetchData(handle: Interfaces.SBObjectHandle, returnType?: 'arrayBuffer'): Promise<ArrayBuffer>;
    retrieveImage(imageMetaData: ImageMetaData, controlMessages: Array<ChannelMessage>, imageId?: string, imageKey?: string, imageType?: SBObjectType, imgObjVersion?: SBObjectHandleVersions): Promise<Dictionary<any>>;
}
declare class Snackabra {
    #private;
    channelServer: string;
    storageServer: string | string;
    constructor(sbServerOrChannelServer: SBServer | string, setDBG?: boolean, setDBG2?: boolean);
    attach(handle: SBChannelHandle): Promise<Channel>;
    create(ownerKeys: SB384, budgetChannel: Channel): Promise<SBChannelHandle>;
    create(sbServer: SBServer, serverSecretOrBudgetChannel?: string | Channel, keys?: JsonWebKey): Promise<SBChannelHandle>;
    connect(handle: SBChannelHandle, onMessage?: (m: ChannelMessage) => void): ChannelSocket;
    get storage(): StorageApi;
    get crypto(): SBCrypto;
    get version(): string;
}
export type { ChannelData, ChannelKeyStrings, ImageMetaData };
export { SB384, SBMessage, Channel, ChannelSocket, SBObjectHandle, Snackabra, SBCrypto, arrayBufferToBase64, sbCrypto, version, };
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