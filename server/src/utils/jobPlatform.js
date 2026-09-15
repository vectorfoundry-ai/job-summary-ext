const KNOWN = [
  { test: /(^|\.)indeed\./i, domain: 'indeed.com', name: 'Indeed' },
  { test: /(^|\.)dice\.com$/i, domain: 'dice.com', name: 'Dice' },
  { test: /(^|\.)linkedin\.com$/i, domain: 'linkedin.com', name: 'LinkedIn' },
  { test: /(^|\.)glassdoor\./i, domain: 'glassdoor.com', name: 'Glassdoor' },
  { test: /(^|\.)ziprecruiter\.com$/i, domain: 'ziprecruiter.com', name: 'ZipRecruiter' },
  { test: /(^|\.)monster\./i, domain: 'monster.com', name: 'Monster' },
  { test: /(^|\.)simplyhired\.com$/i, domain: 'simplyhired.com', name: 'SimplyHired' },
  { test: /(^|\.)careerbuilder\.com$/i, domain: 'careerbuilder.com', name: 'CareerBuilder' },
  { test: /(^|\.)builtin\.com$/i, domain: 'builtin.com', name: 'Built In' },
  { test: /(^|\.)wellfound\.com$/i, domain: 'wellfound.com', name: 'Wellfound' },
  { test: /(^|\.)angel\.co$/i, domain: 'wellfound.com', name: 'Wellfound' },
  { test: /(^|\.)greenhouse\.io$/i, domain: 'greenhouse.io', name: 'Greenhouse' },
  { test: /(^|\.)lever\.co$/i, domain: 'lever.co', name: 'Lever' },
  { test: /(^|\.)ashbyhq\.com$/i, domain: 'ashbyhq.com', name: 'Ashby' },
  { test: /(^|\.)myworkdayjobs\.com$/i, domain: 'myworkdayjobs.com', name: 'Workday' },
  { test: /(^|\.)workday\.com$/i, domain: 'workday.com', name: 'Workday' },
  { test: /(^|\.)smartrecruiters\.com$/i, domain: 'smartrecruiters.com', name: 'SmartRecruiters' },
  { test: /(^|\.)icims\.com$/i, domain: 'icims.com', name: 'iCIMS' },
  { test: /(^|\.)jobvite\.com$/i, domain: 'jobvite.com', name: 'Jobvite' },
  { test: /(^|\.)workable\.com$/i, domain: 'workable.com', name: 'Workable' },
  { test: /(^|\.)breezy\.hr$/i, domain: 'breezy.hr', name: 'Breezy' },
  { test: /(^|\.)otta\.com$/i, domain: 'otta.com', name: 'Otta' },
  { test: /(^|\.)levels\.fyi$/i, domain: 'levels.fyi', name: 'Levels.fyi' },
  { test: /(^|\.)ycombinator\.com$/i, domain: 'ycombinator.com', name: 'Y Combinator' },
  { test: /(^|\.)remoteok\.com$/i, domain: 'remoteok.com', name: 'Remote OK' },
  { test: /(^|\.)weworkremotely\.com$/i, domain: 'weworkremotely.com', name: 'We Work Remotely' }
];

export function jobPlatformFromUrl(url) {
  let hostname = '';
  try {
    hostname = new URL(String(url).trim()).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    hostname = '';
  }

  if (!hostname) return { domain: 'unknown', name: 'Unknown' };

  const known = KNOWN.find((item) => item.test.test(hostname));
  if (known) return { domain: known.domain, name: known.name };
  return { domain: hostname, name: hostname };
}
