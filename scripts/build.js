const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');

// 1. Clean and create /dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 2. Copy all /public PWA assets into /dist
if (fs.existsSync(publicDir)) {
  const publicFiles = fs.readdirSync(publicDir);
  for (const file of publicFiles) {
    const srcPath = path.join(publicDir, file);
    const destPath = path.join(distDir, file);
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 3. Copy production index.html into /dist/index.html
const indexHtmlSrc = path.join(rootDir, 'index.html');
const indexHtmlDest = path.join(distDir, 'index.html');
fs.copyFileSync(indexHtmlSrc, indexHtmlDest);

// 4. Generate Netlify _redirects for SPA/PWA compatibility
fs.writeFileSync(path.join(distDir, '_redirects'), '/* /index.html 200\n', 'utf8');

// 5. Generate Vercel / static hosting headers config inside /dist/vercel.json
const vercelConfig = {
  cleanUrls: true,
  headers: [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
    {
      source: '/manifest.json',
      headers: [
        { key: 'Content-Type', value: 'application/manifest+json' },
      ],
    },
  ],
};
fs.writeFileSync(
  path.join(distDir, 'vercel.json'),
  JSON.stringify(vercelConfig, null, 2),
  'utf8'
);

console.log('====================================================');
console.log('ZENTAVO PWA PRODUCTION BUILD COMPLETED SUCCESSFULLY');
console.log('====================================================');
console.log('Output Directory:', distDir);
const builtFiles = fs.readdirSync(distDir);
for (const f of builtFiles) {
  const stat = fs.statSync(path.join(distDir, f));
  console.log(` - ${f} (${(stat.size / 1024).toFixed(2)} KB)`);
}
