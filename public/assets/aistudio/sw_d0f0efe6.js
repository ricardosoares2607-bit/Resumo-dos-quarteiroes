<!-- No <head> do index.html, faça a vinculação ao manifesto -->
<link rel="manifest" href="/manifest.json">

<!-- Antes do fechamento do <body>, registre o Service Worker -->
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
