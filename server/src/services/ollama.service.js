const schema = {
  type: 'object',
  properties: {
    jobTitle: { type: 'string' },
    company: { type: 'string' },
    compensation: { type: 'string' },
    location: { type: 'string' },
    jobType: { type: 'string' },
    primaryLanguage: { type: 'string' },
    primaryTechnology: { type: 'string' },
    requiredSkills: { type: 'array', items: { type: 'string' } },
    preferredSkills: { type: 'array', items: { type: 'string' } },
    companyFounded: { type: 'string' },
    approximateEmployeeCount: { type: 'string' },
    companySummary: { type: 'string' }
  },
  required: [
    'jobTitle', 'company', 'compensation', 'location', 'jobType',
    'primaryLanguage', 'primaryTechnology', 'requiredSkills',
    'preferredSkills', 'companyFounded', 'approximateEmployeeCount',
    'companySummary'
  ],
  additionalProperties: false
};

const instructions = `You are an expert job-description analyzer.

The job description is the primary source. Extract only defensible facts. Do not invent missing information. Do not use outside knowledge to fill gaps.

Accurately distinguish:
- Required skills from preferred or bonus skills.
- Core technologies from incidental tools.
- Compensation from unrelated financial figures.
- Job location from company headquarters.
- Employment type from working schedule.
- Primary technology from the broader tech stack.

Field rules:
- compensation: salary, hourly rate, range, equity, bonus, contract terms, expected hours, or "Not specified".
- location: remote/hybrid/on-site status, city/state/country, geographic restrictions, timezone or working-hour requirements when stated.
- jobType: full-time, part-time, contract, internship, temporary, 1099, W-2, etc.
- primaryLanguage: the single most important programming language, or "Not specified". Never list more than one.
- primaryTechnology: the single most important platform, framework, product, or technology emphasized by the role, or "Not specified". Never list more than one.
- requiredSkills: concise list of genuinely required or clearly expected skills, languages, frameworks, databases, APIs, platforms, responsibilities, and technical competencies.
- preferredSkills: preferred, bonus, nice-to-have, or secondary technologies and skills. Empty array if none are given.
- companyFounded: year only if stated in the job description, otherwise "Not specified".
- approximateEmployeeCount: range/count only if stated in the job description, otherwise "Not specified".
- companySummary: one concise interview-ready paragraph based only on the job description: what the company does, who it serves, its products/services, business model or market position when available, and how this role supports the company's work. If the posting does not describe the company, return "Not specified". No citations, source lists, or markdown.

If a required field is not stated in the job description, return "Not specified". Do not guess.

Keep arrays concise, de-duplicated, and information-dense. Do not add resume advice, application advice, introductions, or process explanations.
Return only the JSON object.`;

function withDefaults(data) {
  const source = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const notSpecified = (value) => {
    const text = String(value ?? '').trim();
    return text || 'Not specified';
  };
  return {
    jobTitle: notSpecified(source.jobTitle),
    company: notSpecified(source.company),
    compensation: notSpecified(source.compensation),
    location: notSpecified(source.location),
    jobType: notSpecified(source.jobType),
    primaryLanguage: notSpecified(source.primaryLanguage),
    primaryTechnology: notSpecified(source.primaryTechnology),
    requiredSkills: Array.isArray(source.requiredSkills) ? source.requiredSkills.filter(Boolean) : [],
    preferredSkills: Array.isArray(source.preferredSkills) ? source.preferredSkills.filter(Boolean) : [],
    companyFounded: notSpecified(source.companyFounded),
    approximateEmployeeCount: notSpecified(source.approximateEmployeeCount),
    companySummary: notSpecified(source.companySummary)
  };
}

function parseJsonContent(content) {
  if (Array.isArray(content)) {
    content = content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('');
  }
  if (content && typeof content === 'object') return content;
  const raw = String(content ?? '').trim();
  if (!raw) throw new Error('Ollama returned no structured output');
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Ollama returned output that was not valid JSON');
    return JSON.parse(match[0]);
  }
}

function ollamaError(error, baseUrl, model, userSignal) {
  const cause = error.cause?.code || error.cause?.message || error.message;
  if (userSignal?.aborted) {
    const stopped = new Error('Stopped.');
    stopped.name = 'AbortError';
    return stopped;
  }
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return new Error(`Ollama timed out after waiting for ${model}`);
  }
  if (error.cause?.code === 'ECONNRESET' || /fetch failed|ECONNRESET|ECONNREFUSED/i.test(String(cause))) {
    return new Error(`Cannot reach Ollama at ${baseUrl} (${cause}). If Ollama is running, the model may still be loading — try again.`);
  }
  return new Error(`Ollama request failed: ${error.message}`);
}

function isRetryable(message) {
  return /Cannot reach Ollama|ECONNRESET|fetch failed|model may still be loading|out-of-memory|failed to allocate|unable to allocate|ErrorOutOfDeviceMemory|Vulkan|llama-server process has terminated|0xc0000409|projector CPU offload/i.test(message);
}

function isGpuMemoryError(message) {
  return /out-of-memory|ErrorOutOfDeviceMemory|Vulkan|failed to allocate|unable to allocate|0xc0000409|projector CPU offload/i.test(message);
}

async function chat(baseUrl, body, timeoutMs, userSignal) {
  const signal = userSignal
    ? AbortSignal.any([AbortSignal.timeout(timeoutMs), userSignal])
    : AbortSignal.timeout(timeoutMs);
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Ollama request failed (${response.status})`);
  }
  if (payload.error) throw new Error(payload.error);
  return payload;
}

async function unloadModel(baseUrl, model) {
  await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, keep_alive: 0 }),
    signal: AbortSignal.timeout(15000)
  }).catch(() => {});
}

export async function analyzeJob({ pageText, jobUrl, signal } = {}) {
  const baseUrl = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  const model = process.env.OLLAMA_MODEL || 'qwen3.5:4b';
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 180000);
  let numCtx = Math.max(2048, Number(process.env.OLLAMA_NUM_CTX || 4096));
  const gpuEnv = process.env.OLLAMA_NUM_GPU;
  let numGpu = gpuEnv === undefined || gpuEnv === '' ? null : Number(gpuEnv);
  const input = `Source URL: ${jobUrl}\n\nJOB PAGE TEXT:\n${pageText}`;

  function buildBody() {
    const options = { temperature: 0, num_ctx: numCtx };
    if (Number.isFinite(numGpu)) options.num_gpu = numGpu;
    return {
      model,
      stream: false,
      think: false,
      keep_alive: '5m',
      format: schema,
      options,
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: input }
      ]
    };
  }

  if (numGpu === 0) await unloadModel(baseUrl, model);

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (signal?.aborted) {
      const stopped = new Error('Stopped.');
      stopped.name = 'AbortError';
      throw stopped;
    }
    try {
      const payload = await chat(baseUrl, buildBody(), timeoutMs, signal);
      const content = payload.message?.content || payload.message?.thinking || payload.response;
      return withDefaults(parseJsonContent(content));
    } catch (error) {
      lastError = error.status || error.statusCode ? error : ollamaError(error, baseUrl, model, signal);
      if (lastError.name === 'AbortError') throw lastError;
      if (!isRetryable(lastError.message) || attempt === 3) throw lastError;
      await unloadModel(baseUrl, model);
      if (isGpuMemoryError(lastError.message)) {
        numGpu = 0;
        numCtx = Math.min(numCtx, 4096);
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
  throw lastError;
}
