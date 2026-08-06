import { useState } from 'react';
import './index.css';
import SettingsPanel from './components/SettingsPanel';
import MapContainer from './components/MapContainer';
import ResultsPanel from './components/ResultsPanel';
import Footer from './components/Footer';
import { registerRoute, getGroundFeatures } from './api/client';

interface QueryResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  routeId?: string;
  features?: any[];
  timestamp?: string;
  message?: string;
}

function App() {
  const [apiConnected, setApiConnected] = useState(false);
  const [startLat, setStartLat] = useState(35.9683357);
  const [startLon, setStartLon] = useState(139.0313939);
  const [endLat, setEndLat] = useState(35.9699357);
  const [endLon, setEndLon] = useState(139.0333939);
  const [aglM, setAglM] = useState(100.0);
  const [queryResult, setQueryResult] = useState<QueryResult>({ status: 'idle' });
  const [isLoading, setIsLoading] = useState(false);

  const handleQuery = async () => {
    setIsLoading(true);
    setQueryResult({ status: 'loading' });

    try {
      const route = await registerRoute(startLat, startLon, endLat, endLon, aglM);
      if (!route) {
        setQueryResult({
          status: 'error',
          message: 'Failed to register route',
        });
        return;
      }

      const features = await getGroundFeatures(startLat, startLon);

      setQueryResult({
        status: 'success',
        routeId: route.id,
        features,
        timestamp: new Date().toISOString(),
      });
      setApiConnected(true);
    } catch (error) {
      setQueryResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      setApiConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

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
          onQuery={handleQuery}
          isLoading={isLoading}
        />

        {/* Map area */}
        <div className="flex-1 flex flex-col">
          <MapContainer
            routeData={
              queryResult.status === 'success'
                ? {
                    startLat,
                    startLon,
                    endLat,
                    endLon,
                  }
                : null
            }
          />

          {/* Bottom results panel */}
          <ResultsPanel queryResult={queryResult} />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
