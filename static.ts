import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      \`Could not find the build directory: \${distPath}, make sure to build the client first\`
    );
  }

  // Static assets (JS, CSS, images with content hashes) — safe to cache forever
  app.use(
    express.static(distPath, {
      maxAge: "1y",
      immutable: true,
      index: false,     // Don't auto-serve index.html from express.static
    })
  );

  // SPA fallback — serve index.html for all non-file routes, with no-cache headers
  app.use("/{*path}", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
