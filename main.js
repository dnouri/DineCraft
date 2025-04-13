import * as THREE from 'three';
import { World } from './src/World.js';
import { TextureAtlas } from './src/TextureAtlas.js';
import { Player } from './src/Player.js';
import { Controls } from './src/Controls.js';

// Basic Three.js setup
const clock = new THREE.Clock(); // Clock for delta time
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

// Texture Atlas, World, Player, Controls Initialization
const textureAtlas = new TextureAtlas();
let world;
let player;
let controls;

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

        // Create Player and Controls AFTER world is ready
        player = new Player(camera, scene);
        controls = new Controls(player.camera, renderer.domElement); // Pass player's camera

        // Initial camera setup is now handled within Player constructor

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

    const deltaTime = clock.getDelta();

    // Update game logic
    if (player && world && controls) {
        player.update(deltaTime, world, controls);
    }
    // world.update(player.position); // Placeholder for dynamic chunk loading (Milestone 5)

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
