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
        expect(generator.threshold).toBeDefined(); // Old 3D noise param
        // New 2D heightmap params
        expect(generator.surfaceScale).toBeDefined();
        expect(generator.baseLevel).toBeDefined();
        expect(generator.amplitude).toBeDefined();
        expect(generator.dirtDepth).toBeDefined();
    });

    // Remove the obsolete placeholder test
    // it('getBlockId should return Air (placeholder implementation)', () => { ... });

    it('getBlockId should return correct block based on heightmap logic', () => {
        // Using seed 12345 and default heightmap parameters:
        // surfaceScale=100, baseLevel=0, amplitude=15, dirtDepth=3
        // Test coordinate X=10, Z=20 with seed 12345
        // From debug logs: noise.simplex2 -> surfaceNoiseValue: -0.2947...
        // surfaceY = floor(0 + (-0.2947...) * 15) = floor(-4.42...) = -5
        // Therefore, the actual surface level calculated by the generator is Y = -5.

        const testX = 10;
        const testZ = 20;
        const actualSurfaceY = -5; // Based on debug logs

        // Test well above surface (e.g., Y=0)
        expect(generator.getBlockId(testX, 0, testZ)).toBe(BLOCKS[0].id); // Air (0 > -5)
        // Test just above surface (e.g., Y=-4)
        expect(generator.getBlockId(testX, actualSurfaceY + 1, testZ)).toBe(BLOCKS[0].id); // Air (-4 > -5)

        // Test at actual surface
        expect(generator.getBlockId(testX, actualSurfaceY, testZ)).toBe(BLOCKS[1].id); // Grass (-5 === -5)

        // Test within dirt depth (Y=-6, Y=-7, Y=-8)
        expect(generator.getBlockId(testX, actualSurfaceY - 1, testZ)).toBe(BLOCKS[2].id); // Dirt (-6 >= -5 - 3)
        expect(generator.getBlockId(testX, actualSurfaceY - generator.dirtDepth, testZ)).toBe(BLOCKS[2].id); // Dirt (-8 >= -5 - 3) (last layer)

        // Test below dirt depth (Y=-9)
        expect(generator.getBlockId(testX, actualSurfaceY - generator.dirtDepth - 1, testZ)).toBe(BLOCKS[3].id); // Stone (-9 < -5 - 3)
        expect(generator.getBlockId(testX, -100, testZ)).toBe(BLOCKS[3].id); // Stone (deep)

        // Test origin (0,0,0) - calculate separately
        // noise.simplex2(0,0) = 0. surfaceY = floor(0 + 0 * 15) = 0.
        // worldY=0 is surfaceY=0. Expect Grass (1).
        expect(generator.getBlockId(0, 0, 0)).toBe(BLOCKS[1].id); // Expect Grass (1)
    });
});
