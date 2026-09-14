import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const target = process.env.TUNNEL_TARGET || 'http://127.0.0.1:5173';
const apiBaseFile = path.join(root, 'extension', 'api-base.js');

async function waitForTarget() {
  const url = new URL(target);
  for (let i = 0; i < 60; i += 1) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(1500) });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Nothing is listening on ${target}. Start npm run dev first.`);
}

function writeConfig(publicUrl) {
  const js = `globalThis.JOB_TRACKER_PUBLIC_URL = ${JSON.stringify(publicUrl)};\n`;
  return writeFile(apiBaseFile, js, 'utf8');
}

await waitForTarget();
await writeConfig('');

const child = spawn('npx', ['--yes', 'cloudflared', 'tunnel', '--url', target], {
  cwd: root,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

let found = '';
function onChunk(buf) {
  const text = buf.toString();
  process.stdout.write(text);
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (match && found !== match[0]) {
    found = match[0];
    writeConfig(found).catch(console.error);
    console.log(`\nIXBROWSER DASHBOARD: ${found}`);
    console.log(`Reload the Chrome extension after this URL appears.\n`);
  }
}

child.stdout.on('data', onChunk);
child.stderr.on('data', onChunk);
child.on('exit', (code) => {
  writeConfig('').catch(() => {});
  process.exit(code ?? 1);
});
