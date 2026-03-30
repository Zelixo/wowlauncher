import React, { useEffect, useState } from 'react';
import { DownloadData } from './types';

const App: React.FC = () => {
  const [installed, setInstalled] = useState(false);
  const [multibotEnabled, setMultibotEnabled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [downloadData, setDownloadData] = useState<DownloadData | null>(null);
  const [status, setStatus] = useState('Checking game status...');
  const [gameDir, setGameDir] = useState('');

  useEffect(() => {
    checkStatus();

    window.electronAPI.onDownloadProgress((data: DownloadData) => {
      setDownloadData(data);
    });

    window.electronAPI.onStatusUpdate((newStatus: string) => {
      setStatus(newStatus);
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

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleInstall = async () => {
    setInstalling(true);
    setStatus('Downloading client...');
    try {
      await window.electronAPI.installGame();
      setStatus('Game installed successfully');
      setInstalled(true);
      setDownloadData(null);
    } catch (error) {
      console.error(error);
      setStatus('Installation failed. Please check your internet or disk space.');
    } finally {
      setInstalling(false);
    }
  };

  const handlePlay = async () => {
    setStatus('Launching game...');
    await window.electronAPI.launchGame();
    setTimeout(() => setStatus('Ready to Play'), 5000);
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

  const openFolder = () => window.electronAPI.openGameFolder();

  return (
    <div className="app-container">
      <div className="title-bar">
        <div className="brand">IKHAN WOW LAUNCHER</div>
        <div className="window-controls">
          <button className="control-btn" onClick={() => window.electronAPI.minimizeApp()}>_</button>
          <button className="control-btn close" onClick={() => window.electronAPI.closeApp()}>×</button>
        </div>
      </div>

      <header>
        <h1>IKHAN WOW</h1>
        <p className="subtitle">Wrath of the Lich King 3.3.5a</p>
      </header>

      <main>
        <div className="dir-picker">
          <div className="dir-header">
             <span className="dir-label">Game Directory</span>
             {installed && <button className="icon-btn" onClick={openFolder} title="Open Folder">📁</button>}
          </div>
          <div className="dir-path-container">
            <div className="dir-path" title={gameDir}>{gameDir}</div>
            <button className="browse-btn" onClick={handleSelectDir} disabled={installing}>Change</button>
          </div>
        </div>

        <div className="status-box">
          <div className="status-text">{status}</div>
          {downloadData && installing && (
            <div className="download-info">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${downloadData.percent}%` }}></div>
              </div>
              <div className="progress-details">
                <span>{formatBytes(downloadData.downloaded)} / {formatBytes(downloadData.total)}</span>
                <span>{formatBytes(downloadData.speed)}/s</span>
              </div>
            </div>
          )}
        </div>

        <div className="primary-actions">
          {!installed ? (
            <button 
              className="action-button" 
              onClick={handleInstall}
              disabled={installing}
            >
              {installing ? 'Installing...' : 'Download & Setup Game'}
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
        </div>

        <div className="options-grid">
            <label className="option-card" onClick={handleToggleAddon}>
              <input type="checkbox" checked={multibotEnabled} readOnly />
              <div className="checkbox-ui"></div>
              <div className="option-info">
                  <span className="option-title">Multibot Addon</span>
                  <span className="option-desc">Automated party members support</span>
              </div>
            </label>
            
            <div className="option-card help" title="The launcher ensures your realmlist is always correct.">
              <div className="icon">🛡️</div>
              <div className="option-info">
                  <span className="option-title">Realmlist Guard</span>
                  <span className="option-desc">Auto-configured for wow.zelixo.net</span>
              </div>
            </div>
        </div>
      </main>

      <footer>
        <p>FOR HELP VISIT DISCORD.ZELIXO.NET &bull; {process.platform === 'linux' ? 'LINUX (WINE)' : 'WINDOWS'}</p>
      </footer>
    </div>
  );
};

export default App;
