const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

test("inline app script parses and all static DOM references exist", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, "index.html should contain the app script");
  assert.doesNotThrow(() => new vm.Script(match[1]));
  assert.match(html, /About WebRTC and privacy/);
  assert.match(html, /DTLS/);
  assert.match(html, /not cryptographically verified/);
  assert.match(html, /\.window-dots\s*\{\s*display:\s*flex;\s*flex:\s*0 0 auto;/);
  assert.match(html, /@media \(max-width:\s*360px\)[\s\S]*?\.titlebar-brand > span:last-child\s*\{\s*display:\s*none;/);

  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((entry) => entry[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  assert.deepEqual(duplicates, [], "HTML IDs should be unique");

  const references = [...match[1].matchAll(/getElementById\(["']([^"']+)["']\)/g)].map((entry) => entry[1]);
  const missing = [...new Set(references)].filter((id) => !ids.includes(id));
  assert.deepEqual(missing, [], "every getElementById reference should exist in the page");
});
