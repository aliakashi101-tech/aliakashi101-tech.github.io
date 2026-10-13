import { copyFile } from 'node:fs/promises';

// GitHub Pages has no rewrite rules. Serving the built app as its custom 404
// page lets clean SPA routes such as /admin load directly without URL hashes.
await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../dist/404.html', import.meta.url));
