import picomatch from 'picomatch';

export const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.turbo/**',
  '**/.pnpm/**',
  '**/dist/**',
  '**/dist-webview/**',
  '**/dist-landing/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/.vscode/**',
  '**/.idea/**',
  '**/vendor/**',
  '**/*.d.ts',
  '**/*.d.cts',
  '**/*.d.mts',
  '**/*.min.js',
  '**/*.bundle.js',
  '**/*.map'
];

export const SUPPORTED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs'
]);

export function createIgnoreMatcher(customPatterns: string[] = []): (filePath: string) => boolean {
  const allPatterns = [...DEFAULT_IGNORE_PATTERNS, ...customPatterns];
  const isMatch = picomatch(allPatterns, { dot: true });
  
  return (filePath: string) => {
    // Normalize path separators to forward slash for picomatch
    const normalized = filePath.replace(/\\/g, '/');
    return isMatch(normalized);
  };
}

export function isSupportedFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.d.ts') || lower.endsWith('.d.cts') || lower.endsWith('.d.mts')) {
    return false;
  }
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const ext = fileName.substring(dotIndex).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}
