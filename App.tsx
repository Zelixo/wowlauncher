import React, { useEffect, useState } from 'react';

interface DownloadData {
  percent: number;
  downloaded: number;
  total: number;
  speed: number;
}

const App: React.FC = () => {
  const [installed, setInstalled] = useState(false);
  const [multibotEnabled, setMultibotEnabled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [downloadData, setDownloadData] = useState<DownloadData | null>(null);
  const [status, setStatus] = useState('Chilling in the lobby...');
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
    try {
      const status = await window.electronAPI.getGameStatus();
      setInstalled(status.installed);
      setMultibotEnabled(status.multibotEnabled);
      setGameDir(status.gameDir);
      if (status.installed) {
        setStatus('Ready for Adventure');
      } else {
        setStatus('Client not found in the frozen wastes');
      }
    } catch (e) {
      setStatus('Failed to communicate with the frozen core');
    }
  };

  const handleSelectDir = async () => {
    const newDir = await window.electronAPI.selectDirectory();
    if (newDir) {
      setGameDir(newDir);
      await checkStatus();
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
    setStatus('Summoning client files...');
    try {
      await window.electronAPI.installGame();
      setStatus('The ritual is complete!');
      setInstalled(true);
      setDownloadData(null);
    } catch (error) {
      setStatus('The summoning failed! Check your connection.');
    } finally {
      setInstalling(false);
    }
  };

  const handlePlay = async () => {
    setStatus('Crossing the threshold...');
    await window.electronAPI.launchGame();
    setTimeout(() => setStatus('Ready for Adventure'), 5000);
  };

  const handleToggleAddon = async () => {
    const nextState = !multibotEnabled;
    setMultibotEnabled(nextState);
    setStatus(nextState ? 'Addon enabled for next launch' : 'Addon will be removed next launch');
    try {
      await window.electronAPI.toggleAddon(nextState);
    } catch (error) {
      setStatus('Failed to update addon preference');
      setMultibotEnabled(!nextState);
    }
  };

  const openFolder = () => window.electronAPI.openGameFolder();

  return (
    <div className="app-container">
      <div className="title-bar">
        <div className="brand">REALM OF IKHAN</div>
        <div className="window-controls">
          <button className="control-btn" onClick={() => window.electronAPI.minimizeApp()}>_</button>
          <button className="control-btn close" onClick={() => window.electronAPI.closeApp()}>×</button>
        </div>
      </div>

      <header>
        <img 
          src={require('./logo.png')} 
          alt="Ikhan Logo" 
          className="main-logo" 
        />
        <h1>REALM OF IKHAN</h1>
        <p className="subtitle">Wrath of the Lich King 3.3.5a</p>
      </header>

      <main>
        <div className="dir-picker">
          <div className="dir-header">
             <span className="dir-label">Installation Directory</span>
             {installed && <button className="icon-btn" onClick={openFolder} title="Open Folder">📁</button>}
          </div>
          <div className="dir-path-container">
            <div className="dir-path" title={gameDir}>{gameDir}</div>
            <button className="browse-btn" onClick={handleSelectDir} disabled={installing}>Change Folder</button>
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
              {installing ? 'Installing...' : 'Install Game'}
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

        <div className="options-grid">
            <label className="option-card" onClick={handleToggleAddon}>
              <input type="checkbox" checked={multibotEnabled} readOnly />
              <div className="checkbox-ui"></div>
              <div className="option-info">
                  <span className="option-title">MultiBot Addon</span>
                  <span className="option-desc">Automated party member support</span>
              </div>
            </label>
            
            <a href="https://discord.gg/kv6hCjvMbp" target="_blank" className="option-card discord-btn">
              <div className="icon">💬</div>
              <div className="option-info">
                  <span className="option-title">The War Room</span>
                  <span className="option-desc">Join our Discord community</span>
              </div>
            </a>
        </div>
      </main>

      <footer>
        <p>STAY COOL OUT THERE, IT'S SNOW JOKE! &bull; VERSION 1.0.42</p>
      </footer>
    </div>
  );
};

export default App;
