import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, ObstacleEntity, PlayerEntity } from '../types';
import { CANVAS_HEIGHT, CANVAS_WIDTH, GRAVITY, GROUND_HEIGHT, JUMP_STRENGTH, INITIAL_SPEED, PLAYER_POKEMON, ENEMY_POKEMON, PLAYER_SCALE, OBSTACLE_SCALE, MAX_SPEED } from '../constants';
import { fetchPokemonSprite, preloadImage } from '../services/pokeApi';

const PokeRunner: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Game Logic State (Refs for performance/mutability without re-renders)
  const gameStateRef = useRef<GameState>(GameState.LOADING);
  const scoreRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(INITIAL_SPEED);
  
  // Assets
  const playerSpriteRef = useRef<HTMLImageElement | null>(null);
  const enemySpritesRef = useRef<HTMLImageElement[]>([]);
  
  // Entities
  const playerRef = useRef<PlayerEntity>({
    y: CANVAS_HEIGHT - GROUND_HEIGHT - 96, // 96 is approx sprite size
    dy: 0,
    width: 60, // Hitbox width
    height: 60, // Hitbox height
    isJumping: false,
    jumpCount: 0,
    sprite: null
  });
  
  const obstaclesRef = useRef<ObstacleEntity[]>([]);

  // React State for UI overlays (Menu, Score, Game Over)
  const [uiState, setUiState] = useState<GameState>(GameState.LOADING);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // --- Initialization ---
  useEffect(() => {
    const loadAssets = async () => {
      try {
        // Load Player
        const playerUrl = await fetchPokemonSprite(PLAYER_POKEMON);
        const pImg = await preloadImage(playerUrl);
        playerSpriteRef.current = pImg;
        playerRef.current.sprite = pImg;

        // Load Enemies
        const enemyPromises = ENEMY_POKEMON.map(async (name) => {
          const url = await fetchPokemonSprite(name);
          return preloadImage(url);
        });
        const enemies = await Promise.all(enemyPromises);
        enemySpritesRef.current = enemies;

        gameStateRef.current = GameState.MENU;
        setUiState(GameState.MENU);
        
        // Initial Draw
        draw(); 
      } catch (err) {
        console.error("Failed to load assets", err);
      }
    };

    loadAssets();

    const storedHigh = localStorage.getItem('pokeRunnerHigh');
    if (storedHigh) setHighScore(parseInt(storedHigh));

    return () => cancelAnimationFrame(requestRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Game Loop Methods ---

  const spawnObstacle = () => {
    if (enemySpritesRef.current.length === 0) return;

    const randomSprite = enemySpritesRef.current[Math.floor(Math.random() * enemySpritesRef.current.length)];
    // Randomize size slightly
    const size = 32 * OBSTACLE_SCALE; 

    obstaclesRef.current.push({
      id: Date.now() + Math.random(),
      x: CANVAS_WIDTH,
      y: CANVAS_HEIGHT - GROUND_HEIGHT - size + 10, // +10 to align with "ground" visually
      width: size,
      height: size,
      sprite: randomSprite,
      passed: false
    });
  };

  const checkCollision = (p: PlayerEntity, o: ObstacleEntity) => {
    // Hitbox adjustments (make hitboxes smaller than sprites for forgiveness)
    const pPadding = 15;
    const oPadding = 10;

    // Player position (centered on sprite logic)
    const pLeft = 50 + pPadding; // Player is fixed at x=50
    const pRight = 50 + p.width - pPadding;
    const pTop = p.y + pPadding;
    const pBottom = p.y + p.height - oPadding;

    const oLeft = o.x + oPadding;
    const oRight = o.x + o.width - oPadding;
    const oTop = o.y + oPadding;
    const oBottom = o.y + o.height;

    return !(pRight < oLeft || pLeft > oRight || pBottom < oTop || pTop > oBottom);
  };

  const gameOver = () => {
    gameStateRef.current = GameState.GAMEOVER;
    setUiState(GameState.GAMEOVER);
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('pokeRunnerHigh', scoreRef.current.toString());
    }
  };

  const update = () => {
    if (gameStateRef.current !== GameState.PLAYING) return;

    const player = playerRef.current;
    
    // 1. Physics
    player.dy += GRAVITY;
    player.y += player.dy;

    // Floor collision
    const floorY = CANVAS_HEIGHT - GROUND_HEIGHT - (40 * PLAYER_SCALE); // Adjust for sprite size
    if (player.y > floorY) {
      player.y = floorY;
      player.dy = 0;
      player.isJumping = false;
      player.jumpCount = 0;
    }

    // 2. Obstacles
    // Increase speed slowly over time
    if (frameRef.current % 600 === 0 && gameSpeedRef.current < MAX_SPEED) {
      gameSpeedRef.current += 0.5;
    }

    // Spawn logic
    const currentSpeed = gameSpeedRef.current;
    // Spawn roughly every 90-150 frames depending on randomness
    if (frameRef.current % Math.floor(100 + Math.random() * 50) === 0) {
      spawnObstacle();
    }

    // Move & Clean obstacles
    obstaclesRef.current.forEach(obs => {
      obs.x -= currentSpeed;
    });

    // Remove off-screen
    if (obstaclesRef.current.length > 0 && obstaclesRef.current[0].x < -100) {
      obstaclesRef.current.shift();
    }

    // 3. Collision & Score
    for (const obs of obstaclesRef.current) {
      if (checkCollision(player, obs)) {
        gameOver();
        return; // Stop update
      }
      
      // Score increment if passed
      if (!obs.passed && obs.x + obs.width < 50) {
        obs.passed = true;
        scoreRef.current += 10;
        setScore(scoreRef.current); // Sync with React state for UI
      }
    }

    frameRef.current++;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // --- Background ---
    // Sky
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Distant Mountains (Parallax-ish static)
    ctx.fillStyle = '#5F9EA0';
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT);
    ctx.lineTo(150, 150);
    ctx.lineTo(300, CANVAS_HEIGHT - GROUND_HEIGHT);
    ctx.lineTo(450, 100);
    ctx.lineTo(600, CANVAS_HEIGHT - GROUND_HEIGHT);
    ctx.lineTo(800, 200);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT);
    ctx.fill();

    // Ground
    ctx.fillStyle = '#8B4513'; // Dirt
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
    ctx.fillStyle = '#228B22'; // Grass top
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, 10);

    // --- Obstacles ---
    obstaclesRef.current.forEach(obs => {
      // Draw shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.width/2, obs.y + obs.height - 5, obs.width/2, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Sprite
      ctx.drawImage(obs.sprite, obs.x, obs.y, obs.width, obs.height);
    });

    // --- Player ---
    const p = playerRef.current;
    if (p.sprite) {
      const spriteSize = 32 * PLAYER_SCALE;
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(50 + spriteSize/2, p.y + spriteSize - 5, 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Sprite
      ctx.save();
      // Simple squash/stretch animation
      if (p.isJumping) {
         // Slightly stretch when jumping
         ctx.drawImage(p.sprite, 50, p.y, spriteSize, spriteSize * 1.1);
      } else {
         // Run bobbing
         const bob = Math.sin(frameRef.current * 0.2) * 3;
         ctx.drawImage(p.sprite, 50, p.y + bob, spriteSize, spriteSize);
      }
      ctx.restore();
    }

    // --- Score (In-game draw if needed, but we use React overlay) ---
  };

  const loop = useCallback(() => {
    update();
    draw();
    if (gameStateRef.current === GameState.PLAYING) {
      requestRef.current = requestAnimationFrame(loop);
    }
  }, []);

  // --- Input Handlers ---

  const handleJump = useCallback(() => {
    if (gameStateRef.current !== GameState.PLAYING) return;

    const p = playerRef.current;
    // Allow double jump
    if (p.jumpCount < 2) {
      p.dy = JUMP_STRENGTH;
      p.isJumping = true;
      p.jumpCount++;
    }
  }, []);

  const startGame = () => {
    // Reset state
    scoreRef.current = 0;
    setScore(0);
    frameRef.current = 0;
    gameSpeedRef.current = INITIAL_SPEED;
    obstaclesRef.current = [];
    
    // Reset player
    const floorY = CANVAS_HEIGHT - GROUND_HEIGHT - (40 * PLAYER_SCALE);
    playerRef.current.y = floorY;
    playerRef.current.dy = 0;
    playerRef.current.jumpCount = 0;

    gameStateRef.current = GameState.PLAYING;
    setUiState(GameState.PLAYING);
    loop();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent scrolling
        if (gameStateRef.current === GameState.PLAYING) {
          handleJump();
        } else if (gameStateRef.current !== GameState.LOADING) {
          startGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJump, loop]);

  // Handle Touch/Click
  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (gameStateRef.current === GameState.PLAYING) {
      handleJump();
    }
  };

  return (
    <div className="relative group select-none">
      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block bg-sky-300 rounded-lg shadow-2xl border-4 border-slate-700 w-full max-w-4xl mx-auto cursor-pointer"
        onMouseDown={handleCanvasClick}
        onTouchStart={handleCanvasClick}
      />

      {/* UI Overlay Layer */}
      <div className="absolute top-4 left-4 right-4 flex justify-between px-4 font-bold text-2xl text-white drop-shadow-md pointer-events-none">
        <div>SCORE: {score.toString().padStart(5, '0')}</div>
        <div>HI: {highScore.toString().padStart(5, '0')}</div>
      </div>

      {/* Game State Overlays */}
      {uiState === GameState.LOADING && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
          <div className="text-white text-3xl animate-pulse">CATCHING POKEMON...</div>
        </div>
      )}

      {uiState === GameState.MENU && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-lg backdrop-blur-sm">
          <h1 className="text-6xl text-yellow-400 mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">POKÉ-RUNNER</h1>
          <p className="text-2xl mb-8">Press SPACE or CLICK to Jump</p>
          <button 
            onClick={startGame}
            className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1 transition-all text-2xl"
          >
            START GAME
          </button>
        </div>
      )}

      {uiState === GameState.GAMEOVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg backdrop-blur-sm">
          <h2 className="text-5xl text-red-500 mb-2 drop-shadow-md">GAME OVER</h2>
          <p className="text-3xl text-white mb-6">Final Score: {score}</p>
          <button 
            onClick={startGame}
            className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded shadow-[0_4px_0_rgb(30,58,138)] active:shadow-none active:translate-y-1 transition-all text-2xl"
          >
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
};

export default PokeRunner;