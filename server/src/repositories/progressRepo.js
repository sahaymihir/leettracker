import { getItem, putItem, queryItems, deleteItem } from '../db/dynamodb.js';
import { progressKey, progressPk, PROGRESS_SK_PREFIX } from '../models/keys.js';
import { makeProgress } from '../models/progress.js';

// Data access for the Progress entity (PK 'PROGRESS#<userId>' / SK 'PROB#<num>').

export const get = (userId, num) => {
  const { PK, SK } = progressKey(userId, num);
  return getItem(PK, SK);
};

export const listForUser = (userId) => queryItems(progressPk(userId), PROGRESS_SK_PREFIX);

export const save = ({ userId, num, solved, status, solvedAt, attemptedAt }) =>
  putItem(makeProgress({ userId, num, solved, status, solvedAt, attemptedAt }));

export const remove = (userId, num) => {
  const { PK, SK } = progressKey(userId, num);
  return deleteItem(PK, SK);
};
