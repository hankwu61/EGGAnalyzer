import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import DepressionAnalyzer from './DepressionAnalyzer';
import EpilepsyAnalyzer from './EpilepsyAnalyzer';
import './RealtimeAnalyzer.css';

function RealtimeAnalyzer() {
  const [isRunning, setIsRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(100); // ms between updates
  const [bufferSize, setBufferSize] = useState(500); // Points to show in visualization
  const [selectedChannels, setSelectedChannels] = useState(['Channel1', 'Channel2', 'Channel3', 'Channel4']);
  const [activeTab, setActiveTab] = useState('waveform'); // 'waveform', 'depression', 'epilepsy'
  const [integratedMode, setIntegratedMode] = useState(false); // 用於切換集成模式
  const [depressionResults, setDepressionResults] = useState(null);
  const [epilepsyResults, setEpilepsyResults] = useState(null);
  const [analysisInterval, setAnalysisInterval] = useState(5); // 分析間隔（秒）
  const [autoAnalysis, setAutoAnalysis] = useState(false);
  const lastAnalysisTimeRef = useRef(0);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [aiConfidenceLevel, setAiConfidenceLevel] = useState(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [neuroDegenerativeResults, setNeuroDegenerativeResults] = useState(null);
  const [showNeuroDegenerativeAnalysis, setShowNeuroDegenerativeAnalysis] = useState(false);
  
  const allChannels = ['Channel1', 'Channel2', 'Channel3', 'Channel4', 'Channel5', 'Channel6', 'Channel7', 'Channel8'];
  const channelColors = {
    Channel1: '#1f77b4', // blue
    Channel2: '#ff7f0e', // orange
    Channel3: '#2ca02c', // green
    Channel4: '#d62728', // red
    Channel5: '#9467bd', // purple
    Channel6: '#8c564b', // brown
    Channel7: '#e377c2', // pink
    Channel8: '#7f7f7f'  // grey
  };
  
  const [simulationData, setSimulationData] = useState({
    time: [],
    channels: allChannels,
    data: {
      Channel1: [],
      Channel2: [],
      Channel3: [],
      Channel4: [],
      Channel5: [],
      Channel6: [],
      Channel7: [],
      Channel8: []
    }
  });
  const [freqData, setFreqData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [anomalyThresholds, setAnomalyThresholds] = useState({
    amplitude: { min: -2, max: 2 },
    frequency: { min: 0, max: 30 }
  });
  const [anomalyAlerts, setAnomalyAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(true);
  const timerRef = useRef(null);
  const dataCountRef = useRef(0);
  const alertTimeoutRef = useRef(null);
  
  // Toggle channel selection
  const toggleChannel = (channel) => {
    if (selectedChannels.includes(channel)) {
      if (selectedChannels.length > 1) { // Ensure at least one channel is selected
        setSelectedChannels(prev => prev.filter(ch => ch !== channel));
      }
    } else {
      setSelectedChannels(prev => [...prev, channel]);
    }
  };
  
  // Start/stop the simulation
  const toggleSimulation = () => {
    if (isRunning) {
      // Stop simulation
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRunning(false);
    } else {
      // Reset data for new simulation
      setSimulationData({
        time: [],
        channels: allChannels,
        data: {
          Channel1: [],
          Channel2: [],
          Channel3: [],
          Channel4: [],
          Channel5: [],
          Channel6: [],
          Channel7: [],
          Channel8: []
        }
      });
      dataCountRef.current = 0;
      setAnomalyAlerts([]);
      
      // Start simulation
      timerRef.current = setInterval(generateNewDataPoint, simulationSpeed);
      setIsRunning(true);
    }
  };

  // Clean up timer when component is unmounted
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  // Update interval when simulation speed changes
  useEffect(() => {
    if (isRunning) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(generateNewDataPoint, simulationSpeed);
    }
  }, [simulationSpeed]);
  
  // 監控自動分析設置變更
  useEffect(() => {
    // 如果啟用了自動分析但還沒有分析計時器
    if (integratedMode && autoAnalysis && isRunning) {
      // 立即執行一次分析
      if (simulationData.time.length > 0) {
        handleIntegratedAnalysis();
      }
      
      // 設置定期分析的計時器
      const analysisTimer = setInterval(() => {
        if (simulationData.time.length > 0) {
          handleIntegratedAnalysis();
        }
      }, analysisInterval * 1000);
      
      // 清理函數
      return () => {
        clearInterval(analysisTimer);
      };
    }
  }, [integratedMode, autoAnalysis, analysisInterval, isRunning]);

  // Add anomaly alert
  const addAnomalyAlert = (message, severity = 'warning') => {
    const id = Date.now();
    const newAlert = {
      id,
      message,
      timestamp: new Date().toLocaleTimeString(),
      severity
    };
    
    setAnomalyAlerts(prevAlerts => [newAlert, ...prevAlerts].slice(0, 5)); // Keep only the 5 most recent alerts
    
    // Auto-dismiss critical alerts after 10 seconds
    if (severity === 'critical') {
      alertTimeoutRef.current = setTimeout(() => {
        setAnomalyAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
      }, 10000);
    }
    
    // Auto-dismiss info alerts after 5 seconds
    if (severity === 'info') {
      alertTimeoutRef.current = setTimeout(() => {
        setAnomalyAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
      }, 5000);
    }
  };
  
  // Remove anomaly alert
  const removeAlert = (id) => {
    setAnomalyAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  };

  // Update threshold values
  const handleThresholdChange = (e) => {
    const { name, value } = e.target;
    const [category, limit] = name.split('-');
    
    setAnomalyThresholds(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [limit]: parseFloat(value)
      }
    }));
  };

  // Generate a new data point for the simulation
  const generateNewDataPoint = () => {
    const time = dataCountRef.current / 100; // Time in seconds
    const currentTime = Date.now();
    
    // Add some anomalies occasionally for demonstration
    const triggerAnomaly = Math.random() > 0.97; // ~3% chance of anomaly
    
    // Base frequencies for each channel (in Hz)
    const baseFrequencies = {
      Channel1: 10, // Alpha wave
      Channel2: 20, // Beta wave
      Channel3: 5,  // Theta wave
      Channel4: 3,  // Delta wave
      Channel5: 15, // Beta wave
      Channel6: 8,  // Alpha wave
      Channel7: 40, // Gamma wave
      Channel8: 12  // Alpha/Beta transition
    };
    
    // Generate simulated EEG data for each channel
    const channelValues = {};
    allChannels.forEach(channel => {
      const baseFreq = baseFrequencies[channel];
      const secondaryFreq = baseFreq / 2;
      
      // Create a realistic EEG-like signal with main frequency component, harmonics, and noise
      channelValues[channel] = Math.sin(2 * Math.PI * baseFreq * time) * 0.8 + 
                              Math.sin(2 * Math.PI * secondaryFreq * time) * 0.3 +
                              (Math.random() - 0.5) * 0.25;
    });
    
    // Introduce artificial anomalies for demonstration
    if (triggerAnomaly) {
      const anomalyType = Math.random() > 0.5 ? 'spike' : 'flatline';
      const channelIdx = Math.floor(Math.random() * 8) + 1;
      const channelName = `Channel${channelIdx}`;
      
      if (anomalyType === 'spike') {
        // Create spike anomaly
        const spikeValue = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 1.5);
        channelValues[channelName] = spikeValue;
        
        addAnomalyAlert(`檢測到${channelName}異常高振幅（${spikeValue.toFixed(2)}）`, 'critical');
      } else {
        // Create flatline anomaly
        channelValues[channelName] = 0;
        
        addAnomalyAlert(`檢測到${channelName}訊號平坦異常`, 'critical');
      }
    }
    
    setSimulationData(prevData => {
      // Add new data point
      const newTime = [...prevData.time, time];
      
      // Create new data object with updated values for each channel
      const newData = {};
      allChannels.forEach(channel => {
        newData[channel] = [...prevData.data[channel], channelValues[channel]];
      });
      
      // Check for amplitude anomalies
      const checkAmplitudeAnomalies = (channelName, value) => {
        if (value > anomalyThresholds.amplitude.max) {
          addAnomalyAlert(`${channelName}振幅超出上限（${value.toFixed(2)} > ${anomalyThresholds.amplitude.max}）`);
        } else if (value < anomalyThresholds.amplitude.min) {
          addAnomalyAlert(`${channelName}振幅低於下限（${value.toFixed(2)} < ${anomalyThresholds.amplitude.min}）`);
        }
      };
      
      // Only perform regular anomaly detection if we haven't triggered an artificial anomaly
      if (!triggerAnomaly && dataCountRef.current % 20 === 0) {
        allChannels.forEach(channel => {
          if (selectedChannels.includes(channel)) {
            checkAmplitudeAnomalies(channel, channelValues[channel]);
          }
        });
      }
      
      // If we exceed buffer size, remove old data points
      const startIdx = newTime.length > bufferSize ? newTime.length - bufferSize : 0;
      
      // Analyze data every second (100 data points at 100Hz)
      if (dataCountRef.current % 100 === 0) {
        analyzeData({
          time: newTime,
          channels: allChannels,
          data: newData,
          samplingRate: 100
        });
      }
      
      dataCountRef.current++;
      
      // Create result with data trimmed to buffer size
      const result = {
        time: newTime.slice(startIdx),
        channels: allChannels,
        data: {}
      };
      
      allChannels.forEach(channel => {
        result.data[channel] = newData[channel].slice(startIdx);
      });
      
      return result;
    });
  };

  // Analyze the current data (FFT and statistics)
  const analyzeData = (data) => {
    // Calculate basic statistics
    const stats = {};
    selectedChannels.forEach(channel => {
      const channelData = data.data[channel];
      
      // Calculate mean
      const mean = channelData.reduce((acc, val) => acc + val, 0) / channelData.length;
      
      // Calculate standard deviation
      let sumSquaredDiffs = 0;
      for (let i = 0; i < channelData.length; i++) {
        sumSquaredDiffs += (channelData[i] - mean) ** 2;
      }
      const stdDev = Math.sqrt(sumSquaredDiffs / channelData.length);
      
      // Find min and max
      const min = Math.min(...channelData);
      const max = Math.max(...channelData);
      
      stats[channel] = { mean, stdDev, min, max };
    });
    
    setStatistics(stats);
    
    // Perform FFT on the last second of data
    const fftData = [];
    selectedChannels.forEach(channel => {
      const channelData = data.data[channel].slice(-100); // Last second (100 samples at 100Hz)
      const fftResult = performFFT(channelData, data.samplingRate);
      
      // Check frequency anomalies
      const dominantFreq = findDominantFrequency(fftResult);
      if (dominantFreq > anomalyThresholds.frequency.max) {
        addAnomalyAlert(`${channel}頻率異常（${dominantFreq.toFixed(1)} Hz > ${anomalyThresholds.frequency.max} Hz）`);
      } else if (dominantFreq < anomalyThresholds.frequency.min && dominantFreq > 0.5) {
        addAnomalyAlert(`${channel}頻率異常低（${dominantFreq.toFixed(1)} Hz < ${anomalyThresholds.frequency.min} Hz）`);
      }
      
      fftData.push({
        x: fftResult.frequency,
        y: fftResult.magnitude,
        type: 'scatter',
        mode: 'lines',
        name: channel,
        line: { color: channelColors[channel] }
      });
    });
    
    setFreqData(fftData);
  };

  // Find dominant frequency in FFT result
  const findDominantFrequency = (fftResult) => {
    let maxMagnitude = 0;
    let dominantFreq = 0;
    
    // Skip the DC component (index 0)
    for (let i = 1; i < fftResult.frequency.length; i++) {
      if (fftResult.magnitude[i] > maxMagnitude) {
        maxMagnitude = fftResult.magnitude[i];
        dominantFreq = fftResult.frequency[i];
      }
    }
    
    return dominantFreq;
  };

  // Perform FFT calculation
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

  // Handle simulation speed change
  const handleSpeedChange = (e) => {
    setSimulationSpeed(parseInt(e.target.value));
  };

  // Handle buffer size change
  const handleBufferChange = (e) => {
    setBufferSize(parseInt(e.target.value));
  };

  // 处理标签页切换
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // 整合分析處理功能
  const handleIntegratedAnalysis = () => {
    if (!simulationData || simulationData.time.length === 0) return;
    
    // 建立一個共用資料物件來進行分析
    const dataForAnalysis = {
      data: simulationData.data,
      samplingRate: 100, // 假設實時模擬的採樣率為100Hz
      channels: selectedChannels,
      time: simulationData.time
    };
    
    // 調用各分析模組的核心功能
    performDepressionAnalysis(dataForAnalysis);
    performEpilepsyAnalysis(dataForAnalysis);
    
    // 執行人工智能分析
    if (showAiAnalysis) {
      performAIAnalysis(dataForAnalysis);
    }
    
    // 執行腦退化疾病分析
    if (showNeuroDegenerativeAnalysis) {
      performNeuroDegenerativeAnalysis(dataForAnalysis);
    }
    
    // 更新上次分析時間戳記
    lastAnalysisTimeRef.current = Date.now();
    
    // 添加分析執行提示通知
    if (activeTab === 'waveform') {
      addAnomalyAlert(`已執行整合症狀分析，時間：${new Date().toLocaleTimeString()}`, 'info');
    }
  };
  
  // AI 腦波分析功能
  const performAIAnalysis = (data) => {
    try {
      // 在實際應用中，這裡應該調用後端 AI 模型 API
      // 目前使用模擬數據展示功能
      
      // 1. 特徵提取 - 提取用於分析的特徵
      const features = extractEEGFeatures(data);
      
      // 2. 症狀識別 - 基於特徵識別可能症狀
      const potentialConditions = identifyPotentialConditions(features);
      
      // 3. 設置結果
      setAiAnalysisResult(potentialConditions);
      
      // 4. 設置模型置信度 (模擬數據)
      setAiConfidenceLevel({
        overall: Math.random() * 0.3 + 0.65, // 65-95% 整體置信度
        conditions: potentialConditions.map(condition => ({
          ...condition,
          confidence: Math.random() * 0.4 + 0.55 // 55-95% 各症狀置信度
        }))
      });
      
    } catch (error) {
      console.error("執行AI分析時出錯:", error);
      addAnomalyAlert("AI分析過程發生錯誤", "warning");
    }
  };
  
  // 特徵提取函數 - 從腦電波數據中提取關鍵特徵
  const extractEEGFeatures = (data) => {
    const features = {
      channelData: {},
      frequencyBands: {},
      asymmetry: {},
      complexity: {}
    };
    
    // 逐個通道分析
    selectedChannels.forEach(channel => {
      if (!data.data[channel]) return;
      
      const channelData = data.data[channel].slice(-200); // 取最近 2 秒數據
      
      // 基本統計特徵
      const mean = channelData.reduce((sum, val) => sum + val, 0) / channelData.length;
      const variance = channelData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / channelData.length;
      const stdDev = Math.sqrt(variance);
      
      // 頻率分析
      const fftResult = performFFT(channelData, data.samplingRate);
      
      // 計算各頻帶能量
      const delta = calculateBandPower(fftResult, 0.5, 4);   // 0.5-4 Hz
      const theta = calculateBandPower(fftResult, 4, 8);     // 4-8 Hz
      const alpha = calculateBandPower(fftResult, 8, 13);    // 8-13 Hz
      const beta = calculateBandPower(fftResult, 13, 30);    // 13-30 Hz
      const gamma = calculateBandPower(fftResult, 30, 50);   // 30-50 Hz
      
      // 頻帶比例
      const alphaThetaRatio = theta > 0 ? alpha / theta : 0;
      const betaAlphaRatio = alpha > 0 ? beta / alpha : 0;
      
      // 信號複雜度 (簡化估計)
      const complexity = calculateSignalComplexity(channelData);
      
      // 儲存通道特徵
      features.channelData[channel] = { mean, stdDev, variance };
      features.frequencyBands[channel] = { delta, theta, alpha, beta, gamma };
      features.complexity[channel] = complexity;
    });
    
    // 通道間前額不對稱性分析
    if (data.data['Channel1'] && data.data['Channel2']) {
      features.asymmetry.frontal = calculateAsymmetryIndex(
        features.frequencyBands['Channel1'].alpha,
        features.frequencyBands['Channel2'].alpha
      );
    }
    
    // 通道間顳葉不對稱性分析
    if (data.data['Channel3'] && data.data['Channel4']) {
      features.asymmetry.temporal = calculateAsymmetryIndex(
        features.frequencyBands['Channel3'].alpha,
        features.frequencyBands['Channel4'].alpha
      );
    }
    
    return features;
  };
  
  // 計算信號複雜度
  const calculateSignalComplexity = (signal) => {
    // 非線性動態特徵估計 (簡化版)
    let changes = 0;
    for (let i = 1; i < signal.length; i++) {
      if ((signal[i] > signal[i-1] && i > 1 && signal[i-1] < signal[i-2]) ||
          (signal[i] < signal[i-1] && i > 1 && signal[i-1] > signal[i-2])) {
        changes++;
      }
    }
    
    return changes / (signal.length - 2);
  };
  
  // 計算不對稱性指數
  const calculateAsymmetryIndex = (leftPower, rightPower) => {
    if (leftPower + rightPower === 0) return 0;
    return (rightPower - leftPower) / (rightPower + leftPower);
  };
  
  // 計算頻帶功率
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
  
  // 識別潛在腦功能狀態和相關症狀
  const identifyPotentialConditions = (features) => {
    const conditions = [];
    
    // 憂鬱症特徵檢測
    const depressionScore = analyzeDepressionPattern(features);
    if (depressionScore > 0.6) {
      conditions.push({
        condition: '憂鬱症傾向',
        score: depressionScore,
        details: '檢測到額葉 Alpha 波不對稱及 Alpha/Theta 比例異常',
        severity: depressionScore > 0.8 ? '高度' : '中度'
      });
    }
    
    // 焦慮症特徵檢測
    const anxietyScore = analyzeAnxietyPattern(features);
    if (anxietyScore > 0.6) {
      conditions.push({
        condition: '焦慮症傾向',
        score: anxietyScore,
        details: '檢測到 Beta 波能量升高和前額功率分布異常',
        severity: anxietyScore > 0.8 ? '高度' : '中度'
      });
    }
    
    // 注意力缺陷特徵檢測
    const adhdScore = analyzeADHDPattern(features);
    if (adhdScore > 0.6) {
      conditions.push({
        condition: '注意力缺陷特徵',
        score: adhdScore,
        details: '檢測到 Theta/Beta 比例升高和注意力網絡異常',
        severity: adhdScore > 0.8 ? '高度' : '中度'
      });
    }
    
    // 癲癇傾向特徵檢測
    const epilepsyScore = analyzeEpilepsyPattern(features);
    if (epilepsyScore > 0.6) {
      conditions.push({
        condition: '癲癇波活動',
        score: epilepsyScore,
        details: '檢測到高頻尖波活動和通道間異常同步性',
        severity: epilepsyScore > 0.8 ? '高度' : '中度'
      });
    }
    
    // 認知功能評估
    const cognitiveScore = analyzeCognitiveFunction(features);
    const cognitiveState = interpretCognitiveScore(cognitiveScore);
    conditions.push({
      condition: '認知功能狀態',
      score: cognitiveScore,
      details: cognitiveState.details,
      severity: cognitiveState.level
    });
    
    // 清醒度/疲勞評估
    const alertnessScore = analyzeAlertness(features);
    const alertnessState = interpretAlertnessScore(alertnessScore);
    conditions.push({
      condition: '清醒度評估',
      score: alertnessScore,
      details: alertnessState.details,
      severity: alertnessState.level
    });
    
    return conditions;
  };
  
  // 分析憂鬱症模式
  const analyzeDepressionPattern = (features) => {
    let score = 0;
    
    // 檢查前額Alpha不對稱性
    if (features.asymmetry.frontal) {
      const asymmetry = features.asymmetry.frontal;
      if (asymmetry > 0.1) score += 0.4;  // 右側優勢
      else if (asymmetry < -0.1) score += 0.1; // 左側優勢（正常）
      else score += 0.2;
    }
    
    // 檢查Alpha/Theta比例
    let alphaThetaAvg = 0;
    let channelCount = 0;
    Object.keys(features.frequencyBands).forEach(channel => {
      const bands = features.frequencyBands[channel];
      if (bands.theta > 0) {
        alphaThetaAvg += bands.alpha / bands.theta;
        channelCount++;
      }
    });
    
    if (channelCount > 0) {
      alphaThetaAvg /= channelCount;
      if (alphaThetaAvg < 0.8) score += 0.4;      // 非常低 - 高風險
      else if (alphaThetaAvg < 1.0) score += 0.3; // 低 - 中風險
      else if (alphaThetaAvg < 1.2) score += 0.2; // 偏低 - 輕風險
      else score += 0.1;                          // 正常
    }
    
    // 隨機因素模擬臨床複雜性
    score += (Math.random() * 0.2) - 0.1; // 加減0.1的隨機值
    
    // 確保分數在0-1範圍內
    return Math.max(0, Math.min(1, score));
  };
  
  // 分析焦慮症模式
  const analyzeAnxietyPattern = (features) => {
    let score = 0;
    
    // 檢查Beta波能量
    let betaEnergyAvg = 0;
    let channelCount = 0;
    
    Object.keys(features.frequencyBands).forEach(channel => {
      const bands = features.frequencyBands[channel];
      betaEnergyAvg += bands.beta;
      channelCount++;
    });
    
    if (channelCount > 0) {
      betaEnergyAvg /= channelCount;
      // Beta能量評分 (相對值，實際應用需要正規化)
      if (betaEnergyAvg > 0.3) score += 0.5;      // 非常高
      else if (betaEnergyAvg > 0.2) score += 0.4; // 高
      else if (betaEnergyAvg > 0.15) score += 0.3; // 中高
      else if (betaEnergyAvg > 0.1) score += 0.2; // 中
      else score += 0.1;                          // 低
    }
    
    // 檢查Alpha波能量 (低Alpha與焦慮相關)
    let alphaEnergyAvg = 0;
    channelCount = 0;
    
    Object.keys(features.frequencyBands).forEach(channel => {
      const bands = features.frequencyBands[channel];
      alphaEnergyAvg += bands.alpha;
      channelCount++;
    });
    
    if (channelCount > 0) {
      alphaEnergyAvg /= channelCount;
      if (alphaEnergyAvg < 0.1) score += 0.3;      // 非常低
      else if (alphaEnergyAvg < 0.15) score += 0.2; // 低
      else score += 0.1;                            // 正常/高
    }
    
    // 隨機因素模擬臨床複雜性
    score += (Math.random() * 0.2) - 0.1;
    
    return Math.max(0, Math.min(1, score));
  };
  
  // 分析ADHD模式
  const analyzeADHDPattern = (features) => {
    let score = 0;
    
    // 檢查Theta/Beta比例 (ADHD的關鍵指標)
    let thetaBetaAvg = 0;
    let channelCount = 0;
    
    Object.keys(features.frequencyBands).forEach(channel => {
      const bands = features.frequencyBands[channel];
      if (bands.beta > 0) {
        thetaBetaAvg += bands.theta / bands.beta;
        channelCount++;
      }
    });
    
    if (channelCount > 0) {
      thetaBetaAvg /= channelCount;
      if (thetaBetaAvg > 3.0) score += 0.5;       // 非常高
      else if (thetaBetaAvg > 2.5) score += 0.4;  // 高
      else if (thetaBetaAvg > 2.0) score += 0.3;  // 中高
      else if (thetaBetaAvg > 1.5) score += 0.2;  // 中
      else score += 0.1;                           // 低
    }
    
    // 檢查Delta波能量 (與專注力相關)
    let deltaEnergyAvg = 0;
    channelCount = 0;
    
    Object.keys(features.frequencyBands).forEach(channel => {
      const bands = features.frequencyBands[channel];
      deltaEnergyAvg += bands.delta;
      channelCount++;
    });
    
    if (channelCount > 0) {
      deltaEnergyAvg /= channelCount;
      if (deltaEnergyAvg > 0.3) score += 0.3;      // 非常高
      else if (deltaEnergyAvg > 0.2) score += 0.2; // 高
      else score += 0.1;                            // 正常/低
    }
    
    // 隨機因素模擬臨床複雜性
    score += (Math.random() * 0.2) - 0.1;
    
    return Math.max(0, Math.min(1, score));
  };
  
  // 分析癲癇模式
  const analyzeEpilepsyPattern = (features) => {
    let score = 0;
    
    // 檢查信號複雜度 (低複雜度可能表示癲癇發作風險)
    let complexityAvg = 0;
    let channelCount = 0;
    
    Object.keys(features.complexity).forEach(channel => {
      complexityAvg += features.complexity[channel];
      channelCount++;
    });
    
    if (channelCount > 0) {
      complexityAvg /= channelCount;
      if (complexityAvg < 0.2) score += 0.4;      // 非常低
      else if (complexityAvg < 0.3) score += 0.3; // 低
      else if (complexityAvg < 0.4) score += 0.2; // 中
      else score += 0.1;                          // 高
    }
    
    // 檢查高頻成分 (與癲癇發作相關)
    let gammaEnergyAvg = 0;
    channelCount = 0;
    
    Object.keys(features.frequencyBands).forEach(channel => {
      const bands = features.frequencyBands[channel];
      gammaEnergyAvg += bands.gamma;
      channelCount++;
    });
    
    if (channelCount > 0) {
      gammaEnergyAvg /= channelCount;
      if (gammaEnergyAvg > 0.2) score += 0.4;      // 非常高
      else if (gammaEnergyAvg > 0.15) score += 0.3; // 高
      else if (gammaEnergyAvg > 0.1) score += 0.2; // 中
      else score += 0.1;                           // 低
    }
    
    // 隨機因素模擬臨床複雜性
    score += (Math.random() * 0.2) - 0.1;
    
    return Math.max(0, Math.min(1, score));
  };
  
  // 分析認知功能
  const analyzeCognitiveFunction = (features) => {
    let score = 0;
    
    // 檢查Alpha/Beta比例 (與認知處理相關)
    let alphaBetaAvg = 0;
    let channelCount = 0;
    
    Object.keys(features.frequencyBands).forEach(channel => {
      const bands = features.frequencyBands[channel];
      if (bands.beta > 0) {
        alphaBetaAvg += bands.alpha / bands.beta;
        channelCount++;
      }
    });
    
    if (channelCount > 0) {
      alphaBetaAvg /= channelCount;
      // 適當的比例範圍最佳
      if (alphaBetaAvg > 0.8 && alphaBetaAvg < 1.5) score += 0.6;
      else if (alphaBetaAvg > 0.6 && alphaBetaAvg < 2.0) score += 0.4;
      else score += 0.2;
    }
    
    // 檢查Gamma波能量 (與高級認知處理相關)
    let gammaEnergyAvg = 0;
    channelCount = 0;
    
    Object.keys(features.frequencyBands).forEach(channel => {
      const bands = features.frequencyBands[channel];
      gammaEnergyAvg += bands.gamma;
      channelCount++;
    });
    
    if (channelCount > 0) {
      gammaEnergyAvg /= channelCount;
      if (gammaEnergyAvg > 0.1 && gammaEnergyAvg < 0.2) score += 0.4;
      else if (gammaEnergyAvg > 0.05 && gammaEnergyAvg < 0.25) score += 0.3;
      else score += 0.1;
    }
    
    // 隨機因素
    score += (Math.random() * 0.1);
    
    return Math.max(0, Math.min(1, score));
  };
  
  // 分析清醒度/疲勞度
  const analyzeAlertness = (features) => {
    let score = 0;
    
    // 檢查Theta波能量 (與疲勞/嗜睡相關)
    let thetaEnergyAvg = 0;
    let channelCount = 0;
    
    Object.keys(features.frequencyBands).forEach(channel => {
      const bands = features.frequencyBands[channel];
      thetaEnergyAvg += bands.theta;
      channelCount++;
    });
    
    if (channelCount > 0) {
      thetaEnergyAvg /= channelCount;
      if (thetaEnergyAvg > 0.3) score += 0.2;      // 非常高 (困倦)
      else if (thetaEnergyAvg > 0.2) score += 0.4; // 適中
      else if (thetaEnergyAvg > 0.1) score += 0.6; // 低 (清醒)
      else score += 0.5;                           // 非常低
    }
    
    // 檢查Beta波能量 (與清醒相關)
    let betaEnergyAvg = 0;
    channelCount = 0;
    
    Object.keys(features.frequencyBands).forEach(channel => {
      const bands = features.frequencyBands[channel];
      betaEnergyAvg += bands.beta;
      channelCount++;
    });
    
    if (channelCount > 0) {
      betaEnergyAvg /= channelCount;
      if (betaEnergyAvg > 0.2) score += 0.4;      // 高 (高度清醒)
      else if (betaEnergyAvg > 0.1) score += 0.3; // 中
      else score += 0.1;                          // 低 (困倦)
    }
    
    // 隨機因素
    score += (Math.random() * 0.1);
    
    return Math.max(0, Math.min(1, score));
  };
  
  // 解釋認知功能分數
  const interpretCognitiveScore = (score) => {
    if (score > 0.8) {
      return { level: '優秀', details: '認知功能處於最佳狀態，訊息處理能力強' };
    } else if (score > 0.6) {
      return { level: '良好', details: '認知功能狀態良好，思維清晰' };
    } else if (score > 0.4) {
      return { level: '一般', details: '認知功能正常，可能存在輕微處理速度變化' };
    } else {
      return { level: '較弱', details: '認知處理可能受到影響，注意力或執行功能下降' };
    }
  };
  
  // 解釋清醒度分數
  const interpretAlertnessScore = (score) => {
    if (score > 0.8) {
      return { level: '高度清醒', details: '大腦處於高度清醒專注狀態' };
    } else if (score > 0.6) {
      return { level: '清醒', details: '清醒狀態良好，反應靈敏' };
    } else if (score > 0.4) {
      return { level: '放鬆', details: '處於放鬆但保持清醒的狀態' };
    } else if (score > 0.2) {
      return { level: '疲勞', details: '顯示疲勞跡象，注意力可能下降' };
    } else {
      return { level: '嗜睡', details: '呈現明顯嗜睡模式，警覺性低下' };
    }
  };

  // 憂鬱症分析功能
  const performDepressionAnalysis = (data) => {
    try {
      // 執行憂鬱症分析相關計算，僅供示例
      // 在實際應用中應調用DepressionAnalyzer中的核心分析函數
      
      // 簡化版示例結果
      const results = {
        alphaAsymmetry: calculateSimpleAsymmetry(data, 'Channel1', 'Channel2'),
        alphaThetaRatio: Math.random() * 2 + 0.5, // 模擬結果
        timestamp: new Date().toLocaleTimeString()
      };
      
      setDepressionResults(results);
    } catch (error) {
      console.error("執行憂鬱症分析時出錯:", error);
    }
  };
  
  // 癲癇分析功能
  const performEpilepsyAnalysis = (data) => {
    try {
      // 執行癲癇分析相關計算，僅供示例
      // 在實際應用中應調用EpilepsyAnalyzer中的核心分析函數
      
      // 簡化版示例結果
      const results = {
        spikeDetected: Math.random() > 0.8, // 20%機率檢測到棘波
        abnormalCoherence: Math.random() > 0.9, // 10%機率檢測到異常相干性
        dominantFrequency: Math.floor(Math.random() * 30) + 1,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setEpilepsyResults(results);
    } catch (error) {
      console.error("執行癲癇分析時出錯:", error);
    }
  };
  
  // 簡單的不對稱性計算函數（示例）
  const calculateSimpleAsymmetry = (data, leftChannel, rightChannel) => {
    if (!data.data[leftChannel] || !data.data[rightChannel]) return 0;
    
    // 取最新的100個樣本
    const leftData = data.data[leftChannel].slice(-100);
    const rightData = data.data[rightChannel].slice(-100);
    
    // 計算平均值
    const leftMean = leftData.reduce((sum, val) => sum + val, 0) / leftData.length;
    const rightMean = rightData.reduce((sum, val) => sum + val, 0) / rightData.length;
    
    // 返回簡單的不對稱性指標
    return (rightMean - leftMean) / (rightMean + leftMean);
  };

  // 神經退化性疾病分析功能
  const performNeuroDegenerativeAnalysis = (data) => {
    try {
      // 在實際應用中，這裡應該使用更複雜的神經退化性疾病檢測演算法
      // 當前使用簡化模型進行展示
      
      // 提取與神經退化疾病相關的特徵
      const features = extractNeuroDegenerativeFeatures(data);
      
      // 分析各種神經退化疾病的可能性
      const results = {
        alzheimers: analyzeAlzheimersDisease(features),
        parkinsons: analyzeParkinsonDisease(features),
        vascularDementia: analyzeVascularDementia(features),
        lewyBodies: analyzeLewyBodyDementia(features),
        timestamp: new Date().toLocaleTimeString()
      };
      
      // 設置結果
      setNeuroDegenerativeResults(results);
      
    } catch (error) {
      console.error("執行神經退化性疾病分析時出錯:", error);
      addAnomalyAlert("神經退化性疾病分析過程發生錯誤", "warning");
    }
  };
  
  // 提取神經退化疾病相關特徵
  const extractNeuroDegenerativeFeatures = (data) => {
    const features = {
      slowWaveRatio: {},        // 慢波比例 (Delta+Theta)/(Alpha+Beta)
      alphaSlowing: {},         // Alpha節律減慢程度
      spectralEntropy: {},      // 頻譜熵 (神經退化常有熵值降低)
      phaseCoherence: {},       // 通道間相位一致性
      nonlinearMetrics: {},     // 非線性指標
      amplitudeModulation: {},  // 振幅調變特性
      peakFrequency: {}         // 主頻率偏移
    };
    
    // 分析每個通道
    selectedChannels.forEach(channel => {
      if (!data.data[channel]) return;
      
      // 獲取通道數據
      const signal = data.data[channel].slice(-300); // 取3秒數據
      
      // 執行FFT
      const fftResult = performFFT(signal, data.samplingRate);
      
      // 計算頻帶功率
      const delta = calculateBandPower(fftResult, 0.5, 4);
      const theta = calculateBandPower(fftResult, 4, 8);
      const alpha = calculateBandPower(fftResult, 8, 13);
      const beta = calculateBandPower(fftResult, 13, 30);
      const gamma = calculateBandPower(fftResult, 30, 50);
      
      // 計算慢波比例 - 阿茲海默症中增加
      const slowWaveRatio = (delta + theta) / (alpha + beta);
      features.slowWaveRatio[channel] = slowWaveRatio;
      
      // 計算Alpha主頻率 - 神經退化中減慢
      const alphaPeakFreq = calculatePeakFrequency(fftResult, 8, 13);
      features.alphaSlowing[channel] = alphaPeakFreq;
      
      // 計算頻譜熵 (頻譜的多樣性/不規則性)
      const spectralEntropy = calculateSpectralEntropy(fftResult);
      features.spectralEntropy[channel] = spectralEntropy;
      
      // 計算主頻率
      const dominantFrequency = findDominantFrequency(fftResult);
      features.peakFrequency[channel] = dominantFrequency;
      
      // 計算振幅調變
      const amplitudeModulation = calculateAmplitudeModulation(signal);
      features.amplitudeModulation[channel] = amplitudeModulation;
    });
    
    // 計算通道間相位一致性 (重要的神經退化指標)
    features.phaseCoherence = calculateMultiChannelCoherence(data);
    
    return features;
  };
  
  // 計算主頻率
  const calculatePeakFrequency = (fftResult, minFreq, maxFreq) => {
    let maxMagnitude = 0;
    let peakFreq = 0;
    
    for (let i = 0; i < fftResult.frequency.length; i++) {
      const freq = fftResult.frequency[i];
      if (freq >= minFreq && freq <= maxFreq) {
        if (fftResult.magnitude[i] > maxMagnitude) {
          maxMagnitude = fftResult.magnitude[i];
          peakFreq = freq;
        }
      }
    }
    
    return peakFreq;
  };
  
  // 計算頻譜熵
  const calculateSpectralEntropy = (fftResult) => {
    // 只使用相關頻段 (0.5-30 Hz)
    const relevantMagnitudes = [];
    const relevantFreqs = [];
    
    for (let i = 0; i < fftResult.frequency.length; i++) {
      if (fftResult.frequency[i] >= 0.5 && fftResult.frequency[i] <= 30) {
        relevantMagnitudes.push(fftResult.magnitude[i]);
        relevantFreqs.push(fftResult.frequency[i]);
      }
    }
    
    // 計算總功率
    const totalPower = relevantMagnitudes.reduce((sum, mag) => sum + mag * mag, 0);
    
    // 計算正規化概率分布
    const normalizedPower = relevantMagnitudes.map(mag => (mag * mag) / totalPower);
    
    // 計算熵
    let entropy = 0;
    normalizedPower.forEach(p => {
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    });
    
    return entropy;
  };
  
  // 計算多通道相位一致性
  const calculateMultiChannelCoherence = (data) => {
    const result = {};
    const channels = selectedChannels;
    
    // 如果通道數太少，無法計算相位一致性
    if (channels.length < 2) {
      return result;
    }
    
    // 前額通道之間的一致性 (FP1-FP2, F3-F4)
    if (channels.includes('Channel1') && channels.includes('Channel2')) {
      result.frontal = calculatePhaseCoherence(
        data.data['Channel1'].slice(-300),
        data.data['Channel2'].slice(-300),
        data.samplingRate
      );
    }
    
    // 顳葉通道之間的一致性 (T3-T4, T5-T6)
    if (channels.includes('Channel3') && channels.includes('Channel4')) {
      result.temporal = calculatePhaseCoherence(
        data.data['Channel3'].slice(-300),
        data.data['Channel4'].slice(-300),
        data.samplingRate
      );
    }
    
    // 前額與顳葉之間的一致性
    if (channels.includes('Channel1') && channels.includes('Channel3')) {
      result.frontoTemporal = calculatePhaseCoherence(
        data.data['Channel1'].slice(-300),
        data.data['Channel3'].slice(-300),
        data.samplingRate
      );
    }
    
    return result;
  };
  
  // 計算兩個信號間的相位一致性
  const calculatePhaseCoherence = (signal1, signal2, samplingRate) => {
    // 確保信號長度相同
    const length = Math.min(signal1.length, signal2.length);
    
    // 獲取兩個信號的FFT結果
    const fft1 = performFFT(signal1.slice(0, length), samplingRate);
    const fft2 = performFFT(signal2.slice(0, length), samplingRate);
    
    // 計算相干性
    let coherenceSum = 0;
    let count = 0;
    
    // 只計算特定頻率範圍的相干性 (例如 8-13 Hz 的Alpha頻帶)
    for (let i = 0; i < fft1.frequency.length; i++) {
      const freq = fft1.frequency[i];
      if (freq >= 8 && freq <= 13) {
        // 簡化的相位一致性計算 (在實際應用中，這應該更複雜)
        // 這裡使用振幅乘積作為簡化的相干性度量
        coherenceSum += fft1.magnitude[i] * fft2.magnitude[i];
        count++;
      }
    }
    
    return count > 0 ? coherenceSum / count : 0;
  };
  
  // 計算振幅調變 (神經退化可能顯示為振幅調變特性變化)
  const calculateAmplitudeModulation = (signal) => {
    if (signal.length < 100) return 0;
    
    // 計算信號包絡
    const envelope = [];
    const windowSize = 10;
    
    for (let i = 0; i < signal.length - windowSize; i++) {
      const segment = signal.slice(i, i + windowSize);
      const max = Math.max(...segment);
      const min = Math.min(...segment);
      envelope.push(max - min);
    }
    
    // 計算包絡的變異性
    const mean = envelope.reduce((sum, val) => sum + val, 0) / envelope.length;
    const variance = envelope.reduce((sum, val) => sum + (val - mean) ** 2, 0) / envelope.length;
    
    return Math.sqrt(variance) / mean; // 返回變異係數
  };
  
  // 分析阿茲海默症的可能性
  const analyzeAlzheimersDisease = (features) => {
    let score = 0;
    let markers = [];
    
    // 1. 慢波比例增加 (Delta+Theta/Alpha+Beta)
    let avgSlowWaveRatio = 0;
    let channelCount = 0;
    
    Object.keys(features.slowWaveRatio).forEach(channel => {
      avgSlowWaveRatio += features.slowWaveRatio[channel];
      channelCount++;
    });
    
    if (channelCount > 0) {
      avgSlowWaveRatio /= channelCount;
      if (avgSlowWaveRatio > 2.5) {
        score += 0.3;
        markers.push({ 
          name: "慢波比例增加", 
          value: avgSlowWaveRatio.toFixed(2),
          description: "Delta和Theta波段能量相對於Alpha和Beta波段偏高" 
        });
      }
    }
    
    // 2. 不對稱的相位一致性（常見於單側血管損傷）
    if (features.phaseCoherence.frontal !== undefined && 
        features.phaseCoherence.temporal !== undefined) {
      const coherenceDiff = Math.abs(
        features.phaseCoherence.frontal - features.phaseCoherence.temporal
      );
      
      if (coherenceDiff > 0.3) {
        score += 0.25;
        markers.push({ 
          name: "腦區相位一致性不對稱", 
          value: coherenceDiff.toFixed(2),
          description: "前額葉與顳葉區相位一致性差異大，可能表明局部血管損傷" 
        });
      } else if (coherenceDiff > 0.15) {
        score += 0.15;
        markers.push({ 
          name: "腦區相位一致性輕微不對稱", 
          value: coherenceDiff.toFixed(2),
          description: "不同腦區相位一致性有一定差異" 
        });
      }
    }
    
    // 3. 頻譜熵局部降低
    const entropyValues = Object.values(features.spectralEntropy);
    if (entropyValues.length > 1) {
      const max = Math.max(...entropyValues);
      const min = Math.min(...entropyValues);
      const difference = max - min;
      
      if (difference > 0.3) {
        score += 0.2;
        markers.push({ 
          name: "局部頻譜熵顯著差異", 
          value: difference.toFixed(2),
          description: "不同腦區域的信號複雜度差異大，常見於局部缺血性病變" 
        });
      } else if (difference > 0.15) {
        score += 0.1;
        markers.push({ 
          name: "局部頻譜熵輕微差異", 
          value: difference.toFixed(2),
          description: "不同腦區域的信號複雜度有一定差異" 
        });
      }
    }
    
    // 4. 整體慢波增加（常見於多發性微小血管病變）
    // 使用已有的 avgSlowWaveRatio 變數而不是重新宣告
    
    if (channelCount > 0) {
      if (avgSlowWaveRatio > 2.2) {
        score += 0.15;
        markers.push({ 
          name: "整體慢波活動增加", 
          value: avgSlowWaveRatio.toFixed(2),
          description: "慢波活動普遍增加，常見於廣泛性微小血管病變" 
        });
      }
    }
    
    // 添加一點隨機變化，模擬臨床變異性
    score += (Math.random() * 0.1) - 0.05;
    
    // 確保分數在0-1範圍內
    score = Math.max(0, Math.min(1, score));
    
    // 解釋
    let interpretation = "";
    if (score > 0.7) {
      interpretation = "檢測到多項與阿茲海默症相關的腦電波特徵，建議進一步臨床評估";
    } else if (score > 0.4) {
      interpretation = "檢測到部分與阿茲海默症相關的腦電波特徵，可能需要後續觀察";
    } else {
      interpretation = "未檢測到明顯的阿茲海默症相關腦電波特徵";
    }
    
    return {
      score: score,
      markers: markers,
      interpretation: interpretation
    };
  };
  
  // 分析血管性失智症的可能性
  const analyzeVascularDementia = (features) => {
    let score = 0;
    let markers = [];
    
    // 1. 局部慢波增加（常見於血管性失智症）
    // 檢查通道間慢波比例的不一致性，這可能表明局部損傷
    const slowWaveRatios = Object.values(features.slowWaveRatio);
    if (slowWaveRatios.length > 1) {
      const max = Math.max(...slowWaveRatios);
      const min = Math.min(...slowWaveRatios);
      const difference = max - min;
      
      if (difference > 1.0) {
        score += 0.3;
        markers.push({ 
          name: "局部慢波差異顯著", 
          value: difference.toFixed(2),
          description: "不同腦區域的慢波活動差異大，常見於局部血管損傷" 
        });
      } else if (difference > 0.5) {
        score += 0.2;
        markers.push({ 
          name: "局部慢波差異", 
          value: difference.toFixed(2),
          description: "不同腦區域的慢波活動有一定差異" 
        });
      }
    }
    
    // 2. 不對稱的相位一致性（常見於單側血管損傷）
    if (features.phaseCoherence.frontal !== undefined && 
        features.phaseCoherence.temporal !== undefined) {
      const coherenceDiff = Math.abs(
        features.phaseCoherence.frontal - features.phaseCoherence.temporal
      );
      
      if (coherenceDiff > 0.3) {
        score += 0.25;
        markers.push({ 
          name: "腦區相位一致性不對稱", 
          value: coherenceDiff.toFixed(2),
          description: "前額葉與顳葉區相位一致性差異大，可能表明局部血管損傷" 
        });
      } else if (coherenceDiff > 0.15) {
        score += 0.15;
        markers.push({ 
          name: "腦區相位一致性輕微不對稱", 
          value: coherenceDiff.toFixed(2),
          description: "不同腦區相位一致性有一定差異" 
        });
      }
    }
    
    // 3. 頻譜熵局部降低
    const entropyValues = Object.values(features.spectralEntropy);
    if (entropyValues.length > 1) {
      const max = Math.max(...entropyValues);
      const min = Math.min(...entropyValues);
      const difference = max - min;
      
      if (difference > 0.3) {
        score += 0.2;
        markers.push({ 
          name: "局部頻譜熵顯著差異", 
          value: difference.toFixed(2),
          description: "不同腦區域的信號複雜度差異大，常見於局部缺血性病變" 
        });
      } else if (difference > 0.15) {
        score += 0.1;
        markers.push({ 
          name: "局部頻譜熵輕微差異", 
          value: difference.toFixed(2),
          description: "不同腦區域的信號複雜度有一定差異" 
        });
      }
    }
    
    // 4. 整體慢波增加（常見於多發性微小血管病變）
    let avgSlowWaveRatio = 0;
    let channelCount = 0;
    
    Object.keys(features.slowWaveRatio).forEach(channel => {
      avgSlowWaveRatio += features.slowWaveRatio[channel];
      channelCount++;
    });
    
    if (channelCount > 0) {
      avgSlowWaveRatio /= channelCount;
      if (avgSlowWaveRatio > 2.2) {
        score += 0.15;
        markers.push({ 
          name: "整體慢波活動增加", 
          value: avgSlowWaveRatio.toFixed(2),
          description: "慢波活動普遍增加，常見於廣泛性微小血管病變" 
        });
      }
    }
    
    // 添加一點隨機變化，模擬臨床變異性
    score += (Math.random() * 0.1) - 0.05;
    
    // 確保分數在0-1範圍內
    score = Math.max(0, Math.min(1, score));
    
    // 解釋
    let interpretation = "";
    if (score > 0.7) {
      interpretation = "檢測到多項與血管性失智症相關的腦電波特徵，建議進一步臨床評估";
    } else if (score > 0.4) {
      interpretation = "檢測到部分與血管性失智症相關的腦電波特徵，可能需要後續觀察";
    } else {
      interpretation = "未檢測到明顯的血管性失智症相關腦電波特徵";
    }
    
    return {
      score: score,
      markers: markers,
      interpretation: interpretation
    };
  };
  
  // 分析帕金森氏症的可能性
  const analyzeParkinsonDisease = (features) => {
    let score = 0;
    let markers = [];
    
    // 1. Beta波能量異常 (帕金森常見Beta波增強和分布異常)
    // 特別是高Beta頻段 (20-30Hz) 在基底核疾病中更為顯著
    let highBetaEnergy = 0;
    let lowBetaEnergy = 0;
    let channelCount = 0;
    
    selectedChannels.forEach(channel => {
      if (features.frequencyBands && features.frequencyBands[channel]) {
        // 分析高Beta (20-30Hz) 和低Beta (13-20Hz)
        // 注意：這是簡化版本，實際應從原始頻譜中分別計算
        const totalBeta = features.frequencyBands[channel].beta || 0;
        // 假設高Beta佔Beta總能量的60%
        highBetaEnergy += totalBeta * 0.6; 
        // 假設低Beta佔Beta總能量的40%
        lowBetaEnergy += totalBeta * 0.4;
        channelCount++;
      }
    });
    
    if (channelCount > 0) {
      highBetaEnergy /= channelCount;
      lowBetaEnergy /= channelCount;
      
      // 高Beta能量增強是帕金森的重要標誌
      if (highBetaEnergy > 0.25) {
        score += 0.3;
        markers.push({
          name: "高頻Beta波能量顯著增強",
          value: highBetaEnergy.toFixed(2),
          description: "20-30Hz高頻Beta活動顯著增強，為帕金森氏症的典型腦電特徵"
        });
      } else if (highBetaEnergy > 0.2) {
        score += 0.2;
        markers.push({
          name: "高頻Beta波能量增強",
          value: highBetaEnergy.toFixed(2),
          description: "20-30Hz高頻Beta活動增強"
        });
      }
      
      // 高Beta/低Beta比值增加也是重要指標
      const betaRatio = highBetaEnergy / (lowBetaEnergy || 0.001); // 避免除以零
      if (betaRatio > 1.5) {
        score += 0.15;
        markers.push({
          name: "Beta頻段內分布異常",
          value: betaRatio.toFixed(2),
          description: "高頻Beta相對低頻Beta過度活躍，常見於基底核功能障礙"
        });
      }
    }
    
    // 2. 顫抖相關的節律活動 (4-6 Hz)
    // 帕金森顫抖通常在4-6Hz範圍，更精確分析此頻段
    let tremorRhythmPower = 0;
    let nonTremorThetaPower = 0; // 非顫抖相關的Theta (6-8Hz)
    channelCount = 0;
    
    selectedChannels.forEach(channel => {
      if (features.frequencyBands && features.frequencyBands[channel]) {
        // 使用更精確的帕金森顫抖頻帶估計
        // 注意：在實際應用中，應該直接從FFT結果中精確計算4-6Hz能量
        const thetaPower = features.frequencyBands[channel].theta || 0;
        
        // 估計4-6Hz成分（顫抖相關）佔Theta的60%
        tremorRhythmPower += thetaPower * 0.6;
        // 估計6-8Hz成分（非顫抖相關）佔Theta的40%
        nonTremorThetaPower += thetaPower * 0.4;
        channelCount++;
      }
    });
    
    if (channelCount > 0) {
      tremorRhythmPower /= channelCount;
      nonTremorThetaPower /= channelCount;
      
      // 顫抖頻率能量顯著
      if (tremorRhythmPower > 0.18) {
        score += 0.3;
        markers.push({
          name: "顫抖相關節律顯著",
          value: tremorRhythmPower.toFixed(2),
          description: "4-6Hz頻率顯著增強，高度符合帕金森顫抖特徵"
        });
      } else if (tremorRhythmPower > 0.12) {
        score += 0.2;
        markers.push({
          name: "顫抖相關節律增強",
          value: tremorRhythmPower.toFixed(2),
          description: "4-6Hz頻率活動增強，可能與顫抖相關"
        });
      }
      
      // 顫抖/非顫抖比值也是重要指標
      const tremorRatio = tremorRhythmPower / (nonTremorThetaPower || 0.001);
      if (tremorRatio > 1.5) {
        score += 0.15;
        markers.push({
          name: "顫抖頻率優勢",
          value: tremorRatio.toFixed(2),
          description: "顫抖頻率(4-6Hz)相對非顫抖Theta頻率活動明顯增強"
        });
      }
    }
    
    // 3. 運動皮層-基底核環路功能標記
    // 檢查Central(C3/C4)與Frontal(F3/F4)通道Beta相位一致性
    if (features.phaseCoherence && 
        features.phaseCoherence.frontal !== undefined && 
        features.phaseCoherence.central !== undefined) {
      
      // 帕金森中運動皮層與前額葉的Beta相位一致性異常增強
      const motorFrontalCoherence = 
        (features.phaseCoherence.frontal + features.phaseCoherence.central) / 2;
      
      if (motorFrontalCoherence > 0.65) {
        score += 0.25;
        markers.push({
          name: "運動-前額Beta同步性異常",
          value: motorFrontalCoherence.toFixed(2),
          description: "運動皮層與前額葉間Beta節律異常同步，提示基底核-皮層環路功能異常"
        });
      } else if (motorFrontalCoherence > 0.5) {
        score += 0.15;
        markers.push({
          name: "運動-前額同步性略增",
          value: motorFrontalCoherence.toFixed(2),
          description: "運動皮層與前額葉間同步性略有增強"
        });
      }
    }
    
    // 4. 感覺運動節律異常
    // 檢查Mu節律(8-12Hz)在C3/C4電極的抑制程度
    let muRhythmPower = 0;
    let sensoryMotorChannels = 0;
    
    // 假設Channel3和Channel4代表C3/C4或運動區域
    ['Channel3', 'Channel4'].forEach(channel => {
      if (features.frequencyBands && features.frequencyBands[channel]) {
        // Mu節律近似於alpha頻段但在感覺運動區域
        muRhythmPower += features.frequencyBands[channel].alpha || 0;
        sensoryMotorChannels++;
      }
    });
    
    if (sensoryMotorChannels > 0) {
      muRhythmPower /= sensoryMotorChannels;
      
      // 帕金森常見Mu節律異常增強(抑制不足)
      if (muRhythmPower > 0.25) {
        score += 0.2;
        markers.push({
          name: "感覺運動Mu節律異常",
          value: muRhythmPower.toFixed(2),
          description: "感覺運動區Mu節律(8-12Hz)異常增強，表明運動準備功能障礙"
        });
      } else if (muRhythmPower > 0.2) {
        score += 0.1;
        markers.push({
          name: "感覺運動Mu節律略增",
          value: muRhythmPower.toFixed(2),
          description: "感覺運動區Mu節律略有增強"
        });
      }
    }
    
    // 5. 額葉認知功能指標 - P300延遲或減弱的EEG相關特徵
    // 在實時EEG中，我們用Alpha/Theta比例降低作為認知減退替代指標
    let cognitiveIndex = 0;
    let frontalChannels = 0;
    
    // 假設Channel1和Channel2代表前額區域
    ['Channel1', 'Channel2'].forEach(channel => {
      if (features.frequencyBands && features.frequencyBands[channel]) {
        const alpha = features.frequencyBands[channel].alpha || 0;
        const theta = features.frequencyBands[channel].theta || 0;
        if (theta > 0) {
          cognitiveIndex += alpha / theta;
          frontalChannels++;
        }
      }
    });
    
    if (frontalChannels > 0) {
      cognitiveIndex /= frontalChannels;
      
      // 低Alpha/Theta比值表明認知功能減退
      if (cognitiveIndex < 0.8) {
        score += 0.2;
        markers.push({
          name: "前額認知功能指標降低",
          value: cognitiveIndex.toFixed(2),
          description: "前額葉Alpha/Theta比值顯著降低，提示認知處理功能減退"
        });
      } else if (cognitiveIndex < 1.0) {
        score += 0.1;
        markers.push({
          name: "認知功能指標輕微降低",
          value: cognitiveIndex.toFixed(2),
          description: "前額葉Alpha/Theta比值輕微降低"
        });
      }
    }
    
    // 6. 動態時變特性分析 - 帕金森的EEG通常表現出不穩定性
    // 分析振幅調變的變異程度
    const modValues = Object.values(features.amplitudeModulation || {});
    if (modValues.length > 1) {
      const avgModulation = modValues.reduce((sum, val) => sum + val, 0) / modValues.length;
      
      // 計算變異係數，反映信號不穩定性
      const variance = modValues.reduce((sum, val) => sum + Math.pow(val - avgModulation, 2), 0) / modValues.length;
      const variationCoeff = Math.sqrt(variance) / avgModulation;
      
      if (variationCoeff > 0.5) {
        score += 0.15;
        markers.push({
          name: "腦電信號不穩定性增加",
          value: variationCoeff.toFixed(2),
          description: "腦電波動態特性表現不穩定，常見於進行性神經退化疾病"
        });
      } else if (variationCoeff > 0.3) {
        score += 0.1;
        markers.push({
          name: "腦電信號輕微不穩定",
          value: variationCoeff.toFixed(2),
          description: "腦電波動態特性略顯不穩定"
        });
      }
    }
    
    // 適當調整隨機因子，使其更接近實際臨床變異
    score += (Math.random() * 0.05) - 0.025; // 減少隨機變異範圍為±0.025
    
    // 確保分數在0-1範圍內
    score = Math.max(0, Math.min(1, score));
    
    // 更詳細的解釋和臨床建議
    let interpretation = "";
    let clinicalSuggestion = "";
    
    if (score > 0.75) {
      interpretation = "檢測到多項明顯的帕金森氏症相關腦電波特徵";
      clinicalSuggestion = "強烈建議進行神經科專業評估、震顫測量和腦功能成像檢查";
    } else if (score > 0.6) {
      interpretation = "檢測到數項帕金森氏症相關腦電波特徵";
      clinicalSuggestion = "建議進行神經科專業評估和詳細的運動功能檢查";
    } else if (score > 0.4) {
      interpretation = "檢測到部分可能與帕金森氏症相關的腦電波特徵";
      clinicalSuggestion = "建議進行基本的神經系統檢查並考慮後續觀察";
    } else if (score > 0.25) {
      interpretation = "檢測到少量可能與運動功能相關的輕微異常";
      clinicalSuggestion = "若有臨床症狀，建議隨訪觀察";
    } else {
      interpretation = "未檢測到明顯的帕金森氏症相關腦電波特徵";
      clinicalSuggestion = "目前無需特殊干預";
    }
    
    return {
      score: score,
      markers: markers,
      interpretation: interpretation,
      clinicalSuggestion: clinicalSuggestion
    };
  };
  
  // 分析路易體失智症的可能性
  const analyzeLewyBodyDementia = (features) => {
    let score = 0;
    let markers = [];
    
    // 1. 顯著的波動性特徵（路易體失智症的特徵之一）
    let avgModulation = 0;
    let channelCount = 0;
    
    Object.keys(features.amplitudeModulation).forEach(channel => {
      avgModulation += features.amplitudeModulation[channel];
      channelCount++;
    });
    
    if (channelCount > 0) {
      avgModulation /= channelCount;
      // 路易體失智症中常見極高或極低的振幅調變
      if (avgModulation > 0.8 || avgModulation < 0.2) {
        score += 0.3;
        markers.push({ 
          name: "異常的振幅調變", 
          value: avgModulation.toFixed(2),
          description: "腦電波呈現異常的振幅調變模式，常見於路易體失智症" 
        });
      } else if (avgModulation > 0.7 || avgModulation < 0.3) {
        score += 0.2;
        markers.push({ 
          name: "輕微異常的振幅調變", 
          value: avgModulation.toFixed(2),
          description: "腦電波振幅調變模式略顯異常" 
        });
      }
    }
    
    // 2. Theta和Alpha頻帶交界異常（常見於路易體失智症）
    let thetaAlphaRatio = 0;
    channelCount = 0;
    
    selectedChannels.forEach(channel => {
      if (features.frequencyBands && features.frequencyBands[channel]) {
        const theta = features.frequencyBands[channel].theta;
        const alpha = features.frequencyBands[channel].alpha;
        
        if (alpha > 0) {
          const ratio = theta / alpha;
          thetaAlphaRatio += ratio;
          channelCount++;
        }
      }
    });
    
    if (channelCount > 0) {
      thetaAlphaRatio /= channelCount;
      if (thetaAlphaRatio > 1.2 && thetaAlphaRatio < 1.8) {
        score += 0.25;
        markers.push({ 
          name: "Theta/Alpha比率特殊模式", 
          value: thetaAlphaRatio.toFixed(2),
          description: "Theta和Alpha頻帶間的特殊比例，常見於路易體失智症" 
        });
      }
    }
    
    // 3. 顯著的前額-枕部不同步性（路易體失智症特徵）
    if (features.phaseCoherence.frontoTemporal !== undefined) {
      const coherence = features.phaseCoherence.frontoTemporal;
      if (coherence < 0.25) {
        score += 0.25;
        markers.push({ 
          name: "前顳連接性嚴重降低", 
          value: coherence.toFixed(2),
          description: "前額葉與顳葉區連接性顯著降低，常見於路易體失智症" 
        });
      } else if (coherence < 0.35) {
        score += 0.15;
        markers.push({ 
          name: "前顳連接性輕度降低", 
          value: coherence.toFixed(2),
          description: "前額葉與顳葉區連接性略有降低" 
        });
      }
    }
    
    // 4. Alpha波主頻率不穩定性
    const alphaPeakFreqs = [];
    Object.keys(features.alphaSlowing).forEach(channel => {
      alphaPeakFreqs.push(features.alphaSlowing[channel]);
    });
    
    if (alphaPeakFreqs.length > 1) {
      // 計算標準差，評估不穩定性
      const mean = alphaPeakFreqs.reduce((a, b) => a + b, 0) / alphaPeakFreqs.length;
      const variance = alphaPeakFreqs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / alphaPeakFreqs.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev > 0.8) {
        score += 0.2;
        markers.push({ 
          name: "Alpha頻率不穩定", 
          value: stdDev.toFixed(2),
          description: "不同腦區Alpha主頻率變化大，表明神經振盪不穩定" 
        });
      } else if (stdDev > 0.5) {
        score += 0.1;
        markers.push({ 
          name: "Alpha頻率輕微不穩定", 
          value: stdDev.toFixed(2),
          description: "不同腦區Alpha主頻率有一定變化" 
        });
      }
    }
    
    // 添加一點隨機變化，模擬臨床變異性
    score += (Math.random() * 0.1) - 0.05;
    
    // 確保分數在0-1範圍內
    score = Math.max(0, Math.min(1, score));
    
    // 解釋
    let interpretation = "";
    if (score > 0.7) {
      interpretation = "檢測到多項與路易體失智症相關的腦電波特徵，建議進一步臨床評估";
    } else if (score > 0.4) {
      interpretation = "檢測到部分與路易體失智症相關的腦電波特徵，可能需要後續觀察";
    } else {
      interpretation = "未檢測到明顯的路易體失智症相關腦電波特徵";
    }
    
    return {
      score: score,
      markers: markers,
      interpretation: interpretation
    };
  };
  
  return (
    <div className="realtime-analyzer">
      <div className="control-panel" style={{ marginBottom: '20px' }}>
        <h3>實時 EEG 模擬控制</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', margin: '10px 0' }}>
          <div>
            <label htmlFor="speed">更新頻率 (ms): </label>
            <input
              id="speed"
              type="number"
              min="10"
              max="1000"
              step="10"
              value={simulationSpeed}
              onChange={handleSpeedChange}
              disabled={isRunning}
            />
          </div>
          <div>
            <label htmlFor="buffer">緩衝大小 (點): </label>
            <input
              id="buffer"
              type="number"
              min="100"
              max="1000"
              step="100"
              value={bufferSize}
              onChange={handleBufferChange}
            />
          </div>
          <button 
            className="primary" 
            onClick={toggleSimulation}
          >
            {isRunning ? '停止模擬' : '開始模擬'}
          </button>
        </div>
      </div>

      {/* 通道選擇器 */}
      <div className="channel-selector card" style={{ marginBottom: '20px', padding: '15px' }}>
        <h3>選擇要顯示的通道</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
          {allChannels.map(channel => (
            <label key={channel} className="channel-checkbox">
              <input
                type="checkbox"
                checked={selectedChannels.includes(channel)}
                onChange={() => toggleChannel(channel)}
              />
              <span style={{ color: channelColors[channel], fontWeight: 'bold' }}>{channel}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 標籤頁切換 */}
      <div className="tabs">
        <div className="tab-buttons">
          <button
            className={activeTab === 'waveform' ? 'active' : ''}
            onClick={() => handleTabChange('waveform')}
          >
            波形分析
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
      </div>
      
      {/* 整合分析控制面板 */}
      <div className="integrated-analysis-panel card" style={{ marginBottom: '20px', padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>整合症狀分析</h3>
          <label className="switch">
            <input
              type="checkbox"
              checked={integratedMode}
              onChange={() => setIntegratedMode(!integratedMode)}
            />
            <span className="slider round"></span>
            <span style={{ marginLeft: '10px' }}>{integratedMode ? '啟用' : '停用'}</span>
          </label>
        </div>
        
        {integratedMode && (
          <div style={{ marginTop: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <button 
                className={`toggle-button ${autoAnalysis ? 'active' : ''}`}
                onClick={() => setAutoAnalysis(!autoAnalysis)}
                disabled={!isRunning}
              >
                {autoAnalysis ? '停止自動分析' : '開始自動分析'}
              </button>
              
              <div style={{ marginLeft: '15px', display: 'flex', alignItems: 'center' }}>
                <label htmlFor="analysis-interval">分析間隔 (秒): </label>
                <input
                  id="analysis-interval"
                  type="number"
                  min="1"
                  max="30"
                  value={analysisInterval}
                  onChange={(e) => setAnalysisInterval(parseInt(e.target.value))}
                  disabled={autoAnalysis}
                  style={{ width: '60px', marginLeft: '5px' }}
                />
              </div>
              
              <button 
                className="primary"
                onClick={handleIntegratedAnalysis}
                style={{ marginLeft: '15px' }}
                disabled={!isRunning || !simulationData.time.length}
              >
                立即分析
              </button>
              
              <div style={{ marginLeft: '20px', display: 'flex', alignItems: 'center' }}>
                <label className="switch" style={{ marginRight: '10px' }}>
                  <input
                    type="checkbox"
                    checked={showAiAnalysis}
                    onChange={() => setShowAiAnalysis(!showAiAnalysis)}
                  />
                  <span className="slider round"></span>
                </label>
                <span style={{ fontSize: '0.9em' }}>
                  {showAiAnalysis ? 'AI腦波症狀分析已啟用' : 'AI腦波症狀分析已停用'}
                </span>
              </div>
            </div>
            
            <p style={{ margin: '5px 0 0', fontSize: '0.9em', color: '#666' }}>
              {autoAnalysis
                ? `自動分析已啟用，每 ${analysisInterval} 秒更新一次`
                : '點擊"立即分析"手動執行整合分析，或啟用自動分析'}
              {showAiAnalysis && ' (包含AI腦波症狀分析)'}
            </p>
          </div>
        )}
      </div>

      {/* 振幅異常閾值設置 */}
      {activeTab === 'waveform' && (
        <div className="thresholds-card card" style={{ marginBottom: '20px', padding: '15px' }}>
          <h3>異常檢測閾值</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', margin: '10px 0' }}>
            <div>
              <h4>振幅閾值 (μV)</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div>
                  <label htmlFor="amplitude-min">最小值: </label>
                  <input
                    id="amplitude-min"
                    name="amplitude-min"
                    type="number"
                    step="0.5"
                    value={anomalyThresholds.amplitude.min}
                    onChange={handleThresholdChange}
                    style={{ width: '60px' }}
                  />
                </div>
                <div>
                  <label htmlFor="amplitude-max">最大值: </label>
                  <input
                    id="amplitude-max"
                    name="amplitude-max"
                    type="number"
                    step="0.5"
                    value={anomalyThresholds.amplitude.max}
                    onChange={handleThresholdChange}
                    style={{ width: '60px' }}
                  />
                </div>
              </div>
            </div>
            <div>
              <h4>頻率閾值 (Hz)</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div>
                  <label htmlFor="frequency-min">最小值: </label>
                  <input
                    id="frequency-min"
                    name="frequency-min"
                    type="number"
                    step="0.5"
                    value={anomalyThresholds.frequency.min}
                    onChange={handleThresholdChange}
                    style={{ width: '60px' }}
                  />
                </div>
                <div>
                  <label htmlFor="frequency-max">最大值: </label>
                  <input
                    id="frequency-max"
                    name="frequency-max"
                    type="number"
                    step="0.5"
                    value={anomalyThresholds.frequency.max}
                    onChange={handleThresholdChange}
                    style={{ width: '60px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 異常通知訊息框 */}
      {activeTab === 'waveform' && showAlerts && (
        <div className="alerts-container card" style={{ marginBottom: '20px', padding: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>異常檢測通知</h3>
            <button 
              onClick={() => setShowAlerts(!showAlerts)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#777' }}
            >
              隱藏
            </button>
          </div>
          {anomalyAlerts.length === 0 ? (
            <p>尚未檢測到異常。</p>
          ) : (
            <div className="alerts-list" style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {anomalyAlerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`alert-item ${alert.severity}`}
                  style={{ 
                    padding: '8px 12px', 
                    marginBottom: '6px', 
                    borderRadius: '4px',
                    backgroundColor: alert.severity === 'critical' ? '#ffebee' : 
                                    alert.severity === 'info' ? '#e3f2fd' : '#fff9e6',
                    borderLeft: `4px solid ${alert.severity === 'critical' ? '#f44336' : 
                                           alert.severity === 'info' ? '#2196F3' : '#ffcc00'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{alert.message}</span>
                    <span style={{ fontSize: '0.8em', color: '#666' }}>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 根據選擇的標籤頁顯示不同內容 */}
      {activeTab === 'waveform' ? (
        <>
          {simulationData.time.length > 0 && (
            <div className="visualization-container">
              <h3>實時 EEG 波形</h3>
              <Plot
                data={selectedChannels.map(channel => ({
                  x: simulationData.time,
                  y: simulationData.data[channel],
                  type: 'scatter',
                  mode: 'lines',
                  name: channel,
                  line: { color: channelColors[channel] }
                }))}
                layout={{
                  autosize: true,
                  height: 300,
                  margin: { l: 50, r: 50, b: 50, t: 20, pad: 4 },
                  xaxis: {
                    title: '時間 (秒)',
                  },
                  yaxis: {
                    title: '振幅 (μV)',
                    range: [anomalyThresholds.amplitude.min - 0.5, anomalyThresholds.amplitude.max + 0.5]
                  },
                  legend: {
                    x: 0,
                    y: 1
                  },
                  shapes: [
                    // Add threshold lines
                    {
                      type: 'line',
                      x0: simulationData.time[0],
                      x1: simulationData.time[simulationData.time.length - 1],
                      y0: anomalyThresholds.amplitude.max,
                      y1: anomalyThresholds.amplitude.max,
                      line: {
                        color: 'red',
                        width: 1,
                        dash: 'dash'
                      }
                    },
                    {
                      type: 'line',
                      x0: simulationData.time[0],
                      x1: simulationData.time[simulationData.time.length - 1],
                      y0: anomalyThresholds.amplitude.min,
                      y1: anomalyThresholds.amplitude.min,
                      line: {
                        color: 'red',
                        width: 1,
                        dash: 'dash'
                      }
                    }
                  ]
                }}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
                config={{
                  responsive: true
                }}
              />
            </div>
          )}

          {freqData && freqData.length > 0 && (
            <div className="visualization-container">
              <h3>頻率分析</h3>
              <Plot
                data={freqData}
                layout={{
                  autosize: true,
                  height: 300,
                  margin: { l: 50, r: 50, b: 50, t: 20, pad: 4 },
                  xaxis: {
                    title: '頻率 (Hz)',
                    range: [0, 50]
                  },
                  yaxis: {
                    title: '振幅',
                    type: 'log'
                  },
                  legend: {
                    x: 0,
                    y: 1
                  },
                  shapes: [
                    // Add threshold frequency lines
                    {
                      type: 'rect',
                      x0: 0.5,
                      x1: 4,
                      y0: 0,
                      y1: 1,
                      yref: 'paper',
                      fillcolor: '#e1f5fe',
                      opacity: 0.3,
                      line: { width: 0 },
                      layer: 'below'
                    },
                    {
                      type: 'rect',
                      x0: 4,
                      x1: 8,
                      y0: 0,
                      y1: 1,
                      yref: 'paper',
                      fillcolor: '#fff9c4',
                      opacity: 0.3,
                      line: { width: 0 },
                      layer: 'below'
                    },
                    {
                      type: 'rect',
                      x0: 8,
                      x1: 13,
                      y0: 0,
                      y1: 1,
                      yref: 'paper',
                      fillcolor: '#c8e6c9',
                      opacity: 0.3,
                      line: { width: 0 },
                      layer: 'below'
                    },
                    {
                      type: 'rect',
                      x0: 13,
                      x1: 30,
                      y0: 0,
                      y1: 1,
                      yref: 'paper',
                      fillcolor: '#f8bbd0',
                      opacity: 0.3,
                      line: { width: 0 },
                      layer: 'below'
                    },
                    {
                      type: 'rect',
                      x0: 30,
                      x1: 45,
                      y0: 0,
                      y1: 1,
                      yref: 'paper',
                      fillcolor: '#d1c4e9',
                      opacity: 0.3,
                      line: { width: 0 },
                      layer: 'below'
                    }
                  ],
                  annotations: [
                    {
                      x: 2,
                      y: 1,
                      yref: 'paper',
                      text: 'δ',
                      showarrow: false,
                      font: { size: 16 }
                    },
                    {
                      x: 6,
                      y: 1,
                      yref: 'paper',
                      text: 'θ',
                      showarrow: false,
                      font: { size: 16 }
                    },
                    {
                      x: 10.5,
                      y: 1,
                      yref: 'paper',
                      text: 'α',
                      showarrow: false,
                      font: { size: 16 }
                    },
                    {
                      x: 20,
                      y: 1,
                      yref: 'paper',
                      text: 'β',
                      showarrow: false,
                      font: { size: 16 }
                    },
                    {
                      x: 38,
                      y: 1,
                      yref: 'paper',
                      text: 'γ',
                      showarrow: false,
                      font: { size: 16 }
                    }
                  ]
                }}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
                config={{
                  responsive: true
                }}
              />
            </div>
          )}

          {statistics && (
            <div className="stats-container">
              <h3>統計資料 (實時更新)</h3>
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
                  {Object.entries(statistics).map(([channel, stats]) => (
                    <tr key={channel}>
                      <td style={{ color: channelColors[channel], fontWeight: 'bold' }}>{channel}</td>
                      <td>{stats.mean.toFixed(4)}</td>
                      <td>{stats.stdDev.toFixed(4)}</td>
                      <td>{stats.min.toFixed(4)}</td>
                      <td>{stats.max.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : activeTab === 'depression' ? (
        <div className="analyzer-container">
          <DepressionAnalyzer 
            realtimeMode={true} 
            realtimeData={simulationData.time.length > 0 ? simulationData : null} 
            selectedChannels={selectedChannels}
          />
        </div>
      ) : (
        <div className="analyzer-container">
          <EpilepsyAnalyzer 
            realtimeMode={true} 
            realtimeData={simulationData.time.length > 0 ? simulationData : null} 
            selectedChannels={selectedChannels}
          />
        </div>
      )}
      
      {/* 整合分析結果顯示區 */}
      {integratedMode && (
        <div className="integrated-results card" style={{ padding: '20px', marginTop: '30px' }}>
          <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>通道波型整合分析結果</h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '15px' }}>
            {/* 憂鬱症分析結果 */}
            <div className="analysis-result-card" style={{ flex: '1 1 300px', backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
              <h4 style={{ color: '#3f51b5', marginTop: 0 }}>憂鬱症特徵分析</h4>
              
              {depressionResults ? (
                <div>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>前額Alpha不對稱性: </span>
                    <span>{depressionResults.alphaAsymmetry.toFixed(4)}</span>
                    <span style={{ 
                      marginLeft: '10px', 
                      padding: '2px 6px', 
                      backgroundColor: depressionResults.alphaAsymmetry > 0.15 ? '#ffcdd2' : '#c8e6c9',
                      borderRadius: '4px',
                      fontSize: '0.9em'
                    }}>
                      {depressionResults.alphaAsymmetry > 0.15 ? '可能風險' : '正常範圍'}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>Alpha/Theta比值: </span>
                    <span>{depressionResults.alphaThetaRatio.toFixed(4)}</span>
                    <span style={{ 
                      marginLeft: '10px', 
                      padding: '2px 6px', 
                      backgroundColor: depressionResults.alphaThetaRatio < 0.8 ? '#ffcdd2' : '#c8e6c9',
                      borderRadius: '4px',
                      fontSize: '0.9em'
                    }}>
                      {depressionResults.alphaThetaRatio < 0.8 ? '可能風險' : '正常範圍'}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.85em', color: '#666', marginTop: '15px', textAlign: 'right' }}>
                    分析時間: {depressionResults.timestamp}
                  </div>
                </div>
              ) : (
                <p>尚未執行分析。點擊"立即分析"按鈕來開始。</p>
              )}
            </div>
            
            {/* 癲癇分析結果 */}
            <div className="analysis-result-card" style={{ flex: '1 1 300px', backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
              <h4 style={{ color: '#e91e63', marginTop: 0 }}>癲癇特徵分析</h4>
              
              {epilepsyResults ? (
                <div>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>尖峰/棘波檢測: </span>
                    <span style={{ 
                      padding: '2px 6px', 
                      backgroundColor: epilepsyResults.spikeDetected ? '#ffcdd2' : '#c8e6c9',
                      borderRadius: '4px'
                    }}>
                      {epilepsyResults.spikeDetected ? '檢測到異常波形' : '未檢測到異常波形'}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>通道間相干性: </span>
                    <span style={{ 
                      padding: '2px 6px', 
                      backgroundColor: epilepsyResults.abnormalCoherence ? '#ffcdd2' : '#c8e6c9',
                      borderRadius: '4px'
                    }}>
                      {epilepsyResults.abnormalCoherence ? '異常' : '正常'}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>主要頻率: </span>
                    <span>{epilepsyResults.dominantFrequency} Hz</span>
                    <span style={{ 
                      marginLeft: '10px', 
                      padding: '2px 6px', 
                      backgroundColor: epilepsyResults.dominantFrequency > 25 || epilepsyResults.dominantFrequency < 3 ? '#ffcdd2' : '#c8e6c9',
                      borderRadius: '4px',
                      fontSize: '0.9em'
                    }}>
                      {epilepsyResults.dominantFrequency > 25 || epilepsyResults.dominantFrequency < 3 ? '異常範圍' : '正常範圍'}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.85em', color: '#666', marginTop: '15px', textAlign: 'right' }}>
                    分析時間: {epilepsyResults.timestamp}
                  </div>
                </div>
              ) : (
                <p>尚未執行分析。點擊"立即分析"按鈕來開始。</p>
              )}
            </div>
          </div>
          
          {/* AI 分析結果區域 */}
          {showAiAnalysis && (
            <div className="ai-analysis-results" style={{ marginTop: '30px' }}>
              <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#673ab7' }}>
                AI 腦波症狀分析
                {aiConfidenceLevel && (
                  <span style={{ 
                    fontSize: '0.8em', 
                    fontWeight: 'normal', 
                    marginLeft: '15px',
                    padding: '3px 8px',
                    backgroundColor: '#f3e5f5',
                    borderRadius: '12px'
                  }}>
                    模型置信度: {(aiConfidenceLevel.overall * 100).toFixed(1)}%
                  </span>
                )}
              </h3>
              
              {aiAnalysisResult ? (
                <div>
                  <div className="ai-results-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '15px',
                    marginTop: '15px' 
                  }}>
                    {aiAnalysisResult.map((condition, index) => {
                      // 獲取對應的置信度
                      const confidenceValue = aiConfidenceLevel?.conditions?.[index]?.confidence || 0.6;
                      
                      // 為分數選擇顏色
                      const getScoreColor = (score) => {
                        if (condition.condition === '認知功能狀態' || condition.condition === '清醒度評估') {
                          // 這些是正向指標，高分為好
                          if (score > 0.7) return '#4caf50';
                          if (score > 0.4) return '#ff9800';
                          return '#f44336';
                        } else {
                          // 這些是風險指標，低分為好
                          if (score > 0.8) return '#f44336';
                          if (score > 0.6) return '#ff9800';
                          return '#4caf50';
                        }
                      };
                      
                      return (
                        <div key={index} className="condition-card" style={{ 
                          backgroundColor: '#f5f5f5', 
                          borderRadius: '8px',
                          padding: '15px',
                          borderLeft: `4px solid ${getScoreColor(condition.score)}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h4 style={{ margin: 0 }}>{condition.condition}</h4>
                            <span style={{ 
                              padding: '2px 8px', 
                              backgroundColor: '#eeeeee',
                              borderRadius: '12px',
                              fontSize: '0.8em',
                              color: '#555'
                            }}>
                              置信度: {(confidenceValue * 100).toFixed(0)}%
                            </span>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                              <span style={{ fontSize: '0.9em', marginRight: '10px' }}>評分:</span>
                              <div style={{ flex: 1, height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
                                <div style={{ 
                                  width: `${condition.score * 100}%`, 
                                  height: '100%', 
                                  backgroundColor: getScoreColor(condition.score),
                                  borderRadius: '4px'
                                }}></div>
                              </div>
                              <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>{(condition.score * 10).toFixed(1)}</span>
                            </div>
                          </div>
                          
                          <div style={{ 
                            backgroundColor: '#ffffff',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            fontSize: '0.9em'
                          }}>
                            {condition.details}
                          </div>
                          
                          <div style={{ 
                            marginTop: '10px',
                            display: 'inline-block',
                            padding: '3px 8px',
                            backgroundColor: condition.severity === '高度' ? '#ffebee' : 
                                           condition.severity === '中度' ? '#fff8e1' : '#e8f5e9',
                            borderRadius: '4px',
                            fontSize: '0.85em',
                            color: condition.severity === '高度' ? '#c62828' :
                                   condition.severity === '中度' ? '#ef6c00' : '#2e7d32'
                          }}>
                            {condition.severity}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8eaf6', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#3f51b5' }}>AI 綜合評估</h4>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>
                      {aiAnalysisResult.some(c => c.score > 0.8 && c.condition !== '認知功能狀態' && c.condition !== '清醒度評估') 
                        ? '⚠️ AI 分析檢測到腦電波中存在顯著異常模式，建議進一步專業評估。'
                        : aiAnalysisResult.some(c => c.score > 0.6 && c.condition !== '認知功能狀態' && c.condition !== '清醒度評估')
                          ? '⚠️ AI 分析檢測到腦電波中存在潛在異常模式，可能需要後續觀察。'
                          : '✓ AI 分析未檢測到明顯異常腦電波模式。'}
                    </p>
                    <p style={{ margin: '10px 0 0 0', lineHeight: '1.5' }}>
                      {aiAnalysisResult.find(c => c.condition === '認知功能狀態')?.details &&
                        `認知功能評估: ${aiAnalysisResult.find(c => c.condition === '認知功能狀態')?.details}`}
                    </p>
                    <p style={{ margin: '10px 0 0 0', lineHeight: '1.5' }}>
                      {aiAnalysisResult.find(c => c.condition === '清醒度評估')?.details &&
                        `清醒度評估: ${aiAnalysisResult.find(c => c.condition === '清醒度評估')?.details}`}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  padding: '30px', 
                  textAlign: 'center', 
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  marginTop: '15px'
                }}>
                  <p>尚未執行AI分析。請點擊"立即分析"按鈕開始處理。</p>
                </div>
              )}
              
              <div style={{ 
                marginTop: '15px', 
                padding: '10px', 
                backgroundColor: '#e3f2fd', 
                borderRadius: '4px', 
                fontSize: '0.85em',
                color: '#0d47a1'
              }}>
                <strong>關於AI分析:</strong> 此功能使用機器學習模型分析腦電波特徵，識別潛在的神經生理學模式。
                結果僅供參考，不構成醫療診斷。準確性受多種因素影響，包括訊號品質、個體差異等。
              </div>
            </div>
          )}
          
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>綜合評估</h4>
            {(depressionResults && epilepsyResults) ? (
              <div>
                <p style={{ margin: 0 }}>
                  {depressionResults.alphaAsymmetry > 0.15 || depressionResults.alphaThetaRatio < 0.8 ? 
                    '⚠️ 檢測到與憂鬱症相關的腦電波特徵模式。' : 
                    '✓ 未檢測到與憂鬱症相關的腦電波特徵。'}
                </p>
                <p style={{ margin: '10px 0 0 0' }}>
                  {epilepsyResults.spikeDetected || epilepsyResults.abnormalCoherence ? 
                    '⚠️ 檢測到與癲癇相關的腦電波異常。建議進一步評估。' : 
                    '✓ 未檢測到與癲癇相關的腦電波異常。'}
                </p>
              </div>
            ) : (
              <p style={{ margin: 0, fontStyle: 'italic' }}>等待分析數據以提供綜合評估。</p>
            )}
          </div>
          
          <div style={{ marginTop: '20px', fontSize: '0.8em', color: '#777', fontStyle: 'italic' }}>
            註: 此分析僅為示範用途，實際醫療診斷需由專業醫師評估。
          </div>
        </div>
      )}
    </div>
  );
}

export default RealtimeAnalyzer; 