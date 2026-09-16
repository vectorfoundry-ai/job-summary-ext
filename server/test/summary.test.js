import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSummaryFilename } from '../src/utils/sanitizeFilename.js';
import { renderSummary } from '../src/services/summary.service.js';
import { eachLocalDay, parseRange, toLocalYmd } from '../src/utils/dateRange.js';
import { normalizeJobUrl } from '../src/utils/normalizeUrl.js';
import { jobPlatformFromUrl } from '../src/utils/jobPlatform.js';
import { placeholderCompany, placeholderTitle } from '../src/utils/placeholders.js';

test('builds Windows-safe required filename', () => {
  assert.equal(
    buildSummaryFilename('Acme: Labs', 'Senior AI/ML Engineer?'),
    'Acme- Labs-Senior AI-ML Engineer-.txt'
  );
});

test('preserves readable spacing between company and role', () => {
  assert.equal(
    buildSummaryFilename('Automation Agency', 'Fullstack AI & Automation Engineer'),
    'Automation Agency-Fullstack AI & Automation Engineer.txt'
  );
});

test('renders exact required summary sections', () => {
  const text = renderSummary({ jobTitle: 'Engineer', company: 'Acme', requiredSkills: ['Node.js', 'MongoDB'] });
  assert.match(text, /^Job Title: Engineer/);
  assert.match(text, /Company: Acme/);
  assert.match(text, /Salary \/ Compensation: Not specified/);
  assert.match(text, /Required Skills \/ Tech Stack: Node.js; MongoDB/);
  assert.match(text, /What do you know about our company\?\n\nNot specified$/);
});

test('fills every local day in a 7-day range', () => {
  const { start, end } = parseRange('7d');
  const days = eachLocalDay(start, end);
  assert.equal(days.length, 7);
  assert.equal(days[0], toLocalYmd(start));
  assert.equal(days.at(-1), toLocalYmd(end));
});

test('strips tracking params from job URLs', () => {
  assert.equal(
    normalizeJobUrl('https://www.indeed.com/viewjob?jk=abc&utm_source=share#section'),
    'https://www.indeed.com/viewjob?jk=abc'
  );
});

test('maps job links to known platforms', () => {
  assert.deepEqual(jobPlatformFromUrl('https://www.indeed.com/viewjob?jk=abc'), { domain: 'indeed.com', name: 'Indeed' });
  assert.deepEqual(jobPlatformFromUrl('https://www.dice.com/job-detail/123'), { domain: 'dice.com', name: 'Dice' });
  assert.deepEqual(jobPlatformFromUrl('https://uk.indeed.com/viewjob?jk=xyz'), { domain: 'indeed.com', name: 'Indeed' });
  assert.deepEqual(jobPlatformFromUrl('https://jobs.lever.co/acme/role'), { domain: 'lever.co', name: 'Lever' });
});

test('keeps unknown job hosts as their domain', () => {
  assert.deepEqual(jobPlatformFromUrl('https://careers.acme.com/jobs/42'), { domain: 'careers.acme.com', name: 'careers.acme.com' });
  assert.deepEqual(jobPlatformFromUrl('not-a-url'), { domain: 'unknown', name: 'Unknown' });
});

test('builds placeholders from page title and job URL', () => {
  assert.equal(placeholderTitle('Senior Python Engineer | Acme', 'https://www.indeed.com/viewjob?jk=1'), 'Senior Python Engineer | Acme');
  assert.equal(placeholderCompany('https://www.indeed.com/viewjob?jk=1'), 'indeed.com');
});
