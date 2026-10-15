import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

export const advisoryUrl = "https://github.com/advisories/GHSA-86w9-cpqp-85rv";
export const patchSha256 = "bf79ed31495742976d81633581cd09531da2e28b9e9f2f8cbbc9bc98a0900d27";
export const patchPath = "patches/node-forge@1.4.0.patch";
const require = createRequire(import.meta.url);
const patchedSourceSha256 = "5ddabed1d7cbaee0649d468a0bb12de65947cef6704b6a1897944ee2c3f50bde";
export const forgeSourcePath = require.resolve("node-forge/lib/rsa.js");
const before = [
  "          // validate DigestInfo structure and element count",
  "          var capture = {};",
  "          var errors = [];",
  "          if(!asn1.validate(obj, digestInfoValidator, capture, errors) ||",
  "            obj.value.length !== 2) {",
].join("\n");
const after = [
  "          // Validate both ASN.1 sequence lengths. The validator ignores extra",
  "          // nested elements, which can permit forged low-exponent signatures.",
  "          var capture = {};",
  "          var errors = [];",
  "          if(!asn1.validate(obj, digestInfoValidator, capture, errors) ||",
  "            obj.value.length !== 2 ||",
  "            obj.value[0].value.length !==",
  "              (('parameters' in capture) ? 2 : 1)) {",
].join("\n");
export function normalized(value) { return value.replace(/\r\n/g, "\n"); }
export function isPatchedSource(source) {
  source = normalized(source);
  return source.split(after).length === 2 && !source.includes(before) && createHash("sha256").update(source).digest("hex") === patchedSourceSha256;
}
export function applyVerifiedPatch(source) {
  source = normalized(source);
  if (isPatchedSource(source)) return source;
  assert.equal(source.split(before).length, 2, "node-forge patch source has changed");
  const result = source.replace(before, after);
  assert.ok(isPatchedSource(result), "node-forge patch did not apply");
  return result;
}
export function verifyPatchIdentity() {
  const patch = readFileSync(new URL("../" + patchPath, import.meta.url), "utf8");
  assert.equal(createHash("sha256").update(normalized(patch)).digest("hex"), patchSha256, "node-forge patch hash mismatch");
  const pkg = JSON.parse(readFileSync(require.resolve("node-forge/package.json"), "utf8"));
  assert.equal(pkg.version, "1.4.0", "node-forge patch must be re-evaluated for a different version");
}
export function verifyPatchedForge() {
  verifyPatchIdentity();
  assert.ok(isPatchedSource(readFileSync(forgeSourcePath, "utf8")), "installed node-forge patch is missing");
}
export function assertOnlyPatchedBunAdvisory(report) {
  assert.ok(report && typeof report === "object" && !Array.isArray(report));
  assert.deepEqual(Object.keys(report), ["node-forge"], "unhandled dependency advisory");
  assert.ok(Array.isArray(report["node-forge"]));
  assert.equal(report["node-forge"].length, 1, "unhandled node-forge advisory");
  assert.equal(report["node-forge"][0].url, advisoryUrl, "unhandled node-forge advisory");
}
export function assertOnlyPatchedNpmAdvisory(report) {
  const vulnerabilities = report?.vulnerabilities;
  assert.ok(vulnerabilities && typeof vulnerabilities === "object" && !Array.isArray(vulnerabilities));
  const names = Object.keys(vulnerabilities).sort();
  assert.ok(names.includes("node-forge"));
  assert.ok(names.every((name) => ["node-forge", "@devicefarmer/adbkit", "web-ext"].includes(name)), "unhandled dependency advisory");
  const forge = vulnerabilities["node-forge"];
  assert.equal(forge.name, "node-forge");
  assert.equal(forge.isDirect, false);
  assert.equal(forge.via.length, 1);
  assert.equal(forge.via[0]?.name, "node-forge");
  assert.equal(forge.via[0]?.url, advisoryUrl, "unhandled node-forge advisory");
  for (const [name, parent] of [["@devicefarmer/adbkit", "node-forge"], ["web-ext", "@devicefarmer/adbkit"]]) {
    if (vulnerabilities[name]) {
      assert.equal(vulnerabilities[name].name, name);
      assert.deepEqual(vulnerabilities[name].via, [parent], "unhandled parent dependency advisory");
    }
  }
  assert.equal(report.metadata?.vulnerabilities?.total, names.length, "audit totals do not match");
}
