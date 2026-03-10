// Push notification service worker handler
// This file is loaded by the PWA service worker

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a reminder!',
      icon: data.icon || '/icon-512.png',
      badge: data.badge || '/icon-512.png',
      tag: data.tag || 'gbd-reminder',
      vibrate: [200, 100, 200],
      data: data.data || { url: '/' },
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || '⏰ Reminder', options)
    );
  } catch (e) {
    // Fallback for plain text
    event.waitUntil(
      self.registration.showNotification('⏰ Reminder', {
        body: event.data.text(),
        icon: '/icon-512.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});
