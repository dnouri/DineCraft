import * as THREE from 'three';
import { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './Chunk.js';
import { BLOCKS } from './BlockRegistry.js';

/**
 * Manages all the chunks in the world and provides methods
 * for accessing blocks at world coordinates.
 */
export class World {
    /**
     * @param {THREE.Material} chunkMaterial The material to use for chunks.
     */
    constructor(chunkMaterial) {
        this.chunkMaterial = chunkMaterial;
        this.chunks = new Map(); // Use a Map to store chunks, keyed by a string "x,y,z"
    }

    /**
     * Generates or retrieves a chunk at the given chunk coordinates.
     * For Milestone 1, we only generate chunks at Y=0.
     * @param {number} chunkX Chunk's X coordinate.
     * @param {number} chunkZ Chunk's Z coordinate.
     * @returns {Chunk} The existing or newly created chunk.
     */
    addChunk(chunkX, chunkZ) {
        const chunkY = 0; // For M1, all chunks are at Y=0 level
        const key = `${chunkX},${chunkY},${chunkZ}`;
        if (!this.chunks.has(key)) {
            const chunkPosition = new THREE.Vector3(
                chunkX * CHUNK_WIDTH,
                chunkY * CHUNK_HEIGHT, // This will likely be 0 for M1 terrain generation
                chunkZ * CHUNK_DEPTH
            );
            // Pass the world reference to the chunk constructor
            const newChunk = new Chunk(chunkPosition, this.chunkMaterial, this);
            this.chunks.set(key, newChunk);
            console.log(`Created chunk at ${key}`);
            return newChunk;
        }
        return this.chunks.get(key);
    }

    /**
     * Retrieves a chunk based on its chunk coordinates.
     * @param {number} chunkX Chunk's X coordinate.
     * @param {number} chunkY Chunk's Y coordinate.
     * @param {number} chunkZ Chunk's Z coordinate.
     * @returns {Chunk | undefined} The chunk if it exists, otherwise undefined.
     */
    getChunk(chunkX, chunkY, chunkZ) {
        const key = `${chunkX},${chunkY},${chunkZ}`;
        return this.chunks.get(key);
    }

    /**
     * Gets the block ID at the given world coordinates.
     * @param {number} worldX World X coordinate.
     * @param {number} worldY World Y coordinate.
     * @param {number} worldZ World Z coordinate.
     * @returns {number} The block ID, or Air (0) if the chunk doesn't exist.
     */
    getBlock(worldX, worldY, worldZ) {
        const chunkX = Math.floor(worldX / CHUNK_WIDTH);
        const chunkY = Math.floor(worldY / CHUNK_HEIGHT);
        const chunkZ = Math.floor(worldZ / CHUNK_DEPTH);

        const localX = THREE.MathUtils.euclideanModulo(worldX, CHUNK_WIDTH);
        const localY = THREE.MathUtils.euclideanModulo(worldY, CHUNK_HEIGHT);
        const localZ = THREE.MathUtils.euclideanModulo(worldZ, CHUNK_DEPTH);

        const chunk = this.getChunk(chunkX, chunkY, chunkZ);

        if (chunk) {
            return chunk.getBlock(localX, localY, localZ);
        } else {
            // If the chunk doesn't exist, treat it as air (or potentially generate based on rules)
            // For M1, just return Air.
            return BLOCKS[0].id;
        }
    }

    /**
     * Sets the block ID at the given world coordinates.
     * Note: This only updates data. Mesh updates happen separately.
     * @param {number} worldX World X coordinate.
     * @param {number} worldY World Y coordinate.
     * @param {number} worldZ World Z coordinate.
     * @param {number} blockId The ID of the block to set.
     */
    setBlock(worldX, worldY, worldZ, blockId) {
        const chunkX = Math.floor(worldX / CHUNK_WIDTH);
        const chunkY = Math.floor(worldY / CHUNK_HEIGHT);
        const chunkZ = Math.floor(worldZ / CHUNK_DEPTH);

        const localX = THREE.MathUtils.euclideanModulo(worldX, CHUNK_WIDTH);
        const localY = THREE.MathUtils.euclideanModulo(worldY, CHUNK_HEIGHT);
        const localZ = THREE.MathUtils.euclideanModulo(worldZ, CHUNK_DEPTH);

        const chunk = this.getChunk(chunkX, chunkY, chunkZ);

        if (chunk) {
            chunk.setBlock(localX, localY, localZ, blockId); // This now marks the chunk internally
            // TODO M4/M5: Handle neighbor chunk updates if block is on boundary
            console.log(`Set block data at ${worldX},${worldY},${worldZ} in chunk ${chunkX},${chunkY},${chunkZ}`);
            // Note: Actual mesh update is triggered elsewhere (e.g., end of frame or interaction)
        } else {
            console.warn(`Attempted to set block data in non-existent chunk at ${chunkX},${chunkY},${chunkZ}`);
            // Optionally, could create the chunk here if needed
        }
    }

    /**
     * Adds all currently managed chunk meshes to the given scene.
     * @param {THREE.Scene} scene The scene to add chunks to.
     */
    addToScene(scene) {
        this.chunks.forEach(chunk => {
            scene.add(chunk.getMesh());
        });
    }

    // Placeholder for future chunk management (loading/unloading)
    update(playerPosition) {
        // This will be implemented in Milestone 5
    }
}
