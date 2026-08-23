import { CliError } from "./errors.js";

export function parseArgv(argv) {
  const positionals = [];
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const raw = token.slice(2);
    if (!raw) throw new CliError("Empty option is not valid.");
    if (raw.startsWith("no-")) {
      options[toCamel(raw.slice(3))] = false;
      continue;
    }

    const equalsIndex = raw.indexOf("=");
    if (equalsIndex >= 0) {
      const key = toCamel(raw.slice(0, equalsIndex));
      const value = raw.slice(equalsIndex + 1);
      assignOption(options, key, value);
      continue;
    }

    const key = toCamel(raw);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      assignOption(options, key, true);
    } else {
      assignOption(options, key, next);
      i += 1;
    }
  }

  return { positionals, options };
}

export function boolOption(value) {
  if (value === undefined) return false;
  if (value === true || value === false) return value;
  if (["1", "true", "yes", "on"].includes(String(value).toLowerCase())) return true;
  if (["0", "false", "no", "off"].includes(String(value).toLowerCase())) return false;
  throw new CliError(`Expected boolean option, got ${value}.`);
}

export function numberOption(value, name) {
  if (value === undefined || value === true || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new CliError(`--${name} must be a number.`);
  return parsed;
}

export function intOption(value, name) {
  const parsed = numberOption(value, name);
  if (parsed === undefined) return undefined;
  if (!Number.isInteger(parsed)) throw new CliError(`--${name} must be an integer.`);
  return parsed;
}

export function stringOption(options, key, { required = false } = {}) {
  const value = options[key];
  if (value === undefined || value === true || value === "") {
    if (required) throw new CliError(`Missing required option --${toKebab(key)}.`);
    return undefined;
  }
  return String(value);
}

export function takeCommand(positionals) {
  if (positionals.length === 0) return { command: "help", rest: [] };
  return { command: positionals[0], rest: positionals.slice(1) };
}

function assignOption(options, key, value) {
  if (options[key] === undefined) {
    options[key] = value;
    return;
  }
  if (!Array.isArray(options[key])) options[key] = [options[key]];
  options[key].push(value);
}

function toCamel(value) {
  return value.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function toKebab(value) {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}
