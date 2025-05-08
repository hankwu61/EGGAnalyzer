import React, { useState } from 'react';
import Plot from 'react-plotly.js';

function EEGAnalyzer({ eegData, selectedChannels, onAnalysisComplete }) {
  const [analysisType, setAnalysisType] = useState('fft');
  const [isProcessing, setIsProcessing] = useState(false);
  const [spectrogramData, setSpectrogramData] = useState(null);

  // Perform Fast Fourier Transform on the signal
  const performFFT = (signal, samplingRate) => {
    const n = signal.length;
    
    // We'll use a simple DFT implementation for demonstration
    // In a production app, you would use a library like fftjs
    const result = {
      magnitude: new Array(Math.floor(n/2)).fill(0),
      frequency: new Array(Math.floor(n/2)).fill(0)
    };

    // Calculate frequency bin size
    const freqBinSize = samplingRate / n;

    // Simple DFT implementation
    for (let k = 0; k < Math.floor(n/2); k++) {
      let real = 0;
      let imag = 0;
      
      for (let t = 0; t < n; t++) {
        const angle = -2 * Math.PI * k * t / n;
        real += signal[t] * Math.cos(angle);
        imag += signal[t] * Math.sin(angle);
      }
      
      // Calculate magnitude
      result.magnitude[k] = Math.sqrt(real*real + imag*imag) / n;
      // Calculate frequency
      result.frequency[k] = k * freqBinSize;
    }
    
    return result;
  };

  // Calculate basic statistics for a signal
  const calculateStatistics = (signal) => {
    const n = signal.length;
    
    // Calculate mean
    const mean = signal.reduce((acc, val) => acc + val, 0) / n;
    
    // Calculate standard deviation
    let sumSquaredDiffs = 0;
    for (let i = 0; i < n; i++) {
      sumSquaredDiffs += (signal[i] - mean) ** 2;
    }
    const stdDev = Math.sqrt(sumSquaredDiffs / n);
    
    // Find min and max
    const min = Math.min(...signal);
    const max = Math.max(...signal);
    
    return { mean, stdDev, min, max };
  };

  const performAnalysis = () => {
    if (!eegData || selectedChannels.length === 0) return;
    
    setIsProcessing(true);
    
    // Create result objects
    const statistics = {};
    const fftResults = {};
    
    // Process each selected channel
    selectedChannels.forEach(channel => {
      const signal = eegData.data[channel];
      
      // Calculate basic statistics
      statistics[channel] = calculateStatistics(signal);
      
      // Perform FFT
      if (analysisType === 'fft') {
        fftResults[channel] = performFFT(signal, eegData.samplingRate);
      }
    });
    
    // Create spectrogram plot data
    let spectrogramData = null;
    if (analysisType === 'fft') {
      const plotData = selectedChannels.map(channel => {
        const fftResult = fftResults[channel];
        return {
          x: fftResult.frequency, 
          y: fftResult.magnitude,
          type: 'scatter',
          mode: 'lines',
          name: channel
        };
      });
      
      spectrogramData = {
        data: plotData,
        layout: {
          title: 'Frequency Spectrum Analysis',
          xaxis: {
            title: 'Frequency (Hz)',
            range: [0, eegData.samplingRate / 2]  // Nyquist limit
          },
          yaxis: {
            title: 'Magnitude',
            autorange: true
          },
          autosize: true,
          height: 400,
          margin: {
            l: 50,
            r: 50,
            b: 50,
            t: 50,
            pad: 4
          },
          legend: {
            x: 0,
            y: 1
          }
        }
      };
      
      setSpectrogramData(spectrogramData);
    }
    
    // Complete the analysis
    onAnalysisComplete({
      statistics,
      spectrogram: spectrogramData
    });
    
    setIsProcessing(false);
  };

  return (
    <div>
      <div className="analysis-controls">
        <div>
          <h3>Analysis Type:</h3>
          <select 
            value={analysisType} 
            onChange={(e) => setAnalysisType(e.target.value)}
          >
            <option value="fft">Frequency Spectrum (FFT)</option>
            <option value="statistics">Basic Statistics</option>
          </select>
        </div>
        
        <button 
          className="primary" 
          onClick={performAnalysis}
          disabled={isProcessing || selectedChannels.length === 0}
        >
          {isProcessing ? 'Processing...' : 'Analyze Selected Channels'}
        </button>
      </div>
      
      {spectrogramData && (
        <div className="visualization-container">
          <Plot
            data={spectrogramData.data}
            layout={spectrogramData.layout}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
          />
        </div>
      )}
    </div>
  );
}

export default EEGAnalyzer; 