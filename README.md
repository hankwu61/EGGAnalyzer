# EEG Waveform Analyzer

A web application for analyzing EEG waveform data. This tool allows users to upload EEG data files, visualize the waveforms, and perform basic analysis.

## Features

- Upload EEG data files (CSV format)
- Visualize EEG waveforms
- **Support for up to 8 EEG channels**
- **Multiple visualization modes (overlay and stacked)**
- Perform frequency analysis (FFT)
- Filter and process EEG signals
- Export analyzed data
- **Real-time EEG signal simulation and analysis**
- **Anomaly detection and alert notifications**

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Format

The application accepts CSV files with the following format:
- First column: Time (in seconds or milliseconds)
- Subsequent columns: EEG channel data (up to 8 channels)

## Sample Data

A sample EEG data file is included in the application. To use it:

1. Start the application
2. Download the sample file from [http://localhost:3000/sample-eeg-data.csv](http://localhost:3000/sample-eeg-data.csv)
3. Upload it using the file uploader

The sample contains simulated EEG data with eight channels over a 1-second period at 100Hz sampling rate.

## Visualization Options

The application provides two visualization modes:
1. **Overlay Mode**: All channels displayed on the same axis, distinguished by color
2. **Stacked Mode**: Channels vertically separated for clearer viewing

Additional visualization features:
- Toggle individual channels on/off
- Select/deselect all channels at once
- Adjust time window to focus on specific segments
- Color-coded channels for easy identification

## Real-time Analysis

The application includes a real-time EEG simulation and analysis feature:

1. Switch to the "實時分析" tab
2. Configure the simulation parameters:
   - Update frequency (ms): Controls how frequently new data points are generated
   - Buffer size (points): Controls how many data points are displayed at once
3. Click "開始模擬" to start the simulation
4. View real-time waveforms, frequency analysis, and statistics

The simulation generates synthetic EEG signals with different frequency components for demonstration purposes.

## Anomaly Detection

The real-time analysis feature includes anomaly detection capabilities:

1. Configure anomaly detection thresholds:
   - Amplitude thresholds: Define normal range for signal amplitude
   - Frequency thresholds: Define normal range for dominant frequencies
2. When the signal exceeds these thresholds, alerts will appear in the "異常波型通知" panel
3. Critical anomalies (e.g., signal spikes or flatlines) are highlighted in red
4. Regular threshold violations are shown in yellow
5. Alerts show the timestamp, affected channel, and type of anomaly

The system monitors both amplitude and frequency anomalies in real-time, helping to identify unusual patterns in EEG data.

## Technologies Used

- React
- Plotly.js for visualization
- PapaParse for CSV parsing

## 開發服務器啟動後，打開瀏覽器訪問：http://localhost:3000
應用程式功能說明：
上傳EEG數據文件（CSV格式）
可視化EEG波形
進行頻率分析（FFT）
顯示信號統計數據
您可以使用應用程式提供的示例數據來測試（點擊"Download sample EEG data"下載示例數據），或上傳您自己的EEG數據文件。

我已經成功增加了 AI 腦波症狀分析功能，完整地整合到了實時波型分析系統中。以下是我實現的關鍵功能：
先進的腦波特徵提取
實現了多維度的腦電波特徵提取，包括時域特徵、頻域特徵、通道間不對稱性和信號複雜度等
支持多種頻帶分析（Delta、Theta、Alpha、Beta、Gamma）
計算關鍵的臨床指標，如前額不對稱度、Alpha/Theta 比值等
全面的症狀識別模型
不僅支持憂鬱症和癲癇的檢測，還增加了焦慮症、注意力缺陷的檢測
添加了認知功能和清醒度評估，提供更全面的腦功能狀態分析
每種症狀都基於專業的腦電波特徵模式進行評分和嚴重程度分級
直觀的使用者界面
添加了 AI 分析的開關控制，讓使用者可以選擇是否啟用此高級功能
設計了美觀的結果展示區域，使用色彩編碼和進度條直觀顯示評分
增加了置信度指標，幫助使用者理解分析結果的可靠性
綜合評估報告
提供 AI 綜合評估，自動識別腦電波中的異常模式
結合多種指標給出整體建議
清晰標示分析僅供參考，不構成醫療診斷的免責聲明
無縫整合
與現有的實時分析系統無縫整合
共享相同的數據流和分析觸發機制
在用戶啟用自動分析時同步執行，真正實現即時分析
這些功能使系統能夠在實時監測腦電波的同時，提供更深入、全面的症狀分析，幫助使用者更好地理解腦功能狀態和潛在的健康風險。