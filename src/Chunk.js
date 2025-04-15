import * as THREE from 'three';
import { BLOCKS, getBlockById, getBlockTextureUV, generateFaceUVs } from './BlockRegistry.js';

// Chunk dimensions
export const CHUNK_WIDTH = 16;
export const CHUNK_HEIGHT = 256;
export const CHUNK_DEPTH = 16;
const CHUNK_VOLUME = CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH;

// Geometry constants for building faces
// Vertices ordered consistently for UV mapping (bl, br, tl, tr) relative to face direction
const CUBE_FACE_VERTICES = [
    // pos x (East) [+x]
    [0.5, -0.5, 0.5,  0.5, -0.5, -0.5,  0.5, 0.5, 0.5,   0.5, 0.5, -0.5 ], // bl, br, tl, tr
    // neg x (West) [-x]
    [-0.5, -0.5, -0.5, -0.5, -0.5, 0.5,  -0.5, 0.5, -0.5,  -0.5, 0.5, 0.5 ], // bl, br, tl, tr
    // pos y (Top) [+y]
    [-0.5, 0.5, -0.5,  0.5, 0.5, -0.5,  -0.5, 0.5, 0.5,   0.5, 0.5, 0.5 ], // bl, br, tl, tr
    // neg y (Bottom) [-y]
    [-0.5, -0.5, 0.5,  0.5, -0.5, 0.5,  -0.5, -0.5, -0.5,  0.5, -0.5, -0.5 ], // bl, br, tl, tr
    // pos z (South) [+z]
    [-0.5, -0.5, 0.5,  0.5, -0.5, 0.5,  -0.5, 0.5, 0.5,   0.5, 0.5, 0.5 ], // bl, br, tl, tr
    // neg z (North) [-z]
    [0.5, -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, 0.5, -0.5,  -0.5, 0.5, -0.5 ], // bl, br, tl, tr
];

// Normals are constant for all 4 vertices of a face
const CUBE_FACE_NORMALS = [
    [1, 0, 0],    // East
    [-1, 0, 0],   // West
    [0, 1, 0],    // Top
    [0, -1, 0],   // Bottom
    [0, 0, 1],    // South
    [0, 0, -1],   // North
];

// Indices for two triangles per face (4 vertices per face)
// Assumes vertex order: 0:bl, 1:br, 2:tl, 3:tr

// Indices for different winding orders. We need specific ones per face type due to rendering anomaly.
const INDICES_CW = [0, 2, 1, 1, 2, 3];   // Clockwise (Use for Top/Bottom anomaly where CW makes them visible)
const INDICES_CCW = [0, 1, 2, 1, 3, 2];  // Counter-Clockwise (Use for Sides where CCW makes them visible)

// Face names corresponding to CUBE_FACE_VERTICES/NORMALS order
const FACE_NAMES = ['east', 'west', 'top', 'bottom', 'south', 'north']; // +x, -x, +y, -y, +z, -z

/**
 * Represents a 16x256x16 section of the world.
 * Manages block data and the visual representation (mesh) of the chunk using optimized geometry.
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

        this.generateTerrain();
        // Mesh update is now triggered by World adding the chunk to dirtyChunks
        // this.updateMesh(); // Don't call directly here anymore
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
                    // Directly set block data without triggering mesh update during initial generation
                    const index = this._getIndex(x, y, z);
                    this.blocks[index] = blockId;
                }
            }
        }
        // No need to set needsMeshUpdate here, World handles it via dirtyChunks
    }


    /**
     * Generates the geometry data (vertices, normals, uvs, indices) for the chunk mesh.
     * Implements face culling by checking neighboring blocks.
     * @returns {object} An object containing arrays: { positions, normals, uvs, indices }.
     */
    generateGeometryData() {
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        let vertexIndex = 0; // Tracks the current index for adding to the 'indices' array

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let z = 0; z < CHUNK_DEPTH; z++) {
                for (let x = 0; x < CHUNK_WIDTH; x++) {
                    const blockId = this.getBlock(x, y, z);
                    const block = getBlockById(blockId);

                    if (!block.solid) {
                        continue; // Skip air blocks
                    }

                    // World coordinates of the current block
                    const worldX = this.position.x + x;
                    const worldY = this.position.y + y;
                    const worldZ = this.position.z + z;

                    // Check neighbors in all 6 directions
                    const neighbors = [
                        this.world.getBlock(worldX + 1, worldY, worldZ), // East (+x)
                        this.world.getBlock(worldX - 1, worldY, worldZ), // West (-x)
                        this.world.getBlock(worldX, worldY + 1, worldZ), // Top (+y)
                        this.world.getBlock(worldX, worldY - 1, worldZ), // Bottom (-y)
                        this.world.getBlock(worldX, worldY, worldZ + 1), // South (+z)
                        this.world.getBlock(worldX, worldY, worldZ - 1)  // North (-z)
                    ];

                    for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
                        const neighborId = neighbors[faceIndex];
                        const neighborBlock = getBlockById(neighborId);

                        if (!neighborBlock.solid) {
                            // Neighbor is air or non-solid, generate this face
                            const faceVertices = CUBE_FACE_VERTICES[faceIndex];
                            const faceNormals = CUBE_FACE_NORMALS[faceIndex];
                            const faceName = FACE_NAMES[faceIndex];

                            // Get UV coordinates for this face
                            const uvData = getBlockTextureUV(blockId, faceName);
                            if (!uvData) continue; // Should not happen for solid blocks defined correctly
                            const faceUVs = generateFaceUVs(uvData[0], uvData[1]);

                            // Add vertices, normals, and UVs for the 4 vertices of this face
                            for (let i = 0; i < 4; i++) {
                                const vOffset = i * 3;
                                const uvOffset = i * 2; // Offset for UV coordinates

                                // Add position vertex (relative to chunk origin, centered at x+0.5, y+0.5, z+0.5)
                                positions.push(faceVertices[vOffset + 0] + x + 0.5, faceVertices[vOffset + 1] + y + 0.5, faceVertices[vOffset + 2] + z + 0.5);

                                // Add normal (same normal for all 4 vertices of a face)
                                const normal = CUBE_FACE_NORMALS[faceIndex];
                                normals.push(normal[0], normal[1], normal[2]);

                                // Add UV coordinate
                                // The generateFaceUVs returns bl, br, tl, tr
                                // The CUBE_FACE_VERTICES are now ordered bl, br, tl, tr
                                // So we can push UVs sequentially as generated.
                                uvs.push(faceUVs[uvOffset], faceUVs[uvOffset + 1]);
                            }

                            // Add indices for the two triangles of this face
                            // Select indices based on face type to work around rendering anomaly:
                            // Top/Bottom (faceIndex 2, 3) needed CW indices to be visible.
                            // Sides (faceIndex 0, 1, 4, 5) needed CCW indices to be visible.
                            let faceIndices;
                            if (faceIndex === 2 || faceIndex === 3) { // Top or Bottom face
                                faceIndices = INDICES_CW;
                            } else { // Side faces (East, West, South, North)
                                faceIndices = INDICES_CCW;
                            }

                            for (let i = 0; i < faceIndices.length; i++) {
                                indices.push(vertexIndex + faceIndices[i]);
                            }
                            vertexIndex += 4; // Increment base index for the next face
                        }
                    }
                }
            }
        }

        return { positions, normals, uvs, indices };
    }

    /**
     * Updates the chunk's mesh based on its current block data.
     * Creates or updates the BufferGeometry and Mesh.
     */
    updateMesh() {
        const { positions, normals, uvs, indices } = this.generateGeometryData();

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
