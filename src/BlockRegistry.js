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
        textures: {
            top: [0.0, 0.75],    // Original Grass Top texture at (0,3)
            bottom: [0.5, 0.75], // Dirt texture at (2,3)
            side: [0.25, 0.75]   // Grass Side texture at (1,3)
        },
    },
    2: {
        id: 2,
        name: 'dirt',
        solid: true,
        textures: {
            all: [0.5, 0.75]     // Dirt texture at (2,3) for all faces
        },
    },
    3: {
        id: 3,
        name: 'stone',
        solid: true,
        textures: {
            all: [0.75, 0.75]     // Stone texture at (3,3) for all faces
        },
    },
    4: { // Adding Wood Block
        id: 4,
        name: 'wood',
        solid: true,
        textures: {
            top: [0.0, 0.5],     // Wood Top/Bottom texture at (0,2)
            bottom: [0.0, 0.5],  // Wood Top/Bottom texture at (0,2)
            side: [0.25, 0.5]    // Wood Side texture at (1,2)
        },
    },
};

// Size of one texture tile in the atlas UV coordinates (16px / 64px = 0.25)
const TILE_UV_WIDTH = 0.25;
const TILE_UV_HEIGHT = 0.25;

// Helper function to get block properties by ID
export function getBlockById(id) {
    return BLOCKS[id] || BLOCKS[0]; // Default to Air if ID is invalid
}

/**
 * Gets the UV coordinates for a specific face of a block.
 * @param {number} blockId The ID of the block.
 * @param {string} faceName The name of the face ('top', 'bottom', 'side', 'north', 'south', 'east', 'west', or 'all').
 * @returns {number[]} An array [u, v] representing the bottom-left UV coordinate, or null if not found.
 */
export function getBlockTextureUV(blockId, faceName) {
    const block = getBlockById(blockId);
    if (!block.textures) return null;

    // Handle specific face names, falling back to 'side' or 'all'
    const uv = block.textures[faceName] ||
               (faceName !== 'top' && faceName !== 'bottom' ? block.textures.side : null) ||
               block.textures.all;

    return uv || null;
}

/**
 * Generates the four UV coordinates for a texture tile based on its bottom-left corner.
 * Assumes standard texture mapping (bottom-left, bottom-right, top-left, top-right).
 * @param {number} u The U coordinate of the bottom-left corner.
 * @param {number} v The V coordinate of the bottom-left corner.
 * @returns {number[]} A flat array of [u0, v0, u1, v1, u2, v2, u3, v3].
 */
export function generateFaceUVs(u, v) {
    return [
        u, v,                         // Bottom-left
        u + TILE_UV_WIDTH, v,          // Bottom-right
        u, v + TILE_UV_HEIGHT,         // Top-left
        u + TILE_UV_WIDTH, v + TILE_UV_HEIGHT // Top-right
    ];
}
