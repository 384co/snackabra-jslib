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

## [1.1.0] - 2023-03-01

### Added

- This is template for future version tracking

[Unreleased]: https://github.com/384co/snackabra-jslib/compare/v0.6.5...development
[1.1.0]: https://github.com/384co/snackabra-jslib/compare/v1.0.1...v1.1.0
