(function () {
  if (!window.AndroidApp) return;

  const entries = [
    ['overview', '总览', '▦'],
    ['character', '人物卡', '♙'],
    ['combat', '战斗', '⚔'],
    ['resources', '资源', '✦'],
    ['ledger', '账本', '☰'],
    ['rules', '规则书', '▤'],
    ['st', 'ST', '♟']
  ];
  const nav = document.createElement('nav');
  nav.className = 'mobile-nav';
  nav.id = 'mobile-nav';
  entries.forEach(([key, label, mark]) => {
    const b = document.createElement('button');
    b.dataset.mobileNav = key;
    b.innerHTML = '<span class="mi">' + mark + '</span><span class="mt">' + label + '</span>';
    b.onclick = () => {
      const target = document.querySelector('[data-nav="' + key + '"]');
      if (target) target.click();
      setActive(key);
      closeRulesDrawer();
      closeMoreMenu();
    };
    nav.appendChild(b);
  });
  document.body.appendChild(nav);

  function setActive(key) {
    nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mobileNav === key));
  }

  let lastActive = '';
  function syncActive() {
    const current = window.__INF && window.__INF.activeView;
    if (current && current !== lastActive) {
      lastActive = current;
      setActive(current);
      closeMoreMenu();
    }
    if (current !== 'rules') closeRulesDrawer();
  }

  let backdrop = null;
  function ensureRulesBackdrop() {
    if (backdrop && backdrop.isConnected) return backdrop;
    const view = document.querySelector('#view-rules');
    if (!view) return null;
    backdrop = document.createElement('div');
    backdrop.className = 'rules-mobile-backdrop';
    backdrop.onclick = closeRulesDrawer;
    // Must live in the same stacking context as the drawer; otherwise the
    // backdrop can sit above the drawer and swallow every touch.
    view.appendChild(backdrop);
    return backdrop;
  }

  function setRulesDrawerTab(tab) {
    const side = document.querySelector('#view-rules .rules-side');
    if (!side) return;
    side.classList.toggle('mobile-tab-toc', tab !== 'library');
    side.classList.toggle('mobile-tab-library', tab === 'library');
    side.querySelectorAll('[data-drawer-tab]').forEach(b => {
      b.classList.toggle('active', b.dataset.drawerTab === tab);
    });
  }

  function ensureDrawerControls() {
    const side = document.querySelector('#view-rules .rules-side');
    if (!side || side.querySelector('.mobile-drawer-head')) return;
    const head = document.createElement('div');
    head.className = 'mobile-drawer-head';
    head.innerHTML =
      '<div class="mobile-drawer-tabs">' +
      '<button data-drawer-tab="toc" class="active">目录</button>' +
      '<button data-drawer-tab="library">书库</button>' +
      '</div><button class="mobile-drawer-close">关闭</button>';
    side.insertBefore(head, side.firstChild);
    head.querySelectorAll('[data-drawer-tab]').forEach(b => {
      b.onclick = () => setRulesDrawerTab(b.dataset.drawerTab);
    });
    head.querySelector('.mobile-drawer-close').onclick = closeRulesDrawer;
    setRulesDrawerTab('toc');
  }

  function openRulesDrawer(tab) {
    const side = document.querySelector('#view-rules .rules-side');
    if (!side) return;
    ensureDrawerControls();
    if (tab) setRulesDrawerTab(tab);
    const shade = ensureRulesBackdrop();
    if (shade) shade.style.display = 'block';
    side.classList.add('mobile-open');
  }

  function closeRulesDrawer() {
    const side = document.querySelector('#view-rules .rules-side');
    if (side) side.classList.remove('mobile-open');
    if (backdrop) backdrop.style.display = 'none';
  }

  window.__toggleRulesDrawer = function () {
    const side = document.querySelector('#view-rules .rules-side');
    if (!side) return;
    if (side.classList.contains('mobile-open')) closeRulesDrawer();
    else openRulesDrawer();
  };

  let lastSearchQuery = '';
  function syncSearchDrawer() {
    if (!window.__INF || window.__INF.activeView !== 'rules') return;
    const q = (window.__INF.ui.rules.searchQuery || '').trim();
    const done = !window.__INF.ui.rules.searching &&
      (window.__INF.ui.rules.results.length > 0 || window.__INF.ui.rules.total > 0);
    if (q && q !== lastSearchQuery && window.__INF.ui.rules.searchActive && done) {
      lastSearchQuery = q;
      openRulesDrawer('toc');
    }
    if (!q) lastSearchQuery = '';
  }

  let scopeInitialized = false;
  function preferBookScope(view) {
    if (scopeInitialized || !view) return;
    const bookTab = view.querySelector('[data-action="set-search-scope"][data-scope="book"]');
    if (!bookTab) return;
    bookTab.click();
    scopeInitialized = true;
  }

  function enhanceRules() {
    if (!window.__INF || window.__INF.activeView !== 'rules') return;
    const view = document.querySelector('#view-rules');
    if (view) view.classList.toggle('mobile-reading', !!window.__INF.ui.rules.pagePath);
    const toolbar = view && view.querySelector('.rules-toolbar');
    if (!toolbar) return;
    preferBookScope(view);
    ensureDrawerControls();
    syncSearchDrawer();
  }

  // Close the drawer after the app has handled the page click. Closing in the
  // capture phase can detach the hit target before the page click is processed.
  document.addEventListener('click', e => {
    if (e.target.closest('#view-rules .toc-label') || e.target.closest('#view-rules .result')) {
      window.setTimeout(closeRulesDrawer, 0);
    }
  }, true);

  let moreButton = null;
  let moreBackdrop = null;
  let moreSheet = null;

  function closeMoreMenu() {
    if (moreBackdrop) moreBackdrop.remove();
    if (moreSheet) moreSheet.remove();
    moreBackdrop = null;
    moreSheet = null;
  }

  function openMoreMenu() {
    closeMoreMenu();
    moreBackdrop = document.createElement('div');
    moreBackdrop.className = 'mobile-more-backdrop';
    moreBackdrop.onclick = closeMoreMenu;
    moreSheet = document.createElement('div');
    moreSheet.className = 'mobile-more-sheet';
    moreSheet.innerHTML = '<div class="mobile-more-title">更多</div>';
    const items = [
      ['check-update', '检查更新'],
      ['changelog-open', '更新目录'],
      ['about-open', '关于'],
      ['help', '帮助'],
      ['reset', '重置当前角色']
    ];
    items.forEach(([action, label]) => {
      const b = document.createElement('button');
      b.className = 'mobile-more-item';
      b.textContent = label;
      b.onclick = () => {
        closeMoreMenu();
        if (action === 'check-update') {
          if (window.AndroidApp && window.AndroidApp.checkUpdate) window.AndroidApp.checkUpdate();
          return;
        }
        const source = document.querySelector('.sidebar [data-action="' + action + '"]');
        if (source) source.click();
      };
      moreSheet.appendChild(b);
    });
    document.body.append(moreBackdrop, moreSheet);
  }

  function ensureMoreButton() {
    if (moreButton) return;
    const right = document.querySelector('.titlebar-right');
    if (!right) return;
    moreButton = document.createElement('button');
    moreButton.className = 'tb-action mobile-more';
    moreButton.type = 'button';
    moreButton.title = '更多';
    moreButton.setAttribute('aria-label', '更多');
    moreButton.textContent = '⋯';
    moreButton.onclick = openMoreMenu;
    const theme = right.querySelector('.theme-toggle');
    right.insertBefore(moreButton, theme || null);
  }

  window.setInterval(() => { syncActive(); enhanceMore(); enhanceRules(); }, 350);
  function enhanceMore() {
    if (window.innerWidth > 760) {
      if (moreButton) { moreButton.remove(); moreButton = null; }
      closeMoreMenu();
      return;
    }
    ensureMoreButton();
  }
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeRulesDrawer();
    enhanceMore();
  });
})();
