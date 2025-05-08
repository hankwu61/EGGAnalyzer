import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import './EpilepsyAnalyzer.css';

function EpilepsyAnalyzer({ eegData, selectedChannels, realtimeMode = false, realtimeData = null }) {
  const [results, setResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spikeData, setSpikeData] = useState(null);
  const [powerRatioData, setPowerRatioData] = useState(null);
  const [spikeFrequency, setSpikeFrequency] = useState(null);
  const [coherenceData, setCoherenceData] = useState(null);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [updateInterval, setUpdateInterval] = useState(5); // 秒
  const updateTimerRef = useRef(null);
  const lastAnalysisTimeRef = useRef(0);

  // 頻帶定義（單位：Hz）
  const frequencyBands = {
    delta: { min: 0.5, max: 4 },
    theta: { min: 4, max: 8 },
    alpha: { min: 8, max: 13 },
    beta: { min: 13, max: 30 },
    gamma: { min: 30, max: 100 } // 擴展gamma頻帶上限以捕捉高頻振盪
  };

  // 癲癇相關指標閾值
  const thresholds = {
    spikeAmplitude: 75, // 微伏，尖峰振幅閾值
    spikeFrequency: 5,  // 每分鐘尖峰數
    hfoThreshold: 0.15, // 高頻振盪閾值
    betaGammaRatio: 1.5 // β/γ比值閾值
  };

  // 實時模式下，當數據更新時自動分析
  useEffect(() => {
    if (realtimeMode && realtimeData && autoUpdateEnabled) {
      const currentTime = Date.now();
      // 檢查是否已經超過更新間隔
      if (currentTime - lastAnalysisTimeRef.current >= updateInterval * 1000) {
        performRealtimeAnalysis();
        lastAnalysisTimeRef.current = currentTime;
      }
    }
  }, [realtimeData, realtimeMode, autoUpdateEnabled]);

  // 設置/清理定時器
  useEffect(() => {
    if (realtimeMode && autoUpdateEnabled) {
      updateTimerRef.current = setInterval(() => {
        if (realtimeData) {
          performRealtimeAnalysis();
        }
      }, updateInterval * 1000);
    } else {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    }

    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, [autoUpdateEnabled, updateInterval, realtimeMode]);

  // 實時分析
  const performRealtimeAnalysis = () => {
    if (!realtimeData || selectedChannels.length < 2) return;

    try {
      // 將實時數據轉換為與eegData相同的格式
      const dataForAnalysis = {
        data: realtimeData.data,
        samplingRate: 100, // 假設實時模擬的採樣率為100Hz
        channels: selectedChannels
      };

      // 計算各通道的頻帶功率
      const bandPowers = calculateBandPowers(dataForAnalysis, selectedChannels);
      
      // 尖峰檢測
      const spikes = detectSpikes(dataForAnalysis, selectedChannels);
      setSpikeData(spikes);
      
      // 計算尖峰頻率（每分鐘）
      const spikeFreq = calculateSpikeFrequency(spikes, dataForAnalysis.samplingRate);
      setSpikeFrequency(spikeFreq);
      
      // 計算高頻振盪 (HFO)
      const hfoResults = detectHighFrequencyOscillations(dataForAnalysis, selectedChannels);
      
      // 計算功率頻譜比（Beta/Gamma）
      const powerRatios = calculatePowerRatios(bandPowers);
      setPowerRatioData(powerRatios);
      
      // 計算通道間相干性
      const coherence = calculateChannelCoherence(dataForAnalysis, selectedChannels);
      setCoherenceData(coherence);

      // 整合所有結果
      const analysisResults = {
        spikes: spikes,
        spikeFrequency: spikeFreq,
        hfo: hfoResults,
        powerRatios: powerRatios,
        coherence: coherence,
        bandPowers: bandPowers
      };
      
      // 設定結果狀態
      setResults(analysisResults);
    } catch (error) {
      console.error("實時分析過程中發生錯誤:", error);
    }
  };

  const performAnalysis = () => {
    if (realtimeMode && realtimeData) {
      performRealtimeAnalysis();
      return;
    }

    if (!eegData || selectedChannels.length < 2) {
      return;
    }

    setIsProcessing(true);
    setLoading(true);

    // 模擬分析過程（實際處理可能很快）
    setTimeout(() => {
      try {
        // 計算各通道的頻帶功率
        const bandPowers = calculateBandPowers(eegData, selectedChannels);
        
        // 尖峰檢測
        const spikes = detectSpikes(eegData, selectedChannels);
        setSpikeData(spikes);
        
        // 計算尖峰頻率（每分鐘）
        const spikeFreq = calculateSpikeFrequency(spikes, eegData.samplingRate);
        setSpikeFrequency(spikeFreq);
        
        // 計算高頻振盪 (HFO)
        const hfoResults = detectHighFrequencyOscillations(eegData, selectedChannels);
        
        // 計算功率頻譜比（Beta/Gamma）
        const powerRatios = calculatePowerRatios(bandPowers);
        setPowerRatioData(powerRatios);
        
        // 計算通道間相干性
        const coherence = calculateChannelCoherence(eegData, selectedChannels);
        setCoherenceData(coherence);

        // 整合所有結果
        const analysisResults = {
          spikes: spikes,
          spikeFrequency: spikeFreq,
          hfo: hfoResults,
          powerRatios: powerRatios,
          coherence: coherence,
          bandPowers: bandPowers
        };
        
        // 設定結果狀態
        setResults(analysisResults);
        setIsProcessing(false);
        setLoading(false);
      } catch (error) {
        console.error("分析過程中發生錯誤:", error);
        setIsProcessing(false);
        setLoading(false);
      }
    }, 1500);
  };

  // 切換自動更新
  const toggleAutoUpdate = () => {
    setAutoUpdateEnabled(!autoUpdateEnabled);
  };

  // 更新間隔變更
  const handleIntervalChange = (e) => {
    setUpdateInterval(parseInt(e.target.value));
  };

  // 計算各通道的頻帶功率
  const calculateBandPowers = (eegData, channels) => {
    const result = {};
    
    channels.forEach(channel => {
      // 獲取通道數據
      const signal = eegData.data[channel];
      const samplingRate = eegData.samplingRate;
      
      // 對信號進行FFT
      const fftResult = performFFT(signal, samplingRate);
      
      // 計算各頻帶能量
      const powers = {};
      Object.entries(frequencyBands).forEach(([band, { min, max }]) => {
        powers[band] = calculateBandPower(fftResult, min, max);
      });
      
      result[channel] = powers;
    });
    
    return result;
  };

  // 執行FFT
  const performFFT = (signal, samplingRate) => {
    const n = signal.length;
    
    const result = {
      magnitude: new Array(Math.floor(n/2)).fill(0),
      frequency: new Array(Math.floor(n/2)).fill(0)
    };

    const freqBinSize = samplingRate / n;

    for (let k = 0; k < Math.floor(n/2); k++) {
      let real = 0;
      let imag = 0;
      
      for (let t = 0; t < n; t++) {
        const angle = -2 * Math.PI * k * t / n;
        real += signal[t] * Math.cos(angle);
        imag += signal[t] * Math.sin(angle);
      }
      
      result.magnitude[k] = Math.sqrt(real*real + imag*imag) / n;
      result.frequency[k] = k * freqBinSize;
    }
    
    return result;
  };

  // 計算特定頻帶的能量
  const calculateBandPower = (fftResult, minFreq, maxFreq) => {
    let power = 0;
    let count = 0;
    
    for (let i = 0; i < fftResult.frequency.length; i++) {
      const freq = fftResult.frequency[i];
      if (freq >= minFreq && freq <= maxFreq) {
        power += fftResult.magnitude[i] * fftResult.magnitude[i]; // 平方表示能量
        count++;
      }
    }
    
    // 如果沒有落在該頻帶的頻率點，返回0
    if (count === 0) return 0;
    
    // 返回平均功率
    return power / count;
  };

  // 檢測尖峰波（Spike）
  const detectSpikes = (eegData, channels) => {
    const result = {};
    
    channels.forEach(channel => {
      const signal = eegData.data[channel];
      const samplingRate = eegData.samplingRate;
      
      // 計算信號標準差，用於自適應閾值
      const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
      const variance = signal.reduce((sum, val) => sum + (val - mean) ** 2, 0) / signal.length;
      const stdDev = Math.sqrt(variance);
      
      // 尖峰檢測（使用振幅和斜率標準）
      const spikes = [];
      const spikeThreshold = Math.max(thresholds.spikeAmplitude, 3 * stdDev); // 自適應閾值
      const slopeThreshold = spikeThreshold / 5; // 斜率閾值
      
      for (let i = 2; i < signal.length - 2; i++) {
        const amplitude = Math.abs(signal[i]);
        const slope1 = signal[i] - signal[i-1];
        const slope2 = signal[i] - signal[i+1];
        
        // 檢測尖峰：振幅超過閾值，且左右斜率變化明顯
        if (amplitude > spikeThreshold && 
            Math.abs(slope1) > slopeThreshold && 
            Math.abs(slope2) > slopeThreshold && 
            Math.sign(slope1) !== Math.sign(slope2)) {
          
          // 記錄尖峰位置、振幅和時間
          spikes.push({
            position: i,
            amplitude: signal[i],
            time: i / samplingRate
          });
          
          // 避免在短時間內重複檢測同一尖峰
          i += Math.floor(samplingRate * 0.1); // 跳過100毫秒
        }
      }
      
      result[channel] = spikes;
    });
    
    return result;
  };

  // 計算每分鐘尖峰頻率
  const calculateSpikeFrequency = (spikeData, samplingRate) => {
    const result = {};
    
    Object.entries(spikeData).forEach(([channel, spikes]) => {
      // 計算記錄總時間（分鐘）
      const totalMinutes = spikes.length > 0 ? 
        (spikes[spikes.length - 1].time - spikes[0].time) / 60 : 0;
      
      // 避免除以零
      if (totalMinutes > 0) {
        result[channel] = spikes.length / totalMinutes;
      } else {
        result[channel] = 0;
      }
    });
    
    return result;
  };

  // 檢測高頻振盪 (HFO, 80-500Hz)
  const detectHighFrequencyOscillations = (eegData, channels) => {
    const result = {};
    
    channels.forEach(channel => {
      const signal = eegData.data[channel];
      const samplingRate = eegData.samplingRate;
      
      // 確認採樣率足夠高以捕捉高頻振盪
      if (samplingRate < 200) {
        result[channel] = {
          detected: false,
          frequency: 0,
          message: "採樣率不足以檢測高頻振盪"
        };
        return;
      }
      
      // 計算80-500Hz範圍的功率
      const fftResult = performFFT(signal, samplingRate);
      const hfoPower = calculateBandPower(fftResult, 80, Math.min(500, samplingRate/2 - 1));
      
      // 計算總功率
      const totalPower = fftResult.magnitude.reduce((sum, val) => sum + val * val, 0) / fftResult.magnitude.length;
      
      // 高頻振盪相對功率
      const hfoRatio = totalPower > 0 ? hfoPower / totalPower : 0;
      
      result[channel] = {
        detected: hfoRatio > thresholds.hfoThreshold,
        ratio: hfoRatio,
        power: hfoPower
      };
    });
    
    return result;
  };

  // 計算功率頻譜比（Beta/Gamma）
  const calculatePowerRatios = (bandPowers) => {
    const result = {};
    
    Object.entries(bandPowers).forEach(([channel, powers]) => {
      // 計算各種頻帶比值
      const betaGammaRatio = powers.gamma > 0 ? powers.beta / powers.gamma : 0;
      const thetaBetaRatio = powers.beta > 0 ? powers.theta / powers.beta : 0;
      
      result[channel] = {
        betaGamma: betaGammaRatio,
        thetaBeta: thetaBetaRatio,
        abnormal: betaGammaRatio > thresholds.betaGammaRatio
      };
    });
    
    return result;
  };

  // 計算通道間相干性
  const calculateChannelCoherence = (eegData, channels) => {
    const result = {};
    
    // 計算所有通道對的相干性
    for (let i = 0; i < channels.length; i++) {
      for (let j = i + 1; j < channels.length; j++) {
        const channel1 = channels[i];
        const channel2 = channels[j];
        
        const signal1 = eegData.data[channel1];
        const signal2 = eegData.data[channel2];
        
        // 計算相干性（使用相關係數簡化計算）
        let sum1 = 0, sum2 = 0, sum12 = 0, sumSq1 = 0, sumSq2 = 0;
        
        for (let k = 0; k < Math.min(signal1.length, signal2.length); k++) {
          sum1 += signal1[k];
          sum2 += signal2[k];
          sum12 += signal1[k] * signal2[k];
          sumSq1 += signal1[k] * signal1[k];
          sumSq2 += signal2[k] * signal2[k];
        }
        
        const n = Math.min(signal1.length, signal2.length);
        const numerator = n * sum12 - sum1 * sum2;
        const denominator = Math.sqrt((n * sumSq1 - sum1 * sum1) * (n * sumSq2 - sum2 * sum2));
        
        const correlation = denominator !== 0 ? numerator / denominator : 0;
        const coherence = Math.abs(correlation); // 簡化的相干性測量
        
        const pairName = `${channel1}-${channel2}`;
        result[pairName] = coherence;
      }
    }
    
    return result;
  };

  // 解釋分析結果
  const interpretResults = () => {
    if (!results) return null;

    // 異常通道列表
    const abnormalChannels = [];
    
    // 檢查尖峰頻率
    Object.entries(spikeFrequency || {}).forEach(([channel, freq]) => {
      if (freq > thresholds.spikeFrequency) {
        abnormalChannels.push(`${channel}（尖峰頻率: ${freq.toFixed(1)}/分鐘）`);
      }
    });
    
    // 檢查功率比值
    Object.entries(powerRatioData || {}).forEach(([channel, data]) => {
      if (data.abnormal) {
        if (!abnormalChannels.includes(channel)) {
          abnormalChannels.push(`${channel}（β/γ比值異常: ${data.betaGamma.toFixed(2)}）`);
        }
      }
    });
    
    // 檢查相干性
    const highCoherencePairs = Object.entries(coherenceData || {})
      .filter(([pair, value]) => value > 0.85)
      .map(([pair, value]) => `${pair}（相干度: ${value.toFixed(2)}）`);

    return (
      <div className="interpretation">
        <h3>癲癇特徵解釋</h3>
        
        <div className="interpretation-item">
          <h4>異常波形檢測結果</h4>
          {abnormalChannels.length > 0 ? (
            <>
              <p>檢測到以下通道存在異常腦電波模式：</p>
              <ul>
                {abnormalChannels.map((ch, index) => (
                  <li key={index}>{ch}</li>
                ))}
              </ul>
              <p>
                異常活動可能與癲癇樣放電相關。這些特徵包括高發尖峰波活動或異常頻帶功率分布。
              </p>
            </>
          ) : (
            <p>未檢測到明顯的癲癇樣異常波形。</p>
          )}
        </div>
        
        <div className="interpretation-item">
          <h4>通道間相干性</h4>
          {highCoherencePairs.length > 0 ? (
            <>
              <p>檢測到以下通道對之間有高度相干性：</p>
              <ul>
                {highCoherencePairs.map((pair, index) => (
                  <li key={index}>{pair}</li>
                ))}
              </ul>
              <p>
                高相干性表示這些區域可能同步放電，這在某些癲癇類型中是常見的。
              </p>
            </>
          ) : (
            <p>通道間未檢測到異常高的相干性。</p>
          )}
        </div>
        
        <div className="disclaimer">
          <p><strong>重要提示：</strong> 此分析僅供參考，不能替代專業醫生的診斷。癲癇診斷需要臨床症狀評估、標準化的腦電圖記錄和專業醫師判讀。</p>
        </div>
      </div>
    );
  };

  // 繪製尖峰檢測結果圖表
  const renderSpikeChart = () => {
    if (!spikeData || !spikeFrequency) return null;

    const data = [{
      x: Object.keys(spikeFrequency),
      y: Object.values(spikeFrequency),
      type: 'bar',
      marker: {
        color: Object.values(spikeFrequency).map(value => 
          value > thresholds.spikeFrequency ? '#ff6b6b' : '#4ecdc4'
        )
      }
    }];

    return (
      <div className="chart-container">
        <h3>尖峰波頻率分析</h3>
        <Plot
          data={data}
          layout={{
            title: '各通道尖峰波頻率（每分鐘）',
            xaxis: { title: '通道' },
            yaxis: { 
              title: '尖峰頻率（次/分鐘）', 
              range: [0, Math.max(thresholds.spikeFrequency * 2, ...Object.values(spikeFrequency)) * 1.1]
            },
            height: 400,
            margin: { l: 50, r: 50, b: 100, t: 50, pad: 4 },
            shapes: [{
              type: 'line',
              x0: -0.5,
              x1: Object.keys(spikeFrequency).length - 0.5,
              y0: thresholds.spikeFrequency,
              y1: thresholds.spikeFrequency,
              line: {
                color: 'red',
                width: 1,
                dash: 'dash'
              }
            }],
            annotations: [{
              x: 0.5,
              y: thresholds.spikeFrequency,
              xref: 'paper',
              yref: 'y',
              text: '異常閾值',
              showarrow: true,
              arrowhead: 0,
              ax: 40,
              ay: -20
            }]
          }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
          config={{
            responsive: true
          }}
        />
      </div>
    );
  };

  // 繪製功率比值圖表
  const renderPowerRatioChart = () => {
    if (!powerRatioData) return null;

    const betaGammaValues = Object.entries(powerRatioData).map(([channel, data]) => ({
      channel,
      value: data.betaGamma
    }));

    betaGammaValues.sort((a, b) => b.value - a.value);

    const data = [{
      x: betaGammaValues.map(item => item.channel),
      y: betaGammaValues.map(item => item.value),
      type: 'bar',
      marker: {
        color: betaGammaValues.map(item => 
          item.value > thresholds.betaGammaRatio ? '#ff6b6b' : '#4ecdc4'
        )
      }
    }];

    return (
      <div className="chart-container">
        <h3>頻帶功率比值分析</h3>
        <Plot
          data={data}
          layout={{
            title: 'Beta/Gamma功率比值（高值可能與癲癇相關）',
            xaxis: { title: '通道' },
            yaxis: { 
              title: 'Beta/Gamma比值', 
              range: [0, Math.max(thresholds.betaGammaRatio * 2, ...betaGammaValues.map(item => item.value)) * 1.1]
            },
            height: 400,
            margin: { l: 50, r: 50, b: 100, t: 50, pad: 4 },
            shapes: [{
              type: 'line',
              x0: -0.5,
              x1: betaGammaValues.length - 0.5,
              y0: thresholds.betaGammaRatio,
              y1: thresholds.betaGammaRatio,
              line: {
                color: 'red',
                width: 1,
                dash: 'dash'
              }
            }],
            annotations: [{
              x: 0.5,
              y: thresholds.betaGammaRatio,
              xref: 'paper',
              yref: 'y',
              text: '異常閾值',
              showarrow: true,
              arrowhead: 0,
              ax: 40,
              ay: -20
            }]
          }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
          config={{
            responsive: true
          }}
        />
      </div>
    );
  };

  // 繪製通道間相干性熱圖
  const renderCoherenceChart = () => {
    if (!coherenceData || Object.keys(coherenceData).length === 0) return null;

    // 將通道對相干性數據轉換為熱圖格式
    const channels = selectedChannels;
    const coherenceMatrix = Array(channels.length).fill().map(() => Array(channels.length).fill(0));
    
    // 填充相干性矩陣
    channels.forEach((ch1, i) => {
      coherenceMatrix[i][i] = 1; // 自身相干性為1
      
      channels.forEach((ch2, j) => {
        if (i < j) {
          const pairKey = `${ch1}-${ch2}`;
          if (coherenceData[pairKey] !== undefined) {
            coherenceMatrix[i][j] = coherenceMatrix[j][i] = coherenceData[pairKey];
          }
        }
      });
    });

    // 創建熱圖數據
    const data = [{
      z: coherenceMatrix,
      x: channels,
      y: channels,
      type: 'heatmap',
      colorscale: 'Jet',
      showscale: true,
      colorbar: {
        title: '相干性',
        titleside: 'right'
      },
      zmin: 0,
      zmax: 1
    }];

    return (
      <div className="chart-container">
        <h3>通道間相干性分析</h3>
        <Plot
          data={data}
          layout={{
            title: '通道間相干性熱圖（高相干性可能表示同步放電）',
            height: 500,
            margin: { l: 80, r: 50, b: 80, t: 50, pad: 4 },
            annotations: coherenceMatrix.flatMap((row, i) => 
              row.map((val, j) => ({
                x: channels[j],
                y: channels[i],
                text: val.toFixed(2),
                font: { color: val > 0.5 ? 'white' : 'black' },
                showarrow: false
              }))
            )
          }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
          config={{
            responsive: true
          }}
        />
      </div>
    );
  };

  return (
    <div className="epilepsy-analyzer">
      <div className="analyzer-header">
        <h2>癲癇EEG特徵分析</h2>
        <p className="analyzer-description">
          此分析基於EEG中與癲癇相關的神經生理標誌，包括尖峰波檢測、頻帶功率分析和通道間相干性。
        </p>
      </div>

      {realtimeMode && (
        <div className="realtime-controls">
          <div className="realtime-control-group">
            <button 
              className={`toggle-button ${autoUpdateEnabled ? 'active' : ''}`} 
              onClick={toggleAutoUpdate}
            >
              {autoUpdateEnabled ? '停止自動更新' : '開始自動更新'}
            </button>
            
            <div className="interval-control">
              <label htmlFor="epilepsy-update-interval">更新間隔 (秒): </label>
              <input
                id="epilepsy-update-interval"
                type="number"
                min="1"
                max="30"
                value={updateInterval}
                onChange={handleIntervalChange}
                disabled={autoUpdateEnabled}
              />
            </div>
          </div>
          <p className="realtime-mode-info">
            {autoUpdateEnabled 
              ? `實時模式運行中: 每 ${updateInterval} 秒自動更新癲癇特徵分析` 
              : '實時模式準備就緒，點擊按鈕開始自動分析癲癇特徵'}
          </p>
        </div>
      )}

      <div className="analysis-controls">
        <button 
          className="primary" 
          onClick={performAnalysis}
          disabled={isProcessing || (!eegData && !realtimeData) || selectedChannels.length < 2}
        >
          {isProcessing ? '處理中...' : (realtimeMode ? '立即分析當前數據' : '執行癲癇特徵分析')}
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>分析中，請稍候...</p>
        </div>
      )}

      {results && !loading && (
        <div className="results-container">
          <div className="charts-grid">
            {renderSpikeChart()}
            {renderPowerRatioChart()}
            {renderCoherenceChart()}
          </div>
          
          {interpretResults()}
        </div>
      )}

      {!loading && !results && selectedChannels.length < 2 && (
        <div className="instructions">
          <p>請選擇至少2個通道進行分析。為獲得最佳結果，建議包含以下對應位置：</p>
          <ul>
            <li>前額區域通道（如F3, F4）</li>
            <li>顳葉區域通道（如T3, T4, T5, T6）</li>
            <li>中央區域通道（如C3, C4）</li>
            <li>枕葉區域通道（如O1, O2）</li>
          </ul>
          <p>顳葉癲癇通常在T3/T4/T5/T6通道顯示異常波形，而全身性癲癇可能在所有通道同時顯示。</p>
        </div>
      )}
    </div>
  );
}

export default EpilepsyAnalyzer; 