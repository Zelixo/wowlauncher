# Project Overview

**wowlauncher** is a desktop application built with **Electron**, **React**, and **TypeScript**. It serves as a dedicated launcher for the "Realm of Ikhan," a World of Warcraft (Wrath of the Lich King 3.3.5a) private server.

## Architecture

The application follows the standard Electron process model:
-   **Main Process (`main.ts`):** Handles system-level operations such as file system management, downloading and extracting game files, managing configuration, and launching the game executable. It also detects Steam library paths for a default installation directory.
-   **Renderer Process (`App.tsx`):** A React-based frontend that provides a user interface for:
    -   Installing and updating the game client.
    -   Launching the game (including Wine support on Linux).
    -   Managing the "MultiBot" addon.
    -   Opening the game directory and providing community links (Discord).
-   **Preload Script (`preload.ts`):** Acts as a secure bridge between the main and renderer processes using Electron's `contextBridge`.

### Key Components
-   **`SteamManager.ts`:** Logic for detecting Steam and common game installation paths across Linux and Windows.
-   **`fileManager.ts`:** Utilities for downloading large ZIP files (with progress reporting) and extracting them using `adm-zip`.
-   **`realmlistManager.ts`:** Logic to dynamically update the `realmlist.wtf` file before the game is launched.

## Building and Running

The project uses **Electron Forge** for development and packaging.

### Development
To start the application in development mode with hot-reloading:
```bash
npm start
```

### Build & Package
To package the application for the current platform:
```bash
npm run package
```

To create distributables (e.g., .deb, .rpm, .exe, .zip):
```bash
npm run make
```

### Linting
To run the ESLint check:
```bash
npm run lint
```

## Development Conventions

-   **TypeScript:** All source code is written in TypeScript for type safety.
-   **React Hooks:** The frontend uses React functional components and hooks (`useState`, `useEffect`).
-   **IPC Communication:** Communication between the frontend and backend is handled via asynchronous IPC handlers (`ipcMain.handle` and `ipcRenderer.invoke`).
-   **Platform Support:** The launcher includes specific logic for Linux, such as checking for `wine` to launch the Windows-based WoW executable.
-   **Configuration:** User settings (like the game directory) are stored in a `config.json` file within the application's user data directory.

## Project Structure
-   `main.ts`: Electron entry point.
-   `renderer.tsx`: React entry point.
-   `App.tsx`: Main UI component.
-   `preload.ts`: IPC bridge.
-   `*.config.ts`: Configuration for Webpack and Electron Forge.
