import { createDemoServer } from './demo-server.mjs';

const server = createDemoServer();
const port = Number(process.env.REFMINT_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('REFMINT_PORT must be 1–65535');
server.listen(port, '127.0.0.1', () => console.log(`RefMint demo: http://127.0.0.1:${port}`));
