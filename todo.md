# Voxel Sandbox Refactoring and Enhancement Plan

This document outlines the steps to refactor and enhance the voxel sandbox project, based on best practices and expert discussion. Each milestone aims to produce a runnable and testable state.

## Setup: Testing Framework [COMPLETED]

-   [x] **Install Testing Framework:** Choose and install a JavaScript testing framework (e.g., Vitest, Jest).
    *   `npm install --save-dev vitest` (or `jest`)
    *   Configure the framework (e.g., `vitest.config.js` or `jest.config.js`).
    *   Add a test script to `package.json` (e.g., `"test": "vitest"`).
-   [x] **Verify Setup:** Write a simple dummy test to ensure the framework runs correctly.
    *   Run: `npm test`

---

## Milestone 1: Test Existing Geometry Generation [COMPLETED]

**Goal:** Ensure the current face-culling meshing logic is correct and testable before refactoring.

-   [x] **Refactor `generateGeometryData` for Testability (Optional but Recommended):**
    *   Modify `Chunk.generateGeometryData` so it doesn't directly call `this.world.getBlock`. Instead, pass neighbor block data (e.g., a function or pre-fetched data) as arguments. This decouples `Chunk` from `World` for testing.
-   [x] **Write Unit Tests for `generateGeometryData`:**
    *   Create test file (e.g., `src/Chunk.test.js`).
    *   Test Case: Single solid block in empty space (should generate 6 faces).
    *   Test Case: Two adjacent solid blocks (should generate 10 faces total, culling the shared face).
    *   Test Case: A solid block completely surrounded by solid blocks (should generate 0 faces).
    *   Test Case: A solid block with one face exposed to air (should generate 1 face).
    *   Test Case: Correct UVs and normals for a specific face (e.g., the 'top' face of grass).
    *   Mock `BlockRegistry` functions (`getBlockById`, `getBlockTextureUV`, `generateFaceUVs`) or use the real ones if simple enough.
    *   Assert the exact content of `positions`, `normals`, `uvs`, and `indices` arrays for these simple scenarios.
-   [x] **Run Tests:** Ensure all tests pass.
    *   Run: `npm test`
-   [x] **Verify Game:** Run the game and confirm rendering is unchanged.
    *   Run: (Your usual command to start the development server, e.g., `npm run dev` or `npx vite`)

---

## Milestone 2: Refactor Meshing Logic into `ChunkMesher` [COMPLETED]

**Goal:** Improve code structure by separating meshing concerns from the `Chunk` data container.

-   [x] **Create `src/ChunkMesher.js`:**
    *   Define a `ChunkMesher` class or module.
    *   Move the `generateGeometryData` logic (and potentially related constants like `CUBE_FACE_VERTICES`, `CUBE_FACE_NORMALS`, `INDICES_CW/CCW`, `FACE_NAMES`) into the `ChunkMesher`.
    *   The mesher function should accept chunk block data and necessary neighbor data/functions as input.
-   [x] **Update `Chunk.js`:**
    *   Remove the meshing logic.
    *   In `updateMesh`, instantiate or call the `ChunkMesher` to get the geometry data, passing `this.blocks` and required neighbor information.
-   [x] **Adapt Unit Tests:**
    *   Rename/move test file to `src/ChunkMesher.test.js`.
    *   Update tests to instantiate/call the `ChunkMesher` instead of `Chunk.generateGeometryData`.
-   [x] **Run Tests:** Ensure all mesher tests pass.
    *   Run: `npm test`
-   [x] **Verify Game:** Run the game. Visually confirm that chunk rendering is identical to before the refactor. Block placing/breaking should still update meshes correctly.
    *   Run: (Your usual dev server command)

---

## Milestone 3: Vertical Chunk Management

**Goal:** Enable a truly 3D world by supporting chunks at multiple Y levels.

-   [ ] **Refactor `World.js`:**
    *   Modify `World.chunks` Map key to include Y coordinate (e.g., `"x,y,z"`).
    *   Update `World.getChunk(x, y, z)` to use the new key.
    *   Modify `World.getOrCreateChunk(chunkX, chunkZ)` to accept `chunkY` (or determine it logically if needed). Decide if chunks should be created on demand vertically or pre-generated in columns. For now, allow creation via `setBlock` implicitly or modify `getOrCreateChunk` to take `y`.
    *   Review and update `World.getBlock`, `World.setBlock`, and `World.checkAndMarkNeighborsDirty` to ensure they correctly handle calculations and lookups across vertical chunk boundaries.
-   [ ] **Update Initial World Generation (`main.js`):**
    *   Modify the initial setup to potentially create a small column of chunks (e.g., at 0,0,0 and 0,-1,0) to test verticality. Ensure `world.addAllChunksToScene` or the update loop correctly adds meshes from all Y levels.
-   [ ] **Review Player Spawn/Respawn:**
    *   Ensure `Player.initialSpawnPoint` and `RESPAWN_Y_LEVEL` are appropriate for a world that might extend downwards.
-   [ ] **Write Unit Tests for `World.js`:**
    *   Create `src/World.test.js`.
    *   Test Case: `getBlock` / `setBlock` at coordinates spanning vertical chunk boundaries.
    *   Test Case: `getChunk` retrieves chunks at different Y levels correctly.
    *   Test Case: `checkAndMarkNeighborsDirty` correctly identifies and marks chunks above/below when a block on a horizontal boundary is changed.
-   [ ] **Run Tests:** Ensure all World tests pass.
    *   Run: `npm test`
-   [ ] **Verify Game:**
    *   Run the game. Check that multiple layers of chunks render if generated.
    *   Fly/fall down (if gravity allows) or pillar up to cross vertical chunk boundaries.
    *   Place and break blocks near the vertical boundaries (e.g., Y=0, Y=-1 or Y=255, Y=256 if chunk height is 256) and verify that meshes update correctly on both sides.
    *   Run: (Your usual dev server command)

---

## Milestone 4: Basic Procedural Terrain Generation

**Goal:** Replace flat terrain with simple, dynamic 3D terrain using noise.

-   [ ] **Add Noise Library:**
    *   Install a noise library: `npm install noisejs`
    *   Import it where needed (likely `World.js` or a new `TerrainGenerator.js`).
-   [ ] **Implement Terrain Generation Logic:**
    *   Create a `TerrainGenerator` class or add methods to `World.js`.
    *   Use `noise.simplex3` or `noise.perlin3` function, taking world coordinates (x, y, z) as input.
    *   Define logic based on noise value:
        *   e.g., If `noise(x/scale, y/scale, z/scale) > threshold`, place Stone.
        *   e.g., Add layers: If `y` is near a surface level determined by `noise(x/scale, z/scale)`, place Grass/Dirt, otherwise Air above, Stone below.
-   [ ] **Integrate Generator:**
    *   Modify `Chunk.generateTerrain` (or remove it if generation moves to `World`).
    *   When a chunk is created (`World.getOrCreateChunk`), iterate through its local coordinates, calculate world coordinates, call the terrain generator function for each block, and set the block ID in the `Chunk.blocks` array.
-   [ ] **(Optional) Write Basic Terrain Tests:**
    *   If using a fixed seed for the noise generator during testing, assert the expected block type at a few specific world coordinates.
-   [ ] **Run Tests:** Ensure any new tests pass and existing tests are unaffected.
    *   Run: `npm test`
-   [ ] **Verify Game:**
    *   Run the game. Observe the generated terrain. It should no longer be flat.
    *   Fly around. Ensure terrain generates across multiple chunks horizontally and vertically.
    *   Check that block placement/breaking still works correctly on the generated terrain.
    *   Run: (Your usual dev server command)

---

## Milestone 5: Collision Detection & Resolution Testing & Refinement

**Goal:** Ensure player physics interactions with the world geometry are robust and correct.

-   [ ] **Write Unit Tests for `Player.js` Collision/Physics:**
    *   Create `src/Player.test.js`.
    *   Focus on testing `checkCollision` and the collision resolution logic within the `update` method.
    *   Mock `world.getBlock` to create specific collision scenarios.
    *   Test Case: Player standing still on flat ground (should remain stationary, `onGround` true).
    *   Test Case: Player falling onto flat ground (should stop at Y=ground+epsilon, `onGround` true, Y velocity becomes ~0).
    *   Test Case: Player walking into a 1-block high wall (should stop horizontal movement).
    *   Test Case: Player walking into a corner (should stop movement).
    *   Test Case: Player jumping/moving upwards into a ceiling (should stop vertical movement, Y velocity becomes ~0).
    *   Test Case: Player walking off a ledge (should start falling, `onGround` false).
    *   Test Case: Player spawning inside a block (should ideally resolve, though current logic might not handle this perfectly - test behavior).
-   [ ] **Refactor `Player.js` Collision Logic (If Needed):**
    *   Based on testing, refactor the collision detection (`checkCollision`) and resolution steps in `update` for clarity, correctness, and robustness. Consider separating axis checks more cleanly if beneficial.
-   [ ] **Run Tests:** Ensure all Player physics tests pass.
    *   Run: `npm test`
-   [ ] **Verify Game:**
    *   Run the game. Playtest extensively on the procedurally generated terrain.
    *   Walk, run, fall, and try to get stuck in various geometry configurations (slopes, overhangs, corners, tight spaces).
    *   Ensure movement feels relatively smooth and predictable, and the player doesn't easily clip through blocks.
    *   Run: (Your usual dev server command)

---

## Future Milestones (High-Level)

-   [ ] **Ambient Occlusion (AO):** Enhance visuals by calculating AO per vertex in the `ChunkMesher` and updating the shader.
-   [ ] **Greedy Meshing:** Optimize rendering performance by implementing greedy meshing in `ChunkMesher`. Requires robust testing.
-   [ ] **Block Lighting:** Implement light propagation from light-emitting blocks. Requires significant changes to chunk data, meshing, and shaders.
-   [ ] **More Block Types:** Add support for non-cubic shapes (stairs, slabs) or transparent blocks (water, glass), requiring more complex meshing logic.
-   [ ] **Advanced Terrain Generation:** More biomes, caves, structures.
-   [ ] **Inventory & Hotbar UI:** Visual hotbar, inventory screen.
-   [ ] **Persistence:** Save and load world state.
-   [ ] **Performance Optimizations:** Further profiling, Web Workers for meshing, draw call batching if needed.
