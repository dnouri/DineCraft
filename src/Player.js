import * as THREE from 'three';
import { getBlockById, BLOCKS } from './BlockRegistry.js'; // Import BLOCKS

// Player constants
const INTERACTION_REACH = 5; // Max distance player can interact with blocks
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

        // Interaction Raycaster
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = INTERACTION_REACH; // Set max distance

        // Hotbar state
        this.selectedBlockId = BLOCKS[3].id; // Default to Stone (ID 3)

        // Target block state (for continuous highlighting and interaction)
        this.targetedHitPos = null;
        this.targetedPlacePos = null;
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
     * Updates the currently targeted block based on raycasting.
     * Controls the visibility and position of the highlight mesh.
     * @param {World} world The world object to raycast against.
     */
    updateTargetBlock(world) {
        if (!world) return;

        // Raycast from camera center
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

        // Get chunk meshes (Inefficient - same as before)
        const chunkMeshes = [];
        world.chunks.forEach(chunk => {
            if (chunk.mesh) {
                chunkMeshes.push(chunk.mesh);
            }
        });

        const intersects = this.raycaster.intersectObjects(chunkMeshes);

        if (intersects.length > 0) {
            const intersection = intersects[0]; // Closest intersection

            // Calculate Hit and Placement Coordinates (same logic as before)
            const hitPoint = intersection.point.clone().sub(intersection.face.normal.clone().multiplyScalar(0.01));
            const hitBlockPos = new THREE.Vector3(Math.floor(hitPoint.x), Math.floor(hitPoint.y), Math.floor(hitPoint.z));

            const placePoint = intersection.point.clone().add(intersection.face.normal.clone().multiplyScalar(0.01));
            const placeBlockPos = new THREE.Vector3(Math.floor(placePoint.x), Math.floor(placePoint.y), Math.floor(placePoint.z));

            // Store the results
            this.targetedHitPos = hitBlockPos;
            this.targetedPlacePos = placeBlockPos;

            // Update highlight mesh
            if (window.highlightMesh) {
                window.highlightMesh.position.set(hitBlockPos.x + 0.5, hitBlockPos.y + 0.5, hitBlockPos.z + 0.5);
                window.highlightMesh.visible = true;
            }

        } else {
            // No intersection within reach
            this.targetedHitPos = null;
            this.targetedPlacePos = null;

            // Hide highlight mesh
            if (window.highlightMesh) {
                window.highlightMesh.visible = false;
            }
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

    /**
     * Tries to interact with the world based on where the player is looking.
     * Called on mouse click.
     * @param {World} world The world object to interact with.
     * @param {MouseEvent} event The mouse event containing button information.
     */
    tryInteract(world, event) { // Add event parameter
        if (!world || !event) return; // Need world and event access

        const button = event.button; // 0: left, 1: middle, 2: right

        // Use the continuously updated target block positions
        if (!this.targetedHitPos || !this.targetedPlacePos) {
            // No block currently targeted, do nothing on click
            return;
        }

        // Get the positions calculated by updateTargetBlock
        const hitBlockPos = this.targetedHitPos;
        const placeBlockPos = this.targetedPlacePos;

        // --- Handle Interaction based on Mouse Button ---
        if (button === 0) { // Left Click: Break Block
            console.log(`Attempting to break block at ${hitBlockPos.x}, ${hitBlockPos.y}, ${hitBlockPos.z}`);
            world.setBlock(hitBlockPos.x, hitBlockPos.y, hitBlockPos.z, BLOCKS[0].id); // Set to Air

        } else if (button === 2) { // Right Click: Place Block
            console.log(`Attempting to place block at ${placeBlockPos.x}, ${placeBlockPos.y}, ${placeBlockPos.z}`);
            const blockIdToPlace = this.selectedBlockId;

            // Check 1: Is target location empty?
            const currentBlockId = world.getBlock(placeBlockPos.x, placeBlockPos.y, placeBlockPos.z);
            if (currentBlockId !== BLOCKS[0].id) {
                console.log("Placement failed: Target location is not Air.");
                return; // Target not Air
            }

            // Check 2: Does placement collide with player?
            const blockBox = new THREE.Box3(
                placeBlockPos, // Min corner
                placeBlockPos.clone().addScalar(1) // Max corner (add 1 to each component)
            );
            // Calculate player's current world bounding box
            const playerBoxWorld = this.boundingBox.clone().translate(this.playerObject.position);

            if (playerBoxWorld.intersectsBox(blockBox)) {
                console.log("Placement failed: Collision with player.");
                return; // Collision with player
            }

            // If both checks pass:
            console.log(`Placing block ID ${blockIdToPlace} at ${placeBlockPos.x}, ${placeBlockPos.y}, ${placeBlockPos.z}`);
            world.setBlock(placeBlockPos.x, placeBlockPos.y, placeBlockPos.z, blockIdToPlace);
        } // End of 'else if (button === 2)' block
        // Middle click (button 1) is ignored for now
    // No 'else' needed here, if no block was targeted, we returned earlier
    } // End of 'tryInteract' method
} // End of 'Player' class
