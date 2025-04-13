# Voxel Sandbox V1 - TODO List (Milestones)

This checklist is based on the `spec.md` document and outlines the tasks required to implement the V1 features, broken down into playable milestones.

---

## Milestone 1: Core Rendering & Static World

*Goal: Display a static, flat world made of simple, textured cubes. No player movement or interaction yet.*

-   **Setup & Core:**
    -   [x] Create basic HTML file (`index.html`).
    -   [x] Include Three.js library (e.g., via CDN or local file).
    -   [x] Create `main.js` entry point.
    -   [x] Initialize Three.js `WebGLRenderer`, `Scene`, and `PerspectiveCamera` in `main.js`.
    -   [x] Set up basic lighting (`AmbientLight`, `DirectionalLight`).
    -   [x] Implement the main game loop using `requestAnimationFrame` in `main.js`.
    -   [x] Create basic structure for JS module files (`World.js`, `Chunk.js`, `BlockRegistry.js`, `TextureAtlas.js`, `utils.js`).
-   **Block System (Basic):**
    -   [x] Create `BlockRegistry.js`.
    -   [x] Define the `BLOCKS` data structure with `Air`, `Grass`, `Dirt`, `Stone`. Include `solid` property.
-   **Texture Atlas (Placeholder):**
    -   [x] Create a placeholder `atlas.png` (can be simple colors initially).
    -   [x] Create `TextureAtlas.js`.
    -   [x] Implement logic to load `atlas.png` using `THREE.TextureLoader`.
    -   [x] Apply `NearestFilter`.
    -   [x] Create a basic `MeshStandardMaterial` using the loaded texture.
-   **World & Chunk Management (Static):**
    -   [x] Create `World.js`.
    -   [x] Implement `World` class to hold a few static chunks.
    -   [x] Create `Chunk.js`.
    -   [x] Define chunk dimensions (16x256x16).
    -   [x] Implement `Chunk` class to store block data (e.g., `Uint8Array`).
    -   [x] Implement simple flat world generation logic (Grass, Dirt, Stone layers) to populate chunk data upon creation.
    -   [x] Implement `World.getBlock(worldX, worldY, worldZ)` (basic version for loaded chunks).
-   **Chunk Geometry & Rendering (Simple Cubes):**
    -   [x] Implement basic geometry generation in `Chunk.js`: Create a separate `THREE.BoxGeometry` and `THREE.Mesh` for *every* solid block. (Inefficient, will be replaced in Milestone 3).
    -   [x] Position each block mesh correctly within the chunk.
    -   [x] Add all block meshes for a chunk to a `THREE.Group` representing the chunk.
    -   [x] Add chunk groups to the main `THREE.Scene`.
    -   [x] Ensure the camera is positioned to see the generated world.

---

## Milestone 2: Player Movement & Basic Physics

*Goal: Introduce a player entity that can move around the world using keyboard/mouse, affected by gravity and basic collision with the ground/blocks.*

-   **Player & Controls Setup:**
    -   [x] Create `Player.js`.
    -   [x] Implement `Player` class to store position, velocity, and state (e.g., `isGrounded`).
    -   [x] Add the main `THREE.PerspectiveCamera` as a child of a `THREE.Object3D` representing the player in `Player.js`. Position camera appropriately.
    -   [x] Create `Controls.js`.
    -   [x] Initialize `THREE.PointerLockControls` in `Controls.js`, linking it to the player object/camera.
    -   [x] Add event listeners for mouse clicks to activate pointer lock.
    -   [x] Implement keyboard event listeners (`keydown`, `keyup`) in `Controls.js` for WASD movement intentions.
-   **Movement Logic:**
    -   [x] In the game loop (`main.js` or `Player.js`), update player velocity based on keyboard input (`Controls.js` state) and camera direction (`PointerLockControls`).
    -   [x] Update player position based on velocity and delta time.
-   **Physics & Collision (Basic):**
    -   [x] Define player AABB dimensions in `Player.js`.
    -   [x] Implement simple gravity: Apply downward acceleration to player's Y velocity if `!isGrounded`.
    -   [x] Implement basic collision detection function `checkCollision(playerAABB, world)` integrated within `Player.update`.
    -   [x] Check potential next position against solid blocks using `World.getBlock`.
    -   [x] Resolve collisions by preventing movement into solid blocks (adjust velocity/position).
    -   [x] Update `player.isGrounded` based on collision checks below the player. Reset Y velocity if grounded.

---

## Milestone 3: Optimized Chunk Rendering & Textures

*Goal: Implement efficient chunk rendering using merged geometry, face culling, and a proper texture atlas.*

-   **Texture Atlas Refinement:**
    -   [x] Create the final `atlas.png` with distinct textures for Grass (top/side/bottom), Dirt, Stone, Wood (top/bottom, side). (Assumed done based on `tmp/prompt.txt`)
    -   [x] Update `BlockRegistry.js`: Add Wood block type. Define texture coordinates `[u,v]` for *each face* of relevant block types (Grass, Wood). Assume fixed texture size in atlas (e.g., 16x16 pixels).
    -   [x] Add helper functions in `TextureAtlas.js` or `BlockRegistry.js` to get normalized UV coordinates for a given block type and face ID/name.
-   **Optimized Chunk Geometry Generation:**
    -   [x] Modify `Chunk.js` geometry generation: Remove the per-block mesh creation.
    -   [x] Create arrays to store vertex positions, normals, UVs, and indices for the entire chunk mesh.
    -   [x] Iterate through blocks within the chunk (`x, y, z`).
    -   [x] For solid blocks, check neighbors (including those in adjacent chunks via `World.getBlock`). Use `Air` (ID 0) as non-solid.
    -   [x] Generate geometry data (vertices, normals, UVs for the correct texture from atlas, indices) *only* for faces exposed to non-solid blocks (face culling).
    -   [x] Create a single `THREE.BufferGeometry` from the generated arrays.
    -   [x] Create a single `THREE.Mesh` for the chunk using the `BufferGeometry` and the shared texture atlas material.
    -   [x] Replace the old `THREE.Group` in the scene with this new single chunk `THREE.Mesh`.
-   **Chunk Mesh Updates:**
    -   [x] Implement `Chunk.updateMesh()` method to regenerate and replace the chunk's `BufferGeometry` and `Mesh`.
    -   [x] Implement `World.setBlock(worldX, worldY, worldZ, blockId)` method (now marks chunk internally, actual update trigger in M4).

---

## Milestone 4: Block Interaction

*Goal: Allow the player to break existing blocks and place new ones using the mouse.*

-   **Interaction Setup:**
    -   [ ] Initialize `THREE.Raycaster` in `Controls.js` or `Player.js`.
    -   [ ] Add `Wood` block type to the initial flat world generation for testing.
-   **Block Breaking:**
    -   [ ] On left mouse click (`mousedown` or `click` within pointer lock):
        -   [ ] Cast a ray from the camera center using `Raycaster`.
        -   [ ] Find intersections with chunk meshes within range (~5 blocks).
        -   [ ] If an intersection occurs, determine the exact world coordinates `(x, y, z)` of the intersected block (requires mapping intersection point and normal back to grid).
        -   [ ] Call `World.setBlock(x, y, z, 0)` to set the block to Air.
        -   [ ] Trigger `Chunk.updateMesh()` for the affected chunk (and potentially neighbors if the block was on a boundary).
-   **Block Placing:**
    -   [ ] Implement hotbar selection:
        -   [ ] Add keyboard listeners for number keys (1-4) in `Controls.js`.
        -   [ ] Store the currently selected block ID (1: Grass, 2: Dirt, 3: Stone, 4: Wood) in `Player.js` or `Controls.js`.
    -   [ ] On right mouse click:
        -   [ ] Perform raycast as for breaking.
        -   [ ] If a block face is hit, calculate the coordinates `(nx, ny, nz)` of the adjacent block where the new block should be placed (based on intersected face normal).
        -   [ ] Get the currently selected block ID from the hotbar state.
        -   [ ] Check if the placement position `(nx, ny, nz)` is currently Air using `World.getBlock`.
        -   [ ] Perform a basic check to prevent placing a block where the player is standing (check collision between player AABB and placement block).
        -   [ ] If checks pass, call `World.setBlock(nx, ny, nz, selectedBlockId)`.
        -   [ ] Trigger `Chunk.updateMesh()` for the affected chunk(s).
-   **Block Highlighting:**
    -   [ ] Create a reusable wireframe geometry (e.g., `THREE.BoxGeometry`).
    -   [ ] Create a `THREE.LineSegments` mesh for the wireframe. Add it to the scene initially, make it invisible.
    -   [ ] In the game loop:
        -   [ ] Perform a continuous raycast (every frame or throttled).
        -   [ ] If a block is intersected within range, make the wireframe visible and set its position to the center of the intersected block.
        -   [ ] If no block is intersected, make the wireframe invisible.

---

## Milestone 5: Dynamic World & UI

*Goal: Implement dynamic loading/unloading of chunks based on player position and add the basic UI elements.*

-   **Dynamic Chunk Loading/Unloading:**
    -   [ ] Define a view distance (e.g., 4 chunks) in `World.js` or constants.
    -   [ ] In the game loop or a separate update function:
        -   [ ] Determine the player's current chunk coordinates.
        -   [ ] Identify the set of chunk coordinates that *should* be visible based on the view distance.
        -   [ ] Identify chunks currently loaded/rendered but outside the view distance:
            -   [ ] Remove their mesh from the `THREE.Scene`.
            -   [ ] Dispose of their geometry and material if necessary (`chunk.dispose()`).
            -   [ ] Remove the chunk instance from the `World`'s active chunk collection (or mark as inactive).
        -   [ ] Identify chunks within view distance that are *not* currently loaded:
            -   [ ] Create a new `Chunk` instance.
            -   [ ] Generate its block data (using the flat world generator).
            -   [ ] Generate its mesh (`chunk.updateMesh()`).
            -   [ ] Add the chunk mesh to the `THREE.Scene`.
            -   [ ] Add the chunk instance to the `World`'s active chunk collection.
    -   [ ] Ensure `World.getBlock` and `World.setBlock` can handle requests for unloaded chunks gracefully (e.g., return Air or load temporarily). Modify neighbor checks in chunk geometry generation to handle unloaded neighbors.
-   **UI Elements:**
    -   [ ] Create a simple HTML element (e.g., `<div id="crosshair">+</div>`) in `index.html`.
    -   [ ] Style the crosshair using CSS to position it fixed in the center of the screen.
    -   [ ] (Optional V1) Add an HTML element to display the name of the currently selected hotbar block. Update its content when number keys are pressed.
