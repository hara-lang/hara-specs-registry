import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const reviewPath =
  "01-lang/005-foundation-annex/draft/conformance/reviews/index.edn";
const familyIndexPath =
  "01-lang/005-foundation-annex/draft/conformance/libraries/index.edn";

function parseEdnStructure(source) {
  let index = 0;

  function skip() {
    while (index < source.length) {
      const char = source[index];
      if (char === "," || /\s/.test(char)) {
        index += 1;
        continue;
      }
      if (char === ";") {
        while (index < source.length && source[index] !== "\n") index += 1;
        continue;
      }
      break;
    }
  }

  function parseString() {
    index += 1;
    let escaped = false;
    while (index < source.length) {
      const char = source[index++];
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        return;
      }
    }
    throw new Error("unterminated EDN string");
  }

  function parseCollection(close, map = false) {
    let count = 0;
    while (true) {
      skip();
      if (source[index] === close) {
        index += 1;
        if (map && count % 2 !== 0) throw new Error("EDN map has odd forms");
        return;
      }
      if (index >= source.length) {
        throw new Error(`unterminated EDN collection, expected ${close}`);
      }
      parseValue();
      count += 1;
    }
  }

  function parseAtom() {
    const start = index;
    while (
      index < source.length &&
      !/[\s,\[\]{}()";]/.test(source[index])
    ) {
      index += 1;
    }
    if (start === index) throw new Error(`unexpected EDN token at ${index}`);
  }

  function parseValue() {
    skip();
    const char = source[index];
    if (char === '"') return parseString();
    if (char === "{") {
      index += 1;
      return parseCollection("}", true);
    }
    if (char === "[") {
      index += 1;
      return parseCollection("]");
    }
    if (char === "(") {
      index += 1;
      return parseCollection(")");
    }
    if (char === "#" && source[index + 1] === "{") {
      index += 2;
      return parseCollection("}");
    }
    if (char === undefined || "}]".includes(char) || char === ")") {
      throw new Error(`unexpected EDN delimiter at ${index}`);
    }
    return parseAtom();
  }

  const forms = [];
  while (true) {
    skip();
    if (index >= source.length) break;
    parseValue();
    forms.push(true);
  }
  return forms.length;
}

function count(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

test("historical Foundation review is represented as one current-format EDN import", async () => {
  const source = await fs.readFile(reviewPath, "utf8");

  assert.equal(parseEdnStructure(source), 1);
  assert.match(
    source,
    /:document\/type :foundation-conformance-review-import/
  );
  assert.match(source, /:conformance\/authority :hara-specs-registry/);
  assert.match(source, /:promotion\/status :pending-current-family-review/);
  assert.match(
    source,
    /:promotion\/status :pending-current-source-reconciliation/
  );

  for (const [key, value] of [
    [":only-clojure", 536],
    [":only-hara", 87],
    [":same-exact", 144],
    [":same-renamed", 1],
    [":same-changed", 12],
    [":route-occurrences", 649],
    [":unique-external-names", 83],
    [":reviewed", 649],
    [":pending", 0]
  ]) {
    assert.match(source, new RegExp(`${key} ${value}(?:\\s|\\})`));
  }

  assert.equal(count(source, /:clojure\/symbol "/g), 13);
  assert.equal(count(source, /:classification :adapted/g), 12);
  assert.equal(count(source, /:source "[^"]+" :target "[^"]+"/g), 18);

  for (const identity of [
    "2167569e9577c0b1f6e00ba7af1e5f186dd4f582",
    "fc75d466eaab4da9becc89c188922b83b261cbaa",
    "a08d43dd25e14dc1b1689495637ddc3900686e46",
    "546371c47fef69be2d5d347c67a2b02f1b0c8e5e",
    "3be7e220421ee7293c742751ccedfffccb2f33cb",
    "baa75aabd6a879753d7d5cb07271b1448271e7cb",
    "26d494f60c4970df56eba8ac40f92affeee4e159",
    "f55f39855d5e9ea1b22f1d116df684c584323f80",
    "3beb10f32e7d57139910ee9c9de1370e966ca935",
    "fd382c506348c1e96412e7398ac4cba7029b7885"
  ]) {
    assert.match(source, new RegExp(identity));
  }

  assert.doesNotMatch(source, /:conformance\/status :conformant/);
  assert.doesNotMatch(source, /:runtime\/status/);
});

test("the family index names the reusable review import", async () => {
  const source = await fs.readFile(familyIndexPath, "utf8");

  assert.equal(parseEdnStructure(source), 1);
  assert.match(
    source,
    /:conformance\/review-import "\.\.\/reviews\/index\.edn"/
  );
});
