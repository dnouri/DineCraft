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
    *   Each chunk stores its block data in a 3D array (or TypedArray for potential optimization later). `chunkData[x][y][z] = blockTypeId;` (using local chunk coordinates).
*   **World Generation (V1 - Simple Flat):**
    *   Generate a flat world initially.
    *   Example:
        *   Y = 0: Grass Block
        *   Y = -1, -2: Dirt Block
        *   Y < -2: Stone Block
        *   All other blocks: Air (ID 0)
    *   The world should conceptually extend infinitely horizontally via chunk generation.

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
        *   `Space`: Jump (V1.1 - initially, just basic ground collision).
        *   Movement speed should be constant.
*   **Collision Detection & Physics (V1 - Basic):**
    *   Represent the player as an Axis-Aligned Bounding Box (AABB).
    *   Implement basic collision detection between the player's AABB and the voxel grid. Prevent the player from moving into solid blocks.
    *   Implement simple gravity: Apply a constant downward velocity. If the player is standing on a solid block, vertical velocity is zero.
    *   No complex physics or jumping mechanics in the initial version.

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
