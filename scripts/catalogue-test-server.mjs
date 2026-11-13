// Test-only production build/server. Does not stop or reconfigure the existing dev server.
// Run the ordinary production build again afterwards to restore non-fixture build output.
import { spawn, spawnSync } from 'node:child_process';
const cli = 'node_modules/next/dist/bin/next';
const result = spawnSync(process.execPath, [cli, 'build'], {
  stdio: 'inherit',
  env: process.env,
});
if (result.status !== 0) throw Error('Catalogue test build failed.');
const server = spawn(
  process.execPath,
  [cli, 'start', '--hostname', '127.0.0.1', '--port', '3130'],
  { stdio: 'inherit', env: process.env },
);
server.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
process.on('SIGTERM', () => server.kill());
process.on('SIGINT', () => server.kill());
