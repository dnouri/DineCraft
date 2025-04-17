# Voxel Sandbox

Welcome to Voxel Sandbox! This is a simple block-building game prototype built with JavaScript and Three.js, running right in your web browser. Explore a basic world, break blocks, and place new ones to build whatever you imagine!

## Running the Game

1.  **Install Dependencies:**
    Make sure you have Node.js and npm installed. Then, open your terminal in the project directory and run:
    ```bash
    npm install
    ```
2.  **Start the Development Server:**
    Run the following command to start a local web server (this assumes you have `vite` installed or a similar dev server configured in `package.json`):
    ```bash
    npm run dev
    ```
    *(If you don't have a `dev` script, you might need to install `vite` (`npm install --save-dev vite`) and add `"dev": "vite"` to the `"scripts"` section in `package.json`)*
3.  **Open in Browser:**
    Open your web browser and navigate to the local address provided by the development server (usually something like `http://localhost:5173`).

## Running Tests

To run the automated tests for the project's modules, use:

```bash
npm test
```

## Code Overview

The project is structured into several key modules:

*   **`main.js`**: The main entry point. Initializes Three.js, the world, player, controls, and starts the game loop.
*   **`src/World.js`**: Manages the collection of `Chunk` objects, handles block getting/setting at world coordinates, and updates chunk meshes.
*   **`src/Chunk.js`**: Represents a 16x256x16 section of the world. Stores block data and manages its 3D mesh.
*   **`src/Player.js`**: Handles player movement physics, collision detection, interaction (breaking/placing blocks), and camera attachment.
*   **`src/Controls.js`**: Manages user input (keyboard for movement/hotbar, mouse for looking/interaction) using Pointer Lock controls.
*   **`src/BlockRegistry.js`**: Defines the properties (like solidity and textures) for different block types.
*   **`src/TextureAtlas.js`**: Loads the texture atlas image and creates the material used for rendering blocks.
*   **`src/Chunk.test.js` / `src/dummy.test.js`**: Unit tests for various modules.
