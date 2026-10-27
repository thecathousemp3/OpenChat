const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
let server;
let browser;
let port;

async function findFreePort() {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address();
  await new Promise((resolve, reject) =>
    listener.close((error) => error ? reject(error) : resolve())
  );
  return address.port;
}

async function waitForServer() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Server exited with code ${server.exitCode}.`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Server did not become healthy within 10 seconds.");
}

test.before(async () => {
  port = await findFreePort();
  server = spawn(process.execPath, [path.join(root, "server.js")], {
    cwd: root,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
    stdio: "ignore"
  });
  await waitForServer();
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server && server.exitCode === null) {
    server.kill();
    await once(server, "exit");
  }
});

test("two browsers deliver, reply to, search, and retain room messages", { timeout: 90000 }, async () => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  try {
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    const pageErrors = [];
    first.on("pageerror", (error) => pageErrors.push(`first: ${error.message}`));
    second.on("pageerror", (error) => pageErrors.push(`second: ${error.message}`));
    await second.addInitScript(() => {
      window.__dropMessageAcks = true;
      const send = RTCDataChannel.prototype.send;
      RTCDataChannel.prototype.send = function (data) {
        try {
          if (window.__dropMessageAcks && JSON.parse(data).type === "message-ack") return;
        } catch {}
        return send.call(this, data);
      };
    });
    await Promise.all([
      first.goto(`http://127.0.0.1:${port}/`),
      second.goto(`http://127.0.0.1:${port}/`)
    ]);

    await first.setViewportSize({ width: 390, height: 844 });
    for (const [id, label] of [
      ["connectPeerButton", "Add a friend"],
      ["createRoomButton", "Create a room"],
      ["saveProfileButton", "Save encrypted profile"],
      ["restoreProfileButton", "Restore profile"],
      ["editNameButton", "Edit profile name"],
      ["regenerateCodeButton", "Generate new invite code"],
      ["settingsButton", "Settings"]
    ]) {
      const action = first.locator(`#${id}`);
      assert.equal(await action.getAttribute("aria-label"), label);
      assert.equal(await action.locator(".sidebar-icon svg").count(), 1);
    }
    const sidebarActionOverflow = await first.evaluate(() => {
      const sidebar = document.querySelector(".sidebar").getBoundingClientRect();
      const chatPanel = document.querySelector(".chat-panel").getBoundingClientRect();
      return [...document.querySelectorAll(".sidebar-action")].some((button) => {
        const bounds = button.getBoundingClientRect();
        return bounds.left < sidebar.left || bounds.right > chatPanel.left;
      });
    });
    assert.equal(sidebarActionOverflow, false);
    try {
      await Promise.all([
        first.locator("#connectionLabel").getByText(/WebRTC 1\/1 connected/).waitFor({ timeout: 30000 }),
        second.locator("#connectionLabel").getByText(/WebRTC 1\/1 connected/).waitFor({ timeout: 30000 })
      ]);
    } catch (error) {
      throw new Error(`${error.message}\nfirst status: ${await first.locator("#connectionLabel").textContent()}\nsecond status: ${await second.locator("#connectionLabel").textContent()}\nfirst toast: ${await first.locator("#toast").textContent()}\nsecond toast: ${await second.locator("#toast").textContent()}\npage errors: ${pageErrors.join("; ")}`);
    }

    const settingsButton = first.getByRole("button", { name: "Settings" });
    await settingsButton.click();
    const copyCodeButton = first.getByRole("button", { name: "Copy your friend code" });
    assert.equal(await copyCodeButton.count(), 1);
    await first.keyboard.press("Shift+Tab");
    assert.equal(await first.evaluate(() => document.activeElement.id), "copyInviteCodeButton");
    await first.keyboard.press("Shift+Tab");
    assert.equal(await first.evaluate(() => document.activeElement.id), "clearCacheButton");
    await first.keyboard.press("Tab");
    assert.equal(await first.evaluate(() => document.activeElement.id), "copyInviteCodeButton");
    await copyCodeButton.click();
    await first.locator("#toast").waitFor({ state: "visible" });
    assert.match(await first.locator("#toast").textContent(), /friend code/i);
    await first.keyboard.press("Escape");
    assert.equal(await first.evaluate(() => document.activeElement.id), "settingsButton");
    await first.getByRole("button", { name: /Global Chat, 2 participants/ }).waitFor();

    await first.locator("#messageInput").fill("");
    const plainTextMessage = "Browser delivery check <img src=x onerror=alert(1)> https://example.test";
    await first.locator("#messageInput").fill(plainTextMessage);
    await second.locator("#typingIndicator").getByText(/is typing/).waitFor();
    await first.locator("#messageInput").fill("");
    await second.locator("#typingIndicator").waitFor({ state: "hidden" });
    await first.locator("#messageInput").fill(plainTextMessage);
    await first.locator("#messageForm button[type=submit]").click();
    await first.locator(".message-text", { hasText: "Browser delivery check" }).waitFor();
    try {
      await second.locator(".message-text", { hasText: "Browser delivery check" }).waitFor({ timeout: 15000 });
    } catch (error) {
      throw new Error(`${error.message}\nfirst status: ${await first.locator("#connectionLabel").textContent()}\nsecond status: ${await second.locator("#connectionLabel").textContent()}\nfirst toast: ${await first.locator("#toast").textContent()}\nsecond toast: ${await second.locator("#toast").textContent()}\npage errors: ${pageErrors.join("; ")}`);
    }
    assert.equal(await first.locator(".message-text").first().textContent(), plainTextMessage);
    assert.equal(await first.locator(".message-text a, .message-text img").count(), 0);
    assert.equal(await second.locator(".message-text a, .message-text img").count(), 0);
    await first.locator(".delivery-status", { hasText: "waiting for delivery" }).waitFor();
    await first.locator(".message [data-retry-message]").click();
    assert.equal(await second.locator(".message-text", { hasText: "Browser delivery check" }).count(), 1);
    await second.evaluate(() => { window.__dropMessageAcks = false; });
    await first.locator(".message [data-retry-message]").click();
    await first.locator(".delivery-status", { hasText: "Delivered" }).waitFor();

    await second.locator(".message [data-reply-to]").click();
    await second.locator("#replyPreview").waitFor({ state: "visible" });
    await second.locator("#messageInput").fill("Browser reply check");
    await second.locator("#messageForm button[type=submit]").click();
    await first.locator(".message-text", { hasText: "Browser reply check" }).waitFor();
    await first.locator(".message-reply", { hasText: "Browser delivery check" }).waitFor();

    await second.locator("#messageSearch").fill("Browser reply check");
    assert.equal(await second.locator(".message-text").count(), 1);
    await second.evaluate(() => {
      const key = "openchat.device.v1";
      const state = JSON.parse(localStorage.getItem(key));
      delete state.roomMessages["Global Chat"][0].id;
      localStorage.setItem(key, JSON.stringify(state));
    });
    await second.reload();
    await second.locator(".message-text", { hasText: "Browser reply check" }).waitFor();
    assert.equal(await second.locator(".message [data-reply-to]").count(), 2);
    assert.deepEqual(pageErrors, []);
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
