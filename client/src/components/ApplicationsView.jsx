import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { STATUSES, formatAppliedDate, hostname, renderSummaryText, toDateInput } from '../format.js';
import { Icon } from './Icon.jsx';
import { Modal } from './Modal.jsx';
import { StatCard } from './StatCard.jsx';
import { StatusBadge } from './StatusBadge.jsx';

export function ApplicationsView({ rows, analytics, query, status, onQuery, onStatus, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const counts = analytics?.status || {};

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

  return (
    <>
      <section className="hero">
        <div>
          <h2>Applications</h2>
          <p className="muted">Every job you summarized, the company it went to, and where it stands.</p>
        </div>
      </section>

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
        <select value={status} onChange={(e) => onStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </section>

      <section className="panel tableWrap">
        <table>
          <thead>
            <tr>
              <th>Job title</th>
              <th>Company</th>
              <th>Job link</th>
              <th>Summary</th>
              <th>Status</th>
              <th>Applied</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty">
                  No applications yet. Open a job posting and click <b>Generate Summary</b> in the Chrome extension.
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row._id}>
                <td className="titleCell">{row.jobTitle}</td>
                <td>{row.company}</td>
                <td>
                  <a className="jobLink" href={row.jobUrl} target="_blank" rel="noreferrer">
                    {hostname(row.jobUrl)} <Icon name="external" size={13} />
                  </a>
                </td>
                <td className="actions">
                  <button className="link iconOnly" type="button" onClick={() => setViewing(row)} aria-label="View summary" title="View">
                    <Icon name="eye" size={15} />
                  </button>
                  <a className="iconOnly" href={api.downloadUrl(row._id)} aria-label="Download summary" title="Download">
                    <Icon name="download" size={15} />
                  </a>
                </td>
                <td><StatusBadge status={row.status} /></td>
                <td className="nowrap">{formatAppliedDate(row.appliedDate)}</td>
                <td className="actions">
                  <button className="link iconOnly" type="button" onClick={() => setEditing({ ...row, appliedDate: toDateInput(row.appliedDate) })} aria-label="Edit application" title="Edit">
                    <Icon name="edit" size={15} />
                  </button>
                  <button className="danger iconOnly" type="button" onClick={() => setDeleting(row)} aria-label="Delete application" title="Delete">
                    <Icon name="trash" size={15} />
                  </button>
                </td>
              </tr>
            ))}
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
