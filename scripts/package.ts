import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
if (existsSync(dist)) rmSync(dist, { recursive: true });
execSync('npm run build', { stdio: 'inherit' });

const zipPath = resolve(dist, 'yt-voice.zip');
if (existsSync(zipPath)) rmSync(zipPath);

execSync(`(cd ${dist} && zip -r yt-voice.zip . -x "yt-voice.zip")`, { stdio: 'inherit', shell: '/bin/bash' });
console.log(`Wrote ${zipPath}`);
