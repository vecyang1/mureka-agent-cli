import { openAsBlob } from "node:fs";
import { basename, extname } from "node:path";
import { ApiError, CliError } from "./errors.js";

export const DEFAULT_API_BASE_URL = "https://api.mureka.ai";

export function getApiBaseUrl(options = {}) {
  return String(options.apiBaseUrl || process.env.MUREKA_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

export function getApiKey(options = {}) {
  const apiKey = options.apiKey || process.env.MUREKA_API_KEY;
  if (!apiKey) {
    throw new CliError("Missing Mureka API key. Set MUREKA_API_KEY in the environment.");
  }
  return apiKey;
}

export async function apiRequest(path, { method = "GET", body, query, apiKey, apiBaseUrl, headers = {} } = {}) {
  const baseUrl = getApiBaseUrl({ apiBaseUrl });
  const url = new URL(path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const requestHeaders = {
    Authorization: `Bearer ${getApiKey({ apiKey })}`,
    ...headers
  };
  const init = { method, headers: requestHeaders };
  if (body !== undefined) {
    if (body instanceof FormData) {
      init.body = body;
    } else {
      requestHeaders["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, init);
  const contentType = response.headers.get("content-type") || "";
  const parsed = await parseResponseBody(response, contentType);
  if (!response.ok) {
    const traceId = parsed && typeof parsed === "object" ? parsed.trace_id : undefined;
    const message = parsed?.error?.message || parsed?.message || response.statusText || "Mureka API request failed";
    throw new ApiError(message, { status: response.status, body: parsed, traceId });
  }
  return parsed;
}

export async function uploadFile({ filePath, url, purpose, apiKey, apiBaseUrl }) {
  if (!purpose) throw new CliError("Missing --purpose for upload.");
  if (!filePath && !url) throw new CliError("Upload needs a file path or --url.");

  const form = new FormData();
  form.set("purpose", purpose);
  if (url) {
    form.set("url", url);
  } else {
    const blob = await openAsBlob(filePath, { type: mimeForPath(filePath) });
    form.set("file", blob, basename(filePath));
  }

  return apiRequest("/v1/files/upload", { method: "POST", body: form, apiKey, apiBaseUrl });
}

export async function pollTask({ kind = "song", taskId, intervalSeconds = 5, timeoutSeconds = 900, apiKey, apiBaseUrl }) {
  const started = Date.now();
  const path = kind === "instrumental" ? `/v1/instrumental/query/${taskId}` : `/v1/song/query/${taskId}`;
  while (true) {
    const task = await apiRequest(path, { apiKey, apiBaseUrl });
    if (isTerminalStatus(task.status)) return task;
    if ((Date.now() - started) / 1000 > timeoutSeconds) {
      throw new CliError(`Timed out waiting for task ${taskId}; last status was ${task.status || "unknown"}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
  }
}

export function isTerminalStatus(status) {
  return ["succeeded", "failed", "timeouted", "cancelled"].includes(String(status || "").toLowerCase());
}

async function parseResponseBody(response, contentType) {
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function mimeForPath(path) {
  const ext = extname(path).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".flac") return "audio/flac";
  if (ext === ".mid" || ext === ".midi") return "audio/midi";
  if (ext === ".mp4") return "video/mp4";
  return "application/octet-stream";
}
