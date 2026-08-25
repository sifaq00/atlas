import { describe, it, expect } from 'vitest';
import { AstParser } from '../src/indexer/parser';
import { PathResolver } from '../src/indexer/resolver';
import * as path from 'path';

describe('AstParser Unit Tests', () => {
  const workspaceRoot = path.resolve(__dirname, '..');
  const pathResolver = new PathResolver(workspaceRoot);
  const parser = new AstParser(workspaceRoot, pathResolver);

  it('should parse TypeScript imports and exports correctly', () => {
    const filePath = path.resolve(workspaceRoot, 'src/indexer/parser.ts');
    const result = parser.parseFile(filePath);

    expect(result).not.toBeNull();
    expect(result!.node.name).toBe('parser.ts');
    expect(result!.node.category).toBe('other');
    expect(result!.node.exports).toContain('AstParser');
    expect(result!.node.imports.length).toBeGreaterThan(0);
    expect(result!.node.lineCount).toBeGreaterThan(50);
  });

  it('should parse CommonJS and dynamic imports from raw source code', () => {
    const code = `
      import { helper } from './classifier';
      export const load = () => {};
    `;

    const dummyPath = path.resolve(workspaceRoot, 'src/indexer/tempMockFile.js');
    const result = parser.parseSource(dummyPath, code);

    expect(result).not.toBeNull();
    expect(result!.node.exports).toContain('load');
    expect(result!.node.imports.some(i => i.includes('classifier'))).toBe(true);
    expect(result!.node.lineCount).toBeGreaterThan(0);
  });

  it('should detect React JSX/TSX components and exported hooks', () => {
    const tsxCode = `
      import React, { useState } from 'react';

      export const UserDashboard: React.FC = () => {
        const [state, setState] = useState(0);
        return <div>Dashboard</div>;
      };

      export default UserDashboard;
    `;

    const dummyTsx = path.resolve(workspaceRoot, 'webview/src/components/UserDashboard.tsx');
    const result = parser.parseSource(dummyTsx, tsxCode);

    expect(result).not.toBeNull();
    expect(result!.node.metadata.isComponent).toBe(true);
    expect(result!.node.exports).toContain('UserDashboard');
    expect(result!.node.exports).toContain('default');
    expect(result!.node.externalImports).toContain('react');
  });
});
