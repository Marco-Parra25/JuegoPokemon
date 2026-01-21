import React, { useState, useEffect, useRef } from 'react';
import { PokemonSelector } from './components/PokemonSelector';
import { GameCanvas } from './components/GameCanvas';
import { IntroSequence } from './components/IntroSequence';
import { PokemonDetails, GameState } from './types';
import { getLastPokemon, getHighScore, saveHighScore } from './utils/storage';

const MUSIC_URL = 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/race2.ogg';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'intro' | 'menu' | 'playing' | 'gameover'>('intro');
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDetails | null>(null);
  const [score, setScore] = useState(0);
  const [oilCount, setOilCount] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Audio State
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Dialog System
  const [dialogue, setDialogue] = useState<{text: string, mood: 'angry' | 'laugh' | 'alert'} | null>(null);
  const dialogueTimeoutRef = useRef<number | null>(null);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio(MUSIC_URL);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4;
    
    // Cleanup
    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    };
  }, []);

  // Audio Control Logic
  useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.muted = isMuted;

      if (gameState === 'playing') {
          // Intentar reproducir solo si estamos jugando
          const playPromise = audio.play();
          if (playPromise !== undefined) {
              playPromise.catch(error => {
                  console.log("Audio play prevented:", error);
              });
          }
      } else {
          audio.pause();
          if (gameState === 'gameover' || gameState === 'menu') {
              audio.currentTime = 0;
          }
      }
  }, [gameState, isMuted]);

  useEffect(() => {
    const last = getLastPokemon();
    if (last) setSelectedPokemon(last);
    setHighScore(getHighScore());
    document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }, []);

  const handleIntroComplete = () => {
    setGameState('menu');
  };

  const startGame = (pokemon: PokemonDetails) => {
    setSelectedPokemon(pokemon);
    setScore(0);
    setOilCount(0);
    setGameState('playing');
    // Diálogo de guía inicial
    handleShowDialogue("¡Misión: Recolecta PETRÓLEO y alcanza a MADURO!", 'alert');
  };

  const handleShowDialogue = (text: string, mood: 'angry' | 'laugh' | 'alert' = 'alert') => {
      if (dialogueTimeoutRef.current) clearTimeout(dialogueTimeoutRef.current);
      setDialogue({ text, mood });
      // Auto hide after 4 seconds
      dialogueTimeoutRef.current = window.setTimeout(() => {
          setDialogue(null);
      }, 4000);
  };

  const handleGameOver = (finalScore: number) => {
    setGameState('gameover');
    setScore(finalScore);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      saveHighScore(finalScore);
    }
    setDialogue(null);
  };

  return (
    <div className="w-full h-[100dvh] overflow-hidden bg-black font-mono text-green-500 relative select-none">
      
      {gameState === 'intro' && <IntroSequence onComplete={handleIntroComplete} />}

      {gameState === 'menu' && <PokemonSelector onSelect={startGame} initialPokemon={selectedPokemon} />}

      {gameState === 'playing' && selectedPokemon && (
        <div className="relative w-full h-full">
          
          {/* --- HUD --- */}
          <div className="absolute top-0 left-0 w-full p-2 md:p-4 z-10 flex justify-between items-start pointer-events-none">
             
             {/* LEFT SIDE: SCORE & RECORD */}
             <div className="flex flex-col gap-1 md:gap-2">
                 {/* Current Distance */}
                 <div className="bg-black/80 border-l-4 border-green-500 pl-4 pr-8 py-2 skew-x-[-10deg] shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
                     <div className="flex flex-col skew-x-[10deg]">
                        <div className="text-[10px] text-green-400 font-bold uppercase tracking-widest leading-none mb-1">DISTANCIA</div>
                        <div className="text-3xl md:text-4xl font-black text-white leading-none drop-shadow-[0_2px_0_rgba(0,0,0,1)]">
                            {score.toString().padStart(5, '0')}
                            <span className="text-sm md:text-lg text-gray-500 ml-1">m</span>
                        </div>
                     </div>
                 </div>
                 
                 {/* High Score */}
                 <div className="self-start bg-gray-900/90 border-l-4 border-yellow-600 pl-3 pr-4 py-1 skew-x-[-10deg] -mt-1 ml-2">
                     <div className="text-[9px] md:text-[10px] text-yellow-500 font-bold uppercase tracking-wider skew-x-[10deg]">
                         RÉCORD: <span className="text-white">{Math.max(score, highScore)}m</span>
                     </div>
                 </div>
             </div>
             
             {/* CENTER: MUSIC TOGGLE (Pointer events re-enabled) */}
             <div className="absolute left-1/2 -translate-x-1/2 top-4 pointer-events-auto">
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`
                        p-2 rounded-full border-2 transition-all shadow-lg active:scale-95
                        ${isMuted ? 'bg-red-900/80 border-red-500 text-red-400' : 'bg-green-900/80 border-green-400 text-green-400 animate-pulse'}
                    `}
                >
                    {isMuted ? (
                        <span className="text-xl">🔇</span> 
                    ) : (
                        <span className="text-xl">🔊</span>
                    )}
                </button>
             </div>

             {/* RIGHT SIDE: OIL & HERO */}
             <div className="flex items-start gap-2 md:gap-4">
                 {/* Oil Counter */}
                 <div className="flex flex-col items-end mt-1">
                     <div className="bg-black/80 border-r-4 border-yellow-500 pr-4 pl-8 py-2 skew-x-[10deg] shadow-[-4px_4px_0_rgba(0,0,0,0.5)]">
                        <div className="flex flex-col items-end skew-x-[-10deg]">
                            <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest leading-none mb-1">PETRÓLEO</div>
                            <div className="flex items-center gap-2">
                                {/* Added grayscale filter for "Black Oil" effect */}
                                <span className="text-xl md:text-2xl animate-pulse grayscale brightness-75 contrast-125 drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]">🛢️</span>
                                <div className="text-3xl md:text-4xl font-black text-white leading-none drop-shadow-[0_2px_0_rgba(0,0,0,1)]">
                                    {oilCount}
                                </div>
                            </div>
                        </div>
                     </div>
                 </div>

                 {/* Character Portrait */}
                 <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
                     {/* Circular Frame */}
                     <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-900 rounded-full border-[3px] border-white overflow-hidden z-10 box-border">
                         <div className="w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)]"></div>
                         <img 
                            src={selectedPokemon.sprites.front_default || ''} 
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[110%] h-[110%] object-contain image-pixelated"
                            alt="Hero"
                         />
                     </div>
                     {/* Badge */}
                     <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded-sm border border-red-800 z-20 whitespace-nowrap shadow-sm uppercase">
                         AGENTE
                     </div>
                     {/* Tech Ring Decoration */}
                     <div className="absolute -inset-1 border border-blue-400/30 rounded-full animate-spin-slow"></div>
                 </div>
             </div>
          </div>

          {/* --- DIALOGUE GUI OVERLAY --- */}
          {dialogue && (
              <div className="absolute bottom-10 left-0 w-full flex justify-center z-20 px-4 pointer-events-none animate-in slide-in-from-bottom-10 fade-in duration-300">
                  <div className={`
                      max-w-2xl w-full bg-black/90 border-4 relative p-4 flex items-center gap-4 shadow-[0_0_30px_rgba(0,0,0,0.8)]
                      ${dialogue.mood === 'angry' ? 'border-red-600' : dialogue.mood === 'laugh' ? 'border-yellow-500' : 'border-blue-500'}
                  `}>
                      {/* Character Portrait (Maduro caricature representation) */}
                      <div className={`
                          w-20 h-20 shrink-0 border-2 overflow-hidden bg-gray-800 relative
                          ${dialogue.mood === 'angry' ? 'border-red-500 bg-red-900/30' : 'border-white'}
                      `}>
                          {/* Simple CSS Face for GUI */}
                          <div className="w-full h-full relative">
                              <div className="absolute top-2 left-0 w-full h-full bg-[#d4a373] transform scale-75 rounded-full border-2 border-black"></div>
                              <div className="absolute top-6 left-2 w-16 h-4 bg-black rotate-[-10deg]"></div> {/* Moustache */}
                              <div className="absolute top-4 left-4 w-2 h-2 bg-black rounded-full"></div> {/* Eye */}
                              <div className="absolute top-4 right-4 w-2 h-2 bg-black rounded-full"></div> {/* Eye */}
                              <div className="absolute top-2 left-2 w-16 h-6 bg-black rounded-t-lg"></div> {/* Hair */}
                              {dialogue.mood === 'angry' && <div className="absolute inset-0 bg-red-500/20 animate-pulse"></div>}
                          </div>
                      </div>

                      {/* Text */}
                      <div className="flex-1">
                          <div className={`text-xs font-bold uppercase mb-1 tracking-widest ${dialogue.mood === 'angry' ? 'text-red-500' : 'text-yellow-500'}`}>
                              {dialogue.mood === 'alert' ? 'SISTEMA' : 'SUPER BIGOTE DICE:'}
                          </div>
                          <p className="text-white font-bold text-lg md:text-xl leading-tight drop-shadow-md font-sans">
                              "{dialogue.text}"
                          </p>
                      </div>

                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-white"></div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-white"></div>
                  </div>
              </div>
          )}

          <GameCanvas 
            pokemon={selectedPokemon} 
            onGameOver={handleGameOver}
            onScoreUpdate={setScore}
            onOilUpdate={setOilCount}
            onShowDialogue={handleShowDialogue}
          />
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="border-2 border-red-800 p-8 w-full max-w-md bg-black relative shadow-[0_0_20px_rgba(220,38,38,0.3)]">
            
            <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse"></div>
            
            <h2 className="text-4xl font-bold text-red-600 mb-6 text-center glitch-text tracking-tighter" data-text="TE EXPROPIARON">
              TE EXPROPIARON
            </h2>
            
            <div className="text-center mb-6 text-gray-400 italic">
                "¡Ese Pokémon ahora es propiedad del pueblo!"
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                <div className="border border-gray-800 p-3 bg-gray-900">
                    <div className="text-gray-500 text-xs uppercase">Distancia Recorrida</div>
                    <div className="text-2xl text-white font-bold">{score}m</div>
                </div>
                <div className="border border-gray-800 p-3 bg-gray-900">
                    <div className="text-gray-500 text-xs uppercase">Petróleo Rescatado</div>
                    <div className="text-2xl text-yellow-500 font-bold">{oilCount}</div>
                </div>
            </div>
            
            <button 
                onClick={() => setGameState('playing')}
                className="w-full bg-red-600 text-white py-4 mb-3 hover:bg-red-500 transition-all uppercase tracking-widest font-black text-xl shadow-[0_4px_0_#7f1d1d] active:translate-y-1 active:shadow-none"
            >
                INTENTAR DE NUEVO
            </button>
            <button 
                onClick={() => setGameState('menu')}
                className="w-full border-2 border-gray-700 text-gray-400 py-3 hover:border-gray-500 hover:text-white transition-colors uppercase tracking-widest text-xs"
            >
                VOLVER AL MENÚ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;