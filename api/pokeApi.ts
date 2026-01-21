import { PokemonDetails, PokemonSummary } from '../types';

const BASE_URL = 'https://pokeapi.co/api/v2';
const CACHE_KEY_LIST = 'pokerunner_list_cache';
const CACHE_KEY_DETAILS_PREFIX = 'pokerunner_detail_';

const memoryCache: Map<string, any> = new Map();

export const getPokemonList = async (): Promise<PokemonSummary[]> => {
  if (memoryCache.has(CACHE_KEY_LIST)) {
    return memoryCache.get(CACHE_KEY_LIST);
  }

  try {
    const response = await fetch(`${BASE_URL}/pokemon?limit=151`);
    if (!response.ok) return [];

    const text = await response.text();
    
    // Check for empty or non-JSON text responses (e.g. "OK")
    if (!text || text.trim().toUpperCase() === 'OK') {
      return [];
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.warn('API returned invalid JSON for list', text.substring(0, 50));
        return [];
    }
    
    if (!data.results) return [];

    const list = data.results.map((p: any, index: number) => ({
      name: p.name,
      url: p.url,
      id: index + 1
    }));

    memoryCache.set(CACHE_KEY_LIST, list);
    return list;
  } catch (error) {
    console.error("Error al obtener lista de Pokémon", error);
    return [];
  }
};

export const getPokemonDetails = async (identifier: string | number): Promise<PokemonDetails | null> => {
  const cleanId = typeof identifier === 'string' ? identifier.toLowerCase().trim() : identifier;
  const cacheKey = `${CACHE_KEY_DETAILS_PREFIX}${cleanId}`;
  
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  try {
    const response = await fetch(`${BASE_URL}/pokemon/${cleanId}`);
    if (!response.ok) return null;
    
    const text = await response.text();

    // Fix: Handle cases where API or Proxy returns plain "OK" or empty body
    if (!text || text.trim().toUpperCase() === 'OK') {
        console.warn(`Received empty/text response for ${cleanId}`);
        return null;
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.warn(`Invalid JSON for ${cleanId}: ${text.substring(0, 50)}...`);
        return null;
    }

    if (!data || !data.sprites) {
        console.warn(`Incomplete data for ${cleanId}`);
        return null;
    }

    const details: PokemonDetails = {
      id: data.id,
      name: data.name,
      height: data.height, // PokeAPI devuelve altura en decímetros (10dm = 1m)
      sprites: data.sprites, // API returns the full structure needed
      types: data.types,
    };

    memoryCache.set(cacheKey, details);
    return details;
  } catch (error) {
    console.error(`Error al obtener detalles de ${cleanId}`, error);
    return null;
  }
};