import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const version = process.argv[2];
assert.match(version || "", /^\d+\.\d+\.\d+$/);
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const previous = manifest.version;
assert.match(previous, /^\d+\.\d+\.\d+(?:-alpha\.[1-9]\d*)?$/);
const parts = (v) => v.split(".").map(Number);
const a = parts(version),
  b = parts(previous.split("-")[0]);
assert.ok(
  a.some((n, i) => n > b[i] && a.slice(0, i).every((v, j) => v === b[j])) ||
    previous.startsWith(version + "-alpha."),
  "Version must increase",
);
execFileSync(
  process.execPath,
  [process.env.npm_execpath, "version", version, "--no-git-tag-version"],
  { stdio: "inherit" },
);
manifest.version = version;
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2) + "\n");
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[version] = manifest.minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, 2) + "\n");
writeFileSync(
  "README.md",
  readFileSync("README.md", "utf8").replace(
    /^# [^\r\n]+/,
    "# " + manifest.name + " — " + version,
  ),
);
console.log(
  "Review and commit the changes, push main, then push tag " + version + ".",
);
