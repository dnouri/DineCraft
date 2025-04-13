/**
 * Defines the properties of different block types in the game.
 */

export const BLOCKS = {
    // ID 0 is always Air
    0: {
        id: 0,
        name: 'air',
        solid: false,
    },
    1: {
        id: 1,
        name: 'grass',
        solid: true,
        // Placeholder textures - Milestone 1 uses a single material
    },
    2: {
        id: 2,
        name: 'dirt',
        solid: true,
    },
    3: {
        id: 3,
        name: 'stone',
        solid: true,
    },
    // Wood will be added in Milestone 3
};

// Helper function to get block properties by ID
export function getBlockById(id) {
    return BLOCKS[id] || BLOCKS[0]; // Default to Air if ID is invalid
}
