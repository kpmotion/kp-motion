/* KP Motion — direct work links and Copy Link context menu.
   Standalone: does not modify content.js, script.js, the gallery, or the video player.
   Files belong next to index.html and category.html. */
(() => {
  'use strict';
  const config = window.KP_CONTENT;
  if (!config) return;
  const WORK_KEY = 'work';
  const PUBLISHED_HOME = 'https://kpmotion.github.io/kp-motion/';
  const $ = selector => document.querySelector(selector);
  const allRefs = () => (config.sectionOrder || Object.keys(config.items || {}))
    .flatMap(section => (config.items?.[section] || [])
      .filter(entry => entry?.file)
      .map(entry => `${section}/${entry.file}`));
  const shortName = value => String(value || '')
    .split('/').pop().replace(/\.[^.]+$/, '');
  const normal = value => String(value || '').normalize('NFKC').trim().toLocaleLowerCase('en');

  function resolveWork(input) {
    if (!input) return null;
    if (normal(input) === 'showreel') return 'showreel';
    const refs = allRefs();
    if (refs.includes(input)) return input;
    const byShortcut = (config.featured || []).find(entry =>
      normal(shortName(entry.shortcut)) === normal(input) && refs.includes(entry.ref));
    if (byShortcut) return byShortcut.ref;
    const candidates = refs.filter(ref => {
      const name = shortName(ref);
      return [name, config.workTitles?.[ref], config.featuredTitles?.[
        (config.featured || []).find(e => e.ref === ref)?.shortcut || ''
      ]].some(v => v && normal(v) === normal(input));
    });
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      // Avoid linking to the wrong work when multiple files share a title.
      return null;
    }
    return null;
  }

  function publicBase() {
    if (location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      return new URL(PUBLISHED_HOME);
    }
    // Homepage and category.html live side by side, including on project Pages.
    return new URL('./', location.href);
  }
  function shareURL(ref, kind) {
    const base = publicBase();
    const result = kind === 'category' ? new URL('category.html', base) : base;
    if (kind === 'category' && ref !== 'showreel') result.searchParams.set('id', ref.split('/')[0]);
    // Unique filenames are human-readable (e.g. ?work=Chartmetric).
    // Ambiguous filenames use the stable section/filename identifier.
    const name = shortName(ref);
    const matches = allRefs().filter(other => normal(shortName(other)) === normal(name));
    result.searchParams.set(WORK_KEY, ref === 'showreel' ? 'showreel' : matches.length === 1 ? name : ref);
    return result.href;
  }
  const isCategoryPage = () => document.body.dataset.page === 'category';
  const currentCategory = () => new URLSearchParams(location.search).get('id');

  function orderedCards(host) {
    if (!host) return [];
    const cols = Array.from(host.children).filter(el => el.classList.contains('masonry-column'));
    if (!cols.length) return Array.from(host.querySelectorAll('.gallery-card'));
    const grouped = cols.map(col => Array.from(col.querySelectorAll('.gallery-card')));
    const totalRows = Math.max(0, ...grouped.map(cards => cards.length));
    const result = [];
    for (let row = 0; row < totalRows; row++) {
      for (const cards of grouped) if (cards[row]) result.push(cards[row]);
    }
    return result;
  }
  function syncWorkIds() {
    const homeCards = orderedCards($('#work-list'));
    const refs = new Set(allRefs());
    const featured = (config.featured || []).filter(entry => refs.has(entry.ref));
    homeCards.forEach((card, i) => {
      if (featured[i]) card.dataset.workId = featured[i].ref;
    });
    const categoryCards = orderedCards($('#category-gallery'));
    const id = currentCategory();
    const entries = (config.items?.[id] || []).filter(item => item?.file);
    categoryCards.forEach((card, i) => {
      if (entries[i]) card.dataset.workId = `${id}/${entries[i].file}`;
    });
    const showreel = $('#showreel-slot .hero-video');
    if (showreel && !showreel.disabled) showreel.dataset.workId = 'showreel';
  }
  let synchronizing = false;
  function scheduleSync() {
    if (synchronizing) return;
    synchronizing = true;
    requestAnimationFrame(() => {
      synchronizing = false;
      syncWorkIds();
    });
  }

  const style = document.createElement('style');
  style.textContent = `
    .work-link-menu { position:fixed; z-index:2200; min-width:148px; padding:5px;
      background:#131819; border:1px solid #3b4446; border-radius:10px;
      box-shadow:0 10px 30px #000b; color:#f4f4f6; }
    .work-link-menu button {display:block;width:100%;margin:0;padding:11px 14px;
      border:0;border-radius:6px;background:transparent;color:inherit;
      font:500 13px/1.2 Inter,Arial,sans-serif;text-align:left;cursor:pointer;}
    .work-link-menu button:hover,.work-link-menu button:focus-visible {
      background:#242d2a;color:#c8ff3d;outline:none;}
    .work-link-toast {position:fixed;z-index:2210;bottom:24px;left:50%;
      transform:translateX(-50%);padding:11px 17px;border-radius:9px;
      background:#151c19;border:1px solid #5a7430;color:#d4fb93;
      font:500 12px Inter,Arial,sans-serif;box-shadow:0 8px 30px #000a;
      pointer-events:none;}
  `;
  document.head.append(style);
  const menu = document.createElement('div');
  menu.className = 'work-link-menu';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  menu.style.display = 'none';
  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.setAttribute('role', 'menuitem');
  copyButton.textContent = 'Copy Link';
  menu.append(copyButton);
  document.body.append(menu);
  let contextRef = null;
  let contextKind = 'home';
  let toastTimer = null;
  const toast = document.createElement('div');
  toast.className = 'work-link-toast';
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  document.body.append(toast);
  function notify(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  }
  function hideMenu() {
    menu.hidden = true;
    menu.style.display = 'none';
    contextRef = null;
  }
  function showMenu(event, card) {
    const ref = card.dataset.workId;
    if (!ref) return;
    event.preventDefault();
    contextRef = ref;
    contextKind = isCategoryPage() ? 'category' : 'home';
    menu.hidden = false;
    menu.style.display = 'block';
    const rect = card.getBoundingClientRect();
    const x = event.clientX || rect.left + 20;
    const y = event.clientY || rect.top + 20;
    const menuW = menu.offsetWidth;
    const menuH = menu.offsetHeight;
    menu.style.left = `${Math.max(6, Math.min(x, innerWidth - menuW - 6))}px`;
    menu.style.top = `${Math.max(6, Math.min(y, innerHeight - menuH - 6))}px`;
    // Keep right-click selection at the point of interaction; keyboard ContextMenu focuses item.
    if (event.clientX === 0 && event.clientY === 0) copyButton.focus();
  }
  async function copyLink(text) {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* fallback */ }
    }
    const input = document.createElement('textarea');
    input.value = text;
    input.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.append(input);
    input.focus(); input.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { /* unsupported */ }
    input.remove();
    return copied;
  }
  copyButton.addEventListener('click', async () => {
    if (!contextRef) return;
    const text = shareURL(contextRef, contextKind);
    hideMenu();
    if (await copyLink(text)) notify('Link copied');
    else {
      // Last-resort selection on browsers that deny clipboard access.
      window.prompt('Copy this link:', text);
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!menu.contains(event.target)) hideMenu();
  });
  document.addEventListener('contextmenu', event => {
    const card = event.target.closest?.('.gallery-card, .hero-video');
    if (card && card.dataset.workId) showMenu(event, card);
    else hideMenu();
  });

  // Preserve existing player logic: a deep link clicks the actual work card.
  // No duplicate modal implementation, video requests or player controls.
  let autoOpening = false;
  let pushedHere = false;
  let closingFromHistory = false;
  let activeRef = null;
  function urlWithWork(ref) {
    const u = new URL(location.href);
    u.searchParams.set(WORK_KEY, ref);
    return u.href;
  }
  function removeWorkParam() {
    const u = new URL(location.href);
    u.searchParams.delete(WORK_KEY);
    history.replaceState(null, '', u.href);
  }
  function requestedRef() {
    return resolveWork(new URL(location.href).searchParams.get(WORK_KEY));
  }
  function findCard(ref) {
    return Array.from(document.querySelectorAll('.gallery-card[data-work-id], .hero-video[data-work-id]'))
      .find(card => card.dataset.workId === ref);
  }
  function openFromURL() {
    const ref = requestedRef();
    if (!ref) return;
    syncWorkIds();
    const card = findCard(ref);
    if (card) {
      if (activeRef === ref && !$('#video-modal')?.hidden) return;
      autoOpening = true;
      card.click(); // invokes site's own openVideo, including descriptions if configured
      autoOpening = false;
      activeRef = ref;
      return;
    }
    // The work exists but is not Featured; open its category and then its player.
    if (ref !== 'showreel' && !isCategoryPage()) {
      const u = new URL('category.html', location.href);
      u.searchParams.set('id', ref.split('/')[0]);
      u.searchParams.set(WORK_KEY, ref);
      location.replace(u.href);
    } else if (ref !== 'showreel' && isCategoryPage() && currentCategory() !== ref.split('/')[0]) {
      const u = new URL(location.href);
      u.searchParams.set('id', ref.split('/')[0]);
      location.replace(u.href);
    } else if (ref === 'showreel' && isCategoryPage()) {
      const u = new URL('./', location.href);
      u.searchParams.set(WORK_KEY, ref);
      location.replace(u.href);
    }
  }

  function closeLinkState() {
    if (closingFromHistory || !new URL(location.href).searchParams.has(WORK_KEY)) return;
    activeRef = null;
    if (pushedHere && history.state?.kpWorkLink === true) {
      pushedHere = false;
      history.back();
    } else {
      removeWorkParam();
    }
  }
  document.addEventListener('click', event => {
    const card = event.target.closest?.('.gallery-card[data-work-id], .hero-video[data-work-id]');
    if (!card || card.disabled || autoOpening) return;
    const ref = card.dataset.workId;
    activeRef = ref;
    if (requestedRef() !== ref) {
      history.pushState({kpWorkLink:true}, '', urlWithWork(ref));
      pushedHere = true;
    }
  }, true); // capture: URL is updated before original video-open listener

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!menu.hidden) {
      hideMenu();
      return;
    }
    // Main script's Escape listener executes first and closes the video.
    if ($('#video-modal')?.hidden) closeLinkState();
  });
  $('#video-modal')?.addEventListener('click', event => {
    if (event.target === $('#video-modal') || event.target?.dataset.close === 'true') {
      // Main script's delegated click listener closes the modal first.
      if ($('#video-modal')?.hidden) closeLinkState();
    }
  });
  window.addEventListener('popstate', () => {
    closingFromHistory = true;
    const ref = requestedRef();
    const modal = $('#video-modal');
    if (!ref) {
      if (modal && !modal.hidden) {
        document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
      }
      activeRef = null;
      pushedHere = false;
    } else {
      pushedHere = false;
      if (ref !== activeRef || modal?.hidden) openFromURL();
    }
    closingFromHistory = false;
  });

  function start() {
    syncWorkIds();
    for (const id of ['work-list','category-gallery','showreel-slot']) {
      const host = document.getElementById(id);
      if (host) new MutationObserver(scheduleSync).observe(host,{childList:true,subtree:true});
    }
    // Ensure direct links work after synchronous gallery rendering on initial page load.
    openFromURL();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
