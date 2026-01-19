export const fetchPokemonSprite = async (nameOrId: string | number): Promise<string> => {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`);
    if (!response.ok) {
      throw new Error('Pokemon not found');
    }
    const data = await response.json();
    // Prefer the 'front_default' sprite. 
    // We could use 'versions["generation-v"]["black-white"].animated.front_default' for gifs, 
    // but Canvas handles static images better for performance in this context.
    return data.sprites.front_default;
  } catch (error) {
    console.error(`Error fetching pokemon ${nameOrId}:`, error);
    // Fallback placeholder if API fails
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'; 
  }
};

export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};