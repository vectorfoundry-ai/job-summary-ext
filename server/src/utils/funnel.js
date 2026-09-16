export const PIPELINE = ['applied', 'intro', 'tech', 'offer', 'started'];

export function emptyCounts() {
  return { applied: 0, intro: 0, tech: 0, offer: 0, started: 0 };
}

export function passRate(part, whole) {
  if (!whole) return 0;
  return Number(((part / whole) * 100).toFixed(1));
}

export function reachedFrom(status, step) {
  const start = PIPELINE.indexOf(step);
  if (start < 0) return 0;
  return PIPELINE.slice(start).reduce((sum, key) => sum + (status[key] || 0), 0);
}

export function interviewPassRates(status) {
  const applied = reachedFrom(status, 'applied');
  const intro = reachedFrom(status, 'intro');
  const tech = reachedFrom(status, 'tech');
  const offer = reachedFrom(status, 'offer');
  const started = reachedFrom(status, 'started');
  return [
    { from: 'applied', to: 'intro', label: 'Applied → Intro', passed: intro, pool: applied, rate: passRate(intro, applied) },
    { from: 'intro', to: 'tech', label: 'Intro → Tech', passed: tech, pool: intro, rate: passRate(tech, intro) },
    { from: 'tech', to: 'offer', label: 'Tech → Offer', passed: offer, pool: tech, rate: passRate(offer, tech) },
    { from: 'offer', to: 'started', label: 'Offer → Started', passed: started, pool: offer, rate: passRate(started, offer) }
  ];
}

export function repliedCount(status) {
  return reachedFrom(status, 'intro');
}

export function totalCount(status) {
  return reachedFrom(status, 'applied');
}

export function expandSteps(from, to) {
  const end = PIPELINE.indexOf(to);
  if (end <= 0) return [];
  let start = PIPELINE.indexOf(from);
  if (start < 0) start = 0;
  if (end <= start) return [];
  const steps = [];
  for (let i = start; i < end; i += 1) {
    steps.push({ from: PIPELINE[i], to: PIPELINE[i + 1] });
  }
  return steps;
}

export function seedStatusHistory(row) {
  const appliedAt = new Date(row.appliedDate || row.createdAt || Date.now());
  const events = [{ from: '', to: 'applied', at: appliedAt }];
  const status = PIPELINE.includes(row.status) ? row.status : 'applied';
  if (status !== 'applied') {
    events.push({ from: 'applied', to: status, at: new Date(row.updatedAt || appliedAt) });
  }
  return events;
}

export function normalizeHistory(row) {
  const raw = Array.isArray(row.statusHistory) ? row.statusHistory.filter((event) => event?.to) : [];
  if (!raw.length) return seedStatusHistory(row);
  return raw
    .map((event) => ({
      from: event.from || '',
      to: event.to,
      at: new Date(event.at || row.appliedDate || Date.now())
    }))
    .sort((a, b) => a.at - b.at);
}

const HOLD = new Set(['applied', 'intro', 'tech', 'offer']);

export function monthPassRatesFromHistory(jobs, monthStart, monthEnd) {
  const opp = { applied: 0, intro: 0, tech: 0, offer: 0 };
  const converted = { intro: 0, tech: 0, offer: 0, started: 0 };
  let bids = 0;

  for (const job of jobs) {
    const appliedAt = new Date(job.appliedDate);
    if (!Number.isNaN(appliedAt.getTime()) && appliedAt >= monthStart && appliedAt <= monthEnd) bids += 1;

    const events = normalizeHistory(job);
    let cursor = null;
    for (const event of events) {
      if (event.at < monthStart) cursor = event.to;
      else break;
    }

    const jobOpp = new Set();
    const jobConv = new Set();
    if (HOLD.has(cursor)) jobOpp.add(cursor);

    for (const event of events) {
      if (event.at < monthStart || event.at > monthEnd) continue;
      const from = cursor || event.from || '';
      for (const step of expandSteps(from, event.to)) {
        if (HOLD.has(step.from)) jobOpp.add(step.from);
        jobConv.add(step.to);
        cursor = step.to;
      }
      cursor = event.to;
    }
    if (HOLD.has(cursor)) jobOpp.add(cursor);

    for (const stage of jobOpp) opp[stage] += 1;
    for (const stage of jobConv) {
      if (converted[stage] !== undefined) converted[stage] += 1;
    }
  }

  return {
    bids,
    steps: [
      { from: 'applied', to: 'intro', label: 'Applied → Intro', passed: converted.intro, pool: opp.applied, rate: passRate(converted.intro, opp.applied) },
      { from: 'intro', to: 'tech', label: 'Intro → Tech', passed: converted.tech, pool: opp.intro, rate: passRate(converted.tech, opp.intro) },
      { from: 'tech', to: 'offer', label: 'Tech → Offer', passed: converted.offer, pool: opp.tech, rate: passRate(converted.offer, opp.tech) },
      { from: 'offer', to: 'started', label: 'Offer → Started', passed: converted.started, pool: opp.offer, rate: passRate(converted.started, opp.offer) }
    ]
  };
}

export function withStepDeltas(months) {
  return months.map((row, index) => {
    const prev = index > 0 ? months[index - 1] : null;
    return {
      ...row,
      steps: row.steps.map((step, stepIndex) => ({
        ...step,
        delta: prev && prev.steps[stepIndex].pool > 0 && step.pool > 0
          ? Number((step.rate - prev.steps[stepIndex].rate).toFixed(1))
          : null
      }))
    };
  });
}

export function monthlyPassTrend(months) {
  return months.map((row, index) => {
    const steps = interviewPassRates(row.status);
    const prev = index > 0 ? interviewPassRates(months[index - 1].status) : null;
    return {
      month: row.month,
      label: row.label,
      bids: row.bids,
      steps: steps.map((step, stepIndex) => ({
        ...step,
        delta: prev && prev[stepIndex].pool > 0 && step.pool > 0
          ? Number((step.rate - prev[stepIndex].rate).toFixed(1))
          : null
      }))
    };
  });
}
