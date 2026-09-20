const CACHE =
  "la-red-padel-v5";

self.addEventListener(
  "install",
  (event) => {
    self.skipWaiting();

    event.waitUntil(
      caches
        .open(CACHE)
        .then(
          (cache) =>
            cache.addAll([
              "/",
              "/manifest.webmanifest",
            ])
        )
    );
  }
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      Promise.all([
        caches
          .keys()
          .then(
            (keys) =>
              Promise.all(
                keys
                  .filter(
                    (key) =>
                      key !==
                      CACHE
                  )
                  .map(
                    (key) =>
                      caches.delete(
                        key
                      )
                  )
              )
          ),

        self.clients.claim(),
      ])
    );
  }
);

self.addEventListener(
  "fetch",
  (event) => {
    if (
      event.request.method !==
      "GET"
    ) {
      return;
    }

    const url =
      new URL(
        event.request.url
      );

    if (
      url.origin !==
      self.location.origin
    ) {
      return;
    }

    if (
      url.pathname.startsWith(
        "/api/"
      )
    ) {
      return;
    }

    event.respondWith(
      fetch(
        event.request
      ).catch(
        async () => {
          const cached =
            await caches.match(
              event.request
            );

          if (cached) {
            return cached;
          }

          if (
            event.request.mode ===
            "navigate"
          ) {
            const home =
              await caches.match(
                "/"
              );

            if (home) {
              return home;
            }
          }

          return new Response(
            "Sin conexión",
            {
              status: 503,
              statusText:
                "Service Unavailable",
              headers: {
                "Content-Type":
                  "text/plain; charset=utf-8",
              },
            }
          );
        }
      )
    );
  }
);
