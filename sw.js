/* Offline support for Mini Games.
 *
 * After one online visit, every page, cover and font is kept in the browser,
 * so the whole site opens and plays with no network at all.
 *
 * Adding a new game: add its page and cover (and, for a multi-file game, every
 * script and stylesheet) to PRECACHE below and bump VERSION.
 * Changing any file: bump VERSION so returning players fetch the new copy.
 */
var VERSION = 'v9';
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
  '/games/pop-pals-2048/',   '/games/pop-pals-2048/cover.png',
  '/games/dice-quest/',      '/games/dice-quest/cover.png',
  '/games/dice-quest/js/render/avatars.js', '/games/dice-quest/img/avatars/rabbit.webp',
  '/games/dice-quest/img/avatars/tiger.webp', '/games/dice-quest/img/avatars/fox.webp',
  '/games/dice-quest/img/avatars/redpanda.webp', '/games/dice-quest/img/avatars/panda.webp',
  '/games/dice-quest/js/audio.js', '/games/dice-quest/js/config.js',
  '/games/dice-quest/js/core/events.js', '/games/dice-quest/js/core/items.js',
  '/games/dice-quest/js/core/map.js', '/games/dice-quest/js/core/rng.js',
  '/games/dice-quest/js/core/rules.js', '/games/dice-quest/js/core/state.js',
  '/games/dice-quest/js/core/turn.js', '/games/dice-quest/js/data/items.js',
  '/games/dice-quest/js/data/maps/index.js', '/games/dice-quest/js/data/maps/jungle.js',
  '/games/dice-quest/js/data/maps/sea.js', '/games/dice-quest/js/data/maps/space.js',
  '/games/dice-quest/js/main.js', '/games/dice-quest/js/render/anim.js',
  '/games/dice-quest/js/render/board-art.js', '/games/dice-quest/js/render/kit.js',
  '/games/dice-quest/js/render/renderer.js', '/games/dice-quest/js/render/themes/index.js',
  '/games/dice-quest/js/render/themes/jungle.js', '/games/dice-quest/js/render/themes/sea.js',
  '/games/dice-quest/js/render/themes/space.js', '/games/dice-quest/js/save.js',
  '/games/dice-quest/js/strings.js', '/games/dice-quest/js/ui/dice.js',
  '/games/dice-quest/js/ui/hud.js', '/games/dice-quest/js/ui/input.js',
  '/games/dice-quest/js/ui/overlay.js', '/games/dice-quest/js/ui/screens.js',
  '/games/dice-quest/style.css',
  '/games/garden-guard/', '/games/garden-guard/cover.png',
  '/games/garden-guard/js/audio.js', '/games/garden-guard/js/config.js',
  '/games/garden-guard/js/core/combat.js', '/games/garden-guard/js/core/commands.js',
  '/games/garden-guard/js/core/events.js', '/games/garden-guard/js/core/path.js',
  '/games/garden-guard/js/core/rng.js', '/games/garden-guard/js/core/sim.js',
  '/games/garden-guard/js/core/state.js', '/games/garden-guard/js/core/targeting.js',
  '/games/garden-guard/js/core/towers.js', '/games/garden-guard/js/core/waves.js',
  '/games/garden-guard/js/data/enemies/bugs.js', '/games/garden-guard/js/data/levels/ch1.js',
  '/games/garden-guard/js/data/levels/ch2.js', '/games/garden-guard/js/data/powers.js',
  '/games/garden-guard/js/data/registry.js', '/games/garden-guard/js/data/towers/cactus.js',
  '/games/garden-guard/js/data/towers/melon.js', '/games/garden-guard/js/data/towers/mint.js',
  '/games/garden-guard/js/data/towers/pea.js', '/games/garden-guard/js/data/towers/sunflower.js',
  '/games/garden-guard/js/main.js', '/games/garden-guard/js/render/ambient.js',
  '/games/garden-guard/js/render/anim.js', '/games/garden-guard/js/render/background.js',
  '/games/garden-guard/js/render/kit.js', '/games/garden-guard/js/render/particles.js',
  '/games/garden-guard/js/render/renderer.js', '/games/garden-guard/js/render/sprites/enemy-sprites.js',
  '/games/garden-guard/js/render/sprites/power-sprites.js', '/games/garden-guard/js/render/sprites/tower-sprites.js',
  '/games/garden-guard/js/save.js', '/games/garden-guard/js/strings.js',
  '/games/garden-guard/js/ui/build-panel.js', '/games/garden-guard/js/ui/hud.js',
  '/games/garden-guard/js/ui/input.js', '/games/garden-guard/js/ui/modals.js',
  '/games/garden-guard/js/ui/powers.js', '/games/garden-guard/js/ui/tower-panel.js',
  '/games/garden-guard/style.css',
  '/games/bubble-buddies/', '/games/bubble-buddies/cover.png',
  '/games/bubble-buddies/js/audio.js', '/games/bubble-buddies/js/config.js',
  '/games/bubble-buddies/js/core/game.js', '/games/bubble-buddies/js/core/grid.js',
  '/games/bubble-buddies/js/core/match.js', '/games/bubble-buddies/js/core/rng.js',
  '/games/bubble-buddies/js/core/shot.js', '/games/bubble-buddies/js/data/levels.js',
  '/games/bubble-buddies/js/main.js', '/games/bubble-buddies/js/render/background.js',
  '/games/bubble-buddies/js/render/buddy.js', '/games/bubble-buddies/js/render/fx.js',
  '/games/bubble-buddies/js/render/dragon.js',
  '/games/bubble-buddies/img/dragon/body.svg', '/games/bubble-buddies/img/dragon/shade.svg',
  '/games/bubble-buddies/img/dragon/foot-l.svg', '/games/bubble-buddies/img/dragon/foot-r.svg',
  '/games/bubble-buddies/img/dragon/paw-l.svg', '/games/bubble-buddies/img/dragon/paw-r.svg',
  '/games/bubble-buddies/img/dragon/eyes.svg',
  '/games/bubble-buddies/js/render/launcher.js', '/games/bubble-buddies/js/render/renderer.js',
  '/games/bubble-buddies/js/save.js', '/games/bubble-buddies/js/ui/hud.js',
  '/games/bubble-buddies/js/ui/overlay.js', '/games/bubble-buddies/js/ui/screens.js',
  '/games/bubble-buddies/style.css',
  '/games/rally-pals/', '/games/rally-pals/cover.png',
  '/games/rally-pals/js/audio.js', '/games/rally-pals/js/config.js',
  '/games/rally-pals/js/core/ai.js', '/games/rally-pals/js/core/match.js',
  '/games/rally-pals/js/core/physics.js', '/games/rally-pals/js/core/player.js',
  '/games/rally-pals/js/core/rng.js', '/games/rally-pals/js/core/score.js',
  '/games/rally-pals/js/core/shot.js', '/games/rally-pals/js/data/courts.js',
  '/games/rally-pals/js/data/pals.js', '/games/rally-pals/js/data/powerups.js',
  '/games/rally-pals/js/main.js', '/games/rally-pals/js/render/courts.js',
  '/games/rally-pals/js/render/fx.js', '/games/rally-pals/js/render/icons.js',
  '/games/rally-pals/js/render/pals.js', '/games/rally-pals/js/render/renderer.js',
  '/games/rally-pals/js/save.js', '/games/rally-pals/js/ui/effects.js',
  '/games/rally-pals/js/ui/hud.js', '/games/rally-pals/js/ui/input.js',
  '/games/rally-pals/js/ui/overlay.js', '/games/rally-pals/js/ui/screens.js',
  '/games/rally-pals/style.css',
  '/games/meteor-math/', '/games/meteor-math/cover.png',
  '/games/meteor-math/img/dragon/body.svg', '/games/meteor-math/img/dragon/eyes.svg',
  '/games/meteor-math/img/dragon/foot-l.svg', '/games/meteor-math/img/dragon/foot-r.svg',
  '/games/meteor-math/img/dragon/paw-l.svg', '/games/meteor-math/img/dragon/paw-r.svg',
  '/games/meteor-math/img/dragon/shade.svg', '/games/meteor-math/js/audio.js',
  '/games/meteor-math/js/config.js', '/games/meteor-math/js/core/facts.js',
  '/games/meteor-math/js/core/game.js', '/games/meteor-math/js/core/placement.js',
  '/games/meteor-math/js/core/rng.js', '/games/meteor-math/js/data/heroes.js',
  '/games/meteor-math/js/data/powerups.js', '/games/meteor-math/js/render/hero.js',
  '/games/meteor-math/js/render/pals.js',
  '/games/meteor-math/js/data/worlds.js', '/games/meteor-math/js/main.js',
  '/games/meteor-math/js/render/dragon.js', '/games/meteor-math/js/render/fx.js',
  '/games/meteor-math/js/render/renderer.js', '/games/meteor-math/js/render/themes.js',
  '/games/meteor-math/js/render/things.js', '/games/meteor-math/js/save.js',
  '/games/meteor-math/js/ui/keypad.js', '/games/meteor-math/js/ui/overlay.js',
  '/games/meteor-math/js/ui/screens.js', '/games/meteor-math/style.css'
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
