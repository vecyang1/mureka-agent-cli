import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { CliError } from "./errors.js";

export async function readTextValue(value, label = "value") {
  if (value === undefined || value === true) return undefined;
  const raw = String(value);
  if (raw === "-") {
    return new Promise((resolveText, reject) => {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        data += chunk;
      });
      process.stdin.on("end", () => resolveText(data));
      process.stdin.on("error", reject);
    });
  }
  if (raw.startsWith("@")) {
    const path = raw.slice(1);
    if (!path) throw new CliError(`Missing file path for ${label}.`);
    return readFile(path, "utf8");
  }
  return raw;
}

export async function readJsonValue(value, label = "json") {
  const text = await readTextValue(value, label);
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new CliError(`Could not parse ${label} as JSON: ${error.message}`);
  }
}

export async function writeJsonFile(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function downloadToFile(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new CliError(`Download failed with HTTP ${response.status}: ${url}`);
  }
  const absolutePath = resolve(outputPath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), createWriteStream(absolutePath));
  return absolutePath;
}

export function sanitizeFilename(value) {
  return String(value || "download")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "download";
}
