import React, { useState, useEffect } from 'react';
import { PokemonDetails } from '../types';
import { getPokemonDetails } from '../api/pokeApi';
import { saveLastPokemon } from '../utils/storage';

interface Props {
  onSelect: (pokemon: PokemonDetails) => void;
  initialPokemon: PokemonDetails | null;
}

const QUICK_PICKS = ['Pikachu', 'Charmander', 'Squirtle', 'Bulbasaur', 'Gengar', 'Mewtwo', 'Lucario', 'Machamp', 'Snorlax', 'Charizard'];

export const PokemonSelector: React.FC<Props> = ({ onSelect, initialPokemon }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PokemonDetails | null>(initialPokemon);
  const [loading, setLoading] = useState(false);
  const [quickPickDetails, setQuickPickDetails] = useState<PokemonDetails[]>([]);

  useEffect(() => {
    const loadQuickPicks = async () => {
        const promises = QUICK_PICKS.map(name => getPokemonDetails(name.toLowerCase()));
        const results = await Promise.all(promises);
        setQuickPickDetails(results.filter((p): p is PokemonDetails => p !== null));
        if (!selected && results[1]) setSelected(results[1]); // Default to Charmander if none
    };
    loadQuickPicks();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return;
    setLoading(true);
    const details = await getPokemonDetails(search.toLowerCase());
    setLoading(false);
    if (details) setSelected(details);
  };

  return (
    <div className="min-h-[100dvh] bg-[#1a1a2e] flex items-center justify-center p-4 overflow-y-auto">
      
      {/* --- POKEDEX CONTAINER --- */}
      <div className="w-full max-w-lg bg-[#dc2626] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-b-8 border-r-8 border-[#991b1b] relative flex flex-col overflow-hidden">
        
        {/* TOP HEADER (Lente y Luces) */}
        <div className="bg-[#dc2626] border-b-4 border-[#991b1b] p-5 relative flex items-start justify-between gap-2 shadow-md z-10 min-h-[130px]">
            {/* Left Side: Lens & Lights */}
            <div className="flex flex-col gap-3 shrink-0 z-20">
                {/* Lente Azul Grande */}
                <div className="w-16 h-16 rounded-full bg-blue-400 border-4 border-white shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.3)] relative overflow-hidden group">
                    <div className="absolute top-2 left-3 w-4 h-4 bg-white rounded-full opacity-60 blur-[1px]"></div>
                    <div className="absolute inset-0 bg-blue-300 opacity-0 group-hover:opacity-30 transition-opacity animate-pulse"></div>
                </div>
                
                {/* Luces Pequeñas */}
                <div className="flex gap-2 ml-1">
                    <div className="w-3 h-3 rounded-full bg-red-800 border border-red-900"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600 animate-pulse"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500 border border-green-700"></div>
                </div>
            </div>

            {/* Logo Texto (Ajustado para encajar mejor) */}
            <div className="flex-1 flex items-center justify-end z-20 pt-1">
                <h1 className="text-right font-black italic leading-[0.9] transform -skew-x-6">
                    <span className="text-yellow-400 text-2xl sm:text-3xl drop-shadow-[2px_2px_0_#000] block mb-1">
                        EN BÚSQUEDA
                    </span>
                    <span className="text-white text-4xl sm:text-5xl drop-shadow-[3px_3px_0_#000] block">
                        DE MADURO
                    </span>
                </h1>
            </div>
        </div>

        {/* MAIN BODY */}
        <div className="p-6 flex flex-col gap-6 bg-[#dc2626]">
            
            {/* SCREEN CONTAINER */}
            <div className="bg-gray-200 rounded-lg p-6 pb-2 clip-path-polygon shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2)]">
                <div className="flex justify-center gap-4 mb-2 opacity-50">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </div>

                {/* THE SCREEN */}
                <div className="aspect-video bg-[#111] border-4 border-[#4b5563] rounded shadow-[inset_0_0_20px_rgba(0,0,0,1)] relative overflow-hidden flex items-center justify-center">
                    
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

                    {loading ? (
                        <div className="text-green-500 font-mono animate-pulse">BUSCANDO DATOS...</div>
                    ) : selected ? (
                        <div className="relative z-10 flex flex-col items-center">
                            <img 
                                src={selected.sprites.other?.showdown?.front_default || selected.sprites.front_default || ''} 
                                className="h-32 w-32 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] image-pixelated"
                            />
                            <div className="mt-2 bg-black/80 px-4 py-1 rounded text-green-400 font-mono text-sm border border-green-900">
                                {selected.name.toUpperCase()}
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-600 font-mono">SELECCIONA UN POKÉMON</div>
                    )}

                    {/* Scanline */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-4 w-full animate-[scan_3s_linear_infinite] pointer-events-none"></div>
                </div>
            </div>

            {/* CONTROLS AREA */}
            <div className="bg-[#1f2937] p-2 rounded flex items-center shadow-inner">
                 <form onSubmit={handleSearch} className="flex-1 flex">
                     <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Nombre o Número..."
                        className="w-full bg-transparent text-green-500 font-mono px-2 py-1 focus:outline-none uppercase placeholder-gray-600"
                     />
                     <button type="submit" className="bg-green-700 hover:bg-green-600 text-white px-3 rounded text-xs font-bold transition-colors">
                        🔍
                     </button>
                 </form>
            </div>

            {/* QUICK SELECT GRID */}
            <div className="grid grid-cols-5 gap-2">
                {quickPickDetails.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setSelected(p)}
                        className={`
                            aspect-square rounded border-2 overflow-hidden bg-gray-800 transition-all
                            ${selected?.id === p.id 
                                ? 'border-yellow-400 scale-110 shadow-[0_0_10px_#facc15] z-10' 
                                : 'border-gray-600 opacity-60 hover:opacity-100 hover:border-gray-400'}
                        `}
                    >
                        <img src={p.sprites.front_default || ''} className="w-full h-full object-cover" />
                    </button>
                ))}
            </div>

            {/* INSTRUCTIONS PANEL */}
            <div className="bg-black/40 rounded border border-red-900 p-3 text-xs font-mono text-gray-300">
                <h3 className="text-yellow-400 font-bold mb-2 uppercase border-b border-red-800 pb-1">Instrucciones de Misión</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-white font-bold block mb-1">💻 PC</span>
                        <div className="flex items-center gap-1 mb-1">
                            <span className="bg-gray-700 px-1 rounded">←</span>
                            <span className="bg-gray-700 px-1 rounded">→</span>
                            <span>Moverse</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="bg-gray-700 px-1 rounded">ESPACIO</span>
                            <span>Saltar</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-white font-bold block mb-1">📱 MÓVIL</span>
                        <div className="mb-1">👆 Deslizar Lados</div>
                        <div>👆 Deslizar Arriba (Saltar)</div>
                    </div>
                </div>
            </div>

            {/* ACTION BUTTON */}
            <button
                onClick={() => selected && (saveLastPokemon(selected), onSelect(selected))}
                disabled={!selected}
                className="w-full bg-[#facc15] text-black font-black text-xl py-4 rounded-lg shadow-[0_4px_0_#b45309] active:shadow-none active:translate-y-[4px] transition-all hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider flex items-center justify-center gap-2"
            >
                ¡A CORRER! <span className="text-2xl">▶</span>
            </button>

        </div>
      </div>
    </div>
  );
};