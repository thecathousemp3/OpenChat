const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

test("inline app script parses and all static DOM references exist", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const landingHtml = fs.readFileSync(path.join(__dirname, "..", "landing.html"), "utf8");
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, "index.html should contain the app script");
  assert.doesNotThrow(() => new vm.Script(match[1]));
  assert.match(html, /About WebRTC and privacy/);
  assert.match(html, /DTLS/);
  assert.match(html, /not cryptographically verified/);
  assert.match(html, /command === "help"/);
  assert.match(html, /command === "who"/);
  assert.match(html, /command === "clear"/);
  assert.match(html, /command === "me"/);
  assert.match(html, /font-family: "Lucida Console", Consolas, "Courier New", monospace/);
  assert.match(html, /\.app-shell\s*\{[^}]*border-radius:\s*0;/);
  assert.match(html, /background-image:\s*radial-gradient\(#ffffff12 1px, transparent 1px\)/);
  assert.match(html, /@media \(max-width:\s*390px\)[\s\S]*?\.profile-actions\s*\{\s*grid-template-columns:\s*1fr;/);
  assert.doesNotMatch(html, /[^\x00-\x7F]/, "the app UI should use plain text, not decorative Unicode symbols");
  assert.doesNotMatch(landingHtml, /[^\x00-\x7F]/, "the landing page should use plain text, not decorative Unicode symbols");
  assert.match(landingHtml, /Browsers carry the conversation/);
  assert.match(landingHtml, /Bring up a room in three steps/);
  assert.match(landingHtml, /assets\/message-path\.svg/);
  assert.match(landingHtml, /assets\/room-mesh\.svg/);
  assert.equal([...match[1].matchAll(/new RTCPeerConnection\(\{ iceServers \}\)/g)].length, 2);
  assert.match(match[1], /createOffer\(\{ iceRestart: true \}\)/);
  assert.match(match[1], /fetch\("\/config\.json"/);
  assert.match(match[1], /type: "message-ack"/);
  assert.match(match[1], /function retryMessage/);
  assert.match(match[1], /function renderMessageHistory/);
  assert.match(html, /id="messageSearch"/);
  assert.match(html, /id="replyPreview"/);
  assert.match(html, /\.window-dots\s*\{\s*display:\s*flex;\s*flex:\s*0 0 auto;/);
  assert.match(html, /@media \(max-width:\s*360px\)[\s\S]*?\.titlebar-brand > span:last-child\s*\{\s*display:\s*none;/);

  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((entry) => entry[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  assert.deepEqual(duplicates, [], "HTML IDs should be unique");
  const landingIds = [...landingHtml.matchAll(/\bid="([^"]+)"/g)].map((entry) => entry[1]);
  const duplicateLandingIds = [...new Set(landingIds.filter((id, index) => landingIds.indexOf(id) !== index))];
  assert.deepEqual(duplicateLandingIds, [], "landing page IDs should be unique");
  for (const image of landingHtml.matchAll(/<img\b[^>]*>/g)) {
    assert.match(image[0], /\balt=/, "landing page images should have alt text");
  }

  const references = [...match[1].matchAll(/getElementById\(["']([^"']+)["']\)/g)].map((entry) => entry[1]);
  const missing = [...new Set(references)].filter((id) => !ids.includes(id));
  assert.deepEqual(missing, [], "every getElementById reference should exist in the page");
});
