export function printResult(value, options = {}) {
  const format = options.format || "json";
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  if (format === "plain") {
    process.stdout.write(`${typeof value === "string" ? value : JSON.stringify(value)}\n`);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) printPrettyObject(item);
    return;
  }
  printPrettyObject(value);
}

function printPrettyObject(value) {
  if (value === null || value === undefined) {
    process.stdout.write("\n");
    return;
  }
  if (typeof value !== "object") {
    process.stdout.write(`${value}\n`);
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (Array.isArray(item) || (item && typeof item === "object")) {
      process.stdout.write(`${key}: ${JSON.stringify(item)}\n`);
    } else {
      process.stdout.write(`${key}: ${item}\n`);
    }
  }
}
