import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { advisoryUrl, assertOnlyPatchedBunAdvisory, patchPath, verifyPatchedForge } from "./node-forge-security.mjs";

const audit = spawnSync(process.execPath, ["audit", "--json"], { encoding: "utf8" });
if (audit.error) throw audit.error;
assert.ok(audit.status === 0 || audit.status === 1, "dependency audit failed");
const report = JSON.parse(audit.stdout);
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(pkg.patchedDependencies?.["node-forge@1.4.0"], patchPath);
verifyPatchedForge();
const hasFindings = Object.keys(report).length > 0;
if (hasFindings) {
  process.stderr.write(audit.stdout);
  assertOnlyPatchedBunAdvisory(report);
} else assert.equal(audit.status, 0);
const regression = spawnSync("node", ["--test", "scripts/node-forge-regression.mjs"], { encoding: "utf8" });
if (regression.error) throw regression.error;
process.stdout.write(regression.stdout);
process.stderr.write(regression.stderr);
assert.equal(regression.status, 0, "node-forge regression failed");
console.log(hasFindings ? `${advisoryUrl}: reviewed patch identity and regression verified; raw advisory remains visible.` : "No known dependency advisories; patch regression verified.");
