# Changelog

Follow format from [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Moving to "a32." (A32) format of b62 strings throughout, to catch
  transition you should generally 'id32' and 'key32'. For example,
  removing 'id' and 'key' from exported SBObjectHandle.

- SBObjectHandle version bumped to version 2, key difference
  is version '1' uses b64 encoded strings, version '2' uses
  b62 encoded strings.

- SBOBjectHandle has id64 and key64 setters/getters for
  backwards compatibility.

- stricter about using 'Base62Encoded' rather than 'string'

- removing 'base32mi' references, these are UI-oriented and
  should not be in jslib. left as commented out for now.

- SBObjectHandle has been completely rewritten so as to
  more tolerant of transition from b64 to b62.

- Handling of images in control messages etc have been tuned
  a bit to try to transition from b64 to b62 (eg all old
  conversations should work; added a obj type in control
  messages etc, which should henceforth be set to '2', but
  if missing will default to version '1')

- Entire "admin" concept (and thus an SSO) is deprecated.
  There is no longer an "admin" status for channels, just
  "owner". Thus "/getAdminData" isn't really "admin".

- ChannelKeys now has encryptedLockedKey member, which is
  the encrypted version of the lockedKey. (Encrypted
  from Owner to Visitor directly)

- deCryptChannelMessage is now internal to class Channel

- ChannelKeyStrings now includes ''encryptedLockKey''

- Moving from using a JWK as an identifier for a user
  connecting on a channel, to using ''SBUserId''.
  Multiple related changes in jslib and channelserver.

- creating a ''Channel'' object now always requires
  both (user) key and channel ID

- updating crypto.strongpin with base62mi05 "v05"
  which has a balanced 10/11/11 split between
  numbers, lowercase, and uppercase.

- crypto.strongpin now supports using provided additional
  entropy, as well as an enforced #/a/A mixture.
  For a 16-char (4-set) stronpin, entropy loss if you
  enable ''setCount'' is less than 1/100 bit.

- disabling getLastMessageTimes on channel server, needs
  a few issues to be resolved (see source)

- ChannelEndpoint removed

- Shard servers no longer called out in jslib, they are
  now handled callee-side.

- Now have proper arrayBufferToBase62() and base62ToArrayBuffer()
  functions (wasn't sure that would be practical.)

- SBKeyToString etc can now be recoded with proper base62 conversions

- Removing the "a32." prefix thing everywhere ... was a bad idea

- 'key' or 'keys' in many places are now defined as either SBUserID
  (a format for encoding a PUBLIC jwk key) or SBUserKeyString (ditto
  but for PRIVATE key).

## [1.1.0] - 2023-03-01

### Added

- This is template for future version tracking

[Unreleased]: https://github.com/384co/snackabra-jslib/compare/v0.6.5...development
[1.1.0]: https://github.com/384co/snackabra-jslib/compare/v1.0.1...v1.1.0
