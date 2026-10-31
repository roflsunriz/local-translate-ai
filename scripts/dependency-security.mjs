import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const deepmergeAdvisory = "https://github.com/advisories/GHSA-gcqx-w48m-w2h4";
export const minimatchAdvisory = "https://github.com/advisories/GHSA-g3hv-75wg-m249";
const patchPath = "patches/deepmerge@4.3.1.patch";
const expectedHashes = {
  [patchPath]: "c2602592399c77c7dcf4dde55e869c73761a4b022551a235eef4dbb7c888a468",
  "node_modules/deepmerge/index.js": "48fd88a90e90ba6fe45487d529a9ab4fda2c67c6d44e53f85067ace7064f739b",
  "node_modules/deepmerge/dist/cjs.js": "218a3a994f126ee0ae64e9e58d8b315bb01ba1cb096c696118da27212b1c1cbe",
  "node_modules/deepmerge/dist/umd.js": "74f72617d80ed4d1edad4a0b72ad3305da87da855e7fa825ad2a93f8beea8735",
};
const oldMinimatchHash = "746849f267c4868a53729225bd85c7dccd387712136fb305fcc0a3eadd4a3d9d";

function sha256(path) {
  return createHash("sha256").update(readFileSync(path, "utf8").replace(/\r\n/g, "\n")).digest("hex");
}

function packageDirectory(key) {
  const parts = key.split("/");
  const packages = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith("@")) {
      assert.ok(parts[i + 1]);
      packages.push(`${parts[i]}/${parts[++i]}`);
    } else packages.push(parts[i]);
  }
  return join("node_modules", ...packages.flatMap((name, i) => i === 0 ? [name] : ["node_modules", name]));
}

export function verifyDependencies(lock) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.patchedDependencies?.["deepmerge@4.3.1"], patchPath);
  for (const [path, expected] of Object.entries(expectedHashes)) {
    assert.equal(sha256(path), expected, `dependency repair differs: ${path}`);
  }
  assert.equal(JSON.parse(readFileSync("node_modules/deepmerge/package.json", "utf8")).version, "4.3.1");
  assert.equal(JSON.parse(readFileSync("node_modules/node-forge/package.json", "utf8")).version, "1.4.2");
  const deepmerges = Object.entries(lock.packages).filter(([, entry]) =>
    Array.isArray(entry) && typeof entry[0] === "string" && entry[0].startsWith("deepmerge@"));
  assert.equal(deepmerges.length, 1, "review all deepmerge installations");
  assert.equal(deepmerges[0][0], "deepmerge");
  assert.equal(deepmerges[0][1][0], "deepmerge@4.3.1");
  const minimatches = Object.entries(lock.packages).filter(([, entry]) =>
    Array.isArray(entry) && typeof entry[0] === "string" && entry[0].startsWith("minimatch@"));
  assert.ok(minimatches.length > 0, "missing minimatch lock entries");
  const versions = new Set();
  for (const [key, entry] of minimatches) {
    const version = entry[0].slice("minimatch@".length);
    assert.ok(version === "3.1.5" || version === "11.0.1", `unreviewed minimatch: ${version}`);
    const directory = packageDirectory(key);
    assert.equal(JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).version, version);
    if (version === "3.1.5") assert.equal(sha256(join(directory, "minimatch.js")), oldMinimatchHash);
    versions.add(version);
  }
  assert.ok(versions.has("3.1.5") && versions.has("11.0.1"), "review the minimatch graph");
}

export function validateAuditReport(report, exitCode) {
  assert.ok(exitCode === 0 || exitCode === 1, "dependency audit failed");
  assert.ok(report && typeof report === "object" && !Array.isArray(report), "invalid audit report");
  const allowed = { deepmerge: deepmergeAdvisory, minimatch: minimatchAdvisory };
  for (const [name, findings] of Object.entries(report)) {
    assert.ok(allowed[name], `unhandled dependency advisory: ${name}`);
    assert.ok(Array.isArray(findings) && findings.length === 1, `unhandled dependency advisory: ${name}`);
    assert.equal(findings[0]?.url, allowed[name], `unhandled dependency advisory: ${name}`);
  }
  assert.equal(exitCode === 0, Object.keys(report).length === 0, "audit result and exit code disagree");
}
