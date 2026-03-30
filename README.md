# Realm of Ikhan Launcher

A custom, high-performance desktop launcher for the **Realm of Ikhan** World of Warcraft private server (Wrath of the Lich King 3.3.5a).

![Launcher Preview](logo.png)

## Features

-   **One-Click Installation:** Automatically downloads and extracts the full 3.3.5a game client.
-   **Smart Detection:** Automatically finds Steam libraries and common game directories for a seamless setup.
-   **MultiBot Integration:** Easily toggle the MultiBot addon to recruit automated party members for your adventures.
-   **Dynamic Realmlist:** Automatically ensures your `realmlist.wtf` is correctly configured for the Ikhan realm before launching.
-   **Cross-Platform Support:** Native support for Windows and Linux (via Wine).
-   **Modern UI:** A clean, immersive interface designed with React and custom CSS.

## Getting Started

### Prerequisites

-   **Windows:** No special requirements.
-   **Linux:** Ensure `wine` is installed for the best experience.

### Usage

1.  Launch the application.
2.  Select your desired **Game Stronghold** (installation directory).
3.  Click **Begin the Journey** to download the game client if you don't have it.
4.  Once ready, click **Enter the Fray** to launch World of Warcraft.

## Building from Source

If you want to build the launcher yourself:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Zelixo/wowlauncher.git
    cd wowlauncher
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run in development mode:**
    ```bash
    npm start
    ```

4.  **Create a distributable package:**
    ```bash
    npm run make
    ```

## Community

Join our **War Room** on Discord: [Join Discord](https://discord.gg/kv6hCjvMbp)

---

*STAY COOL OUT THERE, IT'S SNOW JOKE!*
