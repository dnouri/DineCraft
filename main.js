import * as THREE from 'three';
import { World } from './src/World.js';
import { TextureAtlas } from './src/TextureAtlas.js';

// Basic Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);

// Lighting
const ambientLight = new THREE.AmbientLight(0xcccccc, 0.5); // Soft ambient light
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Simulate sunlight
directionalLight.position.set(1, 1, 0.5).normalize();
scene.add(directionalLight);

// Texture Atlas and World Initialization
const textureAtlas = new TextureAtlas();
let world; // Declare world variable

// --- Game Initialization ---
async function initializeGame() {
    try {
        await textureAtlas.load(); // Wait for the texture to load
        console.log("Texture Atlas loaded.");

        const chunkMaterial = textureAtlas.getMaterial();
        world = new World(chunkMaterial);

        // Generate the initial chunk(s) for Milestone 1
        console.log("Generating initial chunk...");
        const initialChunk = world.addChunk(0, 0); // Create chunk at 0,0
        scene.add(initialChunk.getMesh()); // Add the chunk's mesh group to the scene
        console.log("Initial chunk added to scene.");

        // Position the camera to view the world
        camera.position.set(8, 10, 24); // Position above ground level, looking towards origin
        camera.lookAt(8, 0, 8); // Look towards the center of the initial chunk

        // Start the game loop only after initialization is complete
        animate();

    } catch (error) {
        console.error("Failed to initialize game:", error);
        // Display an error message to the user on the page?
    }
}

// --- Game Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Update game logic here (e.g., player movement in later milestones)
    // world.update(camera.position); // Placeholder for dynamic chunk loading

    renderer.render(scene, camera);
}

// --- Event Listeners ---
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Start Initialization ---
initializeGame();
