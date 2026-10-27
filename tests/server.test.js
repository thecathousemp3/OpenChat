const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const path = require("node:path");
const test = require("node:test");
const { WebSocket } = require("ws");

const root = path.join(__dirname, "..");
const testIceServers = [
  { urls: ["stun:stun.example.test:3478"] },
  { urls: ["turn:turn.example.test:3478"], username: "test-user", credential: "test-credential" }
];
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

function openClient(options = {}) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, options);
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
        nextMessage(timeoutMs = 3000) {
          if (messages.length) return Promise.resolve(messages.shift());
          return new Promise((resolveMessage, rejectMessage) => {
            const timeout = setTimeout(() => {
              const index = waiters.indexOf(receive);
              if (index !== -1) waiters.splice(index, 1);
              rejectMessage(new Error("Timed out waiting for a WebSocket message."));
            }, timeoutMs);
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

async function nextMessageOfType(client, type, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const message = await client.nextMessage(deadline - Date.now());
    if (message.type === type) return message;
  }
  throw new Error(`Timed out waiting for a ${type} WebSocket message.`);
}

test.before(async () => {
  port = await findFreePort();
  child = spawn(process.execPath, [path.join(root, "server.js")], {
    cwd: root,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      ICE_SERVERS: JSON.stringify(testIceServers),
      WS_HEARTBEAT_INTERVAL_MS: "100"
    },
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
  const config = await fetch(`http://127.0.0.1:${port}/config.json`);
  assert.equal(config.status, 200);
  assert.deepEqual(await config.json(), { iceServers: testIceServers });

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

test("new server starts with Global Chat and relays WebRTC signaling, not room messages", async () => {
  const first = await openClient();
  assert.deepEqual((await first.nextMessage()).rooms, ["Global Chat"]);
  const second = await openClient();
  assert.deepEqual((await second.nextMessage()).rooms, ["Global Chat"]);

  const firstIdentity = {
    type: "join",
    room: "Global Chat",
    code: "OC-ABCD-EFGH-JKLM",
    inviteCode: "OC-ABCD-EFGH-JKLM",
    name: "First user",
    avatar: null
  };
  first.socket.send(JSON.stringify(firstIdentity));
  const firstJoined = await nextMessageOfType(first, "joined");
  assert.equal(firstJoined.type, "joined");
  assert.equal(firstJoined.room, "Global Chat");
  assert.ok(firstJoined.peerId);
  assert.deepEqual(firstJoined.peers, []);

  second.socket.send(JSON.stringify({
    ...firstIdentity,
    code: "OC-NPQR-STUV-WXYZ",
    inviteCode: "OC-NPQR-STUV-WXYZ",
    name: "Second user"
  }));
  const secondJoined = await nextMessageOfType(second, "joined");
  assert.equal(secondJoined.type, "joined");
  assert.equal(secondJoined.room, "Global Chat");
  assert.equal(secondJoined.peers.length, 1);
  assert.equal(secondJoined.peers[0].id, firstJoined.peerId);
  assert.equal(secondJoined.peers[0].name, "First user");

  const joinedEvent = await nextMessageOfType(first, "room-peer-joined");
  assert.equal(joinedEvent.type, "room-peer-joined");
  assert.equal(joinedEvent.peer.id, secondJoined.peerId);

  const offer = { type: "offer", sdp: "v=0\r\nroom-offer-test" };
  first.socket.send(JSON.stringify({
    type: "room-signal",
    target: secondJoined.peerId,
    signal: offer
  }));
  assert.deepEqual(await nextMessageOfType(second, "room-signal"), {
    type: "room-signal",
    room: "Global Chat",
    from: firstJoined.peerId,
    signal: offer
  });

  first.socket.send(JSON.stringify({ type: "room-message", room: "Global Chat", text: "This must not reach the server." }));
  const rejected = await nextMessageOfType(first, "error");
  assert.equal(rejected.type, "error");
  assert.match(rejected.message, /peer-to-peer WebRTC/);
  await assert.rejects(second.nextMessage(100), /Timed out/);

  first.socket.send(JSON.stringify({
    type: "profile-update",
    code: firstIdentity.code,
    inviteCode: firstIdentity.inviteCode,
    name: "First user updated",
    avatar: null
  }));
  const profile = await nextMessageOfType(second, "room-peer-profile");
  assert.equal(profile.type, "room-peer-profile");
  assert.equal(profile.peerId, firstJoined.peerId);
  assert.equal(profile.name, "First user updated");

  first.socket.close();
  const leftEvent = await nextMessageOfType(second, "room-peer-left");
  assert.equal(leftEvent.type, "room-peer-left");
  assert.equal(leftEvent.peerId, firstJoined.peerId);
});

test("Global Chat accepts more than nine participants", async () => {
  const participants = [];
  const codeGroups = ["AAAA", "BBBB", "CCCC", "DDDD", "EEEE", "FFFF", "GGGG", "HHHH", "JJJJ"];
  const inviteGroups = ["KKKK", "LLLL", "MMMM", "NNNN", "PPPP", "QQQQ", "RRRR", "SSSS", "TTTT"];
  const suffixGroups = ["UUUU", "VVVV", "WWWW", "XXXX", "YYYY", "ZZZZ", "2222", "3333", "4444"];

  try {
    for (let index = 0; index < codeGroups.length; index += 1) {
      const participant = await openClient();
      participants.push(participant);
      assert.deepEqual((await participant.nextMessage()).rooms, ["Global Chat"]);
      participant.socket.send(JSON.stringify({
        type: "join",
        room: "Global Chat",
        code: `OC-${codeGroups[index]}-${inviteGroups[index]}-${suffixGroups[index]}`,
        inviteCode: `OC-${codeGroups[index]}-${inviteGroups[index]}-${suffixGroups[index]}`,
        name: `Room member ${index + 1}`,
        avatar: null
      }));

      const joined = await participant.nextMessage();
      assert.equal(joined.type, "joined");
      if (index === codeGroups.length - 1) assert.equal(joined.peers.length, 9);
    }
  } finally {
    for (const participant of participants) participant.socket.close();
  }
});

test("a connection is closed after exceeding its request rate limit", async () => {
  const client = await openClient();
  await client.nextMessage();

  const closed = once(client.socket, "close");
  for (let index = 0; index < 41; index += 1) {
    client.socket.send(JSON.stringify({ type: "list-rooms" }));
  }
  const [code] = await closed;
  assert.equal(code, 1008);
});

test("the heartbeat removes an unresponsive room connection", async () => {
  const unresponsive = await openClient({ autoPong: false });
  await unresponsive.nextMessage();
  unresponsive.socket.send(JSON.stringify({
    type: "join",
    room: "Global Chat",
    code: "OC-ABCD-EFGH-JKLM",
    inviteCode: "OC-NPQR-STUV-WXYZ",
    name: "Unresponsive peer",
    avatar: null
  }));
  const joined = await unresponsive.nextMessage();
  assert.equal(joined.type, "joined");

  const observer = await openClient();
  await observer.nextMessage();
  observer.socket.send(JSON.stringify({
    type: "join",
    room: "Global Chat",
    code: "OC-2222-3333-4444",
    inviteCode: "OC-5555-6666-7777",
    name: "Observer",
    avatar: null
  }));
  assert.equal((await observer.nextMessage()).type, "joined");

  const deadline = Date.now() + 3000;
  let peerLeft;
  while (Date.now() < deadline) {
    const message = await observer.nextMessage(deadline - Date.now());
    if (message.type === "room-peer-left") {
      peerLeft = message;
      break;
    }
  }
  assert.equal(peerLeft?.peerId, joined.peerId);
});
