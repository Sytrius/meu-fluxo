(function (root) {
  'use strict';

  let ads;
  let unavailable = false;
  let queued = false;
  let lastSlot = '';

  function send(slot) {
    const serialized = JSON.stringify(slot);
    if (serialized === lastSlot) return;
    lastSlot = serialized;
    ads.setSlot(slot).catch(() => {
      unavailable = true;
      sync();
    });
  }

  function sync() {
    if (!ads) return;
    const band = document.getElementById('home-ad-band');
    const canShow = band && !unavailable && navigator.onLine && !document.hidden
      && matchMedia('(max-width:850px)').matches && innerWidth >= 320
      && (root.visualViewport?.scale ?? 1) <= 1.01
      && !document.querySelector('#overlay .modal, .mobile-more[open], #profile-popover:not([hidden])');
    if (band) band.hidden = !canShow;
    document.documentElement.classList.toggle('has-home-ad', Boolean(canShow));
    if (!canShow) {
      send({ visible: false });
      return;
    }
    const bounds = band.lastElementChild.getBoundingClientRect();
    send({ visible: true, x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height, viewport: innerWidth });
  }

  function queueSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      sync();
    });
  }

  async function openPrivacy() {
    if (!ads) return;
    const result = await ads.openPrivacy();
    if (result?.status === 'test') uiToast('Esta versão usa anúncios de teste.');
    if (result?.status === 'notRequired') uiToast('O Google não disponibilizou opções de privacidade para esta sessão.');
  }

  root.MeuFluxoHomeAds = { sync, openPrivacy };
  root.addEventListener('DOMContentLoaded', async () => {
    if (!root.MeuFluxoNative?.available || !root.MeuFluxoNative.homeAds) return;
    ads = root.MeuFluxoNative.homeAds;
    try {
      await ads.addListener('bannerUnavailable', () => {
        unavailable = true;
        sync();
      });
      await ads.addListener('privacyUpdated', result => {
        unavailable = !result.allowed;
        lastSlot = '';
        sync();
      });
    } catch {
      ads = null;
      return;
    }
    const changes = new MutationObserver(sync);
    changes.observe(document.getElementById('app'), { childList: true });
    changes.observe(document.getElementById('overlay'), { childList: true });
    document.addEventListener('toggle', sync, true);
    document.addEventListener('visibilitychange', sync);
    root.addEventListener('online', sync);
    root.addEventListener('offline', sync);
    root.addEventListener('resize', queueSync);
    root.visualViewport?.addEventListener('resize', queueSync);
    sync();
  }, { once: true });
})(globalThis);
