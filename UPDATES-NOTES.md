# OpenChat implementation notes

This note records the current engineering choices and user-facing updates. Keep the README, app metadata, security documentation, and screenshots aligned when these behaviors change.

## Backend and connectivity

- **Uncapped rooms:** the server does not enforce a fixed participant count. A browser maintains one WebRTC data channel per room peer, so actual capacity depends on device, browser, and network resources and degrades with full-mesh growth.
- **Per-connection request protection:** each WebSocket is limited to 40 requests per 10-second window; an over-limit socket is closed. This bounds a single connection's signaling traffic but is not a global or per-IP connection-flood defense. Public operators should add reverse-proxy connection and IP limits.
- **Dead connection cleanup:** the server sends a WebSocket ping every 30 seconds and removes clients that do not respond, updating the in-memory room counts.
- **Configurable ICE:** `ICE_SERVERS_JSON` optionally supplies STUN/TURN entries. No provider is selected by default. Configuration is sent to browsers, so TURN credentials should be short-lived. ICE increases available connection paths but cannot guarantee connectivity.
- **IPv6:** bind using `HOST=::`, publish an AAAA record, and allow the relevant firewall traffic. WebRTC candidate gathering remains browser/network dependent.
- **Instance-local visibility:** connection status and room counts describe the configured instance only. OpenChat does not crawl or maintain a global server directory.

## Browser behavior and data

- **Plain-text messages:** message bodies are rendered as text; HTML is not interpreted and URLs are not converted into links, previews, or embedded images. Profile pictures remain separate profile metadata.
- **Typing indicator:** a compact, expiring notice is exchanged through existing room data channels. It is not stored in history or relayed through the signaling server; connected room peers can see typing activity.
- **Local data controls:** Settings can clear the current origin's `openchat.device.v1` local-storage data. It does not erase exported backup files or unrelated browser data. Export a profile first if it may be needed later.
- **Accessible responsive controls:** narrow layouts retain descriptive names for icon-only buttons. Dialogs trap keyboard focus and restore focus on close; connection updates are announced to assistive technology. Settings also provides a friend-code copy action for mobile layouts.

## Documentation, screenshots, and verification

- The README explains the signaling/message paths, peer-mesh scaling, plain-text policy, ICE trade-offs, local-storage boundary, and why these constraints fit a self-hosted application.
- `assets/openchat-desktop.png` and `assets/openchat-mobile.png` are generated from the running app with fictional sample profiles and messages. Regenerate them with `npm run capture:screenshots`; the script starts a local test server and launches Chromium.
- Run `npm test` for Node and Chromium integration coverage, `node --check server.js` for server syntax, and `npm run capture:screenshots` when refreshing the README preview assets.
