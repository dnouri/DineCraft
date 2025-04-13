import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

/**
 * Manages player input including mouse look and keyboard movement.
 */
export class Controls {
    /**
     * @param {THREE.Camera} camera The camera to control.
     * @param {HTMLElement} domElement The element to attach listeners to (renderer canvas).
     */
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.pointerLockControls = new PointerLockControls(camera, domElement);

        // Movement state flags
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        // this.moveUp = false; // Jump - for later

        this.initEventListeners();
    }

    initEventListeners() {
        // Pointer Lock activation
        this.domElement.addEventListener('click', () => {
            this.pointerLockControls.lock();
        });

        // Keyboard events
        document.addEventListener('keydown', (event) => this.onKeyDown(event), false);
        document.addEventListener('keyup', (event) => this.onKeyUp(event), false);

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

    // Optional: Add an update method if controls need per-frame updates
    // update(deltaTime) {
    //     // Example: Apply sensitivity or smoothing
    // }
}
