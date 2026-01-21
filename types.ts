export interface PokemonSummary {
  name: string;
  url: string;
  id: number;
}

export interface PokemonDetails {
  id: number;
  name: string;
  height: number; // Altura en decímetros
  sprites: {
    front_default: string | null;
    back_default: string | null;
    other?: {
      'official-artwork': {
        front_default: string | null;
      };
      'home': {
        front_default: string | null;
      };
      'showdown': {
        front_default: string | null;
        back_default: string | null;
      };
    };
  };
  types: Array<{
    type: {
      name: string;
    };
  }>;
}

export interface GameState {
  status: 'menu' | 'playing' | 'gameover';
  score: number;
  highScore: number;
  speed: number;
  oilCount: number;
}

export type Lane = 0 | 1 | 2; // Izquierda, Centro, Derecha

export interface Obstacle {
  id: string;
  lane: Lane;
  distance: number;
  type: 'rock' | 'bush' | 'electrode' | 'graveler' | 'crate' | 'snorlax' | 'geodude' | 'diglett' | 'sudowoodo' | 'oil_drop' | 'onix' | 'steelix';
}