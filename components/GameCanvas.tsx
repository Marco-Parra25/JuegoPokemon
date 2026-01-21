import React, { useRef, useEffect, useCallback } from 'react';
import { PokemonDetails, Lane, Obstacle } from '../types';

interface Props {
  pokemon: PokemonDetails;
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  onOilUpdate: (oil: number) => void;
  onShowDialogue: (text: string, mood: 'angry' | 'laugh' | 'alert') => void;
}

// --- CONFIGURATION ---
const MAX_SPEED = 80; 
const INITIAL_SPEED = 18; 
const SPEED_INCREMENT = 0.005; 
const SPAWN_DISTANCE = 4500; // Render distance
const PLAYER_DISTANCE = 300; // Player Z position
const GRAVITY = 3.8; 
const JUMP_FORCE = 45; 
const FAST_FALL_FORCE = -40;
const MAX_JUMP_TIME = 10; 
const HOLD_GRAVITY_MODIFIER = 0.45; 

// Spawning Configuration
const MIN_OBSTACLE_GAP = 700; 
const OBSTACLE_GAP_VARIANCE = 900; 
const SCENERY_GAP = 200;

interface Particle {
  id: number;
  lane: number;
  xOffset: number; 
  z: number;
  y: number; 
  vx: number; 
  vy: number; 
  life: number;
  color: string;
  size: number;
  type: 'dust' | 'spark' | 'floating_text';
  text?: string;
}

interface SceneryObject {
  id: string;
  side: -1 | 1; // -1 Left, 1 Right
  distance: number;
  type: 'palm_tree' | 'building_simple' | 'lamp_post' | 'billboard';
  offset: number; // Distance from road edge
  scaleVar: number;
  colorVar?: string;
}

// Background Assets (Generated Once)
const MOUNTAIN_POINTS_BACK = Array.from({ length: 20 }, () => Math.random());
const MOUNTAIN_POINTS_FRONT = Array.from({ length: 15 }, () => Math.random());
const CLOUDS = Array.from({ length: 6 }, (_, i) => ({
    x: Math.random() * 2000,
    y: Math.random() * 200,
    speed: 0.2 + Math.random() * 0.3,
    size: 60 + Math.random() * 80
}));

export const GameCanvas: React.FC<Props> = ({ pokemon, onGameOver, onScoreUpdate, onOilUpdate, onShowDialogue }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const gameStateRef = useRef({
    running: true,
    score: 0,
    oilCount: 0,
    speed: INITIAL_SPEED,
    distanceTraveled: 0,
    
    // Player Physics
    lane: 1 as Lane, 
    laneAnim: 1, 
    yVelocity: 0,
    yPos: 0, 
    isJumping: false,
    isJumpKeyHeld: false, 
    jumpTime: 0, 
    
    // Game Objects
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    scenery: [] as SceneryObject[],
    
    // Spawning State (Distance Based)
    obstacleCooldown: 0,
    sceneryCooldown: 0,
    lastDialogueDistance: 0,
    
    // Assets & Dimensions
    images: {
      player: new Image(),
      // Obstacle Images
      rock: new Image(),
      bush: new Image(),
      crate: new Image(),
      // Pokemon Obstacles (High Quality Sprites)
      geodude: new Image(),
      graveler: new Image(),
      snorlax: new Image(),
      sudowoodo: new Image(),
      diglett: new Image(),
      electrode: new Image(),
      onix: new Image(),
      steelix: new Image(),
    },
    canvasWidth: 0,
    canvasHeight: 0,
    laneWidth: 400, 
    maduroLane: 1, 
    maduroLaneAnim: 1,
    
    // Background State
    cloudOffset: 0
  });

  // Assets
  useEffect(() => {
    const images = gameStateRef.current.images;

    // Player Sprite
    if (images.player) {
        const src = pokemon.sprites.other?.showdown?.front_default || 
                    pokemon.sprites.other?.home?.front_default ||
                    pokemon.sprites.front_default;
        if (src) images.player.src = src;
    }

    // Static Items
    images.rock.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/hard-stone.png';
    images.bush.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/miracle-seed.png';
    images.crate.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png';

    // Pokemon Obstacles - Using "Home" sprites for 3D look
    images.geodude.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/74.png';
    images.graveler.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/75.png';
    images.snorlax.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/143.png';
    images.sudowoodo.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/185.png';
    images.diglett.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/50.png';
    images.electrode.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/101.png';
    images.onix.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/95.png';
    images.steelix.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/208.png';

  }, [pokemon]);

  // Input Handling
  const handleInput = useCallback((action: 'left' | 'right' | 'jump' | 'duck') => {
    const state = gameStateRef.current;
    if (!state.running) return;

    if (action === 'left') {
      if (state.lane > 0) state.lane = (state.lane - 1) as Lane;
    } else if (action === 'right') {
      if (state.lane < 2) state.lane = (state.lane + 1) as Lane;
    } else if (action === 'jump') {
      if (!state.isJumping) {
        state.isJumping = true;
        state.yVelocity = JUMP_FORCE;
        state.jumpTime = 0; 
      }
    } else if (action === 'duck') {
      if (state.isJumping && state.yPos > 20) {
        state.yVelocity = FAST_FALL_FORCE; 
        state.jumpTime = MAX_JUMP_TIME; 
      }
    }
  }, []);

  // Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') handleInput('left');
      if (e.key === 'ArrowRight' || e.key === 'd') handleInput('right');
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        gameStateRef.current.isJumpKeyHeld = true;
        handleInput('jump');
      }
      if (e.key === 'ArrowDown' || e.key === 's') handleInput('duck');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        gameStateRef.current.isJumpKeyHeld = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleInput]);

  // Touch Handling
  const touchStartRef = useRef<{x: number, y: number} | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    gameStateRef.current.isJumpKeyHeld = true; 
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    gameStateRef.current.isJumpKeyHeld = false; 
    if (!touchStartRef.current) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const diffY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const minSwipe = 30;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > minSwipe) handleInput(diffX > 0 ? 'right' : 'left');
    } else {
      if (Math.abs(diffY) > minSwipe) handleInput(diffY < 0 ? 'jump' : 'duck');
      else handleInput('jump');
    }
    touchStartRef.current = null;
  };

  // GAME LOOP
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      gameStateRef.current.canvasWidth = width;
      gameStateRef.current.canvasHeight = height;
      
      // Calculate dynamic lane width based on screen size
      gameStateRef.current.laneWidth = Math.min(450, width / 2.0); 
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let animationFrameId: number;

    const render = (time: number) => {
      const state = gameStateRef.current;
      const width = state.canvasWidth;
      const height = state.canvasHeight;
      const laneWidth = state.laneWidth;
      
      // --- DYNAMIC HORIZON ---
      const horizonY = height * 0.35;

      if (!state.running) return;

      // 1. UPDATE STATE
      state.speed = Math.min(MAX_SPEED, state.speed + SPEED_INCREMENT);
      state.score += 1;
      state.distanceTraveled += state.speed;
      state.cloudOffset += 0.2; // Slow moving clouds
      onScoreUpdate(Math.floor(state.score / 10));

      // Lane Smoothing
      const laneDiff = state.lane - state.laneAnim;
      state.laneAnim += laneDiff * 0.15; 
      
      // Maduro AI (Simple chase logic)
      if (Math.random() > 0.985) {
          state.maduroLane = Math.floor(Math.random() * 3);
      }
      state.maduroLaneAnim += (state.maduroLane - state.maduroLaneAnim) * 0.05;

      // Jump Physics
      if (state.isJumping) {
        let appliedGravity = GRAVITY;
        if (state.isJumpKeyHeld && state.jumpTime < MAX_JUMP_TIME && state.yVelocity > 0) {
             appliedGravity = GRAVITY * HOLD_GRAVITY_MODIFIER; 
             state.jumpTime++;
        }
        state.yVelocity -= appliedGravity;
        state.yPos += state.yVelocity;
        if (state.yPos <= 0) {
          state.yPos = 0; state.isJumping = false; state.yVelocity = 0;
        }
      }

      // Dialogues
      if (state.score > 200 && state.score - state.lastDialogueDistance > 1200) {
          if (Math.random() > 0.7) {
              const taunts = [
                  "¡NO PODRÁS CONTRA MI BIGOTE!",
                  "¡ESE PETRÓLEO ES MÍO!",
                  "¡SE LE VA A IR LA LUZ SI SIGUE ASÍ!",
                  "¡TE VOY A MANDAR AL HELICOIDE!",
                  "¡AQUÍ NO SE RINDE NADIE!"
              ];
              onShowDialogue(taunts[Math.floor(Math.random() * taunts.length)], 'angry');
              state.lastDialogueDistance = state.score;
          }
      }

      // --- SPAWNING LOGIC (Distance Based) ---
      
      // Scenery Spawning
      state.sceneryCooldown -= state.speed;
      if (state.sceneryCooldown <= 0) {
          spawnScenery(state, time);
          state.sceneryCooldown = SCENERY_GAP + Math.random() * SCENERY_GAP;
      }

      // Obstacle Spawning
      state.obstacleCooldown -= state.speed;
      if (state.obstacleCooldown <= 0) {
          spawnObstacle(state);
          state.obstacleCooldown = MIN_OBSTACLE_GAP + Math.random() * OBSTACLE_GAP_VARIANCE;
      }

      // --- UPDATE OBJECTS ---
      for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const obs = state.obstacles[i];
        obs.distance -= state.speed;

        // Collision Check
        if (obs.distance < PLAYER_DISTANCE + 80 && obs.distance > PLAYER_DISTANCE - 80) {
            if (Math.abs(state.laneAnim - obs.lane) < 0.6) { 
                if (obs.type === 'oil_drop') {
                     if (state.yPos < 140) { 
                         state.score += 500; 
                         state.oilCount += 1; 
                         onOilUpdate(state.oilCount);
                         
                         state.particles.push({ 
                             id: Math.random(), lane: obs.lane, xOffset: 0, z: PLAYER_DISTANCE, y: 120, vx:0, vy: 1, life: 1, 
                             color: '#facc15', size: 40, type: 'floating_text', text: '+1 PETRÓLEO' 
                         });
                         
                         state.obstacles.splice(i, 1); 
                         if (state.oilCount % 5 === 0) onShowDialogue("¡ESTÁN SAQUEANDO MIS RECURSOS!", 'angry');
                         continue; 
                     }
                } else if (state.yPos < 40) {
                     state.running = false;
                     onGameOver(Math.floor(state.score / 10));
                }
            }
        }
        if (obs.distance < -300) state.obstacles.splice(i, 1);
      }

      for (let i = state.scenery.length - 1; i >= 0; i--) {
          state.scenery[i].distance -= state.speed;
          if (state.scenery[i].distance < -600) state.scenery.splice(i, 1);
      }

      for (let i = state.particles.length - 1; i >= 0; i--) {
          state.particles[i].y += state.particles[i].vy;
          state.particles[i].life -= 0.02;
          if (state.particles[i].life <= 0) state.particles.splice(i, 1);
      }

      // --- RENDER ---
      
      // 1. Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#0f172a'); // Midnight Blue
      skyGrad.addColorStop(0.4, '#312e81'); // Indigo
      skyGrad.addColorStop(0.8, '#be185d'); // Pink/Red
      skyGrad.addColorStop(1, '#f59e0b'); // Sunset Orange
      ctx.fillStyle = skyGrad; 
      ctx.fillRect(0, 0, width, height);

      // 2. RETRO SUN
      const sunY = horizonY - height * 0.1;
      const sunSize = Math.min(width, height) * 0.25;
      
      const sunGlow = ctx.createRadialGradient(width/2, sunY + sunSize/2, sunSize/2, width/2, sunY + sunSize/2, sunSize * 1.5);
      sunGlow.addColorStop(0, 'rgba(251, 146, 60, 0.4)');
      sunGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, width, height);

      const sunGrad = ctx.createLinearGradient(0, sunY, 0, sunY + sunSize);
      sunGrad.addColorStop(0, '#facc15'); 
      sunGrad.addColorStop(1, '#f97316'); 
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width/2, sunY + sunSize/2, sunSize/2, 0, Math.PI * 2);
      ctx.fill();

      // Sun Stripes
      ctx.fillStyle = '#be185d'; 
      for(let i=0; i<6; i++) {
          const stripeH = sunSize * 0.02 * (i+1);
          const stripeY = sunY + sunSize/2 + (sunSize/2 * 0.3) + (i * sunSize * 0.08);
          if (stripeY < sunY + sunSize) {
            ctx.fillRect(width/2 - sunSize/2, stripeY, sunSize, stripeH);
          }
      }

      // 3. CLOUDS
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      CLOUDS.forEach(cloud => {
          const x = (cloud.x + state.cloudOffset * cloud.speed) % (width + 200) - 100;
          ctx.beginPath();
          ctx.ellipse(x, cloud.y, cloud.size, cloud.size * 0.6, 0, 0, Math.PI*2);
          ctx.fill();
      });

      // 4. MOUNTAINS
      // Back Layer
      ctx.fillStyle = '#1e1b4b'; 
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, horizonY);
      const peakWBack = width / (MOUNTAIN_POINTS_BACK.length - 1);
      MOUNTAIN_POINTS_BACK.forEach((h, i) => {
          const y = horizonY - 20 - h * 100; // Taller peaks
          ctx.lineTo(i * peakWBack, y);
      });
      ctx.lineTo(width, height);
      ctx.fill();

      // Front Layer
      ctx.fillStyle = '#312e81'; 
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, horizonY);
      const peakWFront = width / (MOUNTAIN_POINTS_FRONT.length - 1);
      MOUNTAIN_POINTS_FRONT.forEach((h, i) => {
          const y = horizonY - h * 50; // Lower peaks
          ctx.lineTo(i * peakWFront, y);
      });
      ctx.lineTo(width, height);
      ctx.fill();

      // 5. Ground
      ctx.fillStyle = '#064e3b'; // Darker green for contrast
      ctx.fillRect(0, horizonY, width, height - horizonY);

      // --- PROJECTION & GAMEPLAY RENDER ---
      
      const project = (xWorld: number, z: number, yWorld: number = 0) => {
        const cameraZ = 800; 
        const scale = cameraZ / (cameraZ + z);
        const centerX = width / 2;
        const groundY = horizonY + (height - horizonY - 50) * scale;
        const x = centerX + (xWorld * scale);
        const y = groundY - (yWorld * scale);
        return { x, y, scale, groundY };
      };

      // Draw Road
      const roadWidthWorld = laneWidth * 4; 
      const roadZStart = -200;
      const roadZEnd = SPAWN_DISTANCE;
      
      const lEnd = project(-roadWidthWorld/2, roadZEnd);
      const rEnd = project(roadWidthWorld/2, roadZEnd);
      const lStart = project(-roadWidthWorld/2, roadZStart);
      const rStart = project(roadWidthWorld/2, roadZStart);
      
      // Asphalt
      ctx.fillStyle = '#334155';
      ctx.beginPath(); 
      ctx.moveTo(lEnd.x, lEnd.y); 
      ctx.lineTo(rEnd.x, rEnd.y); 
      ctx.lineTo(rStart.x, rStart.y); 
      ctx.lineTo(lStart.x, lStart.y); 
      ctx.fill();

      // Curbs & Markings
      const curbSize = 400;
      const offsetCurb = state.distanceTraveled % (curbSize * 2);
      
      for (let z = roadZStart - offsetCurb; z < roadZEnd; z += curbSize) {
          if (z < -200) continue;
          const isRed = Math.floor(z / curbSize) % 2 === 0;
          
          // Draw Sidewalks
          ctx.fillStyle = isRed ? '#dc2626' : '#e2e8f0'; 
          const leftCurbX = -roadWidthWorld/2;
          const rightCurbX = roadWidthWorld/2;
          const curbW = 40;

          let p1 = project(leftCurbX - curbW, z);
          let p2 = project(leftCurbX - curbW, z + curbSize);
          let p3 = project(leftCurbX, z + curbSize);
          let p4 = project(leftCurbX, z);
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.fill();

          p1 = project(rightCurbX, z);
          p2 = project(rightCurbX, z + curbSize);
          p3 = project(rightCurbX + curbW, z + curbSize);
          p4 = project(rightCurbX + curbW, z);
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.fill();

          // Lane Lines
          if (isRed) {
              ctx.fillStyle = 'rgba(255,255,255,0.4)';
              const lineW = 10;
              [-0.5, 0.5].forEach(factor => {
                  const lineX = factor * laneWidth;
                  p1 = project(lineX - lineW, z);
                  p2 = project(lineX - lineW, z + curbSize * 0.5);
                  p3 = project(lineX + lineW, z + curbSize * 0.5);
                  p4 = project(lineX + lineW, z);
                  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.fill();
              });
          }
      }

      // Render Game Objects
      const getXForLane = (laneIdx: number) => (laneIdx - 1) * laneWidth;

      const renderList = [
          ...state.obstacles.map(o => ({
              ...o, typeStr: 'obstacle', z: o.distance, xWorld: getXForLane(o.lane)
          })),
          ...state.scenery.map(s => {
              const edgeX = roadWidthWorld / 2;
              const baseX = s.side === -1 ? -edgeX - s.offset : edgeX + s.offset;
              return { ...s, typeStr: 'scenery', z: s.distance, xWorld: baseX };
          })
      ];

      renderList.sort((a, b) => b.z - a.z);

      const maduroZ = PLAYER_DISTANCE + 700;
      const maduroX = getXForLane(state.maduroLaneAnim);
      let maduroDrawn = false;

      renderList.forEach(obj => {
          if (!maduroDrawn && obj.z < maduroZ) {
             const mPos = project(maduroX, maduroZ, 0);
             drawMaduroRunning(ctx, mPos.x, mPos.y, mPos.scale, time);
             maduroDrawn = true;
          }

          const { x, y, scale, groundY } = project(obj.xWorld, obj.z, 0);
          
          if (obj.typeStr === 'obstacle') {
              if (obj.z > PLAYER_DISTANCE - 150) {
                  drawObstacle(ctx, obj as any, x, groundY, 180 * scale, time, state.images);
              }
          } else {
              drawSceneryObject(ctx, obj as any, x, groundY, scale);
          }
      });

      if (!maduroDrawn) {
          const mPos = project(maduroX, maduroZ, 0);
          drawMaduroRunning(ctx, mPos.x, mPos.y, mPos.scale, time);
      }

      // Draw Player (ENHANCED 3D EFFECT)
      const playerX = getXForLane(state.laneAnim);
      const p = project(playerX, PLAYER_DISTANCE, state.yPos);
      const pSize = 160 * p.scale; 

      // Dynamic Shadow
      const shadowScale = Math.max(0.5, 1 - (state.yPos / 300)); 
      ctx.fillStyle = `rgba(0,0,0,${0.4 * shadowScale})`;
      const pGround = project(playerX, PLAYER_DISTANCE, 0);
      ctx.beginPath(); 
      ctx.ellipse(p.x, pGround.y, (pSize/2.5) * shadowScale, (pSize/8) * shadowScale, 0, 0, Math.PI*2); 
      ctx.fill();

      if (state.images.player.complete && state.images.player.src) {
          ctx.save();
          
          // PROCEDURAL ANIMATION SYSTEM
          
          // 1. LEANING: Tilt character when moving lanes
          // Calculate horizontal velocity approximation based on lane diff
          const leanAmount = (state.lane - state.laneAnim) * -15 * (Math.PI / 180);
          
          // 2. RUNNING BOUNCE
          const runFreq = 0.02;
          const bounceHeight = 20;
          const bounce = Math.abs(Math.sin(time * runFreq)) * bounceHeight;
          const drawY = p.y - pSize - bounce;
          
          // 3. SQUASH & STRETCH
          let scaleX = 1;
          let scaleY = 1;
          
          if (state.isJumping) {
              // Stretch when going up, Squash when falling/landing
              if (state.yVelocity > 0) {
                  scaleX = 0.9; scaleY = 1.1; // Stretch vertically
              } else {
                  scaleX = 1.1; scaleY = 0.9; // Squash vertically
              }
          } else {
              // Subtle squash during running bounce
              scaleY = 1 - (bounce / 200);
              scaleX = 1 + (bounce / 200);
          }
          
          // Apply Transformations
          ctx.translate(p.x, pGround.y); // Move origin to feet on ground
          ctx.translate(0, -state.yPos * p.scale); // Move up by jump height
          
          // Rotate around feet
          ctx.rotate(leanAmount);
          
          // Scale from bottom (feet)
          ctx.scale(scaleX, scaleY);
          
          // Draw Image (Offset so (0,0) is at bottom center of image)
          ctx.drawImage(state.images.player, -pSize/2, -pSize - bounce, pSize, pSize);
          
          ctx.restore();
      }

      // Draw Particles
      state.particles.forEach(pt => {
          const ptX = getXForLane(pt.lane) + pt.xOffset;
          const { x, y, scale } = project(ptX, pt.z, pt.y);
          if (pt.type === 'floating_text') {
              ctx.fillStyle = pt.color;
              ctx.strokeStyle = 'black';
              ctx.lineWidth = 3;
              ctx.font = `900 ${pt.size * scale}px "Arial Black"`;
              ctx.textAlign = 'center';
              ctx.strokeText(pt.text || '', x, y);
              ctx.fillText(pt.text || '', x, y);
          }
      });

      drawVignette(ctx, width, height);
      drawTrumpObserver(ctx, width, height, time);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [pokemon, onGameOver, onScoreUpdate, onOilUpdate, onShowDialogue]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full bg-slate-900 touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    />
  );
};

// --- HELPER FUNCTIONS ---

function spawnScenery(state: any, time: number) {
    const typeRoll = Math.random();
    let type: 'palm_tree' | 'building_simple' | 'lamp_post' | 'billboard' = 'palm_tree';
    
    if (typeRoll > 0.9) type = 'billboard';
    else if (typeRoll > 0.7) type = 'lamp_post';
    else if (typeRoll > 0.4) type = 'building_simple';

    const baseOffset = 50; 
    const variation = Math.random() * 200;
    const buildingColors = ['#f87171', '#fb923c', '#facc15', '#60a5fa', '#c084fc', '#94a3b8'];

    if (Math.random() > 0.3) {
      state.scenery.push({
          id: `scenery-l-${time}-${Math.random()}`,
          side: -1,
          distance: SPAWN_DISTANCE,
          type: type === 'billboard' ? 'palm_tree' : type,
          offset: baseOffset + variation, 
          scaleVar: 0.9 + Math.random() * 0.5,
          colorVar: buildingColors[Math.floor(Math.random() * buildingColors.length)]
      });
    }
    if (Math.random() > 0.3) {
      state.scenery.push({
          id: `scenery-r-${time}-${Math.random()}`,
          side: 1,
          distance: SPAWN_DISTANCE,
          type, 
          offset: baseOffset + variation,
          scaleVar: 0.9 + Math.random() * 0.5,
          colorVar: buildingColors[Math.floor(Math.random() * buildingColors.length)]
      });
    }
}

function spawnObstacle(state: any) {
    const lane = Math.floor(Math.random() * 3) as Lane;
    const rand = Math.random();
    
    // Updated Logic: Mixed Pokemon and Item Obstacles
    // Onix and Steelix are RARE boss obstacles (big and threatening)
    let type: 'snorlax' | 'electrode' | 'diglett' | 'geodude' | 'graveler' | 'sudowoodo' | 'crate' | 'rock' | 'bush' | 'onix' | 'steelix' = 'geodude';
    
    if (rand > 0.95) type = 'steelix';
    else if (rand > 0.90) type = 'onix';
    else if (rand > 0.82) type = 'snorlax';
    else if (rand > 0.74) type = 'graveler';
    else if (rand > 0.66) type = 'sudowoodo';
    else if (rand > 0.58) type = 'crate'; 
    else if (rand > 0.50) type = 'bush';  
    else if (rand > 0.42) type = 'rock';  
    else if (rand > 0.30) type = 'geodude'; 
    else if (rand > 0.15) type = 'electrode';
    else type = 'diglett'; 
    
    state.obstacles.push({ id: Math.random().toString(), lane, distance: SPAWN_DISTANCE, type });

    if (Math.random() > 0.4) {
        const bonusLane = (lane + 1) % 3 as Lane;
        state.obstacles.push({ 
            id: `oil-${Math.random()}`, 
            lane: bonusLane, 
            distance: SPAWN_DISTANCE + 50, 
            type: 'oil_drop' 
        });
    }
}

function drawSceneryObject(ctx: CanvasRenderingContext2D, obj: SceneryObject, x: number, bottomY: number, scale: number) {
    const s = scale * obj.scaleVar;
    
    if (obj.type === 'lamp_post') {
        const poleW = 12 * s;
        const poleH = 400 * s;
        ctx.fillStyle = '#475569';
        ctx.fillRect(x - poleW/2, bottomY - poleH, poleW, poleH);
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - poleW, bottomY - 30*s, poleW*2, 30*s);
        ctx.beginPath();
        ctx.moveTo(x, bottomY - poleH);
        ctx.quadraticCurveTo(x + 50*s, bottomY - poleH - 50*s, x + 100*s, bottomY - poleH + 20*s);
        ctx.lineWidth = poleW;
        ctx.strokeStyle = '#475569';
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.ellipse(x + 100*s, bottomY - poleH + 30*s, 30*s, 15*s, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    } else if (obj.type === 'palm_tree') {
        const trunkW = 40 * s;
        const trunkH = 350 * s;
        ctx.fillStyle = '#78350f'; 
        let currentY = bottomY;
        while(currentY > bottomY - trunkH) {
            const segHeight = 30 * s;
            const segW = trunkW * (1 - (bottomY - currentY)/(trunkH * 2));
            ctx.beginPath();
            ctx.ellipse(x, currentY, segW/2, segHeight/2, 0, 0, Math.PI*2);
            ctx.fill();
            currentY -= segHeight * 0.8;
        }
        const topY = bottomY - trunkH;
        ctx.fillStyle = '#15803d'; 
        const leafCount = 7;
        for(let i=0; i<leafCount; i++) {
            ctx.beginPath();
            const angle = (Math.PI * 2 / leafCount) * i + Math.random()*0.5;
            const len = 180 * s;
            ctx.moveTo(x, topY);
            ctx.bezierCurveTo(
                x + Math.cos(angle)*len*0.5, topY - 100*s, 
                x + Math.cos(angle)*len, topY - 50*s,
                x + Math.cos(angle)*len*1.2, topY + 80*s
            );
            ctx.lineWidth = 20 * s;
            ctx.strokeStyle = i % 2 === 0 ? '#16a34a' : '#15803d';
            ctx.stroke();
        }
    } else if (obj.type === 'building_simple') {
        const w = 250 * s;
        const actualH = (400 + (obj.id.charCodeAt(0) % 5) * 50) * s; 
        const color = obj.colorVar || '#cbd5e1';
        const roofDepth = 50 * s;
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        if (obj.side === -1) { 
            ctx.moveTo(x + w/2, bottomY);
            ctx.lineTo(x + w/2 + roofDepth, bottomY - 50*s);
            ctx.lineTo(x + w/2 + roofDepth, bottomY - actualH - 50*s);
            ctx.lineTo(x + w/2, bottomY - actualH);
        } else { 
            ctx.moveTo(x - w/2, bottomY);
            ctx.lineTo(x - w/2 - roofDepth, bottomY - 50*s);
            ctx.lineTo(x - w/2 - roofDepth, bottomY - actualH - 50*s);
            ctx.lineTo(x - w/2, bottomY - actualH);
        }
        ctx.fill();
        ctx.fillStyle = color; 
        ctx.fillRect(x - w/2, bottomY - actualH, w, actualH);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - w/2 - 10*s, bottomY - actualH, w + 20*s, 20*s);
        ctx.fillStyle = '#fef3c7';
        const rows = 6;
        const cols = 3;
        const padX = w / cols;
        const padY = actualH / rows;
        for(let r=1; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                if (Math.random() > 0.3) {
                    const wx = x - w/2 + (c * padX) + 15*s;
                    const wy = bottomY - actualH + (r * padY) + 10*s;
                    ctx.fillRect(wx, wy, padX - 30*s, padY - 20*s);
                }
            }
        }
    } else if (obj.type === 'billboard') {
        const poleH = 200 * s;
        const boardW = 200 * s;
        const boardH = 100 * s;
        ctx.fillStyle = '#525252';
        ctx.fillRect(x - 5*s, bottomY - poleH, 10*s, poleH);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - boardW/2, bottomY - poleH - boardH, boardW, boardH);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - boardW/2 + 5*s, bottomY - poleH - boardH + 5*s, boardW - 10*s, boardH - 10*s);
        ctx.fillStyle = '#ef4444';
        ctx.font = `bold ${20*s}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText("VOTA", x, bottomY - poleH - boardH/2);
    }
}

function drawMaduroRunning(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number) {
    const size = 300 * scale; 
    const runCycle = Math.sin(time * 0.025);
    const legSwing = runCycle * 40 * scale;
    const bounce = Math.abs(Math.cos(time * 0.025)) * 15 * scale;
    ctx.save();
    ctx.translate(x, y - size + bounce); 
    
    // --- NAME TAG (MOVED UP) ---
    const tagYOffset = -90 * scale; // Increased height significantly
    const tagW = 160 * scale;
    const tagH = 40 * scale;
    
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2 * scale;
    ctx.fillRect(-tagW/2, tagYOffset, tagW, tagH);
    ctx.strokeRect(-tagW/2, tagYOffset, tagW, tagH);
    
    ctx.fillStyle = 'white';
    ctx.font = `900 ${24*scale}px sans-serif`; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("MADURO", 0, tagYOffset + tagH/2);

    const YELLOW = '#facc15';
    const BLUE = '#1d4ed8';
    const RED = '#dc2626';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = BLUE; 
    ctx.lineWidth = 28 * scale;
    ctx.beginPath(); ctx.moveTo(10*scale, size*0.65); ctx.quadraticCurveTo(20*scale, size*0.8, legSwing, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10*scale, size*0.65); ctx.quadraticCurveTo(-20*scale, size*0.8, -legSwing, size); ctx.stroke();
    const bodyW = 120 * scale; 
    const bodyH = 130 * scale;
    const bodyGrad = ctx.createLinearGradient(0, size*0.1, 0, size*0.7);
    bodyGrad.addColorStop(0, YELLOW); 
    bodyGrad.addColorStop(0.5, BLUE); 
    bodyGrad.addColorStop(1, RED); 
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.ellipse(0, size*0.4, bodyW/2, bodyH/2, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'white'; ctx.lineWidth = 3*scale;
    ctx.beginPath(); ctx.moveTo(0, size*0.15); ctx.lineTo(0, size*0.65); ctx.stroke();
    const shoulderY = size * 0.25;
    ctx.strokeStyle = YELLOW; ctx.lineWidth = 26 * scale;
    ctx.beginPath(); ctx.moveTo(-bodyW*0.4, shoulderY); ctx.quadraticCurveTo(-bodyW*0.6, shoulderY + 30*scale, -bodyW*0.5 + legSwing, shoulderY + 60*scale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bodyW*0.4, shoulderY); ctx.quadraticCurveTo(bodyW*0.6, shoulderY + 30*scale, bodyW*0.5 - legSwing, shoulderY + 60*scale); ctx.stroke();
    ctx.fillStyle = '#d4a373';
    ctx.beginPath(); ctx.arc(-bodyW*0.5 + legSwing, shoulderY + 60*scale, 15*scale, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bodyW*0.5 - legSwing, shoulderY + 60*scale, 15*scale, 0, Math.PI*2); ctx.fill();
    const headSize = 55 * scale;
    const headY = size * 0.12;
    ctx.fillStyle = '#d4a373'; ctx.fillRect(-20*scale, headY, 40*scale, 30*scale);
    ctx.beginPath(); ctx.arc(0, headY, headSize, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); 
    ctx.moveTo(-35*scale, headY + 15*scale); 
    ctx.quadraticCurveTo(0, headY + 5*scale, 35*scale, headY + 15*scale);
    ctx.quadraticCurveTo(20*scale, headY + 35*scale, 0, headY + 25*scale);
    ctx.quadraticCurveTo(-20*scale, headY + 35*scale, -35*scale, headY + 15*scale);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.ellipse(-18*scale, headY - 10*scale, 10*scale, 8*scale, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(18*scale, headY - 10*scale, 10*scale, 8*scale, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'black';
    const eyeDir = Math.sin(time*0.01) * 2*scale;
    ctx.beginPath(); ctx.arc(-18*scale + eyeDir, headY - 10*scale, 4*scale, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(18*scale + eyeDir, headY - 10*scale, 4*scale, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(0, headY - 10*scale, headSize, Math.PI, 0); 
    ctx.lineTo(headSize, headY); ctx.lineTo(headSize-5*scale, headY+20*scale);
    ctx.lineTo(-headSize+5*scale, headY+20*scale); ctx.lineTo(-headSize, headY); 
    ctx.fill();
    ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle, x: number, bottomY: number, size: number, time: number, images: any) {
    const centerY = bottomY - size / 2;

    // --- OIL DROP (Programmatic) ---
    if (obs.type === 'oil_drop') {
        const dropWidth = size * 0.7;
        const dropHeight = size * 1.0;
        const dropY = centerY + Math.sin(time * 0.005) * (size * 0.1);
        
        // Shadow for Oil
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(x, bottomY, dropWidth/2, dropWidth/6, 0, 0, Math.PI*2); ctx.fill();

        ctx.save();
        ctx.translate(0, 0);
        ctx.beginPath(); ctx.moveTo(x, dropY - dropHeight/2); 
        ctx.bezierCurveTo(x + dropWidth/2, dropY, x + dropWidth/2, dropY + dropHeight/2, x, dropY + dropHeight/2);
        ctx.bezierCurveTo(x - dropWidth/2, dropY + dropHeight/2, x - dropWidth/2, dropY, x, dropY - dropHeight/2); ctx.closePath();
        
        // SHINY BLACK GRADIENT ("Oro Negro")
        const grad = ctx.createRadialGradient(x - dropWidth * 0.25, dropY - dropHeight * 0.25, dropWidth * 0.1, x, dropY, dropHeight);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)'); 
        grad.addColorStop(0.15, '#333333'); 
        grad.addColorStop(0.5, '#000000'); 
        grad.addColorStop(1, '#000000'); 

        ctx.fillStyle = grad; 
        ctx.fill();
        ctx.lineWidth = 1.5; 
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)'; 
        ctx.stroke();
        ctx.restore();
        return;
    }

    // --- IMAGE BASED OBSTACLES (Includes Rock, Bush, Crate AND POKEMON) ---
    
    // Determine image source based on type
    const img = images[obs.type];
    
    if (img && img.complete) {
        // Shared shadow for all sprite-based objects
        const shadowW = size * 0.9;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(x, bottomY, shadowW/2, shadowW/6, 0, 0, Math.PI*2); ctx.fill();
        
        // Bobbing animation for "alive" things
        let bob = 0;
        if (!['rock', 'bush', 'crate'].includes(obs.type)) {
            bob = Math.sin(time * 0.005 + x) * (size * 0.08);
        }

        // Special scaling for big bois
        let drawSize = size;
        let yOffset = 0;

        if (obs.type === 'onix' || obs.type === 'steelix') {
            drawSize = size * 2.2; // Massive
            yOffset = -size * 0.5;
        } else if (obs.type === 'snorlax') {
            drawSize = size * 1.3;
        } else if (obs.type === 'diglett') {
            drawSize = size * 0.8;
            yOffset = size * 0.2; // Move down into ground
        }
        
        // Draw the Sprite
        // We draw from bottom center
        const drawX = x - drawSize / 2;
        const drawY = bottomY - drawSize + bob + yOffset;
        
        ctx.drawImage(img, drawX, drawY, drawSize, drawSize);
    } else {
        // Fallback if image fails (Basic Sphere)
        ctx.fillStyle = 'red';
        ctx.beginPath(); ctx.arc(x, centerY, size/2, 0, Math.PI*2); ctx.fill();
    }
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, width * 0.4, width / 2, height / 2, width * 0.85);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

function drawTrumpObserver(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
    const size = Math.min(width, height) * 0.18;
    const x = width * 0.85;
    const y = height * 0.25;
    
    const hover = Math.sin(time * 0.002) * 10;
    
    ctx.save();
    ctx.translate(x, y + hover);
    
    // Halo / Glow
    const glow = ctx.createRadialGradient(0, 0, size * 0.4, 0, 0, size * 0.9);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI*2); ctx.fill();
    
    // Suit (Shoulders)
    ctx.fillStyle = '#0f172a'; // Navy Blue
    ctx.beginPath();
    ctx.ellipse(0, size*0.5, size*0.6, size*0.3, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Shirt Collar
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-size*0.2, size*0.3);
    ctx.lineTo(0, size*0.5);
    ctx.lineTo(size*0.2, size*0.3);
    ctx.lineTo(0, size*0.2);
    ctx.fill();

    // Red Tie (Long)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-size*0.08, size*0.35);
    ctx.lineTo(size*0.08, size*0.35);
    ctx.lineTo(size*0.04, size*0.8); // Very long tie
    ctx.lineTo(-size*0.04, size*0.8);
    ctx.fill();

    // Face Shape
    ctx.fillStyle = '#fb923c'; // Intense Orange
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.35, size * 0.42, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Hair (The Wave - More elaborate)
    ctx.fillStyle = '#facc15'; // Yellow
    ctx.beginPath();
    ctx.moveTo(-size*0.38, -size*0.2);
    // Swoop over forehead
    ctx.quadraticCurveTo(-size*0.45, -size*0.55, 0, -size*0.5);
    ctx.quadraticCurveTo(size*0.45, -size*0.55, size*0.35, -size*0.15);
    ctx.quadraticCurveTo(size*0.4, -size*0.05, size*0.35, 0.1);
    ctx.lineTo(size*0.28, -size*0.1);
    ctx.lineTo(-size*0.32, -size*0.1);
    ctx.fill();
    
    // Sideburns area
    ctx.beginPath();
    ctx.arc(-size*0.34, -size*0.1, size*0.05, 0, Math.PI*2);
    ctx.fill();

    // Eyes (White patches)
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-size*0.12, -size*0.05, size*0.08, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(size*0.12, -size*0.05, size*0.08, 0, Math.PI*2); ctx.fill();
    
    // Pupils (Small, looking at player)
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath(); ctx.arc(-size*0.14, -size*0.05, size*0.025, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(size*0.1, -size*0.05, size*0.025, 0, Math.PI*2); ctx.fill();
    
    // Mouth (Speaking - O shape)
    ctx.strokeStyle = '#9f1239';
    ctx.lineWidth = 3;
    const mouthState = Math.sin(time * 0.008);
    if (mouthState > 0) {
        ctx.beginPath(); ctx.ellipse(0, size*0.25, size*0.06, size*0.04, 0, 0, Math.PI*2); ctx.stroke();
    } else {
        ctx.beginPath(); ctx.ellipse(0, size*0.25, size*0.08, size*0.03, 0, 0, Math.PI*2); ctx.stroke();
    }
    
    // --- NAME TAG ---
    const nameW = size * 1.0;
    const nameH = size * 0.3;
    const nameY = size * 0.65;
    
    ctx.fillStyle = '#b45309'; // Bronze/Gold border
    ctx.fillRect(-nameW/2 - 4, nameY - 4, nameW + 8, nameH + 8);
    
    ctx.fillStyle = '#1e3a8a'; // Blue background
    ctx.fillRect(-nameW/2, nameY, nameW, nameH);
    
    ctx.fillStyle = 'white';
    ctx.font = `900 ${Math.floor(size * 0.2)}px "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("TRUMP", 0, nameY + nameH/2);

    // --- SPEECH BUBBLE ---
    const bubbleW = size * 3.5; // Wider for more text
    const bubbleH = size * 1.2;
    const bubbleX = -bubbleW - size * 0.5;
    const bubbleY = -size * 0.7;
    
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 15);
    ctx.fill();
    
    // Border for bubble
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tail of bubble
    ctx.beginPath();
    ctx.moveTo(bubbleX + bubbleW, bubbleY + bubbleH * 0.6);
    ctx.lineTo(0, 0); // Point to mouth
    ctx.lineTo(bubbleX + bubbleW - 30, bubbleY + bubbleH * 0.8);
    ctx.fill();
    ctx.stroke();
    
    // Text
    ctx.fillStyle = 'black';
    ctx.font = `bold ${Math.floor(size * 0.18)}px "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText("DAME TODO TU", bubbleX + bubbleW/2, bubbleY + bubbleH * 0.35);
    
    ctx.fillStyle = '#dc2626'; // Highlight "PETRÓLEO" in red
    ctx.fillText("PETRÓLEO, MADURO!", bubbleX + bubbleW/2, bubbleY + bubbleH * 0.75);

    ctx.restore();
}