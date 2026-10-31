import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import merge from "deepmerge";
import mergeUmd from "deepmerge/dist/umd.js";
import { deepmergeAdvisory, minimatchAdvisory, validateAuditReport } from "./dependency-security.mjs";

const poisoned = () => JSON.parse('{"__proto__":{"isAdmin":true},"safe":1}');
for (const [name, deepmerge] of [["CommonJS", merge], ["UMD", mergeUmd]]) {
  test(`deepmerge ${name} rejects prototype poisoning and preserves normal merges`, () => {
    const results = [
      deepmerge(Object.create(null), poisoned()),
      deepmerge(poisoned(), {}),
      deepmerge({ session: null }, { session: poisoned() }).session,
      deepmerge({}, { items: [poisoned()] }).items[0],
    ];
    for (const result of results) {
      assert.equal(Object.getPrototypeOf(result), Object.prototype);
      assert.equal(result.isAdmin, undefined);
      assert.equal(Object.hasOwn(result, "__proto__"), false);
      assert.equal(result.safe, 1);
    }
    assert.deepEqual(deepmerge({ nested: { a: 1 }, items: [1] }, { nested: { b: 2 }, items: [2] }),
      { nested: { a: 1, b: 2 }, items: [1, 2] });
    assert.equal({}.isAdmin, undefined);
  });
}

test("minimatch 3 does not amplify the reported globstar-parent pattern", () => {
  const require = createRequire(import.meta.url);
  const multimatchRequire = createRequire(require.resolve("multimatch"));
  const { Minimatch } = multimatchRequire("minimatch");
  for (const count of [1, 2, 4, 8, 16, 32, 64, 128]) {
    const compiled = new Minimatch("**/../a/b/".repeat(count) + "file", { optimizationLevel: 2 });
    assert.equal(compiled.globSet.length, 1);
    assert.equal(compiled.globParts.length, 1);
    assert.equal(compiled.globParts[0].length, count * 4 + 1);
    assert.equal(compiled.set.length, 1);
  }
});

test("audit rejects unknown or additional advisories and inconsistent failures", () => {
  assert.doesNotThrow(() => validateAuditReport({}, 0));
  assert.doesNotThrow(() => validateAuditReport({ deepmerge: [{ url: deepmergeAdvisory }], minimatch: [{ url: minimatchAdvisory }] }, 1));
  assert.throws(() => validateAuditReport({ other: [{ url: deepmergeAdvisory }] }, 1));
  assert.throws(() => validateAuditReport({ deepmerge: [{ url: "https://example.invalid/new" }] }, 1));
  assert.throws(() => validateAuditReport({ minimatch: [{ url: minimatchAdvisory }, { url: "https://example.invalid/new" }] }, 1));
  assert.throws(() => validateAuditReport({}, 1));
  assert.throws(() => validateAuditReport({ deepmerge: [{ url: deepmergeAdvisory }] }, 0));
  assert.throws(() => validateAuditReport({}, 2));
});
