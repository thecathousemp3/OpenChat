# Feature tracker

This file is the repository's source of truth for feature coverage and transport work. Status describes what is actually present in this repository, not a promise or target release date. Keep it updated whenever a feature is added, changed, deferred, or found to be platform-incompatible.

## Status key

- **Available**: implemented in this repository.
- **Partial**: a related capability exists, but does not provide the referenced feature end to end.
- **Not implemented**: no equivalent is currently available.
- **Platform research**: requires native APIs or architecture decisions before implementation.

## BitChat feature comparison

The comparison is based on the [BitChat repository feature overview](https://github.com/permissionlesstech/bitchat#features) and its [technical whitepaper](https://github.com/permissionlesstech/bitchat/blob/main/WHITEPAPER.md), checked 2026-10-27. BitChat is a separate project; this matrix records ideas and gaps, not protocol compatibility or affiliation.

| Capability | OpenChat status | Current behavior / gap |
| --- | --- | --- |
| No accounts or phone numbers | **Available** | OpenChat has local browser profiles and friend codes, with no central account service. |
| Nearby Bluetooth LE communication | **Not implemented** | The browser app does not scan for, advertise, or connect to a BLE mesh. |
| Multi-hop offline mesh relaying | **Not implemented** | Current room connections are one-hop WebRTC links between current room members; there is no offline relay protocol or hop limit. |
| Bluetooth-first, internet fallback routing | **Not implemented** | There is no transport selector or cross-transport message routing layer. |
| Nostr relay messaging | **Not implemented** | OpenChat does not publish to or subscribe from Nostr relays. |
| Geohash/location channels | **Not implemented** | There are no location permissions, geohash rooms, or location-scoped identities. |
| Private messages over mesh and internet | **Partial** | Direct WebRTC chat exists after manual offer/answer exchange. It is not BitChat's Noise or private-envelope protocol and has no relay fallback. |
| Encrypted private-envelope protocol | **Not implemented** | WebRTC DTLS protects a live transport; OpenChat has no application-level authenticated E2E message protocol. |
| IRC-style commands | **Partial** | `/help`, `/who`, `/me <action>`, and `/clear` exist. BitChat's broader command behavior is not replicated. |
| Emergency wipe gesture | **Not implemented** | There is no verified, cross-device wipe control. Browser storage clearing needs explicit design and testing. |
| Store-and-forward / offline queue | **Not implemented** | Messages are not queued or delivered to offline peers. |
| Message compression and adaptive battery behavior | **Not implemented** | There is no LZ4 layer or native radio duty-cycle/battery manager. |
| Wi-Fi Direct or Wi-Fi mesh transport | **Not in BitChat's documented feature overview** | OpenChat uses WebRTC over IP, which may connect over Wi-Fi when network and signaling conditions permit. It does not implement Wi-Fi Direct, hotspot discovery, or standalone Wi-Fi mesh. Treat a native Wi-Fi transport as separate research, not a BitChat feature. |

## OpenChat capabilities that exist today

- Browser-to-browser WebRTC data channels for shared-room and direct messages.
- A self-hosted WebSocket signaling/discovery service for shared rooms; direct-message signaling is exchanged manually.
- Local profile and recent chat storage, plus password-encrypted profile export and restore.
- Friend requests and IRC-style `/help`, `/who`, `/me`, and `/clear` commands.

Important limitations remain: no independent security review, no cryptographic peer identity verification, no configured STUN/TURN, no moderation or access control, and no offline delivery. See [README.md](README.md#security-and-privacy) and [SECURITY.md](SECURITY.md).

## Work sequence

These are tracked implementation areas, not claims that work is already underway:

1. **Native platform foundation: Platform research.** Choose supported Android/iOS targets, app structure, shared message model, key lifecycle, and a testable cross-platform boundary. A browser page cannot provide BitChat-equivalent background BLE mesh behavior.
2. **Identity and cryptographic protocol: Not implemented.** Select or design a reviewed interoperable protocol before adding internet or mesh private messaging. Define identity verification, key rotation, replay handling, metadata exposure, and migration from local friend codes.
3. **Internet transport: Not implemented.** Add a Nostr transport only after protocol and identity decisions; cover relay discovery, reconnection, event validation, delivery semantics, and relay privacy.
4. **Location channels: Not implemented.** Specify opt-in location access, geohash precision, location-change behavior, and metadata minimization before implementation.
5. **Offline BLE mesh: Platform research.** Implement native BLE discovery, packet framing, peer lifecycle, forwarding bounds, duplicate suppression, TTL/hop limits, battery behavior, and privacy protections with device-level tests.
6. **Unified routing and store-and-forward: Not implemented.** Define delivery acknowledgements and retry/deduplication behavior across transports without creating success-shaped delivery claims.
7. **Native safety and performance: Not implemented.** Evaluate emergency wipe, compression, and adaptive battery modes only with a documented threat model, platform-specific tests, and explicit UX.
8. **Wi-Fi transport evaluation: Platform research.** BitChat's documented overview does not list Wi-Fi as a transport. Evaluate Wi-Fi Direct/local-network transport independently against supported devices and threat/privacy requirements.

## Update practice

- Add a dated entry to [CHANGELOG.md](CHANGELOG.md) for user-visible changes.
- Update the matrix and status key when capability changes; link tests or documentation that substantiate **Available** claims.
- Keep unavailable native transports visibly marked as unavailable in the app and landing page.
- Do not label DTLS-only WebRTC as an authenticated end-to-end encryption protocol.
