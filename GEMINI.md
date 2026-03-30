# Project Overview

**wowlauncher** is a high-performance desktop application built with **Electron**, **React**, and **TypeScript**. It is the official launcher for the "Realm of Ikhan" World of Warcraft (3.3.5a) private server.

## Architecture

-   **Main Process (`main.ts`):** Handles system operations, P2P downloads via WebTorrent, large-file extraction, and game execution.
-   **Renderer Process (`App.tsx`):** A React-based UI with a polished "Frozen Throne" theme.
-   **P2P Summoning:** Uses **WebTorrent** (v1.9.7) to download the 17GB game client via BitTorrent, providing high speeds and resilience.
-   **Large-File Extraction:** Uses **extract-zip** to reliably extract the game client without memory-limit issues.

## Building and Running

### Development
```bash
npm start
```

### Production Build (Installer)
```bash
npm run make
```
The branded installer will be generated in `out/make/squirrel.windows/x64/`.

## Key Technical Details
-   **Frameless Window:** 700x850 fixed-size window with no OS borders/shadows.
-   **Smart Detection:** Detects Steam and common library paths across platforms.
-   **Addon Management:** Manages the MultiBot addon state, applying it during launch or installation.
-   **Realmlist Management:** Automatically overwrites `realmlist.wtf` with the Ikhan server address on launch.
