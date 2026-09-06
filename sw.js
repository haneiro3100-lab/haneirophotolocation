const CACHE_NAME='event-flow-shell-v1';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./pwa-icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>Promise.allSettled(APP_SHELL.map(url=>cache.add(url)))));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
    return response;
  }).catch(async()=>{
    const cached=await caches.match(request);
    if(cached)return cached;
    if(request.mode==='navigate')return (await caches.match('./'))||(await caches.match('./index.html'));
    return Response.error();
  }));
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?.json()||{};}catch{data={body:event.data?.text()||''};}
  const title=String(data.title||'Event Flow');
  const options={
    body:String(data.body||'次のキューを確認してください。'),
    icon:'./icon-192.png',
    badge:'./icon-192.png',
    tag:String(data.tag||data.scheduleKey||'event-flow'),
    renotify:false,
    data:{url:String(data.url||'./')}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'./',self.location.href).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
    const existing=windows.find(client=>client.url===target);
    return existing?existing.focus():clients.openWindow(target);
  }));
});
