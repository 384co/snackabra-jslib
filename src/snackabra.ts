/*
   Copyright (C) 2020-2023 Magnusson Institute, All Rights Reserved

   "Snackabra" is a registered trademark

   Snackabra SDK - Server
   See https://snackabra.io for more information.

   This program is free software: you can redistribute it and/or
   modify it under the terms of the GNU Affero General Public License
   as published by the Free Software Foundation, either version 3 of
   the License, or (at your option) any later version.

   This program is distributed in the hope that it will be useful, but
   WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
   Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public
   License along with this program.  If not, see www.gnu.org/licenses/

*/

const version = '2.0.0-alpha.5 (build 33)' // working on 2.0.0 release

/******************************************************************************************************/
//#region Interfaces - Types

// minimum when creating a new channel
export const NEW_CHANNEL_MINIMUM_BUDGET = 32 * 1024 * 1024; // 8 MB

/** 
 * Complete descriptor of a channel. The channel ID is a hash
 * of the public key of the channel owner. The channel key is
 * the private key with which we are joining the channel.
 * 
 * Note: an owner's channel handle can be reconstructed from
 * just having owner private key (SBUserPrivateKey) and channelServer
 * (though channelServer an be ''pinged'' to find it's home).
 */
export interface SBChannelHandle {
  [SB_CHANNEL_HANDLE_SYMBOL]?: boolean, // future use for internal validation

  // minimum info is channel id and the key with which we would connect
  channelId: SBChannelId,
  userPrivateKey: SBUserPrivateKey,

  // channel server that hosts this channel
  channelServer?: string,

  // server-side channel data; if missing the server can provide it
  channelData?: SBChannelData,
}

function _checkChannelHandle(data: SBChannelHandle) {
  return (
    data.channelId && data.channelId.length === 43
    && data.userPrivateKey && typeof data.userPrivateKey === 'string' && data.userPrivateKey.length > 0
    && (!data.channelServer || typeof data.channelServer === 'string')
    && (!data.channelData || _checkChannelData(data.channelData))
  )
}
export function validate_SBChannelHandle(data: SBChannelHandle): SBChannelHandle {
  if (!data) throw new Error(`invalid SBChannelHandle (null or undefined)`)
  else if (data[SB_CHANNEL_HANDLE_SYMBOL]) return data as SBChannelHandle
  else if (_checkChannelHandle(data)) {
    return { ...data, [SB_CHANNEL_HANDLE_SYMBOL]: true } as SBChannelHandle
  } else {
    if (DBG) console.error('invalid SBChannelHandle ... trying to ingest:\n', data)
    throw new Error(`invalid SBChannelHandle`)
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
    && (!data.storageToken || data.storageToken.length > 0)
  )
}

export function validate_SBChannelData(data: any): SBChannelData {
  if (!data) throw new Error(`invalid SBChannelData (null or undefined)`)
  else if (_checkChannelData(data)) {
    return data as SBChannelData
  } else {
    if (DBG) console.error('invalid SBChannelData ... trying to ingest:\n', data)
    throw new Error(`invalid SBChannelData`)
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
export type SBStorageToken = string

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

/**
 * The "app" level message format, provided to onMessage (by ChannelSocket)
 * Note it will only be forwarded if verified.
 */
export interface Message {
  body: any;
  channelId: SBChannelId;
  sender: SBUserId;
  senderPublicKey: SBUserPublicKey;
  senderTimestamp: number;
  serverTimestamp: number; // reconstructed from timestampPrefix
  eol?: number; // end of life (timestamp), if present
  _id: string;
}

export interface ChannelApiBody {
  [SB_CHANNEL_API_BODY_SYMBOL]?: boolean,
  channelId: SBChannelId,
  path: string,
  userId: SBUserId,
  userPublicKey: SBUserPublicKey,
  isOwner?: boolean,
  apiPayload?: ArrayBuffer,
  timestamp: number,
  sign: ArrayBuffer
}

// return self if it matches shape, otherwise throw
// extraneous properties are ignored
export function validate_ChannelApiBody(body: any): ChannelApiBody {
  if (!body) throw new Error(`invalid ChannelApiBody (null or undefined)`)
  else if (body[SB_CHANNEL_API_BODY_SYMBOL]) return body as ChannelApiBody
  else if (
    body.channelId && body.channelId.length === 43
    && body.path && typeof body.path === 'string' && body.path.length > 0
    && body.userId && typeof body.userId === 'string' && body.userId.length === 43
    && body.userPublicKey && body.userPublicKey.length > 0
    && (!body.isOwner || typeof body.isOwner === 'boolean')
    && (!body.apiPayload || body.apiPayload instanceof ArrayBuffer)
    && body.timestamp && Number.isInteger(body.timestamp)
    && body.sign && body.sign instanceof ArrayBuffer
  ) {
    return { ...body, [SB_CHANNEL_API_BODY_SYMBOL]: true } as ChannelApiBody
  } else {
    if (DBG) console.error('invalid ChannelApiBody ... trying to ingest:\n', body)
    throw new Error(`invalid ChannelApiBody`)
  }
}

/**
 * SB standard wrapped encrypted messages.
 * 
 * Encryption is done with AES-GCM, 16 bytes of salt, The
 * ``contents`` are url-safe base64, same thing with the nonce (iv),
 *  depending on if it's internal or over wire.
 * 
 * Timestamp prefix is fourty-two (26) [0-3] characters.
 * It encodes epoch milliseconds * 4^4 (last four are '0000').
 * 
 * "Everything is optional" as this is used in multiple contexts.
 * Use ``validate_ChannelMessage()`` to validate.
 * 
 * Note that channel server doesn't need userPublicKey on every
 * channel message since it's provided on websocket setup.
 * 
 * Complete channel "_id" is channelId + '_' + subChannel + '_' + timestampPrefix
 * This allows (prefix) searches within time spans on a per channel
 * (and if applicable, subchannel) basis. Special subchannel 'blank'
 * (represented as '____') is the default channel and generally the only one
 * that visitors have access to.
 * 
 * A core exception is that all messages with a TTL in the range 1-7
 * (eg range of 1 minute to 72 hours) are duplicated onto subchannels
 * matching the TTLs, namely '___1', '___2', '___3', etc. Thus
 * an oldMessages fetch can for example request '___4' to get all messages
 * that were sent with TTL 4 (eg 1 hour). Which also means that as
 * Owner, if you set TTL on a message then you can't use the fourth character
 * (if you try to while setting a TTL, channel server will reject it).
 * 
 * Properties that are generally retained or communicated inside payload
 * packaging have short names (apologies for lack of readability).
 * 'unencryptedContents' has a long and cumbersome name for obvious reasons.
 * 
 */
export interface ChannelMessage {
  [SB_CHANNEL_MESSAGE_SYMBOL]?: boolean,

  // strictly speaking, only these five are strictly necessary when *sending*
  f?: SBUserId, // 'from': public (hash) of sender, matches publicKey of sender, verified by channel server
  c?: ArrayBuffer, // encrypted contents
  iv?: ArrayBuffer, // nonce
  s?: ArrayBuffer, // signature
  ts?: number, // timestamp at point of encryption, by client, verified along with encrypt/decrypt

  // the remainder are either optional (with default values), internally used,
  // server provided, or can be reconstructed
  channelId?: SBChannelId, // channelId base62 x 43
  i2?: string, // subchannel; default is '____', can be any 4xbase62; only owner can read/write subchannels
  timestampPrefix?: string, // timestampPrefix '0'/'1'/'2'/'3' - 26 of them (note last four are '0000'), timestamp per server
  _id?: string, // channelId + '_' + subChannel + '_' + timestampPrefix

  // whatever is being sent; should (must) be stripped when sent
  // when encrypted, this is packaged as payload (and then encrypted)
  // (signing is done on the payload version)
  unencryptedContents?: any,

  ready?: boolean, // if present, signals other side is ready to receive messages (rest of message ignored)
  t?: SBUserId, // 'to': public (hash) of recipient; note that Owner sees all messages; if omitted means broadcast
  ttl?: number, // Value 0-15; if it's missing it's 15/0xF (infinite); if it's 1-7 it's duplicated to subchannels
}

export function validate_ChannelMessage(body: ChannelMessage): ChannelMessage {
  if (!body) throw new Error(`invalid ChannelMessage (null or undefined)`)
  else if (body[SB_CHANNEL_MESSAGE_SYMBOL]) return body as ChannelMessage
  else if (
    // todo: might as well add regexes to some of these
    (!body._id || (typeof body._id === 'string' && body._id.length === 86))
    && (!body.ready || typeof body.ready === 'boolean')
    && (!body.timestampPrefix    || (typeof body.timestampPrefix === 'string' && body.timestampPrefix.length === 26))
    && (!body.channelId     || (typeof body.channelId === 'string' && body.channelId.length === 43))
    // 'i2' is a bit more complicated, it must be 4xbase62 (plus '_'), so we regex against [a-zA-Z0-9_]
    && (!body.i2    || (typeof body.i2 === 'string' && /^[a-zA-Z0-9_]{4}$/.test(body.i2)))
    && (!body.unencryptedContents     || body.unencryptedContents instanceof ArrayBuffer)
    && (!body.f     || typeof body.f === 'string' && body.f.length === 43)
    && (!body.c    || body.c instanceof ArrayBuffer)
    && (!body.ts    || Number.isInteger(body.ts))
    // also check body.ttl is a whole integer (cannot be a fraction)
    && (!body.ttl   || (Number.isInteger(body.ttl) && body.ttl >= 0 && body.ttl <= 15))
    && (!body.iv    || body.iv instanceof ArrayBuffer)
    && (!body.s     || body.s instanceof ArrayBuffer)
  ) {
    return { ...body, [SB_CHANNEL_MESSAGE_SYMBOL]: true } as ChannelMessage
  } else {
    if (DBG) console.error('invalid ChannelMessage ... trying to ingest:\n', body)
    throw new Error(`invalid ChannelMessage`)
  }
}

export interface ChannelAdminData {
  channelId: SBChannelId,
  channelData: SBChannelData,
  channelCapacity: number,
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


// /**
//  * Same as EncryptedContents interface, but binary view enforced
//  */
// export interface EncryptedContentsBin {
//   content: ArrayBuffer,
//   iv: Uint8Array,
//   timestamp?: number,
// }

// these are toggled (globally) by ''new Snackabra(...)''
// they will stick to 'true' if any Snackabra object is
// created asking them to be set
var DBG = true;
var DBG2 = false; // note, if this is true then DBG will be true too

// index/number of seconds/string description of TTL values (0-15)
// (it's valid to encode it as four bits):
// 0	         0	Ephemeral (not stored)
// 1	        60	One minute (minimum)
// 2	       300	Five minutes
// 3	      1200	Twenty minutes
// 4	      3600	One hour
// 5	     14400	4 hours
// 6	     64800	18 hours
// 7	    259200	72 hours
// 8	   1036800	12 days
// 9	   4147200	48 days
// 10   31622400	One year (366 days)
// 11		          <reserved>
// 12		          <reserved>
// 13		          <reserved>
// 14		          <reserved>
// 15	  Infinity	Infinity
export const msgTtlToSeconds = [0, 60, 300, 1200, 3600, 14400, 64800, 259200, 1036800, 4147200, 31622400, 0, 0, 0, 0, Infinity]
export const msgTtlToString = ['Ephemeral', 'One minute', 'Five minutes', 'Twenty minutes', 'One hour', '4 hours', '18 hours', '72 hours', '12 days', '48 days', 'One year', '<reserved>', '<reserved>', '<reserved>', '<reserved>', 'Permastore (no limit)']

/**
 * SBObjectType
 * 
 * SBObjectType is a single character string that indicates the
 * type of object. Currently, the following types are supported:
 * 
 * - 'f' : full object (e.g. image, this is the most common)
 * - 'p' : preview object (e.g. thumbnail)
 * - 'b' : block/binary object (e.g. 64KB block)
 * - 't' : test object (for testing purposes)
 * 
 * The 't' type is used for testing purposes, and you should
 * not expect it to have any particular SLA or longevity.
 * 
 * Note that when you retrieve any object, you must have the
 * matching object type.
 */
export type SBObjectType = 'f' | 'p' | 'b' | 't'
export type SBObjectHandleVersions = '1' | '2'
const currentSBOHVersion: SBObjectHandleVersions = '2'

/**
 * (type) namespace export for SBObjectHandle
 */
export namespace Interfaces {

  // this exists as both interface and class, but the class
  // is mostly used internally, and the interface is what
  // you'll use to communicate with the API
  export interface SBObjectHandle_base {
    [SB_OBJECT_HANDLE_SYMBOL]?: boolean,
    version?: SBObjectHandleVersions,
    type?: SBObjectType,
    // and currently you also need to keep track of this,
    // but you can start sharing / communicating the
    // object before it's resolved: among other things it
    // serves as a 'write-through' verification
    verification?: Promise<string> | string,
    // you'll need these in case you want to track an object
    // across future (storage) servers, but as long as you
    // are within the same SB servers you can request them.
    iv?: ArrayBuffer | string, // if external it's base64
    salt?: ArrayBuffer | string, // if external it's base64
    // the following are optional and not tracked by
    // shard servers etc, but facilitates app usage
    fileName?: string, // by convention will be "PAYLOAD" if it's a set of objects
    dateAndTime?: string, // optional: time of shard creation
    // shardServer?: string, // optionally direct a shard to a specific server (especially for reads) // update: nope
    fileType?: string, // optional: file type (mime)
    lastModified?: number, // optional: last modified time (of underlying file, if any)
    actualSize?: number, // optional: actual size of underlying file, if any
    savedSize?: number, // optional: size of shard (may be different from actualSize)
  }

  // for long-term storage you only need these:
  //   id: string, key: string, // b64 encoding (being deprecated)
  //   id32?: Base62Encoded, key32?: Base62Encoded, // array32 format of key (new default)

  export interface SBObjectHandle_v1 extends SBObjectHandle_base {
    version: '1',
    id: string, // in v1 these are base64 encoded
    key: string,
    // some handles were created with version 1 and id32/key32 as well
    id32?: Base62Encoded,
    key32?: Base62Encoded,
  }

  export interface SBObjectHandle_v2 extends SBObjectHandle_base {
    version: '2',
    // in v2 these are base62 encoded only
    id: Base62Encoded,
    key: Base62Encoded,
  }

  export type SBObjectHandle = SBObjectHandle_v1 | SBObjectHandle_v2
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
  prefix: KeyPrefix;
  x: string;
  y: string;
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
//#region - SB internal utility functions

/**
 * SBFetch()
 *
 * A "safe" fetch() that over time integrates with SB mesh.
 *
 * @param input - the URL to fetch
 * @param init - the options for the request
 */
function SBFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    try {
      fetch(input, init ?? { method: 'GET', headers: { 'Content-Type': 'application/json' } },)
        .then((response) => {
          resolve(response); // we don't check for status here, we'll do that in the caller
        }).catch((error) => { throw error; })
    } catch (e) {
      const msg = `[SBFetch] Error (fetch exception, might be normal operation): ${e}`;
      console.warn(msg); // not necessarily an error but helps trace up through callee
      reject(msg);
    }
  });
}

/**
 * Wraps SBFetch, using SB conventions on API calls.
 * If there's an issue, throws.
 */
function SBApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<any> {
  // sorry about all this code ... but everything that can go wrong here eventually does
  return new Promise((resolve, reject) => {
    SBFetch(input, init)
      .then(async (response: Response) => {
        var retValue: any
        if (!response || !response.ok)
          reject("[SBApiFetch] Network response was not 'ok' (fatal)");
        const contentType = response.headers.get('content-type');
        if (!contentType) {
          reject("[SBApiFetch] Server response missing content-type header (?)"); return;
        } else if (contentType.indexOf("application/json") !== -1) {
          const json = await response.json()
          if (DBG2) console.log(`[SBApiFetch] json ('${json}'):\n`, json)
          retValue = jsonParseWrapper(json, "L489");
        } else if (contentType.indexOf("application/octet-stream") !== -1) {
          retValue = extractPayload(await response.arrayBuffer()).payload
        } else {
          reject("SBApiFetch] Server responded with unknown content-type header (?)"); return;
        }
        if (!retValue || retValue.error || (retValue.success && !retValue.success)) {
          let apiErrorMsg = '[SBApiFetch] Network or Server error or cannot parse response'
          if (response.status) apiErrorMsg += ' [' + response.status + ']'
          if (retValue?.error) apiErrorMsg += ': ' + retValue.error
          if (DBG) console.error("[SBApiFetch] error:\n", apiErrorMsg)
          reject(new Error(apiErrorMsg))
        } else {
          if (DBG) console.log(
            "[SBApiFetch] Success:\n",
            SEP, input, '\n',
            SEP, retValue, '\n', SEP)
          resolve(retValue)
        }
      }).catch((error) => {
        reject(error); // SBFetch provides details
      });
  });
}


/** @private */
// variation on solving this issue:
// https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript
function WrapError(e: any) {
  const pre = ' ***ERRORMSGSTART*** ', post = ' ***ERRORMSGEND*** ';
  if (e instanceof Error) {
    // could use 'e' here, but some variations of 'e' do not allow 'message' to be accessed
    if (DBG) console.error('[WrapError] Error: \n', e)
    return new Error(pre + e.message + post)
  }
  else return new Error(pre + String(e) + post);
}

/** @private */
function _sb_exception(loc: string, msg: string) {
  const m = '[_sb_exception] << SB lib error (' + loc + ': ' + msg + ') >>';
  // for now disabling this to keep node testing less noisy
  // console.error(m);
  throw new Error(m);
}

// internal - handle assertions
/** @private */
function _sb_assert(val: unknown, msg: string) {
  if (!(val)) {
    const m = ` <<<<[_sb_assert] assertion failed: '${msg}'>>>> `;
    // debugger;
    if (DBG) console.trace(m)
    throw new Error(m);
  }
}

function parseSB384string(input: string): jwkStruct | undefined {
  try {
    if (input.length <= 4) return undefined;
    const prefix = input.slice(0, 4);
    const data = input.slice(4);
    switch (prefix) {
      case KeyPrefix.SBPublicKey: {
        const combined = base62ToArrayBuffer(data)
        if (combined.byteLength !== (48 * 2)) return undefined;
        return {
          prefix: KeyPrefix.SBPublicKey,
          x: arrayBufferToBase64(combined.slice(0, 48)),
          y: arrayBufferToBase64(combined.slice(48, 96))
        };
      }
      case KeyPrefix.SBPrivateKey: {
        const combined = base62ToArrayBuffer(data)
        if (combined.byteLength !== (48 * 3)) return undefined;
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
  } catch (e) {
    console.error("parseSB384string() - malformed input, exception: ", e);
    return undefined;
  }
}


//#endregion - SB internal utility functions

/******************************************************************************************************/
//#region - SBCryptoUtils - crypto and translation stuff used by SBCrypto etc

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

// // for later use - message ID formats
// const messageIdRegex = /([A-Za-z0-9+/_\-=]{64})([01]{42})/

// Strict b64 check:
// const b64_regex = new RegExp('^(?:[A-Za-z0-9+/_\-]{4})*(?:[A-Za-z0-9+/_\-]{2}==|[A-Za-z0-9+/_\-]{3}=)?$')
// But we will go (very) lenient:
const b64_regex = /^([A-Za-z0-9+/_\-=]*)$/
// stricter - only accepts URI friendly:
// const url_regex = /^([A-Za-z0-9_\-=]*)$/

/**
 * Returns 'true' if (and only if) string is well-formed base64.
 * Works same on browsers and nodejs.
 */
function _assertBase64(base64: string) {
  return b64_regex.test(base64)
  // // return (b64_regex.exec(base64)?.[0] === base64);
  // const z = b64_regex.exec(base64)
  // if (z) return (z[0] === base64); else return false;
}
const isBase64Encoded = _assertBase64 // alias

/*
  we use URI/URL 'safe' characters in our b64 encoding to avoid having
  to perform URI encoding, which also avoids issues with composed URI
  strings (such as when copy-pasting). however, that means we break
  code that tries to use 'regular' atob(), because it's not as forgiving.
  this is also referred to as RFC4648 (section 5). note also that when
  we generate GUID from public keys, we iterate hashing until '-' and '_'
  are not present in the hash, which does reduce entropy by about three
  (3) bits (out of 384).

  For possible future use:
  RFC 3986 (updates 1738 and obsoletes 1808, 2396, and 2732)
  type ALPHA = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z'
  type alpha = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z'
  type digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  type genDelims = ':' | '/' | '?' | '#' | '[' | ']' | '@'
  type subDelims = '!' | '$' | '&' | "'" | '(' | ')' | '*' | '+' | ',' | ';' | '='
  type unReserved = ALPHA | alpha | digit | '-' | '.' | '_' | '~'
*/

/**
 * based on https://github.com/qwtel/base64-encoding/blob/master/base64-js.ts
 */
const b64lookup: string[] = []
const urlLookup: string[] = []
const revLookup: number[] = []
const CODE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const CODE_B64 = CODE + '+/'
const CODE_URL = CODE + '-_'
const PAD = '='
const MAX_CHUNK_LENGTH = 16383 // must be multiple of 3
for (let i = 0, len = CODE_B64.length; i < len; ++i) {
  b64lookup[i] = CODE_B64[i]
  urlLookup[i] = CODE_URL[i]
  revLookup[CODE_B64.charCodeAt(i)] = i
}
revLookup['-'.charCodeAt(0)] = 62 // minus
revLookup['_'.charCodeAt(0)] = 63 // underscore

function getLens(b64: string) {
  const len = b64.length
  let validLen = b64.indexOf(PAD)
  if (validLen === -1) validLen = len
  const placeHoldersLen = validLen === len ? 0 : 4 - (validLen % 4)
  return [validLen, placeHoldersLen]
}

/** @private */
function _byteLength(validLen: number, placeHoldersLen: number) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen;
}

/**
 * Standardized 'atob()' function, e.g. takes the a Base64 encoded
 * input and decodes it. Note: always returns Uint8Array.
 * Accepts both regular Base64 and the URL-friendly variant,
 * where `+` => `-`, `/` => `_`, and the padding character is omitted.
 *
 * @param str - string in either regular or URL-friendly representation.
 * @return - returns decoded binary result
 */
export function base64ToArrayBuffer(str: string): Uint8Array {
  if (!_assertBase64(str)) throw new Error(`invalid character in string '${str}'`)
  let tmp: number
  switch (str.length % 4) {
    case 2: str += '=='; break;
    case 3: str += '='; break;
  }
  const [validLen, placeHoldersLen] = getLens(str);
  const arr = new Uint8Array(_byteLength(validLen, placeHoldersLen));
  let curByte = 0;
  const len = placeHoldersLen > 0 ? validLen - 4 : validLen;
  let i: number;
  for (i = 0; i < len; i += 4) {
    const r0: number = revLookup[str.charCodeAt(i)];
    const r1: number = revLookup[str.charCodeAt(i + 1)];
    const r2: number = revLookup[str.charCodeAt(i + 2)];
    const r3: number = revLookup[str.charCodeAt(i + 3)];
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

function tripletToBase64(lookup: string[], num: number) {
  return (
    lookup[num >> 18 & 0x3f] +
    lookup[num >> 12 & 0x3f] +
    lookup[num >> 6 & 0x3f] +
    lookup[num & 0x3f]
  );
}

function encodeChunk(lookup: string[], view: DataView, start: number, end: number) {
  let tmp: number;
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

const bs2dv = (bs: BufferSource) => bs instanceof ArrayBuffer
  ? new DataView(bs)
  : new DataView(bs.buffer, bs.byteOffset, bs.byteLength)

/**
 * Compare buffers
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
 * Standardized 'btoa()'-like function, e.g., takes a binary string
 * ('b') and returns a Base64 encoded version ('a' used to be short
 * for 'ascii'). Defaults to URL safe ('url') but can be overriden
 * to use standardized Base64 ('b64').
 *
 * @param buffer - binary string
 * @param variant - 'b64' or 'url'
 * @return - returns Base64 encoded string
 */
function arrayBufferToBase64(buffer: BufferSource | ArrayBuffer | Uint8Array | null, variant: 'b64' | 'url' = 'url'): string {
  if (buffer == null) {
    _sb_exception('L893', 'arrayBufferToBase64() -> null paramater')
    return ''
  } else {
    const view = bs2dv(buffer)
    const len = view.byteLength
    const extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
    const len2 = len - extraBytes
    const parts = new Array(
      Math.floor(len2 / MAX_CHUNK_LENGTH) + Math.sign(extraBytes)
    )
    const lookup = variant == 'url' ? urlLookup : b64lookup
    const pad = ''
    let j = 0
    for (let i = 0; i < len2; i += MAX_CHUNK_LENGTH) {
      parts[j++] = encodeChunk(
        lookup,
        view,
        i,
        (i + MAX_CHUNK_LENGTH) > len2 ? len2 : (i + MAX_CHUNK_LENGTH),
      )
    }
    if (extraBytes === 1) {
      const tmp = view.getUint8(len - 1);
      parts[j] = (
        lookup[tmp >> 2] +
        lookup[(tmp << 4) & 0x3f] +
        pad + pad
      )
    } else if (extraBytes === 2) {
      const tmp = (view.getUint8(len - 2) << 8) + view.getUint8(len - 1)
      parts[j] = (
        lookup[tmp >> 10] +
        lookup[(tmp >> 4) & 0x3f] +
        lookup[(tmp << 2) & 0x3f] +
        pad
      );
    }
    return parts.join('')
  }
}

// Define the base62 dictionary (alphanumeric)
// We want the same sorting order as ASCII, so we go with 0-9A-Za-z
const base62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
// const base62Regex = /^(a32\.)?[0-9A-Za-z]{43}$/;
const array32regex = /^(a32\.)?[0-9A-Za-z]{43}$/;
const b62regex = /^[0-9a-zA-Z]*$/; // kinder and gentler (any b62)

const intervals = new Map<number, number>([
  [32, 43],
  [16, 22],
  [8, 11],
  [4, 6],
]);
const inverseIntervals = new Map(Array.from(intervals, ([key, value]) => [value, key]));
const inverseKeys = Array.from(inverseIntervals.keys()).sort((a, b) => a - b);

function _arrayBufferToBase62(buffer: ArrayBuffer, c: number): string {
  if (buffer.byteLength !== c || !intervals.has(c)) throw new Error("[arrayBufferToBase62] Decoding error")
  let result = '';
  for (let n = BigInt('0x' + Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''));
    n > 0n;
    n = n / 62n)
    result = base62[Number(n % 62n)] + result;
  return result.padStart(intervals.get(c)!, '0');
}

/**
 * Converts any array buffer to base62.
 * Restriction: ArrayBuffer must be size multiple of 4 bytes (32 bits).
 */
export function arrayBufferToBase62(buffer: ArrayBuffer): string {
  let l = buffer.byteLength;
  if (l % 4 !== 0) throw new Error("[arrayBufferToBase62] Must be multiple of 4 bytes (32 bits).")
  let i = 0;
  let result = '';
  while (l > 0) {
    let c = 2 ** Math.min(Math.floor(Math.log2(l)), 5); // next chunk
    let chunk = buffer.slice(i, i + c);
    result += _arrayBufferToBase62(chunk, c);
    i += c;
    l -= c;
  }
  return result
}

// t is 32, 16, 8, or 4
function _base62ToArrayBuffer(s: string, t: number): ArrayBuffer {
  let n = 0n;
  try {
    for (let i = 0; i < s.length; i++) {
      const digit = BigInt(base62.indexOf(s[i]));
      n = n * 62n + digit;
    }
    if (n > 2n ** BigInt(t * 8) - 1n) // check overflow
      throw new Error(`base62ToArrayBuffer: value exceeds ${t * 8} bits.`);
    const buffer = new ArrayBuffer(t);
    const view = new DataView(buffer);
    for (let i = 0; i < (t / 4); i++) {
      const uint32 = Number(BigInt.asUintN(32, n));
      view.setUint32(((t / 4) - i - 1) * 4, uint32);
      n = n >> 32n;
    }
    return buffer;
  } catch (e) {
    console.error("[_base62ToArrayBuffer] Error: ", e)
    throw (e)
  }
}

/**
 * base62ToArrayBuffer
 * 
 * Converts a base62 string to matchin ArrayBuffer.
 * Restriction: the original array buffer size must have
 * been a multiple of 4 bytes (32 bits), eg. this
 * function will always return such an ArrayBuffer.
 */
export function base62ToArrayBuffer(s: string): ArrayBuffer {
  if (!b62regex.test(s)) throw new Error('base62ToArrayBuffer32: must be alphanumeric (0-9A-Za-z).');
  let i = 0, j = 0, c, oldC = 43
  let result = new Uint8Array(s.length); // more than we need
  try {
    while (i < s.length) {
      c = inverseKeys.filter(num => num <= (s.length - i)).pop()!;
      if (oldC < 43 && c >= oldC) throw new Error('cannot decypher b62 string (incorrect length)')
      oldC = c // decoding check: other than with 43, should be decreasing
      let chunk = s.slice(i, i + c);
      const newBuf = new Uint8Array(_base62ToArrayBuffer(chunk, inverseIntervals.get(c)!))
      result.set(newBuf, j);
      i += c;
      j += newBuf.byteLength
    }
    return result.buffer.slice(0, j);
  } catch (e) {
    console.error("[base62ToArrayBuffer] Error:", e)
    throw (e)
  }
}


/**
   A 'branded' string type for base62 encoded strings.
   This is used to ensure that the string is a valid base62
   encoded string.
   
   "ArrayBuffer32" is a 256-bit array buffer. We use this
    as the ASCII representation of binary objects that are
    designed to be multiples of 256 bits. This has a number
    of advantages, and leverages the facts that 43 characters
    of base62 is slightly more than 256 bits (99.99% efficient).

    Note that this approach was not practical prior to es2020,
    when BigInt was added to JavaScript. BigInt allows us to
    work natively with 256-bit integers.

    */
export type Base62Encoded = string & { _brand?: 'Base62Encoded' };

/**
 * Convenience wrapper, enforces array32 format
 */
export function base62ToArrayBuffer32(s: Base62Encoded): ArrayBuffer {
  if (!array32regex.test(s)) throw new Error(`base62ToArrayBuffer32: string must match: ${array32regex}, value provided was ${s}`);
  return base62ToArrayBuffer(s)
}

/**
 * Convenience wrapper.
 */
export function arrayBuffer32ToBase62(buffer: ArrayBuffer): Base62Encoded {
  if (buffer.byteLength !== 32)
    throw new Error('arrayBufferToBase62: buffer must be exactly 32 bytes (256 bits).');
  return arrayBufferToBase62(buffer)
}


/**
 * base62ToBase64 converts a base62 encoded string to a base64 encoded string.
 * 
 * @param s base62 encoded string
 * @returns base64 encoded string
 * 
 * @throws Error if the string is not a valid base62 encoded string
 */
export function base62ToBase64(s: Base62Encoded): string {
  return arrayBufferToBase64(base62ToArrayBuffer32(s));
}

/**
 * Convenience function.
 * 
 * base64ToBase62 converts a base64 encoded string to a base62 encoded string.
 * 
 * @param s base64 encoded string
 * @returns base62 encoded string
 * 
 * @throws Error if the string is not a valid base64 encoded string
 */
export function base64ToBase62(s: string): Base62Encoded {
  return arrayBufferToBase62(base64ToArrayBuffer(s));
}

// and a type guard
export function isBase62Encoded(value: string | Base62Encoded): value is Base62Encoded {
  return array32regex.test(value);
}

/**
 * Appends two buffers and returns a new buffer
 * 
 * @param {Uint8Array | ArrayBuffer} buffer1
 * @param {Uint8Array | ArrayBuffer} buffer2
 * @return {ArrayBuffer} new buffer
 *
 */
function _appendBuffer(buffer1: Uint8Array | ArrayBuffer, buffer2: Uint8Array | ArrayBuffer): ArrayBuffer {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
}

/**
 * Partition
 */
export function partition(str: string, n: number) {
  throw (`partition() not tested on TS yet - (${str}, ${n})`)
}

/**
 * There are many problems with JSON parsing, adding a resilient wrapper to capture more info.
 * The 'loc' parameter should be a (unique) string that allows you to find the usage
 * in the code; one approach is the line number in the file.
 */
export function jsonParseWrapper(str: string | null, loc?: string, reviver?: (this: any, key: string, value: any) => any) {
  while (str && typeof str === 'string') {
    try {
      str = JSON.parse(str, reviver) // handle nesting
    } catch (e) {
      throw new Error(`JSON.parse() error${loc ? ` at ${loc}` : ''}: ${e}\nString (possibly nested) was: ${str}`)
    }
  }
  return str as any
}


/** Essentially a dictionary where each entry is an arraybuffer. */
export interface SBPayload {
  [index: string]: ArrayBuffer;
}

export function assemblePayload2(data: SBPayload): ArrayBuffer | null {
  try {
    const metadata: Dictionary<any> = {};
    metadata['version'] = '002';
    let keyCount = 0;
    let startIndex = 0;
    for (const key in data) {
      keyCount++;
      metadata[keyCount.toString()] = { name: key, start: startIndex, size: data[key].byteLength };
      startIndex += data[key].byteLength;
    }
    const encoder = new TextEncoder();
    const metadataBuffer: ArrayBuffer = encoder.encode(JSON.stringify(metadata));
    const metadataSize = new Uint32Array([metadataBuffer.byteLength]);
    let payload = _appendBuffer(new Uint8Array(metadataSize.buffer), new Uint8Array(metadataBuffer));
    for (const key in data)
      payload = _appendBuffer(new Uint8Array(payload), data[key]);
    return payload;
  } catch (e) {
    console.error(e);
    return null;
  }
}

function is32BitSignedInteger(number: number) {
  const MIN_32_INT = -2147483648;
  const MAX_32_INT = 2147483647;
  return (
    typeof number === 'number' &&
    number >= MIN_32_INT &&
    number <= MAX_32_INT &&
    number % 1 === 0
  );
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
  if (typeof value === 'boolean') return 'b';
  if (value instanceof DataView) return 'v';
  if (value instanceof Date) return 'd';
  if (value instanceof Map) return 'm';
  if (typeof value === 'number') {
    if (is32BitSignedInteger(value)) return 'i'; // tiny optimization
    else return 'n';
  }
  if (value !== null && typeof value === 'object' && value.constructor === Object) return 'o';
  if (value instanceof Set) return 't';
  if (typeof value === 'string') return 's';
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    // it's a typed array; currently we're only supporting Uint8Array
    if (value.constructor.name === 'Uint8Array') return '8';
    console.error("[getType] Unsupported typed array:", value.constructor.name)
    return '<unsupported>';
  }
  console.error('[getType] Unsupported for object:', value)
  return '<unsupported>';
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
            if (!payload) throw new Error(`Failed to assemble payload for ${key}`);
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
            if (!mapPayload) throw new Error(`Failed to assemble payload for ${key}`);
            BufferList.push(mapPayload);
            break;
          case 'a': // Array
            const arrayValue = new Array();
            value.forEach((v: any) => {
              arrayValue.push(v);
            });
            const arrayPayload = _assemblePayload(arrayValue);
            if (!arrayPayload) throw new Error(`Failed to assemble payload for ${key}`);
            BufferList.push(arrayPayload);
            break;
          case 't': // Set
            const setValue = new Array();
            value.forEach((v: any) => {
              setValue.push(v);
            });
            const setPayload = _assemblePayload(setValue);
            if (!setPayload) throw new Error(`Failed to assemble payload for ${key}`);
            BufferList.push(setPayload);
            break;
          case '0': // Null
            BufferList.push(new ArrayBuffer(0));
            break;
          case 'u': // Undefined
            BufferList.push(new ArrayBuffer(0));
            break;
          case 'v': // Dataview, not supporting for now
          case '<unsupported>':
          default:
            console.error(`[assemblePayload] Unsupported type: ${type}`);
            throw new Error(`Unsupported type: ${type}`);
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
  return _assemblePayload({ ver003: true, payload: data })
}

export function extractPayload2(payload: ArrayBuffer): SBPayload {
  try {
    // number of bytes of meta data (encoded as a 32-bit Uint)
    const metadataSize = new Uint32Array(payload.slice(0, 4))[0];
    const decoder = new TextDecoder();
    // extracts the string of meta data and parses
    const _metadata: Dictionary<any> = jsonParseWrapper(decoder.decode(payload.slice(4, 4 + metadataSize)), 'L533');
    // calculate start of actual contents
    const startIndex: number = 4 + metadataSize;
    if (!_metadata.version) _metadata['version'] = '001' // backwards compat
    switch (_metadata['version']) {
      case '001': {
        throw new Error('extractPayload() exception: version 001 is no longer supported');
      }
      case '002': {
        const data: Dictionary<any> = [];
        for (let i = 1; i < Object.keys(_metadata).length; i++) {
          const _index = i.toString();
          if (_metadata[_index]) {
            const propertyStartIndex: number = _metadata[_index]['start'];
            // start (in bytes) of contents
            const size: number = _metadata[_index]['size'];
            // where to put it
            const entry: Dictionary<any> = _metadata[_index]
            // extracts contents - this supports raw data
            data[entry['name']] = payload.slice(startIndex + propertyStartIndex, startIndex + propertyStartIndex + size);
          } else {
            console.log(`found nothing for index ${i}`)
          }
        }
        return data;
      }
      default: {
        throw new Error('Unsupported payload version (' + _metadata['version'] + ') - fatal');
      }
    }
  } catch (e) {
    throw new Error('extractPayload() exception (' + e + ')');
  }
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
      if (!arrayPayload) throw new Error(`Failed to assemble payload for ${type}`);
      return Object.values(arrayPayload);
    case 'm': // Map
      const mapPayload = _extractPayload(buffer);
      if (!mapPayload) throw new Error(`Failed to assemble payload for ${type}`);
      const map = new Map();
      for (const key in mapPayload) {
        map.set(mapPayload[key][0], mapPayload[key][1]);
      }
      return map;
    case 't': // Set
      const setPayload = _extractPayload(buffer);
      if (!setPayload) throw new Error(`Failed to assemble payload for ${type}`);
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
      throw new Error(`Unsupported type: ${type}`);
  }
}

function _extractPayload(payload: ArrayBuffer): any {
  try {
    const metadataSize = new Uint32Array(payload.slice(0, 4))[0];
    const decoder = new TextDecoder();
    const json = decoder.decode(payload.slice(4, 4 + metadataSize));
    // console.log("json is", json)
    const metadata = jsonParseWrapper(json, "L1290");
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
    throw new Error('extractPayload() exception (' + e + ')');
  }
}
/**
 * Extract payload - this decodes from our binary (wire) format
 * to a JS object. This supports a wide range of objects.
 */
export function extractPayload(value: ArrayBuffer): any {
  // todo: add hack check for version (must be 003)
  return _extractPayload(value);
}

/**
 * Make sure base64 encoding is URL version
 */
export function encodeB64Url(input: string) {
  return input.replaceAll('+', '-').replaceAll('/', '_');
}

/**
 * Convert base64 URL encoding to standard base64
 */
export function decodeB64Url(input: string) {
  input = input.replaceAll('-', '+').replaceAll('_', '/');
  // Pad out with standard base64 required padding characters
  const pad: number = input.length % 4;
  if (pad) {
    _sb_assert(pad !== 1, 'InvalidLengthError: Input base64url string is the wrong length to determine padding');
    input += new Array(5 - pad).join('=');
  }
  return input;
}

//#endregion - SBCryptoUtils

/******************************************************************************************************/
//#region - SBCrypto Class - this is instantiated into 'sbCrypto' global

// /**
//  * Mostly internal. Used to cache in an sbCrypto object
//  * all the keys it has "seen".
//  */
// export type knownKeysInfo = {
//   hash: SB384Hash, // also the map hash
//   jwk?: JsonWebKey, // if we only have crypto key and it's not extractable, this will be undefined
//   key?: CryptoKey, // exists if and only if it's a private key
// }

// /**
//  * SBCrypto
//  *
//  * SBCrypto contains all the SB specific crypto functions,
//  * as well as some general utility functions.
//  *
//  * @class
//  * @constructor
//  * @public
//  */

// /**
//  * 
//   * Typically a public jsonwebkey (JWK) will look something like this in json string format:
//   *
//   *                        "{\"crv\":\"P-384\",\"ext\":true,\"key_ops\":[],\"kty\":\"EC\",
//   *                        \"x\":\"9s17B4i0Cuf_w9XN_uAq2DFePOr6S3sMFMA95KjLN8akBUWEhPAcuMEMwNUlrrkN\",
//   *                        \"y\":\"6dAtcyMbtsO5ufKvlhxRsvjTmkABGlTYG1BrEjTpwrAgtmn6k25GR7akklz9klBr\"}"
//   * 
//   * A private key will look something like this:
//   * 
//   *                       "{\"crv\":\"P-384\",
//   *                       \"d\":\"KCJHDZ34XgVFsS9-sU09HFzXZhnGCvnDgJ5a8GTSfjuJQaq-1N2acvchPRhknk8B\",
//   *                       \"ext\":true,\"key_ops\":[\"deriveKey\"],\"kty\":\"EC\",
//   *                       \"x\":\"rdsyBle0DD1hvp2OE2mINyyI87Cyg7FS3tCQUIeVkfPiNOACtFxi6iP8oeYt-Dge\",
//   *                       \"y\":\"qW9VP72uf9rgUU117G7AfTkCMncJbT5scIaIRwBXfqET6FYcq20fwSP7R911J2_t\"}"
//   * 
//   * These are elliptic curve keys. 
//   * 
//   * The main RFC is 7518 (https://datatracker.ietf.org/doc/html/rfc7518#section-6.2),
//   * supervised by IESG except for a tiny addition of one parameter ("ext") that is 
//   * supervised by the W3C Crypto WG (https://w3c.github.io/webcrypto/#ecdsa).
//   * 
//   * We internally encode these in internal (base62) formats.
//   * 
//   * EC in JWK has a number of parameters, but for us the only required ones are:
//   * 
//   *  crv: the curve (P-384 in this case)
//   *  x: the x coordinate of the public key
//   *  y: the y coordinate of the public key
//   *  d: the private key (if it's a private key)
//   *  kty: the key type (EC in this case)
//   *  ext: the 'extractable' flag
//   *  key_ops: (optional) permitted the key operations
//   * 
//   * Our SBKey formats have a four-character prefix to distinguish types, currently:
//   * 
//   *  "PNk2": public key; only x and y are present, the rest implied [KeyPrefix.SBPublicKey]
//   *  "Xj3p": private key: x, y, d are present, the rest implied [KeyPrefix.SBPrivateKey]
//   * 
//   * For the AES key, we don't have an internal format; properties would include:
//   * 
//   *  "k": the key itself, encoded as base64
//   *  "alg": "A256GCM"
//   *  "key_ops": ["encrypt", "decrypt"]
//   *  "kty": "oct"
//   * 
//   * Only the "k" property is required, the rest are implied, so it's trivial to track.
//   * 
//   * In JWK, x, y, and d are all encoded as base64 characters (or 384 bits), d is omitted
//   * for public keys. We don't use base62 for internal encoding of these.
//   *
// */

export enum KeyPrefix {
  // prefixes are random except that:
  // anything starting with 'P' is public key or identifier
  SBPublicKey = "PNk2",
  // anything starting with 'X' is private key
  SBPrivateKey = "Xj3p"
}

/**
 * SBCrypto
 * 
 * Utility class for SB crypto functions. Note we use an object instantiation
 * of this (typically ''sbCrypto'') as a global variable.
 */
export class SBCrypto {  /************************************************************************************/
  /**
   * Hashes and splits into two (h1 and h1) signature of data, h1
   * is used to request (salt, iv) pair and then h2 is used for
   * encryption (h2, salt, iv).
   * 
   * Transitioning to internal binary format
   *
   * @param buf blob of data to be stored
   *
   */
  generateIdKey(buf: ArrayBuffer): Promise<{ id_binary: ArrayBuffer, key_material: ArrayBuffer }> {
    return new Promise((resolve, reject) => {
      try {
        crypto.subtle.digest('SHA-512', buf).then((digest) => {
          const _id = digest.slice(0, 32);
          const _key = digest.slice(32);
          resolve({
            id_binary: _id,
            key_material: _key
          })

          // resolve({
          //   id32: stripA32(arrayBuffer32ToBase62(_id)),
          //   key32: stripA32(arrayBuffer32ToBase62(_key))
          // })
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * Extracts (generates) public key from a private key.
   */
  extractPubKey(privateKey: JsonWebKey): JsonWebKey | null {
    try {
      const pubKey: JsonWebKey = { ...privateKey };
      delete pubKey.d;
      delete pubKey.dp;
      delete pubKey.dq;
      delete pubKey.q;
      delete pubKey.qi;
      pubKey.key_ops = [];
      return pubKey;
    } catch (e) {
      console.error(e)
      return null
    }
  }

  // nota bene this does, and should, permanently be backwards compatible.
  /** @private */
  async #testHash(channelBytes: ArrayBuffer, channel_id: SBChannelId): Promise<boolean> {
    const MAX_REHASH_ITERATIONS = 160
    let count = 0
    let hash = arrayBufferToBase64(channelBytes)
    while (hash !== channel_id) {
      if (count++ > MAX_REHASH_ITERATIONS) return false
      channelBytes = await crypto.subtle.digest('SHA-384', channelBytes)
      hash = arrayBufferToBase64(channelBytes)
    }
    return true
  }

  /**
   * SBCrypto.compareHashWithKey()
   * 
   * Checks if an existing SB384Hash is 'compatible' with a given key.
   * 
   * Note that you CAN NOT have a hash, and a key, generate a hash
   * from that key, and then compare the two. The hash generation per
   * se will be deterministic and specific AT ANY POINT IN TIME,
   * but may change over time, and this comparison function will 
   * maintain ability to compare over versions.
   * 
   * For example, this comparison will accept a simple straight
   * b64-encoded hash without iteration or other processing.
   * 
   */
  async compareHashWithKey(hash: SB384Hash, key: JsonWebKey | null) {
    if (!hash || !key) return false
    let x = key.x
    let y = key.y
    if (!(x && y)) {
      try {
        // we try to be tolerant of code that loses track of if JWK has been parsed or not
        const tryParse = jsonParseWrapper(key as unknown as string, "L1787");
        if (tryParse.x) x = tryParse.x;
        if (tryParse.y) y = tryParse.y;
      } catch {
        return false;
      }
    }
    const xBytes = base64ToArrayBuffer(decodeB64Url(x!))
    const yBytes = base64ToArrayBuffer(decodeB64Url(y!))
    const channelBytes = _appendBuffer(xBytes, yBytes)

    const sha256 = await crypto.subtle.digest('SHA-256', channelBytes)
    const sha256base62 = arrayBufferToBase62(sha256)
    if (sha256base62 === hash)
      // first try current approach
      return true
    else
      // try old approach
      return await this.#testHash(channelBytes, hash)
  }


  /**
   * 'Compare' two channel IDs. Note that this is not constant time.
   */
  async verifyChannelId(owner_key: JsonWebKey, channel_id: SBChannelId): Promise<boolean> {
    return await this.compareHashWithKey(channel_id, owner_key)
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
      throw new Error('generateKeys() exception (' + e + ')');
    }
  }

  /**
   * SBCrypto.importKey()
   *
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
        if (jsonKey.kty === undefined) throw new Error('importKey() - invalid JsonWebKey');
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
        console.error(msg)
        console.log(format)
        console.log(key)
        console.log(type)
        console.log(extractable)
        console.log(keyUsages)

      }
      throw new Error(msg)
    }
  }

  /**
   * SBCrypto.exportKey()
   * 
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

  /**
   * SBCrypto.deriveKey()
   *
   * Derive key. Takes a private and public key, and returns a Promise to a cryptoKey
   * for 1:1 communication
   */
  deriveKey(privateKey: CryptoKey, publicKey: CryptoKey, type: 'AES-GCM' | 'HMAC', extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey> {
    _sb_assert(privateKey && publicKey, "Either private or public key is null or undefined (L1836)")
    return new Promise(async (resolve, reject) => {
      let _keyAlgorithm: any
      switch (type) {
        case 'AES-GCM': {
          _keyAlgorithm = { name: 'AES-GCM', length: 256 }
          break
        }
        case 'HMAC': {
          _keyAlgorithm = { name: 'HMAC', hash: 'SHA-256', length: 256 }
          break
        }
        default: {
          throw new Error(`deriveKey() - unknown type: ${type}`)
        }
      }
      let _key = publicKey
      if (_key.type === 'private') {
        // handle case of being given a private key (so callee doesn't have to worry)
        const _jwk = await this.exportKey('jwk', _key); _sb_assert(_jwk, "INTERNAL (L1878)")
        delete _jwk!.d
        delete _jwk!.alg // Deno issue
        _key = await this.importKey('jwk', _jwk!, 'ECDH', true, []);
        _sb_assert(_key, "INTERNAL (L1882)")
      }
      _sb_assert(_key.type === 'public', "INTERNAL (L1884)")
      try {
        resolve(await crypto.subtle.deriveKey({
          name: 'ECDH',
          public: _key
        },
          privateKey,
          _keyAlgorithm,
          extractable,
          keyUsages));
      } catch (e) {
        console.error(e, privateKey, publicKey, type, extractable, keyUsages);
        reject(e);
      }
    });
  }

  async encrypt(data: BufferSource, key: CryptoKey, params: EncryptParams): Promise<ArrayBuffer> {
    if (data === null) throw new Error('no contents')
    if (!params.iv) throw new Error('no nonce')
    if (!params.name) params.name = 'AES-GCM';
    else _sb_assert(params.name === 'AES-GCM', "Must be AES-GCM (L1951)")
    return crypto.subtle.encrypt(params as AesGcmParams, key, data);
  }


  /**
   * Basic (core) method to construct a ChannelMessage
   * 
   * @param body can be almost any JS object
   * @param sender SBUserId of sender
   * @param encryptionKey CryptoKey for encrypting message
   * @param signingKey CryptoKey for signing message
   * @returns 
   */
  async wrap(body: any, sender: SBUserId, encryptionKey: CryptoKey, signingKey: CryptoKey): Promise<ChannelMessage> {
    _sb_assert(body && sender && encryptionKey && signingKey, "wrapMessage(): missing required parameter(2)")
    const payload = assemblePayload(body);
    _sb_assert(payload, "wrapMessage(): failed to assemble payload")
    _sb_assert(payload!.byteLength < MAX_SB_BODY_SIZE,
      `wrapMessage(): body must be smaller than ${MAX_SB_BODY_SIZE / 1024} KiB (we got ${payload!.byteLength / 1024} KiB)})`)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const timestamp = Math.round(Date.now() / 25) * 25 // fingerprinting protection
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, timestamp);
    const message: ChannelMessage = {
      unencryptedContents: body, // payload!,
      c: await sbCrypto.encrypt(payload!, encryptionKey, { iv: iv, additionalData: view }),
      iv: iv,
      f: sender,
      s: await sbCrypto.sign(signingKey, payload!),
      ts: timestamp,
    }
    return message
  }

  /**
   * SBCrypto.unwrap
   *
   * Decrypts a 'wrapped' message, eg decrypts
   */
  unwrap(k: CryptoKey, o: ChannelMessage): Promise<ArrayBuffer> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!o.ts) throw new Error(`unwrap() - no timestamp in encrypted message`)
        const { c: t, iv: iv } = o // encryptedContentsMakeBinary(o)
        _sb_assert(t, "[unwrap] No contents in encrypted message (probably an error)")
        const view = new DataView(new ArrayBuffer(8));
        view.setFloat64(0, o.ts);
        const d = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv, additionalData: view }, k, t!)
        resolve(d)
      } catch (e) {
        // not an error per se, for example could just be wrong key
        if (DBG) console.error(`unwrap(): cannot unwrap/decrypt - rejecting: ${e}`)
        reject(e);
      }
    });
  }

  /**
   * SBCrypto.sign()
   */
  sign(signKey: CryptoKey, contents: ArrayBuffer) {
    // return crypto.subtle.sign('HMAC', secretKey, contents);
    return crypto.subtle.sign({ name: "ECDSA", hash: { name: "SHA-384" }, }, signKey, contents)
  }

  /**
   * SBCrypto.verify()
   */
  verify(verifyKey: CryptoKey, sign: ArrayBuffer, contents: ArrayBuffer) {
    // return crypto.subtle.verify('HMAC', verifyKey, sign, contents)
    return crypto.subtle.verify( { name: "ECDSA", hash: { name: "SHA-384" }, }, verifyKey, sign, contents)
  }

  /**
   * Standardized 'str2ab()' function, string to array buffer.
   * This assumes on byte per character.
   *
   * @param {string} string
   * @return {Uint8Array} buffer
   */
  str2ab(string: string): Uint8Array {
    return new TextEncoder().encode(string);
  }

  /**
   * Standardized 'ab2str()' function, array buffer to string.
   * This assumes one byte per character.
   *
   * @param {Uint8Array} buffer
   * @return {string} string
   */
  ab2str(buffer: Uint8Array): string {
    return new TextDecoder('utf-8').decode(buffer);
  }

  /**
   * SBCrypto.compareKeys()
   *
   * Compare JSON keys, true if the 'same', false if different. We consider
   * them "equal" if both have 'x' and 'y' properties and they are the same.
   * (Which means it doesn't care about which or either being public or private)
   */
  compareKeys(key1: Dictionary<any>, key2: Dictionary<any>): boolean {
    if (key1 != null && key2 != null && typeof key1 === 'object' && typeof key2 === 'object')
      return key1['x'] === key2['x'] && key1['y'] === key2['y'];
    return false;
  }



} /* SBCrypto */
//#endregion - SBCrypto Class

/******************************************************************************************************/
//#region Decorators

// Decorator
// caches resulting value (after any verifications eg ready pattern)
/** @private */
function Memoize(target: any, propertyKey: string /* ClassGetterDecoratorContext */, descriptor?: PropertyDescriptor) {
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
/** @private */
function Ready(target: any, propertyKey: string /* ClassGetterDecoratorContext */, descriptor?: PropertyDescriptor) {
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

      // const obj = target.constructor.name
      // const rf = `${obj}ReadyFlag` as keyof PropertyDescriptor
      // _sb_assert(rf in this, `'${rf} missing yet getter accessed with @Ready pattern (fatal)`)
      // _sb_assert(this[rf], `'${obj}.${propertyKey}' getter accessed but object not 'ready' (fatal)`)
      // const retValue = get.call(this)
      // _sb_assert(retValue != null, `'${obj}.${propertyKey}' getter accessed but return value will be NULL (fatal)`)
      // return retValue
    }
  }
}

// Decorator
// asserts caller is an owner of the channel for which an api is called
/** @private */
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
/** @private */
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

// Decorator
// turns any exception into a reject
/** @private */
function ExceptionReject(target: any, _propertyKey: string /* ClassMethodDecoratorContext */, descriptor?: PropertyDescriptor) {
  if ((descriptor) && (descriptor.value)) {
    const operation = descriptor.value
    descriptor.value = function (...args: any[]) {
      try {
        return operation.call(this, ...args)
      } catch (e) {
        console.log(`ExceptionReject: ${WrapError(e)}`)
        console.log(target)
        console.log(_propertyKey)
        console.log(descriptor)
        return new Promise((_resolve, reject) => reject(`Reject: ${WrapError(e)}`))
      }
    }
  }
}

const SB_CLASS_ARRAY = ['SBMessage', 'SBObjectHandle', 'SBChannelHandle', 'ChannelApiBody'] as const

type SB_CLASS_TYPES = typeof SB_CLASS_ARRAY[number]
type SB_CLASSES = SBMessage | SBObjectHandle | SBChannelHandle

const SB_CHANNEL_MESSAGE_SYMBOL = Symbol('SB_CHANNEL_MESSAGE_SYMBOL')
const SB_CHANNEL_API_BODY_SYMBOL = Symbol('SB_CHANNEL_API_BODY_SYMBOL')
const SB_CHANNEL_HANDLE_SYMBOL = Symbol('SBChannelHandle')
const SB_MESSAGE_SYMBOL = Symbol.for('SBMessage')
const SB_OBJECT_HANDLE_SYMBOL = Symbol.for('SBObjectHandle')

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


//#endregion - local decorators


/******************************************************************************************************/
//#region - IndexedDb caching

const SB_CACHE_DB_NAME = "SBMessageCache"

class SBMessageCache {
  readyPromise: Promise<SBMessageCache>
  db?: IDBDatabase
  constructor(public dbName: string, dbVersion: number = 1) {
    this.readyPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in globalThis)) {
        console.warn("IndexedDB is not supported in this environment. SBCache will not be functional.");
        reject("IndexedDB not supported");
        return;
      }
      const request = indexedDB.open(dbName, dbVersion);
      request.onsuccess = () => { this.db = request.result; resolve(this); };
      request.onerror = () => { reject(`Database error ('${dbName}): ` + request.error); };
    });
  }
  getObjStore(name?: string, mode: IDBTransactionMode = "readonly"): IDBObjectStore {
    if (!name) name = this.dbName
    _sb_assert(this.db, "Internal Error [L2009]")
    const transaction = this.db?.transaction(SB_CACHE_DB_NAME, mode);
    const objectStore = transaction?.objectStore(SB_CACHE_DB_NAME);
    _sb_assert(objectStore, "Internal Error [L2013]")
    return objectStore!
  }
  // insert KV entry as { key: key, value: value }
  async add(key: string, value: any): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const objectStore = this.getObjStore("readwrite")
      const request = objectStore.put({ key: key, value: value }); // overwrites if present
      request.onsuccess = () => { resolve(); };
      request.onerror = () => { reject('[add] Received error accessing keys'); };
    });
  }
  // fetch an entry, returning the value
  async get(key: string): Promise<ChannelMessage | undefined> {
    return new Promise(async (resolve, reject) => {
      await this.readyPromise
      const objectStore = this.getObjStore()
      const request = objectStore.get(key);
      request.onsuccess = () => { resolve(request.result?.value); };
      request.onerror = () => { reject('[get] Received error accessing keys'); };
    });
  }
  getLowerUpper(channelId: SBChannelId, timestampPrefix: string, i2?: string): [string, string] {
    const upperBound = timestampPrefix.padEnd(26, '3');
    const sep = i2 ? `_${i2}_` : '______'
    const lowerBound = channelId + sep + timestampPrefix;
    return [lowerBound, upperBound]
  }
  async getKnownMessageKeys(channelId: SBChannelId, timestampPrefix: string, i2?: string): Promise<Set<ChannelMessage>> {
    return new Promise(async (resolve, reject) => {
      await this.readyPromise
      const objectStore = this.getObjStore()
      const [lower, upper] = this.getLowerUpper(channelId, timestampPrefix, i2)
      const keyRange = IDBKeyRange.bound(lower, upper, false, false);
      const getAllKeysRequest = objectStore?.getAllKeys(keyRange);
      if (!getAllKeysRequest) resolve(new Set()); // unable to set up query
      getAllKeysRequest!.onsuccess = () => { resolve(new Set(getAllKeysRequest!.result) as Set<ChannelMessage>); }; // IDBValidKey can be string
      getAllKeysRequest!.onerror = () => { reject('[getKnownMessageKeys] Received error accessing keys'); };
    });
  }
  async getKnownMessages(channelId: SBChannelId, timestampPrefix: string, i2?: string): Promise<Map<string, any>> {
    return new Promise(async (resolve, reject) => {
      await this.readyPromise
      const objectStore = this.getObjStore()
      const [lower, upper] = this.getLowerUpper(channelId, timestampPrefix, i2)
      const keyRange = IDBKeyRange.bound(lower, upper, false, false);
      const getAllRequest = objectStore?.getAll(keyRange);
      if (!getAllRequest) resolve(new Map()); // unable to set up query
      getAllRequest!.onsuccess = () => { resolve(new Map(getAllRequest!.result) as Map<string, any>); };
      getAllRequest!.onerror = () => { reject('[getKnownMessages] Received error accessing keys'); };
    });
  }
}

if ('indexedDB' in globalThis)
  (globalThis as any).sbMessageCache = new SBMessageCache(SB_CACHE_DB_NAME, 1)

//#endregion - IndexedDb caching



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
  #d?: string

  #privateUserKey?: CryptoKey // if present always private
  #publicUserKey?: CryptoKey  // always public

  #signKey?: CryptoKey // can sign/verify if private, or just verify

  #hash?: SB384Hash // generic 'identifier', see hash getter below

  constructor(key?: CryptoKey | JsonWebKey | SBUserPublicKey | SBUserPrivateKey, forcePrivate?: boolean) {
    (this as any)[SB384.ReadyFlag] = false;
    this.sb384Ready = new Promise<SB384>(async (resolve, reject) => {
      try {
        if (!key) {
          // generate a fresh ID
          if (DBG) console.log("SB384() - generating new key pair")
          const keyPair = await sbCrypto.generateKeys()
          const _jwk = await sbCrypto.exportKey('jwk', keyPair.privateKey);
          _sb_assert(_jwk && _jwk.x && _jwk.y && _jwk.d, 'INTERNAL');
          this.#private = true
          this.#x = _jwk!.x!
          this.#y = _jwk!.y!
          this.#d = _jwk!.d!

          // this.#userKey = keyPair.privateKey
          // this.#jwk = await sbCrypto.exportKey('jwk', this.#userKey)
          // // this.#userKey = sbCrypto.JWKToSBKey(this.#jwk!, true)
          // // _sb_assert(this.#sbUserKey, `ERROR creating SB384 object: failed to convert JWK to SBKey (should not happen)`)

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
          if (!tryParse) throw new Error('ERROR creating SB384 object: invalid key (must be a JsonWebKey | SBUserPublicKey | SBUserPrivateKey, or omitted)')
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

          // // this.#sbUserKey = sbCrypto.StringToSBKey(key)
          // const _sbUserKey = sbCrypto.StringToSBKey(key)
          // if (!_sbUserKey)
          //   throw new Error(`ERROR creating SB384 object: failed to import SBUserId`)
          // if (_sbUserKey.prefix === KeyPrefix.SBPublicKey) {
          //   this.#private = false
          //   if (forcePrivate)
          //     throw new Error(`ERROR creating SB384 object: key provided is not the requested private`)
          // } else if (_sbUserKey.prefix === KeyPrefix.SBPrivateKey) {
          //   this.#private = true
          // } else throw new Error(`ERROR creating SB384 object: invalid key (neither public nor private)`)
          // this.#jwk = sbCrypto.SBKeyToJWK(_sbUserKey!)

        } else {
          throw new Error('ERROR creating SB384 object: invalid key (must be a JsonWebKey, SBUserId, or omitted)')
        }

        if (DBG2) console.log("SB384() constructor; x/y/d:\n", this.#x, "\n", this.#y, "\n", this.#d)

        if (this.#private)
          this.#privateUserKey = await sbCrypto.importKey('jwk', this.jwkPrivate, 'ECDH', true, ['deriveKey'])
        this.#publicUserKey = await sbCrypto.importKey('jwk', this.jwkPublic, 'ECDH', true, [])

        // we mostly use for sign/verify, occasionally encryption, so double use is ... hopefully ok
        if (this.#private) {
          const newJwk = { ...this.jwkPrivate, key_ops: ['sign'] }
          if (DBG) console.log('starting jwk (private):\n', newJwk)
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
          if (DBG) console.log('starting jwk (public):\n', newJwk)
          this.#signKey = await crypto.subtle.importKey("jwk",
            newJwk,
            {
              name: "ECDSA",
              namedCurve: "P-384",
            },
            true,
            ['verify'])
        }

        // this.#hash = await sbCrypto.sb384Hash(this.#jwk)
        // can't put in getter since it's async
        const channelBytes = _appendBuffer(base64ToArrayBuffer(this.#x!), base64ToArrayBuffer(this.#y!))
        this.#hash = arrayBufferToBase62(await crypto.subtle.digest('SHA-256', channelBytes))
        if (DBG2) console.log("SB384() constructor; hash:\n", this.#hash)

        // this.#exportable_privateKey = await sbCrypto.exportKey('jwk', keyPair.privateKey)
        // this.#exportable_privateKey = await sbCrypto.exportKey('jwk', this.#privateKey)

        if (DBG) console.log("SB384() - constructor wrapping up", this)
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

  // convenience getter
  @Memoize @Ready get userId(): SB384Hash { return this.hash }

  /** ChannelID that corresponds to this, if it's an owner */
  @Memoize @Ready get ownerChannelId() {
    // error even though there's a #hash, since we know it needs to be private
    // ... update, hm, actually this is still used as "whatif" for non-owner
    // if (!this.private) throw new Error(`ownerChannelId() - not a private key, cannot be an owner key`)
    return this.hash
  }

  /** @type {CryptoKey} Private key (might not be present, in which case this will throw) */
  @Memoize @Ready get privateKey(): CryptoKey {
    if (!this.private) throw new Error(`this is a public key, there is no 'privateKey' value`)
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

  /**
   * Wire format of full (decodable) public key
   * @type {SBUserPublicKey}
   */
  @Memoize get userPublicKey(): SBUserPublicKey {
    _sb_assert(this.#x && this.#y, "userPublicKey() - sufficient key info is not available (fatal)")
    const combined = new Uint8Array(48 * 2);
    combined.set(base64ToArrayBuffer(this.#x!), 0);
    combined.set(base64ToArrayBuffer(this.#y!), 48);
    return (KeyPrefix.SBPublicKey + arrayBufferToBase62(combined)) as SBUserPublicKey
  }

  /**
   * Wire format of full info of key (eg private key).
   * @type {SBUserPrivateKey}
   */
  @Memoize get userPrivateKey(): SBUserPrivateKey {
    _sb_assert(this.#private, 'userPrivateKey() - not a private key, there is no userPrivateKey')
    _sb_assert(this.#x && this.#y && this.#d, "userPrivateKey() - sufficient key info is not available (fatal)")
    const combined = new Uint8Array(3 * 48);
    combined.set(base64ToArrayBuffer(this.#x!), 0);
    combined.set(base64ToArrayBuffer(this.#y!), 48);
    combined.set(base64ToArrayBuffer(this.#d!), 96);
    return (KeyPrefix.SBPrivateKey + arrayBufferToBase62(combined)) as SBUserPrivateKey
  }

} /* class SB384 */

/**
 * The minimum state of a Channel is the "user" keys, eg
 * how we identify when connecting to the channel.
 * 
 * 'handle' means we're initializing off a channel handle.
 * that means we are not owner, and that the channel exists.
 * (eg the provided user ID is public keys, eg SBUserId)
 * channel keys are fetched from channel server
 * 
 * 'jwk' and 'new' both mean it's a "new" channel, in the
 * former case we're given private key for user, in the
 * latter case (convenience) we create a fresh ID. the
 * callee needs to create or budd channel.
 */
export class SBChannelKeys extends SB384 {
  #channelId?: SBChannelId
  sbChannelKeysReady: Promise<SBChannelKeys>
  static ReadyFlag = Symbol('SBChannelKeysReadyFlag'); // see below for '(this as any)[<class>.ReadyFlag] = false;'
  #channelData?: SBChannelData
  channelServer?: string // can be read/written freely

  constructor(handleOrKey?: SBChannelHandle | SBUserPrivateKey) {
    // handelOrKey as undefined is fine, but 'null' is NOT ok
    if (handleOrKey === null) throw new Error(`SBChannelKeys constructor: you cannot pass 'null'`)
    if (handleOrKey) {
      if (typeof handleOrKey === 'string') {
        const ownerPrivateKey = handleOrKey as SBUserPrivateKey
        super(ownerPrivateKey, true)
      } else if (_checkChannelHandle(handleOrKey)) {
        const handle = validate_SBChannelHandle(handleOrKey)
        super(handle.userPrivateKey, true);
        if (handle.channelServer) {
          this.channelServer = handle.channelServer;
          // make sure there are no trailing '/' in channelServer
          if (this.channelServer![this.channelServer!.length - 1] === '/')
            this.channelServer = this.channelServer!.slice(0, -1);
        }
        this.#channelId = handle.channelId
        this.#channelData = handle.channelData // which might not be there
      } else {
        throw new Error(`SBChannelKeys() constructor: invalid parameter (must be SBChannelHandle or SBUserPrivateKey)`)
      }
    } else {
      // brand new, state will be derived from SB384 keys
      super()
    }
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
            throw new Error("SBChannelKeys() constructor: either key is owner key, or handle contains channelData, or channelServer is provided ...")
          if (DBG) console.log("++++ SBChannelKeys being initialized from server")
          var cpk: SBChannelData = await this.#callApi('/getChannelKeys')
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

  /**
    * Implements Channel api calls.
    * 
    * Note that the API call details are also embedded in the ChannelMessage,
    * and signed by the sender, completely separate from HTTP etc auth.
    */
  #callApi(path: string): Promise<any>
  #callApi(path: string, apiPayload: any): Promise<any>
  #callApi(path: string, apiPayload?: any): Promise<any> {
    _sb_assert(this.channelServer, "[ChannelApi.#callApi] channelServer is unknown")
    if (DBG) console.log("ChannelApi.#callApi: calling fetch with path:", path, "body:", apiPayload)
    _sb_assert(this.#channelId && path, "Internal Error (L2528)")
    return new Promise(async (resolve, reject) => {
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
        apiPayload: apiPayloadBuf,
        timestamp: timestamp,
        sign: sign
      }
      const init: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream"',
        },
        body: assemblePayload(validate_ChannelApiBody(apiBody))
      }
      if (DBG) console.log("==== ChannelApi.#callApi: calling fetch with init:\n", init)
      SBApiFetch(this.channelServer + '/api/v2/channel/' + this.#channelId! + path, init)
        .then((ret: any) => { resolve(ret) })
        .catch((e: Error) => { reject("[Channel.#callApi] Error: " + WrapError(e)) })

      // SBFetch(this.channelServer + '/api/v2/channel/' + this.channelId! + path, init)
      //   .then(async (response: Response) => {
      //     var retValue: any
      //     if (response.headers.get('content-type') === 'application/json; charset=utf-8') {
      //       retValue = jsonParseWrapper(await response.json(), "L2928")
      //     } else if (response.headers.get('content-type') === 'application/octet-stream') {
      //       retValue = extractPayload(await response.arrayBuffer())
      //     } else {
      //       throw new Error("ChannelApi.#callApi: invalid content-type in response")
      //     }
      //     if (!response.ok || retValue.error || (retValue.success && !retValue.success)) {
      //       let apiErrorMsg = 'Network or Server error on Channel API call'
      //       if (response.status) apiErrorMsg += ' [' + response.status + ']'
      //       if (retValue.error) apiErrorMsg += ': ' + retValue.error
      //       if (DBG) console.error("ChannelApi.#callApi error:\n", apiErrorMsg)
      //       reject(new Error(apiErrorMsg))
      //     } else {
      //       if (DBG) console.log("ChannelApi.#callApi: success\n", retValue)
      //       resolve(retValue)
      //     }
      //   })
      //   .catch((e: Error) => { reject("ChannelApi (SBFetch) Error [2]: " + WrapError(e)) })
    })
  }


} /* class SBChannelKeys */

const MAX_SB_BODY_SIZE = 64 * 1024 * 1.5 // allow for base64 overhead plus extra

/**
 * SBMessage
 */
class SBMessage {
  [SB_MESSAGE_SYMBOL] = true
  ready
  // channel: Channel
  // contents?: SBMessageContents
  message?: ChannelMessage

  #encryptionKey?: CryptoKey
  // #sendToPubKey?: JsonWebKey


  /**
   * SBMessage
   * 
   * Body should be below 32KiB, though it tolerates up to 64KiB
   *
   */
  constructor(public channel: Channel, contents: any, ttl?: number) {
    this.ready = new Promise<SBMessage>(async (resolve) => {
      await channel.channelReady
      // this.#encryptionKey = this.channel.encryptionKey
      this.#encryptionKey = await this.channel.protocol.key()
      this.message = await sbCrypto.wrap(contents, this.channel.userId, this.#encryptionKey, this.channel.privateKey)
      this.message.ttl = ttl ? ttl : 0xF // default is inifinte
      resolve(this)
    })
  }

  // async wrap(k: CryptoKey, b: ArrayBuffer): Promise<ChannelMessage> {
  //   const timestamp = Math.round(Date.now() / 25) * 25 // fingerprinting protection
  //   const view = new DataView(new ArrayBuffer(8));
  //   view.setFloat64(0, timestamp);
  //   const iv = crypto.getRandomValues(new Uint8Array(12))
  //   const c = await sbCrypto.encrypt(b, k, { iv: iv, additionalData: view })
  //   return( { contents: b, encryptedContents: c, iv: iv, timestamp: timestamp } )
  // }


  @Ready get encryptionKey() { return this.#encryptionKey }
  // get sendToPubKey() { return this.#sendToPubKey }

  /**
   * SBMessage.send()
   */
  send() {
    return new Promise<string>((resolve, reject) => {
      this.ready.then(() => {
        this.channel.send(this).then((result) => {
          if (result === "success") {
            resolve(result)
          } else {
            reject(result)
          }
        })
      })
    })
    // todo: i've punted on queue here <--- queueMicrotaks maybe?
  }
} /* class SBMessage */

/**
 * Key exchange protocol.
 */
export interface SBProtocol {
  key(): Promise<CryptoKey>;
}

export class BasicProtocol implements SBProtocol {
  #key: Promise<CryptoKey>
  #channel: Channel

  constructor(channel: Channel) {
    // TDOO: placeholder, create a random key for each "session" (usage of protocol)
    this.#channel = channel
    this.#key = window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"],
    );
    this.#key.then((k) => {
      console.log("[BasicProtocol] generated random key for this session:\n", k)
    })
  }
  key(): Promise<CryptoKey> {
    return this.#key
  }
  get channel() { return this.#channel }
}

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
 * Note that you don't need to worry about what API calls involve race
 * conditions and which don't, the library will do that for you.
 * 
 */
class Channel extends SBChannelKeys {
  channelReady: Promise<Channel>
  static ReadyFlag = Symbol('ChannelReadyFlag'); // see below for '(this as any)[Channel.ReadyFlag] = false;'
  locked?: boolean = false // TODO: need to make sure we're tracking whenever this has changed
  // this is actually info for lock status, and is now available to Owner (no admin status anymore)
  adminData?: Dictionary<any> // todo: make into getter
  // verifiedGuest: boolean = false
  #cursor: string = ''; // last (oldest) message key seen

  #protocol: SBProtocol

  /**
   * Channel
   */
  constructor()
  constructor(key: SBUserPrivateKey, protocol?: SBProtocol)
  constructor(handle: SBChannelHandle, protocol?: SBProtocol)
  constructor(handleOrKey?: SBChannelHandle | SBUserPrivateKey, protocol?: SBProtocol) {
    if (handleOrKey === null) throw new Error(`Channel() constructor: you cannot pass 'null'`)
    console.log("Channel() constructor called with handleOrKey:", handleOrKey)
    super(handleOrKey);
    this.#protocol = protocol ? protocol : new BasicProtocol(this)
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
  @Memoize @Ready get protocol() { return this.#protocol }
  @Memoize @Ready get api() { return this } // for compatibility

  /*
   * Implements Channel api calls.
   * 
   * Note that the API call details are also embedded in the ChannelMessage,
   * and signed by the sender, completely separate from HTTP etc auth.
   */
  #callApi(path: string): Promise<any>
  #callApi(path: string, apiPayload: any): Promise<any>
  #callApi(path: string, apiPayload?: any): Promise<any> {
    _sb_assert(this.channelServer, "[ChannelApi.#callApi] channelServer is unknown")
    if (DBG) console.log("ChannelApi.#callApi: calling fetch with path:", path, "body:", apiPayload)
    _sb_assert(this.channelId && path, "Internal Error (L2864)")
    return new Promise(async (resolve, reject) => {
      if (apiPayload) await this.channelReady // if we need encryption
      else await this.sb384Ready // enough for signing
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
        channelId: this.channelId!,
        path: path,
        userId: this.userId,
        userPublicKey: this.userPublicKey,
        apiPayload: apiPayloadBuf,
        timestamp: timestamp,
        sign: sign
      }
      const init: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream"',
        },
        body: assemblePayload(validate_ChannelApiBody(apiBody))
      }
      if (DBG) console.log("==== ChannelApi.#callApi: calling fetch with init:\n", init)
      SBApiFetch(this.channelServer + '/api/v2/channel/' + this.channelId! + path, init)
        .then((ret: any) => { resolve(ret) })
        .catch((e: Error) => { reject("[Channel.#callApi] Error: " + WrapError(e)) })

      // SBFetch(this.channelServer + '/api/v2/channel/' + this.channelId! + path, init)
      //   .then(async (response: Response) => {
      //     var retValue: any
      //     if (response.headers.get('content-type') === 'application/json; charset=utf-8') {
      //       retValue = jsonParseWrapper(await response.json(), "L2928")
      //     } else if (response.headers.get('content-type') === 'application/octet-stream') {
      //       retValue = extractPayload(await response.arrayBuffer())
      //     } else {
      //       throw new Error("ChannelApi.#callApi: invalid content-type in response")
      //     }
      //     if (!response.ok || retValue.error || (retValue.success && !retValue.success)) {
      //       let apiErrorMsg = 'Network or Server error on Channel API call'
      //       if (response.status) apiErrorMsg += ' [' + response.status + ']'
      //       if (retValue.error) apiErrorMsg += ': ' + retValue.error
      //       if (DBG) console.error("ChannelApi.#callApi error:\n", apiErrorMsg)
      //       reject(new Error(apiErrorMsg))
      //     } else {
      //       if (DBG) console.log("ChannelApi.#callApi: success\n", retValue)
      //       resolve(retValue)
      //     }
      //   })
      //   .catch((e: Error) => { reject("ChannelApi (SBFetch) Error [2]: " + WrapError(e)) })
    })
  }

  /**
   * Authorizes/registers this channel on the provided server
   */
  create(storageToken: SBStorageToken, channelServer?: SBChannelId): Promise<SBChannelHandle> {
    _sb_assert(storageToken !== null, '[Channel.create] Missing storage token')
    _sb_assert(channelServer || this.channelServer, '[Channel.create] Missing channel server')
    channelServer = channelServer ? channelServer : this.channelServer
    return new Promise<SBChannelHandle>(async (resolve, reject) => {
      await this.channelReady
      this.channelData.storageToken = storageToken
      if (DBG) console.log("Will try to create channel with channelData:", this.channelData)
      this.#callApi('/create', this.channelData)
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

  async deCryptChannelMessage(m00: string, m01: ChannelMessage): Promise<Message | undefined> {
    if (DBG) console.log("Asked to decrypt:", m00, m01)
    return undefined
  }

  /**
   * Channel.getLastMessageTimes
   */
  getLastMessageTimes() {
    // ToDo: needs a few things fixed, see channel server source code

    throw new Error("Channel.getLastMessageTimes(): not supported in 2.0 yet")
    // return this.#callApi('/getLastMessageTimes')

    // return new Promise((resolve, reject) => {
    //   SBFetch(this.#channelApi + '/getLastMessageTimes', {
    //     method: 'POST', body: JSON.stringify([this.channelId])
    //   }).then((response: Response) => {
    //     if (!response.ok) {
    //       reject(new Error('Network response was not OK'));
    //     }
    //     return response.json();
    //   }).then((message_times) => {
    //     resolve(message_times[this.channelId!]);
    //   }).catch((e: Error) => {
    //     reject(e);
    //   });
    // });
  }

  /**
   * Channel.getOldMessages
   * 
   * Will return most recent messages from the channel.
   * 
   * @param currentMessagesLength - number to fetch (default 100)
   * @param paginate - if true, will paginate from last request (default false)
   *
   */
  getOldMessages(currentMessagesLength: number = 100, paginate: boolean = false): Promise<Array<ChannelMessage>> {
    // todo: add IndexedDB caching - see above
    return new Promise(async (resolve, reject) => {
      _sb_assert(this.channelId, "Channel.getOldMessages: no channel ID (?)")
      // ToDO: we want to cache (merge) these messages into a local cached list (since they are immutable)
      let cursorOption = paginate ? '&cursor=' + this.#cursor : '';
      const messages = await this.#callApi('/oldMessages?currentMessagesLength=' + currentMessagesLength + cursorOption)
      _sb_assert(messages, "Channel.getOldMessages: no messages (empty/null response)")
      if (DBG) console.log("getOldMessages\n", messages)
      Promise.all(Object
        .keys(messages)
        .filter((v) => messages[v].hasOwnProperty('encrypted_contents'))
        .map((v) => this.deCryptChannelMessage(v, messages[v].encrypted_contents)))
        .then((unfilteredDecryptedMessageArray) => unfilteredDecryptedMessageArray.filter((v): v is Message => Boolean(v)))
        .then((decryptedMessageArray) => {
          let lastMessage = decryptedMessageArray[decryptedMessageArray.length - 1];
          if (lastMessage)
            this.#cursor = lastMessage._id || /* lastMessage.id || */ '';
          if (DBG2) console.log(decryptedMessageArray)
          resolve(decryptedMessageArray)
        })
        .catch((e) => {
          const msg = `Channel.getOldMessages(): failed to decrypt messages: ${e}`
          console.error(msg)
          reject(msg)
        })
    });
  }

  send(_msg: SBMessage | string): Promise<string> {
    return Promise.reject("Channel.send(): abstract method, must be implemented in subclass")
  }

  // this is mostly used for 'are you there?' calls
  @Ready getChannelKeys(): Promise<SBChannelData> {
    return this.#callApi('/getChannelKeys')
  }

  /**
   * Update (set) the capacity of the channel; Owner only
   */
  @Ready @Owner updateCapacity(capacity: number) { return this.#callApi('/updateRoomCapacity?capacity=' + capacity) }
  /**
   * getCapacity
   */
  @Ready @Owner getCapacity() { return (this.#callApi('/getRoomCapacity')) }
  /**
   * getStorageLimit (current storage budget)
   */
  @Ready getStorageLimit() { return (this.#callApi('/getStorageLimit')) }
  /**
   * getMother
   * 
   * Get the channelId from which this channel was budded. Note that
   * this is only accessible by Owner (as well as hosting server)
   */
  @Ready @Owner getMother() { return (this.#callApi('/getMother')) }
  /**
   * getJoinRequests
   */
  @Ready @Owner getJoinRequests() { return this.#callApi('/getJoinRequests') }
  /**
   * isLocked
   */
  @ExceptionReject isLocked() {
    return new Promise<boolean>((resolve) => (this.#callApi('/roomLocked')).then((d) => {
      this.locked = (d.locked === true); // in case we're lagging status, we update it here
      resolve(this.locked!);
    }))
  }
  // /**
  //  * Set message of the day
  //  */
  // @Ready @Owner setMOTD(motd: string) { return this.#callApi('/motd', { motd: motd }) }

  // /**
  //  * Channel.getAdminData
  //  */
  // @Ready @Owner getAdminData(): Promise<ChannelAdminData> { return this.#callApi('/getAdminData') }

  // /** Channel.downloadData - NEEDS REFACTORING
  //  */
  // @Ready downloadData() {
  //   return new Promise((resolve, reject) => {
  //     this.#callApi('/downloadData')
  //       .then((data: Dictionary<any>) => {
  //         console.log("From downloadData:")
  //         console.log(data);
  //         Promise.all(Object
  //           .keys(data)
  //           .filter((v) => {
  //             const regex = new RegExp(this.channelId as string);
  //             if (v.match(regex)) {
  //               const message = jsonParseWrapper(data[v], "L3318")
  //               if (message.hasOwnProperty('encrypted_contents')) {
  //                 if (DBG) console.log("Received message: ", message)
  //                 return message;
  //               }
  //             }
  //           })
  //           .map((v) => {
  //             const message = jsonParseWrapper(data[v], "L3327")
  //             if (DBG2) console.log(v, message.encrypted_contents, this.keys)
  //             return this.deCryptChannelMessage(v, message.encrypted_contents)
  //           }))
  //           .then((unfilteredDecryptedMessageArray) => unfilteredDecryptedMessageArray.filter((v): v is ChannelMessage => Boolean(v)))
  //           .then((decryptedMessageArray) => {
  //             let storage: any = {}
  //             decryptedMessageArray.forEach((message) => {
  //               if (!message.control && message.imageMetaData!.imageId) {
  //                 const f_control_msg = decryptedMessageArray.find((ctrl_msg) => ctrl_msg.id && ctrl_msg.id == message.imageMetaData!.imageId)
  //                 const p_control_msg = decryptedMessageArray.find((ctrl_msg) => ctrl_msg.id && ctrl_msg.id == message.imageMetaData!.previewId)
  //                 storage[`${message.imageMetaData!.imageId}.f`] = f_control_msg?.verificationToken
  //                 storage[`${message.imageMetaData!.previewId}.p`] = p_control_msg?.verificationToken
  //               }
  //             })
  //             resolve({ storage: storage, channel: data })
  //           })
  //       }).catch((error: Error) => {
  //         reject(error);
  //       });
  //   });
  // }

  // @Ready uploadChannel(channelData: ChannelData) {
  //   return this.#callApi('/uploadRoom', channelData)
  // }

  // @Ready @Owner authorize(ownerPublicKey: Dictionary<any>, serverSecret: string) {
  //   return this.#callApi('/authorizeRoom', { roomId: this.channelId, SERVER_SECRET: serverSecret, ownerKey: ownerPublicKey })
  // }

  // // deprecated - this is now implicitly done on first connect
  // @Ready postPubKey(_exportable_pubKey: JsonWebKey): Promise<{ success: boolean }> {
  //   throw new Error("postPubKey() deprecated")
  // }

  @Ready storageRequest(byteLength: number): Promise<Dictionary<any>> {
    return this.#callApi('/storageRequest?size=' + byteLength)
  }


  /**
   * Locks the channel. It's now invisible to any visitor whose userId has not
   * been 'accepted' by the owner. Returns '{ success: true }' on success.
   */
  @Ready @Owner lock(): Promise<{ success: boolean }> {
    return this.#callApi('/lockChannel')
  }

  // @Ready @Owner lock(key?: CryptoKey): Promise<{ locked: boolean, lockedKey: JsonWebKey }> {
  //   console.warn("WARNING: lock() on channel api is in the process of being updated and tested ...")
  //   return new Promise(async (resolve, reject) => {
  //     if (this.locked || this.keys.lockedKey)
  //       reject(new Error("lock(): channel already locked (rotating key not yet supported")); // ToDo
  //     if (!this.owner)
  //       reject(new Error("lock(): only owner can lock channel")); // note: no longer checking for admin
  //     const _locked_key: CryptoKey = key ? key : await crypto.subtle.generateKey({
  //       name: 'AES-GCM', length: 256
  //     }, true, ['encrypt', 'decrypt']);
  //     const _exportable_locked_key: Dictionary<any> = await crypto.subtle.exportKey('jwk', _locked_key);
  //     this.#callApi('/lockRoom')
  //       .then((data: Dictionary<any>) => {
  //         if (data.locked === true) {
  //           // accept ourselves
  //           this.acceptVisitor(this.userId)
  //             .then(() => {
  //               if (DBG) console.log("lock(): succeded with lock key:", _exportable_locked_key)
  //               this.locked = true
  //               this.keys.lockedKey = _locked_key
  //               resolve({ locked: this.locked, lockedKey: _exportable_locked_key })
  //             })
  //             .catch((error: Error) => { reject(new Error(`was unable to accept 'myself': ${error}`)) });
  //         } else {
  //           reject(new Error(`lock(): failed to lock channel, did not receive confirmation. (data: ${data})`))
  //         }
  //       }).catch((error: Error) => { reject(new Error(`api call to /lockRoom failed ${error}`)) });
  //   }
  //   );
  // }

  @Ready @Owner acceptVisitor(userId: SBUserId) {
    return this.#callApi('/acceptVisitor', { userId: userId })
  }

  /**
   * returns a storage token (promise); basic consumption of channel budget
   */
  @Ready async getStorageToken(size: number): Promise<string> {
    const storageTokenReq = await this.#callApi(`/storageRequest?size=${size}`)
    _sb_assert(storageTokenReq.hasOwnProperty('token'), `[getStorageToken] cannot parse response ('${JSON.stringify(storageTokenReq)}')`)
    // return(JSON.stringify(storageTokenReq))
    if (DBG) console.log(`getStorageToken():\n`, storageTokenReq)
    return storageTokenReq.token
  }

  // ToDo: if both keys and storage are specified, should we check for server secret?

  /**
   * "budd" will spin a channel off an existing one that you own.
   * You need to provide one of the following combinations of info:
   * 
   * - nothing: create new channel and transfer all storage budget
   * - just storage amount: creates new channel with that amount, returns new channel
   * - just a target channel: moves all storage budget to that channel
   * - just keys: creates new channel with those keys and transfers all storage budget
   * - keys and storage amount: creates new channel with those keys and that storage amount
   * 
   * In the first (special) case you can just call budd(), in the other
   * cases you need to fill out the 'options' object.
   * 
   * Another way to remember the above: all combinations are valid except
   * both a target channel and assigning keys.
   * 
   * Note: if you're specifying the target channel, then the return values will
   * not include the private key (that return value will be empty).
   * 
   * Same channels as mother and target will be a no-op, regardless of other
   * parameters.
   * 
   * Note: if you provide a value for 'storage', it cannot be undefined. If you
   * wish it to be Infinity, then you need to omit the property from options.
   * 
   * Future: negative amount of storage leaves that amount behind, the rest is transferred
   * 
   */
  budd(): Promise<SBChannelHandle> // clone and full plunder
  budd(options:
    {
      keys?: JsonWebKey;
      storage?: number;
      targetChannel?: SBChannelId;
    }): Promise<SBChannelHandle> // clone with specified keys, storage, and target channel
  @Ready @Owner budd(options?:
    {
      keys?: JsonWebKey;
      storage?: number;
      targetChannel?: SBChannelId;
    }): Promise<SBChannelHandle> {
    let { keys, storage, targetChannel } = options ?? {};
    return new Promise<SBChannelHandle>(async (resolve, reject) => {
      if ((options) && (options.hasOwnProperty('storage')) && (options.storage === undefined))
        // this catches the case where callee intended storage to have a value but somehow it didn't
        reject("If you omit 'storage' it defaults to Infinity, but you cannot set 'storage' to undefined")
      try {
        if (!storage) storage = Infinity;
        if (targetChannel) {
          // just a straight up transfer of budget
          if (this.channelId == targetChannel) throw new Error("[budd()]: You can't specify the same channel as targetChannel")
          if (keys) throw new Error("[budd()]: You can't specify both a target channel and keys");
          resolve(this.#callApi(`/budd?targetChannel=${targetChannel}&transferBudget=${storage}`))
        } else {
          // we are creating a new channel
          // const { channelData, exportable_privateKey } = await newChannelData(keys ? keys : null);
          const theUser = new SB384(keys)
          await theUser.ready
          const channelData: SBChannelHandle = {
            [SB_CHANNEL_HANDLE_SYMBOL]: true,
            // userId: theUser.userId
            userPrivateKey: theUser.userPrivateKey, // theUser.exportable_pubKey!,
            channelServer: this.channelServer,
            channelId: theUser.hash,
          }
          let resp: Dictionary<any> = await this.#callApi(`/budd?targetChannel=${channelData.channelId}&transferBudget=${storage}`, channelData)
          if (resp.success) {
            // resolve({ channelId: channelData.roomId!, key: exportable_privateKey })
            resolve(channelData)
          } else {
            reject(JSON.stringify(resp));
          }
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  // // currently not used by webclient, so these are not hooked up
  // notifications() { }
  // getPubKeys() { }
  // ownerUnread() { }
  // registerDevice() { }

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
  #onMessage = this.#noMessageHandler // the user message handler
  #ack: Map<string, (value: string | PromiseLike<string>) => void> = new Map()
  #traceSocket: boolean = false // should not be true in production

  // #resolveFirstMessage: (value: ChannelSocket | PromiseLike<ChannelSocket>) => void = () => { _sb_exception('L2461', 'this should never be called') }
  // #firstMessageEventHandlerReference: (e: MessageEvent<any>) => void = (_e: MessageEvent<any>) => { _sb_exception('L2462', 'this should never be called') }

  constructor(handle: SBChannelHandle, onMessage: (m: Message) => void) {
    _sb_assert(onMessage, 'ChannelSocket(): no onMessage handler provided')
    if (!handle.hasOwnProperty('channelId') || !handle.hasOwnProperty('userPrivateKey'))
      throw new Error("ChannelSocket(): first argument must be valid SBChannelHandle")
    if (!handle.channelServer)
      throw new Error("ChannelSocket(): no channel server provided (required)")
    super(handle) // initialize 'channel' parent
      ; (this as any)[ChannelSocket.ReadyFlag] = false;
    this.#socketServer = handle.channelServer.replace(/^http/, 'ws')
    this.#onMessage = onMessage
    // url = sbServer.channel_ws + '/api/room/' + channelId + '/websocket'
    const url = this.#socketServer + '/api/v2/channel/' + handle.channelId + '/websocket'
    this.#ws = {
      url: url,
      // websocket: new WebSocket(url),
      ready: false,
      closed: false,
      timeout: 2000
    }
    // this.channelSocketReady = this.#channelSocketReadyFactory()
    this.channelSocketReady = this.#channelSocketReadyFactory()

    // constructor(sbServerOrHandle: SBServer, onMessage: (m: ChannelMessage) => void, key: JsonWebKey, channelId: string) // old interface
    // constructor(sbServerOrHandle: SBServer | SBChannelHandle, onMessage: (m: ChannelMessage) => void, key?: JsonWebKey, channelId?: string)
    // constructor(sbServer: SBServer, onMessage: (m: ChannelMessage) => void, key: JsonWebKey, channelId: string) {
    // if (typeof sbServerOrHandle !== 'object')
    //   throw new Error("ChannelSocket(): first argument must be SBServer or SBChannelHandle")
    // distinguish based on what properties the two interfaces have
    // if (sbServerOrHandle.hasOwnProperty('channelId') && sbServerOrHandle.hasOwnProperty('userKeyString')) {
    //   // first, SBChannelHandle must have properties 'channelId' and 'userId'
    //   const handle = sbServerOrHandle as SBChannelHandle
    //   if (!handle.channelServer) throw new Error("ChannelSocket(): no channel server provided (required)")
    //   super(handle) // initialize 'channel' parent
    //   this.#socketServer = handle.channelServer.replace(/^http/, 'ws')
    // } else if (sbServerOrHandle.hasOwnProperty('channel_server') && sbServerOrHandle.hasOwnProperty('storage_server')) {
    //   // next, sbServer must have 'channel_server' and 'channel_ws' and 'storage_server'
    //   const sbServer = sbServerOrHandle as SBServer
    //   _sb_assert(sbServer.channel_ws, 'ChannelSocket(): no websocket server name provided')
    //   if (!key) throw new Error("ChannelSocket(): no key provided")
    //   if (!channelId) throw new Error("ChannelSocket(): no channelId provided")
    //   super(sbServer, key, channelId /*, identity ? identity : new Identity() */) // initialize 'channel' parent
    //   this.#socketServer = sbServer.channel_ws
    //   // this.#sbServer = sbServer
    // } else {
    //   throw new Error("ChannelSocket(): first argument must be SBServer or SBChannelHandle")
    // }
  }

  // catch and call out if this is missing
  #noMessageHandler(_m: Message): void { _sb_assert(false, "NO MESSAGE HANDLER"); }

  async #processMessage(msg: any) {
    if (DBG) console.log("Received socket message:", msg)
  }

  #channelSocketReadyFactory() {
    return new Promise<ChannelSocket>(async (resolve, reject) => {
      if (DBG) console.log("++++ STARTED ChannelSocket.readyPromise()")
      const url = this.#ws.url

      if (!this.#ws.websocket || this.#ws.websocket.readyState === 3 || this.#ws.websocket.readyState === 2)
        // either it's new, or it's closed, or it's in the process of closing
        this.#ws.websocket = new WebSocket(url);

      this.#ws.websocket.addEventListener('message', this.#processMessage);

      this.#ws.websocket.addEventListener('open', async () => {
        this.#ws.closed = false
        // need to make sure parent is ready (and has keys)
        await this.ready
        if (DBG) console.log("++++++++ readyPromise() sending init")
        // auth is done on setup, it's not needed for the 'ready' signal;
        // this will prompt server to send backlogged messages
        this.#ws.websocket!.send(JSON.stringify({ ready: true }))
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
          const msg = "ChannelSocket() - this socket is not resolving (waited 10s) ..."
          console.warn(msg); reject(msg);
        } else {
          if (DBG) console.log("ChannelSocket() - this socket resolved", this)
        }
      }, 10000);
      (this as any)[ChannelSocket.ReadyFlag] = true;
      resolve(this)
    })
  }

  // #channelSocketReadyFactory() {
  //   if (DBG) console.log("++++ CREATING ChannelSocket.readyPromise()")
  //   return new Promise<ChannelSocket>((resolve, reject) => {
  //     if (DBG) console.log("++++ STARTED ChannelSocket.readyPromise()")
  //     this.#resolveFirstMessage = resolve
  //     const url = this.#ws.url
  //     if (DBG) { console.log("++++++++ readyPromise() has url:"); console.log(url); }
  //     if (!this.#ws.websocket) this.#ws.websocket = new WebSocket(this.#ws.url)
  //     if (this.#ws.websocket.readyState === 3) {
  //       // it's been closed
  //       this.#ws.websocket = new WebSocket(url)
  //     } else if (this.#ws.websocket.readyState === 2) {
  //       console.warn("STRANGE - trying to use a ChannelSocket that is in the process of closing ...")
  //       this.#ws.websocket = new WebSocket(url)
  //     }
  //     this.#ws.websocket.addEventListener('open', () => {
  //       this.#ws.closed = false
  //       // need to make sure parent is ready (and has keys)
  //       this.channelReady.then(() => {
  //         // _sb_assert(this.exportable_pubKey, "ChannelSocket.readyPromise(): no exportable pub key?")
  //         _sb_assert(this.userId, "ChannelSocket.readyPromise(): no userId of channel owner/user?")
  //         // this.#ws.init = { name: JSON.stringify(this.exportable_pubKey) }
  //         this.#ws.init = { userId: this.userId }
  //         if (DBG) { console.log("++++++++ readyPromise() constructed init:"); console.log(this.#ws.init); }
  //         this.#ws.websocket!.send(JSON.stringify(this.#ws.init)) // this should trigger a response with keys
  //       })
  //     })
  //     this.#firstMessageEventHandlerReference = this.#firstMessageEventHandler.bind(this)
  //     this.#ws.websocket.addEventListener('message', this.#firstMessageEventHandlerReference);
  //     this.#ws.websocket.addEventListener('close', (e: CloseEvent) => {
  //       this.#ws.closed = true
  //       if (!e.wasClean) {
  //         // console.log(`ChannelSocket() was closed (and NOT cleanly: ${e.reason} from ${this.#sbServer.channel_server}`)
  //         console.log(`ChannelSocket() was closed (and NOT cleanly: ${e.reason} from ${this.channelServer}`)
  //       } else {
  //         if (e.reason.includes("does not have an owner"))
  //           // reject(`No such channel on this server (${this.#sbServer.channel_server})`)
  //           reject(`No such channel on this server (${this.channelServer})`)
  //         else console.log('ChannelSocket() was closed (cleanly): ', e.reason)
  //       }
  //       reject('wbSocket() closed before it was opened (?)')
  //     })
  //     this.#ws.websocket.addEventListener('error', (e) => {
  //       this.#ws.closed = true
  //       console.log('ChannelSocket() error: ', e)
  //       reject('ChannelSocket creation error (see log)')
  //     })
  //     // let us set a timeout to catch and make sure this thing resoles within 0.5 seconds
  //     // todo: add as a decorator for ready-template style constructors
  //     setTimeout(() => {
  //       if (!this.#ChannelSocketReadyFlag) {
  //         console.warn("ChannelSocket() - this socket is not resolving (waited 10s) ...")
  //         console.log(this)
  //         reject('ChannelSocket() - this socket is not resolving (waited 10s) ...')
  //       } else {
  //         if (DBG) {
  //           console.log("ChannelSocket() - this socket resolved")
  //           console.log(this)
  //         }
  //       }
  //     }, 10000)
  //   })

  // }


  // /** @private */
  // async #processMessage(msg: any) {
  //   let m = msg.data
  //   if (this.#traceSocket) {
  //     console.log("... raw unwrapped message:")
  //     console.log(structuredClone(m))
  //   }
  //   const data = jsonParseWrapper(m, 'L1489')
  //   if (this.#traceSocket) {
  //     console.log("... json unwrapped version of raw message:")
  //     console.log(Object.assign({}, data))
  //   }
  //   if (typeof this.#onMessage !== 'function')
  //     _sb_exception('ChannelSocket', 'received message but there is no handler')

  //   const message = data as ChannelMessage
  //   try {
  //     // messages are structured a bit funky for historical reasons
  //     const m01 = Object.entries(message)[0][1]

  //     if (Object.keys(m01)[0] === 'encrypted_contents') {
  //       if (DBG) console.log("++++++++ #processMessage: received message:", m01.encrypted_contents.content)

  //       // check if this message is one that we've recently sent
  //       const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(m01.encrypted_contents.content))
  //       const ack_id = arrayBufferToBase64(hash)
  //       if (DBG2) console.log("Received message with hash:", ack_id)
  //       const r = this.#ack.get(ack_id)
  //       if (r) {
  //         if (this.#traceSocket) console.log(`++++++++ #processMessage: found matching ack for id ${ack_id}`)
  //         this.#ack.delete(ack_id)
  //         r("success") // we first resolve that outstanding send (and then also deliver message)
  //       }

  //       const m00 = Object.entries(data)[0][0]
  //       // the 'iv' field as incoming should be base64 encoded, with 16 b64
  //       // characters translating here to 12 bytes
  //       const iv_b64 = m01.encrypted_contents.iv
  //       // open question: if there are any issues decrypting, should we forward as-is?
  //       if ((iv_b64) && (_assertBase64(iv_b64)) && (iv_b64.length == 16)) {
  //         m01.encrypted_contents.iv = base64ToArrayBuffer(iv_b64)
  //         try {
  //           const m = await this.deCryptChannelMessage(m00, m01.encrypted_contents)
  //           if (!m)
  //             return // skip if there's an issue
  //           if (this.#traceSocket) {
  //             console.log("++++++++ #processMessage: passing to message handler:")
  //             console.log(Object.assign({}, m))
  //           }
  //           // we process 'whispers' here, they're 1-1 messages, and can be skipped if not for us


  //           this.#onMessage(m)
  //         } catch {
  //           console.warn('Error decrypting message, dropping (ignoring) message')
  //         }
  //       } else {
  //         console.error('#processMessage: - iv is malformed, should be 16-char b64 string (ignoring)')
  //       }
  //     } else {
  //       // other (future) message types would be parsed here
  //       console.warn("++++++++ #processMessage: can't decipher message, passing along unchanged:")
  //       console.log(Object.assign({}, message))
  //       this.onMessage(message)
  //     }
  //   } catch (e) {
  //     console.log(`++++++++ #processMessage: caught exception while decyphering (${e}), passing it along unchanged`)
  //     this.onMessage(message)
  //     // console.error(`#processmessage: cannot handle locked channels yet (${e})`)
  //     // ToDo: locked key might never resolve (if we don't have it)?
  //     // TODO: ... generally speaking need to test/fix locked channels
  //     // unwrapped = await sbCrypto.unwrap(this.keys.lockedKey, message.encrypted_contents, 'string')
  //   }
  // }

  // #insideFirstMessageHandler(e: MessageEvent) {
  //   console.warn("WARNING: firstMessageEventHandler() called recursively (?)")
  //   console.warn(e)
  // }

  // // we use (bound) message handlers orchestrate who handles first message (and only once)
  // #firstMessageEventHandler(e: MessageEvent) {
  //   if (this.#traceSocket) console.log("FIRST MESSAGE HANDLER CALLED")
  //   const blocker = this.#insideFirstMessageHandler.bind(this)
  //   this.#ws.websocket!.addEventListener('message', blocker)
  //   this.#ws.websocket!.removeEventListener('message', this.#firstMessageEventHandlerReference)
  //   // first time should be a handshake of keys, they should match what we have;
  //   // there may be other information in the message (eg motd, roomLocked)
  //   const message = jsonParseWrapper(e.data, 'L2239') as ChannelMessage
  //   if (DBG) console.log("++++++++ readyPromise() received ChannelKeysMessage:", message);

  //   // // todo: we should check for 'error' messages
  //   // _sb_assert(message.ready, `got roomKeys but channel reports it is not ready [${message}]`)
  //   // this.motd = message.motd

  //   // const exportable_owner_pubKey = jsonParseWrapper(message.keys.ownerKey, 'L2246')
  //   // const ownerUserId = sbCrypto.JWKToUserId(jsonParseWrapper(message.keys.ownerKey, 'L3595'))
  //   // just small sanity check on owner key (x marks the spot)
  //   // _sb_assert(this.keys.ownerPubKeyX === exportable_owner_pubKey.x, 'ChannelSocket.readyPromise(): owner key mismatch??')
  //   _sb_assert(this.readyFlag, '#ChannelReadyFlag is false, parent not ready (?)')

  //   // this sets us as owner only if the keys match
  //   // update: we now determine based on channel ID
  //   // this.owner = sbCrypto.compareKeys(exportable_owner_pubKey, this.exportable_pubKey!)
  //   // this.owner = ownerUserId === this.userId // post refactor, a little simpler ...

  //   // // this refreshes status of people/userIds waiting on getting approved in a locked channel
  //   // this.locked = message.roomLocked
  //   this.adminData = this.api.getAdminData()

  //   // once we've gotten our keys, we substitute the main message handler
  //   this.#ws.websocket!.addEventListener('message', this.#processMessage.bind(this))
  //   this.#ws.websocket!.removeEventListener('message', blocker)
  //   if (DBG) console.log("++++++++ readyPromise() all done - resolving!")
  //   this.#ChannelSocketReadyFlag = true
  //   this.#resolveFirstMessage(this)
  // }



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

  set onMessage(f: (m: Message) => void) { this.#onMessage = f }
  @Ready get onMessage() { return this.#onMessage }

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
  send(msg: SBMessage | any): Promise<string> {
    const message: SBMessage = msg instanceof SBMessage ? msg : new SBMessage(this, msg)
    _sb_assert(this.#ws.websocket, "ChannelSocket.send() called before ready")
    if (this.#ws.closed) {
      if (this.#traceSocket) console.info("send() triggered reset of #readyPromise() (normal)")
      this.channelSocketReady = this.#channelSocketReadyFactory()
        // this.#ChannelSocketReadyFlag = true
        ; (this as any)[ChannelSocket.ReadyFlag] = false;
    }
    return new Promise(async (resolve, reject) => {
      await message.ready // message needs to be ready
      await this.ready // and 'we' (channel socket) need to be ready
      if (!this.ChannelSocketReadyFlag) reject("ChannelSocket.send() is confused - ready or not?")
      switch (this.#ws.websocket!.readyState) {
        case 1: // OPEN
          if (this.#traceSocket)
            console.log("++++++++ ChannelSocket.send() will send message:", Object.assign({}, message))
          const messagePayload = assemblePayload(message)
          _sb_assert(messagePayload, "ChannelSocket.send(): failed to assemble message")

          // we keep track of a hash of things we've sent so we can track when we see them
          const hash = await crypto.subtle.digest('SHA-256', messagePayload!)
          const messageHash = arrayBufferToBase64(hash)
          if (this.#traceSocket) {
            console.log("++++++++ ChannelSocket.send():Which has hash:")
            console.log(messageHash)
          }
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
        case 3: // CLOSED
        case 0: // CONNECTING
        case 2: // CLOSING
          const errMsg = 'socket not OPEN - either CLOSED or in the state of CONNECTING/CLOSING'
          // _sb_exception('ChannelSocket', errMsg)
          reject(errMsg)
      }
    })
  }

  // /** @type {JsonWebKey} */ @Memoize @Ready get exportable_owner_pubKey() { return this.keys.ownerKey }

} /* class ChannelSocket */

/**
 * SBObjecdtHandle
 */
class SBObjectHandle implements Interfaces.SBObjectHandle_base {
  version: SBObjectHandleVersions = currentSBOHVersion;
  #_type: SBObjectType = 'b';

  // internal: these are 32-byte binary values
  #id_binary?: ArrayBuffer;
  #key_binary?: ArrayBuffer;

  #verification?: Promise<string> | string;
  shardServer?: string;
  iv?: ArrayBuffer | string;
  salt?: ArrayBuffer | string;

  // the rest are conveniences, should probably migrate to SBFileHandle
  fileName?: string;
  dateAndTime?: string;
  fileType?: string;
  lastModified?: number;
  actualSize?: number;
  savedSize?: number;

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
   * @property {SBObjectType} type - type of object
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
  constructor(options: Interfaces.SBObjectHandle) {
    const {
      version, type, id, key, verification, iv, salt, fileName, dateAndTime,
      fileType, lastModified, actualSize, savedSize,
    } = options;

    if (type) this.#_type = type

    if (version) {
      this.version = version
    } else {
      // if no version is specified, we try to guess based on BOTH key and id
      // there is a 6.5% chance that we will guess wrong if it's b62 but which
      // happens to base b62 tests
      if ((key) && (id)) {
        if (isBase62Encoded(key) && isBase62Encoded(id)) {
          this.version = '2'
        } else if (isBase64Encoded(key) && isBase64Encoded(id)) {
          this.version = '1'
        } else {
          throw new Error('Unable to determine version from key and id')
        }
      } else {
        // if neither key nor id is specified, we assume version 2
        this.version = '2'
      }

    }

    if (id) this.id = id; // use setter
    if (key) this.key = key; // use setter

    if (verification) this.verification = verification;

    this.iv = iv;
    this.salt = salt;
    this.fileName = fileName;
    this.dateAndTime = dateAndTime;
    // this.shardServer = shardServer;
    this.fileType = fileType;
    this.lastModified = lastModified;
    this.actualSize = actualSize;
    this.savedSize = savedSize;
  }

  set id_binary(value: ArrayBuffer) {
    if (!value) throw new Error('Invalid id_binary');
    // make sure it is exactly 32 bytes
    if (value.byteLength !== 32) throw new Error('Invalid id_binary length');
    this.#id_binary = value;
    // Dynamically define the getter for id64 when idBinary is set
    Object.defineProperty(this, 'id64', {
      get: () => {
        return arrayBufferToBase64(this.#id_binary!);
      },
      enumerable: false,  // Or false if you don't want it to be serialized
      configurable: false // Allows this property to be redefined or deleted
    });
    // same in base62
    Object.defineProperty(this, 'id32', {
      get: () => {
        return arrayBufferToBase62(this.#id_binary!);
      },
      enumerable: false,  // Or false if you don't want it to be serialized
      configurable: false // Allows this property to be redefined or deleted
    });
  }

  // same as above for key_binary
  set key_binary(value: ArrayBuffer) {
    if (!value) throw new Error('Invalid key_binary');
    // make sure it is exactly 32 bytes
    if (value.byteLength !== 32) throw new Error('Invalid key_binary length');
    this.#key_binary = value;
    // Dynamically define the getter for key64 when keyBinary is set
    Object.defineProperty(this, 'key64', {
      get: () => {
        return arrayBufferToBase64(this.#key_binary!);
      },
      enumerable: false,  // Or false if you don't want it to be serialized
      configurable: false // Allows this property to be redefined or deleted
    });
    // same in base62
    Object.defineProperty(this, 'key32', {
      get: () => {
        return arrayBufferToBase62(this.#key_binary!);
      },
      enumerable: false,  // Or false if you don't want it to be serialized
      configurable: false // Allows this property to be redefined or deleted
    });
  }

  set id(value: ArrayBuffer | string | Base62Encoded) {
    if (typeof value === 'string') {
      if (this.version === '1') {
        if (isBase64Encoded(value)) {
          this.id_binary = base64ToArrayBuffer(value);
        } else {
          throw new Error('Requested version 1, but id is not b64');
        }
      } else if (this.version === '2') {
        if (isBase62Encoded(value)) {
          this.id_binary = base62ToArrayBuffer32(value);
        } else {
          throw new Error('Requested version 2, but id is not b62');
        }
      }
    } else if (value instanceof ArrayBuffer) {
      // assert it is 32 bytes
      if (value.byteLength !== 32) throw new Error('Invalid ID length');
      this.id_binary = value;
    } else {
      throw new Error('Invalid ID type');
    }
  }

  // same as above but for key
  set key(value: ArrayBuffer | string | Base62Encoded) {
    if (typeof value === 'string') {
      if (this.version === '1') {
        if (isBase64Encoded(value)) {
          this.#key_binary = base64ToArrayBuffer(value);
        } else {
          throw new Error('Requested version 1, but key is not b64');
        }
      } else if (this.version === '2') {
        if (isBase62Encoded(value)) {
          this.#key_binary = base62ToArrayBuffer32(value);
        } else {
          throw new Error('Requested version 2, but key is not b62');
        }
      }
    } else if (value instanceof ArrayBuffer) {
      // assert it is 32 bytes
      if (value.byteLength !== 32) throw new Error('Invalid key length');
      this.#key_binary = value;
    } else {
      throw new Error('Invalid key type');
    }
  }

  // the getter for id returns based on what version we are
  get id(): string {
    _sb_assert(this.#id_binary, 'object handle id is undefined');
    if (this.version === '1') {
      return arrayBufferToBase64(this.#id_binary!);
    } else if (this.version === '2') {
      return arrayBufferToBase62(this.#id_binary!);
    } else {
      throw new Error('Invalid or missing version (internal error, should not happen)');
    }
  }

  // same as above but for key
  get key(): string {
    _sb_assert(this.#key_binary, 'object handle key is undefined');
    if (this.version === '1') {
      return arrayBufferToBase64(this.#key_binary!);
    } else if (this.version === '2') {
      return arrayBufferToBase62(this.#key_binary!);
    } else {
      throw new Error('Invalid or missing version (internal error, should not happen)');
    }
  }

  // convenience getters - these are placeholders for type definitions
  get id64(): string { throw new Error('Invalid id_binary'); }
  get id32(): Base62Encoded { throw new Error('Invalid id_binary'); }
  get key64(): string { throw new Error('Invalid key_binary'); }
  get key32(): Base62Encoded { throw new Error('Invalid key_binary'); }

  set verification(value: Promise<string> | string) {
    this.#verification = value; /* this.#setId32(); */
  }
  get verification(): Promise<string> | string {
    _sb_assert(this.#verification, 'object handle verification is undefined');
    return this.#verification!;
  }

  get type(): SBObjectType { return this.#_type; }

} /* class SBObjectHandle */

/**
 * StorageAPI
 */
export class StorageApi {
  storageServer: string;
  constructor(storageServer: string) {
    _sb_assert(typeof storageServer === 'string', 'StorageApi() constructor requires a string (for storageServer)')
    this.storageServer = storageServer

    // channelServer: string;
    // shardServer?: string;
    // sbServer: SBServer;
    // constructor(server: string, channelServer: string, shardServer?: string) {
    // if (typeof sbServerOrStorageServer === 'object') {
    //   this.storageServer = sbServerOrStorageServer.storage_server
    //   // const { storage_server, /* channel_server, */ shard_server } = sbServer
    //   // this.server = storage_server + '/api/v1';
    //   // // this.channelServer = channel_server + '/api/room/'
    //   // // if (shard_server) this.shardServer = shard_server
    //   // this.sbServer = sbServer
    // } else
  }

  /**
   * Pads object up to closest permitted size boundaries;
   * currently that means a minimum of 4KB and a maximum of
   * of 1 MB, after which it rounds up to closest MB.
   *
   * @param buf blob of data to be eventually stored
   */
  /** @private */
  #padBuf(buf: ArrayBuffer) {
    const image_size = buf.byteLength; let _target
    // pick the size to be rounding up to
    if ((image_size + 4) < 4096) _target = 4096 // smallest size
    else if ((image_size + 4) < 1048576) _target = 2 ** Math.ceil(Math.log2(image_size + 4)) // in between
    else _target = (Math.ceil((image_size + 4) / 1048576)) * 1048576 // largest size
    // append the padding buffer
    let finalArray = _appendBuffer(buf, (new Uint8Array(_target - image_size)).buffer);
    // set the (original) size in the last 4 bytes
    (new DataView(finalArray)).setUint32(_target - 4, image_size)
    if (DBG2) console.log("#padBuf bytes:", finalArray.slice(-4));
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

  /** @private */
  #getObjectKey(fileHashBuffer: BufferSource, _salt: ArrayBuffer): Promise<CryptoKey> {
    return new Promise((resolve, reject) => {
      try {
        sbCrypto.importKey('raw', fileHashBuffer /* base64ToArrayBuffer(decodeURIComponent(fileHash))*/,
          'PBKDF2', false, ['deriveBits', 'deriveKey']).then((keyMaterial) => {
            // todo - Support deriving from PBKDF2 in sbCrypto.deriveKey function
            crypto.subtle.deriveKey({
              'name': 'PBKDF2', // salt: crypto.getRandomValues(new Uint8Array(16)),
              'salt': _salt,
              'iterations': 100000, // small is fine, we want it snappy
              'hash': 'SHA-256'
            }, keyMaterial, { 'name': 'AES-GCM', 'length': 256 }, true, ['encrypt', 'decrypt']).then((key) => {
              // console.log(key)
              resolve(key)
            })
          })
      } catch (e) {
        reject(e);
      }
    });
  }

  // // returns a storage token (promise); basic consumption of channel budget
  // getStorageToken(roomId: SBChannelId, size: number): Promise<string> {
  //   return new Promise((resolve, reject) => {
  //     SBFetch(this.channelServer + stripA32(roomId) + '/storageRequest?size=' + size)
  //       .then((r) => r.json())
  //       .then((storageTokenReq) => {
  //         if (storageTokenReq.hasOwnProperty('error')) reject(`storage token request error (${storageTokenReq.error})`)
  //         resolve(JSON.stringify(storageTokenReq))
  //       })
  //       .catch((e) => {
  //         const msg = `getStorageToken] storage token request failed: ${e}`
  //         console.error(msg)
  //         reject(msg)
  //       });
  //   });
  // }

  /** @private
   * get "permission" to store in the form of a token
   */
  #_allocateObject(image_id: ArrayBuffer, type: SBObjectType): Promise<{ salt: Uint8Array, iv: ArrayBuffer }> {
    return new Promise((resolve, reject) => {
      SBFetch(this.storageServer + '/api/v1' + "/storeRequest?name=" + arrayBufferToBase62(image_id) + "&type=" + type)
        .then((r) => { /* console.log('got storage reply:'); console.log(r); */ return r.arrayBuffer(); })
        .then((b) => {
          const par = extractPayload(b).payload
          resolve({ salt: par.salt, iv: par.iv })
        })
        .catch((e) => {
          console.warn(`**** ERROR: ${e}`)
          reject(e)
        })
    })
  }

  // this returns a promise to the verification string  
  async #_storeObject(
    image: ArrayBuffer,
    image_id: Base62Encoded,
    keyData: ArrayBuffer,
    type: SBObjectType,
    // roomId: SBChannelId,
    budgetChannel: Channel, // ChannelEndpoint,
    iv: ArrayBuffer,
    salt: ArrayBuffer
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const key = await this.#getObjectKey(keyData, salt)
        const data = await sbCrypto.encrypt(image, key, { iv: iv })
        const storageToken = await budgetChannel.getStorageToken(data.byteLength)
        const resp_json = await this.storeObject(type, image_id, iv, salt, storageToken, data)
        if (resp_json.error) reject(`storeObject() failed: ${resp_json.error}`)
        if (resp_json.image_id != image_id) reject(`received imageId ${resp_json.image_id} but expected ${image_id}`)
        resolve(resp_json.verification_token)
      } catch (e) {
        const msg = `storeObject() failed: ${e}`
        console.error(msg)
        reject(msg)
      }
    })
  }

  /**
   * StorageApi.storeObject()
   * 
   * Low level of shard uploading - this needs to have all the details. You would
   * generally not call this directly, but rather use storeData().
   */
  storeObject(
    type: string,
    fileId: Base62Encoded,
    iv: ArrayBuffer,
    salt: ArrayBuffer,
    storageToken: string,
    data: ArrayBuffer): Promise<Dictionary<any>> {
    // async function uploadImage(storageToken, encrypt_data, type, image_id, data)
    return new Promise((resolve, reject) => {
      // if the first parameter is NOT of type string, then the callee probably meant to use storeData()
      if (typeof type !== 'string') {
        const errMsg = "NEW in 1.2.x - storeData() and storeObject() have switched places, you probably meant to use storeData()"
        console.error(errMsg)
        reject("errMsg")
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
        .then((response: Response) => {
          if (!response.ok) { reject('response from storage server was not OK') }
          return response.json()
        })
        .then((data) => {
          resolve(data)
        }).catch((error: Error) => {
          reject(error)
        });
    });
  }

  /**
   * StorageApi.storeData
   * 
   * Main high level work horse: besides buffer and type of data,
   * it only needs the roomId (channel). Assigned meta data is
   * optional.
   * 
   * This will eventually call storeObject().
      */
  storeData(buf: BodyInit | Uint8Array, type: SBObjectType, channelOrHandle: SBChannelHandle | Channel /* ChannelEndpoint */ /*, metadata?: SBObjectMetadata */): Promise<Interfaces.SBObjectHandle> {
    // used to be integrated with image uploading and matching control message, for reference:
    // export async function saveImage(sbImage, roomId, sendSystemMessage)
    return new Promise((resolve, reject) => {
      // if the first parameter is of type string, then the callee probably meant to use storeData()
      if (typeof buf === 'string') {
        const errMsg = "NEW in 1.2.x - storeData() and storeObject() have switched places, you probably meant to use storeObject()"
        console.error(errMsg)
        reject("errMsg")
      }
      if (buf instanceof Uint8Array) {
        if (DBG2) console.log('converting Uint8Array to ArrayBuffer')
        buf = new Uint8Array(buf).buffer
      }
      if (!(buf instanceof ArrayBuffer) && buf.constructor.name != 'ArrayBuffer') {
        if (DBG2) console.log('buf must be an ArrayBuffer:'); console.log(buf);
        reject('buf must be an ArrayBuffer')
      }
      const bufSize = (buf as ArrayBuffer).byteLength

      // our budget channel is either directly provided, or we create a new channel object from the roomId
      // const channel = (roomId instanceof ChannelEndpoint) ? roomId : new ChannelEndpoint(this.sbServer, undefined, roomId)
      const channel = (channelOrHandle instanceof Channel) ? channelOrHandle : new Channel(channelOrHandle)

      const paddedBuf = this.#padBuf(buf as ArrayBuffer)
      sbCrypto.generateIdKey(paddedBuf).then((fullHash) => {
        // return { full: { id: fullHash.id, key: fullHash.key }, preview: { id: previewHash.id, key: previewHash.key } }
        this.#_allocateObject(fullHash.id_binary, type)
          .then((p) => {
            // storage server returns the salt and nonce it wants us to use
            const id32 = arrayBufferToBase62(fullHash.id_binary)
            const key32 = arrayBufferToBase62(fullHash.key_material)
            const r: Interfaces.SBObjectHandle = {
              [SB_OBJECT_HANDLE_SYMBOL]: true,
              version: currentSBOHVersion,
              type: type,
              // id: fullHash.id64,
              // key: fullHash.key64,
              // id: base64ToBase62(fullHash.id32),
              // key: base64ToBase62(fullHash.key32),
              id: id32,
              key: key32,
              iv: p.iv,
              salt: p.salt,
              actualSize: bufSize,
              verification: this.#_storeObject(paddedBuf, id32, fullHash.key_material, type, channel, p.iv, p.salt)
            }
            resolve(r)
          })
          .catch((e) => reject(e))
      })
    })
  }

  // for future reference:
  //   StorageApi().storeRequest
  // is now internal-only (#_allocateObject)

  /** @private */
  #processData(payload: ArrayBuffer, h: SBObjectHandle): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      try {
        let j = jsonParseWrapper(sbCrypto.ab2str(new Uint8Array(payload)), 'L3062')
        // normal operation is to break on the JSON.parse() and continue to finally clause
        if (j.error) reject(`#processData() error: ${j.error}`)
      } catch (e) {
        // do nothing - this is expected
      } finally {
        const data = extractPayload(payload).payload
        if (DBG) {
          console.log("Payload (#processData) is:")
          console.log(data)
        }
        // payload includes nonce and salt
        const iv = new ArrayBuffer(data.iv)
        const salt = new ArrayBuffer(data.salt)
        // we accept b64 versions
        const handleIV: ArrayBuffer | undefined = (!h.iv) ? undefined : (typeof h.iv === 'string') ? base64ToArrayBuffer(h.iv) : h.iv
        const handleSalt: ArrayBuffer | undefined = (!h.salt) ? undefined : (typeof h.salt === 'string') ? base64ToArrayBuffer(h.salt) : h.salt

        if ((handleIV) && (!compareBuffers(iv, handleIV))) {
          console.error("WARNING: nonce from server differs from local copy")
          console.log(`object ID: ${h.id}`)
          console.log(` local iv: ${arrayBufferToBase64(handleIV)}`)
          console.log(`server iv: ${arrayBufferToBase64(data.iv)}`)
        }
        if ((handleSalt) && (!compareBuffers(salt, handleSalt))) {
          console.error("WARNING: salt from server differs from local copy (will use server)")
          if (!h.salt) {
            console.log("h.salt is undefined")
          } else if (typeof h.salt === 'string') {
            console.log("h.salt is in string form (unprocessed):")
            console.log(h.salt)
          } else {
            console.log("h.salt is in arrayBuffer or Uint8Array")
            console.log("h.salt as b64:")
            console.log(arrayBufferToBase64(h.salt))
            console.log("h.salt unprocessed:")
            console.log(h.salt)
          }
          console.log("handleSalt as b64:")
          console.log(arrayBufferToBase64(handleSalt))
          console.log("handleSalt unprocessed:")
          console.log(handleSalt)
        }
        if (DBG2) {
          console.log("will use nonce and salt of:")
          console.log(`iv: ${arrayBufferToBase64(iv)}`)
          console.log(`salt : ${arrayBufferToBase64(salt)}`)
        }
        // const image_key: CryptoKey = await this.#getObjectKey(imageMetaData!.previewKey!, salt)
        var h_key_material
        if (h.version === '1') {
          h_key_material = base64ToArrayBuffer(h.key)
        } else if (h.version === '2') {
          h_key_material = base62ToArrayBuffer32(h.key)
        } else {
          throw new Error('Invalid or missing version (internal error, should not happen)');
        }
        this.#getObjectKey(h_key_material, salt).then((image_key) => {
          // ToDo: test this, it used to call ab2str()? how could that work?
          // const encrypted_image = sbCrypto.ab2str(new Uint8Array(data.image))
          // const encrypted_image = new Uint8Array(data.image)
          const encrypted_image = data.image;
          if (DBG2) {
            console.log("data.image:      "); console.log(data.image)
            console.log("encrypted_image: "); console.log(encrypted_image)
          }
          // const padded_img: ArrayBuffer = await sbCrypto.unwrap(image_key, { content: encrypted_image, iv: iv }, 'arrayBuffer')
          sbCrypto.unwrap(image_key, { c: encrypted_image, iv: iv }).then((padded_img: ArrayBuffer) => {
            const img: ArrayBuffer = this.#unpadData(padded_img)
            // psm: issues should throw i think
            // if (img.error) {
            //   console.error('(Image error: ' + img.error + ')');
            //   throw new Error('Failed to fetch data - authentication or formatting error');
            // }
            if (DBG) { console.log("#processData(), unwrapped img: "); console.log(img) }
            resolve(img)
          })
        })
      }
    })
  }

  // any failure conditions returns 'null', facilitating trying multiple servers
  async #_fetchData(useServer: string, url: string, h: SBObjectHandle, returnType: 'string' | 'arrayBuffer'): Promise<string | ArrayBuffer | null> {
    const body = { method: 'GET' }
    return new Promise(async (resolve, _reject) => {
      SBFetch(useServer + url, body)
        .then((response: Response) => {
          if (!response.ok) return (null)
          return response.arrayBuffer()
        })
        .then((payload: ArrayBuffer | null) => {
          if (payload === null) return (null)
          return this.#processData(payload, h)
        })
        .then((payload) => {
          if (payload === null) resolve(null)
          if (returnType === 'string') resolve(sbCrypto.ab2str(new Uint8Array(payload!)))
          else resolve(payload)
        })
        .catch((_error: Error) => {
          // reject(error)
          return (null)
        });
    })
  }


  /**
   * StorageApi().fetchData()
   *
   * This assumes you have a complete SBObjectHandle. Note that
   * if you only have the 'id' and 'verification' fields, you
   * can reconstruct / request the rest. The current interface
   * will return both nonce, salt, and encrypted data.
   *
   * @param h SBObjectHandle - the object to fetch
   * @param returnType 'string' | 'arrayBuffer' - the type of data to return (default: 'arrayBuffer')
   * @returns Promise<ArrayBuffer | string> - the shard data
   */
  fetchData(handle: Interfaces.SBObjectHandle, returnType: 'string'): Promise<string>
  fetchData(handle: Interfaces.SBObjectHandle, returnType?: 'arrayBuffer'): Promise<ArrayBuffer>
  fetchData(handle: Interfaces.SBObjectHandle, returnType: 'string' | 'arrayBuffer' = 'arrayBuffer'): Promise<ArrayBuffer | string> {
    // todo: perhaps change SBObjectHandle from being an interface to being a class
    // update: we have an object class, but still using interface; still a todo here
    // how to nicely validate 'h'
    // _sb_assert(SBValidateObject(h, 'SBObjectHandle'), "fetchData() ERROR: parameter is not an SBOBjectHandle")
    // if (typeof h.verification === 'string') h.verification = new Promise<string>((resolve) => { resolve(h.verification); })
    // _sb_assert(verificationToken, "fetchData(): missing verification token (?)")

    return new Promise(async (resolve, reject) => {
      const h = new SBObjectHandle(handle)
      if (!h) reject('SBObjectHandle is null or undefined')
      const verificationToken = await h.verification
      // const useServer = h.shardServer ? h.shardServer + '/api/v1' : (this.shardServer ? this.shardServer : this.server)
      const useServer = this.storageServer + '/api/v1'
      if (DBG) console.log("fetchData(), fetching from server: " + useServer)
      const queryString = '/fetchData?id=' + h.id + '&type=' + h.type + '&verification_token=' + verificationToken
      // SBFetch(useServer + '/fetchData?id=' + h.id + '&type=' + h.type + '&verification_token=' + verificationToken, { method: 'GET' })
      const result = await this.#_fetchData(useServer, queryString, h, returnType)
      if (result !== null) {
        if (DBG) console.log(`[fetchData] success: fetched from '${useServer}'`, result)
        resolve(result)
      } else {
        // UPDATE: this moves to higher levels (callers or other libraries)
        // // upon failure we farm out and try all known servers
        // console.warn(`[fetchData] having issues talking to '${useServer}' - not to worry, trying other servers (might generate network errors)`)
        // // ToDo: add an interface where we accumulated knowledge of more servers
        // for (let i = 0; i < knownStorageAndShardServers.length; i++) {
        //   const tryServer = knownStorageAndShardServers[i] + '/api/v1'
        //   if (tryServer !== useServer) {
        //     const result = await this.#_fetchData(tryServer, queryString, h, returnType)
        //     if (result !== null)
        //       resolve(result)
        //     console.warn(`[fetchData] if you got a network error for ${tryServer}, don't worry about it`)
        //   }
        // }
        reject('fetchData() failed')
      }
    })
  }




  // /**
  //  * StorageApi().retrieveData()
  //  * retrieves an object from storage
  //  */
  // async retrieveImage(
  //   imageMetaData: ImageMetaData,
  //   controlMessages: Array<ChannelMessage>,
  //   imageId?: string,
  //   imageKey?: string,
  //   imageType?: SBObjectType,
  //   imgObjVersion?: SBObjectHandleVersions): Promise<Dictionary<any>> {
  //   console.trace("retrieveImage()")
  //   console.log(imageMetaData)
  //   const id = imageId ? imageId : imageMetaData.previewId;
  //   const key = imageKey ? imageKey : imageMetaData.previewKey;
  //   const type = imageType ? imageType : 'p';
  //   const objVersion = imgObjVersion ? imgObjVersion : (imageMetaData.imgObjVersion ? imageMetaData.imgObjVersion : '2');

  //   const control_msg = controlMessages.find((ctrl_msg) => ctrl_msg.id && ctrl_msg.id == id)
  //   console.log(control_msg)
  //   if (control_msg) {
  //     _sb_assert(control_msg.verificationToken, "retrieveImage(): verificationToken missing (?)")
  //     _sb_assert(control_msg.id, "retrieveImage(): id missing (?)")
  //     const obj: Interfaces.SBObjectHandle = {
  //       type: type,
  //       version: objVersion,
  //       id: control_msg.id!,
  //       key: key!,
  //       verification: new Promise((resolve, reject) => {
  //         if (control_msg.verificationToken)
  //           resolve(control_msg.verificationToken)
  //         else
  //           reject("retrieveImage(): verificationToken missing (?)")
  //       })
  //     }
  //     const img = await this.fetchData(obj)
  //     console.log(img)
  //     return { 'url': 'data:image/jpeg;base64,' + arrayBufferToBase64(img, 'b64') };
  //   } else {
  //     return { 'error': 'Failed to fetch data - missing control message for that image' };
  //   }
  // }

  /* Unused Currently
  migrateStorage() {
  }
  fetchDataMigration() {
  }
   */

} /* class StorageApi */

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
  channelServer: string
  // ToDo - these must all be set up in constructor:
  storageServer: string | string
  #storage: StorageApi | string
  #version = version
  sbFetch = SBFetch // future: will allow overriding network fetch

  constructor(channelServer: string, setDBG?: boolean, setDBG2?: boolean) {
    console.warn(`==== CREATING Snackabra object generation: ${this.#version} ====`)
    _sb_assert(typeof channelServer === 'string', '[Snackabra] Invalid parameter type for constructor')

    if (setDBG && setDBG === true) DBG = true;
    if (DBG && setDBG2 && setDBG2 === true) DBG2 = true;
    if (DBG) console.warn("++++ Snackabra constructor: setting DBG to TRUE ++++");
    if (DBG2) console.warn("++++ Snackabra constructor: ALSO setting DBG2 to TRUE (verbose) ++++");

    this.channelServer = channelServer

    // TODO: fetch "/info" and storage server name from channel server
    this.storageServer = "TODO"
    this.#storage = new StorageApi(this.storageServer)

    // constructor(sbServerOrChannelServer: SBServer | string, setDBG?: boolean, setDBG2?: boolean)

    // if (typeof sbServerOrChannelServer === 'object') {
    //   // backwards compatibility
    //   const sbServer = sbServerOrChannelServer as SBServer
    //   _sb_assert(sbServer.channel_server && sbServer.storage_server, "Snackabra() ERROR: missing channel_server or storage_server")
    //   this.channelServer = sbServer.channel_server
    //   this.storageServer = sbServer.storage_server
    //   // this.#preferredServer = Object.assign({}, sbServer)
    //   // this.#storage = new StorageApi(sbServer)
    // } else
  }

  attach(handle: SBChannelHandle): Promise<Channel> {
    return new Promise((resolve, reject) => {
      if (handle.channelId) {
        if (!handle.channelServer) {
          handle.channelServer = this.channelServer
        } else if (handle.channelServer !== this.channelServer) {
          reject('SBChannelHandle channelId does not match channelServer')
        }
        resolve(new Channel(handle))
      } else {
        reject('SBChannelHandle missing channelId')
      }
    })

  }

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
        let _storageToken: SBStorageToken | undefined
        if (typeof budgetChannelOrToken === 'string') {
          _storageToken = budgetChannelOrToken as SBStorageToken
        } else if (budgetChannelOrToken instanceof Channel) {
          const budget = budgetChannelOrToken as Channel
          await budget.ready // make sure it's ready
          if (!budget.channelServer) budget.channelServer = this.channelServer
          _storageToken = await budget.getStorageToken(NEW_CHANNEL_MINIMUM_BUDGET)
        } else {
          reject('Invalid parameter to create() - need a token or a budget channel')
        }
        _sb_assert(_storageToken, '[create channel] Failed to get storage token for the provided channel')

        // create a fresh channel (set of keys)
        const channelKeys = await new Channel().ready
        channelKeys.channelServer = this.channelServer
        channelKeys.create(_storageToken!)
          .then((handle) => { resolve(handle) })
          .catch((e) => { reject(e) })

        // const channelData = channelKeys.channelData
        // channelData.storageToken = _storageToken!
        // if (DBG) console.log("Will try to create channel with channelData:", channelData)
        // // const data: Uint8Array = new TextEncoder().encode(JSON.stringify(channelData));
        // const data = assemblePayload(channelData)
        // const response = await SBFetch(this.channelServer + '/api/v2/channel/' + channelData.channelId + '/create',
        //   {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/octet-stream"' },
        //     body: data
        //   });
        // const resp: any = extractPayload(await response.arrayBuffer())
        // if (!resp || !resp.success) {
        //   const msg = `Creating channel did not succeed (${JSON.stringify(resp)})`
        //   console.error(msg); reject(msg); return;
        // }
        // resolve({
        //   [SB_CHANNEL_HANDLE_SYMBOL]: true,
        //   channelId: channelData.channelId!,
        //   userPrivateKey: channelKeys.userPrivateKey,
        //   // channelPrivateKey: (await new SB384(channelKeys.channelPrivateKey).ready).userPrivateKey,
        //   channelServer: this.channelServer,
        //   channelData: channelData
        // })
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
  connect(handle: SBChannelHandle): Channel
  connect(handle: SBChannelHandle, onMessage: (m: ChannelMessage) => void): ChannelSocket
  connect(handle: SBChannelHandle, onMessage?: (m: ChannelMessage) => void): Channel | ChannelSocket {
    _sb_assert(handle && handle.channelId && handle.userPrivateKey, '[connect] Invalid parameter (missing info)')
    if (handle.channelServer && handle.channelServer !== this.channelServer)
      throw new Error('SBChannelHandle channelId does not match channelServer (use a different Snackabra object)')

    const newChannelHandle: SBChannelHandle =
      { ...handle, ...{ [SB_CHANNEL_HANDLE_SYMBOL]: true, channelServer: this.channelServer } }
    if (DBG) console.log("++++ Snackabra.connect() ++++", newChannelHandle)
    if (onMessage)
      return new ChannelSocket(newChannelHandle, (m: ChannelMessage) => { console.log("MESSAGE (not caught):", m) })
    else
      return new Channel(newChannelHandle)

    // // connect(onMessage: (m: ChannelMessage) => void, key?: JsonWebKey, channelId?: string /*, identity?: SB384 */): Promise<ChannelSocket> {
    // // if (DBG) {
    // //   console.log("++++ Snackabra.connect() ++++")
    // //   if (key) console.log(key)
    // //   if (channelId) console.log(channelId)
    // // }
    // return new Promise<ChannelSocket>(async (resolve) => {
    //   // const newUserId = sbCrypto.JWKToUserId(key)
    //   // if (!newUserId) throw new Error('Unable to determine userId from key (JWKToUserId return empty)')
    //   const newChannelHandle: SBChannelHandle = {
    //     [SB_CHANNEL_HANDLE_SYMBOL]: true,
    //     channelId: handle.channelId,
    //     userId: handle.userId, // newUserId,
    //     channelServer: this.channelServer
    //   }

    //   // this.#channel = new ChannelSocket(this.channelServer, onMessage, key, channelId)
    //   resolve(new ChannelSocket(newChannelHandle, onMessage ? onMessage :
    //     (m: ChannelMessage) => { console.log("MESSAGE (not caught):", m) }))

    //   // resolve(new ChannelSocket(this.channelServer!, onMessage, key, channelId))

    //   //   if (this.#preferredServer)
    //   //     // if we have a preferred server then we do not have to wait for 'ready'
    //   //     resolve(new ChannelSocket(this.channelServer!, onMessage, key, channelId))
    //   //   else
    //   //     // otherwise we have to wait for at least one of them to be 'ready', or we won't know which one to use
    //   //     resolve(Promise.any(SBKnownServers.map((s) => (new ChannelSocket(s, onMessage, key, channelId)).ready)))
    //   // })
    // })

  }

  /**
   * Returns the storage API.
   */
  get storage(): StorageApi {
    if (typeof this.#storage === 'string') throw new Error('StorageApi not initialized')
    return this.#storage;
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

/******************************************************************************************************/
//#region - exporting stuff

// export type {
//   ChannelData,
//   // ChannelKeyStrings,
//   // ImageMetaData
// }

export {
  SB384,
  SBMessage,
  Channel,
  ChannelSocket,
  // ChannelEndpoint,
  SBObjectHandle,
  Snackabra,
  arrayBufferToBase64,
  version,
};

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

if (!(globalThis as any).SB)
  (globalThis as any).SB = SB;
console.warn(`==== SNACKABRA jslib loaded ${(globalThis as any).SB.version} ====`); // we warn for benefit of Deno and visibility
//#endregion - exporting stuff
