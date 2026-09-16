import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartTick } from '../format.js';
import { Icon } from './Icon.jsx';
import { StatCard } from './StatCard.jsx';

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
  { value: 'all', label: 'All time' }
];

const COLORS = {
  applied: '#3b82f6',
  intro: '#f59e0b',
  tech: '#a78bfa',
  offer: '#22c55e'
};

function pct(part, total) {
  if (!total) return '0%';
  return `${Number(((part / total) * 100).toFixed(1))}%`;
}

export function AnalyticsView({ analytics, range, onRange }) {
  const [showTable, setShowTable] = useState(false);
  const status = analytics?.status || {};
  const total = analytics?.total ?? 0;
  const timeline = analytics?.timeline || [];
  const tickInterval = timeline.length > 20 ? Math.ceil(timeline.length / 12) : 0;

  const footer = useMemo(() => {
    const busiest = analytics?.busiestDay;
    const rangeLabel = RANGES.find((r) => r.value === range)?.label?.toLowerCase() || 'selected range';
    const busy = busiest
      ? `Busiest day in the ${rangeLabel}: ${busiest.label} with ${busiest.count} bid${busiest.count === 1 ? '' : 's'}.`
      : `No bids in the ${rangeLabel} yet.`;
    return `${busy} Status counts reflect where each application stands today, not the day its status changed.`;
  }, [analytics, range]);

  return (
    <div className="analytics">
      <section className="hero">
        <div>
          <h2>Analytics</h2>
          <p className="muted">{analytics?.caption || 'Application volume and reply funnel.'}</p>
        </div>
        <div className="range">
          {RANGES.map((item) => (
            <button
              key={item.value}
              type="button"
              className={range === item.value ? 'active' : ''}
              onClick={() => onRange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <div className="statGrid">
        <StatCard
          label="Total bids"
          value={total}
          sub={`${analytics?.activeDays ?? 0} active days · ${analytics?.perActiveDay ?? 0} per active day`}
        />
        <StatCard label="Intro" value={status.intro ?? 0} sub={`${analytics?.replyRate ?? 0}% reply rate`} />
        <StatCard label="Tech" value={status.tech ?? 0} sub={`${pct(status.tech, total)} of bids`} />
        <StatCard label="Offers" value={status.offer ?? 0} sub={`${pct(status.offer, total)} of bids`} />
        <StatCard label="Awaiting reply" value={analytics?.awaitingReply ?? 0} sub="still open" />
      </div>

      <section className="panel chart">
        <div className="chartHead">
          <div>
            <h3>Bids per day</h3>
            <p className="muted small">Column height is that day’s bid count, split by where each one stands now.</p>
            <div className="legend">
              <span><i style={{ background: COLORS.applied }} /> Applied</span>
              <span><i style={{ background: COLORS.intro }} /> Intro</span>
              <span><i style={{ background: COLORS.tech }} /> Tech</span>
              <span><i style={{ background: COLORS.offer }} /> Offer</span>
            </div>
          </div>
          <button className="ghost compact iconBtn" type="button" onClick={() => setShowTable((v) => !v)}>
            <Icon name={showTable ? 'chart' : 'list'} />
            {showTable ? 'Show chart' : 'Show table'}
          </button>
        </div>

        {showTable ? (
          <div className="innerTable">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Applied</th>
                  <th>Intro</th>
                  <th>Tech</th>
                  <th>Offer</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((day) => (
                  <tr key={day.date}>
                    <td>{chartTick(day.date)}</td>
                    <td>{day.applied}</td>
                    <td>{day.intro}</td>
                    <td>{day.tech}</td>
                    <td>{day.offer}</td>
                    <td>{day.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={timeline} barCategoryGap="18%">
              <CartesianGrid stroke="#252b38" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={chartTick}
                interval={tickInterval}
                tick={{ fill: '#8b97ab', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis allowDecimals={false} tick={{ fill: '#8b97ab', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#151922', border: '1px solid #2b323f', borderRadius: 8 }}
                labelFormatter={chartTick}
              />
              <Bar dataKey="applied" stackId="a" fill={COLORS.applied} name="Applied" />
              <Bar dataKey="intro" stackId="a" fill={COLORS.intro} name="Intro" />
              <Bar dataKey="tech" stackId="a" fill={COLORS.tech} name="Tech" />
              <Bar dataKey="offer" stackId="a" fill={COLORS.offer} name="Offer" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="grid2">
        <div className="panel">
          <h3>Job platforms</h3>
          <p className="muted small">Bids grouped by the job link domain, such as indeed.com and dice.com.</p>
          <div className="funnel">
            {(analytics?.platforms || []).map((row) => (
              <div className="platformRow" key={row.domain}>
                <div className="platformMeta">
                  <span>{row.name}</span>
                  <small>{row.domain}</small>
                </div>
                <div className="platformTrack" aria-hidden="true">
                  <div className="platformFill" style={{ width: `${row.share || 0}%` }} />
                </div>
                <b>{row.bids}</b>
              </div>
            ))}
            {!analytics?.platforms?.length ? <p className="emptyInline">No job links in this range yet.</p> : null}
          </div>
        </div>

        <div className="panel">
          <h3>Platform breakdown</h3>
          <p className="muted small">Reply rate counts intro, tech, and offers on that platform.</p>
          <div className="innerTable">
            <table>
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Domain</th>
                  <th>Bids</th>
                  <th>Share</th>
                  <th>Intro</th>
                  <th>Tech</th>
                  <th>Offer</th>
                  <th>Reply rate</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.platforms || []).map((row) => (
                  <tr key={row.domain}>
                    <td>{row.name}</td>
                    <td>{row.domain}</td>
                    <td>{row.bids}</td>
                    <td>{row.share}%</td>
                    <td>{row.intro}</td>
                    <td>{row.tech}</td>
                    <td>{row.offer}</td>
                    <td>{row.replyRate}%</td>
                  </tr>
                ))}
                {!analytics?.platforms?.length ? (
                  <tr><td colSpan="8" className="empty">No bids in this range yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid2">
        <div className="panel">
          <h3>Replies by company</h3>
          <p className="muted small">Intro, tech, and offer counts in this range.</p>
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
          <p className="muted small">Reply rate counts intro, tech, and offers together.</p>
          <div className="innerTable">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Bids</th>
                  <th>Intro</th>
                  <th>Tech</th>
                  <th>Offer</th>
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
                    <td>{row.replyRate}%</td>
                  </tr>
                ))}
                {!analytics?.companies?.length ? (
                  <tr><td colSpan="6" className="empty">No bids in this range yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <p className="footnote">{footer}</p>
    </div>
  );
}
