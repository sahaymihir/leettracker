import { getItem, putItem, scanItems, batchGetItems } from '../db/dynamodb.js';
import { problemKey } from '../models/keys.js';
import { makeProblem } from '../models/problem.js';

// Data access for the Problem entity (PK 'PROBLEM#<num>' / SK 'DETAIL').
// The Problem record is shared across users; per-user state lives in Progress.

export const getByNumber = (num) => {
  const { PK, SK } = problemKey(num);
  return getItem(PK, SK);
};

export const getManyByNumbers = (nums) =>
  batchGetItems(nums.map((num) => problemKey(num)));

export const save = (problem) => putItem(makeProblem(problem));

// Full-table scan for problems carrying a given patternName — used to decide
// whether a pattern is now orphaned during problem deletion.
export const findRowsByPattern = (patternName) =>
  scanItems(
    'begins_with(PK, :prefix) AND patternName = :pattern',
    { ':prefix': 'PROBLEM#', ':pattern': patternName }
  );
