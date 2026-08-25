const { parseSync } = require('oxc-parser');

const code = `
  import React, { useState } from 'react';
  const fs = require('fs');
  const helper = require('./classifier');
  async function load() {
    const mod = await import('./resolver');
  }
  export const UserDashboard = () => {};
  export default UserDashboard;
  module.exports = { load };
`;

try {
  const ast = parseSync('test.tsx', code, { lang: 'tsx', sourceType: 'module' });
  console.log('AST body length:', ast.body.length);
  for (const node of ast.body) {
    console.log('---');
    console.log('type:', node.type);
    if (node.type === 'ImportDeclaration') {
      console.log('  source:', JSON.stringify(node.source));
      console.log('  importClause:', JSON.stringify(node.importClause));
    }
    if (node.type === 'ExportNamedDeclaration') {
      console.log('  source:', JSON.stringify(node.source));
      console.log('  declaration type:', node.declaration?.type);
      console.log('  specifiers:', JSON.stringify(node.specifiers));
    }
    if (node.type === 'ExportDefaultDeclaration') {
      console.log('  declaration:', JSON.stringify(node.declaration));
    }
  }
} catch (e) {
  console.error('Parse error:', e.message);
}

// Also test regex fallback
const importRe = /import\s+([\s\S]*?)\s+from\s+['"](.+?)['"]/g;
const requireRe = /require\s*\(\s*['"](.+?)['"]\s*\)/g;
const dynamicImportRe = /import\s*\(\s*['"](.+?)['"]\s*\)/g;
const exportFromRe = /export\s+(?:\{[^}]*\}|\*)\s+from\s+['"](.+?)['"]/g;

console.log('\n--- Regex test ---');
let m;
while ((m = importRe.exec(code)) !== null) {
  console.log('import:', m[2], 'clause:', m[1].trim());
}
while ((m = requireRe.exec(code)) !== null) {
  console.log('require:', m[1]);
}
while ((m = dynamicImportRe.exec(code)) !== null) {
  console.log('dynamic:', m[1]);
}

const exportNamedRe = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
const exportDefaultRe = /export\s+default\b/g;
while ((m = exportNamedRe.exec(code)) !== null) {
  console.log('export named:', m[1]);
}
while ((m = exportDefaultRe.exec(code)) !== null) {
  console.log('export default');
}
