import React, { useState, useEffect } from 'react';

interface Props {
  onComplete: () => void;
}

const LINES = [
  { text: "CARACAS, AÑO 2026...", delay: 2000, style: "text-white font-bold" },
  { text: "LA INFLACIÓN HA SUPERADO EL 1.000.000%", delay: 2500, style: "text-red-500" },
  { text: "EL SUMINISTRO DE AREPAS ES CRÍTICO.", delay: 2000, style: "text-yellow-400" },
  { text: "SOLO UN HÉROE PUEDE RECUPERAR EL PETRÓLEO.", delay: 2500, style: "text-blue-400" },
  { text: "MISIÓN: EN BÚSQUEDA DE MADURO", delay: 3000, style: "text-red-600 font-black text-3xl glitch-text", glitch: true },
  { text: "INICIALIZANDO POKÉDEX DE COMBATE...", delay: 2000, style: "text-green-500" }
];

export const IntroSequence: React.FC<Props> = ({ onComplete }) => {
  const [currentLine, setCurrentLine] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (currentLine >= LINES.length) {
      setTimeout(onComplete, 1000);
      return;
    }

    const targetLine = LINES[currentLine];
    let charIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (charIndex <= targetLine.text.length) {
        setDisplayText(targetLine.text.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        setTimeout(() => {
          setCurrentLine(prev => prev + 1);
          setDisplayText("");
          setIsTyping(true);
        }, targetLine.delay);
      }
    }, 45); 

    return () => clearInterval(typeInterval);
  }, [currentLine, onComplete]);

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center p-8 font-mono">
      <div className="max-w-4xl w-full text-center">
        
        <div className="min-h-[200px] flex items-center justify-center">
            {currentLine < LINES.length && (
                <h1 
                  className={`text-xl md:text-5xl tracking-tight uppercase ${LINES[currentLine].style}`}
                  data-text={LINES[currentLine].glitch ? LINES[currentLine].text : undefined}
                >
                    {displayText}
                    <span className="animate-pulse inline-block w-3 h-8 bg-white ml-2 align-middle"></span>
                </h1>
            )}
        </div>
        
        {/* Barra de carga estilo retro */}
        <div className="mt-20 w-full max-w-lg mx-auto h-4 border-2 border-white p-0.5 rounded-sm">
            <div 
                className="h-full bg-white transition-all duration-300 ease-linear"
                style={{ width: `${(currentLine / LINES.length) * 100}%` }}
            ></div>
        </div>
        <div className="text-center text-xs text-gray-500 mt-4 uppercase tracking-[0.3em]">
            Cargando Simulación...
        </div>

      </div>
      
      <button 
        onClick={onComplete}
        className="absolute bottom-8 right-8 text-xs text-gray-600 hover:text-white uppercase tracking-[0.2em] transition-colors border border-gray-700 px-4 py-2 rounded"
      >
        SALTAR INTRO
      </button>
    </div>
  );
};