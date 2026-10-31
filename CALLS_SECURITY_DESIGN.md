# Media security design: attachments and voice/video

**Status: design draft.** OpenChat currently supports text messages only; it does not implement message attachments or voice/video calls. This document records the security and architecture questions that must be answered before implementation. It does not define a cryptographic protocol or claim that current WebRTC connections provide verified end-to-end identity.

## Goals and boundaries

- Keep attachments and calls peer-to-peer where network conditions allow; a TURN server may forward encrypted transport packets when a direct route is unavailable.
- Use browser-negotiated WebRTC DTLS/DTLS-SRTP for transport protection. Do not claim that OpenChat selects or forces ChaCha, or that transport encryption authenticates a peer.
- Keep file contents off the signaling server. The server may still see connection metadata and any profile or signaling details required to establish a transfer or call.
- Define attachment type/size limits, transfer progress, cancellation, failure behavior, and local retention before implementation.
- Require a user gesture and explicit browser microphone/camera permission before transmitting media. Provide clear mute, camera-off, and hang-up controls.
- Authenticate the remote cryptographic identity, not just a display name, invite code, signaling-server response, or WebRTC connection state.
- Start with one-to-one attachment transfer and calls. Treat group calls as a separate topology and security problem. OpenChat currently uses a full peer mesh; each participant sends media to every other participant, so resource use grows quickly with group size.
- Preserve OpenChat's no-participant-cap policy. This does not promise that every room size can sustain calls; browser, device, and network capacity remain practical constraints.
- Do not claim independently reviewed end-to-end security until a selected protocol and implementation have received an external security review.

## Threat model

The design must account for a network observer, a malicious or compromised OpenChat signaling server, and a TURN operator that can observe connection metadata and forward traffic but should not receive media plaintext. Attachment handling must also account for deceptive filenames and MIME types, malformed or oversized files, partial transfers, and unsafe automatic previews. It must distinguish those threats from a compromised endpoint or browser, which can access plaintext content at that endpoint.

DTLS-SRTP protects a WebRTC transport between the endpoints that negotiated it. In the current app, however, signaling and peer identities are not cryptographically authenticated. A signaling service that can interfere with offer/answer exchange may therefore undermine the identity guarantee even when the resulting transports are encrypted. Transport encryption alone must not be presented as verified end-to-end encryption. A ChaCha cipher choice by itself would not resolve this identity problem.

## Design questions that block implementation

1. **Identity and verification:** Define a stable cryptographic identity separate from the existing friend code. Choose how people compare fingerprints or safety numbers over a trusted channel, how a verified key is bound to a contact, and how key changes or revocation are surfaced.
2. **Key lifecycle:** Decide how keys are generated, stored, backed up, restored, rotated, and revoked across browsers. Browser storage is currently unencrypted, while profile export is password-encrypted; key recovery must not silently weaken the identity guarantee.
3. **Authenticated call setup:** Bind the authenticated identity to the DTLS certificate/fingerprint and call transcript so that signaling cannot substitute a different peer or replay old call setup. Use an established, reviewed protocol or implementation rather than inventing cryptographic primitives or message formats in the app.
4. **Direct calls:** Existing direct-message setup exchanges a one-time offer and answer manually. Define how users securely exchange and verify call setup data, and how renegotiation or ICE restart works without an always-on direct signaling service.
5. **Room calls:** Define authenticated membership changes, join/leave behavior, and how each participant verifies all other participants. In a peer mesh, media is sent separately to each member; group calls do not inherit a 1:1 identity guarantee automatically.
6. **Network and privacy:** Explain what peers and STUN/TURN services can learn, how ephemeral TURN credentials are delivered, and that TURN configuration is visible to connected browsers.
7. **Abuse and recovery:** Define permission prompts, device indicators, call rejection, interruption behavior, and what users see when an identity key changes or cannot be verified.
8. **Attachment format and limits:** Choose supported file types, per-file and aggregate size limits, transfer chunking/backpressure, progress, cancellation, integrity checks, and behavior after a disconnect. Do not equate transport integrity with sender identity.
9. **Attachment rendering and storage:** Decide whether files are downloaded only or previewed, how untrusted MIME types and filenames are handled, whether received files enter local storage or profile backups, and how users remove them. Never execute or automatically render untrusted content.
10. **Call and attachment identity policy:** Decide whether transfers and calls are blocked until a contact is cryptographically verified or allowed with an explicit unverified-peer warning. The current friend-code comparison is not cryptographic authentication.

## Suggested implementation gates

1. Review and approve the attachment threat model, identity/key lifecycle, and unverified-peer policy.
2. Select a mature, independently reviewed protocol or library where application-level authenticated encryption is required. Review license and maintenance status before adoption; do not invent a wire protocol or cipher construction.
3. Prototype one-to-one transfers with explicit size/type limits and one-to-one calls behind user-gesture permission prompts. Keep call and attachment flows disabled until their design gates are met.
4. Add browser integration tests for transfer limits, malformed metadata, cancellation, interrupted transfers, permission denial, mute/camera controls, call setup, reconnection, identity mismatch, and key-change warnings.
5. Design room calls and group attachment distribution separately; measure mesh bandwidth and device costs without introducing a hidden participant cap.
6. Obtain an independent security review before describing calls or attachments as verified end-to-end encrypted or recommending them for sensitive use.

This draft intentionally does not prescribe a specific cipher suite, key agreement, signature scheme, attachment format, or custom wire protocol. Those choices need protocol research and expert review before code is written.
