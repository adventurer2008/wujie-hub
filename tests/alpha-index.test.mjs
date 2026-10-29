import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
test("directory index includes every verified Alpha, preserves stable and rejects tampering before writing", async () => {
  await fs.mkdir("test-output", { recursive: true });
  const root = await fs.mkdtemp("test-output/alpha-index-");
  const stable = {
    version: "1.1.1",
    channel: "Stable",
    baseUrl: "https://github.com/example/stable/",
  };
  await fs.mkdir(root + "/alpha");
  await fs.writeFile(
    root + "/releases.json",
    JSON.stringify({ stable: "1.1.1", releases: [stable] }),
  );
  for (const version of ["1.1.2-alpha.2", "1.1.2-alpha.10"]) {
    const dir = root + "/alpha/" + version;
    await fs.mkdir(dir);
    const sha256 = {};
    for (const [name, text] of Object.entries({
      "manifest.json": JSON.stringify({ id: "wujie-sync", version }),
      "main.js": "fixture",
      "styles.css": "body{}",
    })) {
      await fs.writeFile(dir + "/" + name, text);
      sha256[name] = createHash("sha256").update(text).digest("hex");
    }
    await fs.writeFile(
      dir + "/release.json",
      JSON.stringify({
        id: "wujie-sync",
        version,
        channel: "Alpha",
        baseUrl: "https://sync.wujiesync.cc/download/alpha/" + version + "/",
        sha256,
      }),
    );
  }
  execFileSync("python", [
    "scripts/update-alpha-index.py",
    "--root",
    root,
    "--write",
    "--backup-dir",
    root + "/backups",
  ]);
  const index = JSON.parse(
    await fs.readFile(root + "/alpha/releases.json", "utf8"),
  );
  assert.deepEqual(
    index.releases.map((r) => r.version),
    ["1.1.2-alpha.10", "1.1.2-alpha.2"],
  );
  assert.ok(
    index.releases.every((r) =>
      r.baseUrl.startsWith("https://user.wujiesync.cc/download/alpha/"),
    ),
  );
  const original = JSON.parse(
    await fs.readFile(root + "/alpha/1.1.2-alpha.2/release.json", "utf8"),
  );
  assert.ok(original.baseUrl.startsWith("https://sync.wujiesync.cc/"));
  const combined = JSON.parse(
    await fs.readFile(root + "/releases.json", "utf8"),
  );
  assert.deepEqual(
    combined.releases.find((r) => r.channel === "Stable"),
    stable,
  );
  const before = await fs.readFile(root + "/alpha/releases.json", "utf8");
  await fs.writeFile(root + "/alpha/1.1.2-alpha.2/main.js", "tampered");
  const result = spawnSync("python", [
    "scripts/update-alpha-index.py",
    "--root",
    root,
    "--write",
    "--backup-dir",
    root + "/backups",
  ]);
  assert.notEqual(result.status, 0);
  assert.equal(
    await fs.readFile(root + "/alpha/releases.json", "utf8"),
    before,
  );
});
