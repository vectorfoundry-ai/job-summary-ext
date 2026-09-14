import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSummaryFilename } from '../src/utils/sanitizeFilename.js';
import { renderSummary } from '../src/services/summary.service.js';
import { eachLocalDay, parseRange, toLocalYmd } from '../src/utils/dateRange.js';
import { normalizeJobUrl } from '../src/utils/normalizeUrl.js';

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
