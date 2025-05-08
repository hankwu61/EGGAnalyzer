import React, { useState } from 'react';
import './App.css';
import EEGUploader from './components/EEGUploader';
import EEGVisualizer from './components/EEGVisualizer';
import EEGAnalyzer from './components/EEGAnalyzer';
import RealtimeAnalyzer from './components/RealtimeAnalyzer';
import DepressionAnalyzer from './components/DepressionAnalyzer';
import EpilepsyAnalyzer from './components/EpilepsyAnalyzer';
import Header from './components/Header';

function App() {
  const [eegData, setEEGData] = useState(null);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'realtime', 'depression', 'epilepsy'

  const handleDataUpload = (data) => {
    setEEGData(data);
    // Initially select the first channel if available
    if (data && data.channels && data.channels.length > 0) {
      setSelectedChannels([data.channels[0]]);
    }
    setAnalysisResult(null);
  };

  const handleAnalysis = (result) => {
    setAnalysisResult(result);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="App">
      <Header />
      <div className="container">
        <div className="tab-buttons">
          <button 
            className={activeTab === 'upload' ? 'active' : ''} 
            onClick={() => handleTabChange('upload')}
          >
            上傳分析
          </button>
          <button 
            className={activeTab === 'realtime' ? 'active' : ''} 
            onClick={() => handleTabChange('realtime')}
          >
            實時分析
          </button>
          <button 
            className={activeTab === 'depression' ? 'active' : ''} 
            onClick={() => handleTabChange('depression')}
          >
            憂鬱症分析
          </button>
          <button 
            className={activeTab === 'epilepsy' ? 'active' : ''} 
            onClick={() => handleTabChange('epilepsy')}
          >
            癲癇分析
          </button>
        </div>

        {activeTab === 'upload' ? (
          <>
            <div className="card">
              <h2>1. 上傳 EEG 資料</h2>
              <EEGUploader onDataUpload={handleDataUpload} />
            </div>

            {eegData && (
              <div className="card">
                <h2>2. 視覺化波形</h2>
                <EEGVisualizer 
                  eegData={eegData} 
                  selectedChannels={selectedChannels}
                  setSelectedChannels={setSelectedChannels}
                />
              </div>
            )}

            {eegData && selectedChannels.length > 0 && (
              <div className="card">
                <h2>3. 分析資料</h2>
                <EEGAnalyzer 
                  eegData={eegData} 
                  selectedChannels={selectedChannels}
                  onAnalysisComplete={handleAnalysis}
                />
              </div>
            )}

            {analysisResult && (
              <div className="card">
                <h2>4. 分析結果</h2>
                <div className="results-container">
                  {analysisResult.spectrogram && (
                    <div className="result-item">
                      <h3>頻率分析</h3>
                      <div id="spectrogram-plot"></div>
                    </div>
                  )}
                  
                  {analysisResult.statistics && (
                    <div className="result-item">
                      <h3>訊號統計</h3>
                      <table className="stats-table">
                        <thead>
                          <tr>
                            <th>通道</th>
                            <th>平均值</th>
                            <th>標準差</th>
                            <th>最小值</th>
                            <th>最大值</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(analysisResult.statistics).map(([channel, stats]) => (
                            <tr key={channel}>
                              <td>{channel}</td>
                              <td>{stats.mean.toFixed(2)}</td>
                              <td>{stats.stdDev.toFixed(2)}</td>
                              <td>{stats.min.toFixed(2)}</td>
                              <td>{stats.max.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'realtime' ? (
          <div className="card">
            <h2>實時 EEG 分析</h2>
            <RealtimeAnalyzer />
          </div>
        ) : activeTab === 'depression' ? (
          <div className="card">
            <h2>憂鬱症 EEG 特徵分析</h2>
            <DepressionAnalyzer eegData={eegData} selectedChannels={selectedChannels} />
          </div>
        ) : (
          <div className="card">
            <h2>癲癇 EEG 特徵分析</h2>
            <EpilepsyAnalyzer eegData={eegData} selectedChannels={selectedChannels} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 