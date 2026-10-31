# Changelog

Notable repository changes are recorded here. Entries are newest first; dates use ISO format.

## Unreleased: 2026-10-31

### Added

- Added Settings diagnostics for configured STUN/TURN availability and live peer-channel/ICE states, with troubleshooting hints.
- Added Firefox and WebKit compatibility checks and responsive mobile viewport coverage.
- Expanded the media security design draft to cover message attachments as well as voice/video calls, without claiming either feature is implemented.
- Added IRC-style `/help`, `/who`, `/me <action>`, and `/clear` message commands.
- Added a responsive product landing page at `/` with a direct launch link to `/app`.
- Added [FEATURES.md](FEATURES.md), a status-based comparison and tracked work sequence for BitChat-inspired capabilities, including explicit Bluetooth, Nostr, location-channel, offline-delivery, and Wi-Fi boundaries.

### Changed

- Clarified that WebRTC uses browser-negotiated DTLS transport encryption; ChaCha application encryption and media/attachments are not implemented.
- Removed the duplicate Quick Start section from the README.
- The root URL now serves the landing page; `/app` and `/index.html` serve the existing messenger.
- Restyled the messenger with a high-contrast black-and-white pixel-console look, square controls, and a subtle pixel grid.
- Removed decorative Unicode symbols and offset control shadows. Compact sidebars now stack profile actions to keep the chat pane clear.
- Expanded the landing page with setup steps, message-routing and mesh-scaling diagrams, and transport limitations.
- Reworked the messenger preview artwork to match the current monochrome interface.
- Documented that browser WebRTC can use IP networking, potentially over Wi-Fi, but does not supply Wi-Fi Direct or offline mesh.

### Not implemented

- Native Bluetooth LE mesh, multi-hop offline relaying, Nostr transport, geohash channels, store-and-forward delivery, emergency wipe, compression, and adaptive radio/battery behavior remain unimplemented. See [FEATURES.md](FEATURES.md).
