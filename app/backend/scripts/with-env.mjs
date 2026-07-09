import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Usage: node scripts/with-env.mjs <command> [...args]');
  process.exit(1);
}

const envFile = existsSync(resolve('.env')) ? '.env' : '.env.example';
const loadedEnv = existsSync(resolve(envFile)) ? parse(readFileSync(resolve(envFile))) : {};

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...loadedEnv,
    ...process.env,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
