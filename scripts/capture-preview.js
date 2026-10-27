const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const assets = path.join(root, "assets");
const demoPeerCode = "OC-SAMR-RAVR-2626";

async function findFreePort() {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise((resolve, reject) =>
    listener.close((error) => error ? reject(error) : resolve())
  );
  return port;
}

async function waitForServer(server, port) {
  const deadline = Date.now() + 10000;
  let lastError;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Preview server exited with code ${server.exitCode}.`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (response.ok) return;
      lastError = new Error(`Preview server returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Preview server did not become healthy: ${lastError?.message || "health check timed out"}`);
}

function demoState(name, code, messages = []) {
  return {
    version: 3,
    identity: { code, inviteCode: "OC-FRND-CHAT-2626", name, avatar: null },
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    messages: {},
    roomMessages: { "Global Chat": messages }
  };
}

async function openDemoPage(browser, port, name, code, messages = []) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  await page.addInitScript((state) => {
    localStorage.setItem("openchat.device.v1", JSON.stringify(state));
  }, demoState(name, code, messages));
  await page.goto(`http://127.0.0.1:${port}/app`);
  return { context, page };
}

async function main() {
  const port = await findFreePort();
  const server = spawn(process.execPath, [path.join(root, "server.js")], {
    cwd: root,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), ICE_SERVERS_JSON: "[]" },
    stdio: "ignore"
  });
  let browser;
  const contexts = [];
  try {
    await waitForServer(server, port);
    browser = await chromium.launch({ headless: true });

    const now = Date.now();
    const sampleMessages = [
      {
        id: "preview-1",
        code: demoPeerCode,
        name: "Sam Rivera",
        text: "Welcome! Room messages travel directly between browsers.",
        timestamp: now - 240000
      },
      {
        id: "preview-2",
        code: "OC-MRGN-REED-2626",
        name: "Morgan Reed",
        text: "And the server only coordinates room membership and connection setup.",
        own: true,
        timestamp: now - 180000,
        delivery: { recipients: [demoPeerCode], delivered: [demoPeerCode], failed: [] }
      },
      {
        id: "preview-3",
        code: demoPeerCode,
        name: "Sam Rivera",
        text: "That keeps the room service lightweight, while each browser handles its own peer connections.",
        timestamp: now - 90000
      },
      {
        id: "preview-4",
        code: "OC-MRGN-REED-2626",
        name: "Morgan Reed",
        text: "Right. There is no fixed room cap, but every device still has practical network limits.",
        own: true,
        timestamp: now - 30000,
        delivery: { recipients: [demoPeerCode], delivered: [demoPeerCode], failed: [] }
      },
      {
        id: "preview-5",
        code: demoPeerCode,
        name: "Sam Rivera",
        text: "Typing status is temporary too; it isn't written to chat history.",
        timestamp: now - 15000
      },
      {
        id: "preview-6",
        code: "OC-MRGN-REED-2626",
        name: "Morgan Reed",
        text: "And I can export an encrypted backup or clear this browser's saved data in Settings.",
        own: true,
        timestamp: now - 5000,
        delivery: { recipients: [demoPeerCode], delivered: [demoPeerCode], failed: [] }
      }
    ];

    const first = await openDemoPage(browser, port, "Morgan Reed", "OC-MRGN-REED-2626", sampleMessages);
    contexts.push(first.context);
    const second = await openDemoPage(browser, port, "Sam Rivera", demoPeerCode);
    contexts.push(second.context);
    await Promise.all([
      first.page.locator("#connectionLabel").getByText(/WebRTC 1\/1 connected/).waitFor({ timeout: 30000 }),
      second.page.locator("#connectionLabel").getByText(/WebRTC 1\/1 connected/).waitFor({ timeout: 30000 })
    ]);
    await first.page.locator("#roomList button[aria-label^='Global Chat, 2']").waitFor({ timeout: 10000 });

    await second.page.locator("#messageInput").fill("Typing indicators are temporary and stay peer to peer.");
    await first.page.locator("#typingIndicator").getByText(/is typing/).waitFor({ timeout: 5000 });
    await first.page.screenshot({
      path: path.join(assets, "openchat-desktop-v2.png"),
      fullPage: true,
      animations: "disabled"
    });

    await first.page.setViewportSize({ width: 390, height: 844 });
    await first.page.screenshot({
      path: path.join(assets, "openchat-mobile-v2.png"),
      fullPage: true,
      animations: "disabled"
    });
    console.log("Created assets/openchat-desktop-v2.png and assets/openchat-mobile-v2.png.");
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    if (browser) await browser.close();
    if (server.exitCode === null) {
      server.kill();
      await once(server, "exit");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
