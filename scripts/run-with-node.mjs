// Keep npm commands on the runtime required by package.json, including when an
// older Windows terminal has Node 20 ahead of the project-local Node 24 in PATH.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [entry, ...args] = process.argv.slice(2);
let runtime = process.execPath;
if (Number(process.versions.node.split('.')[0]) < 24) {
  const localRuntime = path.join(
    root,
    '.tools/node_modules/node/bin',
    process.platform === 'win32' ? 'node.exe' : 'node',
  );
  const probe = existsSync(localRuntime)
    ? spawnSync(localRuntime, ['--version'], { encoding: 'utf8' })
    : null;
  if (
    probe?.status !== 0 ||
    !/^v(?:2[4-9]|[3-9]\d)\./.test(probe.stdout.trim())
  ) {
    console.error(
      'GELIN HOUSE requires Node.js 24 or newer. Switch Node versions and reopen your terminal, then run npm ci. See .nvmrc.',
    );
    process.exit(1);
  }
  runtime = localRuntime;
  console.info(`GELIN HOUSE: using project-local Node ${probe.stdout.trim()}.`);
}
if (!entry) {
  console.error('Pass the Node entry point to run.');
  process.exit(1);
}
const child = spawn(runtime, [path.resolve(root, entry), ...args], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${path.dirname(runtime)}${path.delimiter}${process.env.PATH ?? ''}`,
  },
});
child.on('error', (error) => {
  console.error(`Unable to start the project command (${error.code}).`);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
