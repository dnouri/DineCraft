import { Noise } from 'noisejs';
import { BLOCKS } from './BlockRegistry.js';

/**
 * Generates block data for chunks using procedural noise.
 */
export class TerrainGenerator {
    /**
     * @param {number} seed The seed for the noise generator.
     */
    constructor(seed) {
        this.noise = new Noise(seed);
        // Define generation parameters (can be tuned later)
        this.scale = 50; // Controls the feature size (larger scale = larger features)
        this.threshold = 0.0; // Density threshold for solid vs. air
    }

    /**
     * Determines the block ID for a given world coordinate using 3D noise.
     * @param {number} worldX World X coordinate.
     * @param {number} worldY World Y coordinate.
     * @param {number} worldZ World Z coordinate.
     * @returns {number} The block ID (e.g., Stone or Air).
     */
    getBlockId(worldX, worldY, worldZ) {
        // Calculate noise value at scaled coordinates
        const noiseValue = this.noise.simplex3(
            worldX / this.scale,
            worldY / this.scale,
            worldZ / this.scale
        );

        // Determine block type based on threshold
        if (noiseValue > this.threshold) {
            return BLOCKS[3].id; // Stone
        } else {
            return BLOCKS[0].id; // Air
        }
    }
}
