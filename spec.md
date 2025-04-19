# Specification: Simple Voxel Sandbox (Minecraft Clone V1)

## 1. Introduction

This document outlines the requirements for a minimal "Minecraft-like" voxel sandbox game built using Three.js. The primary goal is to establish the core mechanics: world generation, rendering, player movement, and block interaction (placing/breaking). This V1 focuses on simplicity and foundational elements.

## 2. Core Technologies

*   **Rendering Engine:** Three.js (r150+)
*   **Language:** JavaScript (ES6+)
*   **Platform:** Modern Web Browser supporting WebGL and Pointer Lock API
*   **Markup:** HTML5

## 3. Game World

*   **Structure:** Voxel-based grid.
*   **Chunking:**
    *   The world is divided into chunks to manage performance.
    *   Chunk Size: 16 blocks wide (X), 256 blocks high (Y), 16 blocks deep (Z).
    *   Dynamic Loading: Chunks around the player's current position should be loaded and rendered. Chunks far away should be unloaded (data potentially kept, geometry disposed). A simple view distance (e.g., 4-8 chunks) should be implemented.
*   **World Data Storage:**
    *   Each chunk stores its block data in a flat `Uint8Array` using local chunk coordinates (Y-major order).
*   **World Generation (V1 - Simple Procedural):**
    *   Generate terrain using 2D Perlin/Simplex noise to determine surface height (`surfaceY`) at each (X, Z) coordinate.
    *   Block types are determined based on depth relative to `surfaceY`:
        *   `worldY > surfaceY`: Air
        *   `worldY == surfaceY`: Grass
        *   `surfaceY - dirtDepth <= worldY < surfaceY`: Dirt
        *   `worldY < surfaceY - dirtDepth`: Stone
    *   A `TerrainGenerator` class encapsulates this logic, using a seed for reproducibility.
    *   The world extends infinitely horizontally and vertically via on-demand chunk generation.

## 4. Rendering

*   **Renderer:** `THREE.WebGLRenderer`.
*   **Scene:** `THREE.Scene`.
*   **Camera:** `THREE.PerspectiveCamera` (FOV ~75 degrees).
*   **Chunk Geometry:**
    *   Do **not** render individual cube meshes per block.
    *   For each chunk, generate a single `THREE.BufferGeometry` containing the vertices, normals, UVs, and indices for all *visible* block faces within that chunk.
    *   **Optimization:** Only generate faces between a solid block and a non-solid block (e.g., Air). Do not generate internal faces.
    *   Use `THREE.Mesh` with `THREE.MeshStandardMaterial` (or `MeshLambertMaterial`) for rendering chunk geometry.
*   **Textures:**
    *   Use a single texture atlas image file (e.g., `atlas.png`) containing the textures for all block faces.
    *   Map UV coordinates correctly onto the chunk geometry based on the block type and face direction.
*   **Lighting:**
    *   Simple lighting setup: `THREE.AmbientLight` (low intensity) and `THREE.DirectionalLight` (simulating sunlight).

## 5. Player & Controls

*   **View:** First-person perspective. The camera is the player's viewpoint.
*   **Controls:**
    *   **Mouse Look:** Use the Pointer Lock API to capture the mouse cursor. Use mouse movement to rotate the camera horizontally (Y-axis) and vertically (X-axis, clamped to prevent looking upside down). `THREE.PointerLockControls` is recommended.
    *   **Movement:**
        *   `W`: Move forward (relative to camera direction).
        *   `S`: Move backward.
        *   `A`: Strafe left.
        *   `D`: Strafe right.
        *   `Space`: Jump (if on ground) / Fly Up (if flying).
        *   `Shift`: Fly Down (if flying).
        *   `F`: Toggle Flying Mode.
        *   Movement speed constants defined for walking and flying.
*   **Collision Detection & Physics (V1 - Improved):**
    *   Represent the player as an Axis-Aligned Bounding Box (AABB).
    *   Implement collision detection between the player's AABB and the voxel grid, checked per-axis (Y, then X, then Z) to resolve collisions.
    *   Implement gravity (`GRAVITY` constant) applied when not flying.
    *   Implement jumping: Apply vertical impulse (`JUMP_VELOCITY`) when jump key is pressed while `onGround`. `onGround` flag is determined during Y-axis collision resolution.
    *   Implement flying: When `isFlying` is true, gravity is disabled. Vertical movement is controlled by jump/fly-down keys (`FLY_SPEED`). Horizontal movement uses `PLAYER_SPEED`.

## 6. Interaction

*   **Block Selection:**
    *   Use `THREE.Raycaster` originating from the center of the camera.
    *   Cast the ray forward a limited distance (e.g., 5 blocks).
    *   Identify the first solid block intersected by the ray.
    *   **Highlighting:** Visually indicate the selected block (e.g., draw a wireframe outline around it using `THREE.LineSegments`).
*   **Block Breaking:**
    *   **Input:** Left mouse click.
    *   **Action:** If a block is selected, change its type to `Air` (ID 0) in the corresponding chunk's data array.
    *   **Update:** Trigger a regeneration of the chunk's mesh geometry to reflect the change.
*   **Block Placing:**
    *   **Input:** Right mouse click.
    *   **Action:**
        *   If a block face is selected, determine the position *adjacent* to that face where a new block should be placed.
        *   Check if the player's AABB does not collide with the target placement position.
        *   Change the block type at the target position from `Air` to the currently selected block type (see UI section).
    *   **Update:** Trigger a regeneration of the chunk's mesh geometry.

## 7. Blocks

*   **Block Registry:**
    *   Define block types and their properties in a central JavaScript object or module.
    *   `BLOCKS = { 0: { name: 'air', solid: false }, 1: { name: 'grass', solid: true, textures: { top: [u,v], bottom: [u,v], sides: [u,v] } }, ... };`
    *   Texture coordinates `[u,v]` refer to the bottom-left corner of the texture within the atlas (normalized 0-1). Assume fixed-size textures in the atlas.
*   **Initial Block Types (V1):**
    *   `0`: Air (non-solid)
    *   `1`: Grass (Solid, distinct top/side/bottom textures)
    *   `2`: Dirt (Solid, uniform texture)
    *   `3`: Stone (Solid, uniform texture)
    *   `4`: Wood (Solid, distinct top/bottom and side textures)

## 8. UI (Minimal)

*   **Crosshair:** Display a simple crosshair (e.g., a '+' symbol) fixed in the center of the screen.
*   **Hotbar (Simplified):**
    *   Allow selection of block type for placement using number keys (1-4 for Grass, Dirt, Stone, Wood).
    *   Display the currently selected block type name or icon somewhere unobtrusively (optional for V1). No actual inventory management.

## 9. Code Structure (Suggested Modules)

*   `main.js`: Initializes Three.js, world, player, controls. Contains the main game loop (`requestAnimationFrame`).
*   `World.js`: Manages chunks (loading, unloading, accessing block data). Handles world generation requests.
*   `Chunk.js`: Represents a single chunk. Stores block data (3D array). Contains the logic to generate its `BufferGeometry` based on block data and neighbor chunks (for face culling).
*   `Player.js`: Manages player state (position, velocity), handles movement logic, performs collision detection.
*   `Controls.js`: Initializes and manages `PointerLockControls`, listens for keyboard/mouse input, and translates it into actions (movement intentions, break/place requests).
*   `BlockRegistry.js`: Defines all block types, their properties (solidity, texture coordinates).
*   `TextureAtlas.js`: Loads the texture atlas image. Provides helper functions to get UV coordinates for specific block faces.
*   `utils.js`: Helper functions (vector math, coordinate conversions, etc.).

## 10. V1 Scope Limitations

*   No mobs or entities other than the player.
*   No crafting system.
*   No complex biomes or advanced procedural generation (flat world only).
*   No inventory system (only selecting placement block via number keys).
*   No saving or loading game state.
*   No multiplayer functionality.
*   Basic physics and collision detection only (no sophisticated jumping, falling damage, etc.).
*   Minimal UI.
*   Limited number of block types.
