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
        this.world = world; // Store world reference (though interaction is via player now)
        this.camera = player.camera; // Get camera from player for PointerLock
        this.domElement = domElement;
        this.pointerLockControls = new PointerLockControls(this.camera, domElement);

        // Input state flags
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        // this.jump = false; // For later jump implementation

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
            //     this.jump = true; // For later jump implementation
            //     break;

            // Hotbar Keys
            case 'Digit1':
                this.player.selectedBlockId = BLOCKS[1].id; // Grass
                // console.log("Selected Block: Grass");
                break;
            case 'Digit2':
                this.player.selectedBlockId = BLOCKS[2].id; // Dirt
                // console.log("Selected Block: Dirt");
                break;
            case 'Digit3':
                this.player.selectedBlockId = BLOCKS[3].id; // Stone
                // console.log("Selected Block: Stone");
                break;
            case 'Digit4':
                this.player.selectedBlockId = BLOCKS[4].id; // Wood
                // console.log("Selected Block: Wood");
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
            //     this.jump = false; // For later jump implementation
            //     break;
        }
    }

    /** Resets movement flags, typically called when pointer lock is lost. */
    resetMovementKeys() {
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        // this.jump = false;
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
