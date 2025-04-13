import * as THREE from 'three';
import { getBlockById } from './BlockRegistry.js';

// Player constants
const PLAYER_HEIGHT = 1.8;
const PLAYER_WIDTH = 0.6;
const PLAYER_DEPTH = 0.6;
const PLAYER_EYE_HEIGHT = 1.6; // Relative to player base
const PLAYER_SPEED = 5.0; // Units per second
const GRAVITY = 20.0; // Units per second per second
const RESPAWN_Y_LEVEL = -50; // Y level below which the player respawns
// const JUMP_VELOCITY = 8.0; // For later

export class Player {
    /**
     * @param {THREE.PerspectiveCamera} camera The main camera.
     * @param {THREE.Scene} scene The scene to add the player object to.
     */
    constructor(camera, scene) {
        this.camera = camera;
        this.initialSpawnPoint = new THREE.Vector3(8, 1, 8); // Store initial spawn point
        // Spawn the player in the center of the initial chunk (0,0) and just above ground level (Y=0)
        this.position = this.initialSpawnPoint.clone(); // Start at spawn point
        this.velocity = new THREE.Vector3();
        this.onGround = false;

        // Player's physical representation (invisible object to move)
        this.playerObject = new THREE.Object3D();
        this.playerObject.position.copy(this.position);
        scene.add(this.playerObject);

        // Attach camera to the player object at eye level
        this.camera.position.set(0, PLAYER_EYE_HEIGHT, 0);
        this.playerObject.add(this.camera);

        // Player bounding box for collision detection
        // Centered at the player's feet position
        this.boundingBox = new THREE.Box3(
            new THREE.Vector3(-PLAYER_WIDTH / 2, 0, -PLAYER_DEPTH / 2),
            new THREE.Vector3(PLAYER_WIDTH / 2, PLAYER_HEIGHT, PLAYER_DEPTH / 2)
        );
    }

    /**
     * Updates the player's state based on input, physics, and collisions.
     * @param {number} deltaTime Time elapsed since the last frame.
     * @param {World} world The world object for collision checks.
     * @param {Controls} controls The controls object for input state.
     */
    update(deltaTime, world, controls) {
        // --- 1. Apply Gravity ---
        this.velocity.y -= GRAVITY * deltaTime;

        // --- 2. Calculate Movement Velocity based on Input ---
        const speed = PLAYER_SPEED;
        let moveVelocity = new THREE.Vector3();

        if (controls.moveForward) moveVelocity.z -= speed;
        if (controls.moveBackward) moveVelocity.z += speed;
        if (controls.moveLeft) moveVelocity.x -= speed;
        if (controls.moveRight) moveVelocity.x += speed;

        // Apply camera rotation to movement vector
        moveVelocity.applyQuaternion(this.camera.quaternion);
        // Only use X and Z components for horizontal movement
        this.velocity.x = moveVelocity.x;
        this.velocity.z = moveVelocity.z;

        // --- 3. Calculate Potential New Position ---
        const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
        const potentialPosition = this.playerObject.position.clone().add(deltaPosition);

        // --- 4. Collision Detection & Velocity Adjustment ---
        this.onGround = false;
        // Use a temporary velocity vector that we can adjust based on collisions
        const adjustedVelocity = this.velocity.clone();
        // Bounding box at the potential next position
        const playerBoxWorld = this.boundingBox.clone().translate(potentialPosition);

        // Get block coordinates around the player's potential AABB
        const minX = Math.floor(playerBoxWorld.min.x);
        const maxX = Math.ceil(playerBoxWorld.max.x);
        const minY = Math.floor(playerBoxWorld.min.y);
        const maxY = Math.ceil(playerBoxWorld.max.y);
        const minZ = Math.floor(playerBoxWorld.min.z);
        const maxZ = Math.ceil(playerBoxWorld.max.z);

        let correctedY = potentialPosition.y; // Store corrected Y separately

        for (let y = minY; y < maxY; y++) {
            for (let z = minZ; z < maxZ; z++) {
                for (let x = minX; x < maxX; x++) {
                    const blockId = world.getBlock(x, y, z);
                    const block = getBlockById(blockId);

                    if (block.solid) {
                        const blockBox = new THREE.Box3(
                            new THREE.Vector3(x, y, z),
                            new THREE.Vector3(x + 1, y + 1, z + 1)
                        );

                        // Create a temporary player box for intersection tests per axis
                        let tempPlayerBox = this.boundingBox.clone();

                        // Check Y collision
                        tempPlayerBox.translate(new THREE.Vector3(this.playerObject.position.x, potentialPosition.y, this.playerObject.position.z));
                        if (tempPlayerBox.intersectsBox(blockBox)) {
                            if (adjustedVelocity.y < 0 && this.playerObject.position.y >= blockBox.max.y) { // Falling onto block
                                adjustedVelocity.y = 0;
                                correctedY = blockBox.max.y; // Snap Y position
                                this.onGround = true;
                            } else if (adjustedVelocity.y > 0 && this.playerObject.position.y + PLAYER_HEIGHT <= blockBox.min.y) { // Hitting ceiling
                                adjustedVelocity.y = 0;
                                correctedY = blockBox.min.y - PLAYER_HEIGHT; // Snap Y position
                            }
                        }

                        // Check X collision (using corrected Y position)
                        tempPlayerBox.translate(new THREE.Vector3(potentialPosition.x, correctedY, this.playerObject.position.z));
                         if (tempPlayerBox.intersectsBox(blockBox)) {
                            if (adjustedVelocity.x > 0 && this.playerObject.position.x + PLAYER_WIDTH / 2 <= blockBox.min.x) { // Moving right
                                adjustedVelocity.x = 0;
                            } else if (adjustedVelocity.x < 0 && this.playerObject.position.x - PLAYER_WIDTH / 2 >= blockBox.max.x) { // Moving left
                                adjustedVelocity.x = 0;
                            }
                        }

                        // Check Z collision (using corrected Y position)
                        tempPlayerBox.translate(new THREE.Vector3(this.playerObject.position.x, correctedY, potentialPosition.z));
                         if (tempPlayerBox.intersectsBox(blockBox)) {
                            if (adjustedVelocity.z > 0 && this.playerObject.position.z + PLAYER_DEPTH / 2 <= blockBox.min.z) { // Moving forward (+Z in Three.js)
                                adjustedVelocity.z = 0;
                            } else if (adjustedVelocity.z < 0 && this.playerObject.position.z - PLAYER_DEPTH / 2 >= blockBox.max.z) { // Moving backward (-Z in Three.js)
                                adjustedVelocity.z = 0;
                            }
                        }
                    }
                }
            }
        }

        // --- 5. Update Player Position using adjusted velocity and corrected Y ---
        this.velocity.copy(adjustedVelocity); // Update the main velocity for the next frame

        // Calculate final delta based on potentially adjusted velocity
        const finalDeltaPosition = this.velocity.clone().multiplyScalar(deltaTime);

        this.playerObject.position.x += finalDeltaPosition.x;
        this.playerObject.position.z += finalDeltaPosition.z;
        // Apply corrected Y position directly if grounded or hit ceiling, otherwise apply delta Y
        if (this.onGround || (this.velocity.y === 0 && potentialPosition.y !== this.playerObject.position.y + deltaPosition.y)) {
             this.playerObject.position.y = correctedY;
        } else {
             this.playerObject.position.y += finalDeltaPosition.y;
        }

        // --- 6. Check for Respawn ---
        if (this.playerObject.position.y < RESPAWN_Y_LEVEL) {
            this.respawn();
        }
    }

    /**
     * Resets the player's position to the spawn point and stops their movement.
     */
    respawn() {
        this.playerObject.position.copy(this.initialSpawnPoint);
        this.velocity.set(0, 0, 0);
        this.onGround = false; // Assume not on ground immediately after respawn
        console.log("Player respawned.");
    }
}
