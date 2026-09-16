import { Application } from '../models/Application.js';
import { eachLocalDay, eachLocalMonth, formatLongDate, formatMonthLabel, parseRange, rangeCaption, toLocalYm, toLocalYmd } from '../utils/dateRange.js';
import { emptyCounts, interviewPassRates, monthPassRatesFromHistory, PIPELINE, repliedCount, totalCount, withStepDeltas } from '../utils/funnel.js';
import { jobPlatformFromUrl } from '../utils/jobPlatform.js';

function monthBounds(ym, rangeStart, rangeEnd) {
  const [year, month] = String(ym).split('-').map(Number);
  let start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  let end = new Date(year, month, 0, 23, 59, 59, 999);
  if (rangeStart && start < rangeStart) start = new Date(rangeStart);
  if (rangeEnd && end > rangeEnd) end = new Date(rangeEnd);
  return { start, end };
}

export async function overview(req, res, next) {
  try {
    const { key, start, end } = parseRange(req.query.range);
    const match = {};
    if (start) match.appliedDate = { $gte: start, $lte: end };

    const rows = await Application.find(match)
      .select('status appliedDate company jobUrl primaryTechnology analysisStatus')
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
    const monthEnd = end || new Date();
    const monthKeys = eachLocalMonth(timelineStart, monthEnd);
    const monthMap = new Map(monthKeys.map((month) => [month, { month, ...emptyCounts(), bids: 0 }]));

    for (const row of rows) {
      if (row.analysisStatus && row.analysisStatus !== 'ready') continue;
      const st = PIPELINE.includes(row.status) ? row.status : 'applied';
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

      const ym = toLocalYm(row.appliedDate);
      if (monthMap.has(ym)) {
        monthMap.get(ym)[st] += 1;
        monthMap.get(ym).bids += 1;
      }

      const techName = row.primaryTechnology || 'Not specified';
      technologies.set(techName, (technologies.get(techName) || 0) + 1);
    }

    const total = totalCount(status);
    const replied = repliedCount(status);
    const replyRate = total ? Number(((replied / total) * 100).toFixed(1)) : 0;
    const passRates = interviewPassRates(status);
    const historyJobs = await Application.find()
      .select('status appliedDate statusHistory updatedAt createdAt')
      .lean();

    const monthlyPassRates = withStepDeltas(
      monthKeys.map((month) => {
        const bounds = monthBounds(month, timelineStart, monthEnd);
        const computed = monthPassRatesFromHistory(historyJobs, bounds.start, bounds.end);
        return {
          month,
          label: formatMonthLabel(month),
          bids: computed.bids,
          steps: computed.steps
        };
      })
    );
    const timeline = [...timelineMap.values()];
    const activeDays = timeline.filter((d) => d.total > 0).length;
    const perActiveDay = activeDays ? Number((total / activeDays).toFixed(1)) : 0;
    const busiest = timeline.reduce((best, day) => (day.total > (best?.total || 0) ? day : best), null);

    const companyRows = [...companies.values()]
      .map((c) => ({
        ...c,
        replyRate: c.bids ? Number(((repliedCount(c) / c.bids) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.bids - a.bids)
      .slice(0, 12);

    const repliesByCompany = companyRows
      .map((c) => ({ name: c.name, replies: repliedCount(c) }))
      .sort((a, b) => b.replies - a.replies);

    const platformRows = [...platforms.values()]
      .map((p) => ({
        ...p,
        share: total ? Number(((p.bids / total) * 100).toFixed(1)) : 0,
        replyRate: p.bids ? Number(((repliedCount(p) / p.bids) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.bids - a.bids || a.name.localeCompare(b.name));

    res.json({
      range: key,
      caption: `${total} bid${total === 1 ? '' : 's'} from ${rangeCaption(key, timelineStart, end)}`,
      total,
      status,
      replied,
      replyRate,
      passRates,
      monthlyPassRates,
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
