import * as THREE from 'three';

/**
 * Manages loading and providing access to the game's texture atlas.
 * For Milestone 1, this loads a single placeholder texture and creates one material.
 */
export class TextureAtlas {
    constructor(textureUrl = 'assets/atlas.png') {
        this.textureUrl = textureUrl;
        this.texture = null;
        this.material = null;
    }

    /**
     * Loads the texture atlas image.
     * @returns {Promise<void>} A promise that resolves when the texture is loaded.
     */
    load() {
        const loader = new THREE.TextureLoader();
        return new Promise((resolve, reject) => {
            loader.load(
                this.textureUrl,
                (texture) => {
                    console.log("Texture loaded successfully.");
                    this.texture = texture;
                    // Use NearestFilter for a pixelated look, common in voxel games
                    this.texture.magFilter = THREE.NearestFilter;
                    this.texture.minFilter = THREE.NearestFilter;

                    // Create a basic material using the loaded texture
                    this.material = new THREE.MeshStandardMaterial({
                        map: this.texture,
                        side: THREE.FrontSide // Render only the front side of faces
                    });
                    resolve();
                },
                undefined, // onProgress callback not needed here
                (error) => {
                    console.error('An error occurred loading the texture:', error);
                    // Fallback: Create a simple red material if texture fails to load
                    this.material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                    reject(error);
                }
            );
        });
    }

    /**
     * Returns the material created from the texture atlas.
     * In later milestones, this might return different materials or handle UV mapping.
     * @returns {THREE.Material} The material for rendering blocks.
     */
    getMaterial() {
        if (!this.material) {
            console.warn("Material requested before texture was loaded. Returning fallback.");
            // Provide a fallback material if accessed too early or if loading failed
            return new THREE.MeshStandardMaterial({ color: 0xff00ff }); // Magenta fallback
        }
        return this.material;
    }
}
