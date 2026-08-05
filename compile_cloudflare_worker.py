"""
Deprecated builder.

The project now uses Cloudflare Workers Static Assets + a module Worker in `worker.js`.
Do NOT re-embed HTML/CSS/JS into worker.js; that old flow caused API/POST mismatches.

Deploy directly with:
    npx wrangler deploy

Static files are served from ./static via wrangler.toml assets binding.
"""
print("BhashaSetu v3.1 uses worker.js + static assets. Run: npx wrangler deploy")
