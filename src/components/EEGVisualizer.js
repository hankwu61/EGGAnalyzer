import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';

function EEGVisualizer({ eegData, selectedChannels, setSelectedChannels }) {
  const [timeWindow, setTimeWindow] = useState({ start: 0, end: 10 }); // Default 10 seconds
  const [plotData, setPlotData] = useState([]);
  const [viewMode, setViewMode] = useState('overlay'); // 'overlay' or 'stacked'
  
  // Define colors for channels for consistency
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

  useEffect(() => {
    if (!eegData || selectedChannels.length === 0) return;

    // Calculate appropriate time window if not set
    if (timeWindow.end === 10 && eegData.length < eegData.samplingRate * 10) {
      // If data is less than 10 seconds, show all
      setTimeWindow({
        start: 0,
        end: eegData.time[eegData.length - 1]
      });
    }

    // Create plot data for each selected channel
    if (viewMode === 'overlay') {
      // Overlay mode - all channels on same plot
      const newPlotData = selectedChannels.map(channel => {
        // Find data within time window
        const startIndex = eegData.time.findIndex(t => t >= timeWindow.start);
        const endIndex = eegData.time.findIndex(t => t > timeWindow.end);
        const finalEndIndex = endIndex === -1 ? eegData.length - 1 : endIndex;
        
        const timeSlice = eegData.time.slice(startIndex, finalEndIndex);
        const dataSlice = eegData.data[channel].slice(startIndex, finalEndIndex);

        return {
          x: timeSlice,
          y: dataSlice,
          type: 'scatter',
          mode: 'lines',
          name: channel,
          line: { color: channelColors[channel] || '#000000' }
        };
      });

      setPlotData(newPlotData);
    } else {
      // Stacked mode - each channel has its own separated plot
      // Calculate offset for visual separation
      const maxValues = selectedChannels.map(channel => {
        const startIndex = eegData.time.findIndex(t => t >= timeWindow.start);
        const endIndex = eegData.time.findIndex(t => t > timeWindow.end);
        const finalEndIndex = endIndex === -1 ? eegData.length - 1 : endIndex;
        
        const dataSlice = eegData.data[channel].slice(startIndex, finalEndIndex);
        return Math.max(...dataSlice.map(Math.abs));
      });
      
      const newPlotData = [];
      
      // Create offset for each channel (for stacked view)
      selectedChannels.forEach((channel, index) => {
        const startIndex = eegData.time.findIndex(t => t >= timeWindow.start);
        const endIndex = eegData.time.findIndex(t => t > timeWindow.end);
        const finalEndIndex = endIndex === -1 ? eegData.length - 1 : endIndex;
        
        const timeSlice = eegData.time.slice(startIndex, finalEndIndex);
        const dataSlice = eegData.data[channel].slice(startIndex, finalEndIndex);
        
        // Create vertical offset based on channel position for stacked view
        const offset = index * 2.5 * Math.max(1, ...maxValues);
        
        newPlotData.push({
          x: timeSlice,
          y: dataSlice.map(val => val + offset),
          type: 'scatter',
          mode: 'lines',
          name: channel,
          line: { color: channelColors[channel] || '#000000' },
          hoverinfo: 'name+y',
          hovertemplate: `${channel}: %{y}<extra></extra>`
        });
      });
      
      setPlotData(newPlotData);
    }
  }, [eegData, selectedChannels, timeWindow, viewMode]);

  const handleChannelSelect = (channel) => {
    if (selectedChannels.includes(channel)) {
      setSelectedChannels(selectedChannels.filter(c => c !== channel));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const toggleAllChannels = () => {
    if (selectedChannels.length === eegData.channels.length) {
      // If all are selected, deselect all but first
      setSelectedChannels([eegData.channels[0]]);
    } else {
      // Otherwise select all
      setSelectedChannels([...eegData.channels]);
    }
  };

  const handleTimeWindowChange = (e) => {
    const { name, value } = e.target;
    setTimeWindow(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  if (!eegData) return null;

  return (
    <div>
      <div className="channel-selector">
        <h3>選擇通道:</h3>
        <div>
          <button 
            onClick={toggleAllChannels} 
            className="channel-toggle-btn"
          >
            {selectedChannels.length === eegData.channels.length ? '取消全選' : '選擇全部'}
          </button>
          
          <div className="channel-checkboxes">
            {eegData.channels.map(channel => (
              <label key={channel} className="channel-checkbox">
                <input
                  type="checkbox"
                  checked={selectedChannels.includes(channel)}
                  onChange={() => handleChannelSelect(channel)}
                />
                <span style={{ color: channelColors[channel] || '#000', fontWeight: 'bold' }}>
                  {channel}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <div className="view-mode-selector">
        <h3>顯示模式:</h3>
        <div className="view-mode-buttons">
          <button 
            className={viewMode === 'overlay' ? 'active' : ''} 
            onClick={() => handleViewModeChange('overlay')}
          >
            疊合顯示
          </button>
          <button 
            className={viewMode === 'stacked' ? 'active' : ''} 
            onClick={() => handleViewModeChange('stacked')}
          >
            堆疊顯示
          </button>
        </div>
      </div>
      
      <div className="time-window-controls">
        <h3>時間窗口 (秒):</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <div>
            <label htmlFor="start">開始: </label>
            <input
              type="number"
              id="start"
              name="start"
              value={timeWindow.start}
              onChange={handleTimeWindowChange}
              min={0}
              max={Math.max(0, eegData.time[eegData.length - 1] - 1)}
              step={1}
            />
          </div>
          <div>
            <label htmlFor="end">結束: </label>
            <input
              type="number"
              id="end"
              name="end"
              value={timeWindow.end}
              onChange={handleTimeWindowChange}
              min={timeWindow.start + 1}
              max={eegData.time[eegData.length - 1]}
              step={1}
            />
          </div>
        </div>
      </div>

      {selectedChannels.length > 0 ? (
        <div className="visualization-container">
          <Plot
            data={plotData}
            layout={{
              title: 'EEG 波形視覺化',
              xaxis: {
                title: '時間 (秒)',
                range: [timeWindow.start, timeWindow.end]
              },
              yaxis: viewMode === 'overlay' 
                ? { title: '振幅 (μV)', autorange: true }
                : { title: '通道 (堆疊顯示)', showticklabels: false },
              autosize: true,
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
              },
              hovermode: 'closest'
            }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
            config={{
              responsive: true,
              displayModeBar: true,
              scrollZoom: true
            }}
          />
        </div>
      ) : (
        <p>請選擇至少一個通道來視覺化</p>
      )}
    </div>
  );
}

export default EEGVisualizer; 