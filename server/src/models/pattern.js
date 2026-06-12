import { patternKey } from './keys.js';

/**
 * @typedef {Object} Pattern
 * @property {string} PK   `PATTERN`
 * @property {string} SK   `PAT#<name>`
 * @property {string} name
 * @property {0|1} isDefault
 * @property {string} createdBy            userId (email)
 */

export { patternKey };

/** @returns {Pattern} */
export const makePattern = ({ name, isDefault = 0, createdBy }) => ({
  ...patternKey(name),
  name,
  isDefault,
  createdBy,
});
