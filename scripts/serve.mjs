import { createDemoServer } from './demo-server.mjs';

const server = createDemoServer();
server.listen(4173, '127.0.0.1', () => console.log('RefMint demo: http://127.0.0.1:4173'));
