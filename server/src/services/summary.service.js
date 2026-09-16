function valueOrNotSpecified(value) {
  const text = String(value ?? '').trim();
  return text || 'Not specified';
}

function listOrNotSpecified(values) {
  if (typeof values === 'string') {
    const text = values.trim();
    return text || 'Not specified';
  }
  if (!Array.isArray(values) || values.length === 0) return 'Not specified';
  const cleaned = values.map((v) => String(v).trim()).filter(Boolean);
  return cleaned.length ? cleaned.join('; ') : 'Not specified';
}

export function renderSummary(data) {
  return [
    `Job Title: ${valueOrNotSpecified(data.jobTitle)}`,
    '',
    `Company: ${valueOrNotSpecified(data.company)}`,
    '',
    `Salary / Compensation: ${valueOrNotSpecified(data.compensation)}`,
    '',
    `Location: ${valueOrNotSpecified(data.location)}`,
    '',
    `Job Type: ${valueOrNotSpecified(data.jobType)}`,
    '',
    `Technical Skills: ${listOrNotSpecified(data.requiredSkills)}`,
    '',
    `Soft Skills: ${listOrNotSpecified(data.softSkills)}`,
    '',
    `Preferred Skills: ${listOrNotSpecified(data.preferredSkills)}`,
    '',
    `Company Founded: ${valueOrNotSpecified(data.companyFounded)}`,
    '',
    `Approximate Employee Count: ${valueOrNotSpecified(data.approximateEmployeeCount)}`,
    '',
    'What do you know about our company?',
    '',
    valueOrNotSpecified(data.companySummary)
  ].join('\n');
}
