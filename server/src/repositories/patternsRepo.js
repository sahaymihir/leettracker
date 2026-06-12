import { putItem, queryItems, deleteItem } from '../db/dynamodb.js';
import { patternKey, PATTERN_PK, PATTERN_SK_PREFIX } from '../models/keys.js';
import { makePattern } from '../models/pattern.js';

// Data access for the Pattern entity (PK 'PATTERN' / SK 'PAT#<name>').

export const listAll = () => queryItems(PATTERN_PK, PATTERN_SK_PREFIX);

// Exact-SK query (callers use .length to test existence, matching prior behavior).
export const getByName = (name) => queryItems(PATTERN_PK, `${PATTERN_SK_PREFIX}${name}`);

export const save = ({ name, isDefault = 0, createdBy }) =>
  putItem(makePattern({ name, isDefault, createdBy }));

export const remove = (name) => {
  const { PK, SK } = patternKey(name);
  return deleteItem(PK, SK);
};
