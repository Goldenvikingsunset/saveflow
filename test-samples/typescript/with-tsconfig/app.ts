// Test: TypeScript with tsconfig.json
// Expected: Compiles to dist/app.js with ES2022 target, ESNext modules, strict mode

interface User {
  id: number;
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return `Hello, ${user.name}! Your email is ${user.email}.`;
}

const user: User = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com'
};

console.log(greetUser(user));

export { User, greetUser };
