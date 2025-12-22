const { src, dest } = require('gulp');

function buildIcons() {
  // Copy icons to their respective node directories
  src('nodes/**/*.{png,svg}')
    .pipe(dest('dist/nodes'));
  
  // Also copy main node icon to dist root for n8n custom extensions
  return src('nodes/Chutes/chutes.png')
    .pipe(dest('dist'));
}

exports['build:icons'] = buildIcons;
exports.default = buildIcons;

