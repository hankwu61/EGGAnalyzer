import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import './DepressionAnalyzer.css';

// 憂鬱症 EEG 分析組件
function DepressionAnalyzer({ eegData, selectedChannels, realtimeMode = false, realtimeData = null }) {
  const [results, setResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [alphaAsymmetryScore, setAlphaAsymmetryScore] = useState(null);
  const [thetaBandPower, setThetaBandPower] = useState(null);
  const [alphaThetaRatio, setAlphaThetaRatio] = useState(null);
  const [bandPowerData, setBandPowerData] = useState(null);
  const [frontPosteriorRatio, setFrontPosteriorRatio] = useState(null);
  const [loading, setLoading] = useState(false);
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
    gamma: { min: 30, max: 45 }
  };

  // 通道組合配對
  const channelPairs = {
    frontalAsymmetry: [
      { left: 'Channel1', right: 'Channel2', name: '前額左右不對稱' }, // F3-F4 前額左右測
      { left: 'Channel5', right: 'Channel6', name: '中央左右不對稱' }  // C3-C4 中央左右測
    ],
    frontoPosterior: [
      { front: 'Channel1', posterior: 'Channel3', name: '左側前後比值' }, // F3-P3 左側前後
      { front: 'Channel2', posterior: 'Channel4', name: '右側前後比值' }  // F4-P4 右側前後
    ]
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
      setBandPowerData(bandPowers);

      // 計算前額alpha波不對稱性
      const asymmetry = calculateAlphaAsymmetry(bandPowers);
      setAlphaAsymmetryScore(asymmetry);

      // 計算theta波總強度
      const theta = calculateThetaPower(bandPowers);
      setThetaBandPower(theta);

      // 計算alpha/theta比值
      const ratio = calculateAlphaThetaRatio(bandPowers);
      setAlphaThetaRatio(ratio);

      // 計算前後比值
      const frontBack = calculateFrontPosteriorRatio(bandPowers);
      setFrontPosteriorRatio(frontBack);

      // 整合所有結果
      const analysisResults = {
        alphaAsymmetry: asymmetry,
        thetaPower: theta,
        alphaThetaRatio: ratio,
        bandPowers: bandPowers,
        frontPosteriorRatio: frontBack
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

    // 計算過程模擬（實際處理時間可能很短）
    setTimeout(() => {
      try {
        // 計算各通道的頻帶功率
        const bandPowers = calculateBandPowers(eegData, selectedChannels);
        setBandPowerData(bandPowers);

        // 計算前額alpha波不對稱性（憂鬱症生物標誌）
        const asymmetry = calculateAlphaAsymmetry(bandPowers);
        setAlphaAsymmetryScore(asymmetry);

        // 計算theta波總強度（憂鬱症中通常增加）
        const theta = calculateThetaPower(bandPowers);
        setThetaBandPower(theta);

        // 計算alpha/theta比值（憂鬱症中通常降低）
        const ratio = calculateAlphaThetaRatio(bandPowers);
        setAlphaThetaRatio(ratio);

        // 計算前後比值（額葉與頂葉）
        const frontBack = calculateFrontPosteriorRatio(bandPowers);
        setFrontPosteriorRatio(frontBack);

        // 整合所有結果
        const analysisResults = {
          alphaAsymmetry: asymmetry,
          thetaPower: theta,
          alphaThetaRatio: ratio,
          bandPowers: bandPowers,
          frontPosteriorRatio: frontBack
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
    }, 1500); // 增加一點延遲以顯示載入動畫
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

  // 計算alpha波不對稱性 (右-左)/(右+左)
  // 憂鬱症患者通常表現為正值更高（右側alpha功率大於左側）
  const calculateAlphaAsymmetry = (bandPowers) => {
    const results = {};
    
    channelPairs.frontalAsymmetry.forEach(pair => {
      if (bandPowers[pair.left] && bandPowers[pair.right]) {
        const leftAlpha = bandPowers[pair.left].alpha;
        const rightAlpha = bandPowers[pair.right].alpha;
        
        if (leftAlpha + rightAlpha > 0) {
          // 計算不對稱指數 (右-左)/(右+左)
          // 正值表示右側優勢，與憂鬱症相關
          const asymmetry = (rightAlpha - leftAlpha) / (rightAlpha + leftAlpha);
          results[pair.name] = asymmetry;
        }
      }
    });
    
    return results;
  };

  // 計算theta波能量（憂鬱症中通常較高）
  const calculateThetaPower = (bandPowers) => {
    const results = {};
    
    Object.keys(bandPowers).forEach(channel => {
      results[channel] = bandPowers[channel].theta;
    });
    
    return results;
  };

  // 計算alpha/theta比值（憂鬱症中通常較低）
  const calculateAlphaThetaRatio = (bandPowers) => {
    const results = {};
    
    Object.keys(bandPowers).forEach(channel => {
      const alpha = bandPowers[channel].alpha;
      const theta = bandPowers[channel].theta;
      
      if (theta > 0) {
        results[channel] = alpha / theta;
      } else {
        results[channel] = 0;
      }
    });
    
    return results;
  };

  // 計算前後比值（額葉與頂葉）
  const calculateFrontPosteriorRatio = (bandPowers) => {
    const results = {};
    
    channelPairs.frontoPosterior.forEach(pair => {
      if (bandPowers[pair.front] && bandPowers[pair.posterior]) {
        // 對各頻帶計算前後比值
        const ratios = {};
        
        Object.keys(frequencyBands).forEach(band => {
          const frontPower = bandPowers[pair.front][band];
          const posteriorPower = bandPowers[pair.posterior][band];
          
          if (posteriorPower > 0) {
            ratios[band] = frontPower / posteriorPower;
          } else {
            ratios[band] = 0;
          }
        });
        
        results[pair.name] = ratios;
      }
    });
    
    return results;
  };

  // 切換自動更新
  const toggleAutoUpdate = () => {
    setAutoUpdateEnabled(!autoUpdateEnabled);
  };

  // 更新間隔變更
  const handleIntervalChange = (e) => {
    setUpdateInterval(parseInt(e.target.value));
  };

  // 解釋分析結果
  const interpretResults = () => {
    if (!results) return null;

    // Alpha不對稱性解釋
    let asymmetryInterpretation = '';
    Object.entries(alphaAsymmetryScore || {}).forEach(([pair, score]) => {
      if (score > 0.1) {
        asymmetryInterpretation += `${pair}指數偏高(${score.toFixed(3)})，顯示右側alpha活動高於左側，可能與憂鬱情緒相關。\n`;
      } else if (score < -0.1) {
        asymmetryInterpretation += `${pair}指數偏低(${score.toFixed(3)})，顯示左側alpha活動高於右側，通常與正向情緒相關。\n`;
      } else {
        asymmetryInterpretation += `${pair}指數在正常範圍(${score.toFixed(3)})。\n`;
      }
    });

    // Alpha/Theta比值解釋
    let ratioInterpretation = '';
    Object.entries(alphaThetaRatio || {}).forEach(([channel, ratio]) => {
      if (ratio < 0.7) {
        ratioInterpretation += `${channel} Alpha/Theta比值偏低(${ratio.toFixed(2)})，可能與憂鬱症狀相關。\n`;
      } else if (ratio > 1.5) {
        ratioInterpretation += `${channel} Alpha/Theta比值偏高(${ratio.toFixed(2)})，通常與放鬆狀態相關。\n`;
      } else {
        ratioInterpretation += `${channel} Alpha/Theta比值在正常範圍(${ratio.toFixed(2)})。\n`;
      }
    });

    // Theta波功率解釋
    let thetaInterpretation = '';
    let avgTheta = Object.values(thetaBandPower || {}).reduce((sum, val) => sum + val, 0) / 
                   Object.values(thetaBandPower || {}).length;
    
    if (avgTheta > 0.3) {
      thetaInterpretation = `平均Theta功率偏高(${avgTheta.toFixed(3)})，可能與憂鬱症狀、專注力問題或睡眠不足相關。`;
    } else {
      thetaInterpretation = `平均Theta功率在正常範圍(${avgTheta.toFixed(3)})。`;
    }

    return (
      <div className="interpretation">
        <h3>臨床解釋</h3>
        <div className="interpretation-item">
          <h4>前額Alpha不對稱性</h4>
          <p>
            前額葉Alpha不對稱性是憂鬱症的重要生物標誌。正常人通常呈現左側優勢(左腦alpha功率低於右腦)，而憂鬱症患者常表現為右側優勢。
          </p>
          <p className="interpretation-detail">{asymmetryInterpretation.split('\n').map((line, i) => line ? <span key={i}>{line}<br/></span> : null)}</p>
        </div>
        
        <div className="interpretation-item">
          <h4>Alpha/Theta比值</h4>
          <p>
            Alpha/Theta比值在憂鬱症患者中通常降低，表現為Alpha波活動減少或Theta波活動增加。
          </p>
          <p className="interpretation-detail">{ratioInterpretation.split('\n').map((line, i) => line ? <span key={i}>{line}<br/></span> : null)}</p>
        </div>
        
        <div className="interpretation-item">
          <h4>Theta波功率</h4>
          <p>
            Theta波功率增高可能與憂鬱症、焦慮症或疲勞相關。
          </p>
          <p className="interpretation-detail">{thetaInterpretation}</p>
        </div>
        
        <div className="disclaimer">
          <p><strong>注意：</strong> 此分析僅供參考，不能替代專業醫生的診斷。憂鬱症診斷需結合完整臨床評估和標準化測量工具。</p>
        </div>
      </div>
    );
  };

  // 繪製頻帶功率圖表
  const renderBandPowerChart = () => {
    if (!bandPowerData) return null;

    const data = [];
    const bands = Object.keys(frequencyBands);
    
    // 為每個通道創建一組柱狀圖數據
    selectedChannels.forEach(channel => {
      if (bandPowerData[channel]) {
        const values = bands.map(band => bandPowerData[channel][band]);
        
        data.push({
          x: bands.map(b => b.charAt(0).toUpperCase() + b.slice(1)), // 首字母大寫
          y: values,
          type: 'bar',
          name: channel
        });
      }
    });

    return (
      <div className="chart-container">
        <h3>腦波頻帶功率分析</h3>
        <Plot
          data={data}
          layout={{
            title: '各頻帶相對功率',
            xaxis: { title: '頻帶' },
            yaxis: { title: '相對功率' },
            barmode: 'group',
            height: 400,
            margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
            legend: { orientation: 'h', y: -0.2 }
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

  // 繪製Alpha不對稱性圖表
  const renderAsymmetryChart = () => {
    if (!alphaAsymmetryScore) return null;

    const data = [{
      x: Object.keys(alphaAsymmetryScore),
      y: Object.values(alphaAsymmetryScore),
      type: 'bar',
      marker: {
        color: Object.values(alphaAsymmetryScore).map(value => 
          value > 0.1 ? '#ff6b6b' : (value < -0.1 ? '#4ecdc4' : '#adb5bd')
        )
      }
    }];

    return (
      <div className="chart-container">
        <h3>Alpha不對稱性指數</h3>
        <Plot
          data={data}
          layout={{
            title: '右側-左側Alpha不對稱性(正值與憂鬱相關)',
            xaxis: { title: '電極對' },
            yaxis: { 
              title: '不對稱性指數', 
              range: [-0.5, 0.5],
              zeroline: true
            },
            height: 400,
            margin: { l: 50, r: 50, b: 100, t: 50, pad: 4 },
            shapes: [{
              type: 'line',
              x0: -0.5,
              x1: Object.keys(alphaAsymmetryScore).length - 0.5,
              y0: 0.1,
              y1: 0.1,
              line: {
                color: 'red',
                width: 1,
                dash: 'dash'
              }
            }, {
              type: 'line',
              x0: -0.5,
              x1: Object.keys(alphaAsymmetryScore).length - 0.5,
              y0: -0.1,
              y1: -0.1,
              line: {
                color: 'green',
                width: 1,
                dash: 'dash'
              }
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

  // 渲染Alpha/Theta比值圖表
  const renderAlphaThetaRatioChart = () => {
    if (!alphaThetaRatio) return null;

    const data = [{
      x: Object.keys(alphaThetaRatio),
      y: Object.values(alphaThetaRatio),
      type: 'bar',
      marker: {
        color: Object.values(alphaThetaRatio).map(value => 
          value < 0.7 ? '#ff6b6b' : (value > 1.5 ? '#4ecdc4' : '#adb5bd')
        )
      }
    }];

    return (
      <div className="chart-container">
        <h3>Alpha/Theta比值</h3>
        <Plot
          data={data}
          layout={{
            title: 'Alpha/Theta比值(低值與憂鬱相關)',
            xaxis: { title: '通道' },
            yaxis: { 
              title: 'Alpha/Theta比值', 
              range: [0, Math.max(2, ...Object.values(alphaThetaRatio)) * 1.1]
            },
            height: 400,
            margin: { l: 50, r: 50, b: 100, t: 50, pad: 4 },
            shapes: [{
              type: 'line',
              x0: -0.5,
              x1: Object.keys(alphaThetaRatio).length - 0.5,
              y0: 0.7,
              y1: 0.7,
              line: {
                color: 'red',
                width: 1,
                dash: 'dash'
              }
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

  return (
    <div className="depression-analyzer">
      <div className="analyzer-header">
        <h2>憂鬱症EEG特徵分析</h2>
        <p className="analyzer-description">
          此分析基於EEG中與憂鬱症相關的神經生理標誌，包括前額葉Alpha不對稱性、Alpha/Theta比值和Theta波功率。
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
              <label htmlFor="update-interval">更新間隔 (秒): </label>
              <input
                id="update-interval"
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
              ? `實時模式運行中: 每 ${updateInterval} 秒自動更新分析` 
              : '實時模式準備就緒，點擊按鈕開始自動分析'}
          </p>
        </div>
      )}

      <div className="analysis-controls">
        <button 
          className="primary" 
          onClick={performAnalysis}
          disabled={isProcessing || (!eegData && !realtimeData) || selectedChannels.length < 2}
        >
          {isProcessing ? '處理中...' : (realtimeMode ? '立即分析當前數據' : '執行憂鬱症特徵分析')}
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
            {renderAsymmetryChart()}
            {renderAlphaThetaRatioChart()}
            {renderBandPowerChart()}
          </div>
          
          {interpretResults()}
        </div>
      )}

      {!loading && !results && selectedChannels.length < 2 && (
        <div className="instructions">
          <p>請選擇至少2個通道進行分析。為獲得最佳結果，建議包含以下通道：</p>
          <ul>
            <li>前額左側 (如F3，通常為Channel1)</li>
            <li>前額右側 (如F4，通常為Channel2)</li>
            <li>頂葉左側 (如P3，通常為Channel3)</li>
            <li>頂葉右側 (如P4，通常為Channel4)</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default DepressionAnalyzer; 