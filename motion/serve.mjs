#!/usr/bin/env node
// Minimal static server. Used by the renderer (ES modules don't load from
// file://) and for previewing the site: `npm run dev` → http://localhost:8080
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".woff2": "font/woff2", ".woff": "font/woff", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".json": "application/json", ".mp4": "video/mp4" };

export function serve(root, port = 0) {
  root = resolve(root);
  const server = createServer(async (req, res) => {
    let path = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!path.startsWith(root)) return res.writeHead(403).end();
    if (path.endsWith("/")) path += "index.html";
    try {
      const body = await readFile(path);
      res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), "..", "site");
  const s = await serve(root, +(process.argv[3] || 8080));
  console.log(`Serving ${resolve(root)} at http://localhost:${s.address().port}`);
}
