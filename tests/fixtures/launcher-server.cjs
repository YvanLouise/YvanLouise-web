const http = require('node:http');
const [port, service, workspace, mode = 'ready'] = process.argv.slice(2);
if (mode === 'exit') process.exit(7);
const server = http.createServer((_req, res) => {
  if (mode === 'hang') return;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ service, workspace, localAdmin: true, protocol: 1 }));
});
setTimeout(() => server.listen(Number(port), '127.0.0.1'), mode === 'slow' ? 600 : 0);
