import { describe, it, expect } from 'vitest';
import { PathResolver } from '../src/indexer/resolver';
import * as path from 'path';

describe('PathResolver Unit Tests', () => {
  const workspaceRoot = path.resolve(__dirname, '..');
  const resolver = new PathResolver(workspaceRoot);

  it('should resolve relative imports with extension probing', () => {
    const fromFile = path.resolve(workspaceRoot, 'src/indexer/parser.ts');
    const result = resolver.resolve('./classifier', fromFile);

    expect(result.isExternal).toBe(false);
    expect(result.resolvedPath).not.toBeNull();
    expect(result.resolvedPath!.endsWith('classifier.ts')).toBe(true);
  });

  it('should identify external npm packages', () => {
    const fromFile = path.resolve(workspaceRoot, 'src/indexer/parser.ts');
    const result = resolver.resolve('typescript', fromFile);

    expect(result.isExternal).toBe(true);
    expect(result.resolvedPath).toBeNull();
  });

  it('should normalize paths consistently', () => {
    const messyPath = 'D:\\Project\\scope\\src\\..\\src\\indexer\\resolver.ts';
    const normalized = PathResolver.normalizePath(messyPath);

    expect(normalized).toBe(path.normalize(messyPath));
  });
});
