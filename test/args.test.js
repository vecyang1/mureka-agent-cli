import test from "node:test";
import assert from "node:assert/strict";
import { parseArgv, boolOption, intOption } from "../src/args.js";

test("parseArgv handles options and positionals", () => {
  const parsed = parseArgv(["song", "generate", "--lyrics", "@lyrics.txt", "--wait", "--n=2"]);
  assert.deepEqual(parsed.positionals, ["song", "generate"]);
  assert.equal(parsed.options.lyrics, "@lyrics.txt");
  assert.equal(parsed.options.wait, true);
  assert.equal(parsed.options.n, "2");
});

test("boolOption parses common boolean spellings", () => {
  assert.equal(boolOption(true), true);
  assert.equal(boolOption("false"), false);
  assert.equal(boolOption("yes"), true);
});

test("intOption rejects non-integers", () => {
  assert.equal(intOption("12", "value"), 12);
  assert.throws(() => intOption("12.5", "value"));
});
