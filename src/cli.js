#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { apiRequest, pollTask, uploadFile } from "./client.js";
import { parseArgv, boolOption, intOption, stringOption, takeCommand } from "./args.js";
import { CliError, ApiError } from "./errors.js";
import { readJsonValue, readTextValue, downloadToFile } from "./io.js";
import { downloadTaskAssets } from "./downloads.js";
import { printResult } from "./output.js";
import { COSTS } from "./costs.js";

const HELP = `mureka - agent-friendly CLI for the official Mureka API

Usage:
  mureka billing [--format json|pretty]
  mureka upload <file> --purpose reference|vocal|melody|instrumental|voice|audio|remix|soundtrack|lyrics-video
  mureka upload --url <url> --purpose audio
  mureka lyrics generate --prompt <text>
  mureka lyrics extend --lyrics <text|@file|->
  mureka song generate --lyrics <text|@file|-> [--prompt <text>] [--model auto] [--n 2] [--wait] [--download-dir outputs/run]
  mureka song query <task_id> [--wait] [--download-dir outputs/run]
  mureka song extend (--song-id <id>|--upload-audio-id <id>) --lyrics <text|@file|-> --extend-at <ms> [--direction tail|head|append|prepend] [--model mureka-8]
  mureka song region-edit --song-id <id> --start <ms> --end <ms> --lyrics <text|@file|->
  mureka song remix (--song-id <id>|--upload-audio-id <id>) --prompt <text> --lyrics <text|@file|->
  mureka song stem (--url <url>|--audio-file <file>) [--model audio-separation-2] [--download-dir outputs/stems]
  mureka song recognize --upload-audio-id <id>
  mureka track generate --type Vocals|Instrumental|Guitar|... [--song-id <id>|--upload-audio-id <id>] [--prompt <text>] [--lyrics <text|@file|->] [--type-field generate_type|type|both] [--wait]
  mureka instrumental generate [--prompt <text>|--instrumental-id <id>] [--model auto] [--wait]
  mureka instrumental query <task_id> [--wait] [--download-dir outputs/run]
  mureka api METHOD /v1/path [--data <json|@file|->]
  mureka download <url> --output <file>
  mureka costs [--format json|pretty]
  mureka docs [--format plain|json]

Global options:
  --format json|pretty|plain
  --api-base-url <url>

Authentication:
  Set MUREKA_API_KEY in the environment. The CLI does not store secrets.
`;

async function main(argv = process.argv.slice(2)) {
  const { positionals, options } = parseArgv(argv);
  const { command, rest } = takeCommand(positionals);
  if (command === "help" || command === "--help" || options.help) {
    process.stdout.write(HELP);
    return;
  }

  const context = {
    format: String(options.format || "json"),
    apiBaseUrl: options.apiBaseUrl
  };

  if (command === "billing") return output(await apiRequest("/v1/account/billing", context), context);
  if (command === "costs") return output(COSTS, context);
  if (command === "docs") return outputDocs(context);
  if (command === "upload") return output(await commandUpload(rest, options, context), context);
  if (command === "lyrics") return output(await commandLyrics(rest, options, context), context);
  if (command === "song") return output(await commandSong(rest, options, context), context);
  if (command === "track") return output(await commandTrack(rest, options, context), context);
  if (command === "instrumental") return output(await commandInstrumental(rest, options, context), context);
  if (command === "api") return output(await commandApi(rest, options, context), context);
  if (command === "download") return output(await commandDownload(rest, options), context);

  throw new CliError(`Unknown command: ${command}. Run mureka --help.`);
}

async function commandUpload(rest, options, context) {
  const filePath = rest[0];
  return uploadFile({
    filePath,
    url: stringOption(options, "url"),
    purpose: stringOption(options, "purpose", { required: true }),
    apiBaseUrl: context.apiBaseUrl
  });
}

async function commandLyrics(rest, options, context) {
  const subcommand = rest[0];
  if (subcommand === "generate") {
    return apiRequest("/v1/lyrics/generate", {
      ...context,
      method: "POST",
      body: { prompt: stringOption(options, "prompt", { required: true }) }
    });
  }
  if (subcommand === "extend") {
    return apiRequest("/v1/lyrics/extend", {
      ...context,
      method: "POST",
      body: { lyrics: await readTextValue(options.lyrics, "lyrics") }
    });
  }
  throw new CliError("Usage: mureka lyrics generate|extend ...");
}

async function commandSong(rest, options, context) {
  const subcommand = rest[0];
  if (subcommand === "generate") {
    const body = compact({
      lyrics: await readTextValue(options.lyrics, "lyrics"),
      model: options.model || "auto",
      prompt: options.prompt,
      reference_id: options.referenceId,
      vocal_id: options.vocalId,
      melody_id: options.melodyId,
      n: intOption(options.n, "n"),
      stream: options.stream === undefined ? undefined : boolOption(options.stream)
    });
    return maybeWait(await postTask("/v1/song/generate", body, context), "song", options, context);
  }
  if (subcommand === "query") {
    const taskId = rest[1];
    if (!taskId) throw new CliError("Usage: mureka song query <task_id>");
    return boolOption(options.wait)
      ? waitAndMaybeDownload("song", taskId, options, context)
      : apiRequest(`/v1/song/query/${taskId}`, context);
  }
  if (subcommand === "extend") {
    const body = compact({
      song_id: options.songId,
      upload_audio_id: options.uploadAudioId,
      lyrics: await readTextValue(options.lyrics, "lyrics"),
      extend_at: intOption(options.extendAt, "extend-at"),
      extend_type: mapExtendType(options.direction || options.extendType),
      model: stringOption(options, "model")
    });
    if (!body.song_id && !body.upload_audio_id) throw new CliError("Song extension needs --song-id or --upload-audio-id.");
    return maybeWait(await postTask("/v1/song/extend", body, context), "song", options, context);
  }
  if (subcommand === "region-edit") {
    const body = compact({
      song_id: stringOption(options, "songId", { required: true }),
      edit_start: intOption(options.start ?? options.editStart, "start"),
      edit_end: intOption(options.end ?? options.editEnd, "end"),
      lyrics: await readTextValue(options.lyrics, "lyrics"),
      prompt: options.prompt
    });
    return maybeWait(await postTask("/v1/song/region-edit", body, context), "song", options, context);
  }
  if (subcommand === "remix") {
    const body = compact({
      song_id: options.songId,
      upload_audio_id: options.uploadAudioId,
      prompt: stringOption(options, "prompt", { required: true }),
      lyrics: await readTextValue(options.lyrics, "lyrics"),
      n: intOption(options.n, "n")
    });
    return maybeWait(await postTask("/v1/song/remix", body, context), "song", options, context);
  }
  if (subcommand === "stem") {
    const body = compact({
      url: options.audioFile ? await audioFileToDataUrl(String(options.audioFile)) : stringOption(options, "url", { required: true }),
      model: stringOption(options, "model")
    });
    const result = await apiRequest("/v1/song/stem", { ...context, method: "POST", body });
    if (options.downloadDir && result.zip_url) {
      result.downloads = [{ outputPath: await downloadToFile(result.zip_url, join(String(options.downloadDir), "stems.zip")) }];
    }
    return result;
  }
  if (subcommand === "recognize") {
    return apiRequest("/v1/song/recognize", {
      ...context,
      method: "POST",
      body: { upload_audio_id: stringOption(options, "uploadAudioId", { required: true }) }
    });
  }
  if (subcommand === "describe") {
    return apiRequest("/v1/song/describe", {
      ...context,
      method: "POST",
      body: compact({ upload_audio_id: options.uploadAudioId, song_id: options.songId, url: options.url })
    });
  }
  throw new CliError("Usage: mureka song generate|query|extend|region-edit|remix|stem|recognize|describe ...");
}

async function commandTrack(rest, options, context) {
  const subcommand = rest[0];
  if (subcommand !== "generate") throw new CliError("Usage: mureka track generate ...");
  const trackType = options.generateType || options.type;
  const body = compact({
    song_id: options.songId,
    upload_audio_id: options.uploadAudioId,
    ...trackTypeFields(trackType, options.typeField || options.trackTypeField),
    generate_start: intOption(options.start ?? options.generateStart, "start"),
    generate_end: intOption(options.end ?? options.generateEnd, "end"),
    lyrics: await readTextValue(options.lyrics, "lyrics"),
    prompt: options.prompt,
    vocal_gender: options.vocalGender
  });
  if (!body.generate_type && !body.type) throw new CliError("Missing --type for track generation.");
  return maybeWait(await postTask("/v1/track/generate", body, context), "song", options, context);
}

async function commandInstrumental(rest, options, context) {
  const subcommand = rest[0];
  if (subcommand === "generate") {
    const body = compact({
      model: options.model || "auto",
      prompt: options.prompt,
      instrumental_id: options.instrumentalId,
      n: intOption(options.n, "n"),
      stream: options.stream === undefined ? undefined : boolOption(options.stream)
    });
    return maybeWait(await postTask("/v1/instrumental/generate", body, context), "instrumental", options, context);
  }
  if (subcommand === "query") {
    const taskId = rest[1];
    if (!taskId) throw new CliError("Usage: mureka instrumental query <task_id>");
    return boolOption(options.wait)
      ? waitAndMaybeDownload("instrumental", taskId, options, context)
      : apiRequest(`/v1/instrumental/query/${taskId}`, context);
  }
  throw new CliError("Usage: mureka instrumental generate|query ...");
}

async function commandApi(rest, options, context) {
  const method = rest[0]?.toUpperCase();
  const path = rest[1];
  if (!method || !path) throw new CliError("Usage: mureka api METHOD /v1/path [--data json|@file|-]");
  return apiRequest(path, {
    ...context,
    method,
    body: await readJsonValue(options.data, "request body")
  });
}

async function commandDownload(rest, options) {
  const url = rest[0];
  const outputPath = stringOption(options, "output", { required: true });
  if (!url) throw new CliError("Usage: mureka download <url> --output <file>");
  return { outputPath: await downloadToFile(url, outputPath) };
}

async function postTask(path, body, context) {
  return apiRequest(path, { ...context, method: "POST", body });
}

async function maybeWait(task, kind, options, context) {
  if (!boolOption(options.wait)) return task;
  return waitAndMaybeDownload(kind, task.id, options, context);
}

async function waitAndMaybeDownload(kind, taskId, options, context) {
  const task = await pollTask({
    kind,
    taskId,
    intervalSeconds: intOption(options.interval, "interval") || 5,
    timeoutSeconds: intOption(options.timeout, "timeout") || 900,
    apiBaseUrl: context.apiBaseUrl
  });
  if (options.downloadDir && task.status === "succeeded") {
    task.downloads = await downloadTaskAssets(task, String(options.downloadDir));
  }
  return task;
}

function mapExtendType(value) {
  if (value === undefined) return undefined;
  const normalized = String(value).toLowerCase();
  if (["head", "prepend", "backward", "beginning", "start", "0"].includes(normalized)) return "head";
  if (["tail", "append", "forward", "end", "1"].includes(normalized)) return "tail";
  throw new CliError("--direction/--extend-type must be head/tail, prepend/append, or 0/1.");
}

function trackTypeFields(trackType, field = "generate_type") {
  if (!trackType) return {};
  if (field === "generate_type") return { generate_type: trackType };
  if (field === "type") return { type: trackType };
  if (field === "both") return { generate_type: trackType, type: trackType };
  throw new CliError("--type-field must be generate_type, type, or both.");
}

async function audioFileToDataUrl(path) {
  const data = await readFile(path);
  const ext = basename(path).split(".").pop()?.toLowerCase() || "mp3";
  const mime = ext === "wav" ? "audio/wav" : ext === "m4a" ? "audio/mp4" : "audio/mpeg";
  return `data:${mime};base64,${data.toString("base64")}`;
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ""));
}

function output(value, context) {
  printResult(value, { format: context.format });
}

function outputDocs(context) {
  const docs = {
    localDocs: new URL("../vendor/mureka-docs/README.md", import.meta.url).pathname,
    openapi: new URL("../vendor/mureka-docs/openapi.json", import.meta.url).pathname,
    officialDocs: "https://platform.mureka.ai/docs/"
  };
  if (context.format === "plain") {
    process.stdout.write(`${docs.localDocs}\n`);
    return;
  }
  output(docs, context);
}

main().catch((error) => {
  if (error instanceof ApiError) {
    const payload = { error: error.message, status: error.status, trace_id: error.traceId, body: error.body };
    process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exit(1);
  }
  if (error instanceof CliError) {
    process.stderr.write(`${error.message}\n`);
    process.exit(error.code || 1);
  }
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
