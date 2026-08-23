#!/usr/bin/env node
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import vm from "node:vm";

const DOCS_URL = "https://platform.mureka.ai/docs/";
const OUT_DIR = new URL("../vendor/mureka-docs/", import.meta.url);

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const indexHtml = await fetchText(DOCS_URL);
  const siteData = extractJsonVar(indexHtml, "window.__VP_SITE_DATA__");
  const hashMap = extractJsonVar(indexHtml, "window.__VP_HASH_MAP__");

  await writeJson("site-data.json", siteData);
  await writeJson("hash-map.json", hashMap);

  const pages = collectPages(siteData.themeConfig.sidebar);
  pages.unshift({ text: "Introduction", link: "/" });
  const uniquePages = dedupePages(pages);
  const savedPages = [];
  for (const page of uniquePages) {
    const htmlPath = linkToHtmlPath(page.link);
    const url = new URL(htmlPath, DOCS_URL).href;
    const html = await fetchText(url);
    const outPath = join("html", htmlPath.replace(/^\/?docs\//, ""));
    await writeText(outPath, html);
    savedPages.push({ ...page, url, localHtml: outPath });
  }

  const assets = extractAssets(indexHtml);
  for (const asset of assets) {
    await writeText(join("assets", asset.replace(/^\/docs\/assets\//, "")), await fetchText(new URL(asset, "https://platform.mureka.ai").href));
  }

  const themeAsset = assets.find((asset) => asset.includes("/chunks/theme."));
  if (themeAsset) {
    const themeJs = await fetchText(new URL(themeAsset, "https://platform.mureka.ai").href);
    const openapi = extractOpenApi(themeJs);
    await writeJson("openapi.json", openapi);
    await writeJson("operation-index.json", buildOperationIndex(openapi));
  }

  await writeText("README.md", renderReadme(savedPages));
  await cleanupUploadSidecars(OUT_DIR.pathname);
  await sleep(2000);
  await cleanupUploadSidecars(OUT_DIR.pathname);
  console.log(`Mirrored ${savedPages.length} pages into ${OUT_DIR.pathname}`);
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed ${response.status}: ${url}`);
  return response.text();
}

function extractJsonVar(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`${escaped}=JSON\\.parse\\("((?:\\\\.|[^"])*)"\\)`));
  if (!match) throw new Error(`Could not find ${name}`);
  return JSON.parse(JSON.parse(`"${match[1]}"`));
}

function collectPages(items = []) {
  const pages = [];
  for (const item of items) {
    if (item.link) pages.push({ text: item.text, link: item.link });
    if (item.items) pages.push(...collectPages(item.items));
  }
  return pages;
}

function dedupePages(pages) {
  const seen = new Set();
  return pages.filter((page) => {
    const key = page.link;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function linkToHtmlPath(link) {
  if (link === "/" || link === "/docs/" || link === "") return "/docs/index.html";
  const clean = link.startsWith("/docs/") ? link : `/docs${link.startsWith("/") ? "" : "/"}${link}`;
  return clean.endsWith(".html") ? clean : `${clean}.html`;
}

function extractAssets(html) {
  return [...new Set([...html.matchAll(/\/docs\/assets\/[^" ]+\.js/g)].map((match) => match[0]))];
}

function extractOpenApi(themeJs) {
  const start = themeJs.indexOf('YLe="3.0.0"');
  const end = themeJs.indexOf(",aMe=rMe", start);
  if (start < 0 || end < 0) throw new Error("Could not locate embedded OpenAPI spec in theme bundle.");
  const slice = themeJs.slice(start, end);
  const code = `let YLe,ZLe,XLe,QLe,eMe,tMe,nMe,rMe; ${slice}; rMe;`;
  return vm.runInNewContext(code, {}, { timeout: 5000 });
}

function buildOperationIndex(openapi) {
  return Object.entries(openapi.paths || {}).map(([path, methods]) => {
    const method = Object.keys(methods)[0];
    const operation = methods[method];
    return {
      method: method.toUpperCase(),
      path,
      tag: operation.tags?.[0],
      summary: operation.summary,
      description: operation.description
    };
  });
}

function renderReadme(pages) {
  const pageLines = pages.map((page) => `- [${page.text}](${page.localHtml}) - ${page.url}`).join("\n");
  return `# Mureka Docs Mirror

Mirrored from ${DOCS_URL} on ${new Date().toISOString()}.

Important files:

- \`openapi.json\`: extracted OpenAPI contract embedded in the official VitePress bundle.
- \`operation-index.json\`: compact method/path index for agents.
- \`html/\`: raw official documentation pages.
- \`assets/\`: JavaScript assets needed to inspect the docs bundle.

## Pages

${pageLines}
`;
}

async function writeJson(relativePath, value) {
  await writeText(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(relativePath, value) {
  const path = new URL(relativePath, OUT_DIR);
  await mkdir(dirname(path.pathname), { recursive: true });
  await writeFile(path, value);
}

async function cleanupUploadSidecars(root) {
  const entries = await readdir(root, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      await cleanupUploadSidecars(path);
      return;
    }
    if (entry.name.endsWith(".baiduyun.uploading.cfg")) {
      await rm(path, { force: true });
    }
  }));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
