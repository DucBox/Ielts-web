const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const esbuild = require('../teacher/backend/node_modules/esbuild');

const ROOT = path.resolve(__dirname, '..');

const APPS = [
  {
    name: 'student',
    dir: path.join(ROOT, 'students', 'frontend'),
    jsFiles: ['js/api.js', 'js/utils.js', 'js/app.js'],
    cssFile: 'css/style.css',
  },
  {
    name: 'teacher',
    dir: path.join(ROOT, 'teacher', 'frontend'),
    jsFiles: ['js/api.js', 'js/utils.js', 'js/app.js'],
    cssFile: 'css/style.css',
  },
];

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeIfChanged(filePath, content) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) return false;
  fs.writeFileSync(filePath, content);
  return true;
}

function cleanupGeneratedFiles(dirPath, pattern, keepName) {
  for (const file of fs.readdirSync(dirPath)) {
    if (!pattern.test(file) || file === keepName) continue;
    fs.unlinkSync(path.join(dirPath, file));
  }
}

function buildApp(app) {
  const htmlPath = path.join(app.dir, 'index.html');
  const cssPath = path.join(app.dir, app.cssFile);
  const jsSource = app.jsFiles
    .map(rel => `\n/* ${rel} */\n${read(path.join(app.dir, rel))}`)
    .join('\n;\n');

  const bundledJs = esbuild.transformSync(jsSource, {
    loader: 'js',
    minify: true,
    target: 'es2020',
    legalComments: 'none',
  }).code;

  const bundledCss = esbuild.transformSync(read(cssPath), {
    loader: 'css',
    minify: true,
    legalComments: 'none',
  }).code;

  const jsHash = hashContent(bundledJs);
  const cssHash = hashContent(bundledCss);
  const jsOutRel = `js/app.bundle.${jsHash}.js`;
  const cssOutRel = `css/style.${cssHash}.css`;
  const jsOutPath = path.join(app.dir, jsOutRel);
  const cssOutPath = path.join(app.dir, cssOutRel);

  writeIfChanged(jsOutPath, bundledJs);
  writeIfChanged(cssOutPath, bundledCss);
  cleanupGeneratedFiles(path.join(app.dir, 'js'), /^app\.bundle\.[a-f0-9]+\.js$/, path.basename(jsOutPath));
  cleanupGeneratedFiles(path.join(app.dir, 'css'), /^style\.[a-f0-9]+\.css$/, path.basename(cssOutPath));

  let html = read(htmlPath);
  html = html.replace(/<link rel="stylesheet" href="css\/[^"]+"\s*\/?>/, `<link rel="stylesheet" href="${cssOutRel}" />`);
  html = html.replace(/\s*<script src="js\/api\.js"><\/script>\s*<script src="js\/utils\.js"><\/script>\s*<script src="js\/app(?:\.bundle\.[a-f0-9]+)?\.js"><\/script>/, `\n  <script src="${jsOutRel}"></script>`);
  html = html.replace(/\s*<script src="js\/utils\.js"><\/script>\s*<script src="js\/api\.js"><\/script>\s*<script src="js\/app(?:\.bundle\.[a-f0-9]+)?\.js"><\/script>/, `\n  <script src="${jsOutRel}"></script>`);
  html = html.replace(/\s*<script src="js\/app\.bundle\.[a-f0-9]+\.js"><\/script>/, `\n  <script src="${jsOutRel}"></script>`);
  writeIfChanged(htmlPath, html);

  return { name: app.name, jsOutRel, cssOutRel };
}

for (const app of APPS) {
  const result = buildApp(app);
  process.stdout.write(`${result.name}: ${result.jsOutRel}, ${result.cssOutRel}\n`);
}
