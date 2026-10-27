# OpenChat update notes

Include these backend, browser, documentation, and landing-page changes in the next repository update:

- Keep rooms uncapped; do not introduce a participant cap. Room mesh capacity remains limited by clients and networks.
- Enforce the existing per-WebSocket request limit: 40 requests per 10-second window, then close that connection. This is not a per-IP or global connection-flood defense; public deployments still need reverse-proxy limits.
- Add a 30-second WebSocket ping/pong heartbeat and remove unresponsive clients from room membership. Update room counts when membership changes.
- Add optional `ICE_SERVERS` configuration for STUN/TURN. Warn that ICE configuration is public to connected browsers and TURN credentials should be short-lived.
- Support IPv6 server binding with `HOST=::`; document DNS/firewall requirements. WebRTC gathers IPv6 candidates through browser ICE.
- Show current instance connection/reconnect state and live member counts per room. This is not a directory or health monitor for unrelated OpenChat servers.
- Add Settings → Clear cache and local data. It removes only the current origin's `openchat.device.v1` local-storage data; exported backups and unrelated browser data remain untouched. Recommend exporting before clearing.
- Update the app's About/Settings text, README, and SECURITY.md alongside the backend changes.

Verification should include server/frontend tests, JavaScript syntax checks, heartbeat cleanup, configurable ICE delivery, rate-limit disconnect, room-count updates, IPv6 deployment documentation, and the cache-clear flow.
