self.addEventListener("push", (event) => {
  if (!event.data) return;

  const dados = event.data.json();

  const titulo = dados.title || "GG Barbearia ✂️";

  const opcoes = {
    body: dados.body || "Você recebeu uma nova notificação.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: {
      url: dados.url || "/dashboard",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      titulo,
      opcoes
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url =
    event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});