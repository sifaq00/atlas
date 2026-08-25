import path from 'path';
import { FileCategory, FileMetadata } from './model';

export function classifyFile(filePath: string, exportsList: string[] = []): { category: FileCategory; metadata: FileMetadata } {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const basename = path.basename(normalized);
  const ext = path.extname(normalized);
  const rawBaseName = path.basename(filePath);

  let isTest = false;
  let isRoute = false;
  let isComponent = false;
  let isDatabase = false;
  let isService = false;
  let isConfig = false;

  // 1. Check Tests
  if (
    normalized.includes('.test.') ||
    normalized.includes('.spec.') ||
    normalized.includes('__tests__/') ||
    normalized.includes('__mocks__/') ||
    normalized.includes('/tests/') ||
    normalized.includes('/test/')
  ) {
    isTest = true;
  }

  // 2. Check Routes & API Endpoints
  if (
    normalized.includes('/app/') && (basename.startsWith('page.') || basename.startsWith('route.') || basename.startsWith('layout.') || basename.startsWith('loading.') || basename.startsWith('error.')) ||
    normalized.includes('/pages/') ||
    normalized.includes('/api/') ||
    normalized.includes('/routes/') ||
    normalized.includes('/controllers/') ||
    basename.includes('.route.') ||
    basename.includes('.controller.')
  ) {
    isRoute = true;
  }

  // 3. Check Database / Schema / Models
  if (
    normalized.includes('/models/') ||
    normalized.includes('/entities/') ||
    normalized.includes('/schemas/') ||
    normalized.includes('/prisma/') ||
    normalized.includes('/migrations/') ||
    normalized.includes('/db/') ||
    basename.startsWith('db.') ||
    basename.startsWith('database.') ||
    basename.startsWith('schema.') ||
    basename.includes('.model.') ||
    basename.includes('.entity.') ||
    basename.includes('.schema.')
  ) {
    isDatabase = true;
  }

  // 4. Check Services
  if (
    normalized.includes('/services/') ||
    normalized.includes('/providers/') ||
    normalized.includes('/repositories/') ||
    normalized.includes('/service/') ||
    basename.includes('.service.') ||
    basename.includes('-service.') ||
    basename.includes('service.') ||
    basename.includes('.provider.') ||
    basename.includes('.repo.')
  ) {
    isService = true;
  }

  // 5. Check Config
  if (
    basename.includes('.config.') ||
    basename.startsWith('config.') ||
    basename.startsWith('constants.') ||
    normalized.includes('/config/') ||
    normalized.includes('/configs/')
  ) {
    isConfig = true;
  }

  // 6. Check Component (UI)
  // .tsx / .jsx or PascalCase in components folder
  if (
    ext === '.tsx' ||
    ext === '.jsx' ||
    normalized.includes('/components/') ||
    normalized.includes('/ui/') ||
    normalized.includes('/views/') ||
    normalized.includes('/widgets/')
  ) {
    const nameWithoutExt = rawBaseName.replace(/\.[^/.]+$/, '');
    if (/^[A-Z]/.test(nameWithoutExt) || ext === '.tsx' || ext === '.jsx') {
      isComponent = true;
    }
  }

  // Determine Primary Category (Section 6.4 heuristics)
  let category: FileCategory = 'other';

  if (isTest) {
    category = 'other';
  } else if (isRoute || isComponent) {
    // routes + components → ui
    category = 'ui';
  } else if (isService) {
    category = 'service';
  } else if (isDatabase) {
    // database → data
    category = 'data';
  } else if (isConfig) {
    category = 'config';
  } else if (
    normalized.includes('/utils/') ||
    normalized.includes('/lib/') ||
    normalized.includes('/helpers/') ||
    normalized.includes('/hooks/') ||
    basename.startsWith('use') ||
    basename.includes('.util.') ||
    basename.includes('.helper.')
  ) {
    // utility → util
    category = 'util';
  } else if (
    exportsList.some((exp) =>
      ['React', 'Vue', 'Svelte'].some((framework) =>
        exportsList.includes(framework) || normalized.includes(framework.toLowerCase())
      )
    )
  ) {
    category = 'ui';
  } else {
    category = 'other';
  }

  return {
    category,
    metadata: {
      isTest,
      isRoute,
      isComponent,
      isDatabase,
      isService,
      isConfig
    }
  };
}
