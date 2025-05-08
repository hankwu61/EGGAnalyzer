import React, { useState } from 'react';
import Papa from 'papaparse';

function EEGUploader({ onDataUpload }) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsLoading(true);
    setError('');

    // Check file type
    if (!file.name.endsWith('.csv')) {
      setError('請上傳 CSV 格式檔案');
      setIsLoading(false);
      return;
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('解析 CSV 檔案錯誤: ' + results.errors[0].message);
          setIsLoading(false);
          return;
        }

        try {
          const parsedData = processEEGData(results.data);
          onDataUpload(parsedData);
          setIsLoading(false);
        } catch (err) {
          setError(err.message);
          setIsLoading(false);
        }
      },
      error: (error) => {
        setError('讀取檔案錯誤: ' + error.message);
        setIsLoading(false);
      }
    });
  };

  const processEEGData = (rawData) => {
    if (rawData.length === 0) {
      throw new Error('檔案中沒有資料');
    }

    // Get column names, assuming first column is time
    const columns = Object.keys(rawData[0]);
    if (columns.length < 2) {
      throw new Error('CSV 必須至少包含2個欄位：時間和至少一個 EEG 通道');
    }

    const timeColumn = columns[0];
    const channelColumns = columns.slice(1);

    // Check if we have more than 8 channels
    if (channelColumns.length > 8) {
      console.warn(`檔案包含 ${channelColumns.length} 個通道，但只會處理前 8 個通道。`);
    }

    // Only use the first 8 channels or fewer if less are available
    const usedChannels = channelColumns.slice(0, 8);

    // Extract time and channel data
    const timeData = rawData.map(row => row[timeColumn]);
    
    // Initialize channel data structure
    const channelData = {};
    usedChannels.forEach(channel => {
      channelData[channel] = rawData.map(row => row[channel]);
    });

    // Validate data
    if (timeData.some(val => val === null || val === undefined || isNaN(val))) {
      throw new Error('時間欄位包含無效值');
    }

    for (const channel of usedChannels) {
      if (channelData[channel].some(val => val === null || val === undefined || isNaN(val))) {
        throw new Error(`通道 ${channel} 包含無效值`);
      }
    }

    // Calculate sampling rate based on first few samples
    let samplingRate = 0;
    if (timeData.length > 1) {
      // Try to detect if time is in seconds or milliseconds
      const timeUnit = timeData[1] - timeData[0] < 0.1 ? 'milliseconds' : 'seconds';
      const timeConversionFactor = timeUnit === 'milliseconds' ? 1000 : 1;
      
      // Calculate sampling rate from first 10 samples or as many as available
      const sampleSize = Math.min(10, timeData.length - 1);
      let totalDiff = 0;
      for (let i = 0; i < sampleSize; i++) {
        totalDiff += (timeData[i+1] - timeData[i]);
      }
      const avgDiff = totalDiff / sampleSize;
      samplingRate = Math.round(1 / (avgDiff / timeConversionFactor));
    }

    return {
      time: timeData,
      channels: usedChannels,
      data: channelData,
      samplingRate: samplingRate,
      length: timeData.length
    };
  };

  return (
    <div className="file-uploader">
      <p className="upload-instructions">
        上傳 EEG 資料 CSV 檔案。第一欄應為時間（秒或毫秒），之後的欄位代表各 EEG 通道。
        系統最多支援 8 個通道。
      </p>
      
      <div style={{ margin: '10px 0' }}>
        <a href="/sample-eeg-data.csv" download className="sample-link">
          下載範例 EEG 資料（8 通道）
        </a>
      </div>
      
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload} 
        disabled={isLoading}
      />
      
      {isLoading && <p>載入資料中...</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default EEGUploader; 