import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { BLOCKS } from './BlockRegistry.js'; // Import BLOCKS for hotbar

/**
 * Manages player input including mouse look, keyboard movement, and interaction/hotbar keys.
 */
export class Controls {
    /**
     * @param {THREE.Camera} camera The camera to control.
     * @param {Player} player The player instance to control.
     * @param {HTMLElement} domElement The element to attach listeners to (renderer canvas).
     */
    constructor(player, domElement) { // Changed camera to player
        this.player = player; // Store player reference
        this.camera = player.camera; // Get camera from player
        this.domElement = domElement;
        this.pointerLockControls = new PointerLockControls(this.camera, domElement);

        // Movement state flags
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        // this.moveUp = false; // Jump - for later
        // No need to store selectedBlockId here, it's in Player

        this.initEventListeners();
    }

    initEventListeners() {
        // Pointer Lock activation
        this.domElement.addEventListener('click', () => {
            this.pointerLockControls.lock();
        });

        // Keyboard & Mouse events
        document.addEventListener('keydown', (event) => this.onKeyDown(event), false);
        document.addEventListener('keyup', (event) => this.onKeyUp(event), false);
        this.domElement.addEventListener('mousedown', (event) => this.onMouseDown(event), false); // Add mouse down listener

        // Handle pointer lock changes (e.g., show menu when unlocked)
        this.pointerLockControls.addEventListener('lock', () => {
            console.log('Pointer locked');
            // You could hide menus here
        });

        this.pointerLockControls.addEventListener('unlock', () => {
            console.log('Pointer unlocked');
            // You could show menus here
            // Reset movement keys on unlock to prevent unwanted movement
            this.resetMovementKeys();
        });
    }

    onKeyDown(event) {
        if (!this.pointerLockControls.isLocked) return; // Only handle keys if pointer is locked

        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true;
                break;
            // case 'Space':
            //     this.moveUp = true; // Jump - for later
            //     break;

            // Hotbar Keys (M4.5)
            case 'Digit1': // Key '1'
                this.player.selectedBlockId = BLOCKS[1].id; // Grass
                console.log("Selected Block: Grass");
                break;
            case 'Digit2': // Key '2'
                this.player.selectedBlockId = BLOCKS[2].id; // Dirt
                console.log("Selected Block: Dirt");
                break;
            case 'Digit3': // Key '3'
                this.player.selectedBlockId = BLOCKS[3].id; // Stone
                console.log("Selected Block: Stone");
                break;
            case 'Digit4': // Key '4'
                this.player.selectedBlockId = BLOCKS[4].id; // Wood
                console.log("Selected Block: Wood");
                break;
        }
    }

    onKeyUp(event) {
        // No need to check isLocked here, always reset keys on release
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false;
                break;
            // case 'Space':
            //     this.moveUp = false; // Jump - for later
            //     break;
        }
    }

    resetMovementKeys() {
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        // this.moveUp = false;
    }

    onMouseDown(event) {
        if (!this.pointerLockControls.isLocked) return;

        // We need access to the world to interact. This is a bit awkward here.
        // For now, we assume the 'world' variable is accessible globally or passed differently.
        // A better approach might involve an event system or passing world to Controls update.
        // Pass the world reference AND the event object
        if (window.world && this.player) {
             this.player.tryInteract(window.world, event);
        } else {
            console.warn("World or Player reference not available for interaction.");
        }
    }

    // Optional: Add an update method if controls need per-frame updates
    // update(deltaTime, world) { // Could pass world here
    //     // Example: Apply sensitivity or smoothing
    // }
}
