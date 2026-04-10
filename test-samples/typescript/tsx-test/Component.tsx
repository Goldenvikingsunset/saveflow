// Test: TSX (TypeScript React) file
// Expected: Compiles to Component.js in same directory

import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} className="btn">
      {label}
    </button>
  );
}

export function App() {
  const handleClick = () => {
    console.log('Button clicked!');
  };

  return (
    <div className="app">
      <h1>SaveFlow Pro TypeScript Test</h1>
      <Button label="Click Me" onClick={handleClick} />
    </div>
  );
}
