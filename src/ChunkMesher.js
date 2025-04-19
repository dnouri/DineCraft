import { BLOCKS, getBlockById, getBlockTextureUV, generateFaceUVs } from './BlockRegistry.js';

// Chunk dimensions (needed for _getIndex and loop bounds)
// These must match the values in Chunk.js
export const CHUNK_WIDTH = 16;
export const CHUNK_HEIGHT = 256;
export const CHUNK_DEPTH = 16;
// const CHUNK_VOLUME = CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH;

// Geometry constants
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
const INDICES_CW = [0, 2, 1, 1, 2, 3];   // Clockwise (Use for Top/Bottom anomaly where CW makes them visible)
const INDICES_CCW = [0, 1, 2, 1, 3, 2];  // Counter-Clockwise (Use for Sides where CCW makes them visible)

// Face names corresponding to CUBE_FACE_VERTICES/NORMALS order
const FACE_NAMES = ['east', 'west', 'top', 'bottom', 'south', 'north']; // +x, -x, +y, -y, +z, -z


/**
 * Encapsulates the logic for generating chunk mesh geometry from block data.
 */
export class ChunkMesher {

    /**
     * Calculates the flat array index for the given local 3D coordinates within a chunk's data array.
     * Assumes Y-major order consistent with Chunk.js.
     * @param {number} x Local X coordinate (0 to CHUNK_WIDTH - 1).
     * @param {number} y Local Y coordinate (0 to CHUNK_HEIGHT - 1).
     * @param {number} z Local Z coordinate (0 to CHUNK_DEPTH - 1).
     * @returns {number} The index in the blocks array.
     * @private
     */
    static _getIndex(x, y, z) {
        // Y-major order: Blocks at the same Y level are contiguous
        return y * (CHUNK_WIDTH * CHUNK_DEPTH) + z * CHUNK_WIDTH + x;
    }

    /**
     * Generates the geometry data (vertices, normals, uvs, indices) for a chunk mesh.
     * Implements face culling by checking neighboring blocks using the provided getBlockFn.
     *
     * @param {Uint8Array} chunkData - The flat array of block IDs for the chunk.
     * @param {object} chunkPosition - The world position of the chunk's origin (corner), expected {x, y, z}.
     * @param {function} getBlockFn - Function to get blockId at world coordinates: (worldX, worldY, worldZ) => blockId.
     * @returns {{positions: number[], normals: number[], uvs: number[], indices: number[]}} An object containing geometry arrays.
     */
    static generate(chunkData, chunkPosition, getBlockFn) {
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        let vertexIndex = 0; // Tracks the current vertex index for the indices array

        const getBlock = getBlockFn;

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let z = 0; z < CHUNK_DEPTH; z++) {
                for (let x = 0; x < CHUNK_WIDTH; x++) {
                    // Get block ID from the chunkData array using local coordinates
                    const blockIndex = ChunkMesher._getIndex(x, y, z);
                    const blockId = chunkData[blockIndex];
                    const block = getBlockById(blockId);

                    if (!block.solid) {
                        continue; // Skip air blocks and other non-solid blocks
                    }

                    const worldX = chunkPosition.x + x;
                    const worldY = chunkPosition.y + y;
                    const worldZ = chunkPosition.z + z;

                    const neighbors = [
                        getBlock(worldX + 1, worldY, worldZ), // East (+x)
                        getBlock(worldX - 1, worldY, worldZ), // West (-x)
                        getBlock(worldX, worldY + 1, worldZ), // Top (+y)
                        getBlock(worldX, worldY - 1, worldZ), // Bottom (-y)
                        getBlock(worldX, worldY, worldZ + 1), // South (+z)
                        getBlock(worldX, worldY, worldZ - 1)  // North (-z)
                    ];

                    for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
                        const neighborId = neighbors[faceIndex];
                        const neighborBlock = getBlockById(neighborId);

                        // If the neighbor is not solid, expose the face
                        if (!neighborBlock.solid) {
                            const faceVertices = CUBE_FACE_VERTICES[faceIndex];
                            const faceName = FACE_NAMES[faceIndex];

                            // Get UV coordinates for this face based on block type and face name
                            const uvData = getBlockTextureUV(blockId, faceName);
                            if (!uvData) {
                                console.warn(`Missing texture UV data for block ${blockId} face ${faceName}`);
                                continue; // Skip face if UVs are missing
                            }
                            const faceUVs = generateFaceUVs(uvData[0], uvData[1]); // [u0,v0, u1,v1, u2,v2, u3,v3]

                            // Add vertices, normals, and UVs for the 4 vertices of this face
                            for (let i = 0; i < 4; i++) { // 4 vertices per face
                                const vOffset = i * 3; // Index into faceVertices
                                const uvOffset = i * 2; // Index into faceUVs

                                // Add position vertex (relative to chunk origin, centered at x+0.5, y+0.5, z+0.5)
                                positions.push(faceVertices[vOffset + 0] + x + 0.5, faceVertices[vOffset + 1] + y + 0.5, faceVertices[vOffset + 2] + z + 0.5);

                                const normal = CUBE_FACE_NORMALS[faceIndex];
                                normals.push(normal[0], normal[1], normal[2]);

                                uvs.push(faceUVs[uvOffset], faceUVs[uvOffset + 1]);
                            }

                            // Add indices for the two triangles forming this face
                            // Select indices based on face type to work around potential rendering anomalies
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
}
