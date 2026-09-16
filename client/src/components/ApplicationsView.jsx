import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { ANALYSIS_FILTERS, STATUSES, formatAppliedDate, hostname, isSummaryReady, renderSummaryText, toDateInput } from '../format.js';
import { Icon } from './Icon.jsx';
import { Modal } from './Modal.jsx';
import { StatCard } from './StatCard.jsx';
import { AnalysisBadge, StatusBadge } from './StatusBadge.jsx';

export function ApplicationsView({
  rows, analytics, analysis, query, status, analysisFilter, platform, platforms = [],
  company, companies = [], from, to,
  onQuery, onStatus, onAnalysis, onPlatform, onCompany, onFrom, onTo, onClearFilters, onChanged
}) {
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const counts = analytics?.status || {};
  const failed = analysis?.error ?? 0;
  const inFlight = (analysis?.queued ?? 0) + (analysis?.running ?? 0);

  const viewText = useMemo(() => (viewing ? renderSummaryText(viewing) : ''), [viewing]);

  async function saveEdit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.update(editing._id, {
        jobTitle: editing.jobTitle,
        company: editing.company,
        status: editing.status,
        appliedDate: editing.appliedDate
      });
      setEditing(null);
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.remove(deleting._id);
      setDeleting(null);
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function retryRow(row) {
    setSaving(true);
    try {
      await api.retry(row._id);
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function cancelRow(row) {
    setSaving(true);
    try {
      await api.cancelAnalysis(row._id);
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="hero">
        <div>
          <h2>Applications</h2>
          <p className="muted">Every job you summarized, the company it went to, and where it stands.</p>
        </div>
      </section>

      {failed > 0 ? (
        <div className="warn">
          <b>{failed} summar{failed === 1 ? 'y' : 'ies'} failed.</b> Ollama is down or ran out of memory. Fix Ollama, then click Retry.
          {analysis?.lastError ? <p className="errorDetail">{analysis.lastFailedJob ? `${analysis.lastFailedJob}: ` : ''}{analysis.lastError}</p> : null}
        </div>
      ) : null}
      {inFlight > 0 ? (
        <p className="muted">{inFlight} summar{inFlight === 1 ? 'y' : 'ies'} still analyzing in the background.</p>
      ) : null}

      <div className="statGrid compact">
        <StatCard label="Total" value={analytics?.total ?? 0} />
        <StatCard label="Applied" value={counts.applied ?? 0} />
        <StatCard label="Intro" value={counts.intro ?? 0} />
        <StatCard label="Tech" value={counts.tech ?? 0} />
        <StatCard label="Offer" value={counts.offer ?? 0} />
      </div>

      <section className="panel filters">
        <div className="searchField">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search job title, company, description or technology..."
          />
        </div>
        <div className="filterRow">
          <label className="dateField">
            <span>Status</span>
            <select value={status} onChange={(e) => onStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="dateField">
            <span>Analysis</span>
            <select value={analysisFilter} onChange={(e) => onAnalysis(e.target.value)}>
              <option value="">All analysis</option>
              {ANALYSIS_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="dateField">
            <span>Platform</span>
            <select value={platform} onChange={(e) => onPlatform(e.target.value)}>
              <option value="">All platforms</option>
              {platforms.map((item) => (
                <option key={item.domain} value={item.domain}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="dateField">
            <span>Company</span>
            <select value={company} onChange={(e) => onCompany(e.target.value)}>
              <option value="">All companies</option>
              {companies.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="dateField">
            <span>From</span>
            <input type="date" value={from} onChange={(e) => onFrom(e.target.value)} />
          </label>
          <label className="dateField">
            <span>To</span>
            <input type="date" value={to} onChange={(e) => onTo(e.target.value)} />
          </label>
          <button className="ghost filterClear" type="button" onClick={onClearFilters}>Clear</button>
        </div>
      </section>

      <section className="panel tableWrap">
        <table>
          <thead>
            <tr>
              <th>Job title</th>
              <th>Company</th>
              <th>Job link</th>
              <th>Summary</th>
              <th>Analysis</th>
              <th>Status</th>
              <th>Applied</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty">
                  No applications yet. Open a job posting and click <b>Generate Summary</b> in the Chrome extension.
                </td>
              </tr>
            ) : rows.map((row) => {
              const ready = isSummaryReady(row);
              const analyzing = row.analysisStatus === 'queued' || row.analysisStatus === 'running';
              const canRetry = row.analysisStatus === 'error' || row.analysisStatus === 'stopped';
              return (
                <tr key={row._id}>
                  <td className="titleCell">{row.jobTitle}</td>
                  <td>{row.company}</td>
                  <td>
                    <a className="jobLink" href={row.jobUrl} target="_blank" rel="noreferrer">
                      {hostname(row.jobUrl)} <Icon name="external" size={13} />
                    </a>
                  </td>
                  <td className="actions">
                    <button className="link iconOnly" type="button" onClick={() => setViewing(row)} disabled={!ready} aria-label="View summary" title={ready ? 'View' : 'Summary not ready'}>
                      <Icon name="eye" size={15} />
                    </button>
                    {ready ? (
                      <a className="iconOnly" href={api.downloadUrl(row._id)} aria-label="Download summary" title="Download">
                        <Icon name="download" size={15} />
                      </a>
                    ) : (
                      <button className="link iconOnly" type="button" disabled aria-label="Download summary" title="Summary not ready">
                        <Icon name="download" size={15} />
                      </button>
                    )}
                  </td>
                  <td>
                    <AnalysisBadge status={row.analysisStatus} error={row.analysisError} />
                  </td>
                  <td><StatusBadge status={row.status} /></td>
                  <td className="nowrap">{formatAppliedDate(row.appliedDate)}</td>
                  <td className="actions">
                    {canRetry ? (
                      <button className="link iconOnly" type="button" onClick={() => retryRow(row)} disabled={saving} aria-label="Retry analysis" title="Retry analysis">
                        <Icon name="refresh" size={15} />
                      </button>
                    ) : null}
                    {analyzing ? (
                      <button className="link iconOnly" type="button" onClick={() => cancelRow(row)} disabled={saving} aria-label="Stop analysis" title="Stop analysis">
                        <Icon name="x" size={15} />
                      </button>
                    ) : null}
                    <button className="link iconOnly" type="button" onClick={() => setEditing({ ...row, appliedDate: toDateInput(row.appliedDate) })} aria-label="Edit application" title="Edit">
                      <Icon name="edit" size={15} />
                    </button>
                    <button className="danger iconOnly" type="button" onClick={() => setDeleting(row)} aria-label="Delete application" title="Delete">
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {viewing && (
        <Modal title={`${viewing.company} — ${viewing.jobTitle}`} onClose={() => setViewing(null)} wide>
          <pre className="summary">{viewText}</pre>
          <div className="modalActions">
            <a className="button iconBtn" href={api.downloadUrl(viewing._id)}>
              <Icon name="download" /> Download {viewing.fileName}
            </a>
            <button className="ghost iconBtn" type="button" onClick={() => navigator.clipboard.writeText(viewText)}>
              <Icon name="copy" /> Copy
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete application" onClose={() => !saving && setDeleting(null)}>
          <p className="confirmCopy">
            Delete <b>{deleting.jobTitle}</b> at <b>{deleting.company}</b>? This also removes the saved summary file.
          </p>
          <div className="modalActions">
            <button className="button dangerFill iconBtn" type="button" onClick={confirmDelete} disabled={saving}>
              <Icon name="trash" />
              {saving ? 'Deleting…' : 'Delete'}
            </button>
            <button className="ghost iconBtn" type="button" onClick={() => setDeleting(null)} disabled={saving}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
      {editing && (
        <Modal title="Edit application" onClose={() => setEditing(null)}>
          <form className="form" onSubmit={saveEdit}>
            <label>
              Job title
              <input value={editing.jobTitle} onChange={(e) => setEditing({ ...editing, jobTitle: e.target.value })} required />
            </label>
            <label>
              Company
              <input value={editing.company} onChange={(e) => setEditing({ ...editing, company: e.target.value })} required />
            </label>
            <label>
              Status
              <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                {STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label>
              Applied date
              <input type="date" value={editing.appliedDate} onChange={(e) => setEditing({ ...editing, appliedDate: e.target.value })} required />
            </label>
            <div className="modalActions">
              <button className="button iconBtn" type="submit" disabled={saving}>
                <Icon name="save" />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="ghost" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
