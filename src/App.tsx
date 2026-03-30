import React, { useEffect, useState } from 'react';

const App: React.FC = () => {
  const [installed, setInstalled] = useState(false);
  const [multibotEnabled, setMultibotEnabled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Checking game status...');

  useEffect(() => {
    checkStatus();

    window.electronAPI.onDownloadProgress((percent: number) => {
      setProgress(percent);
    });
  }, []);

  const checkStatus = async () => {
    const status = await window.electronAPI.getGameStatus();
    setInstalled(status.installed);
    setMultibotEnabled(status.multibotEnabled);
    if (status.installed) {
      setStatus('Ready to Play');
    } else {
      setStatus('Game not installed');
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    setStatus('Downloading client...');
    try {
      await window.electronAPI.installGame();
      setStatus('Game installed successfully');
      setInstalled(true);
    } catch (error) {
      console.error(error);
      setStatus('Installation failed');
    } finally {
      setInstalling(false);
    }
  };

  const handlePlay = async () => {
    setStatus('Launching game...');
    await window.electronAPI.launchGame();
    // Keep it open or close? User might want to stay open for multibot toggle.
  };

  const handleToggleAddon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setMultibotEnabled(enabled);
    setStatus(enabled ? 'Installing Multibot...' : 'Removing Multibot...');
    try {
      await window.electronAPI.toggleAddon(enabled);
      setStatus(enabled ? 'Multibot installed' : 'Multibot removed');
    } catch (error) {
      console.error(error);
      setStatus('Addon modification failed');
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>ZELIXO WOW</h1>
        <p className="subtitle">Private Server Launcher</p>
      </header>

      <main>
        <div className="status-box">
          <p>{status}</p>
          {installing && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              <span>{progress}%</span>
            </div>
          )}
        </div>

        <div className="actions">
          {!installed ? (
            <button 
              className="action-button install" 
              onClick={handleInstall}
              disabled={installing}
            >
              {installing ? 'Installing...' : 'Download & Install Client'}
            </button>
          ) : (
            <button 
              className="action-button play" 
              onClick={handlePlay}
              disabled={installing}
            >
              Play Now
            </button>
          )}
        </div>

        <div className="settings">
          <label className="checkbox-container">
            <input 
              type="checkbox" 
              checked={multibotEnabled} 
              onChange={handleToggleAddon} 
              disabled={!installed || installing}
            />
            <span className="checkmark"></span>
            Use Multibot Addon
          </label>
        </div>
      </main>

      <footer>
        <p>&copy; 2026 Zelixo WoW</p>
      </footer>
    </div>
  );
};

export default App;
