import { describe, it, expect } from 'vitest';
import { classifyFile } from '../src/indexer/classifier';

describe('FileClassifier Unit Tests', () => {
  it('should classify backend routes correctly', () => {
    expect(classifyFile('src/api/auth/route.ts').category).toBe('ui');
    expect(classifyFile('src/controllers/userController.js').category).toBe('ui');
    expect(classifyFile('src/pages/index.tsx').category).toBe('ui');
  });

  it('should classify backend services correctly', () => {
    expect(classifyFile('src/services/ai-conversation-service.js').category).toBe('service');
    expect(classifyFile('src/domain/paymentService.ts').category).toBe('service');
  });

  it('should classify UI components correctly', () => {
    expect(classifyFile('src/components/Header.tsx').category).toBe('ui');
    expect(classifyFile('src/views/DashboardModal.jsx').category).toBe('ui');
  });

  it('should classify databases and models correctly', () => {
    expect(classifyFile('src/models/UserModel.ts').category).toBe('data');
    expect(classifyFile('src/db/prismaClient.ts').category).toBe('data');
  });

  it('should classify unit tests and test files correctly', () => {
    expect(classifyFile('tests/verifyEngine.test.ts').category).toBe('other');
    expect(classifyFile('src/services/auth.spec.js').category).toBe('other');
  });

  it('should classify utilities and helpers correctly', () => {
    expect(classifyFile('src/utils/formatDate.ts').category).toBe('util');
    expect(classifyFile('src/lib/httpClient.js').category).toBe('util');
    expect(classifyFile('src/helpers/token.ts').category).toBe('util');
  });
});
