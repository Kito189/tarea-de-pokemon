export interface SpriteAsset {
  name: string;
  image: HTMLImageElement;
}

export interface GameConfig {
  gravity: number;
  jumpStrength: number;
  groundHeight: number;
  gameSpeed: number;
  spawnRate: number; // Frames between spawns
}

export interface PlayerEntity {
  y: number;
  dy: number; // Vertical velocity
  width: number;
  height: number;
  isJumping: boolean;
  jumpCount: number;
  sprite: HTMLImageElement | null;
}

export interface ObstacleEntity {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  sprite: HTMLImageElement;
  passed: boolean; // For scoring
}

export enum GameState {
  LOADING = 'LOADING',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}