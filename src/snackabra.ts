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

const version = '2.0.0-alpha.5 (build 082)' // working on 2.0.0 release

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

export function validate_SBStorageToken(data: SBStorageToken): SBStorageToken {
  if (!data) throw new SBError(`invalid SBStorageToken (null or undefined)`)
  else if (data[SB_STORAGE_TOKEN_SYMBOL]) return data as SBStorageToken
  else if (typeof data === 'string' && (data as string).slice(0, 4) === SBStorageTokenPrefix)
    // if at runtime we get just the hash, we 'upgrade' the type to help caller
    return { [SB_STORAGE_TOKEN_SYMBOL]: true, hash: data as string } as SBStorageToken
  else if (
    data.hash && typeof data.hash === 'string' && data.hash.length > 0
    && (!data.size || Number.isInteger(data.size) && data.size > 0)
    && (!data.motherChannel || typeof data.motherChannel === 'string')
    && (!data.created || Number.isInteger(data.created))
    && (!data.used || typeof data.used === 'boolean')
  ) {
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

function _checkChannelHandle(data: SBChannelHandle) {
  return (
    data.userPrivateKey && typeof data.userPrivateKey === 'string' && data.userPrivateKey.length > 0
    && (!data.channelId || (typeof data.channelId === 'string' && data.channelId.length === 43))
    && (!data.channelServer || typeof data.channelServer === 'string')
    && (!data.channelData || _checkChannelData(data.channelData))
  )
}

export function validate_SBChannelHandle(data: SBChannelHandle): SBChannelHandle {
  if (!data) throw new SBError(`invalid SBChannelHandle (null or undefined)`)
  else if (data[SB_CHANNEL_HANDLE_SYMBOL]) return data as SBChannelHandle
  else if (_checkChannelHandle(data)) {
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

function _checkChannelData(data: SBChannelData) {
  return (
    data.channelId && data.channelId.length === 43
    && data.ownerPublicKey && typeof data.ownerPublicKey === 'string' && data.ownerPublicKey.length > 0
    && (!data.storageToken || validate_SBStorageToken(data.storageToken))
  )
}

export function validate_SBChannelData(data: any): SBChannelData {
  if (!data) throw new SBError(`invalid SBChannelData (null or undefined)`)
  else if (_checkChannelData(data)) {
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
 * Dictionary
 * 
 * This is still used in a few places, should slowly be replaced by stronger typing.
 */
export interface Dictionary<T> {
  [index: string]: T;
}

// Time stamps are monotonically increasing. We enforce that they must be different.
// Stored as a string of [0-3] to facilitate prefix searches (within 4x time ranges).
// We append "0000" for future needs, for example if we need above 1000 messages per second.
// Can represent epoch timestamps for the next 400+ years.
function timestampToBase4String(tsNum: number) {
  return tsNum.toString(4).padStart(22, "0") + "0000" // total length 26
}

function base4StringToTimestamp(tsStr: string) {
  return parseInt(tsStr, 4)
}

export function composeMessageKey(channelId: SBChannelId, timestamp: number, subChannel: string = '____',) {
  return `${channelId}_${subChannel ?? '____'}_${timestampToBase4String(timestamp)}`
}

export function deComposeMessageKey(key: string) {
  const channelId = key.slice(0, 43)
  const subChannel = key.slice(44, 48)
  const timestamp = base4StringToTimestamp(key.slice(49))
  return { channelId, timestamp, subChannel }
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
  c?: ArrayBuffer, // encrypted contents
  iv?: Uint8Array, // nonce, always present whether needed by protocol or not (12 bytes)
  salt?: ArrayBuffer, // salt, always present whether needed by protocol or not (16 bytes)
  s?: ArrayBuffer, // signature
  ts?: number, // timestamp at point of encryption, by client, verified along with encrypt/decrypt

  // the remainder are either optional (with default values), internally used,
  // server provided, or can be reconstructed
  channelId?: SBChannelId, // channelId base62 x 43
  i2?: string, // subchannel; default is '____', can be any 4xbase62; only owner can read/write subchannels
  sts?: number, //  timestamp from server
  timestampPrefix?: string, // string/base4 encoding of timestamp (see timestampToBase4String)
  _id?: string, // channelId + '_' + subChannel + '_' + timestampPrefix

  // whatever is being sent; should (must) be stripped when sent
  // when encrypted, this is packaged as payload (and then encrypted)
  // (signing is done on the payload version)
  // internally before sending, it's referenced as-is
  unencryptedContents?: any,

  ready?: boolean, // if present, signals other side is ready to receive messages (rest of message ignored)
  t?: SBUserId, // 'to': public (hash) of recipient; note that Owner sees all messages; if omitted means broadcast
  ttl?: number, // Value 0-15; if it's missing it's 15/0xF (infinite); if it's 1-7 it's duplicated to subchannels
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
    && (!body.ttl || (Number.isInteger(body.ttl) && body.ttl >= 0 && body.ttl <= 15))
  ) {
    return { ...body, [SB_CHANNEL_MESSAGE_SYMBOL]: true } as ChannelMessage
  } else {
    if (DBG2) console.error('invalid ChannelMessage ... trying to ingest:\n', body)
    throw new SBError(`invalid ChannelMessage`)
  }
}

// safety/privacy measures; also economizing on storage
export function stripChannelMessage(msg: ChannelMessage): ChannelMessage {
  if (DBG) console.log('stripping message:\n', msg)
  const ret: ChannelMessage = {}
  if (msg.f !== undefined) ret.f = msg.f; else throw new SBError("ERROR: missing 'f' ('from') in message")
  if (msg.c !== undefined) ret.c = msg.c; else throw new SBError("ERROR: missing 'ec' ('encrypted contents') in message")
  if (msg.iv !== undefined) ret.iv = msg.iv; else throw new SBError("ERROR: missing 'iv' ('nonce') in message")
  if (msg.salt !== undefined) ret.salt = msg.salt; else throw new SBError("ERROR: missing 'salt' in message")
  if (msg.s !== undefined) ret.s = msg.s; else throw new SBError("ERROR: missing 's' ('signature') in message")
  if (msg.ts !== undefined) ret.ts = msg.ts; else throw new SBError("ERROR: missing 'ts' ('timestamp') in message")
  if (msg.sts !== undefined) ret.sts = msg.sts; else throw new SBError("ERROR: missing 'sts' ('servertimestamp') in message")
  if (msg.ttl !== undefined && msg.ttl !== 0xF) ret.ttl = msg.ttl; // optional, and we strip if set to default value
  if (msg.t !== undefined) ret.t = msg.t; // 'to', optional but if present is kept
  if (msg.i2 !== undefined && msg.i2 !== '____') ret.i2 = msg.i2; // optional, also we strip out default value
  return ret
}


export interface ChannelAdminData {
  channelId: SBChannelId,
  channelData: SBChannelData,
  capacity: number,
  locked: boolean,
  accepted: Set<SBUserId>,
  visitors: Map<SBUserId, SBUserPublicKey>,
  storageLimit: number,
  motherChannel: SBChannelId,
  lastTimestamp: number,
}

/**
 * This is eseentially web standard type AesGcmParams, but
 * with properties being optional - they'll be filled in
 * at the "bottom layer" if missing (and if needed).
 */
export interface EncryptParams {
  name?: string;
  iv?: ArrayBuffer;
  additionalData?: BufferSource;
  tagLength?: number;
}

// these are toggled/reset (globally) by ''new Snackabra(...)''
// they will stick to 'true' if any Snackabra object is created
var DBG = false;
var DBG2 = false; // note, if this is true then DBG will be true too

// in addition, for convenience (such as in test suites) we 'pick up' configuration.DEBUG
if ((globalThis as any).configuration && (globalThis as any).configuration.DEBUG === true) {
  DBG = true
  if (DBG) console.warn("++++ Setting DBG to TRUE based on 'configuration.DEBUG' ++++");
  if ((globalThis as any).configuration.DEBUG2 === true) {
    DBG2 = true
    if (DBG) console.warn("++++ ALSO setting DBG2 (verbose) ++++");
  }
}
// some cases we need explit access to poke these
function setDebugLevel(dbg1: boolean, dbg2?: boolean) {
  DBG = dbg1
  if (dbg2) DBG2 = dbg1 && dbg2
  if (DBG) console.warn("++++ [setDebugLevel]: setting DBG to TRUE ++++");
  if (DBG2) console.warn("++++ [setDebugLevel]: ALSO setting DBG2 to TRUE (verbose) ++++");
}

// index/number of seconds/string description of TTL values (0-15)
//
// (it's valid to encode it as four bits):
// 0	         0  Ephemeral (not stored)
// 1              <reserved>
// 2		          <reserved>
// 3	        60  One minute (current minimum)
// 4	       300  Five minutes
// 5	      1800  Thirty minutes
// 6	     14400  Four hours
// 7	    129600  36 hours
// 8      864000  Ten days
// 10             <reserved> (all 'reserved' future choices will be monotonically increasing)
// 11		          <reserved>
// 12		          <reserved>
// 13		          <reserved>
// 14		          <reserved>
// 15	  Infinity	Infinity
//
// Note that time periods above '8' is largely TBD pending finalization
// of what the storage server will prefer. As far as messages are concerned,
// anything above '8' is 'very long'. Thus for example, messages with a 'to'
// field (routable) may not have ttl above '8'.
export const msgTtlToSeconds = [0, -1, -1, 60, 300, 1800, 14400, 129600, 864000, -1, -1, -1, -1, -1, Infinity]
export const msgTtlToString = ['Ephemeral', '<reserved>', '<reserved>', 'One minute', 'Five minutes', 'Thirty minutes', 'Four hours', '36 hours', '10 days', '<reserved>', '<reserved>', '<reserved>', '<reserved>', '<reserved>', 'Permastore (no TTL)']

// export type SBObjectType = 'f' | 'p' | 'b' | 't' | '_' | 'T'
export type SBObjectHandleVersions = '1' | '2' | '3'
const currentSBOHVersion: SBObjectHandleVersions = '3'

/**
 * SBObjectHandle
 *
 * SBObjectHandle is a string that encodes the object type, object id, and
 * object key. It is used to retrieve objects from the storage server.
 *
 * - version is a single character string that indicates the version of the
 *   object handle. Currently, the following versions are supported:
 *
 *   - '1' : version 1 (legacy)
 *   - '2' : version 2 (legacy)
 *   - '3' : version 3 (current)
 *
 * - id is a 43 character base62 string that identifies the object. It is used
 *   to retrieve the object from the storage server.
 *
 * - key is a 43 character base62
 *
 * - verification is a random (server specific) string that is used to verify
 *   that you're allowed to access the object (specifically, that somebody,
 *   perhaps you, has paid for the object).
 *
 * - iv and salt are optional and not tracked by shard servers etc, but
 *   facilitates app usage. During a period of time (the 'privacy window') you
 *   can request these from the storage server. After that window they get
 *   re-randomized, and if you didn't keep the values (for example, you received
 *   an object but didn't do anything with it), then they're gone.
 * 
 * - storageServer is optional, if provided it'll be asked first
 *
 */
export interface SBObjectHandle {
  [SB_OBJECT_HANDLE_SYMBOL]?: boolean,

  // strictly speaking, only 'id' is required
  id: Base62Encoded,

  key?: Base62Encoded,
  verification?: Promise<string> | string,

  version?: SBObjectHandleVersions,
  type?: string, // for some backwards compatibility, no longer used

  iv?: Uint8Array | Base62Encoded,
  salt?: ArrayBuffer | Base62Encoded,

  storageServer?: string,

  fileName?: string, // by convention will be "PAYLOAD" if it's a set of objects
  dateAndTime?: string, // optional: time of shard creation
  fileType?: string, // optional: file type (mime)
  lastModified?: number, // optional: last modified time (of underlying file, if any)
  actualSize?: number, // optional: actual size of underlying file, if any
  savedSize?: number, // optional: size of shard (may be different from actualSize)

  data?: WeakRef<ArrayBuffer> | ArrayBuffer, // if present, the actual data
  payload?: any // if present, for convenience a spot for extractPayload(rawData).payload
}

export function validate_SBObjectHandle(h: SBObjectHandle) {
  if (!h) throw new SBError(`invalid SBObjectHandle (null or undefined)`)
  else if (h[SB_OBJECT_HANDLE_SYMBOL]) return h as SBObjectHandle
  else if (
       (!h.version || h.version === '3') // anything 'this' code sees needs to be v3
    && h.id && typeof h.id === 'string' && h.id.length === 43
    && (!h.key || (typeof h.key === 'string' && h.key.length === 43))
    && (!h.verification || typeof h.verification === 'string' || typeof h.verification === 'object')
    && (!h.iv || typeof h.iv === 'string' || h.iv instanceof Uint8Array)
    && (!h.salt || typeof h.salt === 'string' || h.salt instanceof ArrayBuffer)
  ) {
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
//#region - MessageBus

/**
 * MessageBus
 */
export class MessageBus {
  bus: Dictionary<any> = {}

  /**
   * Safely returns handler for any event
   */
  #select(event: string) {
    return this.bus[event] || (this.bus[event] = []);
  }

  /**
   * Subscribe. 'event' is a string, special case '*' means everything
   *  (in which case the handler is also given the message)
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
//#region - Utility functions (exported)

export class SBError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    if (typeof (Error as any).captureStackTrace === 'function')
      (Error as any).captureStackTrace(this, this.constructor);
    else
      this.stack = (new Error(message)).stack;
    if (DBG2) {
      let atLine = null
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
    // console.log(`will set ${buffer.byteLength} random bytes`)
    // const t0 = Date.now()
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
    // console.log(`created ${buffer.byteLength} random byte buffer in ${Date.now() - t0} millisends`)
    return buffer
  }
}

//#endregion

/******************************************************************************************************/
//#region - Internal utility functions

// Centralized path for fetch()
function SBFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, init ?? { method: 'GET', headers: { 'Content-Type': 'application/json' } })
    .then((response) => {
      return (response); // we don't check for status here, we'll do that in the caller
    }).catch((error) => {
      const msg = `[SBFetch] Error performing fetch() (this might be normal): ${error}`;
      console.warn(msg); // not necessarily an error but helps trace up through callee
      throw new SBError(msg);
    });
}

/**
 * Wrapper to SBFetch that applies SB API calling conventions on both sides of
 * the call; it will return whatever data structure the server returns, note
 * that it will extract the reply (either from json or from payload). if there
 * are any issues or if the reply contains an error message, it will throw an
 * error.
 */
export async function SBApiFetch(input: RequestInfo | URL, init?: RequestInit) {
  let response
  try {
    response = await SBFetch(input, init)
    if (!response) throw new SBError("[SBApiFetch] Server did not respond (might be expected)");
    // if (!response || !response.ok) {
    //   // read the json error message if it's there
    //   const json = await response.json()
    //   let msg = '[SBApiFetch] Server responded with error\n'
    //   if (response.statusText) msg += `Status text: ('${response.statusText}')\n`
    //   if (json.error) msg +=          `Error msg:   ('${json.error}')\n`
    //   if (DBG) console.log(msg)
    //   reject(msg); return;
    // }
    const contentType = response.headers.get('content-type');
    var retValue: any
    if (!contentType) {
      throw new SBError("[SBApiFetch] Server did not respond (might be expected) (no content header)");
    } else if (contentType.indexOf("application/json") !== -1) {
      const json = await response.json()
      if (DBG2) console.log(`[SBApiFetch] json ('${json}'):\n`, json)
      retValue = jsonParseWrapper(json, "L489");
    } else if (contentType.indexOf("application/octet-stream") !== -1) {
      retValue = extractPayload(await response.arrayBuffer()).payload
    } else {
      throw new SBError("[SBApiFetch] Server responded with unknown content-type header (?)");
    }
    if (!response.ok || !retValue || retValue.error || retValue.success === false) {
      let apiErrorMsg = '[SBApiFetch] Network or Server error or cannot parse response'
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
 * Appends two buffers and returns a new buffer
 */
function _appendBuffer(buffer1: Uint8Array | ArrayBuffer, buffer2: Uint8Array | ArrayBuffer): ArrayBuffer {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
}

/*
 * TL;DR on the 'base64 issue' (and it's a moving target):
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
 * Phew. In our case, since we're not processing large amounts of base64 data
 * (which btoa() and atob() are not well-suited for anyway), we choose to
 * implement our own base64 encoding/decoding functions for simplicity and
 * consistent cross-environment functionality. And since our only real use case
 * is JWK, we only implement the base64url variant. For all other
 * binary-in-text-form situations, we use base62.
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

// parts of strongpin is patented pending by 384, inc. permission to use is granted
// in conjunction with jslib in GPL-3.0-only context, and not for any other use,
// as set out in more detail in the LICENSE file in the root of this repository.

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
    let payload = _appendBuffer(new Uint8Array(metadataSize.buffer), new Uint8Array(metadataBuffer));
    for (let i = 0; i < BufferList.length; i++) {
      payload = _appendBuffer(new Uint8Array(payload), BufferList[i]);
    }

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
  return _appendBuffer(new Uint8Array([0xAA, 0xBB, 0xBB, 0xAA]), mainPayload);
}

function deserializeValue(buffer: ArrayBuffer, type: string): any {
  switch (type) {
    case 'o':
      return _extractPayload(buffer);
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

  /** Basic (core) method to construct a ChannelMessage */
  async wrap(
    body: any,
    sender: SBUserId,
    encryptionKey: CryptoKey,
    salt: ArrayBuffer,
    signingKey: CryptoKey,
    options?: MessageOptions): Promise<ChannelMessage> {
    _sb_assert(body && sender && encryptionKey && signingKey, "wrapMessage(): missing required parameter(2)")
    const payload = assemblePayload(body);
    _sb_assert(payload, "wrapMessage(): failed to assemble payload")
    _sb_assert(payload!.byteLength < MAX_SB_BODY_SIZE,
      `wrapMessage(): body must be smaller than ${MAX_SB_BODY_SIZE / 1024} KiB (we got ${payload!.byteLength / 1024} KiB)})`)
    _sb_assert(salt, "wrapMessage(): missing salt")
    if (DBG2) console.log("will wrap() body, payload:\n", SEP, "\n", body, "\n", SEP, payload, "\n", SEP)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const timestamp = Math.round(Date.now() / 25) * 25 // fingerprinting protection
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, timestamp);
    var message: ChannelMessage = {
      f: sender,
      c: await sbCrypto.encrypt(payload!, encryptionKey, { iv: iv, additionalData: view }),
      iv: iv,
      salt: salt,
      s: await sbCrypto.sign(signingKey, payload!),
      ts: timestamp,
      // unencryptedContents: body, // 'original' payload' .. we do NOT include this
    }
    if (DBG2) console.log("wrap() message is\n", message)
    if (options) {
      if (options.sendTo) message.t = options.sendTo
      if (options.ttl) message.ttl = options.ttl
      if (options.subChannel) throw new SBError(`wrapMessage(): subChannel not yet supported`)
    }
    try {
      message = validate_ChannelMessage(message)
    } catch (e) {
      const msg = `wrapMessage(): failed to validate message: ${e}`
      console.error(msg)
      throw new SBError(msg)
    }
    return message
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

// Decorator
// asserts any types that are SB classes are valid
// we're not quite doing this yet. interfaces would be more important to handle in this manner,
// however even with new (upcoming) additional type metadata for decorators, can't yet be done.
function VerifyParameters(_target: any, _propertyKey: string /* ClassMethodDecoratorContext */, descriptor?: PropertyDescriptor): any {
  if ((descriptor) && (descriptor.value)) {
    const operation = descriptor.value
    descriptor.value = function (...args: any[]) {
      for (let x of args) {
        const m = x.constructor.name
        if (isSBClass(m)) _sb_assert(SBValidateObject(x, m), `invalid parameter: ${x} (expecting ${m})`)
      }
      return operation.call(this, ...args)
    }
  }
}

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

const SB_CLASS_ARRAY = ['SBMessage', 'SBObjectHandle', 'SBChannelHandle', 'ChannelApiBody'] as const

type SB_CLASS_TYPES = typeof SB_CLASS_ARRAY[number]
type SB_CLASSES = SBMessage | SBObjectHandle | SBChannelHandle

const SB_CHANNEL_MESSAGE_SYMBOL = Symbol('SB_CHANNEL_MESSAGE_SYMBOL')
const SB_CHANNEL_API_BODY_SYMBOL = Symbol('SB_CHANNEL_API_BODY_SYMBOL')
const SB_CHANNEL_HANDLE_SYMBOL = Symbol('SBChannelHandle')
const SB_MESSAGE_SYMBOL = Symbol.for('SBMessage')
const SB_OBJECT_HANDLE_SYMBOL = Symbol.for('SBObjectHandle')
const SB_STORAGE_TOKEN_SYMBOL = Symbol.for('SBStorageToken')

function isSBClass(s: SB_CLASSES): boolean {
  return typeof s === 'string' && SB_CLASS_ARRAY.includes(s as SB_CLASS_TYPES)
}

function SBValidateObject(obj: SBChannelHandle, type: 'SBChannelHandle'): boolean
function SBValidateObject(obj: SBObjectHandle, type: 'SBObjectHandle'): boolean
function SBValidateObject(obj: SBMessage, type: 'SBMessage'): boolean
function SBValidateObject(obj: SB_CLASSES | any, type: SB_CLASS_TYPES): boolean {
  switch (type) {
    case 'SBMessage': return SB_MESSAGE_SYMBOL in obj
    case 'SBObjectHandle': return SB_OBJECT_HANDLE_SYMBOL in obj
    case 'SBChannelHandle': return SB_OBJECT_HANDLE_SYMBOL in obj
    default: return false
  }
}

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

const SEP = "============================================================\n";

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
  * Like most SB classes, SB384 follows the "ready template" design
  * pattern: the object is immediately available upon creation,
  * but isn't "ready" until it says it's ready. See `Channel Class`_
  * example below. Getters will throw exceptions if the object
  * isn't sufficiently initialized. Also see Design Note [4]_.
  * 
  * { @link https://snackabra.io/jslib.html#dn-004-the-ready-pattern }
  *
  * @param key a jwk with which to create identity; if not provided,
  * it will 'mint' (generate) them randomly, in other words it will
  * default to creating a new identity ("384").
  * 
  * @param forcePrivate if true, will force SB384 to include private
  * key; it will throw an exception if the key is not private.
  * If SB384 is used to mint, then it's always private.
  * 
  * The important "externally visible" formats are:
  * 
  * - userId(): unique hash of contents of public key, shorter format
  *   (256 bits, 43 x base62), cannot be used to reconstruct key,
  *   used to identify users (and channels)
  * 
  * - userPublicKey(): encodes core public key info ('x' and 'y' fields),
  *   as a base62 string (with a unique prefix). This is 'wire' format
  *   as well as human-readable. 
  * 
  * - userPrivateKey(): similar to public key format, adds the 'd' field
  *   information (embedded), from this format a full private key can
  *   be reconstructed.
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
        const channelBytes = _appendBuffer(base64ToArrayBuffer(this.#x!), base64ToArrayBuffer(this.#y!))
        const rawHash = await crypto.subtle.digest('SHA-256', channelBytes)
        this.#hash = arrayBufferToBase62(rawHash)

        // we also create a base32 version of the hash, for use in channel ids (Pages)
        const hashBigInt = BigInt('0x' + Array.from(new Uint8Array(rawHash)).map(b => b.toString(16).padStart(2, '0')).join('')) >> 28n;
        this.#hashB32 =  Array.from({ length: 12 }, (_, i) => b32encode(Number((hashBigInt >> BigInt(19 * (11 - i))) & 0x7ffffn))).join('');
        
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
   * This is deterministic. Important use case is to translate a user id
   * into a channel id (eg the channel that any user id is inherently
   * the owner of).
   * 
   * The hash is base64 encoding of the SHA-384 hash of the public key,
   * taking the 'x' and 'y' fields. Note that it is slightly restricted, it only
   * allows [A-Za-z0-9], eg does not allow the '_' or '-' characters. This makes the
   * encoding more practical for end-user interactions like copy-paste. This
   * is accomplished by simply re-hashing until the result is valid. This 
   * reduces the entropy of the channel ID by a neglible amount. 
   * 
   * Note this is not b62 encoding, which we use for 256-bit entities. This
   * is still ~384 bits (e.g. x and y fields are each 384 bits, but of course
   * the underlying total entropy isn't that (exercise left to the reader).
   * 
   * NOTE: if you ever need to COMPARE hashes, the short version is that
   * you cannot do so in the general case: you need to use sbCrypto.compareHashWithKey()
   */
  @Memoize @Ready get hash(): SB384Hash { return this.#hash! }
  @Memoize @Ready get hashB32(): SB384Hash { return this.#hashB32! }

  // convenience getter
  @Memoize @Ready get userId(): SB384Hash { return this.hash }

  /** ChannelID that corresponds to this, if it's an owner */
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

  @Memoize @Ready get signKey(): CryptoKey { return this.#signKey! }

  /** @type {CryptoKey} This should always be present */
  @Memoize @Ready get publicKey(): CryptoKey { return this.#publicUserKey! }

  /** For 'jwk' format use cases. @type {JsonWebKey} */
  // @Memoize @Ready get exportable_pubKey() { return sbCrypto.extractPubKey(this.#jwk!)! }

  /** @type {JsonWebKey} */
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

  /** @type {JsonWebKey} */
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


} /* class SB384 */
//#endregion

/******************************************************************************************************/
//#region Channel, ChannelSocket, SBMessage

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
        const ownerPrivateKey = handleOrKey as SBUserPrivateKey
        super(ownerPrivateKey, true)
      } else if (_checkChannelHandle(handleOrKey)) {
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
        await this.sb384Ready; _sb_assert(this.private, "Internal Error (L2476)")
        if (!this.#channelId) {
          // if channelId wasn't provided upon construction, then we're owner
          this.#channelId = this.ownerChannelId
          this.#channelData = {
            channelId: this.#channelId,
            ownerPublicKey: this.userPublicKey,
          }
        } else if (!this.#channelData) {
          // we're not owner, and we haven't gotten the ownerPublicKey, so we need to ask the server
          if (!this.channelServer)
            throw new SBError("SBChannelKeys() constructor: either key is owner key, or handle contains channelData, or channelServer is provided ...")
          if (DBG) console.log("++++ SBChannelKeys being initialized from server")
          var cpk: SBChannelData = await this.callApi('/getChannelKeys')
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
  // get readyFlag() { return this.SBChannelKeysReadyFlag }
  get SBChannelKeysReadyFlag() { return (this as any)[SBChannelKeys.ReadyFlag] }

  @Memoize @Ready get channelData() { return this.#channelData! }

  @Memoize @Ready get owner() { return this.private && this.ownerChannelId && this.channelId && this.ownerChannelId === this.channelId }
  @Memoize @Ready get channelId() { return this.#channelId }

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
    const timestamp = Math.round(Date.now() / 25) * 25 // fingerprinting protection
    const viewBuf = new ArrayBuffer(8);
    const view = new DataView(viewBuf);
    view.setFloat64(0, timestamp);
    const pathAsArrayBuffer = new TextEncoder().encode(path).buffer
    const prefixBuf = _appendBuffer(viewBuf, pathAsArrayBuffer)
    const apiPayloadBuf = apiPayload ? assemblePayload(apiPayload)! : undefined
    // sign with userId key, covering timestamp + path + apiPayload
    const sign = await sbCrypto.sign(this.signKey, apiPayloadBuf ? _appendBuffer(prefixBuf, apiPayloadBuf) : prefixBuf)
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
}

/**
 * Every message being sent needs to at some point be in the form
 * of an SBMessage object. Upon creation, the provided contents
 * (which can be any JS object pretty much) is encrypted and
 * wrapped in a ChannelMessage object, which is what is later
 * sent to the channel (or socket).
 */
class SBMessage {
  [SB_MESSAGE_SYMBOL] = true
  sbMessageReady: Promise<SBMessage>
  static ReadyFlag = Symbol('SBMessageReadyFlag'); // see below for '(this as any)[<class>.ReadyFlag] = false;'
  #message?: ChannelMessage   // the message that's set to send
  salt: ArrayBuffer

  /**
   * SBMessage
   * 
   * Body should be below 32KiB, though it tolerates up to 64KiB
   *
   */
  constructor(
    public channel: Channel,
    public contents: any,
    public options: MessageOptions = {}
  ) {
    // there is always salt, whether or not the protocol needs it
    this.salt = crypto.getRandomValues(new Uint8Array(16)).buffer;
    this.sbMessageReady = new Promise<SBMessage>(async (resolve) => {
      await channel.channelReady
      if (!this.options.protocol) this.options.protocol = channel.protocol
      if (!this.options.protocol) throw new SBError("SBMessage() - no protocol provided")
      this.#message = await sbCrypto.wrap(
        this.contents,
        this.channel.userId,
        await this.options.protocol.encryptionKey(this),
        this.salt,
        this.channel.signKey,
        options);
      (this as any)[SBMessage.ReadyFlag] = true
      resolve(this)
    })
  }

  get ready() { return this.sbMessageReady }
  get SBMessageReadyFlag() { return (this as any)[SBMessage.ReadyFlag] }
  @Ready get message() { return this.#message! }

  /**
   * SBMessage.send()
   */
  async send() {
    if (DBG2) console.log("SBMessage.send() - sending message:", this.message)
    await this.ready
    return this.channel.callApi('/send', this.message)
    // return this.channel.send(this)
  }
} /* class SBMessage */

/**
 * Key exchange protocol. (Note that SBMessage always includes
 * a reference to the channel)
 */
export interface SBProtocol {
  // if the protocol doesn't 'apply' to the message, this should throw
  encryptionKey(msg: SBMessage): Promise<CryptoKey>;
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

  async encryptionKey(msg: SBMessage): Promise<CryptoKey> {
    if (DBG) console.log("CALLING Protocol_AES_GCM_384.encryptionKey(), salt:", msg.salt)
    return this.#getMessageKey(msg.salt)
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
 */
export class Protocol_ECDH implements SBProtocol {
  #keyMap: Map<string, CryptoKey> = new Map();

  constructor() { /* this protocol depends on channel and recipient only */ }

  async encryptionKey(msg: SBMessage): Promise<CryptoKey> {
    await msg.channel.ready;
    const channelId = msg.channel.channelId!;
    _sb_assert(channelId, "Internal Error (L2565)");
    const sendTo = msg.options.sendTo ? msg.options.sendTo : msg.channel.channelData.ownerPublicKey;
    return this.#getKey(channelId, sendTo, msg.channel.privateKey);
  }

  async decryptionKey(channel: any, msg: ChannelMessage): Promise<CryptoKey | undefined> {
    await channel.ready;
    const channelId = channel.channelId!;
    _sb_assert(channelId, "Internal Error (L2594)");
    const sentFrom = channel.visitors.get(msg.f)!;
    if (!sentFrom) {
      if (DBG) console.log("Protocol_ECDH.key() - sentFrom is unknown");
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


// // same as in servers / workers.ts
// const textLikeMimeTypes: Set<string> = new Set([
//   "text/plain", "text/html", "text/css", "text/javascript", "text/xml", "text/csv", "application/json",
//   "application/javascript", "application/xml", "application/xhtml+xml", "application/rss+xml",
//   "application/atom+xml", "image/svg+xml",
// ]);


/**
 * Join a channel, taking a channel handle. Returns channel object.
 *
 * You must have an identity when connecting, because every single
 * message is signed by sender.
 *
 * Most classes in SB follow the "ready" template: objects can be used
 * right away, but they decide for themselves if they're ready or not.
 * The SB384 state is the *user* of the channel, not the channel
 * itself; it has an Owner (also SB384 object), which can be the
 * same as the user/visitor, but that requires finalizing creating
 * the channel to find out (from the channel server).
 * 
 * The Channel class communicates asynchronously with the channel.
 * 
 * The ChannelSocket class is a subclass of Channel, and it communicates
 * synchronously (via websockets).
 * 
 * Protocol is called for every message to get the CryptoKey to use
 * for that message; if provided, then it's the default for each
 * message. Individual messages can override this. Upon sending, one
 * or the other needs to be there.
 * 
 * Note that you don't need to worry about what API calls involve race
 * conditions and which don't, the library will do that for you.
 * 
 */
class Channel extends SBChannelKeys {
  channelReady: Promise<Channel>
  static ReadyFlag = Symbol('ChannelReadyFlag'); // see below for '(this as any)[Channel.ReadyFlag] = false;'
  locked?: boolean = false // TODO: need to make sure we're tracking whenever this has changed
  // this is actually info for lock status, and is now available to Owner (no admin status anymore)
  // adminData?: Dictionary<any> // todo: make into getter
  // verifiedGuest: boolean = false
  #cursor: string = ''; // last (oldest) message key seen
  // #protocol?: SBProtocol

  visitors: Map<SBUserId, SBUserPrivateKey> = new Map()

  /**
   * Channel
   */
  constructor()
  constructor(key: SBUserPrivateKey, protocol?: SBProtocol)
  constructor(handle: SBChannelHandle, protocol?: SBProtocol)
  constructor(handleOrKey?: SBChannelHandle | SBUserPrivateKey, public protocol?: SBProtocol) {
    if (handleOrKey === null) throw new SBError(`Channel() constructor: you cannot pass 'null'`)
    if (DBG2) console.log("Channel() constructor called with handleOrKey:", handleOrKey)
    super(handleOrKey);
    // this.protocol = protocol ? protocol : new BasicProtocol(this)
    // if (protocol) this.protocol = protocol
    this.channelReady =
      this.sbChannelKeysReady
        .then(() => {
          (this as any)[Channel.ReadyFlag] = true;
          return this;
        })
        .catch(e => { throw e; });
  }

  get ready() { return this.channelReady }
  get ChannelReadyFlag(): boolean { return (this as any)[Channel.ReadyFlag] }

  // @Memoize @Ready get protocol() { return this.#protocol }
  @Memoize @Ready get api() { return this } // for compatibility

  /**
   * Takes a 'ChannelMessage' format and presents it as a 'Message'.
   * Does a variety of things. If there is any issue, will return 'undefined',
   * and you should probably just ignore the message. Only requirement
   * is you extract payload before calling this (sometimes the callee
   * needs to, or wants to, fill in things in ChannelMessage)
   */
  async extractMessage(msgRaw: ChannelMessage): Promise<Message | undefined> {
    if (DBG) console.log("[extractMessage] Extracting message:", msgRaw)
    try {
      msgRaw = validate_ChannelMessage(msgRaw)
      const f = msgRaw.f // protocols may use 'from', so needs to be in channel visitor map
      if (!f) return undefined
      if (!this.visitors.has(f)) {
        if (DBG2) console.log("++++ [extractMessage]: need to update visitor table ...")
        const visitorMap = await this.callApi('/getPubKeys')
        if (!visitorMap || !(visitorMap instanceof Map)) return undefined
        if (DBG2) console.log(SEP, "visitorMap:\n", visitorMap, "\n", SEP)
        for (const [k, v] of visitorMap) {
          if (DBG2) console.log("++++ [extractMessage]: adding visitor:", k, v)
          this.visitors.set(k, v)
        }
      }
      _sb_assert(this.visitors.has(f), `Cannot find sender userId hash ${f} in public key map`)
      const k = await this.protocol?.decryptionKey(this, msgRaw)
      if (!k) return undefined
      try {
        // const body = await sbCrypto.extractMessage(k!, msgRaw)
        // extractMessage(k: CryptoKey, o: ChannelMessage): Promise<any> {

        if (!msgRaw.ts) throw new SBError(`unwrap() - no timestamp in encrypted message`)
        const { c: t, iv: iv } = msgRaw // encryptedContentsMakeBinary(o)
        _sb_assert(t, "[unwrap] No contents in encrypted message (probably an error)")
        const view = new DataView(new ArrayBuffer(8));
        view.setFloat64(0, msgRaw.ts);
        const bodyBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv, additionalData: view }, k, t!)

        // const m: Message = {
        //   body: contents,
        //   channelId: message.channelId!,
        //   sender: message.f!,
        //   senderPublicKey: this.visitors.get(message.f!)!,
        //   senderTimestamp: message.ts!,
        //   serverTimestamp: message.sts!,
        //   _id: message._id!,
        // }

        if (!msgRaw._id)
          msgRaw._id = composeMessageKey(this.channelId!, msgRaw.sts!, msgRaw.i2)

        if(msgRaw.ttl !== undefined && msgRaw.ttl !== 15) console.warn(`[extractMessage] TTL->EOL missing (TTL set to ${msgRaw.ttl}) [L2762]`)

        // if (DBG) console.log("++++ [extractMessage]: (ChannelMessage):\n", channelMsg)
        // TODO: i get channelId and senderId identitical at times ...
        const msg: Message = {
          body: extractPayload(bodyBuffer).payload,
          channelId: this.channelId!,
          sender: f,
          senderPublicKey: this.visitors.get(f)!,
          senderTimestamp: msgRaw.ts!,
          serverTimestamp: msgRaw.sts!,
          // eol: msgRaw.eol, // ToDo: various places for TTL/EOL processing
          _id: msgRaw._id!,
        }
        return validate_Message(msg)
      } catch (e) {
        if (DBG) console.error("[extractMessage] Could not process message [L2766]:", e)
        return undefined
      }

    } catch (e) {
      if (DBG) console.error("[extractMessage] Could not process message [L2771]:", e)
      return undefined
    }
  }

  async extractMessageMap(msgMap: Map<string, ChannelMessage>): Promise<Map<string, Message>> {
    const ret = new Map<string, Message>()
    for (const [k, v] of msgMap) {
      const msg = await this.extractMessage(v)
      if (msg) ret.set(k, msg)
    }
    return ret
  }

  /** Authorizes/registers this channel on the provided server */
  create(storageToken: SBStorageToken, channelServer: SBChannelId = this.channelServer!): Promise<SBChannelHandle> {
    if (DBG) console.log("==== Channel.create() called with storageToken:", storageToken, "and channelServer:", channelServer)
    _sb_assert(storageToken !== null, '[Channel.create] Missing storage token')
    if (channelServer) this.channelServer = channelServer;
    _sb_assert(this.channelServer, '[Channel.create] Missing channel server (neither provided nor in channelKeys)')
    return new Promise<SBChannelHandle>(async (resolve, reject) => {
      await this.channelReady
      this.channelData.storageToken = validate_SBStorageToken(storageToken)
      if (DBG) console.log("Will try to create channel with channelData:", this.channelData)
      this.callApi('/budd', this.channelData)
        .then(() => {
          // in case it's different or whatevs, but only if it's confirmed
          this.channelServer = channelServer
          _sb_assert(this.channelData && this.channelData.channelId && this.userPrivateKey, 'Internal Error [L2546]')
          resolve({
            [SB_CHANNEL_HANDLE_SYMBOL]: true,
            channelId: this.channelData.channelId!,
            userPrivateKey: this.userPrivateKey,
            // channelPrivateKey: (await new SB384(channelKeys.channelPrivateKey).ready).userPrivateKey,
            channelServer: this.channelServer,
            channelData: this.channelData
          })
        }).catch((e) => { reject("Channel.create() failed: " + WrapError(e)) })
    })
  }

  /** Disabled for now  */
  getLastMessageTimes() {
    // ToDo: needs a few things fixed, see channel server source code
    throw new SBError("Channel.getLastMessageTimes(): not supported in 2.0 yet")
  }

  /**
   * Returns map of message keys from the server corresponding to the request.
   */
  getMessageKeys(currentMessagesLength: number = 100, paginate: boolean = false): Promise<Set<string>> {
    // todo: add IndexedDB caching - see above
    return new Promise(async (resolve, _reject) => {
      _sb_assert(this.channelId, "Channel.getMessageKeys: no channel ID (?)")
      // ToDO: we want to cache (merge) these messages into a local cached list (since they are immutable)
      // let cursorOption = paginate ? '&cursor=' + this.#cursor : '';
      //  const messages = await this.callApi('/getMessageKeys?currentMessagesLength=' + currentMessagesLength + cursorOption)
      const messages = await this.callApi(
        '/getMessageKeys',
        { currentMessagesLength: currentMessagesLength, cursor: paginate ? this.#cursor : undefined })
      // todo: empty is valid
      _sb_assert(messages, "Channel.getMessageKeys: no messages (empty/null response)")
      if (DBG2) console.log("getMessageKeys\n", messages)
      resolve(messages)
    });
  }

  // async decryptMessage(value: ArrayBuffer): Promise<Message | undefined> {
  //   if (!this.protocol) throw new SBError("Channel.get..Messages(): need protocol to decrypt messages")
  //   const msgBuf = extractPayload(value).payload
  //   if (DBG) console.log("++++ deCryptMessage: msgBuf:\n", msgBuf)
  //   const msgRaw = validate_ChannelMessage(msgBuf)
  //   if (DBG) console.log("++++ deCryptChannelMessage: validated")
  //   // const decryptedMessage = await this.deCryptChannelMessage(this, key, value)
  //   const msg = await this.extractMessage(msgRaw)
  //   return msg
  // }


  // get raw set of messages from the server
  getRawMessageMap(messageKeys: Set<string>): Promise<Map<string, ArrayBuffer>> {
    if (DBG) console.log("[getRawMessageMap] called with messageKeys:", messageKeys)
    if (messageKeys.size === 0) throw new SBError("[getRawMessageMap] no message keys provided")
    return new Promise(async (resolve, _reject) => {
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
    if (DBG) console.log("Channel.getDecryptedMessages() called with messageKeys:", messageKeys)
    if (messageKeys.size === 0) throw new SBError("[getMessageMap] no message keys provided")
    return new Promise(async (resolve, _reject) => {

      // _sb_assert(this.channelId, "Channel.getMessages: no channel ID (?)")
      const messagePayloads: Map<string, ArrayBuffer> = await this.callApi('/getMessages', messageKeys)
      // _sb_assert(messagePayloads, "Channel.getMessages: no messages (empty/null response)")
      

      // we want to iterate through all the entries in the map, and call 'deCryptChannelMessage' on each
      // one with parameters of the key and the value (which is the encrypted contents). if it failed
      // to decrypt, it will return 'undefined', otherwise we add the returned 'Message' object and
      // add it to a NEW map, which maps from the key to the decrypted message

      // const decryptedMessages = new Map<string, ChannelMessage>()
      // for (const [key, value] of messages.entries()) {
      //   const decryptedMessage = await this.decryptMessage(value)
      //   if (decryptedMessage) decryptedMessages.set(key, decryptedMessage)
      // }
      // if (DBG2) console.log(SEP, "and here are decrypted ones, hopefully\n", SEP, decryptedMessages, "\n", SEP)
      // resolve(decryptedMessages)7

      // we first have to apply extractPayload().payload to each value, and only
      // include entries that pass validate_ChannelMessage()
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

  @Ready async send(msg: any, options?: MessageOptions): Promise<string> {
    _sb_assert(!(msg instanceof SBMessage), "Channel.send: msg is already an SBMessage")
    return (new SBMessage(this, msg, options)).send()

    // const sbm: SBMessage = msg instanceof SBMessage ? msg : new SBMessage(this, msg)
    // const sbm: SBMessage = new SBMessage(this, msg, options)
    // await sbm.ready // message needs to be ready
    // return this.callApi('/send', sbm.message)
  }

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
    type = type || 'sb384payloadV3'
    if (type) {
      return this.callApi('/setPage', {
        page: page,
        type: type,
        prefix: prefix,
      })
    } else {
      return this.callApi('/setPage', page)
    }
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
    const page = await SBFetch(this.channelServer + '/api/v2/page/' + prefix)
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
} /* class Channel */

/**
   * ChannelSocket extends Channel. Use this instead of ChannelEndpoint if you
   * are going to be sending/receiving messages.
   * 
   * You send by calling channel.send(msg: SBMessage | string), i.e.
   * you can send a quick string.
   * 
   * You can set your message handler upon creation, or later by using
   * channel.onMessage = (m: ChannelMessage) => { ... }.
   * 
   * This implementation uses websockeds to connect all participating
   * clients through a single servlet (somewhere), with very fast
   * forwarding.
   * 
   * You don't need to worry about managing resources, like closing it,
   * or checking if it's open. It will close based on server behavior,
   * eg it's up to the server to close the connection based on inactivity.
   * The ChannelSocket will re-open if you try to send against a closed
   * connection. You can check status with channelSocket.status if you
   * like, but it shouldn't be necessary.
   * 
   * Messages are delivered as type ChannelMessage. Usually they are
   * simple blobs of data that are encrypted: the ChannelSocket will
   * decrypt them for you. It also handles a simple ack/nack mechanism
   * with the server transparently.
   * 
   * Be aware that if ChannelSocket doesn't know how to handle a certain
   * message, it will generally just forward it to you as-is. 
   * 
 */
class ChannelSocket extends Channel {
  // ready: Promise<ChannelSocket>
  channelSocketReady: Promise<ChannelSocket>
  // #ChannelSocketReadyFlag: boolean = false // must be named <class>ReadyFlag
  static ReadyFlag = Symbol('ChannelSocketReadyFlag'); // see below for '(this as any)[ChannelSocket.ReadyFlag] = false;'

  #ws: WSProtocolOptions
  // #sbServer: SBServer
  #socketServer: string

  onMessage = (_m: Message): void => { _sb_assert(false, "[ChannelSocket] NO MESSAGE HANDLER"); }
  #ack: Map<string, (value: string | PromiseLike<string>) => void> = new Map()
  #traceSocket: boolean = false // should not be true in production

  // #resolveFirstMessage: (value: ChannelSocket | PromiseLike<ChannelSocket>) => void = () => { _sb_exception('L2461', 'this should never be called') }
  // #firstMessageEventHandlerReference: (e: MessageEvent<any>) => void = (_e: MessageEvent<any>) => { _sb_exception('L2462', 'this should never be called') }


  constructor(handleOrKey: SBChannelHandle | SBUserPrivateKey, onMessage: (m: Message) => void) {
    // undefined (missing) is fine, but 'null' is not
    let channelServer: string | undefined

    if (handleOrKey === null) throw new SBError(`[ChannelSocket] constructor: you cannot pass 'null'`)
    if (handleOrKey) {
      // annoying TS limitation that we can't propagate a dual type
      if (typeof handleOrKey === 'string') {
        super(handleOrKey as SBUserPrivateKey) // we let super deal with it
      } else if (_checkChannelHandle(handleOrKey)) {
        const handle = validate_SBChannelHandle(handleOrKey)
        channelServer = handle.channelServer // might still be missing
        super(handle);
      } else {
        throw new SBError(`[ChannelSocket] constructor: invalid parameter (must be SBChannelHandle or SBUserPrivateKey)`)
      }
    } else {
      throw new SBError("[ChannelSocket] constructor: no handle or key provided (cannot 'create' using 'new ChannelSocket()'")
    }
    if (!channelServer) channelServer = Snackabra.defaultChannelServer // might throw

    _sb_assert(onMessage, '[ChannelSocket] constructor: no onMessage handler provided')
    
    // if (!handle.hasOwnProperty('channelId') || !handle.hasOwnProperty('userPrivateKey'))
    //   throw new SBError("ChannelSocket(): first argument must be valid SBChannelHandle")
    // if (!handle.channelServer)
    //   throw new SBError("ChannelSocket(): no channel server provided (required)")
    // super(handleOrKey) // initialize 'channel' parent

    ; (this as any)[ChannelSocket.ReadyFlag] = false;
    this.#socketServer = channelServer.replace(/^http/, 'ws')
    this.onMessage = onMessage
    const url = this.#socketServer + '/api/v2/channel/' + this.channelId + '/websocket'
    this.#ws = {
      url: url,
      // websocket: new WebSocket(url),
      ready: false,
      closed: false,
      timeout: 2000
    }
    this.channelSocketReady = this.#channelSocketReadyFactory()
  }

  #processMessage = async (e: MessageEvent<any>) => {
    if (DBG) console.log("Received socket message:", e)
    const msg = e.data
    var message: ChannelMessage | null = null
    _sb_assert(msg, "[ChannelSocket] received empty message")
    if (typeof msg === 'string') {
      console.error("ChannelSocket receiving string (json?) message, this is getting deprecated")
      message = jsonParseWrapper(msg, "L3589")
    } else if (msg instanceof ArrayBuffer) {
      message = extractPayload(msg).payload
    } else if (msg instanceof Blob) {
      message = extractPayload(await msg.arrayBuffer()).payload
    } else {
      _sb_exception("L3594", "[ChannelSocket] received unknown message type")
    }
    _sb_assert(message, "[ChannelSocket] cannot parse message")

    message = validate_ChannelMessage(message!) // throws if there's an issue
    // TODO: decrypt, validate signature, etc
    console.log(SEP, "Received socket message:\n", message, "\n", SEP)

    if (!message.channelId) message.channelId = this.channelId
    _sb_assert(message.channelId === this.channelId, "[ChannelSocket] received message for wrong channel?")

    if (this.#traceSocket) console.log("Received socket message:", message)

    // if (!message._id)
    //   message._id = composeMessageKey(message.channelId!, message.sts!, message.i2)

    // check if this message is one that we've recently sent (track 'ack')
    const hash = await crypto.subtle.digest('SHA-256', message.c!)
    const ack_id = arrayBufferToBase64url(hash)
    if (DBG) console.log("Received message with hash:", ack_id)
    const r = this.#ack.get(ack_id)
    if (r) {
      if (DBG || this.#traceSocket) console.log(`++++++++ #processMessage: found matching ack for id ${ack_id}`)
      this.#ack.delete(ack_id)
      r("success") // we first resolve that outstanding send (and then also deliver message)
    }

    // // const contents = await this.deCryptChannelMessage(this, message._id, message.c!)
    // const contents = await this.deCryptChannelMessage(this, message)

    // // we shuffle around the data into an easier-to-consume format
    // const m: Message = {
    //   body: contents,
    //   channelId: message.channelId!,
    //   sender: message.f!,
    //   senderPublicKey: this.visitors.get(message.f!)!,
    //   senderTimestamp: message.ts!,
    //   serverTimestamp: message.sts!,
    //   _id: message._id!,
    // }

    const m = await this.extractMessage(message)

    if (m) {
      if (DBG) console.log("Repackaged and will deliver 'Message':", m)
      // call user-provided message handler
      this.onMessage(m)
    } else {
      if (DBG) console.log("Message could not be parsed, will not deliver")
    }
  }

  #channelSocketReadyFactory() {
    return new Promise<ChannelSocket>(async (resolve, reject) => {
      if (DBG) console.log("++++ STARTED ChannelSocket.readyPromise()")
      const url = this.#ws.url

      if (!this.#ws.websocket || this.#ws.websocket.readyState === 3 || this.#ws.websocket.readyState === 2) {
        // either it's new, or it's closed, or it's in the process of closing
        // a WebSocket connection is always a 'GET', and there's no way to provide a body
        const apiBodyBuf = assemblePayload(await this.buildApiBody(url))
        _sb_assert(apiBodyBuf, "Internal Error [L3598]")
        // here's the only spot in the code where we actually open the websocket:
        this.#ws.websocket = new WebSocket(url + "?apiBody=" + arrayBufferToBase62(apiBodyBuf!))
      }

      this.#ws.websocket.addEventListener('message',
        (e: MessageEvent<any>) => {
          if (e.data && typeof e.data === 'string' && jsonParseWrapper(e.data, "L3618")?.hasOwnProperty('ready')) {
            // switch to main message processor
            this.#ws.websocket!.addEventListener('message', this.#processMessage)
              // we're ready
              ; (this as any)[ChannelSocket.ReadyFlag] = true;
            resolve(this)
          } else {
            if (DBG) console.log(SEP, "Received non-ready:\n", e.data, "\n", SEP)
            reject("[ChannelSocket] received something other than 'ready' as first message")
          }
        }
      )

      this.#ws.websocket.addEventListener('open', async () => {
        this.#ws.closed = false
        // need to make sure parent is ready (and has keys)
        await this.ready
        if (DBG) console.log("++++++++ readyPromise() sending init")
        // auth is done on setup, it's not needed for the 'ready' signal;
        // this will prompt server to send backlogged messages
        // this.#ws.websocket!.send(JSON.stringify({ ready: true }))
        this.#ws.websocket!.send(assemblePayload({ ready: true })!)
      });

      this.#ws.websocket.addEventListener('close', (e: CloseEvent) => {
        this.#ws.closed = true
        if (!e.wasClean) {
          console.log(`ChannelSocket() was closed (and NOT cleanly: ${e.reason} from ${this.channelServer}`)
        } else {
          if (e.reason.includes("does not have an owner"))
            // reject(`No such channel on this server (${this.#sbServer.channel_server})`)
            reject(`No such channel on this server (${this.channelServer})`)
          else console.log('ChannelSocket() was closed (cleanly): ', e.reason)
        }
        reject('wbSocket() closed before it was opened (?)')
      });

      this.#ws.websocket.addEventListener('error', (e) => {
        this.#ws.closed = true
        console.log('ChannelSocket() error: ', e)
        reject('ChannelSocket creation error (see log)')
      });

      // let us set a timeout to catch and make sure this thing resoles within 0.5 seconds
      setTimeout(() => {
        if (!(this as any)[ChannelSocket.ReadyFlag]) {
          const msg = "[ChannelSocket] - this socket is not resolving (waited 10s) ..."
          console.warn(msg); reject(msg);
        } else {
          if (DBG) console.log("ChannelSocket() - this socket resolved", this)
        }
      }, 10000);

      // (this as any)[ChannelSocket.ReadyFlag] = true;
      // resolve(this) // nope, we resolve when we get a 'ready' message
    })
  }

  get ready() { return this.channelSocketReady }
  // get readyFlag(): boolean { return this.#ChannelSocketReadyFlag }
  get ChannelSocketReadyFlag(): boolean { return (this as any)[ChannelSocket.ReadyFlag] }

  get status() {
    if (!this.#ws.websocket) return 'CLOSED'
    else switch (this.#ws.websocket.readyState) {
      case 0: return 'CONNECTING'
      case 1: return 'OPEN'
      case 2: return 'CLOSING'
      default: return 'CLOSED'
    }
  }

  // set onMessage(f: (m: Message) => void) { this.#onMessage = f }
  // @Ready get onMessage() { return this.#onMessage }

  /** Enables debug output */
  set enableTrace(b: boolean) {
    this.#traceSocket = b;
    if (b) console.log("==== jslib ChannelSocket: Tracing enabled ====")
  }

  /**
    * ChannelSocket.send()
    *
    * Returns a promise that resolves to "success" when sent,
    * or an error message if it fails.
    */
  @VerifyParameters
  async send(msg: SBMessage | any): Promise<string> {
    await this.ready
    const sbm: SBMessage = msg instanceof SBMessage ? msg : new SBMessage(this, msg)
    _sb_assert(this.#ws.websocket, "ChannelSocket.send() called before ready")
    if (this.#ws.closed) {
      if (this.#traceSocket) console.info("send() triggered reset of #readyPromise() (normal)")
      this.channelSocketReady = this.#channelSocketReadyFactory()
        // this.#ChannelSocketReadyFlag = true
        ; (this as any)[ChannelSocket.ReadyFlag] = false;
    }
    return new Promise(async (resolve, reject) => {
      await sbm.ready // message needs to be ready
      await this.ready // and 'we' (channel socket) need to be ready
      if (!this.ChannelSocketReadyFlag) reject("ChannelSocket.send() is confused - ready or not?")
      const readyState = this.#ws.websocket!.readyState
      switch (readyState) {
        case 1: // OPEN
          if (this.#traceSocket)
            console.log("++++++++ ChannelSocket.send() will send message:", Object.assign({}, sbm.message))
          const messagePayload = assemblePayload(sbm.message)
          _sb_assert(messagePayload, "ChannelSocket.send(): failed to assemble message")
          // we keep track of a hash of things we've sent so we can track when we see them
          // const hash = await crypto.subtle.digest('SHA-256', messagePayload!)
          const hash = await crypto.subtle.digest('SHA-256', sbm.message.c!)
          const messageHash = arrayBufferToBase64url(hash)
          if (DBG || this.#traceSocket)
            console.log("++++++++ ChannelSocket.send(): Which has hash:", messageHash)
          // const ackPayload = { timestamp: Date.now(), type: 'ack', _id: _id }
          this.#ack.set(messageHash, resolve)

          // THIS IS WHERE we actually send the payload ...
          this.#ws.websocket!.send(messagePayload!)

          setTimeout(() => {
            // we could just resolve on message return, but we want to print out error message
            if (this.#ack.has(messageHash)) {
              this.#ack.delete(messageHash)
              const msg = `Websocket request timed out (no ack) after ${this.#ws.timeout}ms (${messageHash})`
              console.error(msg)
              reject(msg)
            } else {
              // normal behavior
              if (this.#traceSocket) console.log("++++++++ ChannelSocket.send() completed sending")
              resolve("success")
            }
          }, this.#ws.timeout)
          break
        case 0: // CONNECTING
        case 2: // CLOSING
        case 3: // CLOSED
          const errMsg = `socket not OPEN - it is ${readyState === 0 ? 'CONNECTING' : readyState === 2 ? 'CLOSING' : 'CLOSED'}`
          // _sb_exception('ChannelSocket', errMsg)
          reject(errMsg)
          break
        default:
          _sb_exception('ChannelSocket', `socket in unknown state (${readyState})`)
      }
    })
  }

  // /** @type {JsonWebKey} */ @Memoize @Ready get exportable_owner_pubKey() { return this.keys.ownerKey }

} /* class ChannelSocket */

//#endregion

/******************************************************************************************************/
//#region STORAGE: SBObjectHandle, StorageApi



// 'Shard' object is the format returned by storage server; this code
// 'paraphrases' code in the storage server. it is essentially a variation
// of SBObjectHandle, but (much) more restrictive.
export interface Shard {
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
 * StorageAPI
 */
export class StorageApi {
  #storageServer: Promise<string>;
  // we use a promise so that asynchronicity can be handled interally in StorageApi,
  // eg so users don't have to do things like ''(await SB.storage).fetchObject(...)''
  constructor(stringOrPromise: Promise<string> | string) {
    this.#storageServer = Promise.resolve(stringOrPromise).then((s) => {
      const storageServer = s
      _sb_assert(typeof storageServer === 'string', 'StorageApi() constructor requires a string (for storageServer)')
      return storageServer
    })
  }

  @Memoize async getStorageServer(): Promise<string> { return this.#storageServer }

  /**
   * Pads object up to closest permitted size boundaries;
   * currently that means a minimum of 4KB and a maximum of
   * of 1 MB, after which it rounds up to closest MB.
   */
  static padBuf(buf: ArrayBuffer) {
    const dataSize = buf.byteLength; let _target
    // pick the size to be rounding up to
    if ((dataSize + 4) < 4096) _target = 4096 // smallest size
    else if ((dataSize + 4) < 1048576) _target = 2 ** Math.ceil(Math.log2(dataSize + 4)) // in between
    else _target = (Math.ceil((dataSize + 4) / 1048576)) * 1048576 // largest size
    // append the padding buffer
    let finalArray = _appendBuffer(buf, (new Uint8Array(_target - dataSize)).buffer);
    // set the (original) size in the last 4 bytes
    (new DataView(finalArray)).setUint32(_target - 4, dataSize)
    if (DBG2) console.log("padBuf bytes:", finalArray.slice(-4));
    return finalArray
  }

  /**
   * The actual size of the object is encoded in the
   * last 4 bytes of the buffer. This function removes
   * all the padding and returns the actual object.
   */
  /** @private */
  #unpadData(data_buffer: ArrayBuffer): ArrayBuffer {
    const tail = data_buffer.slice(-4)
    var _size = new DataView(tail).getUint32(0)
    const _little_endian = new DataView(tail).getUint32(0, true)
    if (_little_endian < _size) {
      if (DBG2) console.warn("#unpadData - size of shard encoded as little endian (fixed upon read)")
      _size = _little_endian
    }
    if (DBG2) {
      console.log(`#unpadData - size of object is ${_size}`)
      // console.log(tail)
    }
    return data_buffer.slice(0, _size);
  }

  // derives the encryption key for a given object (shard)
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

  /**
   * Store 'contents' as a shard, returns an object handle. Note that 'contents' can be
   * anything, and is always packaged as a payload before storing.
   */
  async storeData(
    contents: any,
    channelOrHandle: SBChannelHandle | Channel
  ) {
    try {
      const buf = assemblePayload(contents)!
      if (!buf) throw new SBError("[storeData] failed to assemble payload")
      const channel = channelOrHandle instanceof Channel ? channelOrHandle : new Channel(channelOrHandle)

      const bufSize = (buf as ArrayBuffer).byteLength // before padding
      const paddedBuf = StorageApi.padBuf(buf)
      const fullHash = await sbCrypto.generateIdKey(paddedBuf)

      // 'phase 1': get salt and iv from storage server for this object
      const storageServer = await this.getStorageServer()
      const requestQuery = storageServer + '/api/v2/storeRequest?id=' + arrayBufferToBase62(fullHash.idBinary)
      const keyInfo = await SBApiFetch(requestQuery)
      if (!keyInfo.salt || !keyInfo.iv)
        throw new SBError('[storeData] Failed to get key info (salt, nonce) from storage server')

      const id = arrayBufferToBase62(fullHash.idBinary)

      const key = await StorageApi.getObjectKey(fullHash.keyMaterial, keyInfo.salt)
      const encryptedData = await sbCrypto.encrypt(paddedBuf, key, { iv: keyInfo.iv })
      const storageToken = await channel.getStorageToken(encryptedData.byteLength)

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
      const result = await SBApiFetch(storeQuery, init)

      const r: SBObjectHandle = {
        [SB_OBJECT_HANDLE_SYMBOL]: true,
        version: currentSBOHVersion,
        id: id,
        key: arrayBufferToBase62(fullHash.keyMaterial),
        iv: keyInfo.iv,
        salt: keyInfo.salt,
        actualSize: bufSize,
        verification: result.verification,
        storageServer: storageServer,
      }
      if (DBG) console.log("storeData() - success, handle:", r, encryptedData)
      return (r)
    } catch (error) {
      console.error("[storeData] failed:", error)
      if (error instanceof SBError) throw error
      throw new SBError(`[storeData] failed to store data: ${error}`)
    }
  }

  // a wrapper: any failure conditions (exceptions) returns 'null', facilitates
  // trying different servers
  async #_fetchData(useServer: string, url: string, h: SBObjectHandle): Promise<SBObjectHandle | null> {
    try {
      let shard: Shard = await SBApiFetch(useServer + url, { method: 'GET' })
      shard = validate_Shard(shard)
      _sb_assert(h.key, "object handle 'key' is missing, cannot decrypt")

      // we merge shard info into our handle
      h.iv = shard.iv
      h.salt = shard.salt
      h.data = new WeakRef(shard.data)
      h.actualSize = shard.actualSize

      if (DBG2) console.log("fetchData(), handle (and data) at this point:", h, shard.data)

      const h_key = base62ToArrayBuffer(h.key!)
      const decryptionKey = await StorageApi.getObjectKey(h_key, h.salt);
      // const decryptedData = await sbCrypto.unwrapShard(decryptionKey, { c: shard.data, iv: h.iv })
      const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: h.iv }, decryptionKey, shard.data)
      const buf = this.#unpadData(decryptedData)
      if (DBG2) console.log("shard.data (decrypted and unpadded):", buf)
      h.payload = extractPayload(buf).payload
      h.data = new WeakRef(shard.data) // once we've gotten the payload, we keep ref but we're chill about it
      return (h)
    } catch (error) {
      if (DBG) console.log(`fetchData(): trying to get object on '${useServer}' failed: '${error}'`)
      return (null)
    }
  }


  /**
   * This assumes you have a complete SBObjectHandle. Note that if you only have
   * the 'id' and 'verification' fields, you can reconstruct / request the rest.
   * The current interface will return both nonce, salt, and encrypted data.
   *
   * Not that fetchData will prioritize checking with the storageServer in the
   * handle, if present. Next, it will always check localhost at port 3841 if a
   * local mirror is running. After that, it may or may not check one or several
   * possible servers.
   *
   * @param h SBObjectHandle - the object to fetch
   * @param returnType 'string' | 'arrayBuffer' - the type of data to return
   * (default: 'arrayBuffer')
   * @returns Promise<ArrayBuffer | string> - the shard data
   *
   * Note that this returns a handle, which is the same handle but might be
   * updated (for example iv, salt filled in). Server will be updated with
   * whatever server 'worked', etc.
   *
   * The returned shard contents is referenced by 'data' in the handle. It's
   * stored as a 'weakref', meaning, you can hang on to the handle as your
   * 'cache', and use ''getData()'' to safely retrieve the data.
   */
  async fetchData(handle: SBObjectHandle) {
    const h = validate_SBObjectHandle(handle) // throws if there's an issue
    if (DBG) console.log("fetchData(), handle:", h)

    // we might be 'caching' as a weakref
    if (h.data && h.data instanceof WeakRef && h.data.deref()) return (h); // the ref is still good

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
      if (result !== null) {
        if (DBG) console.log(`[fetchData] success: fetched from '${server}'`, result)
        result.storageServer = server // store the one that worked
        return (result)
      }
    }
    // if these servers don't work, we throw an error
    throw new SBError(`[fetchData] failed to fetch from any server`)
  }


  /**
   * Convenience wrapper for object handles: returns the data if it's present,
   * returns null if it's not, and throws an error if the handle is invalid.
   */
  static getData(handle: SBObjectHandle): ArrayBuffer | undefined {
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
   * Convenience wrapper for object handles: returns the payload.
   */
  static getPayload(handle: SBObjectHandle): any {
    const h = validate_SBObjectHandle(handle)
    if (h.payload) return h.payload
    const data = StorageApi.getData(h)
    if (!data) throw new SBError('[getPayload] no data or payload in handle, use fetchData()')
    return extractPayload(data).payload
  }

} /* class StorageApi */

//#endregion

/******************************************************************************************************/
//#region Snackabra and exports

const SnackabraDefaults = {
  channelServer: ''
}

/**
  * Main class. It corresponds to a single channel server. Most apps
  * will only be talking to one channel server, but it is possible
  * to have multiple instances of Snackabra, each talking to a
  * different channel server.
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
  * Two optional parameters enable debug output mode and verbose
  * debug output mode.
 */
class Snackabra {
  #channelServer: string
  #storage: StorageApi
  #version = version
  #channelServerInfo: any
  sbFetch = SBFetch // future: will allow overriding network fetch

  constructor(channelServer: string, setDBG?: boolean, setDBG2?: boolean) {
    console.warn(`==== CREATING Snackabra object generation: ${this.#version} ====`)
    _sb_assert(typeof channelServer === 'string', '[Snackabra] Takes channel server URL as parameter')
    SnackabraDefaults.channelServer = channelServer
    if (setDBG && setDBG === true) DBG = true;
    if (DBG && setDBG2 && setDBG2 === true) DBG2 = true;
    if (DBG) console.warn("++++ Snackabra constructor: setting DBG to TRUE ++++");
    if (DBG2) console.warn("++++ Snackabra constructor: ALSO setting DBG2 to TRUE (verbose) ++++");

    this.#channelServer = channelServer // conceptually, you can have multiple channel servers
    // (eventually) fetch storage server name from channel server; StorageApi knows how to handle this
    this.#storage = new StorageApi(new Promise((resolve, reject) => {
      SBFetch(this.#channelServer + '/api/v2/info')
        .then((response: Response) => {
          if (!response.ok) { reject('response from channel server was not OK') }
          return response.json()
        })
        .then((data) => {
          if (data.error) reject(`fetching storage server name failed: ${data.error}`)
          else {
            this.#channelServerInfo = data
            if (DBG) console.log("Channel server info:", this.#channelServerInfo)
          }
          _sb_assert(data.storageServer, 'Channel server did not provide storage server name, cannot initialize')
          resolve(data.storageServer)
        })
        .catch((error: Error) => {
          reject(error)
        });
    }));
  }

  static get defaultChannelServer(): string {
    const s = SnackabraDefaults.channelServer
    if (s.length > 0) return s
    else throw new SBError("No default channel server; you need to have 'new Snackabra(...)' somewhere.")
    // return SnackabraDefaults.channelServer
  }


  /**
   * "Anonymous" version of fetching a page, since unless it's locked you do not
   * need to be authenticated to fetch a page (or even know what channel it's
   * related to).
   */
  async getPage(prefix: string) {
      if (DBG) console.log(`==== Snackabra.getPage: calling fetch with: ${prefix}`)
      return extractPayload(await SBApiFetch(this.#channelServer + '/api/v2/page/' + prefix))
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
   * Creates a new channel.
   * Returns a promise to a ''SBChannelHandle'' object.
   * Note that this method does not connect to the channel,
   * it just creates (authorizes) it and allocates storage budget.
   * 
   * New (2.0) interface:
   * 
   * @param budgetChannel: Channel - the source of initialization budget
   * 
   * Note that if you have a full budget channel, you can budd off it (which
   * will take all the storage). Providing a budget channel here will allows
   * you to create new channels when a 'guest' on some other channel (for example),
   * or to create a new channel with a minimal budget.
   */
  create(budgetChannel: Channel): Promise<SBChannelHandle>
  create(storageToken: SBStorageToken): Promise<SBChannelHandle>
  create(budgetChannelOrToken: Channel | SBStorageToken): Promise<SBChannelHandle> {
    _sb_assert(budgetChannelOrToken !== null, '[create channel] Invalid parameter (null)')
    return new Promise<SBChannelHandle>(async (resolve, reject) => {
      try {
        // 
        // if (typeof budgetChannelOrToken === 'string') {
        //   _storageToken = budgetChannelOrToken as SBStorageToken
        // } else 

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
        channelKeys.create(_storageToken!)
          .then((handle) => { resolve(handle) })
          .catch((e) => { reject(e) })
      } catch (e) {
        const msg = `Creating channel did not succeed: ${e}`; console.error(msg); reject(msg);
      }
    })
  }

  /**
   * Connects to :term:`Channel Name` on this SB config.
   * Returns a Channel object if no message handler is
   * provided, if onMessage is provided then it returns
   * a ChannelSocket object.
   */

  connect(handleOrKey: SBChannelHandle | SBUserPrivateKey): Channel
  connect(handleOrKey: SBChannelHandle | SBUserPrivateKey, onMessage: (m: ChannelMessage) => void): ChannelSocket
  connect(handleOrKey: SBChannelHandle | SBUserPrivateKey, onMessage?: (m: ChannelMessage) => void): Channel | ChannelSocket {
    let handle: SBChannelHandle
    if (typeof handleOrKey === 'string') {
      handle = {
        userPrivateKey: handleOrKey as SBUserPrivateKey
      }
    } else {
      handle = handleOrKey as SBChannelHandle
    }
    _sb_assert(handle && handle.userPrivateKey, '[Snackabra.connect] Invalid parameter (at least need owner private key)')
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
   * Returns the storage API.
   */
  @Memoize get storage(): StorageApi { return this.#storage; }

  @Memoize async getStorageServer(): Promise<string> {
    return this.#storage.getStorageServer()
  }

  /**
   * Returns the crypto API.
   */
  get crypto(): SBCrypto {
    return sbCrypto;
  }

  get version(): string {
    return this.#version;
  }


} /* class Snackabra */

export {
  SB384,
  SBMessage,
  Channel,
  ChannelSocket,
  Snackabra,
  arrayBufferToBase64url,
  base64ToArrayBuffer,
  arrayBufferToBase62,
  base62ToArrayBuffer,
  version,
  setDebugLevel,
};

export var SB = {
  Snackabra: Snackabra,
  SBMessage: SBMessage,
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

if (!(globalThis as any).SB)
  (globalThis as any).SB = SB;
// we warn for benefit of Deno and visibility
console.warn(`==== SNACKABRA jslib (re)loaded, version '${(globalThis as any).SB.version}' ====`);

//#endregion
