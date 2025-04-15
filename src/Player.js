import * as THREE from 'three';
import { getBlockById, BLOCKS } from './BlockRegistry.js'; // Import BLOCKS

// Player constants
const INTERACTION_REACH = 5; // Max distance player can interact with blocks
const PLAYER_HEIGHT = 1.8;
const PLAYER_WIDTH = 0.6;
const PLAYER_DEPTH = 0.6;
const PLAYER_EYE_HEIGHT = 1.6; // Relative to player base (feet)
const PLAYER_SPEED = 5.0; // Units per second
const GRAVITY = 20.0; // Units per second squared
const RESPAWN_Y_LEVEL = -50; // Y level below which the player respawns
// const JUMP_VELOCITY = 8.0; // Implement later if desired

export class Player {
    /**
     * @param {THREE.PerspectiveCamera} camera The main camera.
     * @param {THREE.Scene} scene The scene to add the player object to.
     * @param {World} world The world instance for interactions and collisions.
     * @param {THREE.Mesh} highlightMesh The mesh used to highlight targeted blocks.
     */
    constructor(camera, scene, world, highlightMesh) {
        this.camera = camera;
        this.world = world; // Store world reference
        this.highlightMesh = highlightMesh; // Store highlight mesh reference
        this.initialSpawnPoint = new THREE.Vector3(8, 1, 8); // Center of chunk 0,0, Y=1

        this.velocity = new THREE.Vector3();
        this.onGround = false;

        // Player's physical representation (invisible anchor)
        this.playerObject = new THREE.Object3D();
        this.playerObject.position.copy(this.initialSpawnPoint);
        scene.add(this.playerObject);

        // Attach camera to the player object at eye level
        this.camera.position.set(0, PLAYER_EYE_HEIGHT, 0);
        this.playerObject.add(this.camera);

        // Player bounding box (local coordinates, relative to playerObject.position which is at feet level)
        this.boundingBox = new THREE.Box3(
            new THREE.Vector3(-PLAYER_WIDTH / 2, 0, -PLAYER_DEPTH / 2), // Min corner at feet
            new THREE.Vector3(PLAYER_WIDTH / 2, PLAYER_HEIGHT, PLAYER_DEPTH / 2) // Max corner at head height
        );

        // Interaction Raycaster
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = INTERACTION_REACH;

        // Hotbar state
        this.selectedBlockId = BLOCKS[3].id; // Default to Stone

        // Target block state
        this.targetedHitPos = null;
        this.targetedPlacePos = null;
    }

    /**
     * Updates the player's state based on input, physics, and collisions.
     * @param {number} deltaTime Time elapsed since the last frame.
     * @param {Controls} controls The controls object for input state.
     */
    update(deltaTime, controls) {
        // 1. Apply Gravity
        this.velocity.y -= GRAVITY * deltaTime;

        // 2. Calculate Horizontal Input Velocity
        const speed = PLAYER_SPEED;
        const inputVelocity = new THREE.Vector3(); // Renamed from moveVelocity

        if (controls.moveForward) inputVelocity.z -= 1; // Use direction vectors
        if (controls.moveBackward) inputVelocity.z += 1;
        if (controls.moveLeft) inputVelocity.x -= 1;
        if (controls.moveRight) inputVelocity.x += 1;

        // Normalize if moving diagonally, then scale by speed
        if (inputVelocity.lengthSq() > 0) {
            inputVelocity.normalize().multiplyScalar(speed);
        }

        // Apply camera rotation (yaw) to the input velocity
        inputVelocity.applyQuaternion(this.camera.quaternion);

        // Set horizontal velocity based on input
        this.velocity.x = inputVelocity.x;
        this.velocity.z = inputVelocity.z;

        // 3. Calculate Potential Position Change
        const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
        const potentialPosition = this.playerObject.position.clone().add(deltaPosition);

        // 4. Collision Detection & Resolution (Simplified Approach)
        this.onGround = false;
        const currentPos = this.playerObject.position;
        const playerBox = this.boundingBox.clone(); // Local bounding box

        // --- Check Y Collision ---
        const potentialPosY = potentialPosition.y;
        const playerBoxYCheck = playerBox.clone().translate(new THREE.Vector3(currentPos.x, potentialPosY, currentPos.z));
        if (this.checkCollision(playerBoxYCheck)) {
            if (this.velocity.y < 0) { // Moving down / Landing
                // Snap feet to the top surface of the block below.
                // The block causing collision is at floor(min.y of the collided box). Its top surface is floor(min.y) + 1.
                potentialPosition.y = Math.floor(playerBoxYCheck.min.y) + 1;
                this.onGround = true;
            } else if (this.velocity.y > 0) { // Moving up / Hitting ceiling
                // Snap head to the bottom surface of the block above.
                // The ceiling block is at floor(max.y). Its bottom surface is floor(max.y). Player head goes there.
                // Player feet position = ceiling_bottom_surface - player_height
                potentialPosition.y = Math.floor(playerBoxYCheck.max.y) - PLAYER_HEIGHT;
            }
            this.velocity.y = 0; // Stop vertical movement on collision
        }

        // --- Check X Collision ---
        const potentialPosX = potentialPosition.x;
        // Use the *potentially corrected* Y position for subsequent checks
        const playerBoxXCheck = playerBox.clone().translate(new THREE.Vector3(potentialPosX, potentialPosition.y, currentPos.z));
        if (this.checkCollision(playerBoxXCheck)) {
            // Collision occurred along X. Revert X movement by setting potential back to current.
            potentialPosition.x = currentPos.x;
            this.velocity.x = 0;
        }

        // --- Check Z Collision ---
        const potentialPosZ = potentialPosition.z;
        // Use the *potentially corrected* Y and X positions
        const playerBoxZCheck = playerBox.clone().translate(new THREE.Vector3(potentialPosition.x, potentialPosition.y, potentialPosZ));
        if (this.checkCollision(playerBoxZCheck)) {
            // Collision occurred along Z. Revert Z movement.
            potentialPosition.z = currentPos.z;
            this.velocity.z = 0;
        }

        // 5. Update Player Position
        this.playerObject.position.copy(potentialPosition);

        // 6. Check for Respawn
        if (this.playerObject.position.y < RESPAWN_Y_LEVEL) {
            this.respawn();
        }
    }

    /**
     * Checks if the given player bounding box intersects with any solid world blocks.
     * @param {THREE.Box3} playerBoxWorld The player's bounding box in world coordinates.
     * @returns {boolean} True if collision occurs, false otherwise.
     * @private Internal helper method
     */
    checkCollision(playerBoxWorld) {
        const minX = Math.floor(playerBoxWorld.min.x);
        const maxX = Math.ceil(playerBoxWorld.max.x);
        const minY = Math.floor(playerBoxWorld.min.y);
        const maxY = Math.ceil(playerBoxWorld.max.y);
        const minZ = Math.floor(playerBoxWorld.min.z);
        const maxZ = Math.ceil(playerBoxWorld.max.z);

        for (let y = minY; y < maxY; y++) {
            for (let z = minZ; z < maxZ; z++) {
                for (let x = minX; x < maxX; x++) {
                    const blockId = this.world.getBlock(x, y, z);
                    const block = getBlockById(blockId);

                    if (block.solid) {
                        const blockBox = new THREE.Box3(
                            new THREE.Vector3(x, y, z),
                            new THREE.Vector3(x + 1, y + 1, z + 1)
                        );
                        if (playerBoxWorld.intersectsBox(blockBox)) {
                            return true; // Collision detected
                        }
                    }
                }
            }
        }
        return false; // No collision
    }


    /**
     * Updates the currently targeted block based on raycasting.
     * Controls the visibility and position of the highlight mesh.
     */
    updateTargetBlock() {
        // Raycast from camera center
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

        // Get chunk meshes efficiently from the world
        const chunkMeshes = this.world.getChunkMeshes();
        if (chunkMeshes.length === 0) {
             this.targetedHitPos = null;
             this.targetedPlacePos = null;
             this.highlightMesh.visible = false;
             return; // No meshes to intersect with yet
        }

        const intersects = this.raycaster.intersectObjects(chunkMeshes);

        if (intersects.length > 0) {
            const intersection = intersects[0]; // Closest intersection

            // Calculate Hit and Placement Coordinates
            // Offset slightly into/out of the block based on the face normal
            const hitPoint = intersection.point.clone().sub(intersection.face.normal.clone().multiplyScalar(0.01));
            const hitBlockPos = new THREE.Vector3(Math.floor(hitPoint.x), Math.floor(hitPoint.y), Math.floor(hitPoint.z));

            const placePoint = intersection.point.clone().add(intersection.face.normal.clone().multiplyScalar(0.01));
            const placeBlockPos = new THREE.Vector3(Math.floor(placePoint.x), Math.floor(placePoint.y), Math.floor(placePoint.z));

            // Store the results
            this.targetedHitPos = hitBlockPos;
            this.targetedPlacePos = placeBlockPos;

            // Update highlight mesh position and visibility
            this.highlightMesh.position.set(hitBlockPos.x + 0.5, hitBlockPos.y + 0.5, hitBlockPos.z + 0.5);
            this.highlightMesh.visible = true;

        } else {
            // No intersection within reach
            this.targetedHitPos = null;
            this.targetedPlacePos = null;
            this.highlightMesh.visible = false;
        }
    }


    /**
     * Resets the player's position to the spawn point and stops their movement.
     */
    respawn() {
        this.playerObject.position.copy(this.initialSpawnPoint);
        this.velocity.set(0, 0, 0);
        this.onGround = false;
        console.log("Player respawned.");
    }

    /**
     * Tries to interact with the world (break/place block) based on where the player is looking.
     * Called on mouse click via Controls.
     * @param {MouseEvent} event The mouse event containing button information.
     */
    tryInteract(event) {
        if (!event) return;

        const button = event.button; // 0: left, 1: middle, 2: right

        // Use the continuously updated target block positions stored in the player
        if (!this.targetedHitPos || !this.targetedPlacePos) {
            return; // No block currently targeted
        }

        const hitBlockPos = this.targetedHitPos;
        const placeBlockPos = this.targetedPlacePos;

        // --- Handle Interaction based on Mouse Button ---
        if (button === 0) { // Left Click: Break Block
            // console.log(`Attempting to break block at ${hitBlockPos.x}, ${hitBlockPos.y}, ${hitBlockPos.z}`);
            this.world.setBlock(hitBlockPos.x, hitBlockPos.y, hitBlockPos.z, BLOCKS[0].id); // Set to Air

        } else if (button === 2) { // Right Click: Place Block
            // console.log(`Attempting to place block at ${placeBlockPos.x}, ${placeBlockPos.y}, ${placeBlockPos.z}`);
            const blockIdToPlace = this.selectedBlockId;

            // Check 1: Is target location empty (Air)?
            const currentBlockId = this.world.getBlock(placeBlockPos.x, placeBlockPos.y, placeBlockPos.z);
            if (currentBlockId !== BLOCKS[0].id) {
                // console.log("Placement failed: Target location is not Air.");
                return;
            }

            // Check 2: Does placement collide with player's current bounding box?
            const blockBox = new THREE.Box3(
                placeBlockPos, // Min corner (integer coords)
                placeBlockPos.clone().addScalar(1) // Max corner (integer coords + 1)
            );
            const playerBoxWorld = this.boundingBox.clone().translate(this.playerObject.position);

            if (playerBoxWorld.intersectsBox(blockBox)) {
                // console.log("Placement failed: Collision with player.");
                return;
            }

            // If checks pass, place the block
            // console.log(`Placing block ID ${blockIdToPlace} at ${placeBlockPos.x}, ${placeBlockPos.y}, ${placeBlockPos.z}`);
            this.world.setBlock(placeBlockPos.x, placeBlockPos.y, placeBlockPos.z, blockIdToPlace);
        }
        // Middle click (button 1) is ignored
    }
}
