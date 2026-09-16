import { useEffect, useState } from 'react';
import { api } from './api.js';
import { Icon } from './components/Icon.jsx';
import { AnalyticsView } from './components/AnalyticsView.jsx';
import { ApplicationsView } from './components/ApplicationsView.jsx';

export function App() {
  const [tab, setTab] = useState('applications');
  const [rows, setRows] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [lifetime, setLifetime] = useState(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState('30d');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function refresh() {
    try {
      setError('');
      setRefreshing(true);
      const [apps, stats, lifetime, overview] = await Promise.all([
        api.applications(debouncedQuery, status),
        api.analytics(range),
        api.analytics('all'),
        api.analysisOverview()
      ]);
      setRows(apps);
      setAnalytics(stats);
      setLifetime(lifetime);
      setAnalysis(overview);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { refresh(); }, [debouncedQuery, status, range]);

  const analysisBusy = (analysis?.queued ?? 0) + (analysis?.running ?? 0) > 0;
  useEffect(() => {
    if (!analysisBusy) return undefined;
    const timer = setInterval(() => { refresh(); }, 4000);
    return () => clearInterval(timer);
  }, [analysisBusy, debouncedQuery, status, range]);

  return (
    <main>
      <header>
        <h1>Job Summary Tracker</h1>
        <div className="headerActions">
          <button type="button" className="ghost iconBtn" onClick={refresh} disabled={refreshing}>
            <Icon name="refresh" />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <nav>
            <button type="button" className={tab === 'applications' ? 'active' : ''} onClick={() => setTab('applications')}>
              <Icon name="list" />
              Applications
            </button>
            <button type="button" className={tab === 'analytics' ? 'active' : ''} onClick={() => setTab('analytics')}>
              <Icon name="chart" />
              Analytics
            </button>
          </nav>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}
      {loading && !analytics ? <div className="muted">Loading…</div> : null}

      {tab === 'applications' ? (
        <ApplicationsView
          rows={rows}
          analytics={lifetime}
          analysis={analysis}
          query={query}
          status={status}
          onQuery={setQuery}
          onStatus={setStatus}
          onChanged={refresh}
        />
      ) : (
        <AnalyticsView analytics={analytics} range={range} onRange={setRange} />
      )}
    </main>
  );
}
