import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { BLOCKS } from './BlockRegistry.js'; // Import BLOCKS for hotbar

/**
 * Manages player input including mouse look, keyboard movement, and interaction/hotbar keys.
 */
export class Controls {
    /**
     * @param {Player} player The player instance to control and interact through.
     * @param {World} world The world instance for interactions (passed to player).
     * @param {HTMLElement} domElement The element to attach listeners to (renderer canvas).
     */
    constructor(player, world, domElement) {
        this.player = player;
        this.world = world; // Store world reference (passed to player for interaction)
        this.camera = player.camera;
        this.domElement = domElement;
        this.pointerLockControls = new PointerLockControls(this.camera, domElement);

        // Input state flags
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        // New state flags for jumping and flying
        this.jumpKeyPressed = false; // Tracks if Space is currently held down
        this.flyDownKeyPressed = false; // Tracks if Shift is currently held down
        this.toggleFlyRequested = false; // One-shot flag to signal fly mode toggle

        this.initEventListeners();
    }

    initEventListeners() {
        this.domElement.addEventListener('click', () => {
            this.pointerLockControls.lock();
        });

        document.addEventListener('keydown', (event) => this.onKeyDown(event), false);
        document.addEventListener('keyup', (event) => this.onKeyUp(event), false);
        this.domElement.addEventListener('mousedown', (event) => this.onMouseDown(event), false);

        // Handle pointer lock changes (e.g., show menu when unlocked)
        this.pointerLockControls.addEventListener('lock', () => {
            console.log('Pointer locked');
            // You could hide menus here
        });

        this.pointerLockControls.addEventListener('unlock', () => {
            console.log('Pointer unlocked');
            // You could show menus here
            // Reset movement keys on unlock to prevent unwanted movement
            this.resetInputKeys();
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
            case 'Space':
                this.jumpKeyPressed = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.flyDownKeyPressed = true;
                break;
            case 'KeyF':
                // Set the request flag. Player update loop will handle the actual toggle.
                this.toggleFlyRequested = true;
                break;

            // Hotbar Keys
            case 'Digit1':
                this.player.selectedBlockId = BLOCKS[1].id; // Grass
                break;
            case 'Digit2':
                this.player.selectedBlockId = BLOCKS[2].id; // Dirt
                break;
            case 'Digit3':
                this.player.selectedBlockId = BLOCKS[3].id; // Stone
                break;
            case 'Digit4':
                this.player.selectedBlockId = BLOCKS[4].id; // Wood
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
            case 'Space':
                this.jumpKeyPressed = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.flyDownKeyPressed = false;
                break;
            // No need to handle KeyF up, toggleFlyRequested is a one-shot flag reset by Player
        }
    }

    /** Resets input flags, typically called when pointer lock is lost. */
    resetInputKeys() {
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.jumpKeyPressed = false;
        this.flyDownKeyPressed = false;
        // toggleFlyRequested is a one-shot trigger, no need to reset here
    }

    /** Handles mouse button presses for interaction. */
    onMouseDown(event) {
        if (!this.pointerLockControls.isLocked || !this.player) return;

        // Delegate interaction logic entirely to the player instance
        this.player.tryInteract(event);
    }

    // update(deltaTime) {
    //     // Potential future use for control smoothing, etc.
    // }
}
