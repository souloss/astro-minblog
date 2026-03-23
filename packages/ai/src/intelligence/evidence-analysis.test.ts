import { describe, it, expect } from 'vitest';
import { shouldSkipAnalysis, buildEvidenceSection } from '../intelligence/evidence-analysis.js';
import type { QueryComplexity } from '../intelligence/types.js';

describe('shouldSkipAnalysis', () => {
  it('should skip for simple complexity', () => {
    expect(shouldSkipAnalysis('This is a query', 3, 'simple')).toBe(true);
  });

  it('should skip for fewer than 2 articles', () => {
    expect(shouldSkipAnalysis('This is a moderate query', 1, 'moderate')).toBe(true);
  });

  it('should skip for short text', () => {
    expect(shouldSkipAnalysis('short', 3, 'moderate')).toBe(true);
  });

  it('should not skip for moderate complexity with enough articles', () => {
    expect(shouldSkipAnalysis('This is a longer query text for analysis', 3, 'moderate')).toBe(false);
  });

  it('should not skip for complex queries', () => {
    expect(shouldSkipAnalysis('This is a complex query that needs detailed analysis', 5, 'complex')).toBe(false);
  });
});

describe('buildEvidenceSection', () => {
  it('should build evidence section from analysis', () => {
    const analysis = 'Key point 1\nKey point 2';
    const result = buildEvidenceSection(analysis);
    expect(result).toContain('## 关键证据分析');
    expect(result).toContain('Key point 1');
  });

  it('should return empty string for empty analysis', () => {
    expect(buildEvidenceSection('')).toBe('');
    expect(buildEvidenceSection('   ')).toBe('');
  });
});