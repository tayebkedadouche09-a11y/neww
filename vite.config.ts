import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const OSM_ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const ALLOWED_CLAUSE = /^(?:amenity|leisure|tourism|shop|natural|sport)="[A-Za-z0-9_|-]+"(?:\[[A-Za-z0-9_:="|~\- ]+\])?$|^(?:amenity|leisure|tourism|shop)~"[A-Za-z0-9_|-]+"$/;
const SAFE_NAME_CLAUSE = /^name~"[A-Za-z0-9 .,_'()&+\-/\u00C0-\u024F\u0600-\u06FF]{1,100}",i$/;
const SAFE_BARE_CLAUSES = new Set(['sport']);

async function readJsonBody(req: import('node:http').IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  try { const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}; }
  catch { return {}; }
}

function devOsmProxy(): Plugin {
  return {
    name: 'vybe-local-osm-discovery',
    configureServer(server) {
      server.middlewares.use('/api/osm-discovery', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode=405; res.setHeader('Allow','POST'); res.end(JSON.stringify({error:'Method not allowed'})); return; }
        const body=await readJsonBody(req); const lat=Number(body.lat); const lng=Number(body.lng); const radiusMeters=Number(body.radiusMeters);
        const clauses=Array.isArray(body.clauses) ? body.clauses.filter((v):v is string=>typeof v==='string' && (ALLOWED_CLAUSE.test(v)||SAFE_NAME_CLAUSE.test(v)||SAFE_BARE_CLAUSES.has(v))).slice(0,6) : [];
        if(!Number.isFinite(lat)||lat<-90||lat>90||!Number.isFinite(lng)||lng<-180||lng>180||!Number.isFinite(radiusMeters)||radiusMeters<=0||radiusMeters>50000||!clauses.length){res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'Invalid discovery request.'}));return;}
        const query=`[out:json][timeout:15];(${clauses.map(c=>`nwr(around:${radiusMeters},${lat},${lng})[${c}];`).join('')});out center tags;`;
        for(const endpoint of OSM_ENDPOINTS){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),7000);try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','User-Agent':'VYBE local discovery proxy/1.0'},body:new URLSearchParams({data:query}),signal:controller.signal});if(response.ok){res.statusCode=200;res.setHeader('Content-Type','application/json');res.end(await response.text());return;}}catch{/* Try next mirror. */}finally{clearTimeout(timeout);}}
        res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'OpenStreetMap is temporarily unavailable. Showing Google results instead.'}));
      });
    },
  };
}

export default defineConfig({ plugins:[react(),devOsmProxy()], build:{rollupOptions:{output:{manualChunks(id){if(!id.includes('node_modules'))return undefined;if(id.includes('leaflet')||id.includes('react-leaflet'))return 'maps';if(id.includes('@supabase'))return 'supabase';if(id.includes('lucide-react')||id.includes('framer-motion'))return 'ui';if(id.includes('react-dom')||id.includes('/react/'))return 'react';return 'vendor';}}}}, server:{port:5173,host:true} });
