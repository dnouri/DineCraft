import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
// Import ChunkMesher and constants directly from it
import { ChunkMesher, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './ChunkMesher.js';
// BlockRegistry is still needed for block properties and IDs
import { BLOCKS, getBlockById } from './BlockRegistry.js';

// --- Test Helpers ---

// Calculates the flat array index (copied logic from Chunk/ChunkMesher)
function getIndex(x, y, z) {
    return y * (CHUNK_WIDTH * CHUNK_DEPTH) + z * CHUNK_WIDTH + x;
}

// Creates a flat Uint8Array representing chunk data, filled with Air (0)
function makeEmptyChunkData() {
    const volume = CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH;
    const data = new Uint8Array(volume);
    data.fill(BLOCKS[0].id); // Fill with Air ID
    return data;
}

// Sets a block ID in the data array at local coordinates
function setBlockInData(dataArray, x, y, z, blockId) {
    if (x >= 0 && x < CHUNK_WIDTH && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_DEPTH) {
        const index = getIndex(x, y, z);
        dataArray[index] = blockId;
    } else {
        console.warn(`Attempted to set block outside data bounds at ${x},${y},${z}`);
    }
}

// Default mock getBlock function: Treats everything outside local bounds as Air
function createMockGetBlock(chunkData) {
    return (worldX, worldY, worldZ) => {
        // Assuming chunkPosition is (0,0,0) for these tests, world coords === local coords
        if (worldX >= 0 && worldX < CHUNK_WIDTH &&
            worldY >= 0 && worldY < CHUNK_HEIGHT &&
            worldZ >= 0 && worldZ < CHUNK_DEPTH) {
            const index = getIndex(worldX, worldY, worldZ);
            return chunkData[index];
        } else {
            return BLOCKS[0].id; // Air outside the chunk data bounds
        }
    };
}

// --- Tests ---

describe('ChunkMesher.generate', () => { // Updated describe block
    const chunkPosition = new THREE.Vector3(0, 0, 0); // Consistent position for tests

    it('Single solid block in empty space generates 6 faces', () => {
        const chunkData = makeEmptyChunkData();
        setBlockInData(chunkData, 1, 1, 1, BLOCKS[1].id); // Place grass at (1,1,1)
        const mockGetBlock = createMockGetBlock(chunkData);
        const { positions, indices } = ChunkMesher.generate(chunkData, chunkPosition, mockGetBlock);

        // Assertions remain the same: 6 faces * 4 vertices/face = 24 vertices
        expect(positions.length / 3).toBe(24);
        // 6 faces * 6 indices/face = 36 indices
        expect(indices.length).toBe(36);
    });

    it('Two adjacent solid blocks share a face (10 faces total)', () => {
        const chunkData = makeEmptyChunkData();
        setBlockInData(chunkData, 1, 1, 1, BLOCKS[1].id);
        setBlockInData(chunkData, 2, 1, 1, BLOCKS[1].id); // Adjacent block
        const mockGetBlock = createMockGetBlock(chunkData);
        const { positions, indices } = ChunkMesher.generate(chunkData, chunkPosition, mockGetBlock);

        // Assertions remain the same: 2 blocks * 6 faces - 2 shared = 10 faces
        // 10 faces * 4 vertices/face = 40 vertices
        expect(positions.length / 3).toBe(40);
        // 10 faces * 6 indices/face = 60 indices
        expect(indices.length).toBe(60);
    });

    it('Solid block completely surrounded by solid blocks generates 0 faces', () => {
        const chunkData = makeEmptyChunkData();
        // Place a solid block at (1,1,1)
        setBlockInData(chunkData, 1, 1, 1, BLOCKS[3].id); // Stone
        // Surround it with neighbors
        setBlockInData(chunkData, 0, 1, 1, BLOCKS[3].id); // West
        setBlockInData(chunkData, 2, 1, 1, BLOCKS[3].id); // East
        setBlockInData(chunkData, 1, 0, 1, BLOCKS[3].id); // Bottom
        setBlockInData(chunkData, 1, 2, 1, BLOCKS[3].id); // Top
        setBlockInData(chunkData, 1, 1, 0, BLOCKS[3].id); // North
        setBlockInData(chunkData, 1, 1, 2, BLOCKS[3].id); // South

        const mockGetBlock = createMockGetBlock(chunkData);
        const { positions, indices } = ChunkMesher.generate(chunkData, chunkPosition, mockGetBlock);

        // The mesher iterates through all blocks. It will generate faces for the *outer* shell.
        // The block at (1,1,1) itself should generate 0 faces because all its neighbors *within chunkData* are solid.
        // Let's verify the total geometry is empty *only if* we only placed the center block and mocked neighbors as solid.
        // Since we placed neighbors, we expect faces for those neighbors.
        // A better test: Place ONLY the center block, and use a mockGetBlock that returns SOLID for all neighbors.

        const centerOnlyData = makeEmptyChunkData();
        setBlockInData(centerOnlyData, 1, 1, 1, BLOCKS[3].id); // Stone at center
        const mockGetBlockSurrounded = (wx, wy, wz) => {
             // If it's the center block itself, return its ID
             if (wx === 1 && wy === 1 && wz === 1) return BLOCKS[3].id;
             // Otherwise, pretend all neighbors are solid stone
             return BLOCKS[3].id;
        };
        const { positions: p2, indices: i2 } = ChunkMesher.generate(centerOnlyData, chunkPosition, mockGetBlockSurrounded);

        // Assertions: Center block surrounded should generate nothing
        expect(p2.length).toBe(0);
        expect(i2.length).toBe(0);
    });

    it('Solid block with one face exposed to air generates 1 face', () => {
        const chunkData = makeEmptyChunkData();
        setBlockInData(chunkData, 1, 1, 1, BLOCKS[1].id); // Grass at (1,1,1)

        // Mock getBlock: Air to the West (-x), solid everywhere else around (1,1,1)
        const mockGetBlockWestAir = (wx, wy, wz) => {
            if (wx === 1 && wy === 1 && wz === 1) return BLOCKS[1].id; // The block itself
            if (wx === 0 && wy === 1 && wz === 1) return BLOCKS[0].id; // Air to the West
            // All other neighbors are solid
            return BLOCKS[1].id;
        };

        const { positions, indices } = ChunkMesher.generate(chunkData, chunkPosition, mockGetBlockWestAir);

        // Assertions: Only 1 face (West) should be generated
        // 1 face * 4 vertices/face = 4 vertices
        expect(positions.length / 3).toBe(4);
        // 1 face * 6 indices/face = 6 indices
        expect(indices.length).toBe(6);
    });

    it('Correct UVs and normals for the top face of grass', () => {
        const chunkData = makeEmptyChunkData();
        setBlockInData(chunkData, 1, 1, 1, BLOCKS[1].id); // Grass

        // Mock getBlock: Air above (+y), solid everywhere else around (1,1,1)
        const mockGetBlockTopAir = (wx, wy, wz) => {
            if (wx === 1 && wy === 1 && wz === 1) return BLOCKS[1].id; // The block itself
            if (wx === 1 && wy === 2 && wz === 1) return BLOCKS[0].id; // Air above
            // All other neighbors are solid
            return BLOCKS[1].id;
        };

        const { uvs, normals } = ChunkMesher.generate(chunkData, chunkPosition, mockGetBlockTopAir);

        // Assertions: Only 1 face (Top) generated
        // 1 face * 4 vertices * 2 UV coords = 8 UV values
        expect(uvs.length).toBe(8);
        // 1 face * 4 vertices * 3 normal coords = 12 normal values
        expect(normals.length).toBe(12);
        // Assertions remain the same: Normals for top face should be [0,1,0]
        for (let i = 0; i < 4; i++) {
            expect(normals[i * 3 + 0]).toBe(0);
            expect(normals[i * 3 + 1]).toBe(1);
            expect(normals[i * 3 + 2]).toBe(0);
        }
        // TODO: Add specific UV value checks if needed, based on BlockRegistry
    });
});
