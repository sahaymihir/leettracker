import * as problemsRepo from '../repositories/problemsRepo.js';
import * as patternsRepo from '../repositories/patternsRepo.js';
import { getProblemByNumber } from './problemsDataset.js';

// Ensure each LeetCode number has a shared PROBLEM# row, creating any that are
// missing from the bundled dataset. This is the dataset-only counterpart of the
// GraphQL-backed ensureProblemExists in leetcodeController.js, used by curated
// starter-list imports and bulk group adds so a number known to the dataset is
// never silently skipped just because no user has touched it yet.
//
// Returns the set of numbers that resolved to a known problem (existing or newly
// created). Numbers absent from the dataset are omitted so callers can report
// them as failures.
export const ensureProblemsExist = async (numbers, userId) => {
  const resolved = new Set();
  const ensuredPatterns = new Set();

  for (const rawNum of numbers) {
    const num = Number(rawNum);
    if (!Number.isInteger(num) || num <= 0) continue;

    const existing = await problemsRepo.getByNumber(num);
    if (existing) {
      resolved.add(num);
      continue;
    }

    const data = getProblemByNumber(num);
    if (!data) continue; // not in the dataset — caller treats as not found

    const patternName = data.topics?.[0] || 'Uncategorized';
    if (!ensuredPatterns.has(patternName)) {
      const existingPattern = await patternsRepo.getByName(patternName);
      if (existingPattern.length === 0) {
        await patternsRepo.save({ name: patternName, isDefault: 0, createdBy: userId });
      }
      ensuredPatterns.add(patternName);
    }

    await problemsRepo.save({
      num,
      leetcodeNumber: num,
      title: data.title,
      slug: data.slug,
      difficulty: data.difficulty,
      url: data.url || `https://leetcode.com/problems/${data.slug}/`,
      patternName,
      addedBy: userId,
      createdAt: new Date().toISOString(),
    });

    resolved.add(num);
  }

  return resolved;
};
