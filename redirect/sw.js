// Service worker killer — reemplaza el SW de la PWA anterior
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', async () => {
  // Borra todos los caches
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  // Se desregistra a sí mismo
  await self.registration.unregister();
  // Recarga todos los tabs abiertos en este dominio
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(c => c.navigate(c.url));
});
