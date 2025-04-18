import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { World } from './World.js';
import { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './Chunk.js';
import { BLOCKS } from './BlockRegistry.js';

// Mock Material
const mockMaterial = new THREE.MeshBasicMaterial();

describe('World', () => {
    let world;

    beforeEach(() => {
        // Create a fresh world for each test
        world = new World(mockMaterial);
    });

    describe('getChunk', () => {
        it('should return undefined for coordinates where no chunk exists', () => {
            // Current implementation implicitly checks Y=0
            expect(world.getChunk(0, 0, 0)).toBeUndefined();
            expect(world.getChunk(1, 0, 1)).toBeUndefined();
            // Test with explicit Y=0, although it's ignored currently
            expect(world.getChunk(0, 0, 0)).toBeUndefined();
        });

        it('should return the correct chunk after it has been created', () => { // Updated test description slightly
            const createdChunk = world.getOrCreateChunk(0, 0, 0); // Pass all three arguments
            expect(createdChunk).toBeInstanceOf(Chunk);
            expect(createdChunk.position.x).toBe(0);
            expect(createdChunk.position.y).toBe(0);
            expect(createdChunk.position.z).toBe(0);

            // Current getChunk ignores Y, finds based on X,Z
            const retrievedChunk = world.getChunk(0, 0, 0); // Y is ignored here
            expect(retrievedChunk).toBe(createdChunk);

            // Test retrieving with a different Y (should now return undefined)
            const retrievedChunkWrongY = world.getChunk(0, 10, 0); // Y=10 doesn't exist
            expect(retrievedChunkWrongY).toBeUndefined();

             // Test retrieving with the correct Y=0
            const retrievedChunkCorrectY = world.getChunk(0, 0, 0);
            expect(retrievedChunkCorrectY).toBe(createdChunk);
        });

        it('should return undefined for different Y levels if only Y=0 chunk exists', () => {
            world.getOrCreateChunk(0, 0, 0); // Pass all three arguments

            expect(world.getChunk(0, 1, 0)).toBeUndefined();
            expect(world.getChunk(0, -1, 0)).toBeUndefined();
            expect(world.getChunk(0, 256, 0)).toBeUndefined(); // Corresponds to chunkY=1
        });
    });

    describe('getBlock', () => {
        beforeEach(() => {
            // Create chunks needed for vertical boundary tests
            world.getOrCreateChunk(0, 0, 0);  // Contains Y = 0 to 255
            world.getOrCreateChunk(0, -1, 0); // Contains Y = -256 to -1
        });

        it('should return the correct block from the upper chunk (Y=0)', () => {
            // Default terrain: Grass at Y=0
            expect(world.getBlock(8, 0, 8)).toBe(BLOCKS[1].id); // Grass
        });

        it('should return the correct block from the lower chunk (Y=-1)', () => {
            // Default terrain: Dirt at Y=-1
            expect(world.getBlock(8, -1, 8)).toBe(BLOCKS[2].id); // Dirt
        });

         it('should return the correct block from the lower chunk (Y=-256, localY=0)', () => {
            // Default terrain: Stone below Y=-2. Y=-256 is localY=0 in chunk (0,-1,0)
            expect(world.getBlock(8, -256, 8)).toBe(BLOCKS[3].id); // Stone
        });

        it('should return Air for the top layer of the upper chunk (Y=255)', () => {
            // Default terrain generates Air above Y=0
            expect(world.getBlock(8, 255, 8)).toBe(BLOCKS[0].id); // Air
        });

        it('should return Air for coordinates in a non-existent chunk above (Y=256)', () => {
            // Chunk (0, 1, 0) does not exist
            expect(world.getBlock(8, 256, 8)).toBe(BLOCKS[0].id); // Air
        });

        it('should return Air for coordinates far outside any generated chunk', () => {
            expect(world.getBlock(1000, 1000, 1000)).toBe(BLOCKS[0].id); // Air
        });
    });

    describe('setBlock', () => {
        let chunk000, chunk0m10;
        const woodId = BLOCKS[4].id; // Wood

        beforeEach(() => {
            // Create chunks needed for vertical boundary tests
            chunk000 = world.getOrCreateChunk(0, 0, 0);  // Contains Y = 0 to 255
            chunk0m10 = world.getOrCreateChunk(0, -1, 0); // Contains Y = -256 to -1
            // Clear dirty chunks set by creation if needed for clarity, though not strictly necessary for these tests
            world.dirtyChunks.clear();
        });

        it('should set a block in the lower chunk (Y=-1) and mark it dirty', () => {
            expect(world.getBlock(5, -1, 5)).toBe(BLOCKS[2].id); // Should be Dirt initially
            world.setBlock(5, -1, 5, woodId);
            expect(world.getBlock(5, -1, 5)).toBe(woodId);
            expect(world.dirtyChunks.has(chunk0m10)).toBe(true); // Lower chunk should be dirty
            expect(world.dirtyChunks.has(chunk000)).toBe(true); // Upper chunk SHOULD ALSO be dirty (boundary block)
        });

        it('should set a block in the upper chunk (Y=0) and mark it dirty', () => {
            expect(world.getBlock(5, 0, 5)).toBe(BLOCKS[1].id); // Should be Grass initially
            world.setBlock(5, 0, 5, woodId);
            expect(world.getBlock(5, 0, 5)).toBe(woodId);
            expect(world.dirtyChunks.has(chunk000)).toBe(true);  // Upper chunk should be dirty
            expect(world.dirtyChunks.has(chunk0m10)).toBe(true); // Lower chunk SHOULD ALSO be dirty (boundary block)
        });

        it('should not create a chunk or set a block in a non-existent chunk (Y=256)', () => {
            expect(world.getChunk(0, 1, 0)).toBeUndefined(); // Chunk (0,1,0) shouldn't exist
            world.setBlock(5, 256, 5, woodId); // Attempt to set block in chunk (0,1,0)
            expect(world.getBlock(5, 256, 5)).toBe(BLOCKS[0].id); // Should still be Air
            expect(world.getChunk(0, 1, 0)).toBeUndefined(); // Chunk should NOT have been created
            expect(world.dirtyChunks.size).toBe(0); // No chunks should be marked dirty
        });

        it('should mark both chunks dirty when setting a block on the boundary (Y=0)', () => {
            // Setting block at Y=0 (localY=0 in chunk 0,0,0) should mark 0,0,0 AND its neighbor below (0,-1,0) dirty
            world.setBlock(5, 0, 5, woodId);
            expect(world.dirtyChunks.has(chunk000)).toBe(true);
            expect(world.dirtyChunks.has(chunk0m10)).toBe(true);
        });

        it('should mark both chunks dirty when setting a block on the boundary (Y=-1)', () => {
            // Setting block at Y=-1 (localY=255 in chunk 0,-1,0) should mark 0,-1,0 AND its neighbor above (0,0,0) dirty
            world.setBlock(5, -1, 5, woodId);
            expect(world.dirtyChunks.has(chunk0m10)).toBe(true);
            expect(world.dirtyChunks.has(chunk000)).toBe(true);
        });

        it('should mark both chunks dirty when setting AIR on the boundary (Y=0)', () => {
            // Ensure block is not already air if needed (though default grass isn't)
            world.setBlock(5, 0, 5, BLOCKS[0].id); // Set to Air
            expect(world.dirtyChunks.has(chunk000)).toBe(true);
            expect(world.dirtyChunks.has(chunk0m10)).toBe(true);
        });

        it('should mark both chunks dirty when setting AIR on the boundary (Y=-1)', () => {
            // Ensure block is not already air if needed (though default dirt isn't)
            world.setBlock(5, -1, 5, BLOCKS[0].id); // Set to Air
            expect(world.dirtyChunks.has(chunk0m10)).toBe(true);
            expect(world.dirtyChunks.has(chunk000)).toBe(true);
        });
    });
});
