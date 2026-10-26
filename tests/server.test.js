const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const path = require("node:path");
const test = require("node:test");
const { WebSocket } = require("ws");

const root = path.join(__dirname, "..");
let child;
let port;
const clients = new Set();

async function findFreePort() {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address();
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForServer() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited with code ${child.exitCode}.`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (response.ok && await response.text() === "ok") return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Server did not become healthy within 10 seconds.");
}

function openClient() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const messages = [];
    const waiters = [];
    clients.add(socket);
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString());
      const waiter = waiters.shift();
      if (waiter) waiter(message);
      else messages.push(message);
    });
    socket.once("error", reject);
    socket.once("open", () => {
      resolve({
        socket,
        nextMessage() {
          if (messages.length) return Promise.resolve(messages.shift());
          return new Promise((resolveMessage, rejectMessage) => {
            const timeout = setTimeout(() => {
              const index = waiters.indexOf(receive);
              if (index !== -1) waiters.splice(index, 1);
              rejectMessage(new Error("Timed out waiting for a WebSocket message."));
            }, 3000);
            function receive(message) {
              clearTimeout(timeout);
              resolveMessage(message);
            }
            waiters.push(receive);
          });
        }
      });
    });
  });
}

test.before(async () => {
  port = await findFreePort();
  child = spawn(process.execPath, [path.join(root, "server.js")], {
    cwd: root,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
    stdio: "ignore"
  });
  await waitForServer();
});

test.after(async () => {
  for (const socket of clients) socket.terminate();
  if (child && child.exitCode === null) {
    child.kill();
    await once(child, "exit");
  }
});

test("health endpoint and app assets are served", async () => {
  const health = await fetch(`http://127.0.0.1:${port}/healthz`);
  assert.equal(health.status, 200);
  assert.equal(await health.text(), "ok");

  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /OpenChat \| Self-hosted instant messenger/);

  for (const asset of ["favicon.svg", "openchat-preview.svg"]) {
    const response = await fetch(`http://127.0.0.1:${port}/assets/${asset}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^image\/svg\+xml/);
    assert.match(await response.text(), /<svg/);
  }
});

test("new server starts with Global Chat and relays messages in created rooms", async () => {
  const first = await openClient();
  assert.deepEqual((await first.nextMessage()).rooms, ["Global Chat"]);

  first.socket.send(JSON.stringify({ type: "create-room", room: "Test Lounge" }));
  assert.deepEqual((await first.nextMessage()).rooms, ["Global Chat", "Test Lounge"]);
  assert.deepEqual(await first.nextMessage(), { type: "room-created", room: "Test Lounge" });

  const second = await openClient();
  assert.deepEqual((await second.nextMessage()).rooms, ["Global Chat", "Test Lounge"]);

  const firstIdentity = {
    type: "join",
    room: "Test Lounge",
    code: "OC-ABCD-EFGH-JKLM",
    inviteCode: "OC-ABCD-EFGH-JKLM",
    name: "First user",
    avatar: null
  };
  first.socket.send(JSON.stringify(firstIdentity));
  assert.deepEqual(await first.nextMessage(), { type: "joined", room: "Test Lounge" });

  second.socket.send(JSON.stringify({
    ...firstIdentity,
    code: "OC-NPQR-STUV-WXYZ",
    inviteCode: "OC-NPQR-STUV-WXYZ",
    name: "Second user"
  }));
  assert.deepEqual(await second.nextMessage(), { type: "joined", room: "Test Lounge" });

  first.socket.send(JSON.stringify({ type: "room-message", room: "Test Lounge", text: "Hello from a test." }));
  const firstMessage = await first.nextMessage();
  const secondMessage = await second.nextMessage();
  assert.equal(firstMessage.text, "Hello from a test.");
  assert.equal(secondMessage.text, "Hello from a test.");
  assert.equal(firstMessage.name, "First user");
  assert.equal(firstMessage.room, "Test Lounge");
});
