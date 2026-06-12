import { scanItems } from '../db/dynamodb.js';

// Cross-entity / operational access: a full-table scan used by the backup job
// and the manual backup endpoint. Not tied to a single entity.

export const scanAll = () => scanItems();
