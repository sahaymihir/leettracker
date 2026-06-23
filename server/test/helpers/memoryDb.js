// In-memory stand-in for src/db/dynamodb.js, used by integration tests so the
// real controllers + repositories run end-to-end without AWS. Backed by a Map
// keyed by `PK|SK`.
//
// ponytail: this implements only the access patterns the tested routes use —
// exact get/put/delete, begins_with queries, and simple scans. UpdateExpression
// parsing and attribute-filter scans are deliberately NOT emulated; routes that
// need them are covered by controller unit tests with mocked repositories. The
// unsupported helpers throw loudly so a new route can't silently get wrong data.

export const createMemoryDb = () => {
  const store = new Map();
  const keyOf = (pk, sk) => `${pk}|${sk}`;

  const putItem = async (item) => {
    store.set(keyOf(item.PK, item.SK), { ...item });
    return {};
  };

  const getItem = async (pk, sk) => {
    const item = store.get(keyOf(pk, sk));
    return item ? { ...item } : null;
  };

  const deleteItem = async (pk, sk) => {
    store.delete(keyOf(pk, sk));
    return {};
  };

  const queryItems = async (pk, skPrefix) => {
    const items = [];
    for (const item of store.values()) {
      if (item.PK !== pk) continue;
      if (skPrefix && !String(item.SK).startsWith(skPrefix)) continue;
      items.push({ ...item });
    }
    return items;
  };

  const scanItems = async (filterExpression, expressionValues) => {
    let items = [...store.values()].map((i) => ({ ...i }));
    // Support only the single filter shape repositories actually use here.
    if (filterExpression === 'SK = :sk') {
      items = items.filter((i) => i.SK === expressionValues[':sk']);
    } else if (filterExpression) {
      throw new Error(`memoryDb.scanItems: unsupported filter "${filterExpression}" — mock the repo instead`);
    }
    return items;
  };

  const batchGetItems = async (keys) =>
    keys.map((k) => store.get(keyOf(k.PK, k.SK))).filter(Boolean).map((i) => ({ ...i }));

  const batchWrite = async (items) => { for (const i of items) await putItem(i); };

  const updateItem = async () => {
    throw new Error('memoryDb.updateItem is not emulated — cover update routes with mocked repos');
  };

  return {
    TABLE_NAME: 'TestTable',
    docClient: {},
    putItem, getItem, deleteItem, queryItems, scanItems, batchGetItems, batchWrite, updateItem,
    // test-only escape hatches
    _store: store,
    _seed: (item) => store.set(keyOf(item.PK, item.SK), { ...item }),
  };
};

// Shared singleton used as the dynamodb.js mock in integration tests. Exporting
// one instance (rather than creating it inside the vi.mock factory) sidesteps
// vi.mock hoisting/TDZ: the async factory dynamic-imports this module and the
// test imports the very same object, so seeding/reset stay in sync.
export const memoryDb = createMemoryDb();
export const resetMemoryDb = () => memoryDb._store.clear();
