Invalid `{imported module ./lib/prisma.ts}["prisma"].member.findMany()` invocation in
D:\New folder\Clover Project\.next\dev\server\chunks\ssr\[root-of-the-server]__04yt8gh._.js:82:154

  79     return `M-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
  80 }
  81 async function getMembers() {
→ 82     const members = await {imported module ./lib/prisma.ts}["prisma"].member.findMany(
The column `Member.gardenName` does not exist in the current database.