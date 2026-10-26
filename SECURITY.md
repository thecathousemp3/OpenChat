# Security Policy

OpenChat is experimental software and has not undergone an independent security review. Do not use it for sensitive communications or rely on it as a secure-messaging product.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting feature for this repository if it is enabled. If private reporting is unavailable, contact the repository owner through the contact information on their GitHub profile. Do not publish exploit details or private user data in a public issue.

Include the affected version or commit, the relevant component, steps to reproduce the issue in a local test environment, and any known impact. Do not include real invite codes, profile backup files, passwords, or message contents.

There is no guaranteed response time or service-level agreement. Reports will be reviewed as time permits.

## Current security boundaries

- Direct and shared-room messages are sent over browser WebRTC data channels protected in transit with DTLS. Shared-room message bodies are not relayed through the server.
- The room server relays membership, profile metadata, and WebRTC offer/answer signaling. Peer identities and room membership are not cryptographically authenticated, so an active malicious signaling server could interfere with connection establishment.
- WebRTC connections use no configured STUN or TURN services. NAT and firewall restrictions can prevent peers from connecting. Rooms use a bounded mesh of at most nine participants.
- Browser local storage is not encrypted at rest.
- Profile export files are encrypted locally with AES-GCM and PBKDF2, but password strength and safe storage remain the user's responsibility.
- Names, avatars, and invite codes are not authenticated.
- The server has no accounts, access control, persistent storage, moderation, or abuse-reporting system.
