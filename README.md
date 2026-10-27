# OpenChat

**A self-hosted instant messenger with a little early-2000s desktop nostalgia and a browser-to-browser chat architecture.**

OpenChat gives you a familiar buddy-list-and-chat-window experience without a hosted account system. Run the small Node.js server yourself, connect through a browser, and use Global Chat, create a room, or exchange a direct-message invitation with a friend.

> **Experimental software:** OpenChat is not an independently reviewed secure-messaging product. Read [Security and privacy](#security-and-privacy) before using it, and do not use it for sensitive communications.

[![CI](https://github.com/thecathousemp3/OpenChat/actions/workflows/ci.yml/badge.svg)](https://github.com/thecathousemp3/OpenChat/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)
[![Node.js 22 or later](https://img.shields.io/badge/Node.js-22%2B-555555.svg)](https://nodejs.org/)

![OpenChat Global Chat interface preview](assets/openchat-preview.svg)

*An illustrated preview of the interface. Names and messages are fictional; this is not a live conversation.*

## Explore OpenChat

| How room messages travel | How peer meshes scale | What a profile backup protects |
| --- | --- | --- |
| ![A diagram showing WebRTC room messages going directly between peers while the server handles signaling](assets/message-path.svg) | ![A diagram showing how the number of peer connections grows with room size](assets/room-mesh.svg) | ![A diagram comparing unencrypted browser storage with an encrypted profile export](assets/profile-backup.svg) |

## At a glance

- **Global Chat and rooms:** room members connect to one another with WebRTC data channels. Global Chat is the only room present when a server starts; users can create other rooms.
- **Direct messages:** friends exchange a connection offer and answer out of band, then chat over a browser-to-browser data channel.
- **Friend requests:** connect with a friend code, check the code through a trusted channel, then accept or ignore the request.
- **Delivery feedback:** messages show per-peer delivery acknowledgements; undelivered messages can be retried without re-sending to peers that acknowledged them.
- **Local conversation tools:** search the messages cached on this device and reply to a message with a quoted excerpt.
- **Personal profiles:** choose a display name and picture. Profile information is sent to connected friends and room members.
- **Portable encrypted backup:** export your local profile, friends, requests, and cached messages to a password-protected `.openchat` file.
- **Connection status:** see whether this instance is reachable and how many live members are in each room.
- **Browser data controls:** clear the OpenChat profile and conversation data stored by this browser from Settings.
- **Self-hosted:** one small Node.js process serves the page and coordinates room membership and WebRTC signaling.

## Get started

### Requirements

- Node.js 22 or later
- npm
- A supported browser with WebRTC, Web Crypto, and local storage support

### Browser support

OpenChat targets current stable desktop Chrome, Edge, Firefox, and Safari. Chromium is exercised in the automated browser integration test; the other browsers are best-effort targets and should be tested before relying on a deployment. Mobile browsers may work but are not currently covered by automated tests. Use an up-to-date browser; WebRTC and Web Crypto behavior, and available network paths, vary by browser and environment.

### Quick start by device

Download and extract the [repository ZIP](https://github.com/thecathousemp3/OpenChat/archive/refs/heads/main.zip), or clone the repository, then run the launcher for your computer:

| Platform | Launcher |
| --- | --- |
| Windows | [start-windows.bat](start-windows.bat) |
| macOS | [start-macos.command](start-macos.command) |
| Linux | [start-linux.sh](start-linux.sh) |
| Phone or tablet | [Mobile quick start](START-MOBILE.md) |

The desktop launchers check for Node.js 22 or later, install the locked dependencies if needed, and start the server. Keep the terminal window open while using OpenChat. On macOS, if double-clicking the `.command` file is blocked, run `bash ./start-macos.command` from Terminal in the extracted folder. On Linux, run `bash ./start-linux.sh` from the extracted project folder (or make it executable once with `chmod +x ./start-linux.sh` and then run `./start-linux.sh`).

OpenChat runs in a mobile browser; it does not currently have a native mobile app or a public hosted instance. See the [mobile quick start](START-MOBILE.md) for how to connect a phone to a self-hosted instance.

### Run locally

```sh
git clone https://github.com/thecathousemp3/OpenChat.git
cd OpenChat
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). Keep the Node.js process running while using shared chat.

To use a different address or port:

```sh
HOST=127.0.0.1 PORT=8080 npm start
```

PowerShell:

```powershell
$env:HOST = "127.0.0.1"
$env:PORT = "8080"
npm start
```

For IPv6, bind the server to the IPv6 wildcard address. Node.js and the browser handle IPv6 WebRTC candidates as part of normal ICE negotiation:

```powershell
$env:HOST = "::"
npm start
```

### Configure WebRTC connectivity

By default, OpenChat uses no STUN or TURN servers. Configure ICE servers for every browser connected to your instance with `ICE_SERVERS_JSON`:

```sh
ICE_SERVERS_JSON='[{"urls":"stun:stun.example.org:3478"},{"urls":"turn:turn.example.org:3478?transport=udp","username":"temporary-user","credential":"temporary-password"}]' npm start
```

PowerShell:

```powershell
$env:ICE_SERVERS_JSON = '[{"urls":"stun:stun.example.org:3478"},{"urls":"turn:turn.example.org:3478?transport=udp","username":"temporary-user","credential":"temporary-password"}]'
npm start
```

The value must be a JSON array of ICE server objects. Each object has `urls` (a URL string or array); TURN entries also require `username` and `credential`. STUN can help peers discover reachable network addresses; TURN can relay encrypted WebRTC traffic when direct connections fail. Use a TURN provider you trust and short-lived credentials: the configuration, including TURN credentials, is delivered to browsers and is visible to users of your instance. The credentials are not a secret from those users. ICE servers can improve connectivity but do not guarantee a connection.

Run the test suite with `npm test`.

## A first tour

### Start with Global Chat

Every new server starts with one room: **Global Chat**. The room list and membership live in server memory. Creating a room makes it available to people connected to that same server; it does not publish the room to a global directory. Custom rooms disappear when the server restarts.

The room list displays current member counts, and the status bar and Settings report whether the configured server is connected or reconnecting. This is visibility into the single server instance you opened; OpenChat does not discover or monitor unrelated servers.

Room chat is a direct mesh: each browser creates a separate WebRTC data channel to every other currently connected member. The room server tells members who is present and helps browsers exchange connection offers and answers. It does not receive room message text. A message is sent to currently open peer channels; OpenChat shows which peers acknowledged it and lets you retry unacknowledged recipients. Messages are not queued for offline members, and older clients that do not acknowledge messages may leave the delivery status waiting.

Rooms have **no fixed participant cap**. Each browser connects directly to every other room member, so the full mesh grows quadratically: a room with *n* people needs *n × (n − 1) ÷ 2* peer connections overall. OpenChat will accept larger rooms, but browsers and networks have practical capacity limits; very large rooms may become slow or fail to connect. The [room mesh diagram](assets/room-mesh.svg) shows how the connection count grows.

Search applies only to the conversation history cached in the current browser profile. Replies store a quoted excerpt locally and send that excerpt with the reply; there is no server-side search, synchronized history, or offline delivery. The server has no accounts, room permissions, or moderation tools, so any reachable visitor can join a room. Since participant identities are not authenticated, OpenChat does not currently assign trusted room moderators.

### Add a friend and start a direct chat

1. Select **Add a friend** and exchange your `OC-XXXX-XXXX-XXXX` friend code through a channel you trust.
2. Follow the prompts in both browser sessions to create and exchange a connection offer and answer. These are connection setup details, not chat messages.
3. Compare the friend codes through that trusted channel. Codes help you check what you were given, but OpenChat does not cryptographically verify a person's identity.
4. Accept or ignore the incoming friend request. Once the WebRTC data channel is open, you can message directly.

Direct-message signaling is manual: OpenChat does not operate a direct-message signaling service. Existing friends and local history stay associated with the local profile when you generate a new invite code; the new code is what you share with new contacts.

### Choose a name and picture

Edit your local profile in the sidebar. When your browser is connected, the selected name and picture are shared with your connected friends and the participants in your current shared room. Those details are not verified: another participant or server can claim a display name or picture.

### Back up or restore your profile

Choose **Save profile** and set a password of at least 12 characters. The browser encrypts the export with **AES-256-GCM**. A key is derived from your password using **PBKDF2-HMAC-SHA-256 with 310,000 iterations**, a random 16-byte salt, and a random 12-byte GCM nonce. The `.openchat` file contains the encrypted backup and the parameters needed to derive its key; it does not contain your password.

Choose **Restore** and select the file and password. Restoring replaces the profile currently in that browser. OpenChat cannot recover a lost password. Keep the file and password somewhere safe and separately.

## What happens to a message?

### Shared-room message

1. The browser sends the server a join request with the selected room and profile details.
2. The server returns a temporary connection ID and room-member metadata, then relays WebRTC offers and answers between room members.
3. Browsers establish direct WebRTC data channels. The browser encrypts channel traffic in transit with DTLS.
4. The sender sends the room message over each open peer channel. The server does not relay the message body.

The server still sees room membership, profile details, invite codes, and connection signaling. A server that actively interferes with signaling could affect which peer connection is established. WebRTC's transport encryption is not a substitute for a reviewed, authenticated end-to-end encryption protocol.

### Direct message

Direct messages also travel over a WebRTC data channel protected in transit with DTLS, but their initial connection is established using manually exchanged offer and answer text. You are responsible for sharing those details and checking your friend's code through a trusted channel.

### Why WebRTC might not connect

WebRTC needs a path through the networks between the browsers. OpenChat ships with **no STUN or TURN servers configured**. The instance operator can configure them using [`ICE_SERVERS_JSON`](#configure-webrtc-connectivity):

- **STUN** can help a browser discover a network address that peers may be able to reach.
- **TURN** can relay traffic when a direct path is blocked. A TURN relay would carry encrypted transport data, but it adds an infrastructure operator and network dependency.
- Without either service, NATs, firewalls, VPNs, or browser network policies can prevent peers from connecting.

The app reports connection status and retries ICE negotiation for shared-room peer connections after a connection failure. Direct-message signaling is manual, so a failed direct connection requires exchanging a new offer and answer. The app does not silently fall back to sending room message text through the server. WebRTC may also expose network address information to peers or infrastructure involved in connection setup; consider this when deciding whether to use it.

### Voice/video and end-to-end security

Voice and video calling are not implemented yet. WebRTC media uses DTLS-SRTP transport encryption, but OpenChat does not cryptographically authenticate peer identities or protect signaling with an identity-key protocol. Therefore, transport encryption alone is not a verified end-to-end encryption guarantee against a malicious signaling service. Voice/video and stronger authenticated end-to-end security need a separate threat model, protocol and key-verification design, and independent security review before implementation or security claims.

See the [voice/video security design](CALLS_SECURITY_DESIGN.md) for the threat model and implementation gates. It defines no protocol yet; a mature, reviewed approach and independent security review are prerequisites.

## Local data and backup boundaries

OpenChat stores the active profile and recent conversation history in the browser's local storage. That data is **not encrypted at rest**. Someone with access to your unlocked browser profile or device may be able to read it. Use **Settings → Clear cache and local data** to remove OpenChat's saved data from the current browser. This does not clear unrelated browser data or exported profile files.

The password-protected export is encrypted, but encryption applies to the exported file, not the live browser storage. Your password is not sent to the server, and there is no account-based recovery if the file or password is lost. A new device starts with a separate local profile unless you restore an export yourself.

![Browser profile storage remains local and unencrypted; an exported profile is encrypted with a password](assets/profile-backup.svg)

## Architecture

- **`index.html`** contains the interface, local profile and conversation storage, profile export encryption, direct WebRTC setup, and room peer connections.
- **`server.js`** serves the page and WebRTC configuration, and handles room discovery, membership, profile metadata, and room offer/answer signaling. It does not relay shared-room message bodies. It pings WebSocket clients every 30 seconds and removes clients that miss a heartbeat.
- **`index.html`** contains the interface, local profile and conversation storage, profile export encryption, local conversation search/replies, delivery acknowledgements, direct WebRTC setup, and room peer connections.
- **`server.js`** serves the page and ICE server configuration, and handles room discovery, membership, profile metadata, and room WebRTC offer/answer signaling. It does not relay shared-room message bodies. It pings WebSocket clients every 30 seconds and removes clients that miss a heartbeat.
- **`ws`** provides the WebSocket server. The browser uses built-in Web APIs for WebRTC, Web Crypto, and local storage.
- **No user database:** room names and membership are kept in server memory; profile and conversation state are kept separately in each browser profile.
- **Browser integration tests:** the Node test suite launches Chromium and verifies a two-browser shared-room delivery, reply, local-search, and persistence flow.

### Why a peer mesh is for small groups

In a full mesh, every participant needs one connection to every other participant. With *n* members, that is *n × (n − 1) ÷ 2* peer connections across the room, and each participant maintains *n − 1* connections. This avoids routing message bodies through a central room server, but it uses more network and browser resources as a room grows. OpenChat imposes no fixed participant cap; actual capacity depends on each participant's browser, device, and network.

### What “self-hosted” and “peer-to-peer” mean here

You operate the room server, but room participants still depend on it to find room members and exchange connection setup data. The server is not a global user directory, and there is no central account or identity provider. Once connected, chat messages travel browser to browser. These properties reduce the server's role; they do not make the system anonymous, identity-proof, or immune to a malicious server.

## Security and privacy

OpenChat is an early-stage project and has not had an independent security review. Do not use it for sensitive communications or treat it as a secure-messaging product.

- **Transport encryption:** browsers protect WebRTC data channels with DTLS in transit. Shared-room message bodies are not sent through the OpenChat server.
- **Signaling and metadata:** the room server handles membership, names, pictures, invite codes, and WebRTC offers and answers. These are not end-to-end encrypted by an OpenChat identity protocol.
- **No cryptographic identity verification:** friend codes and profile details can be spoofed. A malicious or compromised signaling server could interfere with connection setup.
- **Unencrypted device storage:** active browser data is stored locally without encryption. Only exported profile files are encrypted.
- **No offline delivery:** messages are not queued for disconnected peers.
- **Optional STUN/TURN:** the server operator can configure ICE servers, but those services add infrastructure and privacy considerations; some network configurations may still fail to connect.
- **No moderation or access control:** anyone who can reach the server can join available rooms or create rooms. There are no accounts, room permissions, abuse reports, or admin console.
- **Browser data:** profile, contacts, and conversation history are stored in the browser's unencrypted local storage. Settings can clear OpenChat's local data; export a profile first if you may want to restore it.
- **Signaling rate limit:** each WebSocket connection is limited to 40 requests per 10-second window; an over-limit connection is closed. This is per connection, not a global or per-IP abuse limit.
- **Network information:** WebRTC can expose network addresses to peers or infrastructure involved in connection establishment.

See [SECURITY.md](SECURITY.md) for reporting guidance and the current security boundaries.

## Hosting beyond your own computer

For access over the internet, place the Node.js server behind a reverse proxy that terminates HTTPS and supports WebSocket upgrades. Configure it to preserve the `Host` header. Visitors should use HTTPS; browsers require a secure context for some cryptographic and media-related APIs.

The server sends WebSocket heartbeat pings every 30 seconds and removes unresponsive clients from room membership. `WS_HEARTBEAT_INTERVAL_MS` can override the interval from 100 to 300000 milliseconds. Its `/healthz` endpoint checks whether the process can answer HTTP requests; it does not measure WebRTC connectivity or discover other servers. For IPv6 internet access, bind with `HOST=::`, publish an AAAA record, and allow the relevant firewall traffic. TURN is separate from the OpenChat signaling server and must be configured and operated independently.

The server checks that a WebSocket `Origin` matches its `Host`, but this is **not authentication or authorization**. The included server has no accounts, permissions, persistence, moderation, global connection quotas, or administrator console. Anyone who can reach it can join rooms on it. Per-connection rate limiting does not prevent an attacker from opening many connections; use reverse-proxy connection and IP rate limits for public deployments.

## Development

There is no build step. The CI workflow checks JavaScript syntax, runs the server integration tests, and audits production dependencies.

```sh
npx playwright install chromium
npm test
node --check server.js
npm audit --omit=dev
```

The test command runs Node integration tests and a Chromium test with two browser contexts. CI installs Chromium automatically.

Contributions are welcome. Open an issue to discuss a substantial change before starting work, and include reproduction steps and relevant environment details in bug reports. Do not post real invite codes, profile backups, passwords, or message contents.

## Project status and credits

OpenChat is an independent experimental project. It is not affiliated with AOL or Signal. The interface takes broad inspiration from classic desktop instant messengers; no third-party product code or artwork is included.

## License

OpenChat is available under the MIT License. See [LICENSE](LICENSE).
