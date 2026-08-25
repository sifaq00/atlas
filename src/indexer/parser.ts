import fs from 'fs';
import path from 'path';
import { PathResolver } from './resolver';
import { classifyFile } from './classifier';
import { FileNode, DependencyEdge } from '../graph/model';

let parseSync: ((filename: string, source: string, options?: Record<string, unknown>) => unknown) | null = null;
let _usingFallback = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('oxc-parser') as { parseSync: typeof parseSync };
  parseSync = mod.parseSync;
} catch {
  _usingFallback = true;
  console.warn('[Atlas] oxc-parser napi unavailable, using regex fallback');
}

export function isUsingParserFallback(): boolean {
  return _usingFallback;
}

export interface ParseResult {
  node: FileNode;
  internalEdges: DependencyEdge[];
}

function regexParse(source: string): Array<{ type: string; specifier?: string; symbols?: string[] }> {
  const results: Array<{ type: string; specifier?: string; symbols?: string[] }> = [];
  const importRe = /import\s+([\s\S]*?)\s+from\s+['"](.+?)['"]/g;
  const requireRe = /require\s*\(\s*['"](.+?)['"]\s*\)/g;
  const dynamicImportRe = /import\s*\(\s*['"](.+?)['"]\s*\)/g;
  const exportFromRe = /export\s+(?:\{[^}]*\}|\*)\s+from\s+['"](.+?)['"]/g;

  let m: RegExpExecArray | null;
  while ((m = importRe.exec(source)) !== null) {
    const clause = m[1].trim();
    const specifier = m[2];
    const symbols: string[] = [];
    if (clause === '*') {
      symbols.push('*');
    } else {
      const parts = clause.split(',').map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        const asMatch = part.match(/(\S+)\s+as\s+(\S+)/);
        if (asMatch) {
          symbols.push(`${asMatch[1]} as ${asMatch[2]}`);
        } else {
          symbols.push(part);
        }
      }
    }
    results.push({ type: 'import', specifier, symbols });
  }

  while ((m = requireRe.exec(source)) !== null) {
    results.push({ type: 'import', specifier: m[1] });
  }

  while ((m = dynamicImportRe.exec(source)) !== null) {
    results.push({ type: 'dynamic-import', specifier: m[1] });
  }

  while ((m = exportFromRe.exec(source)) !== null) {
    results.push({ type: 're-export', specifier: m[1], symbols: ['*'] });
  }

  return results;
}

function extractExportsFromSource(source: string): string[] {
  const exports: string[] = [];
  const exportDefaultRe = /export\s+default\b/g;
  const exportNamedRe = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
  const exportAssignRe = /module\.exports\s*[=.]\s*\{/g;
  const exportPropRe = /(?:module\.exports|exports)\.(\w+)/g;

  let m: RegExpExecArray | null;
  while ((m = exportDefaultRe.exec(source)) !== null) {
    if (!exports.includes('default')) exports.push('default');
  }
  while ((m = exportNamedRe.exec(source)) !== null) {
    if (!exports.includes(m[1])) exports.push(m[1]);
  }
  while ((m = exportAssignRe.exec(source)) !== null) {
    const chunk = source.slice(m.index, m.index + 200);
    const propRe = /(\w+)\s*[:=,]/g;
    let pm: RegExpExecArray | null;
    while ((pm = propRe.exec(chunk)) !== null) {
      if (pm[1] !== 'module' && pm[1] !== 'exports' && !exports.includes(pm[1])) {
        exports.push(pm[1]);
      }
    }
  }
  while ((m = exportPropRe.exec(source)) !== null) {
    if (!exports.includes(m[1])) exports.push(m[1]);
  }

  return exports;
}

function langFromExt(ext: string): string {
  switch (ext) {
    case '.tsx': return 'tsx';
    case '.jsx': return 'jsx';
    case '.js':
    case '.mjs':
    case '.cjs': return 'js';
    default: return 'ts';
  }
}

function walkOxcAst(ast: unknown): Array<{ type: string; specifier?: string; symbols?: string[]; nodeType?: string }> {
  const results: Array<{ type: string; specifier?: string; symbols?: string[]; nodeType?: string }> = [];
  const astObj = ast as Record<string, unknown>;
  const program = (astObj.program || astObj) as Record<string, unknown>;
  const body = program.body as Array<Record<string, unknown>> | undefined;
  if (!body) return results;

  function visit(node: Record<string, unknown>) {
    if (!node || typeof node !== 'object') return;
    const t = node.type as string;

    if (t === 'ImportDeclaration') {
      const source = node.source as Record<string, unknown> | undefined;
      if (source?.value) {
        const symbols: string[] = [];
        const importClause = node.importClause as Record<string, unknown> | undefined;
        if (importClause) {
          const local = importClause.local as Record<string, unknown> | undefined;
          if (local?.name) symbols.push(local.name as string);
          const named = importClause.specified as Array<Record<string, unknown>> | undefined;
          if (named) {
            for (const elem of named) {
              const imported = elem.imported as Record<string, unknown> | undefined;
              if (imported?.name) symbols.push(imported.name as string);
            }
          }
          const ns = importClause.namespace as Record<string, unknown> | undefined;
          if (ns?.name) symbols.push(`* as ${ns.name as string}`);
        }
        results.push({ type: 'import', specifier: source.value as string, symbols, nodeType: t });
      }
    } else if (t === 'ExportNamedDeclaration') {
      const source = node.source as Record<string, unknown> | undefined;
      if (source?.value) {
        const symbols: string[] = [];
        const specifiers = node.specifiers as Array<Record<string, unknown>> | undefined;
        if (specifiers) {
          for (const spec of specifiers) {
            const exported = spec.exported as Record<string, unknown> | undefined;
            if (exported?.name) symbols.push(exported.name as string);
          }
        }
        results.push({ type: 're-export', specifier: source.value as string, symbols, nodeType: t });
      } else {
        // export { name } or export { name as alias } — extract specifier names
        const specifiers = node.specifiers as Array<Record<string, unknown>> | undefined;
        if (specifiers) {
          for (const spec of specifiers) {
            const exported = spec.exported as Record<string, unknown> | undefined;
            if (exported?.name) results.push({ type: 'export-name', specifier: exported.name as string, nodeType: t });
          }
        }
      }
      const decl = node.declaration as Record<string, unknown> | undefined;
      if (decl) {
        const dType = decl.type as string;
        if (dType === 'VariableDeclaration') {
          const decls = decl.declarations as Array<Record<string, unknown>> | undefined;
          if (decls) {
            for (const d of decls) {
              const id = d.id as Record<string, unknown> | undefined;
              if (id?.name) results.push({ type: 'export-name', specifier: id.name as string, nodeType: dType });
            }
          }
        } else if (decl.id) {
          const id = decl.id as Record<string, unknown>;
          if (id?.name) results.push({ type: 'export-name', specifier: id.name as string, nodeType: dType });
        }
      }
    } else if (t === 'ExportAllDeclaration') {
      const source = node.source as Record<string, unknown> | undefined;
      if (source?.value) results.push({ type: 're-export', specifier: source.value as string, symbols: ['*'], nodeType: t });
    } else if (t === 'ExportDefaultDeclaration') {
      results.push({ type: 'export-default', specifier: 'default', nodeType: t });
    } else if (t === 'CallExpression') {
      const callee = node.callee as Record<string, unknown> | undefined;
      if (callee?.type === 'Identifier' && callee.name === 'require') {
        const args = node.arguments as Array<Record<string, unknown>> | undefined;
        if (args?.[0]?.type === 'StringLiteral') {
          results.push({ type: 'import', specifier: args[0].value as string, nodeType: 'CallExpression-require' });
        }
      }
    } else if (t === 'ImportExpression') {
      const argument = node.argument as Record<string, unknown> | undefined;
      if (argument?.type === 'StringLiteral') {
        results.push({ type: 'dynamic-import', specifier: argument.value as string, nodeType: 'ImportExpression' });
      }
    }

    // Recurse into all child nodes
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue;
      const val = node[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === 'object' && (item as Record<string, unknown>).type) {
            visit(item as Record<string, unknown>);
          }
        }
      } else if (val && typeof val === 'object' && (val as Record<string, unknown>).type) {
        visit(val as Record<string, unknown>);
      }
    }
  }

  for (const stmt of body) {
    visit(stmt);
  }

  return results;
}

// walkNestedNode removed â€” all logic now in walkOxcAst's visit function

export class AstParser {
  private pathResolver: PathResolver;
  private workspaceRoot: string;

  constructor(workspaceRoot: string, pathResolver: PathResolver) {
    this.workspaceRoot = workspaceRoot;
    this.pathResolver = pathResolver;
  }

  public updateWorkspaceRoot(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  public parseFile(filePath: string): ParseResult | null {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      return this.parseSource(filePath, content, stats.size);
    } catch (err) {
      console.warn(`[Atlas AstParser] Error reading file ${filePath}:`, err);
      return null;
    }
  }

  public parseSource(filePath: string, content: string, sizeBytes = 0): ParseResult | null {
    try {
      const lines = content.split(/\r\n|\r|\n/).length;
      const size = sizeBytes || Buffer.byteLength(content, 'utf8');

      const normalizedFilePath = path.normalize(filePath);
      const relativePath = path.relative(this.workspaceRoot, normalizedFilePath).replace(/\\/g, '/');
      const fileName = path.basename(normalizedFilePath);
      const extension = path.extname(normalizedFilePath);

      const importsList: string[] = [];
      const externalImports: string[] = [];
      const exportsList: string[] = [];
      const internalEdges: DependencyEdge[] = [];

      const addEdge = (specifier: string, type: 'import' | 'dynamic-import' | 're-export', symbols?: string[]) => {
        const { resolvedPath, isExternal } = this.pathResolver.resolve(specifier, filePath);
        if (resolvedPath) {
          const normalizedTarget = path.normalize(resolvedPath);
          if (!importsList.includes(normalizedTarget)) {
            importsList.push(normalizedTarget);
          }
          internalEdges.push({
            id: `${normalizedFilePath}->${normalizedTarget}`,
            source: normalizedFilePath,
            target: normalizedTarget,
            type,
            isExternal: false,
            importedSymbols: symbols
          });
        } else if (isExternal) {
          if (!externalImports.includes(specifier)) {
            externalImports.push(specifier);
          }
        }
      };

      let astEntries: Array<{ type: string; specifier?: string; symbols?: string[]; nodeType?: string }>;
      let exportEntries: string[];

      if (parseSync) {
        try {
          const lang = langFromExt(extension);
          const ast = parseSync(filePath, content, { lang, sourceType: 'module' }) as Record<string, unknown>;
          astEntries = walkOxcAst(ast);
          exportEntries = [];
          for (const entry of astEntries) {
            if (entry.type === 'export-name' && entry.specifier) {
              if (!exportEntries.includes(entry.specifier)) exportEntries.push(entry.specifier);
            } else if (entry.type === 'export-default') {
              if (!exportEntries.includes('default')) exportEntries.push('default');
            }
          }
          // Also extract CommonJS exports (module.exports, exports.x) via regex
          const cjsExports = extractExportsFromSource(content);
          for (const exp of cjsExports) {
            if (!exportEntries.includes(exp)) exportEntries.push(exp);
          }
        } catch (err) {
          // oxc parse failed for this file, fall back to regex
          astEntries = regexParse(content);
          exportEntries = extractExportsFromSource(content);
        }
      } else {
        astEntries = regexParse(content);
        exportEntries = extractExportsFromSource(content);
      }

      for (const entry of astEntries) {
        if (entry.specifier && (entry.type === 'import' || entry.type === 'dynamic-import' || entry.type === 're-export')) {
          addEdge(entry.specifier, entry.type as 'import' | 'dynamic-import' | 're-export', entry.symbols);
        }
      }


      for (const exp of exportEntries) {
        if (!exportsList.includes(exp)) exportsList.push(exp);
      }

      const { category, metadata } = classifyFile(filePath, exportsList);

      const fileNode: FileNode = {
        id: normalizedFilePath,
        relativePath,
        name: fileName,
        extension,
        category,
        lineCount: lines,
        sizeBytes: size,
        imports: importsList,
        importedBy: [],
        externalImports,
        exports: exportsList,
        metadata
      };

      return {
        node: fileNode,
        internalEdges
      };
    } catch (err) {
      console.warn(`[Atlas AstParser] Error parsing file ${filePath}:`, err);
      return null;
    }
  }
}
