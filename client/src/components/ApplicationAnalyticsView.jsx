import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLORS, rangeLabel } from '../analytics.js';
import { chartTick } from '../format.js';
import { Icon } from './Icon.jsx';
import { RangePicker } from './RangePicker.jsx';
import { StatCard } from './StatCard.jsx';

export function ApplicationAnalyticsView({ analytics, range, onRange }) {
  const [showTable, setShowTable] = useState(false);
  const total = analytics?.total ?? 0;
  const timeline = analytics?.timeline || [];
  const tickInterval = timeline.length > 20 ? Math.ceil(timeline.length / 12) : 0;

  const footer = useMemo(() => {
    const busiest = analytics?.busiestDay;
    const label = rangeLabel(range);
    const busy = busiest
      ? `Busiest day in the ${label}: ${busiest.label} with ${busiest.count} bid${busiest.count === 1 ? '' : 's'}.`
      : `No bids in the ${label} yet.`;
    return `${busy} Volume charts use each job’s status today.`;
  }, [analytics, range]);

  return (
    <div className="analytics">
      <section className="hero">
        <div>
          <h2>Application analytics</h2>
          <p className="muted">{analytics?.caption || 'Application volume by day, platform, and company.'}</p>
        </div>
        <RangePicker range={range} onRange={onRange} />
      </section>

      <div className="statGrid four">
        <StatCard
          label="Total bids"
          value={total}
          sub={`${analytics?.activeDays ?? 0} active days · ${analytics?.perActiveDay ?? 0} per active day`}
        />
        <StatCard label="Applied" value={analytics?.status?.applied ?? 0} sub="Still waiting on a reply" />
        <StatCard
          label="Busiest day"
          value={analytics?.busiestDay?.count ?? 0}
          sub={analytics?.busiestDay?.label || 'No bids yet'}
        />
        <StatCard label="Platforms" value={analytics?.platforms?.length ?? 0} sub="Job-board domains in this range" />
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
              <span><i style={{ background: COLORS.started }} /> Started</span>
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
                  <th>Started</th>
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
                    <td>{day.started ?? 0}</td>
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
              <Bar dataKey="offer" stackId="a" fill={COLORS.offer} name="Offer" />
              <Bar dataKey="started" stackId="a" fill={COLORS.started} name="Started" radius={[4, 4, 0, 0]} />
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
          <p className="muted small">Share of bids in this range by job-board domain.</p>
          <div className="innerTable">
            <table>
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Domain</th>
                  <th>Bids</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.platforms || []).map((row) => (
                  <tr key={row.domain}>
                    <td>{row.name}</td>
                    <td>{row.domain}</td>
                    <td>{row.bids}</td>
                    <td>{row.share}%</td>
                  </tr>
                ))}
                {!analytics?.platforms?.length ? (
                  <tr><td colSpan="4" className="empty">No bids in this range yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Company breakdown</h3>
        <p className="muted small">Where you sent applications in this range.</p>
        <div className="innerTable">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Bids</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.companies || []).map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.bids}</td>
                </tr>
              ))}
              {!analytics?.companies?.length ? (
                <tr><td colSpan="2" className="empty">No bids in this range yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <p className="footnote">{footer}</p>
    </div>
  );
}
