# OpenChat mobile quick start

OpenChat is a browser app, not a native Android or iOS download. There is no public OpenChat server, app-store package, or offline mode. A Node.js server must be running somewhere for room chat.

## Use it on a phone or tablet

1. Open an OpenChat instance served over **HTTPS** in a current mobile browser. To host your own, follow [Hosting beyond your own computer](README.md#hosting-beyond-your-own-computer); the server must be reachable from the phone and its reverse proxy must support WebSocket upgrades.
2. Create a profile in the browser and join Global Chat or create a room.
3. Optionally bookmark the page or use your browser's **Add to Home Screen** feature for a shortcut. This does not install a native app or make OpenChat work offline.

Browsers restrict Web Crypto and other features used by OpenChat to secure contexts. For that reason, opening a self-hosted server at a plain `http://` LAN address on your phone may not provide full functionality. The desktop launchers start a local server for that computer; they do not publish it to the internet or configure HTTPS.

## Run the server from a computer

Start OpenChat on a computer using the [Windows](start-windows.bat), [macOS](start-macos.command), or [Linux](start-linux.sh) launcher. For mobile access, configure an HTTPS reverse proxy and a domain or other trusted HTTPS endpoint that the phone can reach. Keep the computer and server running while chatting.

Before making an instance reachable by other people, read [Security and privacy](README.md#security-and-privacy). The included server has no accounts, room permissions, or moderation.
