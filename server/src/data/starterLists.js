// Curated starter lists: fixed sets of LeetCode problem numbers that a group can
// import in one click to get instant content instead of an empty table.
//
// Each list is the canonical, well-known problem set referenced by its LeetCode
// problem numbers. The actual problem detail (title/difficulty/url/topics) is
// resolved from the bundled problems dataset at import time, so this file only
// needs to carry the numbers + presentation metadata.

// Blind 75 — the classic interview prep set.
const BLIND_75 = [
  1, 121, 217, 238, 53, 152, 153, 33, 15, 11,
  371, 191, 338, 268, 190,
  70, 322, 300, 1143, 139, 39, 198, 213, 91, 62, 55,
  133, 207, 417, 200, 128, 269, 261, 323,
  57, 56, 435, 252, 253,
  206, 141, 21, 23, 19, 143,
  73, 54, 48, 79,
  3, 424, 76, 242, 49, 20, 125, 5, 647, 271,
  104, 100, 226, 124, 102, 297, 572, 105, 98, 230, 235, 208, 211, 212,
  347, 295,
];

// NeetCode 150 — superset of Blind 75, grouped by the standard NeetCode roadmap.
const NEETCODE_150 = [
  // Arrays & Hashing
  217, 242, 1, 49, 347, 238, 36, 128, 271, 2013,
  // Two Pointers
  125, 167, 15, 11, 42,
  // Sliding Window
  121, 3, 424, 567, 76, 239,
  // Stack
  20, 155, 150, 22, 739, 853, 84,
  // Binary Search
  704, 74, 153, 33, 875, 981, 4,
  // Linked List
  206, 21, 143, 19, 138, 287, 23, 25, 141, 2, 146,
  // Trees
  226, 104, 543, 110, 100, 572, 105, 124, 102, 199, 1448, 98, 230, 235, 297, 116,
  // Tries
  208, 211, 212,
  // Heap / Priority Queue
  703, 1046, 973, 215, 621, 355, 295,
  // Backtracking
  78, 39, 46, 90, 40, 79, 131, 17, 51,
  // Graphs
  200, 133, 695, 417, 130, 207, 210, 261, 323, 269, 684, 994, 127,
  // Advanced Graphs
  332, 1584, 743, 778, 787,
  // 1-D DP
  70, 746, 198, 213, 5, 647, 91, 322, 152, 139, 300, 416,
  // 2-D DP
  62, 1143, 309, 518, 494, 97, 329, 115, 72, 312, 10,
  // Greedy
  53, 55, 45, 134, 846, 1899, 763, 678,
  // Intervals
  57, 56, 435, 252, 253, 1851,
  // Math & Geometry
  48, 54, 73, 202, 66, 50, 43,
  // Bit Manipulation
  136, 191, 338, 190, 268, 371, 7,
];

// De-duplicate while preserving order (some problems appear under multiple
// roadmap sections in the source lists).
const dedupe = (nums) => [...new Set(nums)];

const STARTER_LISTS = [
  {
    id: 'blind-75',
    name: 'Blind 75',
    description: 'The classic 75-problem set covering every core interview pattern.',
    numbers: dedupe(BLIND_75),
  },
  {
    id: 'neetcode-150',
    name: 'NeetCode 150',
    description: 'A broader 150-problem roadmap that builds on Blind 75 with more depth per topic.',
    numbers: dedupe(NEETCODE_150),
  },
];

const STARTER_LISTS_BY_ID = new Map(STARTER_LISTS.map((list) => [list.id, list]));

// Catalog for the picker UI: metadata + count, without the full number arrays.
export const listStarterLists = () =>
  STARTER_LISTS.map(({ id, name, description, numbers }) => ({
    id,
    name,
    description,
    count: numbers.length,
  }));

export const getStarterList = (listId) => STARTER_LISTS_BY_ID.get(listId) || null;
