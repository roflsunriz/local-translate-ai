import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { validateAuditReport, verifyDependencies } from "./dependency-security.mjs";

verifyDependencies(Bun.JSON5.parse(readFileSync("bun.lock", "utf8")));
const regression = spawnSync("node", ["--test", "scripts/node-forge-regression.mjs", "scripts/dependency-regression.mjs"], { encoding: "utf8" });
if (regression.error) throw regression.error;
process.stdout.write(regression.stdout);
process.stderr.write(regression.stderr);
assert.equal(regression.status, 0, "dependency regression failed");

const audit = spawnSync(process.execPath, ["audit", "--json"], { encoding: "utf8" });
if (audit.error) throw audit.error;
const report = JSON.parse(audit.stdout);
validateAuditReport(report, audit.status);
if (Object.keys(report).length) {
  process.stdout.write(audit.stdout);
  console.log("deepmerge patch and attack regression, and minimatch 3 source and bounded expansion were verified; other advisories fail.");
} else console.log("No known dependency advisories.");
