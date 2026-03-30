import React, { useEffect, useState } from 'react';

const App: React.FC = () => {
  const [installed, setInstalled] = useState(false);
  const [multibotEnabled, setMultibotEnabled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Checking game status...');
  const [gameDir, setGameDir] = useState('');

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
    setGameDir(status.gameDir);
    if (status.installed) {
      setStatus('Ready to Play');
    } else {
      setStatus('Game not installed');
    }
  };

  const handleSelectDir = async () => {
    const newDir = await window.electronAPI.selectDirectory();
    if (newDir) {
      setGameDir(newDir);
      const status = await window.electronAPI.getGameStatus();
      setInstalled(status.installed);
      setMultibotEnabled(status.multibotEnabled);
      if (status.installed) setStatus('Ready to Play');
      else setStatus('Game not installed');
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
  };

  const handleToggleAddon = async () => {
    const nextState = !multibotEnabled;
    setMultibotEnabled(nextState);
    setStatus(nextState ? 'Installing Multibot...' : 'Removing Multibot...');
    try {
      await window.electronAPI.toggleAddon(nextState);
      setStatus(nextState ? 'Multibot installed' : 'Multibot removed');
    } catch (error) {
      console.error(error);
      setStatus('Addon modification failed');
      setMultibotEnabled(!nextState);
    }
  };

  return (
    <div className="app-container">
      <div className="title-bar">
        <div className="brand">ZELIXO</div>
        <div className="window-controls">
          <button className="control-btn" onClick={() => window.electronAPI.minimizeApp()}>_</button>
          <button className="control-btn close" onClick={() => window.electronAPI.closeApp()}>×</button>
        </div>
      </div>

      <header>
        <h1>IKHAN WOW</h1>
        <p className="subtitle">The Frozen Throne</p>
      </header>

      <main>
        <div className="dir-picker">
          <span className="dir-label">Installation Path</span>
          <div className="dir-path-container">
            <div className="dir-path">{gameDir}</div>
            <button className="browse-btn" onClick={handleSelectDir} disabled={installing}>Browse</button>
          </div>
        </div>

        <div className="status-box">
          <p>{status}</p>
          {installing && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </div>

        {!installed ? (
          <button 
            className="action-button" 
            onClick={handleInstall}
            disabled={installing}
          >
            {installing ? `Downloading ${progress}%` : 'Download & Install'}
          </button>
        ) : (
          <button 
            className="action-button play" 
            onClick={handlePlay}
            disabled={installing}
          >
            Enter World
          </button>
        )}

        <label className="addon-toggle" onClick={handleToggleAddon}>
          <input 
            type="checkbox" 
            checked={multibotEnabled} 
            readOnly
          />
          <div className="custom-checkbox"></div>
          <span>Enable Multibot Support</span>
        </label>
      </main>

      <footer>
        <p>&copy; 2026 ZELIXO.NET &bull; VERSION 3.3.5A</p>
      </footer>
    </div>
  );
};

export default App;
