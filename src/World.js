import * as THREE from 'three';
import { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './Chunk.js';
import { BLOCKS } from './BlockRegistry.js';

/**
 * Manages all the chunks in the world and provides methods
 * for accessing blocks at world coordinates.
 */
export class World {
    /**
     * @param {THREE.Material} chunkMaterial The material to use for chunk meshes.
     */
    constructor(chunkMaterial) {
        this.chunkMaterial = chunkMaterial;
        this.chunks = new Map(); // Key: "x,y,z", Value: Chunk instance
        this.dirtyChunks = new Set(); // Set of Chunk instances needing mesh updates
    }

    /**
     * Retrieves an existing chunk or creates, generates, and stores a new one.
     * Currently generates chunks only at Y=0 level.
     * @param {number} chunkX Chunk's X coordinate.
     * @param {number} chunkZ Chunk's Z coordinate.
     * @returns {Chunk} The existing or newly created chunk.
     */
    getOrCreateChunk(chunkX, chunkZ) { // Renamed from addChunk
        const chunkY = 0; // Only Y=0 for now
        const key = `${chunkX},${chunkY},${chunkZ}`;
        let chunk = this.chunks.get(key);
        if (!chunk) {
            const chunkPosition = new THREE.Vector3(
                chunkX * CHUNK_WIDTH,
                chunkY * CHUNK_HEIGHT, // Will be 0
                chunkZ * CHUNK_DEPTH
            );
            // Pass world reference for neighbor lookups during mesh generation
            chunk = new Chunk(chunkPosition, this.chunkMaterial, this);
            this.chunks.set(key, chunk);
            // Mark the new chunk as dirty so its mesh gets built and added
            this.dirtyChunks.add(chunk);
            console.log(`Created chunk at ${key}`);
        }
        return chunk;
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
            const blockChanged = chunk.setBlock(localX, localY, localZ, blockId); // setBlock now returns true if changed

            if (blockChanged) {
                // Block data actually changed, log and handle neighbor updates
                // console.log(`Set block data at ${worldX},${worldY},${worldZ} to ${blockId} in chunk ${chunkX},${chunkY},${chunkZ}`);
                this.dirtyChunks.add(chunk); // Mark the current chunk as dirty

                // Check if the block is on a chunk boundary and mark neighbors dirty if necessary
                this.checkAndMarkNeighborsDirty(worldX, worldY, worldZ, chunkX, chunkY, chunkZ, localX, localY, localZ);
            }
        } else {
            console.warn(`Attempted to set block in non-existent chunk at ${chunkX},${chunkY},${chunkZ}`);
        }
    }

    /**
     * If a block change occurred on a boundary, mark the adjacent chunk(s) as dirty.
     * @private Internal helper method
     */
    checkAndMarkNeighborsDirty(worldX, worldY, worldZ, chunkX, chunkY, chunkZ, localX, localY, localZ) {
        const isOnBoundaryX = localX === 0 || localX === CHUNK_WIDTH - 1;
        const isOnBoundaryY = localY === 0 || localY === CHUNK_HEIGHT - 1;
        const isOnBoundaryZ = localZ === 0 || localZ === CHUNK_DEPTH - 1;

        if (!isOnBoundaryX && !isOnBoundaryY && !isOnBoundaryZ) {
            return; // Not on any boundary, no neighbors need updating
        }

        // Check all 6 potential neighbors
        const neighborOffsets = [
            { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
            { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
        ];

        for (const offset of neighborOffsets) {
            // Calculate the world coordinate of the block *in* the potential neighbor chunk
            const neighborWorldX = worldX + offset.x;
            const neighborWorldY = worldY + offset.y;
            const neighborWorldZ = worldZ + offset.z;

            // Find which chunk this neighbor coordinate belongs to
            const neighborChunkX = Math.floor(neighborWorldX / CHUNK_WIDTH);
            const neighborChunkY = Math.floor(neighborWorldY / CHUNK_HEIGHT);
            const neighborChunkZ = Math.floor(neighborWorldZ / CHUNK_DEPTH);

            // If the neighbor block is in a *different* chunk, mark that chunk dirty
            if (neighborChunkX !== chunkX || neighborChunkY !== chunkY || neighborChunkZ !== chunkZ) {
                const neighborChunk = this.getChunk(neighborChunkX, neighborChunkY, neighborChunkZ);
                if (neighborChunk) {
                    // console.log(`Marking neighbor chunk ${neighborChunkX},${neighborChunkY},${neighborChunkZ} for update due to boundary change.`);
                    this.dirtyChunks.add(neighborChunk);
                }
            }
        }
    }


    /**
     * Updates the meshes for all chunks marked as dirty.
     * Adds newly created meshes to the scene.
     * @param {THREE.Scene} scene The scene to add new meshes to.
     */
    updateDirtyChunkMeshes(scene) {
        if (this.dirtyChunks.size === 0) return;

        this.dirtyChunks.forEach(chunk => {
            const meshExisted = !!chunk.mesh; // Check if mesh existed before update
            chunk.updateMesh(); // Regenerate geometry and update/create mesh
            // If the mesh was newly created (didn't exist before), add it to the scene
            if (chunk.mesh && !meshExisted) {
                 scene.add(chunk.mesh);
                 // console.log(`Added new mesh for chunk ${chunk.position.x},${chunk.position.y},${chunk.position.z} to scene.`);
            }
        });
        this.dirtyChunks.clear(); // Clear the set after processing
    }

    /**
     * Returns an array of all current chunk mesh objects.
     * Used for raycasting.
     * @returns {THREE.Mesh[]} Array of chunk meshes.
     */
     getChunkMeshes() {
        const meshes = [];
        this.chunks.forEach(chunk => {
            if (chunk.mesh) {
                meshes.push(chunk.mesh);
            }
        });
        return meshes;
    }

    /**
     * Adds all currently managed chunk meshes to the given scene.
     * Useful for initial setup or if meshes were removed.
     * @param {THREE.Scene} scene The scene to add chunks to.
     */
    addAllChunksToScene(scene) {
        this.chunks.forEach(chunk => {
            if (chunk.mesh) {
                scene.add(chunk.mesh);
            }
        });
    }
}
