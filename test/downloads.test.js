import test from "node:test";
import assert from "node:assert/strict";
import { collectUrls } from "../src/downloads.js";

test("collectUrls finds generated audio URLs", () => {
  const urls = collectUrls({
    choices: [
      { url: "https://cdn.mureka.ai/a.mp3", flac_url: "https://cdn.mureka.ai/a.flac", stream_url: "https://cdn.mureka.ai/stream" }
    ]
  });
  assert.deepEqual(urls.map((item) => item.key), ["url", "flac_url", "stream_url"]);
});
