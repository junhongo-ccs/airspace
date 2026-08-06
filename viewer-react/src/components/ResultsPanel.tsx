import { useState } from 'react';

interface QueryResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  routeId?: string;
  features?: any[];
  timestamp?: string;
  message?: string;
}

interface ResultsPanelProps {
  queryResult: QueryResult;
}

export default function ResultsPanel({ queryResult }: ResultsPanelProps) {
  const [queryExpanded, setQueryExpanded] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  return (
    <div className="border-t border-brand-blue-light/20 bg-bg-panel flex flex-col">
      {/* Query Results Section */}
      <div className="border-b border-bg-table-head">
        <button
          onClick={() => setQueryExpanded(!queryExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-bg-app transition-colors"
        >
          <h2 className="text-sm font-semibold text-text-primary">
            Query Results
          </h2>
          <span className="text-text-secondary">
            {queryExpanded ? '−' : '+'}
          </span>
        </button>
        {queryExpanded && (
          <div className="px-6 py-4 bg-bg-app text-sm text-text-secondary">
            {queryResult.status === 'idle' && (
              <p className="text-text-secondary">Click "Query & Register" to start</p>
            )}
            {queryResult.status === 'loading' && (
              <p className="text-status-idle">Loading...</p>
            )}
            {queryResult.status === 'success' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Route ID:</span>
                  <span className="mono text-text-primary font-medium">{queryResult.routeId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ground Features:</span>
                  <span className="text-text-primary font-medium">{queryResult.features?.length || 0} items</span>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span className="text-text-secondary text-xs">{queryResult.timestamp ? new Date(queryResult.timestamp).toLocaleString() : '-'}</span>
                </div>
              </div>
            )}
            {queryResult.status === 'error' && (
              <div className="text-status-error">
                <p className="font-medium">Error</p>
                <p className="text-xs">{queryResult.message}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details Section */}
      <div>
        <button
          onClick={() => setDetailsExpanded(!detailsExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-bg-app transition-colors"
        >
          <h2 className="text-sm font-semibold text-text-primary">
            Detailed Analysis
          </h2>
          <span className="text-text-secondary">
            {detailsExpanded ? '−' : '+'}
          </span>
        </button>
        {detailsExpanded && (
          <div className="px-6 py-4 bg-bg-app text-sm text-text-secondary border-t border-bg-table-head">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-bg-table-head">
                    <th className="pb-2 font-semibold text-text-primary text-xs uppercase">Layer</th>
                    <th className="pb-2 font-semibold text-text-primary text-xs uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-bg-table-head">
                    <td className="py-2">Buildings (PLATEAU)</td>
                    <td className="py-2"><span className="text-status-ok">Checked</span></td>
                  </tr>
                  <tr className="border-b border-bg-table-head">
                    <td className="py-2">DID Districts</td>
                    <td className="py-2"><span className="text-status-warn">Intersects</span></td>
                  </tr>
                  <tr>
                    <td className="py-2">150m AGL Rule</td>
                    <td className="py-2"><span className="text-status-ok">Compliant</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
