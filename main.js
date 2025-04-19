import * as THREE from 'three';
import { World } from './src/World.js';
import { TextureAtlas } from './src/TextureAtlas.js';
import { Player } from './src/Player.js';
import { Controls } from './src/Controls.js';

// --- Core Components ---
const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xcccccc, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 0.5).normalize();
scene.add(directionalLight);

// --- Highlight Mesh ---
const highlightGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.3,
    depthWrite: false // Allows seeing blocks through the highlight
});
const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
highlightMesh.visible = false;
highlightMesh.renderOrder = 1; // Render after solid chunk geometry
scene.add(highlightMesh);

// --- Game Components ---
const textureAtlas = new TextureAtlas();
let world;
let player;
let controls;

// --- Initialization ---
async function initializeGame() {
    try {
        await textureAtlas.load();
        console.log("Texture Atlas loaded.");

        const chunkMaterial = textureAtlas.getMaterial();
        world = new World(chunkMaterial);

        // Generate initial chunk(s)
        console.log("Generating initial chunks...");
        const initialChunkTop = world.getOrCreateChunk(0, 0, 0); // Explicitly create at Y=0
        const initialChunkBottom = world.getOrCreateChunk(0, -1, 0); // Create chunk below at Y=-1

        // Meshes for newly created chunks are added by world.updateDirtyChunkMeshes later in the game loop.

        // Create Player and Controls AFTER world is ready
        player = new Player(camera, scene, world, highlightMesh);
        controls = new Controls(player, world, renderer.domElement);

        animate(); // Start the game loop

    } catch (error) {
        console.error("Failed to initialize game:", error);
        // Consider adding user-facing error display here
    }
}

// --- Game Loop ---
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Update game state (only if components are initialized)
    if (player && world && controls) {
        player.update(deltaTime, controls); // Handles physics, collisions, input response
        player.updateTargetBlock();         // Handles raycasting for interaction
        world.updateDirtyChunkMeshes(scene); // Updates chunk geometry and adds new meshes
        // controls.update(deltaTime); // Potential future use
    }

    renderer.render(scene, camera);
}

// --- Event Listeners ---
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Start Game ---
initializeGame();
