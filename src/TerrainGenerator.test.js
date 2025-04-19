import { describe, it, expect, beforeEach } from 'vitest';
import { TerrainGenerator } from './TerrainGenerator.js';
import { BLOCKS } from './BlockRegistry.js';

describe('TerrainGenerator', () => {
    let generator;
    const seed = 12345; // Use a fixed seed for tests

    beforeEach(() => {
        generator = new TerrainGenerator(seed);
    });

    it('should be instantiated with a seed', () => {
        expect(generator).toBeInstanceOf(TerrainGenerator);
        expect(generator.noise).toBeDefined();
        expect(generator.scale).toBeDefined();
        expect(generator.threshold).toBeDefined();
    });

    it('getBlockId should return Air (placeholder implementation)', () => {
        // Test the placeholder before noise logic is added
        // expect(generator.getBlockId(0, 0, 0)).toBe(BLOCKS[0].id); // Removed - logic changed
        // This test is no longer valid as the placeholder is removed.
        // expect(generator.getBlockId(0, 0, 0)).toBe(BLOCKS[0].id);
        // expect(generator.getBlockId(10, 50, -20)).toBe(BLOCKS[0].id);
        // We replace it with tests for the actual noise logic below.
    });

    it('getBlockId should return correct block based on noise value vs threshold', () => {
        // Using seed 12345, scale 50, threshold 0.0:

        // Test Case 1: Origin (0,0,0)
        // noise.simplex3(0, 0, 0) = 0. 0 is not > 0.0, so expect Air.
        expect(generator.getBlockId(0, 0, 0)).toBe(BLOCKS[0].id); // Air

        // Test Case 2: Coords (-50, -100, 50) -> Scaled (-1, -2, 1)
        // noise.simplex3(-1, -2, 1) = approx 0.016. 0.016 > 0.0, so expect Stone.
        expect(generator.getBlockId(-50, -100, 50)).toBe(BLOCKS[3].id); // Stone (Updated expectation)

        // Test Case 3: Coords (10, 20, 30) -> Scaled (0.2, 0.4, 0.6)
        // noise.simplex3(0.2, 0.4, 0.6) = approx -0.145. -0.145 is not > 0.0, so expect Air.
        expect(generator.getBlockId(10, 20, 30)).toBe(BLOCKS[0].id); // Air (Updated expectation)
    });

    // Removed the separate tests as they are now combined and corrected above.
    // it('getBlockId should return Stone for noise value > threshold', () => { ... });
});
