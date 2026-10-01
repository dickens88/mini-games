/* Offline support for Mini Games.
 *
 * After one online visit, every page, cover and font is kept in the browser,
 * so the whole site opens and plays with no network at all.
 *
 * Adding a new game: add its two files to PRECACHE below and bump VERSION.
 * Changing any file: bump VERSION so returning players fetch the new copy.
 */
var VERSION = 'v1';
var CACHE = 'mini-games-' + VERSION;
var FONT_CACHE = 'mini-games-fonts';   // fonts never change, so they outlive version bumps

var PRECACHE = [
  '/',
  '/privacy.html',
  '/404.html',
  '/manifest.webmanifest',
  '/assets/favicon.png',
  '/games/crystal-sweeper/', '/games/crystal-sweeper/cover.png',
  '/games/sudoku/',          '/games/sudoku/cover.png',
  '/games/freecell/',        '/games/freecell/cover.png',
  '/games/starfall-blocks/', '/games/starfall-blocks/cover.png',
  '/games/potion-sort/',     '/games/potion-sort/cover.png',
  '/games/pop-pals-2048/',   '/games/pop-pals-2048/cover.png'
];

function isFont(url){
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

// a redirected response can't answer a page load, so store a clean copy
// (Cloudflare Pages redirects /privacy.html → /privacy, for example)
function cleanCopy(res){
  if (!res.redirected) return Promise.resolve(res);
  return res.blob().then(function(body){
    return new Response(body, { status:res.status, statusText:res.statusText, headers:res.headers });
  });
}

// the Google Fonts stylesheets the saved pages link to, fetched up front so the
// very first visit already works offline
function fontSheets(cache){
  return Promise.all(PRECACHE.filter(function(p){ return /\/$|\.html$/.test(p); }).map(function(p){
    return cache.match(p).then(function(res){ return res ? res.text() : ''; });
  })).then(function(pages){
    var seen = {};
    pages.join('\n').replace(/href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/g, function(_, href){
      seen[href.replace(/&amp;/g, '&')] = true;
    });
    return Object.keys(seen);
  });
}

function precacheFonts(pageCache){
  return Promise.all([fontSheets(pageCache), caches.open(FONT_CACHE)]).then(function(both){
    var sheets = both[0], cache = both[1];
    return Promise.all(sheets.map(function(href){
      return fetch(href).then(function(res){
        if (!res.ok) return;
        return res.clone().text().then(function(css){
          var files = css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || [];
          return cache.put(href, res).then(function(){
            return Promise.all(files.map(function(f){
              return cache.match(f).then(function(hit){
                if (hit) return;
                return fetch(f, { mode:'cors' }).then(function(r){ if (r.ok) return cache.put(f, r); });
              });
            }));
          });
        });
      }).catch(function(){});
    }));
  });
}

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE).then(function(cache){
      return Promise.all(PRECACHE.map(function(path){
        return fetch(path, { cache:'reload' }).then(function(res){
          if (!res.ok) throw new Error(path + ' → ' + res.status);
          return cleanCopy(res).then(function(r){ return cache.put(path, r); });
        });
      })).then(function(){
        // fonts are a nice-to-have: without them the pages fall back to system fonts
        return precacheFonts(cache);
      });
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if (k !== CACHE && k !== FONT_CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// the cache keys a page might live under: /games/x/, /games/x, /games/x/index.html, /privacy, /privacy.html …
function pageKeys(url){
  var p = url.pathname;
  var keys = [p];
  if (/\/index\.html$/.test(p)) keys.push(p.replace(/index\.html$/, ''));
  else if (/\/$/.test(p)) keys.push(p + 'index.html');
  else if (/\.html$/.test(p)) keys.push(p.replace(/\.html$/, ''));
  else { keys.push(p + '/'); keys.push(p + '.html'); }
  return keys;
}
function matchFirst(keys){
  return caches.open(CACHE).then(function(cache){
    var i = 0;
    function next(){
      if (i >= keys.length) return Promise.resolve(undefined);
      return cache.match(keys[i++], { ignoreSearch:true }).then(function(hit){ return hit || next(); });
    }
    return next();
  });
}

// pages: try the network first so updates show up straight away, fall back to the saved copy
function handlePage(request){
  var url = new URL(request.url);
  return fetch(request).then(function(res){
    // refresh the saved copy, under its precache key so a page is never stored twice
    var key = pageKeys(url).filter(function(k){ return PRECACHE.indexOf(k) >= 0; })[0];
    if (res.ok && key){
      var copy = res.clone();
      cleanCopy(copy).then(function(r){
        return caches.open(CACHE).then(function(cache){ return cache.put(key, r); });
      }).catch(function(){});
    }
    return res;
  }).catch(function(){
    return matchFirst(pageKeys(url)).then(function(hit){
      return hit || matchFirst(['/404.html', '/']);
    });
  });
}

// pictures, manifest: answer from the cache at once and refresh it in the background
function handleAsset(request){
  return caches.open(CACHE).then(function(cache){
    return cache.match(request, { ignoreSearch:true }).then(function(hit){
      var refresh = fetch(request).then(function(res){
        if (res.ok && !res.redirected) cache.put(request, res.clone());
        return res;
      });
      if (hit){ refresh.catch(function(){}); return hit; }
      return refresh;
    });
  });
}

// fonts: once saved they never change
function handleFont(request){
  return caches.open(FONT_CACHE).then(function(cache){
    return cache.match(request).then(function(hit){
      if (hit) return hit;
      return fetch(request).then(function(res){
        if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
        return res;
      });
    });
  });
}

self.addEventListener('fetch', function(event){
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);

  if (isFont(url)){ event.respondWith(handleFont(request)); return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;

  if (request.mode === 'navigate'){ event.respondWith(handlePage(request)); return; }
  event.respondWith(handleAsset(request));
});
