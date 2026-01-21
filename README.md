# PokeRunner

A "Subway Surfers" inspired infinite runner web game featuring Pokémon data from PokeAPI.

## Features
- **Real-time API**: Fetches Pokémon data dynamically.
- **Pseudo-3D Engine**: Uses HTML5 Canvas with perspective projection math to simulate depth in a lightweight 2D environment.
- **Progressive Difficulty**: Speed increases over time.
- **Persistent Data**: Saves high scores and last selected character to LocalStorage.
- **Responsive**: Works on Desktop (Keyboard) and Mobile (Touch/Swipe).

## Tech Stack
- React 18
- TypeScript
- Tailwind CSS
- HTML5 Canvas (No heavy game libraries)

## Installation & Running

1. **Prerequisites**: Node.js installed.
2. **Create Project**:
   ```bash
   npm create vite@latest pokerunner -- --template react-ts
   cd pokerunner
   npm install
   ```
3. **Setup Tailwind**:
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```
   *Note: For this specific code output, I utilized the CDN version in `index.html` for instant portability. If using a build step, configure `tailwind.config.js` content paths to `['./src/**/*.{js,ts,jsx,tsx}']`.*

4. **Add Files**:
   - Copy the provided files into the `src/` directory (delete the default Vite `src` content).
   - Ensure `index.html` is in the root.

5. **Run**:
   ```bash
   npm run dev
   ```

## Controls

- **Desktop**:
  - `Left Arrow` / `A`: Move Left
  - `Right Arrow` / `D`: Move Right
  - `Space` / `Up Arrow` / `W`: Jump
- **Mobile**:
  - `Swipe Left/Right`: Change Lanes
  - `Tap` or `Swipe Up`: Jump

## Customization

### Changing Obstacles
Go to `components/GameCanvas.tsx`. Look for the `spawnInterval` block.
You can add new types to the random selector and handle their drawing in the `drawObstacle` function.

### Difficulty
In `components/GameCanvas.tsx`, modify:
- `INITIAL_SPEED`: Starting speed.
- `SPEED_INCREMENT`: How fast it accelerates.
- `SPAWN_DISTANCE`: How far ahead obstacles appear.
