// Local synthetic browser fixture only. No production storage, mail, secrets or customer data.
import { createServer } from 'node:http';
const signups = new Map();
let requests = 0;
createServer(async (req,res) => {
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:4333');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.url === '/_fixture' && req.method === 'GET') { res.end(JSON.stringify({ requests,subscriptions:signups.size,sources:[...signups.values()] })); return; }
  if (req.url !== '/api/studio/waitlist' || req.method !== 'POST') { res.writeHead(404); res.end('{}'); return; }
  requests++;
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 2048) { res.writeHead(413); res.end('{}'); return; } }
  const body = JSON.parse(raw);
  if (body.email.startsWith('failure@')) { res.writeHead(503); res.end(JSON.stringify({ error:'Synthetic storage failure' })); return; }
  const identity = `${body.idea}:${body.email.trim().toLowerCase()}`;
  if (!signups.has(identity)) signups.set(identity,body.source);
  res.end(JSON.stringify({ success:true }));
}).listen(4334,'127.0.0.1',() => console.log('Synthetic waitlist fixture on 127.0.0.1:4334'));
