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
        // Define generation parameters

        // 3D Noise parameters (currently used)
        this.scale = 50; // Controls the feature size for 3D noise
        this.threshold = 0.0; // Density threshold for 3D noise solid vs. air

        // 2D Heightmap parameters (to be implemented)
        this.surfaceScale = 100; // Controls the scale of hills/valleys
        this.baseLevel = 0;      // Average surface height around Y=0
        this.amplitude = 15;     // Max deviation from baseLevel (+/-)
        this.dirtDepth = 3;      // How many blocks of dirt below grass
    }

    /**
     * Determines the block ID for a given world coordinate using 3D noise.
     * @param {number} worldX World X coordinate.
     * @param {number} worldY World Y coordinate.
     * @param {number} worldZ World Z coordinate.
     * @returns {number} The block ID (Air, Grass, Dirt, or Stone).
     */
    getBlockId(worldX, worldY, worldZ) {
        // Calculate surface height using 2D noise based on X and Z
        const surfaceNoiseValue = this.noise.simplex2(
            worldX / this.surfaceScale,
            worldZ / this.surfaceScale
        ); // Output is typically between -1 and 1

        // Map noise value to world height range
        // Example: baseLevel=0, amplitude=15 -> range is -15 to +15
        const surfaceY = Math.floor(this.baseLevel + surfaceNoiseValue * this.amplitude);

        // Determine block type based on worldY relative to surfaceY
        if (worldY > surfaceY) {
            // Above the surface
            return BLOCKS[0].id; // Air
        } else if (worldY === surfaceY) {
            // Exactly at the surface
            return BLOCKS[1].id; // Grass
        } else if (worldY >= surfaceY - this.dirtDepth) {
            // Just below the surface, within dirt depth
            return BLOCKS[2].id; // Dirt
        } else {
            // Deep below the surface
            return BLOCKS[3].id; // Stone
        }
    }
}
