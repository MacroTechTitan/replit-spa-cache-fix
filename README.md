# replit-spa-cache-fix

## The Problem

When you publish a Single-Page Application (SPA) on **Replit Autoscale Deployments**, the CDN can cache your `index.html` file. This means users (and even you) keep seeing an **old version** of your app after publishing — even in incognito mode or after a hard refresh.

This happens because:
1. Your SPA serves the same `index.html` for every route (SPA fallback routing)
2. Replit's CDN caches that HTML response
3. The cached HTML points to **old JavaScript/CSS bundles** that no longer exist or contain outdated code
4. New publishes don't invalidate the cached HTML

## The Fix

The solution is a single file: **`static.ts`** — your Express static file middleware that applies the right cache headers:

| File Type | Cache Strategy | Why |
|-----------|---------------|-----|
| `index.html` | `no-cache, no-store, must-revalidate` | Forces CDN and browsers to always fetch the latest HTML |
| JS/CSS/assets (with content hashes) | `max-age=1y, immutable` | These filenames change on every build, so long-term caching is safe and fast |

## Quick Start

### 1. Copy the middleware

Add this to your Express server (e.g., `server/static.ts`):

```typescript
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

  // Static assets (JS, CSS, images) — hashed filenames, cache forever
  app.use(
    express.static(distPath, {
      maxAge: "1y",
      immutable: true,
      index: false,     // Don't serve index.html from here
    })
  );

  // SPA fallback — always serve fresh index.html
  app.use("/{*path}", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
```

### 2. Use it in your server

```typescript
import express from "express";
import { serveStatic } from "./static";

const app = express();

// Your API routes go here
app.use("/api", apiRouter);

// Serve frontend (must be AFTER API routes)
if (process.env.NODE_ENV === "production") {
  serveStatic(app);
}

app.listen(5000, "0.0.0.0");
```

### 3. Publish

Publish your Replit app — users will immediately see the latest version.

## How It Works

**Without this fix:**
```
User visits site → CDN serves cached index.html → loads OLD app.js → stale content
```

**With this fix:**
```
User visits site → CDN/browser fetches FRESH index.html → loads CURRENT app-[hash].js → latest content
```

The key insight: Vite (and most bundlers) put a **content hash** in asset filenames (e.g., `app-3f2a1b.js`). When you rebuild, the filenames change. So it's safe — and optimal — to cache them forever. But `index.html` must **never** be cached because it's the pointer to those hashed assets.

## Works With

- React + Vite (tested)
- Vue + Vite
- Svelte + Vite
- Any SPA using Express for static file serving on Replit

## License

MIT — use it however you like.
