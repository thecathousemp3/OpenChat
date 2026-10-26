const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { WebSocket, WebSocketServer } = require("ws");

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const rooms = new Map([["Global Chat", new Set()]]);
const roomNames = new Map([["global chat", "Global Chat"]]);
const staticAssets = new Map([
  ["/assets/favicon.svg", { file: "assets/favicon.svg", contentType: "image/svg+xml" }],
  ["/assets/openchat-preview.svg", { file: "assets/openchat-preview.svg", contentType: "image/svg+xml" }]
]);

function send(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

function sendRoomList(socket) {
  send(socket, { type: "room-list", rooms: [...rooms.keys()] });
}

function broadcastRoomList() {
  for (const client of webSockets.clients) sendRoomList(client);
}

function reportError(socket, message) {
  send(socket, { type: "error", message });
}

function validRoomName(value) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 32 &&
    /^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(value);
}

function validFriendCode(value) {
  return typeof value === "string" &&
    /^OC-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(value);
}

function validAvatar(value) {
  return value === null ||
    (typeof value === "string" &&
      value.length <= 6000 &&
      /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value));
}

function removeFromCurrentRoom(socket) {
  if (!socket.room) return;
  rooms.get(socket.room)?.delete(socket);
  socket.room = null;
}

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
  if (request.method === "GET" && pathname === "/healthz") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("ok");
    return;
  }
  const asset = staticAssets.get(pathname);
  if (request.method === "GET" && asset) {
    fs.readFile(path.join(__dirname, asset.file), (error, content) => {
      if (error) {
        console.error(`Could not read ${asset.file}:`, error);
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        response.end("OpenChat could not load this asset.");
        return;
      }
      response.writeHead(200, {
        "content-type": `${asset.contentType}; charset=utf-8`,
        "cache-control": "public, max-age=3600",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer"
      });
      response.end(content);
    });
    return;
  }
  if (request.method !== "GET" || (pathname !== "/" && pathname !== "/index.html")) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  fs.readFile(path.join(__dirname, "index.html"), (error, html) => {
    if (error) {
      console.error("Could not read index.html:", error);
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("OpenChat could not load its app page.");
      return;
    }
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer"
    });
    response.end(html);
  });
});

const webSockets = new WebSocketServer({
  server,
  path: "/ws",
  maxPayload: 16 * 1024,
  verifyClient: ({ origin, req }, done) => {
    if (!origin) return done(true);
    try {
      done(new URL(origin).host === req.headers.host);
    } catch {
      done(false, 403, "Invalid origin");
    }
  }
});

webSockets.on("connection", (socket) => {
  socket.room = null;
  socket.identity = null;
  socket.windowStartedAt = Date.now();
  socket.messageCount = 0;
  sendRoomList(socket);

  socket.on("message", (data) => {
    const now = Date.now();
    if (now - socket.windowStartedAt >= 10000) {
      socket.windowStartedAt = now;
      socket.messageCount = 0;
    }
    socket.messageCount += 1;
    if (socket.messageCount > 40) {
      reportError(socket, "Too many requests. Pause briefly and try again.");
      return;
    }

    let payload;
    try {
      payload = JSON.parse(data.toString());
    } catch {
      reportError(socket, "That request was not valid JSON.");
      return;
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      reportError(socket, "That request was not valid.");
      return;
    }

    if (payload.type === "list-rooms") {
      sendRoomList(socket);
      return;
    }

    if (payload.type === "create-room") {
      const room = typeof payload.room === "string" ? payload.room.trim() : "";
      if (!validRoomName(room)) {
        reportError(socket, "Room names must be 1–32 characters and use letters, numbers, spaces, hyphens, or underscores.");
        return;
      }
      const key = room.toLowerCase();
      if (roomNames.has(key)) {
        reportError(socket, "A room with that name already exists on this server.");
        return;
      }
      if (rooms.size >= 1000) {
        reportError(socket, "This server has reached its room limit.");
        return;
      }
      rooms.set(room, new Set());
      roomNames.set(key, room);
      broadcastRoomList();
      send(socket, { type: "room-created", room });
      return;
    }

    if (payload.type === "join") {
      const room = payload.room;
      const code = payload.code;
      const inviteCode = payload.inviteCode;
      const name = typeof payload.name === "string"
        ? payload.name.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 32)
        : "";
      if (typeof room !== "string" || !rooms.has(room)) {
        reportError(socket, "That room is not available on this server.");
        return;
      }
      if (
        !validFriendCode(code) ||
        !validFriendCode(inviteCode) ||
        !name ||
        !validAvatar(payload.avatar)
      ) {
        reportError(socket, "Your nickname or friend code is invalid.");
        return;
      }
      removeFromCurrentRoom(socket);
      socket.room = room;
      socket.identity = { code, inviteCode, name, avatar: payload.avatar };
      rooms.get(room).add(socket);
      send(socket, { type: "joined", room });
      return;
    }

    if (payload.type === "profile-update") {
      if (
        !socket.room ||
        !socket.identity ||
        payload.code !== socket.identity.code ||
        !validFriendCode(payload.inviteCode) ||
        typeof payload.name !== "string" ||
        !payload.name.trim() ||
        payload.name.length > 32 ||
        !validAvatar(payload.avatar)
      ) {
        reportError(socket, "Could not update your shared-room profile.");
        return;
      }
      socket.identity = {
        ...socket.identity,
        inviteCode: payload.inviteCode,
        name: payload.name.trim().replace(/[\u0000-\u001f\u007f]/g, ""),
        avatar: payload.avatar
      };
      for (const recipient of rooms.get(socket.room)) {
        send(recipient, {
          type: "profile",
          room: socket.room,
          ...socket.identity
        });
      }
      return;
    }

    if (payload.type === "room-message") {
      if (!socket.room || socket.room !== payload.room || !socket.identity) {
        reportError(socket, "Join that shared room before sending a message.");
        return;
      }
      if (typeof payload.text !== "string" || !payload.text.trim() || payload.text.length > 500) {
        reportError(socket, "Messages must contain 1–500 characters.");
        return;
      }
      const message = {
        type: "room-message",
        room: socket.room,
        code: socket.identity.code,
        name: socket.identity.name,
        avatar: socket.identity.avatar,
        text: payload.text.trim(),
        timestamp: now
      };
      for (const recipient of rooms.get(socket.room)) send(recipient, message);
      return;
    }

    reportError(socket, "That request type is not supported.");
  });

  socket.on("close", () => removeFromCurrentRoom(socket));
  socket.on("error", (error) => console.error("WebSocket connection error:", error.message));
});

server.listen(port, host, () => {
  console.log(`OpenChat server listening on http://localhost:${port}`);
  console.log("For public access, put this server behind HTTPS/WSS and configure a reverse proxy.");
});

server.on("error", (error) => {
  console.error("OpenChat server failed to start:", error.message);
  process.exitCode = 1;
});
