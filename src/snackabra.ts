/*
   Copyright (C) 2020-2023 Magnusson Institute, All Rights Reserved

   "Snackabra" is a registered trademark

   Snackabra SDK - Server See https://snackabra.io for more information.

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU Affero General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option) any
   later version.

   This program is distributed in the hope that it will be useful, but WITHOUT
   ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
   FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more
   details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see www.gnu.org/licenses/

*/

/******************************************************************************************************/
//#region Interfaces - Types

// minimum when creating a new channel. channels can be reduced below this, but
// not created below this. todo: this should be from a server config.
export const NEW_CHANNEL_MINIMUM_BUDGET = 8 * 1024 * 1024; // 8 MB

export const SBStorageTokenPrefix = 'LM2r' // random prefix

export interface SBStorageToken {
  [SB_STORAGE_TOKEN_SYMBOL]?: boolean,
  hash: string, // random base62 string
  size?: number,
  motherChannel?: SBChannelId,
  created?: number,
  used?: boolean,
}

// generally speaking, '_check_' functions return true if the object looks like
// it's a valid instance of the corresponding type

export function _check_SBStorageToken(data: SBStorageToken) {
  return (
    Object.getPrototypeOf(data) === Object.prototype
    && data.hash && typeof data.hash === 'string' && data.hash.length > 0
    && (!data.size || Number.isInteger(data.size) && data.size > 0)
    && (!data.motherChannel || typeof data.motherChannel === 'string')
    && (!data.created || Number.isInteger(data.created))
    && (!data.used || typeof data.used === 'boolean')
  )
}

export function validate_SBStorageToken(data: SBStorageToken): SBStorageToken {
  if (!data) throw new SBError(`invalid SBStorageToken (null or undefined)`)
  else if (data[SB_STORAGE_TOKEN_SYMBOL]) return data as SBStorageToken
  else if (typeof data === 'string' && (data as string).slice(0, 4) === SBStorageTokenPrefix)
    // if at runtime we get just the hash, we 'upgrade' the type to help caller
    return { [SB_STORAGE_TOKEN_SYMBOL]: true, hash: data as string } as SBStorageToken
  else if (_check_SBStorageToken(data)) {
    return { ...data, [SB_STORAGE_TOKEN_SYMBOL]: true } as SBStorageToken
  } else {
    if (DBG) console.error('invalid SBStorageToken ... trying to ingest:\n', data)
    throw new SBError(`invalid SBStorageToken`)
  }
}

/** 
 * Channel 'descriptor'. 
 */
export interface SBChannelHandle {
  [SB_CHANNEL_HANDLE_SYMBOL]?: boolean, // future use for internal validation

  // minimum info is the key
  userPrivateKey: SBUserPrivateKey,

  // if channelID is omitted, then the key will be treated as the Owner key
  // (channelId is always derived from owner key)
  channelId?: SBChannelId,

  // if channel server is omitted, will use default (global) server
  channelServer?: string,

  // server-side channel data; if missing the server can provide it; if the
  // handle is meant to be 'completely stand-alone', then this is best included
  channelData?: SBChannelData,
}

// returns true of false, does not throw
export function _check_SBChannelHandle(data: SBChannelHandle) {
  if (!data) return false
  return (
    Object.getPrototypeOf(data) === Object.prototype
    && data.userPrivateKey && typeof data.userPrivateKey === 'string' && data.userPrivateKey.length > 0
    && (!data.channelId || (typeof data.channelId === 'string' && data.channelId.length === 43))
    && (!data.channelServer || typeof data.channelServer === 'string')
    && (!data.channelData || _check_SBChannelData(data.channelData))
  )
}

/** Validates 'SBChannelHandle', throws if there's an issue */
export function validate_SBChannelHandle(data: SBChannelHandle): SBChannelHandle {
  if (!data) throw new SBError(`invalid SBChannelHandle (null or undefined)`)
  else if (data[SB_CHANNEL_HANDLE_SYMBOL]) return data as SBChannelHandle
  else if (_check_SBChannelHandle(data)) {
    return { ...data, [SB_CHANNEL_HANDLE_SYMBOL]: true } as SBChannelHandle
  } else {
    if (DBG2) console.error('invalid SBChannelHandle ... trying to ingest:\n', data)
    throw new SBError(`invalid SBChannelHandle`)
  }
}

/**
 * This is what the Channel Server knows about the channel.
 * 
 * Note: all of these are (ultimately) strings, and are sent straight-up
 * to/from channel server.
 */
export interface SBChannelData {
  channelId: SBChannelId,
  ownerPublicKey: SBUserPublicKey,
  // used when creating/authorizing a channel
  storageToken?: SBStorageToken,
}

export function _check_SBChannelData(data: SBChannelData) {
  return (
    Object.getPrototypeOf(data) === Object.prototype
    && data.channelId && data.channelId.length === 43
    && data.ownerPublicKey && typeof data.ownerPublicKey === 'string' && data.ownerPublicKey.length > 0
    && (!data.storageToken || validate_SBStorageToken(data.storageToken))
  )
}

export function validate_SBChannelData(data: any): SBChannelData {
  if (!data) throw new SBError(`invalid SBChannelData (null or undefined)`)
  else if (_check_SBChannelData(data)) {
    return data as SBChannelData
  } else {
    if (DBG) console.error('invalid SBChannelData ... trying to ingest:\n', data)
    throw new SBError(`invalid SBChannelData`)
  }
}

/**
 * This is whatever token system the channel server uses.
 * 
 * For example with 'channel-server', you could command-line bootstrap with
 * something like:
 * 
 * '''bash
 *   wrangler kv:key put --preview false --binding=LEDGER_NAMESPACE "zzR5Ljv8LlYjgOnO5yOr4Gtgr9yVS7dTAQkJeVQ4I7w" '{"used":false,"size":33554432}'
 * 
 */
export type SBStorageTokenHash = string

interface WSProtocolOptions {
  version?: number,
  url: string, // not the user (client) url, but where the socket is
  websocket?: WebSocket, // will have a value if we've connected
  onOpen?: null | CallableFunction,
  ready: boolean,
  // onMessage?: null | CallableFunction,
  onClose?: null | CallableFunction,
  onError?: null | CallableFunction,
  timeout?: number,
  closed: boolean,
}
/**
 * The "app" level message format, provided to onMessage (by ChannelSocket), and
 * similar interfaces. Note it will only be forwarded if verified.
 */
export interface Message {
  // this is the actual message, most apps don't need the rest
  body: any;

  // the rest is provided by channel server, or reconstructed by library
  channelId: SBChannelId;
  sender: SBUserId;
  messageTo?: SBUserId; // implied is userId of channel, but note that all 'private' messages are 'cc' to Owner
  senderPublicKey: SBUserPublicKey;
  senderTimestamp: number;
  serverTimestamp: number; // reconstructed from timestampPrefix
  eol?: number; // end of life (timestamp), if present
  _id: string;
  previous?: string; // if present, hash of previous message from this sender
}

export function validate_Message(data: Message): Message {
  if (!data) throw new SBError(`invalid Message (null or undefined)`)
  else if (
    // body can be anything, but must be something
    data.body !== undefined && data.body !== null
    && data.channelId && typeof data.channelId === 'string' && data.channelId.length === 43
    && data.sender && typeof data.sender === 'string' && data.sender.length === 43
    && data.senderPublicKey && typeof data.senderPublicKey === 'string' && data.senderPublicKey.length > 0
    && data.senderTimestamp && Number.isInteger(data.senderTimestamp)
    && data.serverTimestamp && Number.isInteger(data.serverTimestamp)
    && data._id && typeof data._id === 'string' && data._id.length === 75 // 86 new v3 format is shorter (base 4)
  ) {
    return data as Message
  } else {
    if (DBG) console.error('invalid Message ... trying to ingest:\n', data)
    throw new SBError(`invalid Message`)
  }
}

/**
 * Pretty much every api call needs a payload that contains the
 * api request, information about 'requestor' (user/visitor),
 * signature of same, time stamp, yada yada.
 */
export interface ChannelApiBody {
  [SB_CHANNEL_API_BODY_SYMBOL]?: boolean,
  channelId: SBChannelId,
  path: string,
  userId: SBUserId,
  userPublicKey: SBUserPublicKey,
  isOwner?: boolean,
  timestamp: number,
  sign: ArrayBuffer
  apiPayloadBuf?: ArrayBuffer,
  apiPayload?: any, // if present, extracted from apiPayloadBuf
}

// return self if it matches shape, otherwise throw
// extraneous properties are ignored
export function validate_ChannelApiBody(body: any): ChannelApiBody {
  if (!body) throw new SBError(`invalid ChannelApiBody (null or undefined)`)
  else if (body[SB_CHANNEL_API_BODY_SYMBOL]) return body as ChannelApiBody
  else if (
    body.channelId && body.channelId.length === 43
    && body.path && typeof body.path === 'string' && body.path.length > 0
    && body.userId && typeof body.userId === 'string' && body.userId.length === 43
    && body.userPublicKey && body.userPublicKey.length > 0
    && (!body.isOwner || typeof body.isOwner === 'boolean')
    && (!body.apiPayloadBuf || body.apiPayloadBuf instanceof ArrayBuffer)
    && body.timestamp && Number.isInteger(body.timestamp)
    && body.sign && body.sign instanceof ArrayBuffer
  ) {
    return { ...body, [SB_CHANNEL_API_BODY_SYMBOL]: true } as ChannelApiBody
  } else {
    if (DBG) console.error('invalid ChannelApiBody ... trying to ingest:\n', body)
    throw new SBError(`invalid ChannelApiBody`)
  }
}

/**
 * SB standard wrapped encrypted messages. This is largely 'internal', normal
 * usage of the library will work at a higher level ('Message' interface).
 *
 * Encryption is done with AES-GCM, 16 bytes of salt.
 *
 * Timestamp prefix is fourty-two (26) [0-3] characters. It encodes epoch
 * milliseconds * 4^4 (last four are '0000').
 *
 * "Everything is optional" as this is used in multiple contexts. Use
 * ``validate_ChannelMessage()`` to validate.
 *
 * Note that channel server doesn't need userPublicKey on every channel message
 * since it's provided on websocket setup.
 *
 * Complete channel "_id" is channelId + '_' + subChannel + '_' +
 * timestampPrefix This allows (prefix) searches within time spans on a per
 * channel (and if applicable, subchannel) basis. Special subchannel 'blank'
 * (represented as '____') is the default channel and generally the only one
 * that visitors have access to.
 *
 * A core exception is that all messages with a TTL in the range 1-7 (eg range
 * of 1 minute to 72 hours) are duplicated onto subchannels matching the TTLs,
 * namely '___1', '___2', '___3', etc. Thus an oldMessages fetch can for example
 * request '___4' to get all messages that were sent with TTL 4 (eg 1 hour).
 * Which also means that as Owner, if you set TTL on a message then you can't
 * use the fourth character (if you try to while setting a TTL, channel server
 * will reject it).
 *
 * Properties that are generally retained or communicated inside payload
 * packaging have short names (apologies for lack of readability).
 * 'unencryptedContents' has a long and cumbersome name for obvious reasons.
 *
 * There are a couple of semantics that are enforced by the channel server;
 * since this is partly a policy issue of the channel server, anything in this
 * jslib documentation might be incomplete. For example, baseline channel server
 * does not allow messages to both be 'infinite ttl' and addressed (eg have a
 * 'to' field value). 
 *
 * If any protocol wants to do additional or different encryption, it would need
 * to wrap: the core binary format is defined to have room for iv and salt, and
 * prescribes sizes 12 and 16 respectively. Strictly speaking, the protocol can
 * use these 28 bytes for whatever it wants. A protocol that wants to do
 * something completely different can simply modify the 'c' (contents) buffer
 * and append any binary data it needs.
 *
 */
export interface ChannelMessage {
  [SB_CHANNEL_MESSAGE_SYMBOL]?: boolean,

  // the following is minimum when *sending*. see also stripChannelMessage()
  f?: SBUserId, // 'from': public (hash) of sender, matches publicKey of sender, verified by channel server
  c?: ArrayBuffer | string, // encrypted contents, or an unencrypted 'string message' if 'stringMessage' is true
  iv?: Uint8Array, // nonce, always present whether needed by protocol or not (12 bytes)
  salt?: ArrayBuffer, // salt, always present whether needed by protocol or not (16 bytes)
  s?: ArrayBuffer, // signature
  ts?: number, // timestamp at point of encryption, by client, verified along with encrypt/decrypt
  cs?: string, // channel server, if present, clarifies where message was processed

  // the remainder are either optional (with default values), internally used,
  // server provided, or can be reconstructed
  channelId?: SBChannelId, // channelId base62 x 43
  i2?: string, // subchannel; default is '____', can be any 4xbase62; only owner can read/write subchannels
  sts?: number, //  timestamp from server
  timestampPrefix?: string, // string/base4 encoding of timestamp (see timestampToBase4String)
  _id?: string, // channelId + '_' + subChannel + '_' + timestampPrefix
  p?: string; // if present, hash of previous message from this sender

  // whatever is being sent; should (must) be stripped when sent. when
  // encrypted, this is packaged as payload first (signing is done on the
  // payload version)
  unencryptedContents?: any,
  stringMessage?: boolean, // internal, if true then do not package ('string' message)

  ready?: boolean, // if present, signals other side is ready to receive messages (rest of message ignored)
  error?: string, // if present, signals error (and rest of message ignored)
  t?: SBUserId, // 'to': public (hash) of recipient; note that Owner sees all messages; if omitted usually means broadcast
  ttl?: number, // Value 0-15; if it's missing it's 15/0xF (infinite); if it's 1-7 it's duplicated to subchannels
  protocol?: SBProtocol, // protocol to be used for message
}

export function validate_ChannelMessage(body: ChannelMessage): ChannelMessage {
  if (!body) throw new SBError(`invalid ChannelMessage (null or undefined)`)
  else if (body[SB_CHANNEL_MESSAGE_SYMBOL]) return body as ChannelMessage
  else if (
    // these are minimally required
    (body.f && typeof body.f === 'string' && body.f.length === 43)
    && (body.c && body.c instanceof ArrayBuffer)
    && (body.ts && Number.isInteger(body.ts))
    && (body.iv && body.iv instanceof Uint8Array && body.iv.length === 12)
    && (body.s && body.s instanceof ArrayBuffer)
    && (body.cs === undefined || typeof body.cs === 'string')

    && (!body.sts || Number.isInteger(body.sts)) // if present came from server
    && (!body.salt || body.salt instanceof ArrayBuffer && body.salt.byteLength === 16) // required by the time we send it

    // todo: might as well add regexes to some of these
    && (!body._id || (typeof body._id === 'string' && body._id.length === 86))
    && (!body.ready || typeof body.ready === 'boolean')
    && (!body.timestampPrefix || (typeof body.timestampPrefix === 'string' && body.timestampPrefix.length === 26))
    && (!body.channelId || (typeof body.channelId === 'string' && body.channelId.length === 43))
    // 'subChannel': 'i2' is a bit more complicated, it must be 4xbase62 (plus boundary '_'), so we regex against [a-zA-Z0-9_]
    && (!body.i2 || (typeof body.i2 === 'string' && /^[a-zA-Z0-9_]{4}$/.test(body.i2)))
    // body.ttl must be 0-15 (4 bits)
    && (body.ttl === undefined || (Number.isInteger(body.ttl) && body.ttl >= 0 && body.ttl <= 15))
  ) {
    return { ...body, [SB_CHANNEL_MESSAGE_SYMBOL]: true } as ChannelMessage
  } else {
    if (DBG2) console.error('invalid ChannelMessage ... trying to ingest:\n', body)
    throw new SBError(`invalid ChannelMessage`)
  }
}

/**
 * Complements validate_ChannelMessage. This is used to strip out the parts that
 * are not strictly needed. Addresses privacy, security, and message size
 * issues. Note that 'ChannelMessage' is a 'public' interface, in the sense that
 * this is what is actually stored (as payload ArrayBuffers) at rest, both on
 * servers and clients.
 * 
 * 'serverMode' is slightly more strict and used by server-side code.
 */
export function stripChannelMessage(msg: ChannelMessage, serverMode: boolean = false): ChannelMessage {
  if (DBG2) console.log('stripping message:\n', msg)
  const ret: ChannelMessage = {}
  if (msg.f !== undefined) ret.f = msg.f; else throw new SBError("ERROR: missing 'f' ('from') in message")
  if (msg.c !== undefined) ret.c = msg.c; else throw new SBError("ERROR: missing 'ec' ('encrypted contents') in message")
  // if it's a 'string' type message, it's not encrypted, so no nonce
  if (msg.iv !== undefined) ret.iv = msg.iv; else if (!(msg.stringMessage) === true) throw new SBError("ERROR: missing 'iv' ('nonce') in message")
  if (msg.salt !== undefined) ret.salt = msg.salt; else throw new SBError("ERROR: missing 'salt' in message")
  if (msg.s !== undefined) ret.s = msg.s; else if (!(msg.stringMessage) === true) throw new SBError("ERROR: missing 's' ('signature') in message")
  if (msg.ts !== undefined) ret.ts = msg.ts; else throw new SBError("ERROR: missing 'ts' ('timestamp') in message")
  if (msg.sts !== undefined) ret.sts = msg.sts; else if (serverMode) throw new SBError("ERROR: missing 'sts' ('servertimestamp') in message")
  if (msg.ttl !== undefined && msg.ttl !== 0xF) ret.ttl = msg.ttl; // optional, and we strip if set to default value
  if (msg.t !== undefined) ret.t = msg.t; // 'to', optional but if present is kept
  if (msg.i2 !== undefined && msg.i2 !== '____') ret.i2 = msg.i2; // optional, also we strip out default value
  if (msg.cs !== undefined) ret.cs = msg.cs; // optional
  return ret
}

/**
 * This corresponds to all important meta-data on a channel that an Owner
 * has access to.
 */
export interface ChannelAdminData {
  channelId: SBChannelId,
  channelData: SBChannelData,
  capacity: number,
  locked: boolean,
  accepted: Set<SBUserId>,
  visitors: Map<SBUserId, SBUserPublicKey>,
  storageLimit: number,
  motherChannel: SBChannelId,
  latestTimestamp: string, // base4 'x256' format
}

/**
 * This is eseentially web standard type AesGcmParams, but with properties being
 * optional - they'll be filled in at the "bottom layer" if missing (and if
 * needed).
 */
export interface EncryptParams {
  name?: string;
  iv?: ArrayBuffer;
  additionalData?: BufferSource;
  tagLength?: number;
}

// these are typically set in the build process
declare var DBG: boolean;
declare var DBG2: boolean;

if (typeof DBG === 'undefined') (globalThis as any).DBG = false
if (typeof DBG2 === 'undefined') (globalThis as any).DBG2 = false

var DBG0 = false // internal, set it to 'true' or 'DBG2'
if (DBG0) console.log("++++ Setting DBG0 to TRUE ++++");
var DBG1 = false // internal, set it to 'true' or 'DBG2'

// ... testing moving this to build process
// // in addition, for convenience (such as in test suites) we 'pick up' configuration.DEBUG
// if ((globalThis as any).configuration && (globalThis as any).configuration.DEBUG === true) {
//   DBG = true
//   if (DBG) console.warn("++++ Setting DBG to TRUE based on 'configuration.DEBUG' ++++");
//   if ((globalThis as any).configuration.DEBUG2 === true) {
//     DBG2 = true
//     if (DBG) console.warn("++++ ALSO setting DBG2 (verbose) ++++");
//   }
// }

// ... testing moving this to build process
// ... and in some cases we need explit access to poke these
function setDebugLevel(_dbg1: boolean, _dbg2?: boolean) {
  // DBG = dbg1
  // if (dbg2) DBG2 = dbg1 && dbg2
  // if (DBG) console.warn("++++ [setDebugLevel]: setting DBG to TRUE ++++");
  // if (DBG2) console.warn("++++ [setDebugLevel]: ALSO setting DBG2 to TRUE (verbose) ++++");
}

/**
     Index/number of seconds/string description of TTL values (0-15) for
     messages.

     ```text
         #    Seconds  Description
         0          0  Ephemeral (not stored)
         1             <reserved>
         2             <reserved>
         3         60  One minute (current minimum)
         4        300  Five minutes
         5       1800  Thirty minutes
         6      14400  Four hours
         7     129600  36 hours
         8     864000  Ten days
        10             <reserved> (all 'reserved' future choices will be monotonically increasing)
        11             <reserved>
        12             <reserved>
        13             <reserved>
        14             <reserved>
        15   Infinity  Permastore, this is the default.
      ```

      Note that time periods above '8' (10 days) is largely TBD pending
      finalization of what the storage server will prefer. As far as messages
      are concerned, anything above '8' is 'very long'.

      A few rules around messages and TTL (this list is not exhaustive):

      - Currently only values 0, 3-8, and 15 are valid (15 is default).
      - Routable messages (eg messages with a 'to' field) may not have ttl above '8'.
      - TTL messages are never in storage shards; channel servers can chose to
        limit how many they will keep (on a per TTL category basis) regardless
        of time value (but at least last 1000).
      - TTL messages are duplicated and available on 'main' channel ('i2')
        '____' as well as on subchannels '___3', '___4', up to '___8'.

      It's valid to encode it as four bits.
*/
export type MessageTtl = 0 | 3 | 4 | 5 | 6 | 7 | 8 | 15

export const msgTtlToSeconds = [0, -1, -1, 60, 300, 1800, 14400, 129600, 864000, -1, -1, -1, -1, -1, Infinity]
export const msgTtlToString = ['Ephemeral', '<reserved>', '<reserved>', 'One minute', 'Five minutes', 'Thirty minutes', 'Four hours', '36 hours', '10 days', '<reserved>', '<reserved>', '<reserved>', '<reserved>', '<reserved>', 'Permastore (no TTL)']

// mostly historical
// export type SBObjectType = 'f' | 'p' | 'b' | 't' | '_' | 'T'

// this library essentially only supports '3'
export type SBObjectHandleVersions = '1' | '2' | '3'
const currentSBOHVersion: SBObjectHandleVersions = '3'

if (typeof WeakRef === "undefined") {
  class PolyfillWeakRef<T> {
    private _target: T;
    constructor(target: T) {
      this._target = target;
    }
    deref(): T | undefined {
      return this._target;
    }
  }
  Object.defineProperty(PolyfillWeakRef.prototype, Symbol.toStringTag, {
    value: 'WeakRef',
    configurable: true,
  });
  globalThis.WeakRef = PolyfillWeakRef as any;
}

/**
 * This is the lowest-level format of shard information that's presented across
 * an API. Internally, the storage server uses slightly different interfaces.
 */
export interface ShardInfo {
  version?: SBObjectHandleVersions,
  id: Base62Encoded, // strictly speaking, only id is needed
  iv?: Uint8Array | Base62Encoded,
  salt?: ArrayBuffer | Base62Encoded,
  actualSize?: number, // actual size of underlying (packaged, padded, and encrypted) contents
  verification?: Promise<string> | string,
  data?: WeakRef<ArrayBuffer> | ArrayBuffer, // if present, the raw data (packaged, encrypted)
}

/**
 * SBObjectHandle  (extends ShardInfo)
 *
 * SBObjectHandle encodes necessary information for a shard, as well as some
 * conveniences for making contents available after it's loaded.
 *
 * - id is a 43 character base62 string that identifies the object. It is used
 *   to retrieve the object from the storage server.
 *
 * - version is a single character string that indicates the version of the
 *   object handle. '1' and '2' are legacy, '3' is current.
 * - key is a 43 character base62
 *
 * - verification is a random (server specific) string that is used to verify
 *   that you're allowed to access the object (specifically, that somebody,
 *   perhaps you, has paid for the object).
 *
 * - iv and salt are optional, but provide some safeguards. Object server
 *   will provide these for an object.
 * 
 * - hash can be slightly confusing: it hashes the packaged (but not encrypted,
 *   nor padded) contents. It needs to hash the packaged contents since 'payload'
 *   can be any object, and the hashing needs to operate against an array buffer.
 *   If the object per se is an arraybuffer (eg a chunk of a large file), then
 *   it will nevertheless be hashed in the 'payload' format. This is the hash
 *   that the global 'Snackabra.knownShards' uses as index.
 *
 */
export interface SBObjectHandle extends ShardInfo {
  [SB_OBJECT_HANDLE_SYMBOL]?: boolean,
  key?: Base62Encoded, // decryption key
  storageServer?: string, // if present, clarifies where to get it (or where it was found)

  // ToDo: might want to transition to weakref
  payload?: any // if present, decrypted and extracted data

  // for some backwards compatibility, and means something different in jslib
  // than in storage server. slowly being deprecated.
  type?: string,

  hash?: string, // hash of the object (hashed in payload format)

  // UPDATE: jslib has no 'file' concept, refactoring this out
  // // various additional properties are optional. note that core SB lib does not
  // // have a concept of a 'file'
  // fileName?: string, // by convention will be "PAYLOAD" if it's a set of objects
  // dateAndTime?: string, // time of shard creation
  // fileType?: string, // file type (mime)
  // lastModified?: number, // last modified time (of underlying file, if any)
  // savedSize?: number, // size of shard (may be different from actualSize)
}

export function _check_SBObjectHandle(h: SBObjectHandle) {
  return (
    Object.getPrototypeOf(h) === Object.prototype
    && (!h.version || h.version === currentSBOHVersion) // anything 'this' code sees needs to be v3
    && h.id && typeof h.id === 'string' && h.id.length === 43
    && (!h.key || (typeof h.key === 'string' && h.key.length === 43))
    && (!h.verification || typeof h.verification === 'string' || typeof h.verification === 'object')
    && (!h.iv || typeof h.iv === 'string' || h.iv instanceof Uint8Array)
    && (!h.salt || typeof h.salt === 'string' || h.salt instanceof ArrayBuffer)
  )
}

export function validate_SBObjectHandle(h: SBObjectHandle) {
  if (!h) throw new SBError(`invalid SBObjectHandle (null or undefined)`)
  else if (h[SB_OBJECT_HANDLE_SYMBOL]) return h as SBObjectHandle
  else if (_check_SBObjectHandle(h)) {
    return { ...h, [SB_OBJECT_HANDLE_SYMBOL]: true } as SBObjectHandle
  } else {
    if (DBG) console.error('invalid SBObjectHandle ... trying to ingest:\n', h)
    throw new SBError(`invalid SBObjectHandle`)
  }
}

/**
 * In some circumstances we need to make sure we have a JSON serializable
 * version of the object handle, eg that iv and salt are base62 strings,
 * and that the verification has been resolved
 */
export async function stringify_SBObjectHandle(h: SBObjectHandle) {
  if (h.iv) h.iv = typeof h.iv === 'string' ? h.iv : arrayBufferToBase62(h.iv)
  if (h.salt) h.salt = typeof h.salt === 'string' ? h.salt : arrayBufferToBase62(h.salt)
  h.verification = await h.verification
  return validate_SBObjectHandle(h)
}

// These are 256 bit hash identifiers (43 x base62)
// (see SB384.hash for details)
export type SB384Hash = string

/**
 * The three encodings of a 'user'
 */
export type SBUserId = SB384Hash // 256 bit hash (43 x base62)
export type SBChannelId = SB384Hash // same format, always the owner's hash
export type SBUserPublicKey = string // public key encoding
export type SBUserPrivateKey = string // private key encoding

type jwkStruct = {
  x: string;
  y: string;
  ySign: 0 | 1;
  d?: string
}

//#endregion - Interfaces - Types

/******************************************************************************************************/
//#region - Deep History

const _SEP_ = '='.repeat(76)
const _SEP = '\n' + _SEP_
// const SEP_ = _SEP_ + '\n'

const TEST_WITH_SMALL_BRANCHING = false // if true, will use NON PRODUCTION settings for DeepHistory
if (TEST_WITH_SMALL_BRANCHING && !(DBG0 || DBG1)) throw new Error("TEST_WITH_SMALL_BRANCHING is set, but DBG0 or DBG1 is not set");

// all (value) nodes are indexed with strings; and they are always sorted etc
export interface TreeNodeValueType {
  type: 'messageHistory',
  from: string,
  to: string,
  count: number,
}

export class HistoryTreeNode<FrozenType> {

  // it's either one or the other of these arrays, but merging the types will
  // lead to convoluted code (eg type guards for constructed vs generic types).
  childrenNodes: HistoryTreeNode<FrozenType>[] = [];
  childrenValues: TreeNodeValueType[] = [];

  from: string | undefined = undefined;
  to: string | undefined = undefined;
  count: number = 0;
  isFull: boolean = false;
  height: number = 1;
  frozenChunkId: FrozenType | undefined = undefined; // if we're frozen at this point, this is the chunk number

  constructor(
    public isLeaf: boolean = false // if true, children array has TreeNodeValueType members, otherwise TreeNode members
  ) { }

  // Inserts a value (will always succeed). Will handle any partial freezing or merging of nodes.
  async insertTreeNodeValue(
    root: HistoryTree<FrozenType>,
    value: TreeNodeValueType
  ): Promise<void> {
    if (this.isFull) throw new Error("Should not be inserting here")
    const { count, from, to } = value
    this.count += count; // we are always the destination of the count
    if (isNil(this.from) !== isNil(this.to)) throw new Error("Internal Error (L70)")
    if (isNil(this.from) || isNil(this.to)) {
      this.from = from;
      this.to = to;
    } else if (to > this.to) {
      this.to = to;
    } else throw new Error("Internal Error (L76)")
    if (this.isLeaf) {
      if (DBG0) console.log("We are a leaf, ergo we insert the value as a child")
      if (DBG1) console.log(value)
      this.childrenValues.push(value);
      if (this.childrenValues.length === root.branchFactor) {
        if (DBG0) console.log("... that was the last value child we have room for, so, we freeze ('leaf')")
        this.isFull = true;
        const x = this.export()
        this.frozenChunkId = await root.freeze(x)
        this.childrenValues.length = 0; // coldsleep, all of them, look out for Steel
        if (DBG1) console.log(SEP, "How 'we' look like after freezing:\n", this, SEP)
      }
      if (DBG2) console.log("... done, result:\n", this)
    } else if (this.childrenNodes.length === 0 || this.childrenNodes[this.childrenNodes.length - 1].isFull) {
      if (DBG0) console.log("We either have no children, or they're all full")
      if (this.childrenNodes.length === root.branchFactor) throw new Error("Internal Error (L100)")
      const newNode = new HistoryTreeNode<FrozenType>(true); // always start with leaf node
      await newNode.insertTreeNodeValue(root, value);
      this.childrenNodes.push(newNode);
    } else {
      if (DBG0) console.log("We have children, and the last one is not full, pick last on our list and insert")
      await this.childrenNodes[this.childrenNodes.length - 1].insertTreeNodeValue(root, value);
      if (this.childrenNodes[this.childrenNodes.length - 1].isFull && this.childrenNodes.length === root.branchFactor) {
        if (DBG0) console.log("That filled up our last child, and we have a full set of children ...")
        let allEqual = true;
        let i = 0;
        for (i = 0; i < this.childrenNodes.length - 1; i++)
          if (this.childrenNodes[i].height !== this.childrenNodes[i + 1].height) {
            allEqual = false;
            break;
          }
        if (allEqual) {
          if (DBG0) console.log("... and they are all the same height, thus, we freeze ('node')")
          if (DBG1) console.log("... here is what we look like before freezing:\n", this)
          this.isFull = true;
          this.frozenChunkId = await root.freeze(this.export());
          this.childrenNodes.length = 0; // coldsleep, all of them, look out for Steel
        } else {
          if (DBG0) console.log("... but they are not all the same height, so the 'right' side are shiftedn 'down'")
          // we know that child 'i+1' onwards are shorter than child 'i'; merge those into a new node
          const newChild = new HistoryTreeNode<FrozenType>();
          newChild.childrenNodes = this.childrenNodes.splice(i + 1);
          // we leverage that the leaves are always sorted 'left to right'
          newChild.count = newChild.childrenNodes.map(child => child.count).reduce((acc, val) => acc + val, 0);
          const newChildHeight = newChild.childrenNodes.map(child => child.height).reduce((acc, val) => Math.max(acc, val!), 0) + 1
          newChild.height = newChildHeight;
          newChild.from = newChild.childrenNodes[0].from;
          newChild.to = newChild.childrenNodes[newChild.childrenNodes.length - 1].to;
          this.childrenNodes.push(newChild);
        }
      }
    }
  }

  // this will traverse all entries, and deFrost along the way as needed
  async traverse(
    root: HistoryTree<FrozenType>,
    callback: (node: HistoryTreeNode<FrozenType>) => Promise<void>,
    reverse = false
  ): Promise<void> {
    if (!reverse) await callback(this);
    if (!isNil(this.frozenChunkId)) {
      await HistoryTreeNode.import<FrozenType>(await root.deFrost(this.frozenChunkId)).traverse(root, callback, reverse);
    } else {
      if (!reverse) for (const child of this.childrenNodes)
        await child.traverse(root, callback, reverse);
      else for (let i = this.childrenNodes.length - 1; i >= 0; i--)
        await this.childrenNodes[i].traverse(root, callback, reverse);
    }
    if (reverse) await callback(this);
  }

  // very picky validator, available for test suites (not called during normal
  // operation). Will throw an error if anything is amiss. note that this will
  // not recurse into frozen nodes.
  async validate(root: HistoryTree<FrozenType>, valueSize: number = 1): Promise<void> {

    // but checks if height is unnecessarily high; the log of count to the
    // base of branch factor should be within '1' of height.
    function heightError(height: number, count: number): boolean {
      if (isNil(count) || count <= 1) return false;
      const actualCount = count / valueSize; // account for TreeNodeValueType count of items
      const exponent = Math.log(actualCount) / Math.log(root.branchFactor)
      const result = (Math.abs(exponent - height) > (1 + 1e-10)) // avoid floating point imperfections
      if (result)
        console.log(SEP, "Height error found.\nheight =", height, ", count =", count,
        ", actualCount =", actualCount, ", exponent =",
          exponent, ", Math.floor(exponent) =", Math.floor(exponent),
          ", branch =", root.branchFactor, ", branch ** height =", root.branchFactor ** height, SEP);
      return result;
    }

    let errorList = "";
    if (isNil(this.from) !== isNil(this.to)) errorList += "[1]"
    if ((this.childrenValues.length > 0) && (this.childrenNodes.length > 0)) errorList += "[2]" // can't both be empty
    if (this.childrenValues.length !== 0 || this.childrenNodes.length !== 0) {
      if (isNil(this.from)) errorList += "[3]"
      if (this.count === 0) errorList += "[4]"
    }
    if (this.childrenValues.length > 0) {
      const childrenCount = this.childrenValues.map(child => child.count).reduce((acc, val) => acc + val, 0);
      if (this.count !== childrenCount) errorList += "[5]"
      if (this.height !== 1) errorList += "[6]"
    }
    if (this.childrenNodes.length > 0) {
      // check that all children have a height value
      if (this.childrenNodes.map(child => child.height).some(height => isNil(height) || height === 0)) errorList += "[7]"
      // traverse all children and calculate MAX height among them
      const maxChildHeight = this.childrenNodes.map(child => child.height).reduce((acc, val) => Math.max(acc, val!), 0);
      if (this.height !== maxChildHeight + 1) errorList += "[8]"
    }
    if (!isNil(this.frozenChunkId)) {
      if (this.childrenValues.length > 0) errorList += "[9]"
      if (this.childrenNodes.length > 0) errorList += "[10]"
    }
    if (this.count === (root.branchFactor ** this.height)) {
      // if it's a 'perfect' node, then it should have ended up perfectly
      // balanced, and full, ergo frozen.
      if (this.childrenValues.length > 0) errorList += "[11]"
      if (this.childrenNodes.length > 0) errorList += "[12]"
      if (isNil(this.frozenChunkId)) errorList += "[13]"
      if (!this.isFull) errorList += "[14]"
    }

    if (heightError(this.height, this.count)) errorList += "[15]"
    if (this.childrenNodes.length >= 2) {
      // check that all 'from' and 'to' values make sense
      for (let i = 0; i < this.childrenNodes.length - 1; i++) {
        if (isNil(this.childrenNodes[i].to) || isNil(this.childrenNodes[i + 1].to)) errorList += "[16]"
        if (isNil(this.childrenNodes[i].from) || isNil(this.childrenNodes[i + 1].from)) errorList += "[17]"
        if (this.childrenNodes[i].to! >= this.childrenNodes[i + 1].from!) errorList += "[18]"
      }
    }
    if (errorList !== "") {
      console.error(SEP, "Validation failed: " + errorList, SEP)
      if (DBG0) console.log(this, SEP)
      throw new Error("Validation failed: " + errorList)
    }
    if (this.childrenNodes.length > 0) {
      for (const child of this.childrenNodes)
        await child.validate(root, valueSize);
    }
  }

  async _callbackValues(
    node: HistoryTreeNode<FrozenType>,
    _nodeCallback?: (value: TreeNodeValueType) => Promise<void>,
    reverse = false
  ): Promise<void> {
    if (node.childrenValues.length > 0) {
      const valuesArray = reverse ? node.childrenValues.slice().reverse() : node.childrenValues;
      for (const value of valuesArray) {
        if (!isNil(_nodeCallback)) {
          await _nodeCallback(value);
        } else {
          if (DBG0) console.log(value);
        }
      }
    }
  }

  async traverseValues(
    root: HistoryTree<FrozenType>,
    callback?: (value: TreeNodeValueType) => Promise<void>,
    reverse = false
  ): Promise<void> {
    return this.traverse(root, async node => await this._callbackValues(node, callback, reverse), reverse);
  }

  export(): any {
    let retVal: any = { from: this.from, to: this.to, count: this.count, height: this.height }
    if (this.isFull) retVal.isFull = true; // omit if false (default)
    if (!isNil(this.frozenChunkId)) {
      retVal = { ...retVal, frozenChunkId: this.frozenChunkId }
    } else if (this.childrenValues.length > 0) {
      retVal = { ...retVal, isLeaf: true, children: this.childrenValues }
    } else if (this.childrenNodes.length > 0)
      retVal = {
        ...retVal, children: this.childrenNodes.map(child => child.export())
      }
    return retVal;
  }

  static import<FrozenType>(
    data: any
  ): HistoryTreeNode<FrozenType> {
    if (DBG1) console.log("importing data:", data)
    const node = new HistoryTreeNode<FrozenType>(data.isLeaf);
    node.from = data.from;
    node.to = data.to;
    node.count = data.count;
    node.height = data.height;
    if (!isNil(data.frozenChunkId)) {
      node.frozenChunkId = data.frozenChunkId;
      node.isFull = true;
    } else if (data.isLeaf) {
      node.isFull = data.isFull;
      node.childrenValues = data.children;
    } else {
      node.isFull = data.isFull;
      if (data.children && data.children.length > 0)
        node.childrenNodes = data.children.map((child: any) => HistoryTreeNode.import(child));
    }
    return node;
  }

}

// true if value is null or undefined. less confusing than using '==' in code.
function isNil(value: any): value is null | undefined {
  return value == null; // deliberate use of '=='
}

/**
* Handles an arbitrary number of entries. An entry is of type 'TreeNodeValueType'; it
* will contain, or reference, some set of items, which 'HistoryTree' doesn't
* care about per se. Every set is characterized by having a population count
* ('count'), and a range of index (key) values, ranging from 'from' to 'to',
* inclusive. These indexes are of type 'string' (typically number or
* string).
* 
* 'count' of zero is not permitted, and similarly both 'from' and 'to' must
* have values (they are allowed to be the same).
*
* Note that 'TreeNodeValueType' is assumed to be compact.
*
* Only insertion of 'larger' values are permitted; the 'from' index must be
* greater than the highest 'to' value in the tree, and also may not overlap.
* 
* 'branchFactor' is self explanatory. If created with 'data', that in turn
* is assumed to be the (exact) same format as a previously exported tree.
*
*/
export abstract class HistoryTree<FrozenType> {
  root: HistoryTreeNode<FrozenType> = new HistoryTreeNode<FrozenType>(true)
  abstract freeze(data: HistoryTreeNode<FrozenType>): Promise<FrozenType>
  abstract deFrost(data: FrozenType): Promise<HistoryTreeNode<FrozenType>>
  private insertOrValidateLock = false;
  constructor(public branchFactor: number, data?: any) {
    if (DBG2) console.log("branchFactor", branchFactor, "data", data)
    if (data)
      this.root = HistoryTreeNode.import(data);
  }
  async insertTreeNodeValue(value: TreeNodeValueType): Promise<void> {
    if (this.insertOrValidateLock) throw new Error("Insertion or validation already in progress (these operations are not parallelized, are you missing an 'await'?)")
    this.insertOrValidateLock = true;
    const { count, from, to } = value;
    if (DBG1) console.log("inserting value:", value, "count:", count, "from:", from, "to:", to)
    if (!isNil(this.root.to) && from <= this.root.to)
      throw new Error(`Insertion 'from' index ('${from}') must be greater than the highest 'to' value in the tree (currently '${this.root.to}')`)
    if (this.root.isFull) {
      if (DBG0) console.log("ROOT is full, we need to create a new root, push current root to first child")
      const newRoot = new HistoryTreeNode<FrozenType>();
      newRoot.from = this.root.from;
      newRoot.to = this.root.to;
      newRoot.count = this.root.count;
      newRoot.height = this.root.height + 1;
      newRoot.childrenNodes.push(this.root);
      this.root = newRoot;
    }
    if (DBG1) console.log("... inserting value from root on down")
    await this.root.insertTreeNodeValue(this, value);
    this.insertOrValidateLock = false;
  }
  async traverse(callback: (node: HistoryTreeNode<FrozenType>) => Promise<void>, reverse = false): Promise<void> {
    return this.root.traverse(this, callback, reverse);
  }
  async traverseValues(callback?: (value: TreeNodeValueType) => Promise<void>, reverse = false): Promise<void> {
    return this.root.traverseValues(this, callback, reverse);
  }
  async validate(valueSize?: number): Promise<void> {
    if (this.insertOrValidateLock) throw new Error("Validation or insertion already in progress (these operations are not parallelized, are you missing an 'await'?)")
    this.insertOrValidateLock = true;
    if (isNil(this.root)) throw new Error("Root missing (Internal Error)")
    await this.root.validate(this, valueSize);
    this.insertOrValidateLock = false;
  }
  export(): any {
    if (this.root)
      return this.root.export();
    else return {};
  }
}

/**
* 'MessageHistory' is where Messages go to retire. It's a scaleable structure
* that can be used to store messages in a flexible way. Chunks of messages are
* stored as shards, in the form of a payload wrapped Map (key->message), where
* each message in turn is a payload-wrapped ChannelMessage.
*
* This can be thought of as a flexible 'key-value store archive format' (where
* the keys are globally unique and monotonically increasing).
*
* The channel server keeps the 'latest' messages (by some definition) in a
* straight KV format; overflow (or archiving) is done by processing messages
* into this structure.
*
* The class for the whole thing is 'DeepHistory', below. It is a variant of a
* Merkle tree (strictly speaking, it's only a Merkle tree when fully 'frozen').
*
*/
export interface MessageHistory extends TreeNodeValueType {
  version: '20240603.0',
  channelId: SBChannelId, // server from which this backup was originally taken
  ownerPublicKey: SBUserPublicKey, // archives pub key that created original channel
  created: number, // timestamp of creation (of this backup shard)
  size?: number, // total size of all the messages (counted individually, not the size of the shard)
  shard: SBObjectHandle, // the actual shard with the messages
}

/**
* Full deep history feature. If no budget is provided, it will be in read-only
* mode. Uses Tree with index type 'string' (eg channelId + '_' + subChannel +
* '_' + timestampPrefix). The 'values' handled by HistoryTree are MessageHistory, and
* this class will encapsulate shardifying the lowest level, eg 'leaf' nodes
* with between ~128 and 512 messages.
* 
* Note that the channel server has a parallel class to this ('ChannelHistory')
*/
export abstract class DeepHistory<FrozenType> extends HistoryTree<FrozenType> {
  /*
     the production values are calibrated for overflowing on either max
     message count or max message size, whichever happens first.  a
     'directory' (eg 'node') entry is at most ~750 bytes per child. hence the
     branching factor of 32, which will keep the size of a sharded 'node'
     under 24 KiB.

     the message set size is set to 512, which is approx half of 1000, which
     is the current Cloudflare limit to single-query key queries. with a
     current maximum of 64 KiB per message (though we are currently using 32
     KiB), that would translate to at least 32 MiB in a single shard, which is
     well above efficient sizes, so we also limit the size message contents to
     4 MiB, which in practice leads to a minimum message cound of 125 (not
     128, because of packaging overhead, and a small buffer).

     in practice, most messages are (much) shorter than max.

     we want large values, if for no other reason than that the mutable part
     of DeepHistory is of a size that's a function of height.

     these production values imply a single-level tree can reference up to 16K
     messages (or up to 128 MiB of message content); two levels can reference
     512K messages (or up to 4 GiB of message content); three levels can
     reference 16M messages (or up to 128 GiB of message content).

     the design limit for a single channel is 256K messages per second. so two
     year's worth of flat-out messaging would be over 16 trillion messages,
     and could fit (in principle) fit in a 7-level tree.

     (our current Cloudflare-hosted channel servers are capped at 1K messages
     per second, but we have POC channel server code that can handle >1M).

  */

  abstract storeData(data: any): Promise<FrozenType>
  abstract fetchData(handle: FrozenType): Promise<any>

  // this is specific to DH; we take a cue from SBFile max chunks which are
  // currently 4 MiB, and current channel server message maximum is 32 KiB. 
  public static MAX_MESSAGE_HISTORY_SHARD_SIZE = (4 * 1024 * 1024) - (2 * 32 * 1024)

  constructor(
    public branchFactor: number,
    data?: any
  ) {
    super(branchFactor, data);
  }

  // provides abstract interface for the Tree class
  async freeze(data: HistoryTreeNode<FrozenType>): Promise<FrozenType> {
    if (DBG1) console.log("freezing data:", data)
    const f = await this.storeData(data)
    if (DBG1) console.log("... frozen data identifier:", f)
    return f
  }
  // provides abstract interface for the Tree class
  async deFrost(handle: FrozenType) {
    if (DBG1) console.log("deFrosting handle:", handle)
    const data = await this.fetchData(handle) as any;
    if (DBG1) console.log("... deFrosted results:\n", data)
    return data
  }

}

// used server-side (write only)
export abstract class ServerDeepHistory extends DeepHistory<SBObjectHandle> {
  public static MESSAGE_HISTORY_BRANCH_FACTOR = TEST_WITH_SMALL_BRANCHING ? 3 : 32; // production value
  public static MAX_MESSAGE_SET_SIZE = TEST_WITH_SMALL_BRANCHING ? 5 : 512; // production value
  constructor(
    data: any
  ) {
    super(ServerDeepHistory.MESSAGE_HISTORY_BRANCH_FACTOR, data)
  }
  async insert(data: MessageHistory) {
    await this.insertTreeNodeValue(data)
  }
  async fetchData(_handle: SBObjectHandle): Promise<any> {
    throw new Error("[ServerDeepHistory] should not be fetching data (server-side is write-only)")
  }

}

// used client-side (read only)
export class ClientDeepHistory extends DeepHistory<SBObjectHandle> {
  private SB: Snackabra
  constructor(
    data: any,
    private channel: Channel
  ) {
    super(ServerDeepHistory.MESSAGE_HISTORY_BRANCH_FACTOR, data)
    this.SB = new Snackabra(this.channel.channelServer)
  }
  // wrapper for the storage API; returnes cleaned-up / compacted handle
  async storeData(_data: any): Promise<SBObjectHandle> {
    throw new Error("[ClientDeepHistory] should not be storing data (client-side is read-only)")
    // if (!this.budget || !this.SB) throw new Error("Budget required to freeze data (this DeepHistory is operating in read-only mode)")
    // if (DBG2) {
    //     const b = assemblePayload(data)!
    //     console.log("(packaged size will be) [storeData] asked to store buffer size", b.byteLength, "bytes")
    // }
    // const h = await this.SB.storage.storeData(data, this.budget)
    // const x = await stringify_SBObjectHandle(h)
    // return {
    //     id: x.id,
    //     key: x.key,
    //     verification: x.verification
    // }
  }
  // wrapper for the storage API; returns the final payload (extracted)
  async fetchData(handle: SBObjectHandle): Promise<any> {
    if (!this.SB) throw new Error("SB required to fetch data")
    const b = await this.SB.storage.fetchData(handle)
    return b.payload
  }
  async traverseMessages(callback?: (value: Message) => Promise<void>, reverse = false): Promise<void> {
    if (DBG2) console.log(SEP, `Traversing the tree ${reverse ? 'reverse' : 'in order'} :`, _SEP)
    await this.traverseValues(async t => {
      const node = t as MessageHistory // specialized TreeNodeValueType
      if (node.shard) {
        const messages = await this.fetchData(node.shard) as Map<string, ChannelMessage>
        if (!(messages instanceof Map)) throw new Error("Expected a map")
        if (DBG2) console.log(SEP, "We are looking at:\n", node.shard, SEP, messages, SEP, messages.size, SEP)
        const keys = Array.from(messages.keys())
        // either sort in order or sort reverse
        keys.sort()
        if (reverse) keys.reverse()
        for (const key of keys) {
          const value = messages.get(key)
          if (value) {
            const msg = await this.channel.extractMessage(value)
            if (msg)
              if (callback) await callback(msg)
              else console.log(msg)
          }
        }
      }
    }, reverse);
    if (DBG2) console.log(SEP)
  }

  // specialized version, non-reversed traversal, requesting raw messages
  // (eg to top up a local cache for example)
  async traverseMessagesEncrypted(callback: (id: string, value: ChannelMessage) => Promise<void>): Promise<void> {
    await this.traverseValues(async t => {
      const node = t as MessageHistory // specialized TreeNodeValueType
      if (node.shard) {
        const messages = await this.fetchData(node.shard) as Map<string, ChannelMessage>
        if (!(messages instanceof Map)) throw new Error("Expected a map")
          // perform callback for raw messages, remember (key, value)
        for (const [key, value] of messages)
          await callback(key, value)
      }
    });
  }

  async validate(): Promise<void> {
    await super.validate(ServerDeepHistory.MAX_MESSAGE_SET_SIZE);
  }
}

//#endregion - Deep History



/******************************************************************************************************/
//#region - Message Bus

/**
 * MessageBus
 */
export class MessageBus {
  bus: { [index: string]: any } = {}

  /**
   * Safely returns handler for any event
   */
  #select(event: string) {
    return this.bus[event] || (this.bus[event] = []);
  }

  /**
   * 'event' is a string, special case '*' means everything (in which
   * case the handler is also given the message)
   */
  subscribe(event: string, handler: CallableFunction) {
    this.#select(event).push(handler);
  }

  /**
   * Unsubscribe
   */
  unsubscribe(event: string, handler: CallableFunction) {
    let i = -1;
    if (this.bus[event]) {
      if ((i = this.bus[event].findLastIndex((e: unknown) => e == handler)) != -1) {
        this.bus[event].splice(i, 1);
      } else {
        console.info(`fyi: asked to remove a handler but it's not there`);
      }
    } else {
      console.info(`fyi: asked to remove a handler but the event is not there`);
    }
  }

  /**
   * Publish
   */
  publish(event: string, ...args: unknown[]) {
    for (const handler of this.#select('*')) {
      handler(event, ...args);
    }
    for (const handler of this.#select(event)) {
      handler(...args);
    }
  }
}
//#endregion - MessageBus


/******************************************************************************************************/
//#region - Message Queue
export class MessageQueue<T> {
  private queue: T[] = [];
  private resolve: ((value: T | PromiseLike<T> | null) => void) | null = null;
  private reject: ((reason?: any) => void) | null = null;
  private closed = false;
  private error: any = null;
  enqueue(item: T) {
    if (DBG) console.log(`[MessageQueue] Enqueueing. There were ${this.queue.length} messages in queue`)
    if (this.closed) throw new SBError('[MessageQueue] Error, trying to enqueue to closed queue');
    if (this.resolve) {
      this.resolve(item);
      this.resolve = null;
      this.reject = null;
    } else {
      this.queue.push(item);
    }
  }
  async dequeue(): Promise<T | null> {
    if (DBG) console.log(`[MessageQueue] Dequeueing. There are ${this.queue.length} messages left`)
    if (this.queue.length > 0) {
      const item = this.queue.shift()!;
      if (this.closed)
        return Promise.reject(item);
      else {
        if (DBG) console.log(SEP, SEP, SEP, `[MessageQueue] Dequeueing. Returning item.\n`, item, SEP)
        return Promise.resolve(item);
      }
    } else {
      if (this.closed)
        return null
      // if (DBG2) console.log(`[MessageQueue] Dequeueing. Returning promise.`)
      return new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
  }
  isEmpty() {
    return this.queue.length === 0;
  }
  // 'close' will stop queue from accepting more data
  close(reason?: string) {
    if (DBG0) console.log(`[MessageQueue] Closing. There are ${this.queue.length} messages left. Close reason: ${reason}`)
    this.closed = true;
    this.error = reason || 'close';
    if (this.reject) this.reject(this.error);
  }
  // wait for queue to drain
  async drain(reason?: string) {
    if (DBG0) console.log(`[MessageQueue] Draining.`)
    if (!this.closed) this.close(reason || 'drain')
    while (this.queue.length > 0) {
      if (DBG) console.log(`[MessageQueue] Draining. There are ${this.queue.length} messages left.`)
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

//#endregion - Message Queue

/******************************************************************************************************/
//#region - Utility functions (exported)

async function closeSocket(socket: WebSocket) {
  console.log("[closeSocket] closing socket", socket)
  if (socket.readyState !== WebSocket.CLOSED)
    await new Promise<void>((resolve) => {
      socket.addEventListener('close', () => {
        console.log("[Snackabra.closeSocket] ... socket confirmed closed", socket)
        resolve();
      }, { once: true });
      socket.close(1000); // not allowed to say '1001'
    });
  else {
    console.warn('[Snackabra] websocket already closed')
  }
}

export class SBError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    if (typeof (Error as any).captureStackTrace === 'function')
      (Error as any).captureStackTrace(this, this.constructor);
    else
      this.stack = (new Error(message)).stack;
    if (DBG2) {
      let atLine: string | null = null
      if (this.stack) {
        const stackLines = this.stack!.split("\n");
        for (let i = 1; i < stackLines.length; i++) {
          if (stackLines[i].trim().startsWith("at")) {
            atLine = `${stackLines[i].trim()}`
            break;
          }
        }
      }
      if (atLine !== null)
        console.log('\n', SEP, 'SBError():\n', "'" + message + "'", '\n', atLine, '\n', SEP)
      else
        console.log('\n', SEP, 'SBError():\n', message, '\n', SEP)
    }
  }
}

/**
 * Adding a more resilient wrapper around JSON.parse. The 'loc' parameter is typically (file) line number.
 */
export function jsonParseWrapper(str: string | null, loc?: string, reviver?: (this: any, key: string, value: any) => any) {
  while (str && typeof str === 'string') {
    try {
      str = JSON.parse(str, reviver) // handle nesting
    } catch (e) {
      throw new SBError(`JSON.parse() error${loc ? ` at ${loc}` : ''}: ${e}\nString (possibly nested) was: ${str}`)
    }
  }
  return str as any
}

// this is a simple pattern to check if a string is a simple JSON (object or array)
const simpleJsonPattern = /^\s*[\[\{].*[\]\}]\s*$/;

/**
 * Different version than jsonParseWrapper. Does not throw, and also checks for
 * simple strings (which are not valid JSON) and would return those. Returns
 * null if input is null, or it can't figure out what it is. Used in (low level)
 * messaging contexts.
 */
export function jsonOrString(str: string | null) {
  if (str === null) return null
  if (typeof str === 'string') {
    if (simpleJsonPattern.test(str)) {
      try {
        str = JSON.parse(str) // handle nesting
        return str as any
      } catch (e) {
        return null
      }
    } else {
      return str as string
    }
  } else {
    return null
  }
}

const bs2dv = (bs: BufferSource) => bs instanceof ArrayBuffer
  ? new DataView(bs)
  : new DataView(bs.buffer, bs.byteOffset, bs.byteLength)

/**
 * Simple comparison of buffers
 */
export function compareBuffers(a: Uint8Array | ArrayBuffer | null, b: Uint8Array | ArrayBuffer | null): boolean {
  if (typeof a != typeof b) return false
  if ((a == null) || (b == null)) return false
  const av = bs2dv(a)
  const bv = bs2dv(b)
  if (av.byteLength !== bv.byteLength) return false
  for (let i = 0; i < av.byteLength; i++)  if (av.getUint8(i) !== bv.getUint8(i)) return false
  return true
}

/**
 * Fills buffer with random data
 */
export function getRandomValues(buffer: Uint8Array) {
  if (buffer.byteLength < (4096)) {
    return crypto.getRandomValues(buffer)
  } else {
    // larger blocks should really only be used for testing
    _sb_assert(!(buffer.byteLength % 1024), 'getRandomValues(): large requested blocks must be multiple of 1024 in size')
    let i = 0
    try {
      for (i = 0; i < buffer.byteLength; i += 1024) {
        let t = new Uint8Array(1024)
        // this doesn't actually have enough entropy, we should just hash here anyweay
        crypto.getRandomValues(t)
        // console.log(`offset is ${i}`)
        buffer.set(t, i)
      }
    } catch (e: any) {
      console.log(`got an error on index i=${i}`)
      console.log(e)
      console.trace()
    }
    return buffer
  }
}

/**
 * Convenience function: Generates a random alphanumeric string of a given length.
 * The string always starts with a letter.
 * 
 * @param length The length of the string to generate. Default is 16.
 * @returns A random alphanumeric string of the specified length.
 */
export function generateRandomString(length: number = 16): string {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const alphanumeric = letters + "0123456789";
  return Array.from({ length }, (_, i) =>
    i === 0 ? letters.charAt(Math.floor(Math.random() * letters.length)) :
      alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length))
  ).join('');
}


//#endregion

/******************************************************************************************************/
//#region - Utility functions (internal, not exported)

// For various reasons, we wrap 'fetch()' - this function (SBFetch) should be
// the ONLY place in jslib that directly calls 'fetch()'.
async function SBFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = Symbol('fetch');
  Snackabra.activeFetches.set(id, controller);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (Snackabra.isShutdown) { // your global shutdown flag
      await response.body?.cancel('shutDown')
      throw new SBError('Fetch aborted (shutDown)');
    }
    return response;
  } catch (error: any) {
    if (error instanceof SBError) throw error
    // we try to harden slightly to handle a few recurring (long-run) issues;
    // some that have been reported for a long time with Deno
    const errStr = `${error}`
    if (
      errStr.indexOf('connection closed before message completed') !== -1 ||
      errStr.indexOf('Connection reset by peer') !== -1 ||
      errStr.indexOf('The connection was reset') !== -1 ||
      errStr.indexOf('The server closed the connection') !== -1 ||
      errStr.indexOf('Please try sending the request again.') !== -1
    ) {
      console.warn(`... got error ('${errStr}'), retrying fetch() once again`);
      try {
        return await new Promise((resolve) => {
          setTimeout(() => {
            resolve(fetch(input, { ...init, signal: controller.signal }));
          }, 0);
        });
      } catch (e) {
        console.error('... got an error on retrying fetch()');
        const msg = `[SBFetch] Error performing fetch() (after RETRY): ${error}`;
        throw new SBError(msg);
      }
    } else {
      const msg = `[SBFetch] Error performing fetch() (this might be normal): ${error}`;
      throw new SBError(msg);
    }
  } finally {
    Snackabra.activeFetches.delete(id);
  }
}

// sets default function to use for 'fetch'. Snackabra() globally can change
// this upon creation, if another network operation is needed. for example,
// the channel server will override this (when it uses jslib)
var sbFetch: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) = SBFetch

/**
 * Wrapper to SBFetch that applies SB API calling conventions on both sides
 * of the call; it will return whatever data structure the server returns, note
 * that it will extract the reply (either from json or from payload). if there
 * are any issues or if the reply contains an error message, it will throw an
 * error.
 */
export async function SBApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<any> {
  let response
  try {
    response = await sbFetch(input, init)
    if (!response) throw new SBError("[SBApiFetch] Server did not respond (might be expected)");

    if (!response.ok) {
      const text = await response.text()
      let msg = '[SBApiFetch] Server responded with error\n'
      if (response.status) msg += `  Status code: ('${response.status}')\n`
      if (response.statusText) msg += `  Status text: ('${response.statusText}')\n`
      if (text) msg += `  Error msg:   ('${text}')\n`
      if (DBG) console.log(msg)
      throw new SBError(msg)
    }

    const contentType = response.headers.get('content-type');
    var retValue: any
    if (!contentType)
      throw new SBError("[SBApiFetch] No content header in server response");

    if (contentType.indexOf("application/json") !== -1) {
      const json = await response.json()
      if (DBG2) console.log(`[SBApiFetch] json ('${json}'):\n`, json)
      retValue = jsonParseWrapper(json, "L489");
    } else if (contentType.indexOf("application/octet-stream") !== -1) {
      retValue = extractPayload(await response.arrayBuffer()).payload
    } else if (contentType.indexOf("text/plain") !== -1) {
      retValue = await response.text()
      // ToDo: possibly add support for server errors such as:
      // 'Your worker restarted mid-request. Please try sending the request again.'
      // ... but then again, Wrangler has soooo many failure modes ...
      throw new SBError(`[SBApiFetch] Server responded with text/plain (?):\n('${retValue}')`);
    } else {
      throw new SBError(`[SBApiFetch] Server responded with unknown content-type header ('${contentType}')`);
    }

    if (/* !response.ok || */ !retValue || retValue.error || retValue.success === false) {
      let apiErrorMsg = '[SBApiFetch] No server response, or cannot parse, or error in response'
      if (response.status) apiErrorMsg += ' [' + response.status + ']'
      if (retValue?.error) apiErrorMsg += ': ' + retValue.error
      if (DBG2) console.error("[SBApiFetch] error:\n", apiErrorMsg)
      throw new SBError(apiErrorMsg)
    } else {
      if (DBG2) console.log(
        "[SBApiFetch] Success:\n",
        SEP, input, '\n',
        SEP, retValue, '\n', SEP)
      return (retValue)
    }

  } catch (e) {
    if (DBG2) console.error(`[SBApiFetch] caught error: ${e}`)
    if (response && response.body && !response.body.locked) {
      // occasionally we need to clean up, if the fetch gave a response but some
      // operation on the response failed (or some other weird stuff happens)
      if (DBG2) console.log('[SBApiFetch] cancelling response body')
      await response.body.cancel();
    }
    if (e instanceof SBError) throw e
    else throw new SBError(`[SBApiFetch] caught error: ${e}`)
  }
}

// variation on solving this issue:
// https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript
function WrapError(e: any) {
  const pre = ' *ErrorStart* ', post = ' *ErrorEnd* '; // only for 'unknown' sources
  if (e instanceof SBError) {
    return e
  } else if (e instanceof Error) {
    // could use 'e' here, but some variations of 'e' do not allow 'message' to be accessed
    if (DBG) console.error('[WrapError] Error: \n', e)
    return new SBError(pre + e.message + post)
  }
  else return new SBError(pre + String(e) + post);
}

function _sb_exception(loc: string, msg: string) {
  const m = '[_sb_exception] << SB lib error (' + loc + ': ' + msg + ') >>';
  // for now disabling this to keep node testing less noisy
  // console.error(m);
  throw new SBError(m);
}

function _sb_assert(val: unknown, msg: string) {
  if (!(val)) {
    const m = ` <<<<[_sb_assert] assertion failed: '${msg}'>>>> `;
    if (DBG) console.trace(m)
    throw new SBError(m);
  }
}

/**
 * Appends an array of buffers and returns a new buffer
 */
function _appendBuffers(buffers: (Uint8Array | ArrayBuffer)[]): ArrayBuffer {
  let totalLength = 0;
  for (const buffer of buffers)
    totalLength += buffer.byteLength;
  const tmp = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    tmp.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  return tmp.buffer;
}

/*
 * TL;DR on the 'base64 issue' (and it's a bit of a moving target):
 *
 * - btoa() and atob() are available in clients (browsers), but not in backends.
 *   In Node.js, they are not part of the core API and are flagged as deprecated
 *   in tooling like VSCode/TypeScript due to the '@deprecated' tag in type
 *   definitions. They are not available in Cloudflare Workers.
 *
 * - The 'Buffer' class is available in both Node.js and Cloudflare Workers but
 *   is not available in the browser. Deno, which is arguably 'backend',
 *   includes btoa() and atob(), but not Buffer.
 *
 * - Tooling like VSCode may default to Node typings and indicate that btoa/atob
 *   are 'deprecated' unless configured for a specific environment (e.g.,
 *   browser or Deno).
 *
 * Since we're not processing large amounts of base64 data (for which btoa() and
 * atob() are not well-suited anyway), we implement our own base64 encoding and
 * decoding functions for simplicity and consistent cross-environment
 * functionality. Our only real real need for this format is JWK, hence we only
 * implement the base64url variant. For our own use cases, we use base62.
 */

export const base64url = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const b64urlRegex = /^([A-Za-z0-9\-_]*)(={0,2})$/ // strict (ish)

/**
 * Converts an ArrayBuffer to base64url. 
 */
function arrayBufferToBase64url(buffer: ArrayBuffer | Uint8Array): string {
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

/**
 * Converts base64/base64url to ArrayBuffer. We're tolerant of inputs. Despite
 * it's name, we return Uint8Array.
 */
function base64ToArrayBuffer(s: string): Uint8Array {
  s = s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (!b64urlRegex.test(s)) throw new SBError(`invalid character in b64 string (after cleanup: '${s}')`)
  const len = s.length;
  const bytes = new Uint8Array(len * 3 / 4);
  for (let i = 0, p = 0; i < len; i += 4) {
    const [a, b, c, d] = [s[i], s[i + 1], s[i + 2], s[i + 3]].map(ch => base64url.indexOf(ch));
    bytes[p++] = (a << 2) | (b >> 4);
    if (c !== -1) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (d !== -1) bytes[p++] = ((c & 3) << 6) | d;
  }
  return bytes;
}

//#endregion - SB internal utility functions

/******************************************************************************************************/
//#region Base62

/*
 * 'base62' encodes binary data in (pure) alphanumeric format.
 * We use a dictionary of (A-Za-z0-9) and chunks of 32 bytes.
 * 
 * We use this for all 'external' encodings of keys, ids, etc.
 */

export type Base62Encoded = string & { _brand?: 'Base62Encoded' };

export const base62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const base62zero = base62[0]; // our padding value

export const b62regex = /^[A-Za-z0-9]*$/;
export const base62regex = b62regex; // alias
export function isBase62Encoded(value: string | Base62Encoded): value is Base62Encoded {
  return b62regex.test(value); // type guard
}

const N = 32; // max chunk size, design point. 

const M = new Map<number, number>(), invM = new Map<number, number>();
for (let X = 1; X <= N; X++) {
  const Y = Math.ceil((X * 8) / Math.log2(62));
  M.set(X, Y);
  invM.set(Y, X);
}
const maxChunk = M.get(N)!; // max encoded (string) chunk implied by 'N'

/** Converts any array buffer to base62. */
function arrayBufferToBase62(buffer: ArrayBuffer | Uint8Array): string {
  function _arrayBufferToBase62(buffer: Uint8Array, c: number): string {
    let result = '', n = 0n;
    for (const byte of buffer)
      n = (n << 8n) | BigInt(byte);
    for (; n > 0n; n = n / 62n)
      result = base62[Number(n % 62n)] + result;
    return result.padStart(M.get(c)!, base62zero);
  }
  if (buffer === null || buffer === undefined) throw new SBError('arrayBufferToBase62: buffer is null or undefined');
  const buf = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer
  let result = '';
  for (let l = buf.byteLength, i = 0, c; l > 0; i += c, l -= c) {
    c = l >= N ? N : l; // chunks are size 'N' (32)
    result += _arrayBufferToBase62(buf.slice(i, i + c), c);
  }
  return result;
}

/** Converts a base62 string to matching ArrayBuffer. */
function base62ToArrayBuffer(s: string): ArrayBuffer {
  if (!b62regex.test(s)) throw new SBError('base62ToArrayBuffer32: must be alphanumeric (0-9A-Za-z).');
  function _base62ToArrayBuffer(s: string, t: number): Uint8Array {
    try {
      let n = 0n, buffer = new Uint8Array(t);
      for (let i = 0; i < s.length; i++)
        n = n * 62n + BigInt(base62.indexOf(s[i]));
      if (n > 2n ** BigInt(t * 8) - 1n)
        throw new SBError('base62ToArrayBuffer: Invalid Base62 string.'); // exceeds (t * 8) bits
      for (let i = t - 1; i >= 0; i--, n >>= 8n)
        buffer[i] = Number(n & 0xFFn);
      return buffer;
    } catch (e) {
      throw new SBError('base62ToArrayBuffer: Invalid Base62 string.'); // 'NaN' popped up
    }
  }
  try {
    let j = 0, result = new Uint8Array(s.length * 6 / 8); // we know we're less than 6
    for (let i = 0, c, newBuf; i < s.length; i += c, j += newBuf.byteLength) {
      c = Math.min(s.length - i, maxChunk);
      newBuf = _base62ToArrayBuffer(s.slice(i, i + c), invM.get(c)!)
      result.set(newBuf, j);
    }
    return result.buffer.slice(0, j);
  } catch (e) { throw e; }
}

/** Convenience: direct conversion from Base62 to Base64. */
export function base62ToBase64(s: Base62Encoded): string {
  return arrayBufferToBase64url(base62ToArrayBuffer(s));
}

/** Convenience: direct conversion from Base64 to Base62. */
export function base64ToBase62(s: string): Base62Encoded {
  return arrayBufferToBase62(base64ToArrayBuffer(s));
}

//#endregion Base62

/******************************************************************************************************/
//#region Base32mi

// duplicate code from 384lib (strongpin version 0.8)

const base62mi = "0123456789ADMRTxQjrEywcLBdHpNufk" // "v05.05" (strongpinVersion ^0.6.0)
const base62Regex = new RegExp(`[${base62mi}.concat(' ')]`); // lenient, allows spaces

// encodes a 19-bit number into a 4-character string
export function b32encode(num: number): string {
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

export function b32process(str: string): string {
  const substitutions: { [key: string]: string } = {
    "o": "0", "O": "0", "i": "1", "I": "1",
    "l": "1", "z": "2", "Z": "2", "s": "5",
    "S": "5", "b": "6", "G": "6", "a": "9",
    "g": "9", "q": "9", "m": "M", "t": "T",
    "X": "x", "J": "j", "e": "E", "Y": "y",
    "W": "w", "C": "c", "P": "p", "n": "N",
    "h": "N", "U": "u", "v": "u", "V": "u",
    "F": "f", "K": "k"
  }
  let processedStr = '';
  for (let char of str)
    processedStr += substitutions[char] || char;
  return processedStr;
}

export function b32decode(encoded: string): number | null {
  if (!base62Regex.test(encoded))
    throw new Error(`Input string contains invalid characters (${encoded}) - use 'process()'.`);
  let bin = Array.from(encoded)
    .map(c => base62mi.indexOf(c))
  if (bin.reduce((a, b) => (a ^ b)) & 0x10)
    return null;
  return (((bin[0] * 32 + bin[1]) * 32 + bin[2]) * 16 + (bin[3] & 0x0f));
}

//#endregion Base32mi

/******************************************************************************************************/
//#region Payloads

/**
 * Payloads
 * 
 * To serialize/deserialize various javascript (data) structures into
 * binary and back, we define a 'payload' format. This is 'v003', for
 * the next version we should consider aligning with CBOR (RFC 8949).
 */

// support for our internal type 'i' (32 bit signed integer)
function is32BitSignedInteger(number: number) {
  const MIN32 = -2147483648, MAX32 = 2147483647;
  return (typeof number === 'number' && number >= MIN32 && number <= MAX32 && number % 1 === 0);
}

/**
 * Our internal type letters:
 * 
 * a - Array
 * 8 - Uint8Array
 * b - Boolean
 * d - Date
 * i - Integer (32 bit signed)
 * j - JSON (stringify)
 * m - Map
 * 0 - Null
 * n - Number (JS internal)
 * o - Object
 * s - String
 * t - Set
 * u - Undefined
 * v - Dataview
 * x - ArrayBuffer
 * 
 */
function getType(value: any) {
  if (value === null) return '0';
  if (value === undefined) return 'u';
  if (Array.isArray(value)) return 'a';
  if (value instanceof ArrayBuffer) return 'x';
  if (value instanceof Uint8Array) return '8';
  if (typeof value === 'boolean') return 'b';
  if (value instanceof DataView) return 'v';
  if (value instanceof Date) return 'd';
  if (value instanceof Map) return 'm';
  if (typeof value === 'number') return is32BitSignedInteger(value) ? 'i' : 'n';
  if (value !== null && typeof value === 'object' && value.constructor === Object) return 'o';
  if (value instanceof Set) return 't';
  if (typeof value === 'string') return 's';
  if (value instanceof WeakRef) return 'w'; // Check for any WeakRef
  // if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
  //   // it's a typed array; currently we're only supporting Uint8Array
  //   if (value.constructor.name === 'Uint8Array') return '8';
  //   console.error(`[getType] Only supported typed array is Uint8Array (got '${value.constructor.name}')`);
  //   return '<unsupported>';
  // }
  if (typeof value === 'object' && typeof value.then === 'function')
    console.error("[getType] Trying to serialize a Promise - did you forget an 'await'?");
  else if (typeof value === 'object' && typeof value.toJSON === 'function')
    return 'j'; // JSON.stringify(value) will be used
  else
    console.error('[getType] Unsupported for object:', value);
  throw new SBError('Unsupported type');
}

function _assemblePayload(data: any): ArrayBuffer | null {
  try {
    const metadata: any = {};
    let keyCount = 0;
    let startIndex = 0;
    let BufferList: Array<ArrayBuffer> = [];
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const value = data[key];
        const type = getType(value);
        // if (DBG2) console.log(`[assemblePayload] key: ${key}, type: ${type}`)
        switch (type) {
          case 'o': // Object (eg structure)
            const payload = _assemblePayload(value);
            if (!payload) throw new SBError(`Failed to assemble payload for ${key}`);
            BufferList.push(payload);
            break;
          case 'j': // JSON
            // const jsonValue = new TextEncoder().encode(JSON.stringify(value));
            // 20240408 update: actually, it's the same as 'o' except we first call toJSON
            // BufferList.push(jsonValue.buffer);
            const toJSONvalue = _assemblePayload(value.toJSON(""));
            if (!toJSONvalue) throw new SBError(`Failed to process toJSON for ${key}`);
            BufferList.push(toJSONvalue);
            break;
          case 'n': // Number
            const numberValue = new Uint8Array(8);
            new DataView(numberValue.buffer).setFloat64(0, value);
            BufferList.push(numberValue.buffer);
            break;
          case 'i': // Integer (32 bit signed)
            const intValue = new Uint8Array(4);
            new DataView(intValue.buffer).setInt32(0, value);
            BufferList.push(intValue.buffer);
            break;
          case 'd': // Date
            const dateValue = new Uint8Array(8);
            new DataView(dateValue.buffer).setFloat64(0, value.getTime());
            BufferList.push(dateValue.buffer);
            break;
          case 'b': // Boolean
            const boolValue = new Uint8Array(1);
            boolValue[0] = value ? 1 : 0;
            BufferList.push(boolValue.buffer);
            break;
          case 's': // String
            const stringValue = new TextEncoder().encode(value);
            BufferList.push(stringValue);
            break;
          case 'x': // ArrayBuffer
            BufferList.push(value);
            break;
          case '8': // Uint8Array
            BufferList.push(value.buffer);
            break;
          case 'm': // Map
            const mapValue = new Array();
            value.forEach((v: any, k: any) => {
              mapValue.push([k, v]);
            });
            const mapPayload = _assemblePayload(mapValue);
            if (!mapPayload) throw new SBError(`Failed to assemble payload for ${key}`);
            BufferList.push(mapPayload);
            break;
          case 'a': // Array
            const arrayValue = new Array();
            value.forEach((v: any) => {
              arrayValue.push(v);
            });
            const arrayPayload = _assemblePayload(arrayValue);
            if (!arrayPayload) throw new SBError(`Failed to assemble payload for ${key}`);
            BufferList.push(arrayPayload);
            break;
          case 't': // Set
            const setValue = new Array();
            value.forEach((v: any) => {
              setValue.push(v);
            });
            const setPayload = _assemblePayload(setValue);
            if (!setPayload) throw new SBError(`Failed to assemble payload for ${key}`);
            BufferList.push(setPayload);
            break;
          case 'w': // WeakRefs are treated as 'null'
          case '0': // Null
            BufferList.push(new ArrayBuffer(0));
            break;
          case 'u': // Undefined
            BufferList.push(new ArrayBuffer(0));
            break;
          case 'v': // Dataview, not supporting for now
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
    // console.log(`[assemblePayload] metadata:\n`, metadata);
    // console.log(`[assemblePayload] JSON.stringify:\n`, JSON.stringify(metadata))
    const metadataBuffer = new TextEncoder().encode(JSON.stringify(metadata));
    const metadataSize = new Uint32Array([metadataBuffer.byteLength]);

    // let payload = _appendBuffer(new Uint8Array(metadataSize.buffer), new Uint8Array(metadataBuffer));
    // for (let i = 0; i < BufferList.length; i++) {
    //   payload = _appendBuffer(new Uint8Array(payload), BufferList[i]);
    // }
    let payload = _appendBuffers([metadataSize.buffer, metadataBuffer, ...BufferList]);

    return payload;
  } catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * Assemble payload. This creates a single binary (wire) format
 * of an arbitrary set of (named) binary objects.
 */
export function assemblePayload(data: any): ArrayBuffer | null {
  if (DBG && data instanceof ArrayBuffer) console.warn('[assemblePayload] Warning: data is already an ArrayBuffer, make sure you are not double-encoding');
  const mainPayload = _assemblePayload({ ver003: true, payload: data })
  if (!mainPayload) return null;
  return _appendBuffers([new Uint8Array([0xAA, 0xBB, 0xBB, 0xAA]), mainPayload]);
}

function deserializeValue(buffer: ArrayBuffer, type: string): any {
  switch (type) {
    case 'o':
      return _extractPayload(buffer);
    case 'j': // JSON
      // if it can be extracted as a JSON, then it was stored by JSON.stringify
      try {
        return JSON.parse(new TextDecoder().decode(buffer));
      } catch (e) {
        // otherwise treat it as 'o'
        return _extractPayload(buffer);
      }
    // return jsonParseWrapper(new TextDecoder().decode(buffer), "L1322");
    case 'n': // Number
      return new DataView(buffer).getFloat64(0);
    case 'i': // Integer (32 bit signed)
      return new DataView(buffer).getInt32(0);
    case 'd': // Date
      return new Date(new DataView(buffer).getFloat64(0));
    case 'b': // Boolean
      return new Uint8Array(buffer)[0] === 1;
    case 's': // String
      return new TextDecoder().decode(buffer);
    case 'a': // Array
      const arrayPayload = _extractPayload(buffer);
      if (!arrayPayload) throw new SBError(`Failed to assemble payload for ${type}`);
      return Object.values(arrayPayload);
    case 'm': // Map
      const mapPayload = _extractPayload(buffer);
      if (!mapPayload) throw new SBError(`Failed to assemble payload for ${type}`);
      const map = new Map();
      for (const key in mapPayload) {
        map.set(mapPayload[key][0], mapPayload[key][1]);
      }
      return map;
    case 't': // Set
      const setPayload = _extractPayload(buffer);
      if (!setPayload) throw new SBError(`Failed to assemble payload for ${type}`);
      const set = new Set();
      for (const key in setPayload) {
        set.add(setPayload[key]);
      }
      return set;
    case 'x': // ArrayBuffer
      return buffer;
    case '8': // Uint8Array
      return new Uint8Array(buffer);
    case '0': // Null
      return null;
    case 'u': // Undefined
      return undefined;
    case 'v':
    case '<unsupported>':
    default:
      throw new SBError(`Unsupported type: ${type}`);
  }
}

function _extractPayload(payload: ArrayBuffer): any {
  const parsingMsgError = 'Cannot parse metadata, this is not a well-formed payload';
  // if (DBG2) console.log(`[extractPayload] payload: ${payload.byteLength} bytes`)
  try {
    const metadataSize = new Uint32Array(payload.slice(0, 4))[0];
    const decoder = new TextDecoder();
    const json = decoder.decode(payload.slice(4, 4 + metadataSize));
    let metadata: any;
    try {
      metadata = jsonParseWrapper(json, "L1290");
    } catch (e) {
      throw new SBError(parsingMsgError);
    }
    const startIndex = 4 + metadataSize;


    const data: any = {};
    for (let i = 1; i <= Object.keys(metadata).length; i++) {
      const index = i.toString();
      if (metadata[index]) {
        const entry = metadata[index];
        const propertyStartIndex = entry['s'];
        const size = entry['z'];
        const type = entry['t'];
        const buffer = payload.slice(startIndex + propertyStartIndex, startIndex + propertyStartIndex + size);
        data[entry['n']] = deserializeValue(buffer, type);
      } else {
        console.log(`found nothing for index ${i}`);
      }
    }
    return data;
  } catch (e) {
    // if it's the exception we threw above, just rethrow it
    if (e instanceof Error && e.message === parsingMsgError) throw e;
    throw new SBError('[extractPayload] exception <<' + e + '>> [/extractPayload]');
  }
}
/**
 * Extract payload - this decodes from our binary (wire) format
 * to a JS object. This supports a wide range of objects.
 */
export function extractPayload(value: ArrayBuffer): any {
  const verifySignature = (v: ArrayBuffer) => new Uint32Array(v, 0, 1)[0] === 0xAABBBBAA;
  const msg = 'Invalid payload signature (this is not a payload)';
  if (!verifySignature(value)) {
    if (DBG) console.error('\n', SEP, msg, '\n', value as any, SEP);
    throw new SBError(msg);
  }
  // now i need to strip out the first four bytes
  return _extractPayload(value.slice(4));
}

//#endregion

/******************************************************************************************************/
//#region SBCrypto

/**
  * class 'SBCrypto', below, provides a class with wrappers for subtle crypto, as well as
  * some SB-specific utility functions.
  * 
  * Typically a public jsonwebkey (JWK) will look something like this in json string format:
  *
  *                        "{\"crv\":\"P-384\",\"ext\":true,\"key_ops\":[],\"kty\":\"EC\",
  *                        \"x\":\"9s17B4i0Cuf_w9XN_uAq2DFePOr6S3sMFMA95KjLN8akBUWEhPAcuMEMwNUlrrkN\",
  *                        \"y\":\"6dAtcyMbtsO5ufKvlhxRsvjTmkABGlTYG1BrEjTpwrAgtmn6k25GR7akklz9klBr\"}"
  * 
  * A private key will look something like this:
  * 
  *                       "{\"crv\":\"P-384\",
  *                       \"d\":\"KCJHDZ34XgVFsS9-sU09HFzXZhnGCvnDgJ5a8GTSfjuJQaq-1N2acvchPRhknk8B\",
  *                       \"ext\":true,\"key_ops\":[\"deriveKey\"],\"kty\":\"EC\",
  *                       \"x\":\"rdsyBle0DD1hvp2OE2mINyyI87Cyg7FS3tCQUIeVkfPiNOACtFxi6iP8oeYt-Dge\",
  *                       \"y\":\"qW9VP72uf9rgUU117G7AfTkCMncJbT5scIaIRwBXfqET6FYcq20fwSP7R911J2_t\"}"
  * 
  * These are elliptic curve keys, we use P-384 (secp384r1). Mostly you will just
  * be using the 'class SB384' object, and all the details are handled.
  * 
  * The main (EC) RFC is 7518 (https://datatracker.ietf.org/doc/html/rfc7518#section-6.2),
  * supervised by IESG except for a tiny addition of one parameter ("ext") that is 
  * supervised by the W3C Crypto WG (https://w3c.github.io/webcrypto/#ecdsa).
  * 
  * EC in JWK has a number of parameters, but for us the only required ones are:
  * 
  *  crv: the curve (P-384 in this case)
  *  x: the x coordinate of the public key
  *  y: the y coordinate of the public key
  *  d: the private key (if it's a private key)
  *  kty: the key type (EC in this case)
  *  ext: the 'extractable' flag
  *  key_ops: (optional) permitted the key operations
  * 
  * All these components are implied except for x, y, and d. Various ways of encoding
  * (eg either just 'd', or just 'x', or 'x,y', or 'd,x', or 'd,x,y') are handled
  * using a prefix system on the keys when represented as a single (base62) string.
  * 
  * Starting with 'P' means public, 'X' means private.
  * 
  *  "PNk4": public key; x and y are present, the rest implied [KeyPrefix.SBPublicK+ey]
  *  "PNk2": public key, compressed, y is even
  *  "PNK3": public key, compressed, y is odd
  * 
  *  "Xj34": private key: x, y, d are present, the rest implied [KeyPrefix.SBPrivateKey]
  *  "Xj32": private key, compressed, has x and d, y is even
  *  "Xj33": private key, compressed, has x and d, y is odd
  * 
  *  "XjZx": private key, "dehydrated"; only d is present, x needed from other source (and y is even)
  * 
  * The fourth character encoded in enum KeySubPrefix below. Note that we encode using
  * base62 'externally', but 'x', 'y', and 'd' internally are in base64.
  * 
  * Keys default to being compressed.
  * 
  * For the AES key, we don't have an internal format; properties would include:
  * 
  *  "k": the key itself, encoded as base64
  *  "alg": "A256GCM"
  *  "key_ops": ["encrypt", "decrypt"]
  *  "kty": "oct"
  * 
  * Only the "k" property is required, the rest are implied, so it's trivial to track.
  * Whenever on the wire A256GCM would just require base62 encoding (into 43 characters).
  * 
  * The above (3-letter) prefixes we've generated randomly to hopefully avoid
  * collisions with other formats. For 2/3/4 we follow common (wire) formats.
  * There aren't conventions for what we're calling 'dehydrated' keys (they sort of
  * appear in crypto currency wallets).
  * 
  * The above in combination with Channels:
  *    
  * - private key: always d, x, ySign
  * - public key: always x, ySign
  * - channel key: same as public key
  *
  * channelId: can be derived from (channel) public key (from x,y)
  * 
  * when you join a channel, you can join w public key of channel, or channelId;
  * if you join just with channelId, you need channel server (to fetch public key)
  *
  * special format: dehydrated private key: just d (x through some other means)
  * 
  * 
  */

export enum KeyPrefix {
  SBPublicKey = "PNk",
  SBPrivateKey = "Xj3",
  SBDehydratedKey = "XjZ",
}

enum KeySubPrefix {
  CompressedEven = "2",
  CompressedOdd = "3",
  Uncompressed = "4",
  Dehydrated = "x",
}

// for key compression/decompression; extract sign of y-coordinate (0 is even)
function ySign(y: string | ArrayBuffer): 0 | 1 {
  if (typeof y === 'string')
    y = base64ToArrayBuffer(y);
  const yBytes = new Uint8Array(y);
  return (yBytes[yBytes.length - 1] & 1) === 1 ? 1 : 0;
}

// Takes a public or private key string, populates jwkStruct
// If a key is dehydrated (missing x), x must be provided (base64, eg jwk.x)
function parseSB384string(input: SBUserPublicKey | SBUserPrivateKey): jwkStruct | undefined {
  try {
    if (input.length <= 4) return undefined;
    const prefix = input.slice(0, 4);
    const data = input.slice(4);
    switch (prefix.slice(0, 3)) {
      case KeyPrefix.SBPublicKey: {
        switch (prefix[3]) {
          case KeySubPrefix.Uncompressed: {
            const combined = base62ToArrayBuffer(data)
            if (combined.byteLength !== (48 * 2)) return undefined;
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
            if (xBuf.byteLength !== 48) return undefined;
            const { x: xBase64, y: yBase64 } = decompressP384(arrayBufferToBase64url(xBuf), ySign);
            return {
              x: xBase64,
              y: yBase64,
              ySign: ySign,
            };
          }
          default: { console.error("KeySubPrefix not recognized"); }
        }
      } break;
      case KeyPrefix.SBPrivateKey: {
        switch (prefix[3]) {
          case KeySubPrefix.Uncompressed: {
            const combined = base62ToArrayBuffer(data)
            if (combined.byteLength !== (48 * 3)) return undefined;
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
            const combined = base62ToArrayBuffer(data)
            if (combined.byteLength !== (48 * 2)) return undefined;
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
          default: { console.error("KeySubPrefix not recognized"); }
        }
      } break;
      default: {
        console.error("KeyPrefix not recognized");
      }
    }
    // all paths to this point are failures to parse
    return undefined
  } catch (e) {
    console.error("parseSB384string() - malformed input, exception: ", e);
    return undefined;
  }
}


function xdySignToPrivateKey(x: string, d: string, ySign: 0 | 1): SBUserPrivateKey | undefined {
  if (!x || x.length !== 64 || !d || d.length !== 64 || ySign === undefined) return undefined;
  const combined = new Uint8Array(2 * 48);
  combined.set(base64ToArrayBuffer(x), 0);
  combined.set(base64ToArrayBuffer(d), 48);
  return KeyPrefix.SBPrivateKey + (ySign === 0 ? KeySubPrefix.CompressedEven : KeySubPrefix.CompressedOdd) + arrayBufferToBase62(combined)
}

/**
 * 'hydrates' a key - if needed; if it's already good on hydration, just returns it.
 * Providing pubKey (from other source) is optional so that you can use this function
 * to easily confirm that a key is hydrated, it will return undefined if it's not.
 */
export function hydrateKey(privKey: SBUserPrivateKey, pubKey?: SBUserPrivateKey): SBUserPrivateKey | undefined {
  if (privKey.length <= 4) return undefined;
  const prefix = privKey.slice(0, 4);
  switch (prefix.slice(0, 3)) {
    case KeyPrefix.SBPublicKey:
      return privKey;
    case KeyPrefix.SBPrivateKey: {
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
          const combined = base62ToArrayBuffer(privKeyData)
          const dBytes = combined.slice(0, 48);
          const d = arrayBufferToBase64url(dBytes);
          const jwk = parseSB384string(pubKey);
          if (!jwk || !jwk.x || jwk.ySign === undefined) {
            console.error("hydrateKey() - failed to parse public key");
            return undefined;
          }
          return xdySignToPrivateKey(jwk.x!, d, jwk.ySign);
        }
        default: { console.error("KeySubPrefix not recognized"); }
      }
    } break;
    default: {
      console.error("KeyPrefix not recognized");
    }
  }
  return undefined
}

/**
 * Utility class for SB crypto functions. Generally we use an object instantiation
 * of this (typically ''sbCrypto'') as a global variable.
 */
export class SBCrypto {  /************************************************************************************/
  /**
   * Hashes and splits into two (h1 and h1) signature of data, h1
   * is used to request (salt, iv) pair and then h2 is used for
   * encryption (h2, salt, iv).
   */
  generateIdKey(buf: ArrayBuffer): Promise<{ idBinary: ArrayBuffer, keyMaterial: ArrayBuffer }> {
    if (!(buf instanceof ArrayBuffer)) throw new TypeError('Input must be an ArrayBuffer');
    return new Promise((resolve, reject) => {
      try {
        crypto.subtle.digest('SHA-512', buf).then((digest) => {
          const _id = digest.slice(0, 32);
          const _key = digest.slice(32);
          resolve({
            idBinary: _id,
            keyMaterial: _key
          })
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * SBCrypto.generatekeys()
   *
   * Generates standard ``ECDH`` keys using ``P-384``.
   */
  async generateKeys(): Promise<CryptoKeyPair> {
    try {
      return await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-384' }, true, ['deriveKey']);
    } catch (e) {
      throw new SBError('generateKeys() exception (' + e + ')');
    }
  }

  /**
   * Import keys
   */
  async importKey(format: KeyFormat, key: BufferSource | JsonWebKey, type: 'ECDH' | 'AES' | 'PBKDF2', extractable: boolean, keyUsages: KeyUsage[]) {
    try {
      let importedKey: CryptoKey
      const keyAlgorithms = {
        ECDH: { name: 'ECDH', namedCurve: 'P-384' },
        AES: { name: 'AES-GCM' },
        PBKDF2: 'PBKDF2'
      }
      if (format === 'jwk') {
        // sanity check it's a JsonWebKey and not a BufferSource or something else
        const jsonKey = key as JsonWebKey
        if (jsonKey.kty === undefined) throw new SBError('importKey() - invalid JsonWebKey');
        if (jsonKey.alg === 'ECDH')
          jsonKey.alg = undefined; // todo: this seems to be a Deno mismatch w crypto standards?
        importedKey = await crypto.subtle.importKey('jwk', jsonKey, keyAlgorithms[type], extractable, keyUsages)
        // if (jsonKey.kty === 'EC')
        //   // public/private keys are cached
        //   this.addKnownKey(importedKey)
      } else {
        importedKey = await crypto.subtle.importKey(format, key as BufferSource, keyAlgorithms[type], extractable, keyUsages)
      }
      return (importedKey)
    } catch (e) {
      const msg = `... importKey() error: ${e}:`
      if (DBG) {
        console.log(SEP, SEP)
        console.error(msg)
        console.log(format)
        console.log(key)
        console.log(type)
        console.log(extractable)
        console.log(keyUsages)
        console.log(SEP, SEP)
      }
      throw new SBError(msg)
    }
  }

  /**
   * Export key; note that if there's an issue, this will return undefined.
   * That can happen normally if for example the key is restricted (and
   * not extractable).
   */
  async exportKey(format: 'jwk', key: CryptoKey) {
    return crypto.subtle
      .exportKey(format, key)
      .catch(() => {
        if (DBG) console.warn(`... exportKey() protested, this just means we treat this as undefined`)
        return undefined
      })
  }

  async encrypt(data: BufferSource, key: CryptoKey, params: EncryptParams): Promise<ArrayBuffer> {
    if (data === null) throw new SBError('no contents')
    if (!params.iv) throw new SBError('no nonce')
    if (!params.name) params.name = 'AES-GCM';
    else _sb_assert(params.name === 'AES-GCM', "Must be AES-GCM (L1951)")
    return crypto.subtle.encrypt(params as AesGcmParams, key, data);
  }

  // async wrap(
  //   body: any,
  //   sender: SBUserId,
  //   encryptionKey: CryptoKey,
  //   salt: ArrayBuffer,
  //   signingKey: CryptoKey,
  //   /* options?: MessageOptions */): Promise<ChannelMessage> {
  //   _sb_assert(body && sender && encryptionKey && signingKey, "wrapMessage(): missing required parameter(2)")
  //   const payload = assemblePayload(body);
  //   _sb_assert(payload, "wrapMessage(): failed to assemble payload")
  //   _sb_assert(payload!.byteLength < MAX_SB_BODY_SIZE,
  //     `wrapMessage(): body must be smaller than ${MAX_SB_BODY_SIZE / 1024} KiB (we got ${payload!.byteLength / 1024} KiB)})`)
  //   _sb_assert(salt, "wrapMessage(): missing salt")
  //   if (DBG2) console.log("will wrap() body, payload:\n", SEP, "\n", body, "\n", SEP, payload, "\n", SEP)
  //   const iv = crypto.getRandomValues(new Uint8Array(12))
  //   const timestamp = await Snackabra.dateNow()
  //   const view = new DataView(new ArrayBuffer(8));
  //   view.setFloat64(0, timestamp);
  //   var message: ChannelMessage = {
  //     f: sender,
  //     c: await sbCrypto.encrypt(payload!, encryptionKey, { iv: iv, additionalData: view }),
  //     iv: iv,
  //     salt: salt,
  //     s: await sbCrypto.sign(signingKey, payload!),
  //     ts: timestamp,
  //     // unencryptedContents: body, // 'original' payload' .. we do NOT include this
  //   }
  //   if (DBG2) console.log("wrap() message is\n", message)
  //   // if (options) {
  //   //   if (options.sendTo) message.t = options.sendTo
  //   //   if (options.ttl) message.ttl = options.ttl
  //   //   if (options.subChannel) throw new SBError(`wrapMessage(): subChannel not yet supported`)
  //   // }
  //   // try {
  //   //   message = validate_ChannelMessage(message)
  //   // } catch (e) {
  //   //   const msg = `wrapMessage(): failed to validate message: ${e}`
  //   //   console.error(msg)
  //   //   throw new SBError(msg)
  //   // }
  //   return message
  // }

  /**
   * Internally this is Deprecated, but we retain a simplified version for now; for example,
   * some unit tests use this to 'track' higher-level jslib primitives. This used to be
   * the main approach to boot-strap a ChannelMessage object; this is now divided into
   * sync and async phases over internal channel queues.
   */
  async wrap(
    body: any,
    sender: SBUserId,
    encryptionKey: CryptoKey,
    salt: ArrayBuffer,
    signingKey: CryptoKey
  ): Promise<ChannelMessage> {
    const payload = assemblePayload(body);
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const timestamp = await Snackabra.dateNow()
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, timestamp);
    return ({
      f: sender,
      c: await sbCrypto.encrypt(payload!, encryptionKey, { iv: iv, additionalData: view }),
      iv: iv,
      salt: salt,
      s: await sbCrypto.sign(signingKey, payload!),
      ts: timestamp,
    })
  }


  // unwrapShard(k: CryptoKey, o: ChannelMessage): Promise<ArrayBuffer> {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       const { c: t, iv: iv } = o
  //       _sb_assert(t, "[unwrap] No contents in encrypted message (probably an error)")
  //       const d = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, k, t!)
  //       resolve(d)
  //     } catch (e) {
  //       // not an error per se, for example could just be wrong key
  //       if (DBG) console.error(`unwrap(): cannot unwrap/decrypt - rejecting: ${e}`)
  //       if (DBG2) console.log("message was \n", o)
  //       reject(e);
  //     }
  //   });
  // }

  /** Basic signing */
  sign(signKey: CryptoKey, contents: ArrayBuffer) {
    // return crypto.subtle.sign('HMAC', secretKey, contents);
    return crypto.subtle.sign({ name: "ECDSA", hash: { name: "SHA-384" }, }, signKey, contents)
  }

  /** Basic verifcation */
  verify(verifyKey: CryptoKey, sign: ArrayBuffer, contents: ArrayBuffer) {
    // return crypto.subtle.verify('HMAC', verifyKey, sign, contents)
    return crypto.subtle.verify({ name: "ECDSA", hash: { name: "SHA-384" }, }, verifyKey, sign, contents)
  }

  /** Standardized 'str2ab()' function, string to array buffer. */
  str2ab(string: string): Uint8Array {
    return new TextEncoder().encode(string);
  }

  /** Standardized 'ab2str()' function, array buffer to string. */
  ab2str(buffer: Uint8Array): string {
    return new TextDecoder('utf-8').decode(buffer);
  }


} /* SBCrypto */

//#endregion

/******************************************************************************************************/
//#region Decorators

// Decorator
// caches resulting value (after any verifications eg ready pattern)
export function Memoize(target: any, propertyKey: string /* ClassGetterDecoratorContext */, descriptor?: PropertyDescriptor) {
  if ((descriptor) && (descriptor.get)) {
    let get = descriptor.get
    descriptor.get = function () {
      const prop = `__${target.constructor.name}__${propertyKey}__`
      if (this.hasOwnProperty(prop)) {
        const returnValue = this[prop as keyof PropertyDescriptor]
        return (returnValue)
      } else {
        const returnValue = get.call(this)
        Object.defineProperty(this, prop, { configurable: false, enumerable: false, writable: false, value: returnValue })
        return returnValue
      }
    }
  }
}

// Decorator
// asserts that corresponding object is 'ready'; also asserts non-null getter return value
export function Ready(target: any, propertyKey: string /* ClassGetterDecoratorContext */, descriptor?: PropertyDescriptor) {
  if ((descriptor) && (descriptor.get)) {
    let get = descriptor.get
    descriptor.get = function () {
      const obj = target.constructor.name
      const readyFlagSymbol = target.constructor.ReadyFlag;
      // todo: consider adding 'errorState' as general blocker
      // if (DBG) console.log(`Ready: ${obj}.${propertyKey} constructor:`, target.constructor)
      _sb_assert(readyFlagSymbol in this, `'readyFlagSymbol' missing yet getter accessed with @Ready pattern (fatal)`);
      _sb_assert((this as any)[readyFlagSymbol], `'${obj}.${propertyKey}' getter accessed but object not 'ready' (fatal)`);
      const retValue = get.call(this);
      _sb_assert(retValue != null, `'${obj}.${propertyKey}' getter accessed but return value will be NULL (fatal)`);
      return retValue;
    }
  }
}

// Decorator
// asserts caller is an owner of the channel for which an api is called
function Owner(target: any, propertyKey: string /* ClassGetterDecoratorContext */, descriptor?: PropertyDescriptor) {
  if ((descriptor) && (descriptor.get)) {
    let get = descriptor.get
    descriptor.get = function () {
      const obj = target.constructor.name
      if ('owner' in this) {
        const o = "owner" as keyof PropertyDescriptor
        _sb_assert(this[o] === true, `${propertyKey} getter or method accessed for object ${obj} but callee is not channel owner`)
      }
      return get.call(this) // we don't check return value here
    }
  }
}

// // Decorator
// // asserts any types that are SB classes are valid
// // we're not quite doing this yet. interfaces would be more important to handle in this manner,
// // however even with new (upcoming) additional type metadata for decorators, can't yet be done.
// function VerifyParameters(_target: any, _propertyKey: string /* ClassMethodDecoratorContext */, descriptor?: PropertyDescriptor): any {
//   if ((descriptor) && (descriptor.value)) {
//     const operation = descriptor.value
//     descriptor.value = function (...args: any[]) {
//       for (let x of args) {
//         const m = x.constructor.name
//         if (isSBClass(m)) _sb_assert(SBValidateObject(x, m), `invalid parameter: ${x} (expecting ${m})`)
//       }
//       return operation.call(this, ...args)
//     }
//   }
// }

// // Decorator
// // turns any exception into a reject
// function ExceptionReject(target: any, _propertyKey: string /* ClassMethodDecoratorContext */, descriptor?: PropertyDescriptor) {
//   if ((descriptor) && (descriptor.value)) {
//     const operation = descriptor.value
//     descriptor.value = function (...args: any[]) {
//       try {
//         return operation.call(this, ...args)
//       } catch (e) {
//         console.log(`ExceptionReject: ${WrapError(e)}`)
//         console.log(target)
//         console.log(_propertyKey)
//         console.log(descriptor)
//         return new Promise((_resolve, reject) => reject(`Reject: ${WrapError(e)}`))
//       }
//     }
//   }
// }


// type SB_CLASS_TYPES = typeof SB_CLASS_ARRAY[number]
// type SB_CLASSES = /* SBMessage | */ SBObjectHandle | SBChannelHandle

const SB_CHANNEL_MESSAGE_SYMBOL = Symbol('SB_CHANNEL_MESSAGE_SYMBOL')
const SB_CHANNEL_API_BODY_SYMBOL = Symbol('SB_CHANNEL_API_BODY_SYMBOL')
const SB_CHANNEL_HANDLE_SYMBOL = Symbol('SBChannelHandle')
// const SB_MESSAGE_SYMBOL = Symbol.for('SBMessage')
const SB_OBJECT_HANDLE_SYMBOL = Symbol.for('SBObjectHandle')
const SB_STORAGE_TOKEN_SYMBOL = Symbol.for('SBStorageToken')

// function isSBClass(s: SB_CLASSES): boolean {
//   return typeof s === 'string' && SB_CLASS_ARRAY.includes(s as SB_CLASS_TYPES)
// }

// function SBValidateObject(obj: SBChannelHandle, type: 'SBChannelHandle'): boolean
// function SBValidateObject(obj: SBObjectHandle, type: 'SBObjectHandle'): boolean
// // function SBValidateObject(obj: SBMessage, type: 'SBMessage'): boolean
// function SBValidateObject(obj: SB_CLASSES | any, type: SB_CLASS_TYPES): boolean {
//   switch (type) {
//     case 'SBMessage': return SB_MESSAGE_SYMBOL in obj
//     case 'SBObjectHandle': return SB_OBJECT_HANDLE_SYMBOL in obj
//     case 'SBChannelHandle': return SB_OBJECT_HANDLE_SYMBOL in obj
//     default: return false
//   }
// }

//#endregion

/******************************************************************************************************/
//#region - SETUP and STARTUP

/**
 * This is the GLOBAL SBCrypto object, which is instantiated
 * immediately upon loading the jslib library.
 * 
 * You should use this guy, not instantiate your own. We don't
 * use static functions in SBCrypto(), because we want to be
 * able to add features (like global key store) incrementally.
 */
export const sbCrypto = new SBCrypto();

const SEP = '\n' + '='.repeat(76) + '\n'
const SEPx = '='.repeat(76) + '\n'

//#endregion - SETUP and STARTUP stuff

/******************************************************************************************************/
//#region - SB384

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus === 1n) return 0n;
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

// signY is 0 or 1 (even or odd)
function decompressP384(xBase64: string, signY: number) {
  // Consts for secp384r1 curve
  const prime = BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffff'),
    b = BigInt('0xb3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aef'),
    pIdent = (prime + 1n) / 4n;
  const xBytes = new Uint8Array(base64ToArrayBuffer(xBase64));
  const xHex = '0x' + Array.from(xBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  var x = BigInt(xHex);
  var y = modPow(x * x * x - 3n * x + b, pIdent, prime);
  if (y % 2n !== BigInt(signY))
    y = prime - y;
  // we now need to convert 'y' to a base64 string
  const yHex = y.toString(16).padStart(96, '0');
  const yBytes = new Uint8Array(yHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const yBase64 = arrayBufferToBase64url(yBytes);
  return { x: xBase64, y: yBase64 };
}

/**
  * Basic (core) capability object in SB.
  *
  * Can initialize from various formats. If no starting point key is given,
  * it will "mint" a fresh key.
  *
  * If ``forcePrivate`` is true, will force SB384 to include private key; it
  * will throw an exception if the key is not private. If SB384 is used to mint,
  * then it's always private.
  *
  * The important "externally visible" formats are:
  *
  * - {@link SB384.userId}: unique hash ({@link SB384Hash}) of contents of
  *   public key, shorter format (256 bits, 43 x base62), cannot be used to
  *   reconstruct key, used to identify users (and channels)
  *
  * - userPublicKey(): encodes core public key info ('x' and 'y' fields), as a
  *   base62 string (with a unique prefix). This is 'wire' format as well as
  *   human-readable. 
  *
  * - userPrivateKey(): similar to public key format, adds the 'd' field
  *   information (embedded), from this format a full private key can be
  *   reconstructed.
  *
  * Like most SB classes, SB384 follows the "ready template" design pattern: the
  * object is immediately available upon creation, but isn't "ready" until it
  * says it's ready. See `Channel Class`_ example below. Getters will throw
  * exceptions if the object isn't sufficiently initialized. Also see Design
  * Note [4]_.
  *
  * { @link https://snackabra.io/jslib.html#dn-004-the-ready-pattern }

  *
  */
class SB384 {
  // ready: Promise<SB384>
  sb384Ready: Promise<SB384>

  // SB384ReadyFlag: boolean = false // must be named <class>ReadyFlag
  static ReadyFlag = Symbol('SB384ReadyFlag'); // see below for '(this as any)[SB384.ReadyFlag] = false;'

  #private?: boolean

  #x?: string // all these are base64 encoded
  #y?: string
  #ySign?: 0 | 1 // 0 = even, 1 = odd
  #d?: string

  #privateUserKey?: CryptoKey // if present always private
  #publicUserKey?: CryptoKey  // always public

  #signKey?: CryptoKey // can sign/verify if private, or just verify

  #hash?: SB384Hash // generic 'identifier', see hash getter below
  #hashB32?: string // base32 version of hash (first 12 sets eg 48 chars)

  errorState = false; // catch errors and blocks; helps with async error/cleanup sequence

  /**
   * As a fundamental object, SB384 can be initialized from a number starting points:
   * 
   * - No key provided: a new key pair is generated
   * - A CryptoKey object: a key pair is generated from the CryptoKey
   * - A JsonWebKey object: a key pair is generated from the JsonWebKey
   * - A SBUserPublicKey object: a key pair is generated from the SBUserPublicKey
   * - A SBUserPrivateKey object: a key pair is generated from the SBUserPrivateKey
   * 
   * The 'forcePrivate' parameter is used to force the object to be private; if
   * the key provided is inherently not private, an exception is thrown. This simplifies
   * situation where it would only make sense if you're operating with a private key,
   * and spares you from (sometimes convoluted) checks (eg what fields are present in
   * a 'jwk' field etc).
   */
  constructor(key?: CryptoKey | JsonWebKey | SBUserPublicKey | SBUserPrivateKey, forcePrivate?: boolean) {
    (this as any)[SB384.ReadyFlag] = false;
    this.sb384Ready = new Promise<SB384>(async (resolve, reject) => {
      try {
        if (!key) {
          // generate a fresh ID
          if (DBG2) console.log("SB384() - generating new key pair")
          const keyPair = await sbCrypto.generateKeys()
          const _jwk = await sbCrypto.exportKey('jwk', keyPair.privateKey);
          _sb_assert(_jwk && _jwk.x && _jwk.y && _jwk.d, 'INTERNAL');
          this.#private = true
          this.#x = _jwk!.x!
          this.#y = _jwk!.y!
          this.#d = _jwk!.d!
          if (DBG2) console.log("#### FROM SCRATCH", this.#private)
        } else if (key instanceof CryptoKey) {
          const _jwk = await sbCrypto.exportKey('jwk', key);
          _sb_assert(_jwk && _jwk.x && _jwk.y, 'INTERNAL');
          if (_jwk!.d) {
            this.#private = true
            this.#d = _jwk!.d!
          } else {
            this.#private = false
            _sb_assert(!forcePrivate, `ERROR creating SB384 object: key provided is not the requested private`)
          }
          this.#x = _jwk!.x!
          this.#y = _jwk!.y!
        } else if (key && key instanceof Object && 'kty' in key) {
          // jwk key provided
          const _jwk = key as JsonWebKey
          _sb_assert(_jwk && _jwk.x && _jwk.y, 'Cannot parse format of JWK key');
          if (key.d) {
            this.#private = true
            this.#d = _jwk!.d!
          } else {
            this.#private = false
            _sb_assert(!forcePrivate, `ERROR creating SB384 object: key provided is not the requested private`)
          }
          this.#x = _jwk!.x!
          this.#y = _jwk!.y!

          // this.#jwk = key
          // this.#userKey = await sbCrypto
          // .importKey('jwk', this.#jwk, 'ECDH', true, ['deriveKey'])
          // .catch((e) => { throw e })
        } else if (typeof key === 'string') {
          // we're given a string encoding

          const tryParse = parseSB384string(key)
          if (!tryParse) throw new SBError('ERROR creating SB384 object: invalid key (must be a JsonWebKey | SBUserPublicKey | SBUserPrivateKey, or omitted)')
          const { x, y, d } = tryParse as jwkStruct
          if (d) {
            this.#private = true
            this.#d = d
          } else {
            this.#private = false
            _sb_assert(!forcePrivate, `ERROR creating SB384 object: key provided is not the requested private`)
          }
          _sb_assert(x && y, 'INTERNAL');
          this.#x = x
          this.#y = y
        } else {
          throw new SBError('ERROR creating SB384 object: invalid key (must be a JsonWebKey, SBUserId, or omitted)')
        }
        if (DBG2) console.log("SB384() constructor; x/y/d:\n", this.#x, "\n", this.#y, "\n", this.#d)
        if (this.#private)
          this.#privateUserKey = await sbCrypto.importKey('jwk', this.jwkPrivate, 'ECDH', true, ['deriveKey'])
        this.#publicUserKey = await sbCrypto.importKey('jwk', this.jwkPublic, 'ECDH', true, [])
        // we mostly use for sign/verify, occasionally encryption, so double use is ... hopefully ok
        if (this.#private) {
          const newJwk = { ...this.jwkPrivate, key_ops: ['sign'] }
          if (DBG2) console.log('starting jwk (private):\n', newJwk)
          this.#signKey = await crypto.subtle.importKey("jwk",
            newJwk,
            {
              name: "ECDSA",
              namedCurve: "P-384",
            },
            true,
            ['sign'])
        } else {
          const newJwk = { ...this.jwkPublic, key_ops: ['verify'] }
          if (DBG2) console.log('starting jwk (public):\n', newJwk)
          this.#signKey = await crypto.subtle.importKey("jwk",
            newJwk,
            {
              name: "ECDSA",
              namedCurve: "P-384",
            },
            true,
            ['verify'])
        }

        // can't put in getter since it's async
        const channelBytes = _appendBuffers([base64ToArrayBuffer(this.#x!), base64ToArrayBuffer(this.#y!)])
        const rawHash = await crypto.subtle.digest('SHA-256', channelBytes)
        this.#hash = arrayBufferToBase62(rawHash)

        // we also create a base32 version of the hash, for use in channel ids (Pages)
        const hashBigInt = BigInt('0x' + Array.from(new Uint8Array(rawHash)).map(b => b.toString(16).padStart(2, '0')).join('')) >> 28n;
        this.#hashB32 = Array.from({ length: 12 }, (_, i) => b32encode(Number((hashBigInt >> BigInt(19 * (11 - i))) & 0x7ffffn))).join('');

        if (DBG2) console.log("SB384() constructor; hash:\n", this.#hash)

        this.#ySign = ySign(this.#y!);

        if (DBG2) console.log("SB384() - constructor wrapping up", this)
          // sbCrypto.addKnownKey(this)
          ; (this as any)[SB384.ReadyFlag] = true
        resolve(this)
      } catch (e) {
        reject('ERROR creating SB384 object failed: ' + WrapError(e))
      }
    })

    // if (DBG) console.log("SB384() - constructor promises set up, promise is:", this.sb384Ready)
  }

  get SB384ReadyFlag() { return (this as any)[SB384.ReadyFlag] }
  get ready() { return this.sb384Ready }
  // get readyFlag() { return this.#SB384ReadyFlag }

  /** Returns true if this is a private key, otherwise false.
   * Will throw an exception if the object is not ready. */
  @Memoize @Ready get private() { return this.#private! }

  /**
   * Returns a unique identifier for external use, that will be unique
   * for any class or object that uses SB384 as it's root.
   * 
   * This is deterministic. Typical use case is to translate a user id
   * into a {@link ChannelId} (eg the channel that any user id is inherently
   * the owner of).
   * 
   * The hash is base62 encoding of the SHA-384 hash of the public key.
   * 
   */
  @Memoize @Ready get hash(): SB384Hash { return this.#hash! }

  /**
   * Similar to {@link SB384.hash}, but base32 encoded.
   */
  @Memoize @Ready get hashB32(): SB384Hash { return this.#hashB32! }

  // convenience getter
  @Memoize @Ready get userId(): SB384Hash { return this.hash }

  /** {@link ChannelID} that corresponds to this, if it's an owner */
  @Memoize @Ready get ownerChannelId() {
    // error even though there's a #hash, since we know it needs to be private
    // ... update, hm, actually this is still used as "whatif" for non-owner
    // if (!this.private) throw new SBError(`ownerChannelId() - not a private key, cannot be an owner key`)
    return this.hash
  }

  /** @type {CryptoKey} Private key (might not be present, in which case this will throw) */
  @Memoize @Ready get privateKey(): CryptoKey {
    if (!this.private) throw new SBError(`this is a public key, there is no 'privateKey' value`)
    return this.#privateUserKey!
  }

  /** @type {CryptoKey} Signing key. */
  @Memoize @Ready get signKey(): CryptoKey { return this.#signKey! }

  /** @type {CryptoKey} Basic public key, always present. */
  @Memoize @Ready get publicKey(): CryptoKey { return this.#publicUserKey! }

  /* Deprecated For 'jwk' format use cases. @type {JsonWebKey} */
  // @Memoize @Ready get exportable_pubKey() { return sbCrypto.extractPubKey(this.#jwk!)! }

  /** @type {JsonWebKey} Exports private key in 'jwk' format. */
  @Memoize get jwkPrivate(): JsonWebKey {
    _sb_assert(this.#private, 'jwkPrivate() - not a private key')
    _sb_assert(this.#x && this.#y && this.#d, "JWK key info is not available (fatal)")
    return {
      crv: "P-384",
      ext: true,
      key_ops: ["deriveKey"],
      kty: "EC",
      x: this.#x!,
      y: this.#y!,
      d: this.#d!,
    }
  }

  /** @type {JsonWebKey} Exports public key in 'jwk' format. */
  @Memoize get jwkPublic(): JsonWebKey {
    _sb_assert(this.#x && this.#y, "JWK key info is not available (fatal)")
    return {
      crv: "P-384",
      ext: true,
      key_ops: [],
      kty: "EC",
      x: this.#x!,
      y: this.#y!
    }
  }

  @Memoize get ySign(): 0 | 1 {
    _sb_assert(this.#ySign !== null, "ySign() - ySign is not available (fatal)")
    return this.#ySign!
  }

  /**
   * Wire format of full (decodable) public key
   * @type {SBUserPublicKey}
   */
  @Memoize get userPublicKey(): SBUserPublicKey {
    _sb_assert(this.#x && (this.#ySign !== undefined), "userPublicKey() - sufficient key info is not available (fatal)")
    return KeyPrefix.SBPublicKey + (this.#ySign! === 0 ? KeySubPrefix.CompressedEven : KeySubPrefix.CompressedOdd) + base64ToBase62(this.#x!)
  }

  /**
   * Wire format of full info of key (eg private key). Compressed.
   */
  @Memoize get userPrivateKey(): SBUserPrivateKey {
    _sb_assert(this.#private, 'userPrivateKey() - not a private key, there is no userPrivateKey')
    const key = xdySignToPrivateKey(this.#x!, this.#d!, this.#ySign!)
    _sb_assert(key !== undefined, "userPrivateKey() - failed to construct key, probably missing info (fatal)")
    return key!
  }

  /**
   * Compressed and dehydrated, meaning, 'x' needs to come from another source.
   * (If lost it can be reconstructed from 'd')
   */
  @Memoize get userPrivateKeyDehydrated(): SBUserPrivateKey {
    _sb_assert(this.#private && this.#d, "userPrivateKey() - not a private key, and/or 'd' is missing, there is no userPrivateKey")
    return (KeyPrefix.SBPrivateKey + KeySubPrefix.Dehydrated + base64ToBase62(this.#d!)) as SBUserPrivateKey
  }

  /**
   * Convenience wrapper, returns a promise to new, valid SB384 private key.
   * It's essentially short for:
   * 
   * ```javascript
   * const newKey = (await (new SB384()).ready).userPrivateKey
   * ```
   * 
   */
  static async newPrivateKey(): Promise<SBUserPrivateKey> {
    return (await (new SB384()).ready).userPrivateKey
  }


} /* class SB384 */
//#endregion

/******************************************************************************************************/
//#region Channel, ChannelSocket, SBMessage

/**
 * Key exchange protocol. (Note that SBMessage always includes
 * a reference to the channel)
 */
export interface SBProtocol {
  // even if not used by the protocol, this is set by the channel once the
  // protocol is associated with it; note that if a protocol needs to do
  // prelimaries once it knows the channel, it needs to track that itself
  setChannel(channel: Channel): void;
  // if the protocol doesn't 'apply' to the message, this should throw
  encryptionKey(msg: ChannelMessage /* SBMessage */): Promise<CryptoKey>;
  // 'undefined' means it's outside the scope of our protocol, for example
  // if we're not a permitted recipient, or keys have expired, etc
  decryptionKey(channel: Channel, msg: ChannelMessage): Promise<CryptoKey | undefined>;
}

/**
 * Superset of what different protocols might need. Their meaning
 * depends on the protocol
 */
export interface Protocol_KeyInfo {
  salt1?: ArrayBuffer,
  salt2?: ArrayBuffer,
  iterations1?: number,
  iterations2?: number,
  hash1?: string,
  hash2?: string,
  summary?: string,
}

/**
 * Basic protocol, just provide entropy and salt, then all
 * messages are encrypted accordingly.
 */
export class Protocol_AES_GCM_256 implements SBProtocol {
  #masterKey?: Promise<CryptoKey>
  #keyInfo: Protocol_KeyInfo

  constructor(passphrase: string, keyInfo: Protocol_KeyInfo) {
    this.#keyInfo = keyInfo; // todo: assert components
    this.#masterKey = this.initializeMasterKey(passphrase);
  }

  async ready() {
    // only really needed for unit tests, that don't like to have dangling promises
    await this.#masterKey
  }

  setChannel(_channel: Channel): void {
    // this protocol doesn't do anything with it, but we need to have endpoint
  }

  async initializeMasterKey(passphrase: string): Promise<CryptoKey> {
    const salt = this.#keyInfo.salt1!;
    const iterations = this.#keyInfo.iterations1!;
    const hash = this.#keyInfo.hash1!;
    _sb_assert(salt && iterations && hash, "Protocol_AES_GCM_256.initializeMasterKey() - insufficient key info (fatal)")

    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const masterKeyBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: hash
      },
      baseKey,
      256
    );

    return crypto.subtle.importKey(
      'raw',
      masterKeyBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
  }

  static async genKey(): Promise<Protocol_KeyInfo> {
    return {
      salt1: crypto.getRandomValues(new Uint8Array(16)).buffer,
      iterations1: 100000,
      iterations2: 10000,
      hash1: 'SHA-256',
      summary: 'PBKDF2 - SHA-256 - AES-GCM',
    }
  }

  // Derive a per-message key 
  async #getMessageKey(salt: ArrayBuffer): Promise<CryptoKey> {
    const derivedKey = await crypto.subtle.deriveKey(
      {
        'name': 'PBKDF2',
        'salt': salt,
        'iterations': this.#keyInfo.iterations2!, // on a per-message basis
        'hash': this.#keyInfo.hash1!
      },
      await this.#masterKey!,
      { 'name': 'AES-GCM', 'length': 256 }, true, ['encrypt', 'decrypt'])
    return derivedKey
  }

  async encryptionKey(msg: /* SBMessage */ ChannelMessage): Promise<CryptoKey> {
    _sb_assert(msg.salt, "Protocol called without salt (Internal Error)")
    if (DBG2) console.log("CALLING Protocol_AES_GCM_384.encryptionKey(), salt:", msg.salt)
    return this.#getMessageKey(msg.salt!)
  }

  async decryptionKey(_channel: Channel, msg: ChannelMessage): Promise<CryptoKey | undefined> {
    if (!msg.salt) {
      console.warn("Salt should always be present in ChannelMessage")
      return undefined
    }
    if (DBG) console.log("CALLING Protocol_AES_GCM_384.decryptionKey(), salt:", msg.salt)
    return this.#getMessageKey(msg.salt!)
  }
}

/**
 * Implements 'whisper', eg 1:1 public-key based encryption between
 * sender and receiver. It will use as sender the private key used
 * on the Channel, and you can either provide 'sendTo' in the 
 * SBMessage options, or omit it in which case it will use the
 * channel owner's public key.
 * 
 * If no protocol is provided to a channel or message, then this
 * protocol is used by default.
 */
export class Protocol_ECDH implements SBProtocol {
  #channel?: Channel;
  #keyMap: Map<string, CryptoKey> = new Map();

  constructor() { /* this protocol depends on channel and recipient only */ }

  setChannel(channel: Channel): void {
    this.#channel = channel;
  }

  async encryptionKey(msg: /* SBMessage */ ChannelMessage): Promise<CryptoKey> {
    _sb_assert(this.#channel, "[Protocol_ECDH] Error, need to know channel (L2511)")
    await this.#channel!.ready;
    const channelId = this.#channel!.channelId!;
    _sb_assert(channelId, "Internal Error (L2565)");
    const sendTo = msg.t ? msg.t : this.#channel!.channelData.ownerPublicKey;
    return this.#getKey(channelId, sendTo, this.#channel!.privateKey);
  }

  async decryptionKey(channel: any, msg: ChannelMessage): Promise<CryptoKey | undefined> {
    await channel.ready;
    const channelId = channel.channelId!;
    _sb_assert(channelId, "Internal Error (L2594)");
    const sentFrom = channel.visitors.get(msg.f)!;
    if (!sentFrom) {
      console.error("Protocol_ECDH.key() - sentFrom is unknown");
      return undefined;
    }
    return this.#getKey(channelId, sentFrom, channel.privateKey);
  }

  async #getKey(channelId: string, publicKey: string, privateKey: CryptoKey): Promise<CryptoKey> {
    const key = channelId + "_" + publicKey;
    if (!this.#keyMap.has(key)) {
      const newKey = await crypto.subtle.deriveKey(
        {
          name: 'ECDH',
          public: (await new SB384(publicKey).ready).publicKey
        },
        privateKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      this.#keyMap.set(key, newKey);
      if (DBG2) console.log("++++ Protocol_ECDH.key() - newKey:", newKey);
    }
    const res = this.#keyMap.get(key);
    _sb_assert(res, "Internal Error (L2584/2611)");
    if (DBG2) console.log("++++ Protocol_ECDH.key() - res:", res);
    return res!;
  }
}

/**
 * The minimum state of a Channel is the "user" keys, eg
 * how we identify when connecting to the channel.
 */
export class SBChannelKeys extends SB384 {
  #channelId?: SBChannelId
  sbChannelKeysReady: Promise<SBChannelKeys>
  static ReadyFlag = Symbol('SBChannelKeysReadyFlag'); // see below for '(this as any)[<class>.ReadyFlag] = false;'
  #channelData?: SBChannelData
  channelServer: string // can be read/written freely; will always have a value

  constructor(handleOrKey?: SBChannelHandle | SBUserPrivateKey) {
    // undefined (missing) is fine, but 'null' is not
    let channelServer: string | undefined
    if (handleOrKey === null) throw new SBError(`SBChannelKeys constructor: you cannot pass 'null'`)
    if (handleOrKey) {
      if (typeof handleOrKey === 'string') {
        // we're provided an owner private key
        const ownerPrivateKey = handleOrKey as SBUserPrivateKey
        super(ownerPrivateKey, true)
      } else if (_check_SBChannelHandle(handleOrKey)) {
        const handle = validate_SBChannelHandle(handleOrKey)
        channelServer = handle.channelServer
        super(handle.userPrivateKey, true);
        this.#channelId = handle.channelId
        this.#channelData = handle.channelData // which might not be there
      } else {
        throw new SBError(`SBChannelKeys() constructor: invalid parameter (must be SBChannelHandle or SBUserPrivateKey)`)
      }
    } else {
      // brand new, state will be derived from SB384 keys
      super()
    }
    if (!channelServer) channelServer = Snackabra.defaultChannelServer;
    // make sure there are no trailing '/' in channelServer
    if (channelServer![channelServer!.length - 1] === '/')
      this.channelServer = channelServer!.slice(0, -1);
    this.channelServer = channelServer!;

    (this as any)[SBChannelKeys.ReadyFlag] = false
    this.sbChannelKeysReady = new Promise<SBChannelKeys>(async (resolve, reject) => {
      try {
        if (DBG) console.log("SBChannelKeys() constructor.")
        // wait for parent keys (super)
        await this.sb384Ready; _sb_assert(this.private, "Internal Error [L2833]")
        // either channelId wasn't provided (in which case we must be owner)
        // or it was (and we're also the owner)
        if (!this.#channelId || this.owner) {
          if (!this.#channelId) this.#channelId = this.ownerChannelId
          this.#channelData = {
            channelId: this.ownerChannelId,
            ownerPublicKey: this.userPublicKey
          }
        } else if (!this.#channelData) {
          // we're not owner, and we haven't gotten the ownerPublicKey, so we need to ask the server
          if (!this.channelServer)
            throw new SBError("SBChannelKeys() constructor: either key is owner key, or handle contains channelData, or channelServer is provided ...")
          if (DBG) console.log("++++ SBChannelKeys being initialized from server")
          var cpk: SBChannelData
          try {
            cpk = await this.callApi('/getChannelKeys')
          } catch (e) {
            // any errors, and we wait 1 second and then try again, until it works
            while (true) {
              await new Promise(resolve => setTimeout(resolve, 1000))
              try {
                cpk = await this.callApi('/getChannelKeys')
                break
              } catch (e) {
                // ToDo: these retries should be behind a Snackabra 'back online' event;
                // and in any case a Channel can be 'partly' ready without channel keys.
                // right now proper offline resilience only works for owner keys.
                console.error("SBChannelKeys() constructor: failed to get channel data, retrying ...")
              }
            }
          }
          cpk = validate_SBChannelData(cpk) // throws if there's an issue
          // we have the authoritative keys from the server, sanity check
          _sb_assert(cpk.channelId === this.#channelId, "Internal Error (L2493)")
          this.#channelData = cpk
        }
        // should be all done at this point
        (this as any)[SBChannelKeys.ReadyFlag] = true;
        resolve(this)
      } catch (e) {
        reject('[SBChannelKeys] constructor failed. ' + WrapError(e))
      }
    })
  }

  get ready() { return this.sbChannelKeysReady }
  get SBChannelKeysReadyFlag() { return (this as any)[SBChannelKeys.ReadyFlag] }

  @Memoize get owner() { return this.private && this.ownerChannelId && this.channelId && this.ownerChannelId === this.channelId }
  @Memoize get channelId() {
    if (this.#channelId) return this.#channelId
    else throw new SBError("[SBChannelKeys] ChannelID not known / object not ready. Internal Error (L894)")
  }

  @Memoize @Ready get channelData() { return this.#channelData! }


  @Memoize @Ready get handle(): SBChannelHandle {
    return {
      [SB_CHANNEL_HANDLE_SYMBOL]: true,
      channelId: this.channelId!,
      userPrivateKey: this.userPrivateKey,
      // channelPrivateKey: this.channelUserPrivateKey,
      channelServer: this.channelServer,
      channelData: this.channelData
    }
  }

  async buildApiBody(path: string, apiPayload?: any) {
    await this.sb384Ready // enough for signing
    const timestamp = await Snackabra.dateNow() // todo: x256 string format
    const viewBuf = new ArrayBuffer(8);
    const view = new DataView(viewBuf);
    view.setFloat64(0, timestamp);
    const pathAsArrayBuffer = new TextEncoder().encode(path).buffer
    const prefixBuf = _appendBuffers([viewBuf, pathAsArrayBuffer])
    const apiPayloadBuf = apiPayload ? assemblePayload(apiPayload)! : undefined
    // sign with userId key, covering timestamp + path + apiPayload
    const sign = await sbCrypto.sign(this.signKey, apiPayloadBuf ? _appendBuffers([prefixBuf, apiPayloadBuf]) : prefixBuf)
    const apiBody: ChannelApiBody = {
      channelId: this.#channelId!,
      path: path,
      userId: this.userId,
      userPublicKey: this.userPublicKey,
      timestamp: timestamp,
      sign: sign
    }
    if (apiPayloadBuf) apiBody.apiPayloadBuf = apiPayloadBuf
    return validate_ChannelApiBody(apiBody)
  }

  /**
    * Implements Channel api calls.
    * 
    * Note that the API call details are also embedded in the ChannelMessage,
    * and signed by the sender, completely separate from HTTP etc auth.
    */
  callApi(path: string): Promise<any>
  callApi(path: string, apiPayload: any): Promise<any>
  callApi(path: string, apiPayload?: any): Promise<any> {
    _sb_assert(this.channelServer, "[ChannelApi.callApi] channelServer is unknown (you can just set it, eg 'channel.channelServer = ...')")
    if (DBG) console.log("ChannelApi.callApi: calling fetch with path:", path)
    if (DBG2) console.log("... and body:", apiPayload)
    _sb_assert(this.#channelId && path, "Internal Error (L2528)")
    // todo: we can add 'GET' support with apiBody put into search term,
    //       if we want that (as we're forced to do for web sockets)
    return new Promise(async (resolve, reject) => {
      const init: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream"',
        },
        body: assemblePayload(await this.buildApiBody(path, apiPayload))
      }
      if (DBG2) console.log("==== ChannelApi.callApi: calling fetch with init:\n", init)
      SBApiFetch(this.channelServer + '/api/v2/channel/' + this.#channelId! + path, init)
        .then((ret: any) => { resolve(ret) })
        .catch((e: Error) => {
          if (e instanceof SBError) reject(e)
          else reject("[Channel.callApi] Error: " + WrapError(e))
        })
    })
  }


} /* class SBChannelKeys */

// in principle these could be much (much) bigger; but the intent of Channels is
// lots of small 'messages', anything 'big' should be managed as shards, and the
// handles of such shards sent in messages. there are good arguments for allowing
// much larger messages, especially if ephemeral, but it's always easy to INCREASE
// max size, harder to decrease. also, storage cost of messages is MUCH higher than
// shard storage, so we don't want to inadvertently encourage large messages.
const MAX_SB_BODY_SIZE = 64 * 1024

export interface MessageOptions {
  ttl?: number,
  sendTo?: SBUserId,   // 't' in ChannelMessage
  subChannel?: string, // 'i2' in ChannelMessage, Owner only
  protocol?: SBProtocol,
  sendString?: boolean, // if true, just send the string, no other processing
  retries?: number, // optional override of defaults (0 for no retries)
}

/**
 * Every message being sent goes through the SBMessage object. Upon creation,
 * the provided contents (which can be any JS object more or les) is encrypted
 * and wrapped into a ChannelMessage object, which is what is later sent. Same
 * binary format is used for restful endpoints, websockets, and other
 * transports.
 *
 * Body should be below 32KiB. Note: for protocol choice, sbm will prioritize
 * message options over channel choice, and lacking both will default to
 * Channel.defaultProtocol (which is Protocol_ECDH).
 *
 * Note that with Protocl_ECDH, you need to make sure 'sendTo' is set, since
 * that will otherwise default to Owner. It does not support channel
 * 'broadcast'.
 *
 * The option 'sendString' allows for 'lower-level' messaging, for example for
 * special 'keep alive' messages that might be server-specific. If that is set,
 * the contents are expected to be a string, and the message will be sent as-is,
 * and features like encryption, ack/nack, ttl, routing, etc, are not available.
 */


// class SBMessage {
//   [SB_MESSAGE_SYMBOL] = true
//   sbMessageReady: Promise<SBMessage>
//   static ReadyFlag = Symbol('SBMessageReadyFlag'); // see below for '(this as any)[<class>.ReadyFlag] = false;'
//   #message?: ChannelMessage | string   // the message that's set to send
//   salt?: ArrayBuffer

//   constructor(
//     public channel: Channel,
//     public contents: any,
//     public options: MessageOptions = {}
//   ) {

//     if (options.sendString) {
//       // in this case, we don't need to do anything else, so 'sbMessageReady'
//       // should resolve to 'this' right away
//       _sb_assert(typeof contents === 'string', "SBMessage() - sendString is true, but contents is not a string")
//       this.#message = contents
//       this.sbMessageReady = new Promise<SBMessage>(async (resolve) => {
//         (this as any)[SBMessage.ReadyFlag] = true
//         resolve(this)
//       })
//     } else {
//       // there is always sbm-generated salt, whether or not the protocol needs it,
//       // or wants to create/manage it by itself
//       this.salt = crypto.getRandomValues(new Uint8Array(16)).buffer;
//       this.sbMessageReady = new Promise<SBMessage>(async (resolve) => {
//         await channel.channelReady
//         if (!this.options.protocol) this.options.protocol = channel.protocol
//         if (!this.options.protocol) this.options.protocol = Channel.defaultProtocol
//         this.#message = await sbCrypto.wrap(
//           this.contents,
//           this.channel.userId,
//           await this.options.protocol.encryptionKey(this),
//           this.salt!,
//           this.channel.signKey,
//           options);
//         (this as any)[SBMessage.ReadyFlag] = true
//         resolve(this)
//       })
//     }
//   }

//   get ready() { return this.sbMessageReady }
//   get SBMessageReadyFlag() { return (this as any)[SBMessage.ReadyFlag] }
//   @Ready get message() { return this.#message! }

//   /**
//    * SBMessage.send()
//    */
//   async send() {
//     await this.ready
//     if (DBG) console.log("SBMessage.send() - sending message:", this.message)
//     return this.channel.callApi('/send', this.message)
//   }
// } /* class SBMessage */



// // same as in servers / workers.ts
// const textLikeMimeTypes: Set<string> = new Set([
//   "text/plain", "text/html", "text/css", "text/javascript", "text/xml", "text/csv", "application/json",
//   "application/javascript", "application/xml", "application/xhtml+xml", "application/rss+xml",
//   "application/atom+xml", "image/svg+xml",
// ]);


// Every channel has a queue of messages to send; entries track not just the
// message per se, but also the 'original' resolve/reject of the 'send()'
// operation, and a binding to the 'actual' sending function (eg restful API,
// socket, whatever))
export interface EnqueuedMessage {
  msg: ChannelMessage,
  resolve: (value: any) => any,
  reject: (reason: any) => any,
  _send: (msg: ChannelMessage) => any,
  retryCount: number, // note, must be 0 or positive
}

/**
 * Channels are the core communication and 'read/write' object.
 *
 * The Channel class communicates asynchronously with the channel.
 *
 * The ChannelSocket class is a subclass of Channel, and it communicates
 * synchronously (via websockets).
 *
 * Protocol is called for every message to get the CryptoKey to use for that
 * message; if provided, then it's the default for each message. Individual
 * messages can override this. Upon sending, one or the other needs to be there.
 * The default protocol is Protocol_ECDH, which does basic sender-receipient
 * public key encryption.
 * 
 * The interface equivalent of a Channel is {@link SBChannelHandle}.
 *
 * Note that you don't need to worry about what API calls involve race
 * conditions and which don't, the library will do that for you. Like most
 * classes in SB it follows the "ready" template: objects can be used right
 * away, but they decide for themselves if they're ready or not. The SB384 state
 * is the *user* of the channel, not the channel itself; it has an Owner (also
 * SB384 object), which can be the same as the user/visitor, but that requires
 * finalizing creating the channel to find out (from the channel server).
 *
 *
 */
class Channel extends SBChannelKeys {
  channelReady: Promise<Channel>
  static ReadyFlag = Symbol('ChannelReadyFlag'); // see below for '(this as any)[Channel.ReadyFlag] = false;'
  locked?: boolean = false // ToDo: need to make sure we're tracking whenever this has changed
  // #cursor: string = ''; // last (oldest) message key seen

  static defaultProtocol: SBProtocol = new Protocol_ECDH() // default
  protocol?: SBProtocol = Channel.defaultProtocol

  visitors: Map<SBUserId, SBUserPrivateKey> = new Map()

  // all messages come through this queue; that includes 'ChannelSocket'
  // messages, but need not include all objects that inherits from 'Channel'
  sendQueue: MessageQueue<EnqueuedMessage> = new MessageQueue()

  // explicitly tracks if 'close' has been called
  isClosed = false

  // ToDo: add support in channel server
  previous: string | undefined = undefined // previous message hash

  /**
   * Channel supports creation from scratch, from a handle, or from a key.
   * With no parameters, you're creating a channel from scratch, which
   * means in particular it creates the Owner keys. The resulting object
   * can be recreated from `channel.userPrivateKey`. A from-scratch
   * Channel is an "abstract" object, a mathematical construct, it isn't
   * yet hosted anywhere. But it's guaranteed to be globally unique.
   */
  constructor() // requesting a new channel, no protocol
  /**
   * In the special case where you want to create a Channel from scratch,
   * and immediately start using it, you can directly pass a protocol and
   * mark absense of a handle with `null`.
   */
  constructor(newChannel: null, protocol: SBProtocol) // requesting a new channel
  /**
   * If you are re-createating a Channel from the Owner private key, you
   * can so so directly.
   */
  constructor(key: SBUserPrivateKey, protocol?: SBProtocol)
  /**
   * If you have a full (or partial) handle present, you can use that as well;
   * for example it might already contain the name of a specific channel server,
   * the ChannelData from that server for the channel, etc. This is also the
   * quickest way, since bootstrapping from keys requires more crypto.
   * 
   * @param handle - SBChannelHandle
   * @param protocol - SBProtocol
   */
  constructor(handle: SBChannelHandle, protocol?: SBProtocol)
  constructor(handleOrKey?: SBChannelHandle | SBUserPrivateKey | null, protocol?: SBProtocol) {
    if (DBG) console.log("Channel() constructor called with handleOrKey:\n", handleOrKey)
    if (handleOrKey === null)
      super()
    else
      super(handleOrKey);
    this.protocol = protocol ? protocol : Channel.defaultProtocol
    this
      .messageQueueManager() // fire it up
      .then(() => { if (DBG0) console.log("Channel() constructor - messageQueueManager() is DONE") })
      .catch(e => { throw e })
    this.channelReady =
      this.sbChannelKeysReady
        .then(() => {
          // owner 'userId' is same as channelId, always added
          this.visitors.set(this.channelId!, this.channelData.ownerPublicKey);
          (this as any)[Channel.ReadyFlag] = true;
          this.protocol!.setChannel(this); // if protocol needs to do something 
          return this;
        })
        .catch(e => { throw e; });
  }

  get ready() {
    _sb_assert(!this.isClosed, "[Channel] Channel is closed, blocking on'ready' will reject")
    return this.channelReady
  }
  get ChannelReadyFlag(): boolean { return (this as any)[Channel.ReadyFlag] }

  @Memoize @Ready get api() { return this } // for compatibility

  /**
   * Takes a 'ChannelMessage' format and presents it as a 'Message'. Does a
   * variety of things. If there is any issue, will return 'undefined', and you
   * should probably just ignore that message. Only requirement is you extract
   * payload before calling this (some callees needs to, or wants to, fill in
   * things in ChannelMessage)
   */
  async extractMessage(msgRaw: ChannelMessage | undefined): Promise<Message | undefined> {
    if (!msgRaw) return undefined
    if (DBG2) console.log("[extractMessage] Extracting message:", msgRaw)
    if (msgRaw instanceof ArrayBuffer) throw new SBError('[Channel.extractMessage] Message is an ArrayBuffer (did you forget extractPayload()?)')
    try {
      msgRaw = validate_ChannelMessage(msgRaw)
      if (!msgRaw) {
        if (DBG0) console.warn("++++ [extractMessage]: message is not valid (probably an error)", msgRaw)
        return undefined
      }
      const f = msgRaw.f // protocols may use 'from', so needs to be in channel visitor map
      if (!f) {
        console.error("++++ [extractMessage]: no sender userId hash in message (probably an error)")
        return undefined
      }
      if (!this.visitors.has(f)) {
        if (DBG0) console.log("++++ [extractMessage]: need to update visitor table ...")
        const visitorMap = await this.callApi('/getPubKeys')
        if (!visitorMap || !(visitorMap instanceof Map)) {
          if (DBG0) console.error("++++ [extractMessage]: visitorMap is not valid (probably an error)")
          return undefined
        }
        if (DBG0) console.log(SEP, "visitorMap:\n", visitorMap, "\n", SEP)
        for (const [k, v] of visitorMap) {
          if (DBG0) console.log("++++ [extractMessage]: adding visitor:", k, v)
          this.visitors.set(k, v)
        }
      }

      _sb_assert(this.visitors.has(f), `Cannot find sender userId hash ${f} in public key map`)
      _sb_assert(this.protocol, "Protocol not set (internal error)")
      const k = await this.protocol?.decryptionKey(this, msgRaw)
      if (!k) {
        if (DBG0 || DBG) console.error("++++ [extractMessage]: no decryption key provided by protocol (probably an error)")
        return undefined
      }
      if (!msgRaw.ts) throw new SBError(`unwrap() - no timestamp in encrypted message`)
      const { c: t, iv: iv } = msgRaw // encryptedContentsMakeBinary(o)
      _sb_assert(t, "[unwrap] No contents in encrypted message (probably an error)")
      const view = new DataView(new ArrayBuffer(8));
      view.setFloat64(0, msgRaw.ts); // ToDo: upgrade our timestamp validation to use the *256 version (which doesn't fit in 'Number')
      let bodyBuffer
      try {
        bodyBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv, additionalData: view }, k, t! as ArrayBuffer)
      } catch (e: any) {
        if (DBG0 || DBG) console.error("[extractMessage] Could not decrypt message (exception) [L2898]:", e.message)
        return undefined
      }
      if (!msgRaw._id)
        msgRaw._id = Channel.composeMessageKey(this.channelId!, msgRaw.sts!, msgRaw.i2)
      if (DBG && msgRaw.ttl !== undefined && msgRaw.ttl !== 15) console.warn(`[extractMessage] TTL->EOL missing (TTL set to ${msgRaw.ttl}) [L2762]`)
      // ToDo: verify 'cs' (sender channel server domain) is correct, if present
      const msg: Message = {
        body: extractPayload(bodyBuffer).payload,
        channelId: this.channelId!,
        sender: f,
        senderPublicKey: this.visitors.get(f)!,
        senderTimestamp: msgRaw.ts!,
        serverTimestamp: msgRaw.sts!,
        // eol: <needs to be calculated>, // ToDo: various places for TTL/EOL processing
        _id: msgRaw._id!,
      }
      if (DBG2) console.log("[Channel.extractMessage] Extracted message (before validation):", msg.body)
      return validate_Message(msg)
    } catch (e: any) {
      if (DBG0 || DBG) console.error("[extractMessage] Could not process message (exception) [L2782]:", e.message)
      return undefined
    }
  }

  /**
   * Applies 'extractMessage()' to a map of messages.
   */
  async extractMessageMap(msgMap: Map<string, ChannelMessage>): Promise<Map<string, Message>> {
    const ret = new Map<string, Message>()
    for (const [k, v] of msgMap) {
      const msg = await this.extractMessage(v)
      if (msg) {
        ret.set(k, msg)
      } else {
        if (DBG0) console.warn("[extractMessageMap] - message not valid, skipping:", k, v)

      }
    }
    return ret
  }

  // when *sending* messages, the processing of a message is divided into a
  // synchronous and an asynchronous part. 'packageMessage()' is the synchronous
  // part, and 'finalizeMessage()' is the asynchronous part. this way we enqueue
  // as fast as possible, whereas dequeueing where for instance sender timestamp
  // semantics are enforced, is done async off a queue.
  //
  // everything is a 'ChannelMessage' unless it's a low-level message of some
  // sort, which we call 'stringMessage' (eg status, server, etc)
  packageMessage(contents: any, options: MessageOptions = {}): ChannelMessage {
    if (DBG2) console.log("[Channel#packageMessage] - contents:\n", contents, "options:\n", options)
    let msg: ChannelMessage = {
      f: this.userId,
      unencryptedContents: contents,
    }
    if (options) {
      if (options.sendTo) msg.t = options.sendTo
      if (options.subChannel) throw new SBError(`wrapMessage(): subChannel not yet supported`) // would be i2
      if (options.ttl !== undefined) msg.ttl = options.ttl
      if (options.sendString) {
        // low-level messages are not encrypted or signed or validated etc
        _sb_assert(typeof contents === 'string', "[packageMessage] sendString is true, but contents is not a string")
        _sb_assert(options.ttl === undefined || options.ttl === 0, `[packageMessage] sendString implies TTL=0 (we got ${options.ttl})`)
        msg.ttl = 0
        msg.stringMessage = true
      }
    }
    if (msg.stringMessage !== true) {
      // 'proper' message, we prep for encryption, signing, etc
      msg.protocol = options.protocol ? options.protocol : this.protocol // default to channel's unless overriden
      if (msg.ttl === undefined) msg.ttl = 15; // note, '0' is valid
      // there is always pre-generated salt and nonce, whether or not the protocol needs them
      if (!msg.salt) msg.salt = crypto.getRandomValues(new Uint8Array(16)).buffer
      if (!msg.iv) msg.iv = crypto.getRandomValues(new Uint8Array(12))
    }

    // this.#message = await sbCrypto.wrap(
    //   this.contents,
    //   this.channel.userId,
    //   await this.options.protocol.encryptionKey(this),
    //   this.salt!,
    //   this.channel.signKey,
    //   options);

    // if (DBG2) console.log("[Channel#packageMessage] - packaged message:\n", msg)
    // return validate_ChannelMessage(msg)
    return msg
  }

  // this is called upon actual sending; every 'send callback' in enqueued
  // messages should call this on the ChannelMessage before sending
  async finalizeMessage(msg: ChannelMessage): Promise<ChannelMessage> {
    if (!msg.ts) msg.ts = await Snackabra.dateNow()
    _sb_assert(!(msg.stringMessage === true), "[Channel.finalizeMessage()] stringMessage is true, finalizing should not be called (internal error)")

    // msg = await sbCrypto.wrap(
    //   msg.unencryptedContents,
    //   this.userId,
    //   msg.protocol ? await msg.protocol.encryptionKey(msg) : await this.protocol.encryptionKey(msg),
    //   msg.salt!,
    //   this.signKey);

    const payload = assemblePayload(msg.unencryptedContents)
    _sb_assert(payload, "wrapMessage(): failed to assemble payload")
    _sb_assert(payload!.byteLength < MAX_SB_BODY_SIZE,
      `[Channel.finalizeMessage]: body must be smaller than ${MAX_SB_BODY_SIZE / 1024} KiB (we got ${payload!.byteLength / 1024} KiB)})`)
    msg.ts = await Snackabra.dateNow()
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, msg.ts); // ToDo: upgrade to use the *256 version
    _sb_assert(msg.protocol, "[Channel.finalizeMessage()] Protocol not set (internal error)")
    msg.c = await sbCrypto.encrypt(
      payload!,
      await msg.protocol!.encryptionKey(msg),
      { iv: msg.iv, additionalData: view }
    );
    // decryption will self-validate including timestamp signature applied to
    // encrypted contents (including aforementioned timestamp)
    msg.s = await sbCrypto.sign(this.signKey, msg.c)

    return stripChannelMessage(msg)
  }

  // actually carries out (async) send of message
  #_send(msg: ChannelMessage) {
    return new Promise(async (resolve, reject) => {
      await this.ready
      const content = msg.stringMessage === true
        ? msg.unencryptedContents
        : await this.finalizeMessage(msg)
      await this.callApi('/send', content)
        .then((rez: any) => { resolve(rez) })
        .catch((e: any) => { reject(e) });
    });
  }

  /**
   * Sends a message to the channel. The message is enqueued synchronously and sent
   * asynchronously. The return value is a Promise that resolves to the
   * server's response. If the message is a low-level message (eg status, server,
   * etc), then 'sendString' should be set to 'true'. If 'sendTo' is not provided,
   * the message will be sent to the channel owner. If 'protocol' is not provided,
   * the channel's default protocol will be used. If 'ttl' is not provided, it will
   * default to 15.
   */
  async send(contents: any, options: MessageOptions = {}): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (DBG2) console.log(SEP, "[Channel.send] called.", SEP, "contents:\n", contents)
      const msg = this.packageMessage(contents, options)
      if (DBG2) console.log(SEP, "packed message:\n", msg)
      if (DBG0 && msg.ttl !== undefined) console.log(SEP, "enqueuing message with TTL value: ", msg.ttl, SEP)
      this.sendQueue.enqueue({
        msg: msg,
        resolve: resolve,
        reject: reject,
        _send: this.#_send.bind(this),
        retryCount: options.retries !== undefined ? options.retries : 0 // default no retry
      })
      if (DBG2) console.log(SEPx)
    })
  }

  /** Authorizes/registers this channel on the provided server */
  create(storageToken: SBStorageToken, channelServer: SBChannelId = this.channelServer!): Promise<Channel> {
    if (DBG) console.log("==== Channel.create() called with storageToken:", storageToken, "and channelServer:", channelServer)
    _sb_assert(storageToken !== null, '[Channel.create] Missing storage token')
    if (channelServer) this.channelServer = channelServer;
    _sb_assert(this.channelServer, '[Channel.create] Missing channel server (neither provided nor in channelKeys)')
    return new Promise<Channel>(async (resolve, reject) => {
      await this.channelReady
      this.channelData.storageToken = validate_SBStorageToken(storageToken)
      if (DBG) console.log("Will try to create channel with channelData:", this.channelData)
      this.callApi('/budd', this.channelData)
        .then(() => {
          // in case it's different or whatevs, but only if it's confirmed
          this.channelServer = channelServer
          _sb_assert(this.channelData && this.channelData.channelId && this.userPrivateKey, 'Internal Error [L2546]')
          resolve(this)
          // resolve({
          //   [SB_CHANNEL_HANDLE_SYMBOL]: true,
          //   channelId: this.channelData.channelId!,
          //   userPrivateKey: this.userPrivateKey,
          //   // channelPrivateKey: (await new SB384(channelKeys.channelPrivateKey).ready).userPrivateKey,
          //   channelServer: this.channelServer,
          //   channelData: this.channelData
          // })
        }).catch((e) => { reject("Channel.create() failed: " + WrapError(e)) })
    })
  }

  /** Deprecated. Would take an array of channelIds and get latest time stamp from all of them  */
  getLastMessageTimes() {
    throw new SBError("Channel.getLastMessageTimes(): deprecated")
  }

  /**
   * Gets the latest known timestamp on the server. Returns it in prefix string format.
   */
  @Ready getLatestTimestamp(): Promise<string> {
    return this.callApi('/getLatestTimestamp')
  }

  async messageQueueManager() {
    if (DBG) console.log(SEP, "[messageQueueManager] Channel message queue is starting up", SEP)
    await this.ready
    if (DBG) console.log(SEP, "[messageQueueManager] ... continuing to start up", SEP)
    let keepRunning = true
    while (keepRunning) {
      await this.sendQueue.dequeue()
        .then(async (qMsg) => {
          if (DBG2) console.log(SEP, "[messageQueueManager] ... pulled 'msg' from queue:\n", qMsg?.msg.unencryptedContents, SEP)
          if (qMsg) {
            if (DBG2) console.log(SEP, "[messageQueueManager] Channel message queue is calling '_send' on message\n", qMsg.msg.unencryptedContents)
            if (DBG2) console.log(qMsg.msg)
            let latestError = null
            while (qMsg.retryCount-- >= 0) {
              if (DBG2) console.log(SEP, "[messageQueueManager] ... trying message send (", qMsg.retryCount, "retries left)\n", qMsg.msg.unencryptedContents, SEP)
              try {
                const ret = await qMsg._send(qMsg.msg)
                if (DBG2) console.log(SEP, "[messageQueueManager] Got response from registered '_send':\n", ret, SEP)
                qMsg.resolve(ret)
                break
              } catch (e) {
                if (DBG2) console.log(SEP, "[messageQueueManager] Got exception from '_send' operation, might retry", e, SEP)
                latestError = '[ERROR] ' + e
              }
            }
            // if we're here, we've run out of retries
            qMsg.reject(latestError)
          } else {
            // 'null' signals queue is empty and closed
            if (DBG2) console.log("[messageQueueManager] Channel message queue is empty and closed")
            keepRunning = false
          }
        })
        .catch((e: any) => {
          // if error contains string 'shutDown', then we close quietly, otherwise we reject
          if (e === 'shutDown') {
            if (DBG2) console.log("[messageQueueManager] Channel message queue is shutting down")
            return
          } else {
            if (DBG2) console.error("[messageQueueManager] Channel message queue is shutting down with error:", e)
            throw new SBError("[messageQueueManager] Channel message queue is shutting down with error: " + e.message)
          }
        })
      // .catch((message: EnqueuedMessage) => {
      //   if (DBG2 || DBG) console.log(SEP, "[messageQueueManager] Got exception from DEQUEUE operation:\n", JSON.stringify(message), SEP)
      //   // queue will reject (with the message) if it's closing down
      //   if (DBG2 || DBG) console.log("[messageQueueManager] Channel message queue is closing down")
      //   if (DBG2 || DBG) console.log(message)
      //   // check if 'shutDown' is in
      //   message.resolve('shutDown')
      // })
    }
  }

  // 'Channel' on a close will close and drain
  close() {
    if (DBG) console.log("[Channel.close] called (will drain queue)")
    this.isClosed = true
    return this.sendQueue.drain('shutDown')
  }

  /**
   * Returns map of message keys from the server corresponding to the request.
   * Takes a single optional parameter, which is the time stamp prefix for which
   * a set is requested. If not provided, the default is '0' (which corresponds
   * to entire history). The return data structure includes the map of message
   * keys, and the current history shard (which is 'null' if there is none).
   */
  getMessageKeys(prefix: string = '0'): Promise<{ keys: Set<string>, historyShard: SBObjectHandle }> {
    // getMessageKeys(currentMessagesLength: number = 100, paginate: boolean = false): Promise<Set<string>> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.channelReady
        _sb_assert(this.channelId, "Channel.getMessageKeys: no channel ID (?)")
        const { keys, historyShard } = (await this.callApi(
          '/getMessageKeys',
          // { currentMessagesLength: currentMessagesLength, cursor: paginate ? this.#cursor : undefined })
          { prefix: prefix })) as { keys: Set<string>, historyShard: SBObjectHandle }
        if (DBG) console.log("getMessageKeys\n", keys)
        if (!keys || keys.size === 0)
          console.warn("[Channel.getMessageKeys] Warning: no messages (empty/null response); not an error but perhaps unexpected?")
        // update: we now allow 512 'keys' handled at a time, but only 128 '(key,value)' pairs eg contents;
        // so this warning doesn't quite make sense (since things like ChannelStream maximize requests)
        // if (keys.size > (Snackabra.MAX_MESSAGE_REQUEST_SIZE + 8)) // update to transition to DeepHistory
        //   console.warn(SEP, `[Channel.getMessageKeys] Warning: ${keys.size} keys returned, that's over the ${Snackabra.MAX_MESSAGE_SET_SIZE} limit - you will NOT be able to request this set directly.`, SEP)
        resolve({ keys, historyShard })
      } catch (e) {
        const msg = `[Channel.getMessageKeys] Error in getting message keys (offline?) ('${e}')`
        if (DBG0) console.warn(msg)
        reject(msg)
      }
    });
  }

  // get raw set of messages from the server
  getRawMessageMap(messageKeys: Set<string>): Promise<Map<string, ArrayBuffer>> {
    if (DBG) console.log("[getRawMessageMap] called with messageKeys:", messageKeys)
    if (messageKeys.size === 0) throw new SBError("[getRawMessageMap] no message keys provided")
    if (messageKeys.size > (Snackabra.MAX_MESSAGE_REQUEST_SIZE))
      throw new SBError(`[getRawMessageMap] too many messages requested at once (max ${Snackabra.MAX_MESSAGE_REQUEST_SIZE}, ${messageKeys.size} requested)`)
    return new Promise(async (resolve, _reject) => {
      await this.channelReady
      _sb_assert(this.channelId, "[getRawMessageMap] no channel ID (?)")
      const messagePayloads: Map<string, ArrayBuffer> = await this.callApi('/getMessages', messageKeys)
      _sb_assert(messagePayloads, "[getRawMessageMap] no messages (empty/null response)")
      if (DBG2) console.log(SEP, SEP, "[getRawMessageMap] - here are the raw ones\n", messagePayloads, SEP, SEP)
      resolve(messagePayloads)
    });
  }

  /**
   * Main function for getting a chunk of messages from the server.
   */
  getMessageMap(messageKeys: Set<string>): Promise<Map<string, Message>> {
    if (messageKeys.size > Snackabra.MAX_MESSAGE_REQUEST_SIZE)
      throw new SBError(`[getMessageMap] too many message keys provided (max ${Snackabra.MAX_MESSAGE_REQUEST_SIZE}, ${messageKeys.size} provided)`)
    if (DBG) console.log("Channel.getDecryptedMessages() called with messageKeys:", messageKeys)
    if (messageKeys.size === 0) throw new SBError("[getMessageMap] no message keys provided")
    return new Promise(async (resolve, _reject) => {
      await this.channelReady
      const messagePayloads: Map<string, ArrayBuffer> = await this.callApi('/getMessages', messageKeys)
      // we extract payload, validate (at ChannelMessage level), then call extractMessageMap() to decrypt
      const messages = new Map<string, ChannelMessage>()
      for (const [k, v] of messagePayloads) {
        try {
          messages.set(k, validate_ChannelMessage(extractPayload(v).payload))
        } catch (e) {
          if (DBG) console.warn(SEP, "[getMessageMap] Failed extract and/or to validate message:", SEP, v, SEP, e, SEP)
        }
      }
      resolve(await this.extractMessageMap(messages))
    });
  }

  /**
   * Returns a DeepHistory object corresponding to the channel. Note:
   * this will (live) instantiate this object at the time of calling
   * this function. The returned object is not kept in 'sync' with the
   * server in any manner. This allows calling traverse and similar
   * operations on it, repeatedly. Calling this function multiple times
   * is, in fact, not a lot of overhead, given the nature of the history
   * tree structure (eg it's mostly immutable).
   */
  async getHistory(): Promise<ClientDeepHistory> {
    await this.channelReady
    _sb_assert(this.channelId, "Channel.getHistory: no channel ID (?)")
    const data = await this.callApi('/getHistory') // as MessageHistoryDirectory
    console.log(SEP, "getHistory result:\n", JSON.stringify(data, null, 2), SEP)
    const h = new ClientDeepHistory(data, this)
    return h
  }

  // @Ready async send(msg: any, options?: MessageOptions): Promise<string> {
  //   _sb_assert(!(msg instanceof SBMessage), "[Channel.send] msg is already an SBMessage")
  //   return (new SBMessage(this, msg, options)).send()

  //   // const sbm: SBMessage = msg instanceof SBMessage ? msg : new SBMessage(this, msg)
  //   // const sbm: SBMessage = new SBMessage(this, msg, options)
  //   // await sbm.ready // message needs to be ready
  //   // return this.callApi('/send', sbm.message)
  // }

  /**
   * Sets 'page' as the Channel's 'page' response. If type is provided, it will
   * be used as the 'Content-Type' header in the HTTP request when retrieved;
   * also, if the type is 'text-like', it will be recoded to UTF-8 before
   * delivery. Prefix indicates the smallest number of acceptable characters in
   * the link. Default is 12, shortest is 6. 
   */
  @Ready @Owner setPage(options: { page: any, prefix?: number, type?: string }) {
    var { page, prefix, type } = options
    _sb_assert(page, "Channel.setPage: no page (contents) provided")
    prefix = prefix || 12
    if (prefix < 6) throw new SBError("Channel.setPage: prefix must be at least 6 characters")
    type = type || 'sb384payloadV3'
    return this.callApi('/setPage', {
      page: page,
      type: type,
      prefix: prefix,
    })
  }

  /**
   * Note that 'getPage' can be done without any authentication, in which
   * case have a look at Snackabra.getPage(). If however the Page is locked,
   * you need to access it through this ChannelApi entry point.
   * 
   * But conversely, we don't need a prefix or anything else, since
   * we know the channel. So .. we can just shoot this off.
   * 
   * Note that a 'Page' might be mime-typed, in which case you should
   * use a regular fetch() call and handle results accordingly. This
   * function is for 'sb384payloadV3' only.
   */
  @Ready async getPage() {
    const prefix = this.hashB32 // we know the full prefix
    if (DBG) console.log(`==== ChannelApi.getPage: calling fetch with: ${prefix}`)
    const page = await sbFetch(this.channelServer + '/api/v2/page/' + prefix)
      .catch((e) => { throw new SBError(`[Channel.getPage] fetch failed: ${e}`) })
    const contentType = page.headers.get('content-type')
    if (contentType !== 'sb384payloadV3')
      throw new SBError("[Channel.getPage] Can only handle 'sb384payloadV3' content type, use 'fetch()'")
    const buf = await page.arrayBuffer()
    return extractPayload(buf).payload
    // return extractPayload(await SBApiFetch(this.channelServer + '/api/v2/page/' + prefix)).payload
  }

  @Ready @Owner acceptVisitor(userId: SBUserId) { return this.callApi('/acceptVisitor', { userId: userId }) }
  @Ready @Owner getCapacity() { return (this.callApi('/getCapacity')) }

  // admin data, and some related convenience functions
  @Ready @Owner getAdminData() { return this.callApi('/getAdminData') as Promise<ChannelAdminData> }

  // convenience functions wrapping getAdminData()
  @Ready @Owner getMother() {
    return this.getAdminData().then((adminData) => {
      return adminData.motherChannel
    });
  }
  @Ready @Owner isLocked() {
    return this.getAdminData().then((adminData) => {
      return adminData.locked
    });
  }

  @Ready @Owner lock(): Promise<{ success: boolean }> { return this.callApi('/lockChannel') }
  @Ready @Owner updateCapacity(capacity: number) { return this.callApi('/setCapacity', { capacity: capacity }) }

  // this does not change so we can memoize
  @Ready @Memoize getChannelKeys(): Promise<SBChannelData> { return this.callApi('/getChannelKeys') }
  @Ready getPubKeys(): Promise<Map<SBUserId, SBUserPublicKey>> { return this.callApi('/getPubKeys') }
  @Ready getStorageLimit() { return (this.callApi('/getStorageLimit')) }

  @Ready async getStorageToken(size: number) { return validate_SBStorageToken(await this.callApi('/getStorageToken', { size: size })) }

  /**
   * "budd" will spin a channel off an existing one that you own,
   * or transfer storage budget to an existing channel.
   * 
   * You need to provide one of the following combinations of info:
   * 
   * - nothing: creates new channel with minmal permitted budget
   * - just storage amount: creates new channel with that amount, returns new channel
   * - just a target channel: moves a chunk of storage to that channel (see below)
   * - target channel and storage amount: moves that amount to that channel
   * - keys and storage amount: creates new channel with those keys and that storage amount
   * 
   * If you want to budd into a channel with specific keys, you'll need to
   * create a new set of keys (SBChannelKeys) and pass the SBChannelData from that.
   * 
   * It returns a complete SBChannelHandle, which will include the private key
   * 
   * Another way to remember the above: all combinations are valid except
   * both a target channel and assigning keys.
   * 
   * In terms of 'keys', you can provide a JsonWebKey, or a SBUserPrivateKey,
   * or a channel handle. JWK is there for backwards compatibility.
   * 
   * Note: if you're specifying the target channel, then the return values will
   * not include the private key (that return value will be empty).
   * 
   * Note: the owner of the target channel will get a message that you budded
   * into their channel, which includes the channelId it was budded from.
   * 
   * Note: a negative storage amount is interpreted as 'leave that much behind'.
   * 
   * Any indications that your parameters are wrong will result in a rejected
   * promise. This includes if you ask for more storage than is there, or if
   * your negative value is more than the storage budget that's there. 
   * 
   * If the budget and target channels are the same, it will throw.
   * 
   * If you omit budget size, it will use the smallest allowed new channel
   * storage (currently 32 MB). This will happens regardless of if you are
   * creating a new channel, or 'depositing'.
   * 
   * If you give the size value of 'Infinity', then all the storage available
   * on the source channel will be transferred to the target channel
   * (aka 'plunder').
   * 
   * On the server side, budd is in two steps, first extracting the storage
   * budget from the mother channel, and then creating or transferring the
   * storage budget to the target channel. 
   * 
   */
  @Ready @Owner budd(options?: { targetChannel?: SBChannelHandle, size?: number }): Promise<SBChannelHandle> {
    return new Promise<SBChannelHandle>(async (resolve, reject) => {
      // in general we code a bit conservatively in budd(), to make sure we're returning a valid channel
      var { targetChannel, size } = options || {}
      if (!targetChannel) {
        targetChannel = (await new Channel().ready).handle
        if (DBG) console.log("\n", SEP, "[budd()]: no target channel provided, using new channel:\n", SEP, targetChannel, "\n", SEP)
      } else if (this.channelId === targetChannel.channelId) {
        reject(new Error("[budd()]: source and target channels are the same, probably an error")); return
      }
      if (!size) size = NEW_CHANNEL_MINIMUM_BUDGET // if nothing provided, goes with 'minimum'
      if (size !== Infinity && Math.abs(size) > await this.getStorageLimit()) {
        // server will of course enforce this but it's convenient to catch it earlier
        reject(new Error(`[budd()]: storage amount (${size}) is more than current storage limit`)); return
      }
      const targetChannelData = targetChannel.channelData
      if (!targetChannelData) {
        reject(new Error(`[budd()]: target channel has no channel data, probably an error`)); return
      }
      try {
        targetChannelData.storageToken = await this.getStorageToken(size);
        if (DBG) console.log(`[budd()]: requested ${size}, got storage token:`, targetChannelData.storageToken)
        // const newChannelData = validate_SBChannelData(await this.callApi('/budd', targetChannelData))
        const targetChannelApi = await new Channel(targetChannel).ready
        if (!targetChannelApi.channelServer) targetChannelApi.channelServer = this.channelServer
        const newChannelData = validate_SBChannelData(await targetChannelApi.callApi('/budd', targetChannelData))
        if (targetChannel.channelId !== newChannelData.channelId) {
          console.warn("[budd()]: target channel ID changed, should not happen, error somewhere\n", SEP)
          console.warn("targetChannel:", targetChannel, "\n", SEP)
          console.warn("newChannelData:", newChannelData, "\n", SEP)
          reject(new Error(`[budd()]: target channel ID changed, should not happen, error somewhere`)); return
        }
        if (!newChannelData.storageToken)
          console.warn("[budd()]: target channel has no storage token, possibly an error, should be returned from server")
        const newHandle = {
          [SB_CHANNEL_HANDLE_SYMBOL]: true,
          channelId: newChannelData.channelId,
          userPrivateKey: targetChannel.userPrivateKey,
          channelServer: this.channelServer,
          channelData: newChannelData
        }
        if (DBG) console.log("[budd()]: success, newHandle:", newHandle)
        resolve(validate_SBChannelHandle(newHandle))
      } catch (e) {
        reject('[budd] Could not get storage token from server, are you sure about the size?'); return
      }
    });
  }

  /* Some utility functions that are perhaps most logically associated with 'Channel.x' */

  /**
   * Returns the 'lowest' possible timestamp.
   */
  static LOWEST_TIMESTAMP = '0'.repeat(26);

  /**
   * Returns the 'lowest' possible timestamp.
   */
  static HIGHEST_TIMESTAMP = '3'.repeat(26);

  /**
   * Converts from timestamp to 'base 4' string used in message IDs.
   * 
   * Time stamps are monotonically increasing. We enforce that they must be
   * different. Stored as a string of [0-3] to facilitate prefix searches (within
   * 4x time ranges). We append "0000" for future needs, for example if we need
   * above 1000 messages per second. Can represent epoch timestamps for the next
   * 400+ years. Currently the appended "0000" is stripped/ignored.
   */
  static timestampToBase4String(tsNum: number) {
    return tsNum.toString(4).padStart(22, "0") + "0000" // total length 26
  }

  static base4stringToDate(tsStr: string) {
    const ts = parseInt(tsStr.slice(0, -4), 4)
    return new Date(ts).toISOString()
  }

  /**
   * Will take values (or keys), and return the lowest and highest values;
   * empty data is fine and will return '[]' (falsey).
   */
  static getLexicalExtremes<T extends number | string>(set: Set<T> | Array<T> | Map<T, any>): [T, T] | [] {
    if (!(set instanceof Set || set instanceof Array || set instanceof Map))
      throw new SBError("[getLexicalExtremes] Paramater must be a Set, Array, or Map");
    const arr = set instanceof Array ? set : Array.from(set.keys()); // this is legit, which is cute
    if (arr.length === 0) return [];
    let [min, max] = [arr[0], arr[0]] as [T, T];
    for (const value of arr) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return [min, max];
  }

  /**
   * Given a set of (full) keys, reviews all the timestamp prefixes, and returns
   * the shortest prefix that would range all the keys in the set.
   */
  static messageKeySetToPrefix = (keys: Set<string>): string => {
    if (keys.size === 0) return '0'; // special case (everything)
    const [lowest, highest] = Channel.getLexicalExtremes(keys);
    _sb_assert(lowest && highest, "[timestampLongestPrefix]: no lowest or highest (internal error?)")
    const { timestamp: s1 } = Channel.deComposeMessageKey(lowest!)
    const { timestamp: s2 } = Channel.deComposeMessageKey(highest!)
    let i = 0;
    while (i < s1.length && i < s2.length && s1[i] === s2[i]) i++;
    return s1.substring(0, i);
  }

  static timestampLongestPrefix = (s1: string, s2: string): string => {
    if (s1 && s2 && typeof s1 === 'string' && typeof s2 === 'string' && s1.length === 26 && s2.length === 26) {
      let i = 0;
      while (i < s1.length && i < s2.length && s1[i] === s2[i]) i++;
      return s1.substring(0, i);
    } else throw new SBError(`[timestampLongestPrefix]: invalid input:\n '${s1}' or '${s2}'`);
  }

  static timestampRegex = /^[0-3]{26}$/;

  /**
   * Reverse of timestampToBase4String. Strict about the format
   * (needs to be `[0-3]{26}`), returns 0 if there's any issue.
   */
  static base4StringToTimestamp(tsStr: string) {
    if (!tsStr || typeof tsStr !== 'string' || tsStr.length !== 26 || !Channel.timestampRegex.test(tsStr)) return 0
    return parseInt(tsStr.slice(0, -4), 4);
  }

  /*
  * Similar to {@link base4StringToTimestamp}, but returns an (ISO) formatted
  * date string. Returns '' if there's an issue with the timestamp. Note that it
  * rigidly expects a 26 character timestamp (prefix) string.
  */
  static base4StringToDate(tsStr: string) {
    const ts: number = Channel.base4StringToTimestamp(tsStr)
    if (ts) return new Date(ts).toISOString()
    else return ''
  }

  /**
   * Teases apart the three elements of a channel message key. Note, this does not
   * throw if there's an issue, it just sets all the parts to '', which should
   * never occur. Up to you if you want to run with that result or assert on it.
   * Strict about the format (defined as `[a-zA-Z0-9]{43}_[_a-zA-Z0-9]{4}_[0-3]{26}`).
   * 
   * Note that '____' is the default subchannel.
   */
  static deComposeMessageKey(key: string): { channelId: string, i2: string, timestamp: string } {
    const regex = /^([a-zA-Z0-9]{43})_([_a-zA-Z0-9]{4})_([0-3]{26})$/;
    const match = key.match(regex);
    if (match && match.length >= 4)
      // return [match![1]!, match![2]!, match![3]!]
      return { channelId: match[1], i2: match[2], timestamp: match[3] }
    else return { channelId: '', i2: '', timestamp: '' }
  }

  /**
   * Creates a 'message key' from constituent parts.
   */
  static composeMessageKey(channelId: SBChannelId, timestamp: number, subChannel: string = '____',) {
    return `${channelId}_${subChannel ?? '____'}_${Channel.timestampToBase4String(timestamp)}`
  }

} /* class Channel */

// time we wait for a send() not to do anything before we interpret it as an
// error and reset, and time we wait when creating a websocket before we
// interpret the attempt as failed, and finally number of times to retry
// before giving up on a message (each retry will reset the socket)
const WEBSOCKET_MESSAGE_TIMEOUT = 20000 // ms   // ... testing resilience
const WEBSOCKET_SETUP_TIMEOUT = 2000 // ms
const WEBSOCKET_RETRY_COUNT = 3

// time in ms between 'ping' messages; in other words, on average we are about
// half of this behind IF the socket has hibernated. if the edge server stack
// does not support hibernation, then the channel server will respond instead.
const WEBSOCKET_PING_INTERVAL = 1000

/**
   * ChannelSocket extends Channel. Has same basic functionality as Channel, but
   * is synchronous and uses websockets, eg lower latency and higher throughput.
   *
   * You send by calling channel.send(msg: SBMessage | string), i.e. you can
   * send a quick string.
   *
   * You can set your message handler upon creation, or later by using
   * channel.onMessage = (m: Message) => { ... }.
   *
   * You don't need to worry about managing resources, like closing it, or
   * checking if it's open. It will close based on server behavior, eg it's up
   * to the server to close the connection based on inactivity. The
   * ChannelSocket will re-open if you try to send against a closed connection.
   *
   * Messages are delivered as type Message if it could be parsed and decrypted;
   * it can also be a string (typically if a low-level server message, in which
   * case it will just be forwarded to the message handler).
   *
   * It also handles a simple ack/nack mechanism with the server transparently.
   *
   * Be aware that if ChannelSocket doesn't know how to handle a certain
   * message, it will generally drop it. 
   *
 */
class ChannelSocket extends Channel {
  channelSocketReady: Promise<ChannelSocket>
  static ReadyFlag = Symbol('ChannelSocketReadyFlag'); // see below for '(this as any)[ChannelSocket.ReadyFlag] = false;'

  // #myChannelSocketID = Symbol()

  #ws?: WSProtocolOptions
  #socketServer: string

  onMessage = (_m: Message | string): void => { _sb_assert(false, "[ChannelSocket] NO MESSAGE HANDLER"); }
  #ack: Map<string, (value: string | PromiseLike<string>) => void> = new Map()
  #ackTimer: Map<string, number> = new Map()
  #traceSocket: boolean = false // should not be true in production

  // last timestamp we've seen
  lastTimestampPrefix: string = '0'.repeat(26);
  #pingInterval: number = 0;

  // // moved to snackabra
  // #latestPing = Date.now(); // updated by 'ping'
  // #online = true; // updated by 'ping'

  #errorPromise?: Promise<ChannelSocket>;
  #rejectError?: (reason?: any) => void;

  constructor(
    handleOrKey: SBChannelHandle | SBUserPrivateKey,
    onMessage: (m: Message | string) => void,
    protocol?: SBProtocol
  ) {
    _sb_assert(onMessage, '[ChannelSocket] constructor: no onMessage handler provided')

    if (typeof handleOrKey === 'string') {
      super(handleOrKey as SBUserPrivateKey, protocol) // we let super deal with it
    } else {
      const handle = validate_SBChannelHandle(handleOrKey)
      super(handle, protocol)
      if (handle.channelServer)
        this.channelServer = handle.channelServer // handle choice will override
    }

    // if for some reason we still don't have this, go with default
    if (!this.channelServer) this.channelServer = Snackabra.defaultChannelServer // might throw

      ; (this as any)[ChannelSocket.ReadyFlag] = false;
    this.#socketServer = this.channelServer.replace(/^http/, 'ws')
    this.onMessage = onMessage
    this.channelSocketReady = this.#channelSocketReadyFactory()
  }

  #setupPing() {
    if (DBG0) console.log(SEP, "[ChannelSocket] Setting up 'ping' messages ... ", SEP)

    // we regularly check how long it's been since we heard from the server;
    // every channelsocket does this
    this.#pingInterval = setInterval(() => {
      if (this.isClosed) {
        console.error("[ChannelSocket] we are closed, removing ping interval")
        clearInterval(this.#pingInterval)
        return // close down quietly
      }
      Snackabra.haveNotHeardFromServer()
    }, WEBSOCKET_PING_INTERVAL * 0.5);

    // and we fire off the first one
    if (this.#ws && this.#ws.websocket && this.#ws.websocket.readyState === 1) {
      if (DBG0) console.log(SEP, "[ChannelSocket] Sending first 'ping' (timestamp request) message.", SEP)
      try {
        this.#ws.websocket.send('ping')
      } catch (e) {
        console.error("[ChannelSocket] Failed to send first (hibernation) 'ping' message, Internal Error [L3986]")
      }
    } else {
      console.error("[ChannelSocket] websocket not ready (?), not sending first 'ping', hibernation disabled")
    }

    // const pingTimer = setInterval(() => {
    //   if (this.isClosed) return // close down quietly
    //   if (DBG2) console.log(SEP, "[ChannelSocket] Sending 'ping' (timestamp request) message.", SEP)
    //   try {
    //     this.#ws!.websocket!.send('ping')
    //     // set a timer that is 0.8 * the interval, to time out if this doesn't respond
    //     setTimeout(() => {
    //       if (this.isClosed) return // close down quietly
    //       if (DBG) console.warn("[ChannelSocket] 'ping' message timed out")
    //       this.errorState = true;
    //     }, interval * 0.8);
    //   } catch (e) {
    //     if (this.isClosed) {
    //       if (DBG2) console.log("[ChannelSocket] we are closed, removing interval")
    //       clearInterval(pingTimer)
    //     } else {
    //       if (DBG) console.warn("[ChannelStream.startSocket] Failed to send 'ping' message:", e)
    //       this.errorState = true;
    //     }
    //   }
    // }, interval);
  }

  async #tryReconnect() {
    if (DBG0) console.log(SEP, "[ChannelSocket] Trying to re-establish connection ...", SEP)
    // first we wait a little bit, then a quick retry
    await new Promise((resolve) => setTimeout(resolve, 50))
    this.channelSocketReady = this
      .#channelSocketReadyFactory()
      .catch((e) => {
        console.error(SEP, "[ChannelSocket] Could not re-establish connection, should queue up\n", e, SEP);
        return this
      });

  }

  // if we lose the channel, we decide what to do here; only called if we at some point were
  // 'ready' (connected) and then later disconnected for any reason (other than explicit 'close()')
  async #handleDisconnect(reason: string) {
    console.warn(`[ChannelSocket] Lost connection to server, will try to reset.\nReason (if any): '${reason}'`);
    (this as any)[ChannelSocket.ReadyFlag] = false;
    Snackabra.removeChannelSocket(this)
    Snackabra.on('online', this.#tryReconnect)
  }

  #channelSocketReadyFactory() {
    this.#errorPromise = new Promise<ChannelSocket>((_, reject) => {
      if (DBG2) console.log("Error promise initialized")
      this.#rejectError = reject;
    });
    const returnPromise = Promise.race([
      this.#errorPromise,
      new Promise<ChannelSocket>(async (resolve, _) => {
        if (DBG) console.log("++++ STARTED ChannelSocket.readyPromise()")
        await this.sbChannelKeysReady // because we need the getter for channelId
        const url = this.#socketServer + '/api/v2/channel/' + this.channelId + '/websocket'
        this.#ws = {
          url: url,
          ready: false,
          closed: false,
          timeout: WEBSOCKET_MESSAGE_TIMEOUT
        }
        if (!this.#ws.websocket || this.#ws.websocket.readyState === 3 || this.#ws.websocket.readyState === 2) {
          // either it's new, or it's closed, or it's in the process of closing
          if (this.#ws.websocket) {
            console.warn("[ChannelSocket] websocket is in a bad state, closing it ... will await")
            await closeSocket(this.#ws.websocket)
            Snackabra.addChannelSocket(this)
          }
          // a WebSocket connection is always a 'GET', and there's no way to provide a body
          const apiBodyBuf = assemblePayload(await this.buildApiBody(url))
          _sb_assert(apiBodyBuf, "Internal Error [L3598]")
          try {
            // here's the only spot in the code where we actually open a websocket:
            this.#ws.websocket = new WebSocket(url + "?apiBody=" + arrayBufferToBase62(apiBodyBuf!))
            Snackabra.addChannelSocket(this)
          } catch (e) {
            const msg = "[ChannelSocket] Could not open websocket: " + e
            if (DBG0) console.error(msg)
            this.#rejectError!(msg)
            return // don't do anything else
          }
        }

        if (DBG) console.log(SEP, "++++ readyPromise() - setting up websocket message listener", SEP);

        const thisWsWebsocket = this.#ws.websocket
        const initialListener = async (e: MessageEvent<any>) => {
          if (!e.data) {
            const msg = "[ChannelSocket] received empty message (should be a 'ready' message)";
            console.error(msg);
            this.#rejectError!(msg)
          }
          let serverReadyMessage: { ready: boolean, messageCount: number, latestTimestamp: string } | null = null

          if (typeof e.data === 'string') {
            serverReadyMessage = jsonParseWrapper(e.data, "L3909")
            // const json = jsonParseWrapper(e.data, "L3909")
            // if (json && json.hasOwnProperty('ready')) {
            //   if (DBG0 || DBG) console.log("++++ readyPromise() - received ready message, switching to main message processor:\n", e.data)
            //   if (json.hasOwnProperty('latestTimestamp')) {
            //     this.lastTimestampPrefix = json.latestTimestamp
            //     if (DBG2) console.log("++++ readyPromise() - received latestTimestamp:", this.lastTimestampPrefix)
            //   } else console.warn("[ChannelSocket] received 'ready' message without 'latestTimestamp'")
            //   thisWsWebsocket.removeEventListener('message', initialListener);
            //   thisWsWebsocket.addEventListener('message', this.#processMessage);
            //   this.#setupPing();
            //   (this as any)[ChannelSocket.ReadyFlag] = true;
            //   resolve(this);
            // } else {
            //   reject("[ChannelSocket] received something other than 'ready' as first message:\n" + JSON.stringify(e.data));
            // }
          } else if (e.data instanceof ArrayBuffer) {
            serverReadyMessage = extractPayload(e.data).payload
          } else if (e.data instanceof Blob) {
            serverReadyMessage = extractPayload(await e.data.arrayBuffer()).payload
          } else {
            _sb_exception("L3987", "[ChannelSocket] received something other than string or ArrayBuffer")
          }
          if (serverReadyMessage) {
            if (serverReadyMessage.ready) {
              if (DBG0 || DBG) console.log("++++ readyPromise() - received ready message, switching to main message processor:\n", serverReadyMessage)
              if (serverReadyMessage.latestTimestamp) {
                this.lastTimestampPrefix = serverReadyMessage.latestTimestamp
                if (DBG2) console.log("++++ readyPromise() - received latestTimestamp:", this.lastTimestampPrefix)
              } else console.warn("[ChannelSocket] received 'ready' message without 'latestTimestamp'")
              thisWsWebsocket.removeEventListener('message', initialListener);
              thisWsWebsocket.addEventListener('message', this.#processMessage);
              this.#setupPing();
              (this as any)[ChannelSocket.ReadyFlag] = true;
              resolve(this);
            } else {
              const msg = "[ChannelSocket] received something other than 'ready' as first message:\n" + JSON.stringify(e.data);
              if ((this as any)[ChannelSocket.ReadyFlag] === true) console.warn(msg);
              else this.#rejectError!(msg);
            }
          } else {
            const msg = "[ChannelSocket] received empty message, or could not parse it (should be a 'ready' message)"
            if ((this as any)[ChannelSocket.ReadyFlag] === true) console.warn(msg);
            else this.#rejectError!(msg);
          }
        };

        this.#ws.websocket.addEventListener('message', initialListener);

        // if (DBG) console.log(SEP,"++++ readyPromise() - setting up websocket message listener", SEP)
        // this.#ws.websocket.addEventListener('message',
        //   (e: MessageEvent<any>) => {
        //     if (e.data && typeof e.data === 'string' && jsonParseWrapper(e.data, "L3618")?.hasOwnProperty('ready')) {
        //       // switch to main message processor
        //       this.#ws!.websocket!.addEventListener('message', this.#processMessage)
        //       // we're ready
        //       if (DBG) console.log(SEP, "Received ready", SEP)
        //       ; (this as any)[ChannelSocket.ReadyFlag] = true;
        //       resolve(this)
        //     } else {
        //       if (DBG) console.log(SEP, "Received non-ready:\n", e.data, "\n", SEP)
        //       reject("[ChannelSocket] received something other than 'ready' as first message")
        //     }
        //   }
        // )

        // let us set a timeout to catch and make sure this thing resoles within 10 seconds
        let resolveTimeout: number | undefined = setTimeout(() => {
          if (!(this as any)[ChannelSocket.ReadyFlag]) {
            const msg = "[ChannelSocket] Socket not resolving after waiting, fatal."
            console.warn(msg);
            this.#rejectError!(msg)
          } else {
            if (DBG2) console.log("[ChannelSocket] resolved correctly", this)
          }
        }, WEBSOCKET_SETUP_TIMEOUT);

        this.#ws.websocket.addEventListener('open', async () => {
          this.#ws!.closed = false
          if (resolveTimeout) { clearTimeout(resolveTimeout); resolveTimeout = undefined; }
          // need to make sure parent is ready (and has keys)
          await this.ready
          if (DBG) console.log("++++++++ readyPromise() sending init")
          // auth is done on setup, it's not needed for the 'ready' signal
          // this.#ws!.websocket!.send(assemblePayload({ ready: true })!)
          this.#ws!.websocket!.send('ready')
          if (DBG) console.log("++++++++ readyPromise() ... no immediate errors for init")
        });

        this.#ws.websocket.addEventListener('close', (e: CloseEvent) => {
          this.#ws!.closed = true
          if (e.wasClean) {
            if (e.reason.includes("does not have an owner")) {
              const msg = `[ChannelSocket] No such channel on this server (${this.channelServer})`
              if ((this as any)[ChannelSocket.ReadyFlag] === true)
                throw new SBError(msg + ' plus we are ready? (L4130)')
              this.#rejectError!(msg)
            }
            else console.log(`[ChannelSocket] Closed (cleanly).\nReason (if any): '${e.reason}'.`)
          } else {
            console.warn(`[ChannelSocket] Closed (but not cleanly) [L4137]\nReason (if any): '${e.reason}'. Server: '${this.channelServer}'`)
          }
          if ((this as any)[ChannelSocket.ReadyFlag] === true) {
            this.#handleDisconnect("Channel was ready, but reporting being closed [L4140]")
          } else {
            const msg = "[ChannelSocket] Closed before ready (?) [L4142]"
            console.error(msg)
            this.#rejectError!(msg)
          }
        });

        this.#ws.websocket.addEventListener('error', (e) => {
          this.#ws!.closed = true
          if ((this as any)[ChannelSocket.ReadyFlag] === true) {
            // this.#handleDisconnect("Error on trying to open socket [L4152]")
            const msg = "[ChannelSocket] Socket closed [L4152]\nEvent message (if any): '" + (e as any).message + "'";
            console.error(msg)
            this.#rejectError!(msg)
          } else {
            const msg = `[ChannelSocket] Failed to connect, or errored out immediately [L4153].\nError (if any): '${e}'`
            console.error(msg)
            this.#rejectError!(msg)
          }
        });
      })
    ]);
    if (DBG2) console.log("Socket ready factory done, error promise:", this.#rejectError)
    return returnPromise
    // this.#errorPromise.catch((e) => {
    //   console.log(SEP, "[ChannelSocket] Error in setup:", e, SEP)
    //   this.#handleDisconnect("Error in setup [L4162]: " + e)
    // })
  }

  #processMessage = async (e: MessageEvent<any>) => {
    _sb_assert(!this.errorState, "[ChannelSocket] in error state (Internal Error L4018)")
    const msg = e.data
    if (DBG2) console.log(SEP, "[ChannelSocket] Received socket message:\n", msg, SEP)
    var message: ChannelMessage | null = null
    _sb_assert(msg, "[ChannelSocket] received empty message")
    Snackabra.heardFromServer(); // do this on every message to track online status

    // string [0-3]* are magical, they imply a 'latest' time stamp prefix from server
    if (typeof msg === 'string' && Channel.timestampRegex.test(msg)) {
      if (DBG2) console.log("[ChannelSocket] Received 'latestTimestamp' message:", msg)
      Snackabra.heardFromServer()
      if (msg > this.lastTimestampPrefix) {
        // if this is *newer* than we were last at, we ping back *our* latest
        // string; if everything after that is still buffered by the server, it'll
        // respond with them, otherwise the server will close the websocket
        if (DBG0) console.log(SEP, "[ChannelSocket] Received newer timestamp, will request those messages", SEP)
        this.#ws!.websocket!.send(this.lastTimestampPrefix)
      }
      // we only have one 'ping' outstanding at a time
      setTimeout(() => {
        if (this.#ws && !this.#ws.closed && this.#ws.websocket?.readyState === 1) {
          if (DBG2) console.log("[ChannelSocket] Sending 'ping' (timestamp request) message.")
          try {
            this.#ws!.websocket!.send('ping')
          } catch (_e) {
            if (DBG0) console.warn("[ChannelSocket] Failed to send 'ping' message, ignoring");
          }
        } else if (DBG0) console.log("[ChannelSocket] Shutting down ping message timeout")
      }, WEBSOCKET_PING_INTERVAL)
      // these messages are absorbed
      return;
    }

    if (typeof msg === 'string') {
      // could be a simple JSON message, or a low-level server message (eg just a string)
      const _message: any = jsonOrString(msg)
      if (!_message) _sb_exception("L3287", "[ChannelSocket] Cannot parse message: " + msg)
      else {
        // currently, a timestamp is the only 'pure' string that should arrive
        if (DBG0 || DBG) console.log("[ChannelSocket] Received unrecognized 'string' message, will discard:\n", _message)
        this.#ws!.websocket!.send(assemblePayload({ error: `Cannot parse 'string' message (''${_message})` })!);
        return;
      }
    } else if (msg instanceof ArrayBuffer) {
      message = extractPayload(msg).payload
    } else if (msg instanceof Blob) {
      message = extractPayload(await msg.arrayBuffer()).payload
    } else {
      this.#ws!.websocket!.send(assemblePayload({ error: `Received unknown 'type' of message (??)` })!);
      return;
    }
    _sb_assert(message, "[ChannelSocket] cannot extract message")

    // we catch server-specific messages here, and then pass the rest to the user
    if (message!.ready) {
      if (DBG0 || DBG) console.log("++++++++ #processMessage: received ready message\n", message)
      return
    }
    if (message!.error) {
      console.error("++++++++ #processMessage: received error message\n", message)
      return
    }

    message = validate_ChannelMessage(message!) // throws if there's an issue
    if (DBG2) console.log(SEP, "[ChannelSocket] Received (extracted/validated) socket message:\n", message, "\n", SEP)

    if (!message.channelId) message.channelId = this.channelId
    _sb_assert(message.channelId === this.channelId, "[ChannelSocket] received message for wrong channel?")

    if (this.#traceSocket) console.log("[ChannelSocket] Received socket message:", message)

    _sb_assert(message.sts, "[ChannelSocket] Message missing server timestamp Internal Error (L4145)")
    this.lastTimestampPrefix = ChannelSocket.timestampToBase4String(message!.sts!)
    if (DBG0) console.log("[ChannelSocket] Updated 'latestTimestamp' to:", this.lastTimestampPrefix)

    // if (!message._id)
    //   message._id = composeMessageKey(message.channelId!, message.sts!, message.i2)

    // check if this message is one that we've recently sent (track 'ack')
    _sb_assert(message.c && message.c instanceof ArrayBuffer, "[ChannelSocket] Internal Error (L3675)")
    const hash = await crypto.subtle.digest('SHA-256', message.c! as ArrayBuffer)
    const ack_id = arrayBufferToBase64url(hash)
    // ToDo: track (chain) hashes of previous messages from same sender;
    // also, bootstrap upon a reconnect what latest message hash was
    if (this.previous) message.p = this.previous
    this.previous = ack_id
    if (DBG) console.log("[ChannelSocket] Received message with hash:", ack_id)
    const r = this.#ack.get(ack_id)
    if (r) {
      if (DBG || this.#traceSocket) console.log(`++++++++ #processMessage: found matching ack for id ${ack_id}`)
      this.#ack.delete(ack_id)
      r("success") // we first resolve that outstanding send (and then also deliver message)
    }
    const t = this.#ackTimer.get(ack_id)
    if (t) {
      if (DBG2 || this.#traceSocket) console.log(`++++++++ #processMessage: clearing matching ack timeout for id ${ack_id}`)
      clearTimeout(t)
      this.#ackTimer.delete(ack_id)
    }

    if (DBG2) console.log("[ChannelSocket] New message, client andserver time stamp: ", message.sts)
    const m = await this.extractMessage(message)

    if (m) {
      if (DBG) console.log("[ChannelSocket] Repackaged and will deliver 'Message':", m)
      // call user-provided message handler
      this.onMessage(m)
    } else {
      if (DBG) console.log("[ChannelSocket] Message could not be parsed, will not deliver")
    }
  }

  get ready() {
    _sb_assert(!this.errorState, "[ChannelSocket] in error state (Internal Error L4104)")
    _sb_assert(!this.isClosed, "[ChannelSocket] We are closed, blocking on'ready' will reject")
    return this.channelSocketReady
  }

  get errorPromise() {
    if (!this.#errorPromise) throw new SBError("[ChannelSocket] errorPromise called before ready")
    return this.#errorPromise
  }

  // get readyFlag(): boolean { return this.#ChannelSocketReadyFlag }
  get ChannelSocketReadyFlag(): boolean { return (this as any)[ChannelSocket.ReadyFlag] }

  get status() {
    if (!this.#ws || !this.#ws.websocket) return 'CLOSED'
    else switch (this.#ws.websocket.readyState) {
      case 0: return 'CONNECTING'
      case 1: return 'OPEN'
      case 2: return 'CLOSING'
      default: return 'CLOSED'
    }
  }

  /** Enables debug output */
  set enableTrace(b: boolean) {
    this.#traceSocket = b;
    if (b) console.log("==== jslib ChannelSocket: Tracing enabled ====")
  }

  // actually send the message on the socket; returns a description of the outcome
  #_send(msg: ChannelMessage) {
    _sb_assert(!this.errorState, "[ChannelSocket] in error state (Internal Error L4130)")
    if (DBG2) console.log("[ChannelSocket] #_send() called")
    return new Promise(async (resolve, reject) => {
      if (DBG2) console.log(SEP, "++++++++ [ChannelSocket.#_send()] called, will return promise to send:", msg.unencryptedContents, SEP)
      if (this.#ws!.closed) {
        if (DBG2) console.error("[ChannelSocket] #_send() to a CLOSED socket")
        reject('<websocket closed>'); return;
      }
      if (msg.stringMessage === true) {
        try {
          // 'string' messages are not tracked with an 'ack' by jslib; that
          // would need to be done at another location of whatever protocol the
          // message corresponds to.
          const contents = msg.unencryptedContents
          if (DBG2) console.log("[ChannelSocket] actually sending string message:", contents)
          this.#ws!.websocket!.send(contents)
          resolve("success")
        } catch (e) {
          reject(`<websocket error upon send() of a string message: ${e}>`); return;
        }
      } else {
        // if it's not simple, then it's more complicated
        msg = await this.finalizeMessage(msg)
        const messagePayload = assemblePayload(msg)
        if (!messagePayload) {
          reject("ChannelSocket.send(): no message payload (Internal Error)"); return;
        }

        // we keep track of a hash of things to manage 'ack'
        const hash = await crypto.subtle.digest('SHA-256', msg.c! as ArrayBuffer)
        const messageHash = arrayBufferToBase64url(hash)
        if (DBG2 || this.#traceSocket)
          console.log("++++++++ ChannelSocket.send(): Which has hash:", messageHash)
        this.#ack.set(messageHash, resolve)
        this.#ackTimer.set(messageHash, setTimeout(async () => {
          if (this.#ack.has(messageHash)) {
            this.#ack.delete(messageHash)
            if (Snackabra.isShutdown) { reject("shutDown"); return; } // if we're shutting things down, we're done
            if (DBG) console.error(`[ChannelSocket] websocket request timed out (no ack) after ${this.#ws!.timeout}ms (${messageHash})`)
            // update: no we don't reset at low levels, turns out to confuse responsibilities
            // this.reset() // for timeouts, we try to reset the socket
            // await this.ready // wait for it to start up again
            // if (DBG)  console.error(`[ChannelSocket] ... channel socket should be ready again`);
            reject(`<websocket request timed out (no ack) after ${this.#ws!.timeout}ms (${messageHash})>`);
            return;
          } else {
            // ChannelSocket resolves on seeing message return
            if (DBG || this.#traceSocket) console.log("++++++++ ChannelSocket.send() completed sending")
            resolve("<received ACK, success, message sent and mirrored back>")
          }
        }, this.#ws!.timeout))
        if (DBG2) console.log("[ChannelSocket] actually sending message:", messagePayload)
        try {
          // THIS IS WHERE we actually send an SBMessage payload ...
          if (DBG2) console.log("[ChannelSocket] actually sending message:", messagePayload)
          this.#ws!.websocket!.send(messagePayload!)
        } catch (e) {
          // print out stack at this time
          console.error("Failed to send on socket:\n", e, '\n', new Error().stack)
          reject(`<websocket error upon send() of a message: ${e}>`); return;
        }
      }
    });
  }

  /**
    * ChannelSocket.send()
    *
    * Returns a promise that resolves to "success" when sent,
    * or an error message if it fails.
    */
  async send(contents: any, options?: MessageOptions): Promise<string> {
    if (DBG2) console.log("++++ ChannelSocket.send() called ...")
    await this.ready
    _sb_assert(this.#ws && this.#ws.websocket, "[ChannelSocket.send()] called before ready")
    if (DBG2) console.log(SEP, "[ChannelSocket] sending, contents:\n", JSON.stringify(contents), SEP)
    if (this.#ws!.closed) {
      console.info("send() triggered reset of #readyPromise() (normal)")
      this.channelSocketReady = this.#channelSocketReadyFactory()
        // this.#ChannelSocketReadyFlag = true
        ; (this as any)[ChannelSocket.ReadyFlag] = false;
    }
    return new Promise(async (resolve, reject) => {
      if (!this.ChannelSocketReadyFlag) reject("ChannelSocket.send() is NOT ready, perhaps it's resetting?")
      const readyState = this.#ws!.websocket!.readyState
      switch (readyState) {
        case 1: // OPEN
          // if (this.#traceSocket)
          //   console.log("++++++++ ChannelSocket.send() will send message:", Object.assign({}, sbm.message))
          // let messagePayload: ArrayBuffer | string | null = null
          // if (options?.sendString === true) {
          //   messagePayload = sbm.message as string
          // } else {
          //   const msg = sbm.message as ChannelMessage
          //   messagePayload = assemblePayload(msg)
          //   _sb_assert(messagePayload, "ChannelSocket.send(): failed to assemble message")
          //   // we keep track of a hash of things we've sent so we can track when we see them
          //   // todo: 'hash' should probably be an sbm property
          //   const hash = await crypto.subtle.digest('SHA-256', msg.c!)
          //   const messageHash = arrayBufferToBase64url(hash)
          //   if (DBG || this.#traceSocket)
          //     console.log("++++++++ ChannelSocket.send(): Which has hash:", messageHash)
          //   this.#ack.set(messageHash, resolve)
          //   this.#ackTimer.set(messageHash, setTimeout(() => {
          //     // we could just resolve on message return, but we want to print out error message
          //     if (this.#ack.has(messageHash)) {
          //       this.#ack.delete(messageHash)
          //       if (Snackabra.isShutdown) { reject("shutDown"); return; } // we don't want to print this out if we're shutting down
          //       const msg = `Websocket request timed out (no ack) after ${this.#ws!.timeout}ms (${messageHash})`
          //       console.error(msg)
          //       reject(msg)
          //     } else {
          //       // normal behavior
          //       if (this.#traceSocket) console.log("++++++++ ChannelSocket.send() completed sending")
          //       resolve("success")
          //     }
          //   }, this.#ws!.timeout))
          // }

          // console.log("[ChannelSocket.send()] enqueueing message: ", contents)
          // console.log("TTL at point of channel socket send() is: ", options?.ttl)
          this.sendQueue.enqueue({
            msg: this.packageMessage(contents, options),
            resolve: resolve,
            reject: reject,
            _send: this.#_send.bind(this),
            retryCount: WEBSOCKET_RETRY_COUNT
          })

          // // THIS IS WHERE we actually send the payload ...
          // if (!messagePayload) reject("ChannelSocket.send(): no message payload (Internal Error)")
          // else this.#ws!.websocket!.send(messagePayload)

          break
        case 0: // CONNECTING
        case 2: // CLOSING
        case 3: // CLOSED
          const errMsg = `[ChannelSocket.send()] Tried sending but socket not OPEN - it is ${readyState === 0 ? 'CONNECTING' : readyState === 2 ? 'CLOSING' : 'CLOSED'}`
          // _sb_exception('ChannelSocket', errMsg)
          reject(errMsg)
          break
        default:
          _sb_exception('ChannelSocket', `socket in unknown state (${readyState})`)
      }
    })
  }

  /**
   * This is either called when you're done, or is called internally
   * during various restart/reconnect scenarios.
   */
  async close() {
    if (DBG0 || DBG) console.log("++++ ChannelSocket.close() called ... closing down stuff ...")
    this.isClosed = true;
    clearInterval(this.#pingInterval);
    if (this.#ws && this.#ws.websocket) {
      // this.#ws.websocket.send('close') // will try to rely on protocol instead
      if (this.#ws.websocket.readyState === 1) {
        if (DBG0) console.log(SEP, "[ChannelSocket] Closing websocket, with readystate:", this.#ws.websocket.readyState, SEP)
        this.#ws.websocket.close()
        // debugging Deno? ... wait a moment here
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      this.#ws.closed = true
    }
    // close and drain the sendQueue; any messages in flight will be rejected
    // todo: strictly speaking, if we're in a retry situation, we can still handle them
    const queueDrain = super.close()

    // tell SB that we are no longer connected
    Snackabra.removeChannelSocket(this)

      // set ready to permanently reject
      ; (this as any)[ChannelSocket.ReadyFlag] = false;

    // we would like to throw if anybody anywhere tries to await on our 'ready':
    // this.channelSocketReady = Promise.reject("[ChannelSocket] This channel socket has been closed (by client request)")
    // but this doesn't work well because of JS limitations in tracking stacks. instead we in effect have a different
    // state: 'isClosed' can be true, while the ChannelSocket is still 'ready'.

    return queueDrain; // in case caller wants to await
  }

  /**
   * Reconnects (resets) a ChannelSocket. This will not block (it's
   * synchronous), and 'ready' will resolve when the socket is ready again.
   */
  reset() {
    if (DBG0) console.trace("++++ ChannelSocket.reset() called ... for ChannelID:", this.channelId)
    if (this.#ws && this.#ws.websocket) {
      if (this.#ws.websocket.readyState === 1) {
        if (DBG0) console.log("[ChannelSocket] Closing websocket, with readystate:", this.#ws.websocket.readyState)
        this.#ws.websocket.close()
      }
      this.#ws.closed = true;
      (this as any)[ChannelSocket.ReadyFlag] = false;
      // we also delete the old entry on the active sockets list
      Snackabra.removeChannelSocket(this)
      // and reset our readiness
      this.channelSocketReady = this.#channelSocketReadyFactory()
    }
  }


  // /** @type {JsonWebKey} */ @Memoize @Ready get exportable_owner_pubKey() { return this.keys.ownerKey }

} /* class ChannelSocket */

//#endregion

/******************************************************************************************************/
//#region STORAGE: SBObjectHandle, StorageApi



// 'Shard' object is the format returned by storage server; this code
// 'paraphrases' code in the storage server. it is essentially a variation
// of SBObjectHandle, but (much) more restrictive.
interface Shard {
  version: '3',
  id: Base62Encoded,
  iv: Uint8Array,
  salt: ArrayBuffer,
  actualSize: number, // of the data in the shard
  data: ArrayBuffer,
}

function validate_Shard(s: Shard): Shard {
  if (!s) throw new SBError(`invalid SBObjectHandle (null or undefined)`);
  else if (s.version === '3'
    && (typeof s.id === 'string' && s.id.length === 43 && b62regex.test(s.id))
    && (s.iv instanceof Uint8Array && s.iv.byteLength === 12)
    && (s.salt instanceof ArrayBuffer && s.salt.byteLength === 16)
    && (s.data instanceof ArrayBuffer && s.actualSize === s.data.byteLength)) return s
  else throw new SBError(`invalid Shard`);
}

/**
 * Basic object handle for a shard (all storage).
 * 
 * To RETRIEVE a shard, you need id and verification.
 * 
 * To DECRYPT a shard, you need key, iv, and salt. Current
 * generation of shard servers will provide (iv, salt) upon
 * request if (and only if) you have id and verification.
 * 
 * Note that id32/key32 are array32 encoded base62 encoded.
 * 
 * 'verification' is a 64-bit integer, encoded as a string
 * of up 23 characters: it is four 16-bit integers, either
 * joined by '.' or simply concatenated. Currently all four
 * values are random, future generation only first three
 * are guaranteed to be random, the fourth may be "designed".
 * 
 * 
 * @typedef {Object} SBObjectHandleClass
 * @property {boolean} [SB_OBJECT_HANDLE_SYMBOL] - flag to indicate this is an SBObjectHandle
 * @property {string} version - version of this object
 * @property {string} id - id of object
 * @property {string} key - key of object
 * @property {Base62Encoded} [id32] - optional: array32 format of id
 * @property {Base62Encoded} [key32] - optional: array32 format of key
 * @property {Promise<string>|string} verification - and currently you also need to keep track of this,
 * but you can start sharing / communicating the
 * object before it's resolved: among other things it
 * serves as a 'write-through' verification
 * @property {Uint8Array|string} [iv] - you'll need these in case you want to track an object
 * across future (storage) servers, but as long as you
 * are within the same SB servers you can request them.
 * @property {Uint8Array|string} [salt] - you'll need these in case you want to track an object
 * across future (storage) servers, but as long as you
 * are within the same SB servers you can request them.
 * @property {string} [fileName] - by convention will be "PAYLOAD" if it's a set of objects
 * @property {string} [dateAndTime] - optional: time of shard creation
 * @property {string} [shardServer] - optionally direct a shard to a specific server (especially for reads)
 * @property {string} [fileType] - optional: file type (mime)
 * @property {number} [lastModified] - optional: last modified time (of underlying file, if any)
 * @property {number} [actualSize] - optional: actual size of underlying file, if any
 * @property {number} [savedSize] - optional: size of shard (may be different from actualSize)
 * 
 */



/**
 * StorageAPI. Used to interact with storage server(s). It will have a concept
 * of a 'default' server, but that is not needed for all operations. It will
 * default to using server choices in any handles.
 */
export class StorageApi {
  #server?: string; // either a channel or storage server
  #storageServer: string = ''; // empty means unknown (for example we're offline)
  static #uploadBacklog = 0
  constructor(server?: string) {
    if (server) {
      this.#server = server
      this.#_getStorageServer().then((s) => {
        if (!s) {
          if (DBG0) console.error("[StorageApi] Could not (immediately) resolve storage server")
          // ToDo: we are proactive in checking again during dev&test, this might be unnecessary
          //       since ''getStorageServer()'' will retry later anyway, as needed
          const reCheckInterval = setInterval(async () => {
            if (Snackabra.isShutdown) {
              clearInterval(reCheckInterval)
              if (DBG0) console.error("[StorageApi] Shutting down, will not retry getting storage server")
            } else {
              const s2 = await this.#_getStorageServer()
              if (s2) {
                clearInterval(reCheckInterval)
                if (DBG0) console.log(`[StorageApi] ... eventually resolved storage server ('${s2}')`)
              } // else: no-op, we keep trying
            }
          }, 1000)
        } // else: no need to try again
      })
    }
  }

  // we use a promise so that asynchronicity can be handled interally in StorageApi,
  // eg so users don't have to do things like ''(await SB.storage).fetchObject(...)''.
  // this fetch is low-level and returns empty string if not online. if it receives
  // inconsistent or incorrect information, it will throw
  async #_getStorageServer(): Promise<string> {
    if (this.#storageServer) {
      return this.#storageServer
    } else if (!this.#server) {
      if (DBG0) console.warn('[StorageApi] No server information known (neither channel or storage)')
    } else {
      const retValue = await Snackabra.getServerInfo(this.#server)
      if (!retValue) return '' // we're probably offline
      if (retValue && !retValue.storageServer)
        throw new SBError('[StorageApi] Server available did not provide storage server name, cannot initialize. Should not happen [L4651]')
      if (DBG0) console.log("[StorageApi] Fyi, server returned info info:", retValue)
      this.#storageServer = retValue.storageServer

    }
    return this.#storageServer // if undetermined, we return empty string
  }

  async getStorageServer() {
    const s = await this.#_getStorageServer()
    if (s) return s;
    else throw new SBError("[StorageApi] Identity of storage server is not (yet) known.");
  }

  /**
   * Pads object up to closest permitted size boundaries,
   * taking into account meta data overhead of the padding itself.
   * 
   * Currently, this means minimum size of 4 KiB, after which
   * we round up to closest power of 2, doing so up to 1 MiB,
   * after which we round up to the next MiB boundary.
   */
  static padBuf(buf: ArrayBuffer) {
    const dataSize = buf.byteLength; let _target

    const MIN_SIZE = 4096;    // 4 KiB
    const MAX_SIZE = 1048576; // 1 MiB
    const OVERHEAD = 4;       // Size of Uint32

    // pick the size to be rounding up to
    if ((dataSize + OVERHEAD) < MIN_SIZE) _target = MIN_SIZE // smallest size
    else if ((dataSize + OVERHEAD) < MAX_SIZE) _target = 2 ** Math.ceil(Math.log2(dataSize + OVERHEAD)) // in between
    else _target = (Math.ceil((dataSize + OVERHEAD) / MAX_SIZE)) * MAX_SIZE // largest size
    // append the padding buffer
    let finalArray = _appendBuffers([buf, (new Uint8Array(_target - dataSize)).buffer]);
    // set the (original) size in the last 4 bytes
    (new DataView(finalArray)).setUint32(_target - OVERHEAD, dataSize)
    if (DBG2) console.log("padBuf bytes:", finalArray.slice(-OVERHEAD));
    return finalArray
  }


  /**
   * Reverse of padBuf(). Note that actual size is in the last 4 bytes.
   */
  /** @private */
  #unpadData(data_buffer: ArrayBuffer): ArrayBuffer {
    const tail = data_buffer.slice(-4)
    var _size = new DataView(tail).getUint32(0)
    const _little_endian = new DataView(tail).getUint32(0, true)
    if (_little_endian < _size) {
      // a bit of a hack, some code writes the size in little endian
      if (DBG2) console.warn("#unpadData - size of shard encoded as little endian (fixed upon read)")
      _size = _little_endian
    }
    if (DBG2) {
      console.log(`#unpadData - size of object is ${_size}`)
    }
    return data_buffer.slice(0, _size);
  }

  /** Derives the encryption key for a given object (shard). */
  static getObjectKey(fileHashBuffer: BufferSource, salt: ArrayBuffer): Promise<CryptoKey> {
    return new Promise((resolve, reject) => {
      try {
        sbCrypto.importKey('raw',
          fileHashBuffer,
          'PBKDF2', false, ['deriveBits', 'deriveKey']).then((keyMaterial) => {
            crypto.subtle.deriveKey({
              'name': 'PBKDF2',
              'salt': salt,
              'iterations': 100000, // small is fine
              'hash': 'SHA-256'
            }, keyMaterial, { 'name': 'AES-GCM', 'length': 256 }, true, ['encrypt', 'decrypt'])
              .then((key) => {
                resolve(key)
              })
          })
      } catch (e) {
        reject(e);
      }
    });
  }

  /** derives final object ID */
  static async getObjectId(iv: Uint8Array, salt: ArrayBuffer, encryptedData: ArrayBuffer): Promise<string> {
    if (DBG2) console.log(
      SEP,
      "getObjectId()",
      SEP, iv,
      SEP, salt,
      SEP, encryptedData,
      SEP
    )
    // todo: yes we end up doing a bit more copying of data then needed
    const id = await crypto.subtle.digest('SHA-256',
      _appendBuffers([
        iv,
        salt,
        encryptedData
      ]))
    return arrayBufferToBase62(id)
  }

  /**
   * Paces uploads to avoid overloading the storage server. Takes into account
   * global number of operations.
   */
  static async paceUploads() {
    if (DBG) console.log("+++++ [paceUploads] called, backlog is:", StorageApi.#uploadBacklog)
    while (StorageApi.#uploadBacklog > 8) { // ToDo: evaluate this better and/or redesign storage server
      if (DBG) console.log("+++++ [paceUploads] waiting for server, backlog is:", StorageApi.#uploadBacklog)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  /**
   * Store 'contents' as a shard, returns an object handle. Note that 'contents' can be
   * anything, and is always packaged as a payload before storing.
   */
  async storeData(
    contents: any,
    budgetSource: SBChannelHandle | Channel | SBStorageToken
  ): Promise<SBObjectHandle> {
    StorageApi.#uploadBacklog++
    try {
      const buf = assemblePayload(contents)!
      if (!buf) throw new SBError("[storeData] failed to assemble payload")
      const hash = arrayBufferToBase62(await crypto.subtle.digest('SHA-256', buf)).slice(0, 12);

      // const bufSize = (buf as ArrayBuffer).byteLength // before padding
      const paddedBuf = StorageApi.padBuf(buf)
      const fullHash = await sbCrypto.generateIdKey(paddedBuf)

      // 'phase 1': get salt and iv from storage server for this object
      const storageServer = await this.getStorageServer()
      const idForKeyLookup = arrayBufferToBase62(fullHash.idBinary)
      const requestQuery = storageServer + '/api/v2/storeRequest?id=' + idForKeyLookup
      const keyInfo = await SBApiFetch(requestQuery) as { salt: ArrayBuffer, iv: Uint8Array }
      if (!keyInfo.salt || !keyInfo.iv)
        throw new SBError('[storeData] Failed to get key info (salt, nonce) from storage server')

      const key = await StorageApi.getObjectKey(fullHash.keyMaterial, keyInfo.salt)
      const encryptedData = await sbCrypto.encrypt(paddedBuf, key, { iv: keyInfo.iv })

      let storageToken: SBStorageToken
      if (budgetSource instanceof Channel) {
        storageToken = await budgetSource.getStorageToken(encryptedData.byteLength)
      } else if (_check_SBChannelHandle(budgetSource as SBChannelHandle)) {
        storageToken = await (await new Channel(budgetSource as SBChannelHandle).ready).getStorageToken(encryptedData.byteLength)
      } else if (_check_SBStorageToken(budgetSource as SBStorageToken)) {
        storageToken = validate_SBStorageToken(budgetSource as SBStorageToken)
      } else {
        throw new SBError("[storeData] invalid budget source (needs to be a channel, channel handle, or storage token)")
      }

      // 'phase 1B': object id is created by hashing the encryptedData with the iv and salt
      const id = await StorageApi.getObjectId(keyInfo.iv, keyInfo.salt, encryptedData)

      // 'phase 2': we store the object
      const storeQuery = storageServer + '/api/v2/storeData?id=' + id
      const init: RequestInit = {
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
      }

      if (DBG2) console.log("5555 5555 [storeData] storeQuery:", SEP, storeQuery, SEP)

      const result = await SBApiFetch(storeQuery, init)

      const r: SBObjectHandle = {
        [SB_OBJECT_HANDLE_SYMBOL]: true,
        version: currentSBOHVersion,
        id: id,
        key: arrayBufferToBase62(fullHash.keyMaterial),
        iv: keyInfo.iv,
        salt: keyInfo.salt,
        // actualSize: bufSize,
        hash: hash,
        verification: result.verification,
        storageServer: storageServer,
      }
      if (DBG) console.log("storeData() - success, handle:", r, encryptedData)
      return (r)
    } catch (error) {
      console.error("[storeData] failed:", error)
      if (error instanceof SBError) {
        // check if 'Not enough storage budget' is in the message
        if (error.message.includes('Not enough storage budget'))
          throw new SBError('Not enough storage budget')
        else
          throw error
      }
      throw new SBError(`[storeData] failed to store data: ${error}`)
    } finally {
      StorageApi.#uploadBacklog--
    }
  }

  // gets shard contents from server, and decrypts it.
  // populates handle. returns hash (of decrypted contents) and updated handle.
  // a wrapper: any failure conditions (exceptions) returns 'null', facilitates
  // trying different servers. 
  async #_fetchData(useServer: string, url: string, h: SBObjectHandle): Promise<{ hash: string, handle: SBObjectHandle } | undefined> {
    try {
      let shard = validate_Shard(await SBApiFetch(useServer + url, { method: 'GET' }) as Shard)

      // todo: technically this isn't necessary, since we now distinguish data from payload
      _sb_assert(h.key, "object handle 'key' is missing, cannot decrypt")

      // we merge shard info into our handle
      h.iv = shard.iv
      h.salt = shard.salt
      h.data = new WeakRef(shard.data)
      // h.actualSize = shard.actualSize

      if (DBG2) console.log("fetchData(), handle (and data) at this point:", h, shard.data)

      const h_key = base62ToArrayBuffer(h.key!)
      const decryptionKey = await StorageApi.getObjectKey(h_key, h.salt);
      // const decryptedData = await sbCrypto.unwrapShard(decryptionKey, { c: shard.data, iv: h.iv })
      const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: h.iv }, decryptionKey, shard.data)
      const buf = this.#unpadData(decryptedData)
      if (DBG2) console.log("shard.data (decrypted and unpadded):", buf)
      // hashes are on the inner binary data (eg decrypted but not extracted)
      const hash = arrayBufferToBase62(await crypto.subtle.digest('SHA-256', buf)).slice(0, 12);
      if (h.hash && h.hash !== hash)
        // if they differ, we ignore, and use the one we just calculated
        console.error("[fetchData] Hash mismatch in object, internal error (L4730) but ignored")
      h.payload = extractPayload(buf).payload
      h.data = new WeakRef(shard.data) // once we've gotten the payload, we keep ref but we're chill about it
      return ({ hash: hash, handle: h })
    } catch (error) {
      if (DBG) console.log(`fetchData(): trying to get object on '${useServer}' failed: '${error}'`)
      return (undefined)
    }
  }

  /**
   * Fetches the data for a given object handle. Result will be referenced by
   * the 'payload' property in the returned handle. This is the main 'read'
   * workhorse.
   *
   * This will work if you have sufficient information in the passed
   * SBObjectHandle. fetchData() will flesh out everything it can, and throw if
   * it's not able to. It will return the same handle, with whatever additional
   * parts it was able to fill in.
   *
   * Not that fetchData will prioritize checking with the storageServer in the
   * handle, if present. Next, it will always check localhost at port 3841 if a
   * local mirror is running. After that, it may or may not check one or several
   * possible servers.
   *
   * Note that 'storageServer' in the returned object might have changed, it
   * will be whichever server fetchData() was able to fetch from (so could be
   * local mirror for example, so be a bit careful with overwriting the original
   * handle that was used).
   *
   * The contents of the shard are decrypted and extracted into 'payload', and
   * 'data' will contain the raw data prior to decryption and extraction, in
   * case callee is interested. Note that to avoid unnecessary duplication of
   * space, it is stored as a 'weakref' - use getData() to safely retrieve.
   * 
   * Note that as a side effect, Snackabra.knownShards is updated.
   */
  async fetchData(handle: SBObjectHandle): Promise<SBObjectHandle> {
    if (!handle)
      throw new SBError('[fetchData] No handle provided (cannot accept null or undefined)')
    const h = validate_SBObjectHandle(handle) // throws if there's an issue
    if (DBG) console.log("fetchData(), handle:", h)

    if (Snackabra.shardBreakpoints.has(h.id)) {
      debugger;
    }

    // ... not correct
    // // we might be 'caching' as a weakref
    // if (h.data && h.data instanceof WeakRef && h.data.deref()) return (h); // the ref is still good

    // Note: we don't use any local storage as a cache, since the shards
    // already have a 'namespace' for caching in the browser (regular network
    // operations)

    const verification = await h.verification

    // in current design, there are three servers that are checked
    const server1 = h.storageServer ? h.storageServer : null // todo: this sometimes resolves to '0'??
    const server2 = 'http://localhost:3841' // local mirror
    const server3 = await this.getStorageServer()
    // const useServer = (await this.getStorageServer()) + '/api/v2'

    // we try the servers in order, and we try to fetch from the server
    for (const server of [server1, server2, server3]) {
      if (!server) continue
      if (DBG) console.log('\n', SEP, "fetchData(), trying server: ", server, '\n', SEP)
      const queryString = '/api/v2/fetchData?id=' + h.id + '&verification=' + verification
      const result = await this.#_fetchData(server, queryString, h)
      if (result) {
        const { hash, handle } = result
        if (DBG) console.log(`[fetchData] success: fetched from '${server}'`, result)
        handle.storageServer = server // store the one that worked
        Snackabra.knownShards.set(hash, handle);
        return (handle)
      }
    }
    // if these servers don't work, we throw an error
    throw new SBError(`[fetchData] failed to fetch from any server`)
  }

  /**
   * Convenience wrapper for object handles: returns the 'data' if it's present,
   * returns undefined if it's not, and throws an error if the handle is
   * invalid. Accepts 'undefined' for easier chaining. Note that this is a
   * low-level operation, you probably want to use fetchPayload() instead.
   */
  static getData(handle: SBObjectHandle | undefined): ArrayBuffer | undefined {
    if (typeof handle === 'undefined') return undefined
    const h = validate_SBObjectHandle(handle)
    if (!h.data) return undefined
    if (h.data instanceof WeakRef) {
      const dref = h.data!.deref()
      if (dref) return dref
      else return undefined
    } else if (h.data instanceof ArrayBuffer) {
      return h.data
    } else {
      throw new SBError('Invalid data type in handle')
    }
  }

  /**
   * Convenience wrapper for object handles: returns the payload (eg contents of
   * the shard). It can parse out if the payload is already present. If not, it
   * will fetch the data and extract the payload.
   *
   * Note: this cannot take an undefined parameter, since it cannot return
   * 'undefined' as a non-throwing response (because 'undefined' by itself is a
   * permitted shard content).
   *
   * For the same reason, we can't have a non-throwing 'fetchPayload()' method,
   * that would be analogous to 'getData()'. 
   */
  async fetchPayload(h: SBObjectHandle): Promise<any> {
    if (!h) throw new SBError('[fetchPayload] No handle provided (cannot accept null or undefined)')
    if (!h.payload && !h.data)
      h = await this.fetchData(h)
    if (h.payload)
      return h.payload
    if (h.data)
      return StorageApi.getData(h)
    throw new SBError('[fetchPayload] Failed to fetch data or payload')
  }

} /* class StorageApi */

//#endregion

/******************************************************************************************************/
//#region Snackabra and exports

// const SnackabraDefaults = {
//   channelServer: ''
// }

/**
 * Implements event handling interface, compatible with EventTarget but also
 * supports 'on', 'off', and 'emit'. Note: entirely 'static', so any class
 * that extends this will implement a global event handler for that class.
 */
export class SBEventTarget {
  private static listeners: { [type: string]: ((event: Event | any) => void)[] } = {};

  static addEventListener(type: string, callback: (event: Event) => void, _options?: boolean | AddEventListenerOptions): void {
    SBEventTarget.listeners[type] = SBEventTarget.listeners[type] || [];
    SBEventTarget.listeners[type].push(callback);
  }

  static removeEventListener(type: string, callback: (event: Event) => void, _options?: boolean | EventListenerOptions): void {
    if (!SBEventTarget.listeners[type]) return;
    const stack = SBEventTarget.listeners[type];
    const index = stack.indexOf(callback);
    if (index > -1) {
      stack.splice(index, 1);
    }
  }

  static dispatchEvent(event: Event): boolean {
    const listeners = SBEventTarget.listeners[event.type];
    if (!listeners) return true;
    listeners.forEach(listener => listener(event));
    return !event.defaultPrevented;
  }

  static on(eventName: string, listener: (args: any) => void) {
    SBEventTarget.addEventListener(eventName, listener as any);
  }

  static off(eventName: string, listener: (args: any) => void) {
    SBEventTarget.removeEventListener(eventName, listener as any);
  }

  static emit(eventName: string, ...args: any[]) {
    const event = new CustomEvent(eventName, { detail: args.length === 1 ? args[0] : args });
    SBEventTarget.dispatchEvent(event);
  }
}

/**
 * Channel and Storage servers return the same structure.
 */
export interface SBServerInfo {
  version: string,
  channelServer: string,
  storageServer: string,
  jslibVersion?: string,
}

type ServerOnlineStatus = 'online' | 'offline' | 'unknown';

/**
  * Main class. It corresponds to a single channel server. Most apps
  * will only be talking to one channel server, but it is possible
  * to have multiple instances of Snackabra, each talking to a
  * different channel server.
  * 
  * Channel servers are generally associated with a single storage
  * storage, one where the channel server is trusted to make storage
  * allocation decisions.
  * 
  * Takes a single parameter, the URL to the channel server.
  * 
  * @example
  * ```typescript
  *     const sb = new Snackabra('http://localhost:3845')
  * ```
  * 
  * Websocket server is always the same server (just different protocol),
  * storage server is now provided by '/api/v2/info' endpoint from the
  * channel server.
  * 
  * You can give an options parameter with various settings, including
  * debug levels. For ease of use, you can just give a boolean value
  * (eg 'true') to turn on basic debugging.
  * 
  * The 'sbFetch' option allows you to provide a custom fetch function
  * for accessing channel and storage servers. For example, to provide
  * a specific service binding for a web worker.
 */
class Snackabra extends SBEventTarget {
  public static version = "3.20240605.6"

  // max number of messages (with body) that can be requested at once; note that
  // this is calibrated with the server, which might think differently
  public static MAX_MESSAGE_REQUEST_SIZE = 128
  
  // max number of message *keys* that can be requested at once;
  // this is also the core DeepHistory sharding size
  public static MAX_MESSAGE_SET_SIZE = ServerDeepHistory.MAX_MESSAGE_SET_SIZE

  // these are known shards that we've seen and know the handle for; this is
  // global. hashed on decrypted (but not extracted) contents.
  public static knownShards: Map<string, SBObjectHandle> = new Map();

  #channelServer: string
  #storage: StorageApi

  // globally paces (messaging) operations, and assures unique timestamps
  public static lastTimeStamp = 0 // todo: x256 (string) format

  // shared global set of fetches, sockets, etc, for closeAll()
  public static activeFetches = new Map<symbol, AbortController>()

  // static abortPromises = new Map<symbol, Promise<unknown>>()

  static #activeChannelSockets = new Set<ChannelSocket>()
  public static isShutdown = false // flipped 'true' when closeAll() is called

  public static lastTimestampPrefix: string = '0'.repeat(26)
  static #latestPing = Date.now(); // updated by 'ping'

  // public static online = true; // updated by 'ping'
  public static onlineStatus: ServerOnlineStatus = 'unknown'

  // overwritten by whatever most recent new Snackabra()
  // static defaultChannelServer = 'http://localhost:3845'
  static defaultChannelServer = 'https://c3.384.dev' // ToDo: revisit

  eventTarget = new SBEventTarget()

  static shardBreakpoints: Set<string> = new Set()

  constructor(
    channelServer: string,
    options?:
      {
        DEBUG?: boolean,
        DEBUG2?: boolean,
        sbFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
      }
      | boolean
  ) {
    super() // ToDo: for some freaking reason can't do 'extends SBEventTarget'
    _sb_assert(typeof channelServer === 'string', '[Snackabra] Takes channel server URL as parameter')
    if (channelServer) Snackabra.defaultChannelServer = channelServer
    console.warn(`==== CREATING Snackabra object generation: ${Snackabra.version} (${Snackabra.defaultChannelServer}) ====`)

    if (typeof options === 'boolean') options = { DEBUG: options }

    // testing with moving this to build process ... 
    // if (options && options.DEBUG && options.DEBUG === true) DBG = true;
    // if (options && DBG && options.DEBUG2 && options.DEBUG2 === true) DBG2 = true;
    // if (DBG) console.warn("++++ Snackabra constructor: setting DBG to TRUE ++++");
    // if (DBG2) console.warn("++++ Snackabra constructor: ALSO setting DBG2 to TRUE (verbose) ++++");

    // sets global setting for what network/fetch operation to use
    if (options && options.sbFetch) {
      console.log("++++ Snackabra constructor: setting custom fetch function ++++" /*, options.sbFetch */)
      sbFetch = options.sbFetch
    }

    this.#channelServer = channelServer // conceptually, you can have multiple channel servers
    this.#storage = new StorageApi(channelServer)
  }

  // any operations that require a precise timestamp (such as messages) can use
  // this, to assure both pacing, uniqueness, and monotonically increasing
  // timestamps
  static async dateNow() {
    let timestamp = Date.now()
    if (timestamp <= Snackabra.lastTimeStamp) {
      timestamp = Snackabra.lastTimeStamp + 1
    }
    Snackabra.lastTimeStamp = timestamp
    return timestamp


    // while (timestamp <= Snackabra.lastTimeStamp) {
    //   await new Promise(resolve => setTimeout(resolve, 1));
    //   timestamp = Date.now()
    // }
    // Snackabra.lastTimeStamp = timestamp;
    // return timestamp;
  }

  /**
   * Call when somethings been heard from any channel server; this is used to
   * track whether we are online or not.
   */
  static heardFromServer() {
    Snackabra.#latestPing = Date.now()
    if (DBG2) console.log("[Snackabra] heardFromServer() at", Snackabra.#latestPing)
    switch (Snackabra.onlineStatus) {
      case 'offline':
        if (DBG0) console.info(`[Snackabra] [${Snackabra.#latestPing}] we are now BACK online`)
        this.emit('online')
        this.emit('reconnected')
        Snackabra.onlineStatus = 'online'
        break
      case 'online':
        // still online, unless socket count is zero
        if (DBG2) console.info("[Snackabra] heardFromServer() we are still online")
        break
      case 'unknown':
        if (DBG0) console.info(`[Snackabra] [${Snackabra.#latestPing}] we are now ONLINE`)
        this.emit('online')
        Snackabra.onlineStatus = 'online'
        break
    }
    this.checkUnknownNetworkStatus()
  }

  static checkUnknownNetworkStatus() {
    if (Snackabra.#activeChannelSockets.size === 0) {
      if (Snackabra.onlineStatus !== 'unknown')
        this.emit('unknownNetworkStatus')
      Snackabra.onlineStatus = 'unknown'
    }
  }

  /**
   * Call when we haven't heard from any channel server for a while, and we
   * think we should have.
   */
  static haveNotHeardFromServer() {
    const timeNow = Date.now()
    if (timeNow - Snackabra.#latestPing > WEBSOCKET_PING_INTERVAL * 1.5) {
      if (DBG2) console.warn("[Snackabra] 'ping' message seems to have timed out")
      if (Snackabra.onlineStatus === 'online') {
        if (Snackabra.#activeChannelSockets.size > 0) {
          if (DBG || DBG0) console.log(`[Snackabra] [${timeNow}] OFFLINE`)
          Snackabra.onlineStatus = 'offline'
          // this is the only spot in the code where we emit 'offline'
          this.emit('offline')
        } else {
          if (DBG || DBG0) console.warn("[Snackabra] [${timeNow}] No active channel sockets, online status is now UNKNOWN")
          Snackabra.onlineStatus = 'unknown'
          Snackabra.onlineStatus = 'offline'
          this.emit('unknownNetworkStatus')
        }
      }
    }
    this.checkUnknownNetworkStatus()
  }

  static addChannelSocket(socket: ChannelSocket) {
    if (DBG0) console.log("[Snackabra] adding channel socket:", socket)
    Snackabra.#activeChannelSockets.add(socket)
  }

  static removeChannelSocket(socket: ChannelSocket) {
    if (DBG0) console.log("[Snackabra] removing channel socket:", socket)
    if (Snackabra.#activeChannelSockets.has(socket))
      Snackabra.#activeChannelSockets.delete(socket)
    this.checkUnknownNetworkStatus()
  }

  /**
   * "Anonymous" version of fetching a page, since unless it's locked you do not
   * need to be authenticated to fetch a page (or even know what channel it's
   * related to). This will return mime type and payload in 'convenient' format
   * (eg string, blob, ArrayBuffer, or for JSON is 'any').
   */
  async getPage(prefix: string): Promise<{ type: string, payload: any }> {
    if (DBG) console.log(`==== Snackabra.getPage: calling fetch with: ${prefix}`)
    // return extractPayload(await SBApiFetch(this.#channelServer + '/api/v2/page/' + prefix))
    const pageResponse = await SBFetch(this.#channelServer + '/api/v2/page/' + prefix)
    if (pageResponse.ok) {
      const pageType = pageResponse.headers.get('content-type')
      if (!pageType) throw new SBError(`[getPage] Failed to fetch page '${prefix}'`)
      let payLoad: any
      if (pageType.includes('application/json')) {
        payLoad = await pageResponse.json();
      } else if (pageType.includes('text/') || pageType.includes('xml') || pageType.includes('html')) {
        payLoad = await pageResponse.text();
      } else if (pageType.includes('multipart/form-data')) {
        throw new SBError(`[getPage] Multipart form data not supported`);
      } else if (pageType.match(/(image|audio|video)\//)) {
        payLoad = await pageResponse.blob();
      } else {
        payLoad = await pageResponse.arrayBuffer();
      }
      return { type: pageType, payload: payLoad }
    } else {
      throw new SBError(`[getPage] Failed to fetch page '${prefix}'`)
    }
  }

  // // deprecated ... used anywhere?
  // attach(handle: SBChannelHandle): Promise<Channel> {
  //   return new Promise((resolve, reject) => {
  //     if (handle.channelId) {
  //       if (!handle.channelServer) {
  //         handle.channelServer = this.#channelServer
  //       } else if (handle.channelServer !== this.#channelServer) {
  //         reject('[attach] SBChannelHandle channelId does not match channelServer')
  //       }
  //       resolve(new Channel(handle))
  //     } else {
  //       reject('SBChannelHandle missing channelId')
  //     }
  //   })

  // }

  /**
   * Creates a new channel. Returns a promise to a ''SBChannelHandle'' object.
   * Note that this method does not connect to the channel, it just creates
   * (authorizes) it and allocates storage budget.
   *
   * Note that if you have a full budget channel, you can budd off it (which
   * will take all the storage). Providing a budget channel here will allows you
   * to create new channels when a 'guest' on some other channel (for example),
   * or to create a new channel with a minimal budget.
   *
   * Snackabra.create() returns a handle, whereas Channel.create() returns the
   * channel itself.
   */
  create(budgetChannel: Channel): Promise<SBChannelHandle>
  create(storageToken: SBStorageToken): Promise<SBChannelHandle>
  create(budgetChannelOrToken: Channel | SBStorageToken): Promise<SBChannelHandle> {
    _sb_assert(budgetChannelOrToken !== null, '[create channel] Invalid parameter (null)')
    return new Promise<SBChannelHandle>(async (resolve, reject) => {
      try {
        var _storageToken: SBStorageToken | undefined
        if (budgetChannelOrToken instanceof Channel) {
          const budget = budgetChannelOrToken as Channel
          await budget.ready // make sure it's ready
          if (!budget.channelServer) budget.channelServer = this.#channelServer
          _storageToken = await budget.getStorageToken(NEW_CHANNEL_MINIMUM_BUDGET)
        } else {
          // try to read it as a storage token
          try {
            _storageToken = validate_SBStorageToken(budgetChannelOrToken as SBStorageToken)
          } catch (e) {
            reject('Invalid parameter to create() - need a token or a budget channel')
            return
          }
        }
        _sb_assert(_storageToken, '[create channel] Failed to get storage token for the provided channel')

        // create a fresh channel (set of keys)
        const channelKeys = await new Channel().ready
        channelKeys.channelServer = this.#channelServer
        // channelKeys.create(_storageToken!)
        //   .then((handle) => { resolve(handle) })
        //   .catch((e) => { reject(e) })
        channelKeys.create(_storageToken!)
          .then((c) => { resolve(c.handle) })
          .catch((e) => { reject(e) })
      } catch (e) {
        const msg = `Creating channel did not succeed: ${e}`; console.error(msg); reject(msg);
      }
    })
  }

  /**
   * Connects to :term:`Channel` on this channel server. Returns a Channel  if
   * no message handler is provided; if onMessage is provided then it returns a
   * ChannelSocket.
   */

  connect(handleOrKey: SBChannelHandle | SBUserPrivateKey): Channel
  connect(handleOrKey: SBChannelHandle | SBUserPrivateKey, onMessage: (m: Message | string) => void): ChannelSocket
  connect(handleOrKey: SBChannelHandle | SBUserPrivateKey, onMessage?: (m: Message | string) => void): Channel | ChannelSocket {
    let handle: SBChannelHandle
    if (typeof handleOrKey === 'string') {
      handle = {
        userPrivateKey: handleOrKey as SBUserPrivateKey
      }
    } else {
      handle = handleOrKey as SBChannelHandle
      if (!_check_SBChannelHandle(handle))
        throw new SBError('[Snackabra.connect] Invalid parameter (not a channel handle)')
    }
    _sb_assert(handle !== undefined && handle && handle.userPrivateKey, '[Snackabra.connect] Invalid parameter (at least need owner private key)')
    if (handle.channelServer && handle.channelServer !== this.#channelServer)
      throw new SBError(`[Snackabra.connect] channel server in handle ('${handle.channelServer}') does not match what SB was set up with ('${this.#channelServer}')`)
    if (!handle.channelServer) handle.channelServer = this.#channelServer
    if (DBG) console.log("++++ Snackabra.connect() ++++", handle)
    if (onMessage)
      return new ChannelSocket(handle, onMessage)
    else
      return new Channel(handle)
  }

  /**
   * Closes all active operations and connections, including any fetches
   * and websockets. This closes EVERYTHING (globally).
   */
  static async closeAll() {
    console.log(SEP, "==== Snackabra.closeAll() called ====", SEP)
    if (Snackabra.isShutdown) {
      console.warn("closeAll() called, but it was already shutting down")
      return; // only one instance of closeAll()
    }
    Snackabra.isShutdown = true;
    Snackabra.activeFetches.forEach(controller => controller.abort('Snackabra.closeAll() called'));
    Snackabra.activeFetches.clear();

    console.log("[Snackabra] [closeAll] closing all active channel sockets:", Snackabra.#activeChannelSockets)
    await Promise.all(Array.from(Snackabra.#activeChannelSockets).map(close));

    // we block a fraction of a second here to give everything time to propagate
    console.log("[Snackabra] [closeAll] ... waiting for everything to close ...")
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  /**
   * Gets server information on provided server. Note, this will return 'undefined'
   * if the server is not reachable (it will not throw).
   */
  static async getServerInfo(server: string = Snackabra.defaultChannelServer): Promise<SBServerInfo | undefined> {
    try {
      const r = await SBApiFetch(server + '/api/v2/info');
      if (DBG0) console.log(SEP, `[getServerInfo] Fetching server info from '${server}' ++++\n`, r, SEP)
      if (r && r.maxMessageRequestSize)
        Snackabra.MAX_MESSAGE_REQUEST_SIZE = r.maxMessageRequestSize
      return r
    } catch (e) {
      if (DBG0) console.warn(`[getServerInfo] Could not access server '${server}'`)
      return undefined
    }
  }

  /*
   * Will cause 'debugger' to be called when the specified shard is ever fetched,
   * facilitating debugging.
   */
  static traceShard(id: string) {
    Snackabra.shardBreakpoints.add(id)
  }

  /** Returns the storage API */
  @Memoize get storage() { return this.#storage; }

  /** Returns matching storage server */
  @Memoize async getStorageServer(): Promise<string> {
    return this.storage.getStorageServer()
  }

  /** Returns the crypto API */
  get crypto(): SBCrypto { return sbCrypto; }

  /** Returns version of jslib */
  get version(): string { return Snackabra.version; }

} /* class Snackabra */

export {
  SB384,
  // SBMessage,
  Channel,
  ChannelSocket,
  Snackabra,
  arrayBufferToBase64url,
  base64ToArrayBuffer,
  arrayBufferToBase62,
  base62ToArrayBuffer,
  setDebugLevel,
};

export var SB = {
  Snackabra: Snackabra,
  // SBMessage: SBMessage,
  Channel: Channel,
  SBCrypto: SBCrypto,
  SB384: SB384,
  arrayBufferToBase64url: arrayBufferToBase64url,
  base64ToArrayBuffer: base64ToArrayBuffer,
  arrayBufferToBase62: arrayBufferToBase62,
  base62ToArrayBuffer: base62ToArrayBuffer,
  sbCrypto: sbCrypto,
  setDebugLevel: setDebugLevel,
};

if (!(globalThis as any).SB)
  (globalThis as any).SB = SB;

console.warn(`==== SNACKABRA jslib (re)loaded, version '${Snackabra.version}' ====`);

//#endregion
