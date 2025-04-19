import * as THREE from 'three';
import { BLOCKS, getBlockById, getBlockTextureUV, generateFaceUVs } from './BlockRegistry.js';
import { ChunkMesher } from './ChunkMesher.js'; // Import the new mesher

// Chunk dimensions
export const CHUNK_WIDTH = 16;
export const CHUNK_HEIGHT = 256;
export const CHUNK_DEPTH = 16;
const CHUNK_VOLUME = CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH;

// Note: Geometry constants (CUBE_FACE_VERTICES, CUBE_FACE_NORMALS, INDICES_CW/CCW, FACE_NAMES)
// have been moved to ChunkMesher.js as they are specific to the meshing algorithm.

/**
 * Represents a 16x256x16 section of the world.
 * Manages block data and the visual representation (mesh) of the chunk.
 * Mesh generation is delegated to ChunkMesher.
 */
export class Chunk {
    /**
     * @param {THREE.Vector3} position The position of the chunk's origin (corner) in world coordinates.
     * @param {THREE.Material} material The material to use for the chunk mesh.
     * @param {World} world A reference to the world object for neighbor lookups.
     */
    constructor(position, material, world) {
        this.position = position; // World position of the chunk's corner (0,0,0)
        this.material = material;
        this.world = world; // Reference to the world for neighbor checks
        this.mesh = null; // Will hold the single THREE.Mesh for the chunk
        this.geometry = null; // Will hold the BufferGeometry

        // Block data stored in a flat Uint8Array for memory efficiency
        // Y-major order: y * (CHUNK_WIDTH * CHUNK_DEPTH) + z * CHUNK_WIDTH + x
        this.blocks = new Uint8Array(CHUNK_VOLUME);
        // this.needsMeshUpdate = false; // Replaced by World's dirtyChunks set

        // REMOVED: this.generateTerrain(); - World now handles generation before marking dirty
        // Mesh update is now triggered by World adding the chunk to dirtyChunks
        // this.updateMesh(); // Don't call directly here anymore
    }

    /**
     * Populates the chunk's block data with simple flat terrain.
    // REMOVED: generateTerrain() method. Logic is now in World using TerrainGenerator.

    // Note: generateGeometryData method has been removed and its logic moved to ChunkMesher.js

    /**
     * Updates the chunk's mesh based on its current block data by calling ChunkMesher.
     * Creates or updates the BufferGeometry and Mesh.
     */
    updateMesh() {
        // Call the external ChunkMesher to generate geometry data
        const { positions, normals, uvs, indices } = ChunkMesher.generate(
            this.blocks, // Pass the chunk's block data
            this.position, // Pass the chunk's world position
            (worldX, worldY, worldZ) => this.world.getBlock(worldX, worldY, worldZ) // Pass the world's getBlock function for neighbor checks
        );

        // Dispose existing geometry if it exists
        if (this.geometry) {
            this.geometry.dispose();
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        this.geometry.setIndex(indices);

        // Compute bounding sphere for frustum culling
        this.geometry.computeBoundingSphere();

        if (!this.mesh) {
            // Create mesh if it doesn't exist
            this.mesh = new THREE.Mesh(this.geometry, this.material);
            this.mesh.position.copy(this.position); // Set mesh position to chunk origin
            this.mesh.name = `Chunk_${this.position.x}_${this.position.y}_${this.position.z}`;
        } else {
            // Update existing mesh's geometry
            this.mesh.geometry = this.geometry;
        }

        // needsMeshUpdate flag is managed by World's dirtyChunks set
        // console.log(`Updated mesh for chunk at ${this.position.x},${this.position.y},${this.position.z}`);
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
     * @returns {boolean} True if the block was changed, false otherwise.
     */
    setBlock(x, y, z, blockId) {
        if (this._isValidCoordinate(x, y, z)) {
            const index = this._getIndex(x, y, z);
            const oldBlockId = this.blocks[index];
            if (oldBlockId !== blockId) {
                this.blocks[index] = blockId;
                // Marking dirty is now handled solely in World.setBlock
                // this.needsMeshUpdate = true;
                return true; // Block data was changed
            }
        }
        return false; // Block was not changed (out of bounds or same ID)
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
     * Returns the chunk's mesh object.
     * @returns {THREE.Mesh | null}
     */
    getMesh() {
        return this.mesh;
    }

    /**
     * Disposes of the chunk's geometry. Material is shared and handled elsewhere.
     */
    dispose() {
        if (this.geometry) {
            this.geometry.dispose();
            this.geometry = null;
        }
        if (this.mesh) {
            // Mesh removal from scene is handled by World
            this.mesh = null;
        }
    }
}
