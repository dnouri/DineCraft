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

## Milestone 4: Block Interaction (Detailed Implementation)

*Goal: Allow the player to break existing blocks and place new ones using the mouse, based on detailed analysis.*

*Dependencies:* `Controls.js`, `Player.js`, `World.js`, `Chunk.js`, `main.js`, `BlockRegistry.js`.

1.  **Raycaster Setup & Basic Intersection (Verification):**
    -   [x] Confirm `THREE.Raycaster` exists in `Player.js` with `far` set to `INTERACTION_REACH`.
    -   [x] Confirm `mousedown` listener in `Controls.js` calls `player.tryInteract(window.world)` when pointer locked.
    -   [x] Confirm `Player.tryInteract` performs raycast using `raycaster.setFromCamera({ x: 0, y: 0 }, this.camera)`.
    -   [x] Confirm `Player.tryInteract` uses `raycaster.intersectObjects(chunkMeshes)` (Note: `chunkMeshes` collection is inefficient but acceptable for M4).
    -   [x] Confirm intersection results are logged.
2.  **Identify Intersected & Placement Block Coordinates (`Player.tryInteract`):**
    -   [x] Inside `if (intersects.length > 0)`:
        -   [x] Get the closest intersection: `const intersection = intersects[0];`
        -   [x] Calculate the coordinates of the block that was hit:
            ```javascript
            // Apply a small epsilon along the *negative* normal to step inside the hit face
            const hitPoint = intersection.point.clone().sub(intersection.face.normal.clone().multiplyScalar(0.01));
            const hitBlockPos = new THREE.Vector3(Math.floor(hitPoint.x), Math.floor(hitPoint.y), Math.floor(hitPoint.z));
            ```
        -   [ ] Calculate the coordinates for placing a new block adjacent to the hit face:
            ```javascript
            // Apply a small epsilon along the *positive* normal to step into the adjacent air block
            const placePoint = intersection.point.clone().add(intersection.face.normal.clone().multiplyScalar(0.01));
            const placeBlockPos = new THREE.Vector3(Math.floor(placePoint.x), Math.floor(placePoint.y), Math.floor(placePoint.z));
            ```
        -   [x] Pass `hitBlockPos` and `placeBlockPos` to subsequent logic (or store them temporarily).
        -   [x] Pass the mouse event button (`event.button`) from `Controls.onMouseDown` to `Player.tryInteract` to distinguish left/right clicks.
3.  **Implement Block Breaking (`Player.tryInteract`, `World.setBlock`, `Chunk.setBlock`):**
    -   [x] In `Player.tryInteract`, check if the interaction was triggered by a left-click (`button === 0`).
    -   [x] If left-click and `hitBlockPos` is valid:
        -   [x] Call `world.setBlock(hitBlockPos.x, hitBlockPos.y, hitBlockPos.z, BLOCKS[0].id); // Set to Air`.
    -   [x] Verify that `Chunk.setBlock` correctly sets `this.needsMeshUpdate = true` when the block ID changes.
4.  **Implement Mesh Update Trigger (`main.js` - `animate` loop):**
    -   [x] *After* `player.update()` and *before* `renderer.render()`:
        -   [x] Add a loop: `if (window.world) { window.world.chunks.forEach(chunk => { ... }); }`
        -   [x] Inside the loop, check: `if (chunk.needsMeshUpdate)`
        -   [x] If true:
            -   [x] Call `chunk.updateMesh();`
            -   [x] **(Handle Challenge #3)** Check if the mesh needs to be added to the scene:
                ```javascript
                if (chunk.mesh && !chunk.mesh.parent) {
                    scene.add(chunk.mesh);
                    console.log(`Added mesh for chunk ${chunk.position.x},${chunk.position.y},${chunk.position.z} to scene after update.`);
                }
                ```
5.  **Implement Hotbar State (`Controls.js`, `Player.js`):**
    -   [x] In `Player.js`, add a property: `this.selectedBlockId = BLOCKS[3].id; // Default to Stone`.
    -   [x] In `Controls.js`, modify `initEventListeners` to add `keydown` listeners for 'Digit1', 'Digit2', 'Digit3', 'Digit4' (or 'Key1' etc. depending on testing).
    -   [x] In `Controls.onKeyDown`, add cases for these keys:
        -   `case 'Digit1': this.player.selectedBlockId = BLOCKS[1].id; break; // Grass`
        -   `case 'Digit2': this.player.selectedBlockId = BLOCKS[2].id; break; // Dirt`
        -   `case 'Digit3': this.player.selectedBlockId = BLOCKS[3].id; break; // Stone`
        -   `case 'Digit4': this.player.selectedBlockId = BLOCKS[4].id; break; // Wood`
    -   [ ] (Optional UI) Add an HTML element to display the name of the selected block and update it here.
6.  **Implement Block Placement (`Player.tryInteract`, `World.setBlock`, `Player.js`):**
    -   [x] In `Player.tryInteract`, check if the interaction was triggered by a right-click (`button === 2`).
    -   [x] If right-click and `placeBlockPos` is valid:
        -   [x] Get the block ID to place: `const blockIdToPlace = this.selectedBlockId;`
        -   [x] **Check 1: Is target location empty?**
            -   `const currentBlockId = world.getBlock(placeBlockPos.x, placeBlockPos.y, placeBlockPos.z);`
            -   `if (currentBlockId !== BLOCKS[0].id) return; // Target not Air`
        -   [x] **Check 2: Does placement collide with player? (Handle Challenge #5)**
            -   `const blockBox = new THREE.Box3(placeBlockPos, placeBlockPos.clone().addScalar(1));`
            -   `const playerBoxWorld = this.boundingBox.clone().translate(this.playerObject.position);`
            -   `if (playerBoxWorld.intersectsBox(blockBox)) return; // Collision with player`
        -   [x] **If both checks pass:**
            -   `world.setBlock(placeBlockPos.x, placeBlockPos.y, placeBlockPos.z, blockIdToPlace);`
7.  **Handle Chunk Boundary Updates (`World.setBlock`):**
    -   [x] **(Handle Challenge #2)** Modify `World.setBlock`:
        -   [x] After the call to `chunk.setBlock(localX, localY, localZ, blockId)` succeeds and marks the primary chunk dirty:
        -   [x] Define boundary conditions: `const isOnBoundaryX = localX === 0 || localX === CHUNK_WIDTH - 1;` (similarly for Y and Z).
        -   [x] If `isOnBoundaryX || isOnBoundaryY || isOnBoundaryZ`:
            -   [x] Determine the world coordinates of the potentially affected neighbor block(s) (e.g., `worldX - 1`, `worldX + 1`, etc.).
            -   [x] For each potential neighbor coordinate, calculate its chunk coordinates (`neighborChunkX`, `neighborChunkY`, `neighborChunkZ`).
            -   [x] If the neighbor chunk coords are different from the original chunk coords:
                -   `const neighborChunk = this.getChunk(neighborChunkX, neighborChunkY, neighborChunkZ);`
                -   `if (neighborChunk) { neighborChunk.needsMeshUpdate = true; }`
8.  **Implement Block Highlighting (Optional Enhancement):**
    -   [ ] Create wireframe geometry/mesh (`THREE.BoxGeometry`, `EdgesGeometry`, `LineBasicMaterial`, `LineSegments`) in `main.js` or `Highlight.js`. Add to scene, set `visible = false`.
    -   [ ] In `animate` loop (can be throttled):
        -   [ ] Perform raycast like `tryInteract`.
        -   [ ] If intersection found within `INTERACTION_REACH`:
            -   [ ] Calculate `hitBlockPos` (as in step 2).
            -   [ ] Position wireframe: `highlightMesh.position.set(hitBlockPos.x + 0.5, hitBlockPos.y + 0.5, hitBlockPos.z + 0.5);`
            -   [ ] Set `highlightMesh.visible = true;`
        -   [ ] Else (no intersection):
            -   [ ] Set `highlightMesh.visible = false;`
9.  **Add Wood to World Gen (Optional Content):**
    -   [ ] Modify `Chunk.generateTerrain` to place some `BLOCKS[4].id` (Wood) blocks, e.g., replacing some surface grass or creating simple tree structures. Ensure `needsMeshUpdate` is true after generation.

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
