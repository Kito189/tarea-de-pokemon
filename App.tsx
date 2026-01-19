import React from 'react';
import PokeRunner from './components/PokeRunner';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <header className="mb-6 text-center">
        <h2 className="text-slate-400 text-sm uppercase tracking-widest mb-2">Retro React Engine</h2>
        <div className="text-xs text-slate-500 mt-2">
          Powered by <a href="https://pokeapi.co/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">PokéAPI</a>
        </div>
      </header>
      
      <main className="w-full flex justify-center">
        <PokeRunner />
      </main>

      <footer className="mt-8 text-slate-500 text-center max-w-md text-sm">
        <p>Controls: Spacebar / Click to Jump. Double tap for Double Jump.</p>
        <p className="mt-2 text-xs opacity-50">Not affiliated with Nintendo or The Pokémon Company.</p>
      </footer>
    </div>
  );
};

export default App;