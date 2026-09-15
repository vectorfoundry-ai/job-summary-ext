import { Application } from '../models/Application.js';
import { eachLocalDay, formatLongDate, parseRange, rangeCaption, toLocalYmd } from '../utils/dateRange.js';
import { jobPlatformFromUrl } from '../utils/jobPlatform.js';

const STATUSES = ['applied', 'intro', 'tech', 'offer'];

function emptyCounts() {
  return { applied: 0, intro: 0, tech: 0, offer: 0 };
}

export async function overview(req, res, next) {
  try {
    const { key, start, end } = parseRange(req.query.range);
    const match = {};
    if (start) match.appliedDate = { $gte: start, $lte: end };

    const rows = await Application.find(match)
      .select('status appliedDate company jobUrl primaryTechnology')
      .lean();

    let timelineStart = start;
    if (!timelineStart) {
      if (rows.length) {
        timelineStart = rows.reduce((min, row) => {
          const d = new Date(row.appliedDate);
          return d < min ? d : min;
        }, new Date(rows[0].appliedDate));
        timelineStart.setHours(0, 0, 0, 0);
      } else {
        const fallback = parseRange('30d');
        timelineStart = fallback.start;
      }
    }

    const days = eachLocalDay(timelineStart, end);
    const timelineMap = new Map(days.map((date) => [date, { date, ...emptyCounts(), total: 0 }]));

    const status = emptyCounts();
    const companies = new Map();
    const platforms = new Map();
    const technologies = new Map();

    for (const row of rows) {
      const st = STATUSES.includes(row.status) ? row.status : 'applied';
      status[st] += 1;
      const day = toLocalYmd(row.appliedDate);
      if (timelineMap.has(day)) {
        timelineMap.get(day)[st] += 1;
        timelineMap.get(day).total += 1;
      }

      const companyName = row.company || 'Not specified';
      if (!companies.has(companyName)) companies.set(companyName, { name: companyName, ...emptyCounts(), bids: 0 });
      const company = companies.get(companyName);
      company[st] += 1;
      company.bids += 1;

      const platformInfo = jobPlatformFromUrl(row.jobUrl);
      if (!platforms.has(platformInfo.domain)) {
        platforms.set(platformInfo.domain, { ...platformInfo, ...emptyCounts(), bids: 0 });
      }
      const platform = platforms.get(platformInfo.domain);
      platform[st] += 1;
      platform.bids += 1;

      const techName = row.primaryTechnology || 'Not specified';
      technologies.set(techName, (technologies.get(techName) || 0) + 1);
    }

    const total = rows.length;
    const replied = status.intro + status.tech + status.offer;
    const replyRate = total ? Number(((replied / total) * 100).toFixed(1)) : 0;
    const timeline = [...timelineMap.values()];
    const activeDays = timeline.filter((d) => d.total > 0).length;
    const perActiveDay = activeDays ? Number((total / activeDays).toFixed(1)) : 0;
    const busiest = timeline.reduce((best, day) => (day.total > (best?.total || 0) ? day : best), null);

    const companyRows = [...companies.values()]
      .map((c) => ({
        ...c,
        replyRate: c.bids ? Number((((c.intro + c.tech + c.offer) / c.bids) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.bids - a.bids)
      .slice(0, 12);

    const repliesByCompany = companyRows
      .map((c) => ({ name: c.name, replies: c.intro + c.tech + c.offer }))
      .sort((a, b) => b.replies - a.replies);

    const platformRows = [...platforms.values()]
      .map((p) => ({
        ...p,
        share: total ? Number(((p.bids / total) * 100).toFixed(1)) : 0,
        replyRate: p.bids ? Number((((p.intro + p.tech + p.offer) / p.bids) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.bids - a.bids || a.name.localeCompare(b.name));

    res.json({
      range: key,
      caption: `${total} bid${total === 1 ? '' : 's'} from ${rangeCaption(key, timelineStart, end)}`,
      total,
      status,
      replied,
      replyRate,
      awaitingReply: status.applied,
      activeDays,
      perActiveDay,
      busiestDay: busiest && busiest.total
        ? { date: busiest.date, label: formatLongDate(busiest.date), count: busiest.total }
        : null,
      timeline,
      companies: companyRows,
      repliesByCompany,
      platforms: platformRows,
      technologies: [...technologies.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    });
  } catch (error) { next(error); }
}
