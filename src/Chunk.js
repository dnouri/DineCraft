import * as THREE from 'three';
import { BLOCKS, getBlockById } from './BlockRegistry.js';

// Chunk dimensions
export const CHUNK_WIDTH = 16;
export const CHUNK_HEIGHT = 256;
export const CHUNK_DEPTH = 16;
const CHUNK_VOLUME = CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH;

// Reusable geometry for blocks (Milestone 1)
const blockGeometry = new THREE.BoxGeometry(1, 1, 1);

/**
 * Represents a 16x256x16 section of the world.
 * Manages block data and the visual representation (mesh) of the chunk.
 */
export class Chunk {
    /**
     * @param {THREE.Vector3} position The position of the chunk's origin (corner) in world coordinates.
     * @param {THREE.Material} material The material to use for the block meshes.
     */
    constructor(position, material) {
        this.position = position; // World position of the chunk's corner (0,0,0)
        this.material = material;
        this.mesh = new THREE.Group(); // Use a Group to hold individual block meshes for M1
        this.mesh.position.copy(position); // Position the group

        // Block data stored in a flat Uint8Array for memory efficiency
        // Access using: x + z * CHUNK_WIDTH + y * CHUNK_WIDTH * CHUNK_DEPTH
        this.blocks = new Uint8Array(CHUNK_VOLUME);

        this.generateTerrain();
        this.generateSimpleMesh(); // Generate the inefficient mesh for Milestone 1
    }

    /**
     * Populates the chunk's block data with simple flat terrain.
     * Y=0: Grass, Y=-1,-2: Dirt, Y<-2: Stone
     */
    generateTerrain() {
        for (let x = 0; x < CHUNK_WIDTH; x++) {
            for (let z = 0; z < CHUNK_DEPTH; z++) {
                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    const worldY = this.position.y + y; // Calculate world Y coordinate
                    let blockId = BLOCKS[0].id; // Default to Air

                    if (worldY === 0) {
                        blockId = BLOCKS[1].id; // Grass
                    } else if (worldY === -1 || worldY === -2) {
                        blockId = BLOCKS[2].id; // Dirt
                    } else if (worldY < -2) {
                        blockId = BLOCKS[3].id; // Stone
                    }
                    this.setBlock(x, y, z, blockId);
                }
            }
        }
    }

    /**
     * Generates a mesh for the chunk by creating individual cubes for each solid block.
     * This is highly inefficient and will be replaced in Milestone 3.
     */
    generateSimpleMesh() {
        // Clear existing meshes if regenerating
        this.mesh.clear();

        for (let x = 0; x < CHUNK_WIDTH; x++) {
            for (let z = 0; z < CHUNK_DEPTH; z++) {
                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    const blockId = this.getBlock(x, y, z);
                    const block = getBlockById(blockId);

                    if (block.solid) {
                        // Create a new mesh for each solid block
                        const blockMesh = new THREE.Mesh(blockGeometry, this.material);
                        // Position the block relative to the chunk's origin
                        blockMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
                        this.mesh.add(blockMesh);
                    }
                }
            }
        }
    }

    /**
     * Gets the block ID at the given local chunk coordinates.
     * @param {number} x Local X coordinate (0-15).
     * @param {number} y Local Y coordinate (0-255).
     * @param {number} z Local Z coordinate (0-15).
     * @returns {number} The block ID.
     */
    getBlock(x, y, z) {
        if (this._isValidCoordinate(x, y, z)) {
            const index = this._getIndex(x, y, z);
            return this.blocks[index];
        }
        return BLOCKS[0].id; // Return Air for out-of-bounds coordinates
    }

    /**
     * Sets the block ID at the given local chunk coordinates.
     * Note: This only updates the data array. Mesh regeneration is separate.
     * @param {number} x Local X coordinate (0-15).
     * @param {number} y Local Y coordinate (0-255).
     * @param {number} z Local Z coordinate (0-15).
     * @param {number} blockId The ID of the block to set.
     */
    setBlock(x, y, z, blockId) {
        if (this._isValidCoordinate(x, y, z)) {
            const index = this._getIndex(x, y, z);
            this.blocks[index] = blockId;
            // In later milestones, setting a block will mark the chunk for mesh update
        }
    }

    /**
     * Checks if the local coordinates are within the chunk boundaries.
     * @param {number} x Local X coordinate.
     * @param {number} y Local Y coordinate.
     * @param {number} z Local Z coordinate.
     * @returns {boolean} True if coordinates are valid, false otherwise.
     * @private
     */
    _isValidCoordinate(x, y, z) {
        return x >= 0 && x < CHUNK_WIDTH &&
               y >= 0 && y < CHUNK_HEIGHT &&
               z >= 0 && z < CHUNK_DEPTH;
    }

    /**
     * Calculates the flat array index for the given local 3D coordinates.
     * @param {number} x Local X coordinate.
     * @param {number} y Local Y coordinate.
     * @param {number} z Local Z coordinate.
     * @returns {number} The index in the `blocks` array.
     * @private
     */
    _getIndex(x, y, z) {
        // Y-major order: Blocks at the same Y level are contiguous
        return y * (CHUNK_WIDTH * CHUNK_DEPTH) + z * CHUNK_WIDTH + x;
        // X-major order (alternative): return x + z * CHUNK_WIDTH + y * CHUNK_WIDTH * CHUNK_DEPTH;
    }

    /**
     * Returns the chunk's mesh group.
     * @returns {THREE.Group}
     */
    getMesh() {
        return this.mesh;
    }

    // Placeholder for future mesh disposal
    dispose() {
        // In M1, the geometry is shared, material is shared.
        // We just need to remove the group from the parent.
        this.mesh.clear(); // Remove children
        // Geometry and material disposal will be handled elsewhere or when they are unique per chunk.
    }
}
