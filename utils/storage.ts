import { PokemonDetails } from '../types';

const LAST_POKEMON_KEY = 'pokerunner_last_pokemon';
const HIGH_SCORE_KEY = 'pokerunner_highscore';

export const saveLastPokemon = (pokemon: PokemonDetails) => {
  try {
    localStorage.setItem(LAST_POKEMON_KEY, JSON.stringify(pokemon));
  } catch (e) {
    console.error("Storage failed", e);
  }
};

export const getLastPokemon = (): PokemonDetails | null => {
  try {
    const data = localStorage.getItem(LAST_POKEMON_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const saveHighScore = (score: number) => {
  const current = getHighScore();
  if (score > current) {
    localStorage.setItem(HIGH_SCORE_KEY, score.toString());
  }
};

export const getHighScore = (): number => {
  return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
};
