// Test: TypeScript without tsconfig.json
// Expected: Compiles to simple.js in same directory using defaults (ES2020, CommonJS)

function add(a: number, b: number): number {
  return a + b;
}

function multiply(a: number, b: number): number {
  return a * b;
}

const result1 = add(5, 3);
const result2 = multiply(4, 7);

console.log(`5 + 3 = ${result1}`);
console.log(`4 × 7 = ${result2}`);

module.exports = { add, multiply };
