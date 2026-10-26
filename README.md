# OpenChat

OpenChat is a self-hosted instant messenger with a familiar desktop chat interface. It brings together shared chat rooms, direct browser-to-browser messaging, editable profiles, and portable encrypted profile backups in a small Node.js application.

[![CI](https://github.com/thecathousemp3/OpenChat/actions/workflows/ci.yml/badge.svg)](https://github.com/thecathousemp3/OpenChat/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)
[![Node.js 22 or later](https://img.shields.io/badge/Node.js-22%2B-555555.svg)](https://nodejs.org/)

![OpenChat interface preview](assets/openchat-preview.svg)

The preview uses fictional names and sample messages. It is a visual illustration, not a live conversation.

## What it does

- **Global Chat and custom rooms:** people using the same OpenChat server can join shared rooms and exchange live messages.
- **Direct messaging:** friends can establish a browser-to-browser WebRTC data channel using a manual offer and answer exchange.
- **Friend requests:** share an invite code, connect directly, then accept or ignore the request.
- **Editable profiles:** choose a display name and picture. Profile updates are shared with connected peers and room participants.
- **Encrypted profile backups:** export local identity, friend data, requests, and cached conversations to a password-protected `.openchat` file.
- **Local conversation history:** the browser keeps recent direct and room messages on that device.
- **Compact self-hosting:** the web interface and WebSocket room relay run together in a small Node.js service.

## Quick start

Requirements: Node.js 22 or later and npm.

```sh
git clone https://github.com/thecathousemp3/OpenChat.git
cd OpenChat
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). Keep the Node.js process running while using shared chat. Set `HOST` or `PORT` to change the listening address or port:

```sh
HOST=127.0.0.1 PORT=8080 npm start
```

PowerShell:

```powershell
$env:HOST = "127.0.0.1"
$env:PORT = "8080"
npm start
```

Run the automated checks with:

```sh
npm test
```

## Getting started in the app

### Use shared chat

Global Chat is the only room present when a server starts. Select **Create a room** to add a room for everyone connected to that server. Room names and membership are held in server memory. Custom rooms disappear when the server restarts; no test rooms are included by default. Messages are relayed live and are not queued for offline users.

### Add a friend

1. Share your `OC-XXXX-XXXX-XXXX` invite code with the person through a channel you trust.
2. Select **Add a friend** in both browser sessions and follow the prompts to create an offer and answer.
3. Exchange the offer and answer out of band. This manual step acts as signaling; OpenChat does not operate a signaling service.
4. Compare the displayed invite codes using a trusted channel. The recipient can then accept or ignore the friend request.

An established direct conversation uses a WebRTC data channel. No STUN or TURN servers are configured, so some networks and firewalls will prevent a connection. Existing friends and local history remain associated with the stable local profile ID if you generate a new invite code.

### Back up a profile

Select **Save profile**, then choose a password with at least 12 characters. OpenChat encrypts the exported file in the browser using AES-256-GCM and a PBKDF2-SHA-256 derived key. Select **Restore** and provide the file and password to restore it. Restoring replaces the profile in the current browser.

OpenChat does not keep or recover the backup password. Store the file and password securely and separately. The export is encrypted, but the active browser profile and its local history are not encrypted at rest.

## How it is built

- `index.html` contains the responsive interface, browser-side profile storage, profile backup encryption, and WebRTC connection flow.
- `server.js` serves the page and handles WebSocket room membership, room discovery, profile announcements, and live room-message relay.
- `ws` provides the WebSocket server. The browser uses built-in Web APIs for local storage, Web Crypto, and WebRTC.
- Room state exists only in server memory. Profile and conversation state is stored separately in each browser profile.

## Security and privacy

OpenChat is an early-stage project, not a reviewed secure-messaging product. Do not use it for sensitive communications.

- **Shared rooms are not end-to-end encrypted.** Room messages pass through the OpenChat server, which can read them.
- **Direct WebRTC transport is encrypted in transit by DTLS,** but OpenChat does not implement a reviewed end-to-end identity protocol. Comparing invite codes helps users notice mismatches; it is not a substitute for an audited protocol.
- **Local browser storage is not encrypted.** Anyone with access to the browser profile may be able to read cached profile and conversation data.
- **Encrypted export protects only the backup file.** Security depends on a strong password and keeping the password private.
- **Identity details are not authenticated.** Display names, avatars, and invite codes can be spoofed. There is no account recovery, centralized identity provider, or authoritative directory.
- **Direct connections require manual signaling.** There is no built-in relay service, offline delivery, or configured STUN/TURN infrastructure.
- **Public deployments need additional safeguards.** Use HTTPS and WSS, restrict network access as appropriate, and add moderation, abuse handling, resource limits, logging policy, and operational monitoring before inviting the public.

See [SECURITY.md](SECURITY.md) for responsible disclosure guidance. Reported limitations are not a promise that the application is secure.

## Hosting for other people

For access beyond your own machine, run OpenChat behind a reverse proxy that terminates HTTPS and forwards WebSocket upgrades to the Node.js service. Configure the proxy to preserve the `Host` header. The server checks same-origin WebSocket connections, but that check is not authentication or authorization.

The included server is intentionally small. It has no user accounts, room permissions, persistence, moderation tools, or administrator console. Anyone who can reach a server can create a room and join rooms on it. Review the source and decide whether its current behavior is suitable for your environment before exposing it to the internet.

## Development

The project has no build step. The GitHub Actions workflow checks JavaScript syntax, runs the server integration tests, and audits production dependencies.

Contributions are welcome. Open an issue to discuss a substantial change before starting work, and include reproduction steps and relevant environment details in bug reports. Do not include private invite codes, profile backups, passwords, or message contents in an issue.

## Project status

OpenChat is an independent, experimental project. It is not affiliated with AOL or Signal. The interface takes broad inspiration from classic desktop instant messengers; no third-party product code or artwork is included.

## License

OpenChat is available under the MIT License. See [LICENSE](LICENSE).
