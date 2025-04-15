import * as THREE from 'three';
import { World } from './src/World.js';
import { TextureAtlas } from './src/TextureAtlas.js';
import { Player } from './src/Player.js';
import { Controls } from './src/Controls.js';

// --- Core Components ---
const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue

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
    color: 0xffff00, // Yellow
    transparent: true,
    opacity: 0.3,
    depthWrite: false // See through
});
const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
highlightMesh.visible = false;
highlightMesh.renderOrder = 1; // Render after solid geometry
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
        console.log("Generating initial chunk...");
        const initialChunk = world.getOrCreateChunk(0, 0); // Use renamed method
        if (initialChunk.mesh) { // Ensure mesh exists before adding
             scene.add(initialChunk.mesh);
             console.log("Initial chunk mesh added to scene.");
        } else {
             console.warn("Initial chunk generated but mesh is null.");
        }


        // Create Player and Controls AFTER world is ready
        // Pass necessary dependencies (world, highlightMesh)
        player = new Player(camera, scene, world, highlightMesh);
        controls = new Controls(player, world, renderer.domElement); // Pass world here too

        // Start the game loop
        animate();

    } catch (error) {
        console.error("Failed to initialize game:", error);
        // Consider adding user-facing error display here
    }
}

// --- Game Loop ---
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Update game state (if components are initialized)
    if (player && world && controls) {
        // Player update requires delta time and controls state
        player.update(deltaTime, controls);
        // Player target block update requires world
        player.updateTargetBlock(); // World is now internal to player
        // World updates dirty chunk meshes, needs scene access to add new meshes
        world.updateDirtyChunkMeshes(scene);
        // Controls update (if needed in the future)
        // controls.update(deltaTime);
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

// --- Start ---
initializeGame();
