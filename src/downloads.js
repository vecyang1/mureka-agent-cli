import { join } from "node:path";
import { downloadToFile, sanitizeFilename } from "./io.js";

export function collectUrls(value, path = []) {
  const urls = [];
  if (!value || typeof value !== "object") return urls;
  if (Array.isArray(value)) {
    value.forEach((item, index) => urls.push(...collectUrls(item, [...path, String(index)])));
    return urls;
  }
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && /^https?:\/\//.test(item) && key.endsWith("url")) {
      urls.push({ key, url: item, path: [...path, key] });
    } else if (item && typeof item === "object") {
      urls.push(...collectUrls(item, [...path, key]));
    }
  }
  return urls;
}

export async function downloadTaskAssets(task, outputDir) {
  const urls = collectUrls(task).filter((item) => !item.key.includes("stream"));
  const downloads = [];
  for (const item of urls) {
    const choiceIndex = item.path.includes("choices") ? item.path[item.path.indexOf("choices") + 1] : "0";
    const ext = extensionFromUrl(item.url) || extensionFromKey(item.key);
    const filename = `${sanitizeFilename(`choice-${choiceIndex}-${item.key}`)}${ext}`;
    const outputPath = await downloadToFile(item.url, join(outputDir, filename));
    downloads.push({ ...item, outputPath });
  }
  return downloads;
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/(\.[a-zA-Z0-9]+)$/);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

function extensionFromKey(key) {
  if (key.includes("zip")) return ".zip";
  if (key.includes("flac")) return ".flac";
  if (key.includes("wav")) return ".wav";
  if (key.includes("mp4")) return ".mp4";
  return ".mp3";
}
