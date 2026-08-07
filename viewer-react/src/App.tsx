import { useCallback, useEffect, useState } from 'react';
import './index.css';
import SettingsPanel from './components/SettingsPanel';
import MapContainer from './components/MapContainer';
import ResultsPanel from './components/ResultsPanel';
import Footer from './components/Footer';
import {
  registerRoute,
  getGroundFeatures,
  getConnectionStatus,
  type ConnectionStatus,
  type GroundFeature,
} from './api/client';

// partial = 航路登録は成功したが地物照会が失敗した状態。
// これを success に含めると「0件」と「照会失敗」が見分けられなくなる。
export interface QueryResult {
  status: 'idle' | 'loading' | 'success' | 'partial' | 'error';
  routeId?: string;
  features?: GroundFeature[];
  // 航路AGLの150m高度制限判定（viewer/src/altitude.pyをBFF経由で適用）。
  routeJudgment?: string;
  timestamp?: string;
  message?: string;
}

function App() {
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [startLat, setStartLat] = useState(35.9683357);
  const [startLon, setStartLon] = useState(139.0313939);
  const [endLat, setEndLat] = useState(35.9699357);
  const [endLon, setEndLon] = useState(139.0333939);
  const [aglM, setAglM] = useState(100.0);
  const [showRoute, setShowRoute] = useState(true);
  const [queryResult, setQueryResult] = useState<QueryResult>({ status: 'idle' });
  const [isLoading, setIsLoading] = useState(false);

  const refreshConnection = useCallback(async () => {
    setConnection(await getConnectionStatus());
  }, []);

  // 起動時に接続状態を確認する。これが無いと、登録と照会の両方が成功するまで
  // 画面は Disconnected のままになり、接続の問題か入力の問題か切り分けられない。
  useEffect(() => {
    void refreshConnection();
  }, [refreshConnection]);

  const handleQuery = async () => {
    setIsLoading(true);
    setQueryResult({ status: 'loading' });

    try {
      let routeId: string;
      try {
        const route = await registerRoute(startLat, startLon, endLat, endLon, aglM);
        if (!route) {
          setQueryResult({ status: 'error', message: 'BFF が航路データを返しませんでした' });
          return;
        }
        routeId = route.id;
      } catch (error) {
        setQueryResult({
          status: 'error',
          message: error instanceof Error ? error.message : '航路登録に失敗しました',
        });
        return;
      }

      // 航路はすでに登録済み。ここで失敗しても登録自体は取り消されないので、
      // 「登録は成功・照会は失敗」を partial として区別して表示する。
      try {
        const { features, routeJudgment } = await getGroundFeatures(
          startLat,
          startLon,
          endLat,
          endLon,
          aglM
        );
        setQueryResult({
          status: 'success',
          routeId,
          features,
          routeJudgment,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        setQueryResult({
          status: 'partial',
          routeId,
          timestamp: new Date().toISOString(),
          message: `航路は登録できましたが、地物照会に失敗しました: ${
            error instanceof Error ? error.message : '不明なエラー'
          }`,
        });
      }
    } finally {
      setIsLoading(false);
      void refreshConnection();
    }
  };

  // 航路が登録できていれば（partial でも）地図には描画する。
  const routeRegistered =
    queryResult.status === 'success' || queryResult.status === 'partial';

  return (
    <div className="flex flex-col h-screen bg-bg-app">
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left settings panel */}
        <SettingsPanel
          connection={connection}
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
          showRoute={showRoute}
          setShowRoute={setShowRoute}
          onQuery={handleQuery}
          isLoading={isLoading}
        />

        {/* Map area */}
        <div className="flex-1 flex flex-col">
          <MapContainer
            routeData={
              routeRegistered ? { startLat, startLon, endLat, endLon } : null
            }
            showRoute={showRoute}
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
