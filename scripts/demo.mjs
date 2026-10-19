import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(readFileSync(new URL('../kite.config.json', import.meta.url), 'utf8'));
const envArgs = existsSync(new URL('../.env', import.meta.url)) ? ['--env-file=.env'] : [];
const children = new Set();
let stopping = false;

function stop(code) {
    if (stopping) return;
    stopping = true;
    process.exitCode = code;
    for (const child of children) child.kill('SIGTERM');
    const timeout = setTimeout(() => {
        for (const child of children) child.kill('SIGKILL');
    }, 3000);
    timeout.unref();
}

function launch(label, file) {
    const child = spawn(process.execPath, [...envArgs, '--import', 'tsx', file], { cwd, stdio: 'inherit' });
    children.add(child);
    child.on('error', error => {
        console.error(`${label} could not start: ${error.message}`);
        children.delete(child);
        stop(1);
    });
    child.on('exit', (code, signal) => {
        children.delete(child);
        if (!stopping) {
            console.error(`${label} stopped (${signal || code}). Stopping the demo.`);
            stop(code || 1);
        }
    });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
launch('Mock microservices', 'examples/mock-backend.ts');
launch('KITE gateway', 'src/index.ts');
console.log(`\nKITE demo: http://localhost:${config.gateway.adminPort}`);
console.log('Once both servers are listening, open the Request Playground sidebar tab.');
console.log('Mock microservices: Users :4001 · Products :4002 · Orders :4003');
console.log('Press Ctrl+C to stop the gateway and all three microservices.\n');
