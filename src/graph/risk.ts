import { FileCategory, RiskLevel } from './model';

export interface RiskEvaluation {
  score: number;
  level: RiskLevel;
  reasons: string[];
}

export function calculateRisk(
  targetCategory: FileCategory,
  directCount: number,
  indirectCount: number,
  maxDepth: number,
  uiAffected: number,
  servicesAffected: number,
  hasCycles: boolean
): RiskEvaluation {
  let score = 0;
  const reasons: string[] = [];

  // Direct dependents contribution
  const directScore = directCount * 3.0;
  score += directScore;
  if (directCount > 0) {
    reasons.push(`${directCount} direct consumer${directCount > 1 ? 's' : ''}`);
  }

  // Indirect dependents contribution
  const indirectScore = indirectCount * 1.0;
  score += indirectScore;
  if (indirectCount > 0) {
    reasons.push(`${indirectCount} downstream dependent${indirectCount > 1 ? 's' : ''}`);
  }

  // Depth contribution
  const depthScore = maxDepth * 2.0;
  score += depthScore;
  if (maxDepth >= 3) {
    reasons.push(`Deep propagation chain (${maxDepth} levels deep)`);
  }

  // Critical architectural impact (UI endpoints)
  if (uiAffected > 0) {
    score += uiAffected * 4.0;
    reasons.push(`Touches ${uiAffected} UI file${uiAffected > 1 ? 's' : ''}`);
  }

  // Services impact
  if (servicesAffected > 0) {
    score += servicesAffected * 2.0;
  }

  // Core file category modifier
  if (targetCategory === 'data' || targetCategory === 'config') {
    score += 8;
    reasons.push(`Core ${targetCategory} layer modification`);
  }

  // Circular dependency modifier
  if (hasCycles) {
    score += 10;
    reasons.push('Circular dependency path detected');
  }

  // Determine Level
  let level: RiskLevel = 'LOW';
  if (score >= 56) {
    level = 'CRITICAL';
  } else if (score >= 26) {
    level = 'HIGH';
  } else if (score >= 9) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  return {
    score: Math.round(score),
    level,
    reasons
  };
}
