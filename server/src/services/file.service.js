import path from 'node:path';
import { access, mkdir, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(here, '../../uploads');

async function exists(fullPath) {
  try {
    await access(fullPath);
    return true;
  } catch {
    return false;
  }
}

export async function uniqueFileName(fileName) {
  const ext = path.extname(fileName) || '.txt';
  const base = path.basename(fileName, ext);
  let candidate = fileName;
  let n = 2;
  while (await exists(path.join(uploadsDir, candidate))) {
    candidate = `${base}-${n}${ext}`;
    n += 1;
  }
  return candidate;
}

export async function saveSummaryFile(fileName, content) {
  await mkdir(uploadsDir, { recursive: true });
  const name = await uniqueFileName(fileName);
  const fullPath = path.join(uploadsDir, name);
  await writeFile(fullPath, content, 'utf8');
  return { fullPath, fileName: name };
}

export async function renameSummaryFile(currentPath, nextFileName) {
  await mkdir(uploadsDir, { recursive: true });
  if (path.basename(currentPath) === nextFileName) {
    return { fullPath: currentPath, fileName: nextFileName };
  }
  const name = await uniqueFileName(nextFileName);
  const nextPath = path.join(uploadsDir, name);
  await rename(currentPath, nextPath);
  return { fullPath: nextPath, fileName: name };
}

export { uploadsDir };
