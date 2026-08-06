import { useState } from 'react';
import './index.css';
import SettingsPanel from './components/SettingsPanel';
import MapContainer from './components/MapContainer';
import ResultsPanel from './components/ResultsPanel';
import Footer from './components/Footer';

function App() {
  const [apiConnected] = useState(false);
  const [startLat, setStartLat] = useState(35.9683357);
  const [startLon, setStartLon] = useState(139.0313939);
  const [endLat, setEndLat] = useState(35.9699357);
  const [endLon, setEndLon] = useState(139.0333939);
  const [aglM, setAglM] = useState(100.0);

  return (
    <div className="flex flex-col h-screen bg-bg-app">
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left settings panel */}
        <SettingsPanel
          apiConnected={apiConnected}
          startLat={startLat}
          setStartLat={setStartLat}
          startLon={startLon}
          setStartLon={setStartLon}
          endLat={endLat}
          setEndLat={setEndLat}
          endLon={endLon}
          setEndLon={setEndLon}
          aglM={aglM}
          setAglM={setAglM}
        />

        {/* Map area */}
        <div className="flex-1 flex flex-col">
          <MapContainer />

          {/* Bottom results panel */}
          <ResultsPanel />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
