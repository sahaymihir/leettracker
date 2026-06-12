import { problemKey } from './keys.js';

/**
 * @typedef {Object} Problem
 * @property {string} PK   `PROBLEM#<num>`
 * @property {string} SK   `DETAIL`
 * @property {number} leetcodeNumber
 * @property {string} title
 * @property {string} slug
 * @property {string} difficulty            'Easy' | 'Medium' | 'Hard'
 * @property {string} url
 * @property {string|null} patternName
 * @property {string} addedBy               userId (email)
 * @property {string} createdAt             ISO timestamp
 */

export { problemKey };

/** @returns {Problem} */
export const makeProblem = ({
  num,
  leetcodeNumber,
  title,
  slug,
  difficulty,
  url,
  patternName,
  addedBy,
  createdAt,
}) => ({
  ...problemKey(num),
  leetcodeNumber,
  title,
  slug,
  difficulty,
  url,
  patternName,
  addedBy,
  createdAt,
});
