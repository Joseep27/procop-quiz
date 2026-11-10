import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const assets=(await readdir('dist/assets')).map(f=>'./assets/'+f);
const html=await readFile('dist/index.html','utf8');
const version=createHash('sha256').update(html).digest('hex').slice(0,12);
await writeFile('dist/sw.js',`const CACHE='procop-v2-${version}';
const HOME=self.registration.scope;
const ASSETS=['./','./icon.svg',${assets.map(x=>JSON.stringify(x)).join(',')}];

self.addEventListener('install',event=>{
 const files=ASSETS.map(path=>new Request(new URL(path,HOME),{cache:'reload'}));
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(files)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const previous=(await caches.keys()).filter(key=>key.startsWith('procop-')&&key!==CACHE);
  // Recently opened pages may still be requesting the assets from a previous release.
  await Promise.all(previous.slice(0,-2).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});

self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||!request.url.startsWith(HOME))return;
 const path=new URL(request.url).pathname;
 if(path.endsWith('/sw.js'))return;

 if(request.mode==='navigate'){
  const homePath=new URL(HOME).pathname;
  if(path!==homePath&&path!==homePath+'index.html')return;
  event.respondWith(fetch(request,{cache:'no-cache'}).catch(async()=>{
   return await caches.match(HOME,{cacheName:CACHE})||Response.error();
  }));
  return;
 }

 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
`);
