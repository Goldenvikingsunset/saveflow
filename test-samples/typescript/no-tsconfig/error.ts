// Test: TypeScript with type error
// Expected: Should show error in Problems panel with correct line/column

interface Person {
  name: string;
  age: number;
}

const person: Person = {
  name: 'Bob',
  age: 'thirty' // Type error: string is not assignable to number
};

console.log(person);
