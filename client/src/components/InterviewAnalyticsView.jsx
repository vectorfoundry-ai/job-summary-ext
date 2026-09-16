import { useMemo } from 'react';
import { CartesianGrid, Legend as ChartLegend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PASS_LINES, deltaClass, formatDelta, pct, rangeLabel } from '../analytics.js';
import { RangePicker } from './RangePicker.jsx';
import { StatCard } from './StatCard.jsx';

export function InterviewAnalyticsView({ analytics, range, onRange }) {
  const status = analytics?.status || {};
  const total = analytics?.total ?? 0;
  const monthly = analytics?.monthlyPassRates || [];
  const monthlyChart = monthly.map((row) => {
    const point = { month: row.label };
    for (const line of PASS_LINES) {
      const step = row.steps?.find((item) => item.label === line.label);
      point[line.key] = step?.pool ? step.rate : null;
    }
    return point;
  });

  const footer = useMemo(() => {
    const label = rangeLabel(range);
    return `Interview cards use each job’s status today. Monthly pass rates in the ${label} use recorded status changes.`;
  }, [range]);

  return (
    <div className="analytics">
      <section className="hero">
        <div>
          <h2>Interview analytics</h2>
          <p className="muted">Pass rates, replies, and how interviews moved by month.</p>
        </div>
        <RangePicker range={range} onRange={onRange} />
      </section>

      <div className="statGrid four">
        <StatCard label="Intro" value={status.intro ?? 0} sub={`${analytics?.replyRate ?? 0}% reply rate`} />
        <StatCard label="Tech" value={status.tech ?? 0} sub={`${pct(status.tech, total)} of bids`} />
        <StatCard label="Offers" value={status.offer ?? 0} sub={`${pct(status.offer, total)} of bids`} />
        <StatCard label="Started" value={status.started ?? 0} sub={`${pct(status.started, total)} of bids`} />
      </div>

      <section className="panel">
        <h3>Interview pass rate</h3>
        <p className="muted small">Share who reached the next stage. Later statuses count as having passed earlier ones. Started means you accepted the offer and began the job.</p>
        <div className="statGrid four">
          {(analytics?.passRates || []).map((step) => (
            <StatCard
              key={`${step.from}-${step.to}`}
              label={step.label}
              value={`${step.rate}%`}
              sub={`${step.passed} of ${step.pool}`}
            />
          ))}
        </div>
      </section>

      <section className="panel chart">
        <div className="chartHead">
          <div>
            <h3>Monthly pass rate</h3>
            <p className="muted small">Each month’s conversion uses the status-change log: jobs that could move that month vs jobs that did. Change is vs the previous month, in percentage points.</p>
          </div>
        </div>
        {monthly.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyChart}>
              <CartesianGrid stroke="#252b38" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#8b97ab', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#8b97ab', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#151922', border: '1px solid #2b323f', borderRadius: 8 }} />
              <ChartLegend />
              {PASS_LINES.map((line) => (
                <Line key={line.key} type="monotone" dataKey={line.key} name={line.label} stroke={line.color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="emptyInline">No months in this range yet.</p>}
        <div className="innerTable">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Bids</th>
                {PASS_LINES.map((line) => (
                  <th key={line.key}>{line.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthly.map((row) => (
                <tr key={row.month}>
                  <td>{row.label}</td>
                  <td>{row.bids}</td>
                  {(row.steps || []).map((step) => (
                    <td key={`${row.month}-${step.from}-${step.to}`} className="rateCell">
                      {step.pool ? `${step.rate}%` : '—'}
                      <small className={deltaClass(step.delta)}>{formatDelta(step.delta)}</small>
                    </td>
                  ))}
                </tr>
              ))}
              {!monthly.length ? (
                <tr><td colSpan="6" className="empty">No monthly data yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid2">
        <div className="panel">
          <h3>Replies by company</h3>
          <p className="muted small">Intro, tech, offer, and started counts in this range.</p>
          {(analytics?.repliesByCompany || []).every((row) => row.replies === 0) ? (
            <p className="emptyInline">No replies in this range yet.</p>
          ) : null}
          <div className="funnel">
            {(analytics?.repliesByCompany || []).map((row) => (
              <div className="funnelRow" key={row.name}>
                <span>{row.name}</span>
                <b>{row.replies}</b>
              </div>
            ))}
            {!analytics?.repliesByCompany?.length ? <p className="emptyInline">No companies in this range yet.</p> : null}
          </div>
        </div>

        <div className="panel">
          <h3>Company breakdown</h3>
          <p className="muted small">Reply rate counts intro, tech, offer, and started together.</p>
          <div className="innerTable">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Bids</th>
                  <th>Intro</th>
                  <th>Tech</th>
                  <th>Offer</th>
                  <th>Started</th>
                  <th>Reply rate</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.companies || []).map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.bids}</td>
                    <td>{row.intro}</td>
                    <td>{row.tech}</td>
                    <td>{row.offer}</td>
                    <td>{row.started ?? 0}</td>
                    <td>{row.replyRate}%</td>
                  </tr>
                ))}
                {!analytics?.companies?.length ? (
                  <tr><td colSpan="7" className="empty">No bids in this range yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Platform breakdown</h3>
        <p className="muted small">Reply rate counts intro, tech, offer, and started on that platform.</p>
        <div className="innerTable">
          <table>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Domain</th>
                <th>Bids</th>
                <th>Intro</th>
                <th>Tech</th>
                <th>Offer</th>
                <th>Started</th>
                <th>Reply rate</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.platforms || []).map((row) => (
                <tr key={row.domain}>
                  <td>{row.name}</td>
                  <td>{row.domain}</td>
                  <td>{row.bids}</td>
                  <td>{row.intro}</td>
                  <td>{row.tech}</td>
                  <td>{row.offer}</td>
                  <td>{row.started ?? 0}</td>
                  <td>{row.replyRate}%</td>
                </tr>
              ))}
              {!analytics?.platforms?.length ? (
                <tr><td colSpan="8" className="empty">No bids in this range yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <p className="footnote">{footer}</p>
    </div>
  );
}
