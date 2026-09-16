import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api.js';
import { Icon } from './components/Icon.jsx';
import { ApplicationAnalyticsView } from './components/ApplicationAnalyticsView.jsx';
import { ApplicationsView } from './components/ApplicationsView.jsx';
import { InterviewAnalyticsView } from './components/InterviewAnalyticsView.jsx';

export function App() {
  const [rows, setRows] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [lifetime, setLifetime] = useState(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState('');
  const [analysisFilter, setAnalysisFilter] = useState('');
  const [platform, setPlatform] = useState('');
  const [company, setCompany] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [companies, setCompanies] = useState([]);
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
      const [apps, stats, lifetime, overview, options] = await Promise.all([
        api.applications(debouncedQuery, status, { analysis: analysisFilter, platform, company, from, to }),
        api.analytics(range),
        api.analytics('all'),
        api.analysisOverview(),
        api.filterOptions()
      ]);
      setRows(apps);
      setAnalytics(stats);
      setLifetime(lifetime);
      setAnalysis(overview);
      setPlatforms(options.platforms || []);
      setCompanies(options.companies || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { refresh(); }, [debouncedQuery, status, analysisFilter, platform, company, from, to, range]);

  const analysisBusy = (analysis?.queued ?? 0) + (analysis?.running ?? 0) > 0;
  useEffect(() => {
    if (!analysisBusy) return undefined;
    const timer = setInterval(() => { refresh(); }, 4000);
    return () => clearInterval(timer);
  }, [analysisBusy, debouncedQuery, status, analysisFilter, platform, company, from, to, range]);

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
            <NavLink to="/" end>
              <Icon name="list" />
              Applications
            </NavLink>
            <NavLink to="/analytics/applications">
              <Icon name="chart" />
              Application analytics
            </NavLink>
            <NavLink to="/analytics/interviews">
              <Icon name="spark" />
              Interview analytics
            </NavLink>
          </nav>
        </div>
      </header>

      {error ? (
        <div className="error banner">
          <span>{error}</span>
          <button className="bannerClose" type="button" onClick={() => setError('')} aria-label="Dismiss" title="Dismiss">
            <Icon name="x" />
          </button>
        </div>
      ) : null}
      {loading && !analytics ? <div className="muted">Loading…</div> : null}

      <Routes>
        <Route
          path="/"
          element={(
            <ApplicationsView
              rows={rows}
              analytics={lifetime}
              analysis={analysis}
              query={query}
              status={status}
              analysisFilter={analysisFilter}
              platform={platform}
              platforms={platforms}
              company={company}
              companies={companies}
              from={from}
              to={to}
              onQuery={setQuery}
              onStatus={setStatus}
              onAnalysis={setAnalysisFilter}
              onPlatform={setPlatform}
              onCompany={setCompany}
              onFrom={setFrom}
              onTo={setTo}
              onClearFilters={() => {
                setQuery('');
                setStatus('');
                setAnalysisFilter('');
                setPlatform('');
                setCompany('');
                setFrom('');
                setTo('');
              }}
              onChanged={refresh}
            />
          )}
        />
        <Route
          path="/analytics/applications"
          element={<ApplicationAnalyticsView analytics={analytics} range={range} onRange={setRange} />}
        />
        <Route
          path="/analytics/interviews"
          element={<InterviewAnalyticsView analytics={analytics} range={range} onRange={setRange} />}
        />
        <Route path="/analytics" element={<Navigate to="/analytics/applications" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}
