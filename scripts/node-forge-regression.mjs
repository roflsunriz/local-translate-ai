import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import forge from "node-forge";
import jsbn from "node-forge/lib/jsbn.js";
import { advisoryUrl, applyVerifiedPatch, assertOnlyPatchedBunAdvisory, assertOnlyPatchedNpmAdvisory, forgeSourcePath, isPatchedSource, verifyPatchedForge } from "./node-forge-security.mjs";

const { asn1, pki, util } = forge;
const digest = util.hexToBytes("00".repeat(32));
const oid = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, asn1.oidToDer(forge.oids.sha256).getBytes());
const nullParameters = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, "");
const extra = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, "garbage");
const digestValue = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, digest);
const publicKey = pki.setRsaPublicKey(new jsbn.BigInteger("f".repeat(512), 16), new jsbn.BigInteger("1", 10));
function signatureWith(children) {
  const algorithm = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, children);
  const info = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [algorithm, digestValue]);
  const der = asn1.toDer(info).getBytes();
  return "\x00\x01" + "\xff".repeat(256 - der.length - 3) + "\x00" + der;
}
test("installed patch has the reviewed hash, version and structure", () => {
  verifyPatchedForge();
  const source = readFileSync(forgeSourcePath, "utf8");
  assert.equal(applyVerifiedPatch(source), source.replace(/\r\n/g, "\n"));
  assert.equal(isPatchedSource("unpatched"), false);
  assert.throws(() => applyVerifiedPatch("different upstream source"));
});
test("canonical DigestAlgorithm accepts absent or NULL parameters", () => {
  assert.equal(publicKey.verify(digest, signatureWith([oid, nullParameters])), true);
  assert.equal(publicKey.verify(digest, signatureWith([oid])), true);
});
test("extra nested DigestAlgorithm elements are rejected", () => {
  assert.throws(() => publicKey.verify(digest, signatureWith([oid, nullParameters, extra])), /DigestInfo/);
  assert.throws(() => publicKey.verify(digest, signatureWith([oid, extra, extra])), /DigestInfo/);
});
const npmFixture = () => ({
  vulnerabilities: {
    "node-forge": { name: "node-forge", isDirect: false, via: [{ name: "node-forge", url: advisoryUrl }] },
    "@devicefarmer/adbkit": { name: "@devicefarmer/adbkit", via: ["node-forge"] },
    "web-ext": { name: "web-ext", via: ["@devicefarmer/adbkit"] },
  }, metadata: { vulnerabilities: { total: 3 } },
});
test("audit accepts only the patched advisory and its exact parent chain", () => {
  assertOnlyPatchedNpmAdvisory(npmFixture());
  assertOnlyPatchedBunAdvisory({ "node-forge": [{ url: advisoryUrl }] });
});
test("audit still rejects unknown advisories and unrelated parent issues", () => {
  assert.throws(() => assertOnlyPatchedBunAdvisory({ "node-forge": [{ url: "https://example.invalid/new-advisory" }] }));
  assert.throws(() => assertOnlyPatchedBunAdvisory({ "node-forge": [{ url: advisoryUrl }, { url: advisoryUrl }] }));
  assert.throws(() => assertOnlyPatchedBunAdvisory({ other: [{ url: advisoryUrl }] }));
  const report = npmFixture(); report.vulnerabilities["node-forge"].via[0].url = "https://example.invalid/new-advisory";
  assert.throws(() => assertOnlyPatchedNpmAdvisory(report));
  const parent = npmFixture(); parent.vulnerabilities["web-ext"].via.push("other-advisory");
  assert.throws(() => assertOnlyPatchedNpmAdvisory(parent));
  const extraReport = npmFixture(); extraReport.vulnerabilities.other = { name: "other", via: [] };
  assert.throws(() => assertOnlyPatchedNpmAdvisory(extraReport));
});
