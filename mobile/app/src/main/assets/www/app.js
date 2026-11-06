(function () {
  'use strict';
  const D = window.APP_DATA;
  const C = window.Calc;
  const COMPACT = () => window.matchMedia('(max-width: 760px)').matches;
  const STORAGE_KEY = 'infinite-terminal/character/v1';
  const PROFILES_KEY = 'infinite-terminal/characters/v1';
  const TEXTAREA_SIZES_KEY = 'infinite-terminal/textarea-sizes/v1';
  const ST_KEY = 'infinite-terminal/st-tool/v1';
  const DISPLAY_KEY = 'infinite-terminal/display/v1';
  const FAVORITES_KEY = 'infinite-terminal/rules-favorites/v1';
  const UI_ZOOM_KEY = 'infinite-terminal/ui-zoom/v1';
  const READER_ZOOM_KEY = 'infinite-terminal/reader-zoom/v1';
  const FONT_ZOOM_KEY = 'infinite-terminal/font-zoom/v1';
  const HAS_UI_ZOOM = !!(window.chrome && window.chrome.webview);
  const LEDGER_UI_KEY = 'infinite-terminal/ledger-ui/v1';
  let ledgerDrag = null;
  let favorites = loadFavorites();

  function loadFavorites() {
    try {
      const data = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      return Array.isArray(data) ? data.filter(f => f && f.id && f.bookKey && f.path) : [];
    } catch (e) { return []; }
  }

  function saveFavorites() {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); } catch (e) { }
  }
  const DISPLAY_DEFAULTS = {
    dark: { brightness: 100, contrast: 100, grayscale: 0 },
    light: { brightness: 94, contrast: 92, grayscale: 8 }
  };
  let displaySettings = loadDisplaySettings();

  function loadDisplaySettings() {
    try {
      const raw = localStorage.getItem(DISPLAY_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        return {
          dark: Object.assign({}, DISPLAY_DEFAULTS.dark, data.dark || {}),
          light: Object.assign({}, DISPLAY_DEFAULTS.light, data.light || {})
        };
      }
    } catch (e) { }
    return JSON.parse(JSON.stringify(DISPLAY_DEFAULTS));
  }
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 21c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><circle cx="17" cy="9" r="2.7"/><path d="M15.5 14.3c2.9.2 5.5 1.9 6 5.2"/>',
    sword: '<path d="M14.5 3.5 21 3l-.5 6.5L9 21l-3-3L17.5 6.5"/><path d="m6 15 3 3"/><path d="M3 21l3-3"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/><circle cx="12" cy="12" r="3"/>',
    coin: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22V4.5Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M8 7h8M8 11h5"/>',
    upload: '<path d="M12 16V4M8 8l4-4 4 4"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>',
    download: '<path d="M12 4v12M8 12l4 4 4-4"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.3M20 4v7h-7"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    shield: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/>',
    heart: '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
    save: '<path d="M5 3h12l3 3v15H4V3h1Z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h6M14 17h6"/><circle cx="16" cy="7" r="2"/><circle cx="12" cy="17" r="2"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>'
  };
  const ic = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  const EFFECT_TIPS = {
    flatfooted: '该情形下的防御总值：去掉基础防御、闪避、洞察和格挡后的结果。',
    contact: '该情形下的防御总值：去掉天生防御、盔甲和盾牌后的结果。'
  };
  const esc = v => String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const round = n => Math.round(n * 100) / 100;
  const fmt = n => {
    if (!Number.isFinite(Number(n))) return '0';
    const x = round(Number(n));
    return Number.isInteger(x) ? String(x) : String(x);
  };
  const nowTime = () => {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };
  const uid = () => 'id_' + Math.random().toString(36).slice(2, 9);

  function mergeDefaults(base, input) {
    if (Array.isArray(base)) return Array.isArray(input) ? input.slice() : base.map(v => mergeDefaults(v, undefined));
    if (base && typeof base === 'object') {
      const out = {};
      const src = (input && typeof input === 'object' && !Array.isArray(input)) ? input : {};
      Object.keys(base).forEach(k => { out[k] = mergeDefaults(base[k], src[k]); });
      Object.keys(src).forEach(k => { if (!(k in out)) out[k] = src[k]; });
      return out;
    }
    return input === undefined ? base : input;
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object') return D.createDefaultState();
    const base = D.createDefaultState();
    const s = mergeDefaults(base, raw);
    s.format = 'infinite-terminal-character';
    s.version = 2;
    s.meta = Object.assign({}, base.meta, raw.meta || {});
    s.attributes = {};
    D.ATTRS.forEach(a => { s.attributes[a.key] = Object.assign({}, base.attributes[a.key], (raw.attributes || {})[a.key] || {}); });
    s.size = Object.assign({}, base.size, raw.size || {});
    s.derivedBonus = Object.assign({}, base.derivedBonus, raw.derivedBonus || {});
    s.skills = {};
    D.SKILLS.forEach(def => {
      s.skills[def.key] = Object.assign(D.blankSkill(def.attr), (raw.skills || {})[def.key] || {});
    });
    s.customSkills = (Array.isArray(raw.customSkills) ? raw.customSkills : base.customSkills).map(x => {
      const n = D.newCustomSkill({});
      return Object.assign(n, x || {}, { id: (x && x.id) || n.id });
    });
    s.defense = Object.assign({}, base.defense, raw.defense || {});
    s.defense.manual = Object.assign({}, base.defense.manual, (raw.defense || {}).manual || {});
    s.defense.labels = Object.assign({}, base.defense.labels, (raw.defense || {}).labels || {});
    const dGradeOk = g => D.EFFECT_GRADES.some(x => x.value === g);
    s.defense.flatfootedGrade = dGradeOk(s.defense.flatfootedGrade) ? s.defense.flatfootedGrade : 'none';
    s.defense.contactGrade = dGradeOk(s.defense.contactGrade) ? s.defense.contactGrade : 'none';
    s.defense.willCurrent = (raw.defense && raw.defense.willCurrent !== undefined) ? raw.defense.willCurrent : null;
    s.targetDefense = Object.assign({}, base.targetDefense, raw.targetDefense || {});
    s.targetDefense.values = Object.assign({}, base.targetDefense.values, (raw.targetDefense || {}).values || {});
    const gradeOk = g => D.EFFECT_GRADES.some(x => x.value === g);
    s.targetDefense.flatfootedGrade = gradeOk(s.targetDefense.flatfootedGrade) ? s.targetDefense.flatfootedGrade : (s.targetDefense.flatfooted ? 'D' : 'none');
    s.targetDefense.contactGrade = gradeOk(s.targetDefense.contactGrade) ? s.targetDefense.contactGrade : (s.targetDefense.contact ? 'D' : 'none');
    s.targetDefense.flatfooted = s.targetDefense.flatfootedGrade !== 'none';
    s.targetDefense.contact = s.targetDefense.contactGrade !== 'none';
    s.health = Object.assign({}, base.health, raw.health || {});
    s.healthMode = raw.healthMode === 'rm' ? 'rm' : 'fusion';

    const defaultAttackIds = new Set(D.ATTACK_TEMPLATES.map(t => 'atk_' + t.key));
    const rawAttacks = (Array.isArray(raw.attacks) ? raw.attacks : [])
      .filter(a => a && typeof a === 'object' && !defaultAttackIds.has(a.id));
    const n = v => {
      if (v === null || v === undefined || v === '') return 0;
      const x = Number(v);
      return Number.isFinite(x) ? x : 0;
    };
    const convertAttack = (a, template) => {
      a = a || {};
      const t = template || null;
      const legacyCap = a.cap || (t ? '' : 'manual');
      const seed = Object.assign(D.newAttack(t ? t.name : (a.name || '自定义')), t || {});
      const obj = Object.assign(seed, a);
      obj.id = a.id || (t ? 'atk_' + t.key : 'atk_' + uid());
      obj.name = a.name || (t ? t.name : '自定义');
      obj.desc = a.desc !== undefined ? a.desc : (t ? t.desc : '');
      obj.attr2 = obj.attr2 || 'none';
      obj.attr = (a.attr === 'manual' || !a.attr) ? (t ? t.attr : 'str') : a.attr;
      obj.skill = (a.skill === 'manual' || !a.skill) ? (t ? t.skill : 'brawl') : a.skill;
      const hasNewCap = a.capAttr !== undefined || a.capSkill !== undefined ||
        a.capWeapon !== undefined || a.capPower !== undefined;
      if (!hasNewCap) {
        if (legacyCap === 'melee') {
          obj.capAttr = t ? t.attr : obj.attr;
          obj.capSkill = t ? t.skill : obj.skill;
          obj.capWeapon = 1;
          obj.capPower = 0;
          obj.capLegend = true;
        } else if (legacyCap === 'ranged') {
          obj.capAttr = 'none';
          obj.capSkill = t ? t.skill : obj.skill;
          obj.capWeapon = 2;
          obj.capPower = 0;
          obj.capLegend = false;
        } else if (legacyCap === 'magic') {
          obj.capAttr = t ? t.attr : obj.attr;
          obj.capSkill = t ? t.skill : obj.skill;
          obj.capWeapon = 0;
          obj.capPower = 1;
          obj.capLegend = false;
        } else {
          obj.capAttr = 'none';
          obj.capSkill = 'none';
          obj.capWeapon = 0;
          obj.capPower = 0;
          obj.capLegend = false;
          obj.capOther = n(a.manualAttr) + n(a.manualSkill) + n(a.other) + n(a.weapon);
        }
      }
      obj.capAttr = obj.capAttr || 'none';
      obj.capSkill = obj.capSkill || 'none';
      obj.capWeapon = [0, 1, 2].includes(Number(obj.capWeapon)) ? Number(obj.capWeapon) : 0;
      obj.capPower = Number(obj.capPower) === 1 ? 1 : 0;
      obj.capOther = n(obj.capOther);
      obj.capLegend = !!obj.capLegend;
      const migrateCustoms = (arr, legacyName, legacyValue) => {
        if (Array.isArray(arr)) {
          return arr.map(x => ({ name: String((x && x.name) || ''), value: n(x && x.value) }))
            .filter(x => x.name || x.value);
        }
        if (legacyName || n(legacyValue)) return [{ name: String(legacyName || '自定义'), value: n(legacyValue) }];
        return [];
      };
      obj.dpCustoms = migrateCustoms(a.dpCustoms, a.dpCustomName, a.dpCustomValue);
      obj.capCustoms = migrateCustoms(a.capCustoms, a.capCustomName, a.capCustomValue);
      obj.attackCount = Math.max(1, n(obj.attackCount) || 1);
      obj.actionCost = D.TECH_ACTIONS.includes(obj.actionCost) ? obj.actionCost : '标准动作';
      obj.flatfootedGrade = D.EFFECT_GRADES.some(x => x.value === obj.flatfootedGrade) ? obj.flatfootedGrade : 'none';
      obj.contactGrade = D.EFFECT_GRADES.some(x => x.value === obj.contactGrade) ? obj.contactGrade : 'none';
      return obj;
    };
    s.attacks = rawAttacks.map(a => {
      const t = D.ATTACK_TEMPLATES.find(x => a.key === x.key);
      return convertAttack(a, t || null);
    });
    s.damageReductions = (Array.isArray(raw.damageReductions) ? raw.damageReductions : []).map(x => Object.assign({
      id: uid(), source: '', value: 0, type: '/-', detail: '', note: ''
    }, x || {}, { id: (x && x.id) || uid() }));

    s.energyPools = (Array.isArray(raw.energyPools) ? raw.energyPools : base.energyPools).map(p => Object.assign({ id: uid(), kind: 'energy', name: '', max: 0, current: 0, recovery: '', usage: '' }, p, { id: (p && p.id) || uid(), kind: p && p.kind === 'gauge' ? 'gauge' : 'energy' }));
    s.traits = (Array.isArray(raw.traits) ? raw.traits : []).map(x => Object.assign({ name: '', source: '', effect: '' }, x));
    s.resources = (Array.isArray(raw.resources) ? raw.resources : []).map(x => Object.assign({ type: '血统', name: '', level: 0, points: 0, effect: '' }, x));
    s.feats = (Array.isArray(raw.feats) ? raw.feats : []).map(x => Object.assign({ level: 0, name: '', prereq: '', effect: '' }, x));
    s.startingFeats = (Array.isArray(raw.startingFeats) ? raw.startingFeats : [{ level: 0, name: '', points: 0, effect: '' }])
      .map(x => Object.assign({ level: 0, name: '', points: 0, effect: '' }, x));
    s.purchases = (Array.isArray(raw.purchases) ? raw.purchases : []).map(x => Object.assign({ name: '', level: 0, points: 0, xp: 0, desc: '' }, x));
    s.incomes = (Array.isArray(raw.incomes) ? raw.incomes : []).map(x => Object.assign({ name: '', level: 0, points: 0, xp: 0, note: '' }, x));
    const techs = Array.isArray(raw.techniques) ? raw.techniques : base.techniques;
    s.techniques = techs.map(x => Object.assign({ action: '标准动作', name: '', text: '' }, x || {}));
    const equipRaw = Array.isArray(raw.equipment) ? raw.equipment : [];
    s.equipment = D.EQUIP_SLOTS.map(slot => {
      const found = equipRaw.find(e => e && e.slot === slot) || {};
      return Object.assign({ slot, name: '', effect: '' }, found, { slot });
    });
    s.vehicle = Object.assign({}, base.vehicle, raw.vehicle || {});
    s.notes = raw.notes || '';
    return s;
  }

  let profiles = [];
  let activeProfileId = '';

  function profileLabel(st) {
    return (st && st.meta && st.meta.name) ? st.meta.name : '未命名调查员';
  }

  function syncActiveProfile() {
    const p = profiles.find(x => x.id === activeProfileId);
    if (!p) return;
    p.state = state;
    p.name = profileLabel(state);
    p.updatedAt = Date.now();
  }

  function persistProfiles() {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify({ activeId: activeProfileId, profiles }));
    } catch (e) {
      console.warn('save profiles failed', e);
    }
  }

  function blankSTCombat() {
    const values = {};
    D.DEFENSE_ITEMS.forEach(d => { values[d.key] = 0; });
    const targetId = 'stt_' + uid();
    return {
      sourceId: '', values,
      targets: [{ id: targetId, name: '目标 1', sourceId: '', flatfootedGrade: 'none', contactGrade: 'none', values: Object.assign({}, values) }],
      activeTargetId: targetId,
      attacks: [], defenseNote: ''
    };
  }

  function stTargets() {
    const c = stTool.combat;
    if (!Array.isArray(c.targets) || !c.targets.length) {
      const values = Object.assign({}, c.values || {});
      const targetId = 'stt_' + uid();
      c.targets = [{ id: targetId, name: '目标 1', sourceId: '', flatfootedGrade: 'none', contactGrade: 'none', values }];
      c.activeTargetId = targetId;
    }
    if (!c.targets.some(t => t.id === c.activeTargetId)) c.activeTargetId = c.targets[0].id;
    return c.targets;
  }

  function stActiveTarget() {
    const targets = stTargets();
    return targets.find(t => t.id === stTool.combat.activeTargetId) || targets[0];
  }

  function stSwitchTarget(id) {
    stTool.combat.activeTargetId = id;
    saveSTTool();
    const active = stActiveTarget();
    document.querySelectorAll('.st-target-card[data-id]').forEach(card => {
      card.classList.toggle('active', card.dataset.id === id);
    });
    const nameInput = document.querySelector('[data-st-target-name]');
    if (nameInput) nameInput.value = active.name || '';
    document.querySelectorAll('[data-st-target-grade]').forEach(sel => {
      sel.value = active[sel.dataset.stTargetGrade] || 'none';
    });
    D.DEFENSE_ITEMS.forEach(d => {
      const input = document.querySelector(`[data-st-target="${d.key}"]`);
      if (input) input.value = fmt(active.values[d.key] || 0);
    });
    const source = document.querySelector('[data-st-defense-source]');
    if (source) source.value = active.sourceId || '';
    const hint = document.querySelector('.st-combat-hint');
    if (hint) {
      const entry = (stTool.entries || []).find(e => e.id === active.sourceId);
      hint.textContent = entry ? `当前来源：${entry.name || '调查员'}` : '当前来源：手动填写';
    }
    document.querySelectorAll('[data-st-attack][data-st-field="targetId"]').forEach(sel => {
      const a = (stTool.combat.attacks || []).find(x => x.id === sel.dataset.stAttack);
      if (a && !a.targetId) sel.value = id;
    });
    refreshSTCombatOutputs();
  }

  function stUpdateTargetNames() {
    const active = stActiveTarget();
    document.querySelectorAll('[data-st-active-target] option, [data-st-attack][data-st-field="targetId"] option').forEach(opt => {
      if (opt.value === active.id) opt.textContent = active.name || '未命名目标';
    });
    document.querySelectorAll('.st-target-card[data-id]').forEach(card => {
      if (card.dataset.id === active.id) {
        const b = card.querySelector('b');
        if (b) b.textContent = active.name || '未命名目标';
      }
    });
  }

  function stTargetForAttack(attack) {
    const targets = stTargets();
    return targets.find(t => t.id === attack.targetId) || stActiveTarget();
  }

  function blankSTAttack() {
    return {
      id: 'sta_' + uid(),
      name: '攻击 1',
      dp: 0,
      cap: 0,
      extra: 0,
      count: 1,
      targetId: '',
      highSpeed: 0,
      armorPierce: 0,
      magicPierce: 0,
      flatfootedGrade: 'none',
      contactGrade: 'none',
      source: '',
      effect: ''
    };
  }

  function normalizeSTCombat(raw) {
    const combat = blankSTCombat();
    if (!raw || typeof raw !== 'object') return combat;
    combat.sourceId = typeof raw.sourceId === 'string' ? raw.sourceId : '';
    D.DEFENSE_ITEMS.forEach(d => {
      combat.values[d.key] = C.num((raw.values || {})[d.key]);
    });
    const targetRaw = Array.isArray(raw.targets) ? raw.targets : [];
    if (targetRaw.length) {
      combat.targets = targetRaw.map((t, i) => {
        const values = {};
        D.DEFENSE_ITEMS.forEach(d => { values[d.key] = C.num((t && t.values || {})[d.key]); });
        return { id: (t && t.id) || ('stt_' + uid()), name: (t && t.name) || ('目标 ' + (i + 1)), sourceId: (t && t.sourceId) || '', flatfootedGrade: (t && t.flatfootedGrade) || 'none', contactGrade: (t && t.contactGrade) || 'none', values };
      });
      combat.activeTargetId = combat.targets.some(t => t.id === raw.activeTargetId) ? raw.activeTargetId : combat.targets[0].id;
      const active = combat.targets.find(t => t.id === combat.activeTargetId);
      if (active) D.DEFENSE_ITEMS.forEach(d => { combat.values[d.key] = active.values[d.key]; });
    }
    combat.attacks = (Array.isArray(raw.attacks) ? raw.attacks : []).map(a => {
      const x = blankSTAttack();
      Object.assign(x, a || {});
      x.id = (a && a.id) || x.id;
      x.dp = C.num(x.dp);
      x.cap = C.num(x.cap);
      x.extra = C.num(x.extra);
      x.count = Math.max(1, C.num(x.count) || 1);
      x.highSpeed = C.num(x.highSpeed);
      x.armorPierce = C.num(x.armorPierce);
      x.magicPierce = C.num(x.magicPierce);
      x.flatfootedGrade = D.EFFECT_GRADES.some(g => g.value === x.flatfootedGrade) ? x.flatfootedGrade : 'none';
      x.contactGrade = D.EFFECT_GRADES.some(g => g.value === x.contactGrade) ? x.contactGrade : 'none';
      x.source = typeof x.source === 'string' ? x.source : '';
      x.effect = typeof x.effect === 'string' ? x.effect : '';
      return x;
    });
    return combat;
  }

  function loadSTTool() {
    try {
      const raw = localStorage.getItem(ST_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.entries)) return {
          entries: data.entries,
          combat: normalizeSTCombat(data.combat),
          notes: typeof data.notes === 'string' ? data.notes : ''
        };
      }
    } catch (e) { }
    return { entries: [], combat: blankSTCombat(), notes: '' };
  }

  function saveSTTool() {
    try { localStorage.setItem(ST_KEY, JSON.stringify(stTool)); } catch (e) { }
  }

  function stCaptureEntry(st, profileId) {
    const c = C.compute(st);
    const mode = st.healthMode === 'rm' ? 'rm' : 'fusion';
    return {
      id: 'st_' + uid(),
      sourceProfileId: profileId || '',
      name: profileLabel(st),
      avatar: (st.meta && st.meta.avatar) || '',
      hpMax: c.hp,
      hpCurrent: Math.max(0, c.hp - c.health.b - c.health.l - c.health.a),
      willMax: c.will,
      willCurrent: c.health.willCurrent,
      healthMode: mode,
      b: c.health.b, l: c.health.l, a: c.health.a,
      flatfootedGrade: (st.defense && st.defense.flatfootedGrade) || 'none',
      contactGrade: (st.defense && st.defense.contactGrade) || 'none',
      defense: c.defense.scenarios.map(s => ({ key: s.key, name: s.name, value: s.value, note: s.note })),
      defenseValues: Object.fromEntries(D.DEFENSE_ITEMS.map(d => [d.key, c.defense.byKey[d.key] || 0])),
      defenseNote: (st.defense && st.defense.note) || '',
      attacks: (c.attacks || []).map(a => ({
        id: a.id, name: a.name, dp: a.dp, cap: a.cap,
        extraSuccess: a.extraSuccess, attackCount: a.attackCount,
        flatfootedGrade: a.flatfootedGrade, contactGrade: a.contactGrade,
        highSpeed: a.highSpeed, armorPierce: a.armorPierce, magicPierce: a.magicPierce,
        note: a.note || ''
      })),
      updatedAt: Date.now()
    };
  }

  function stStatus(e) {
    if (!e || !e.hpMax) return '未建卡';
    const hp = C.num(e.hpMax), b = C.num(e.b), l = C.num(e.l), a = C.num(e.a);
    if (e.healthMode === 'rm') {
      if (a >= hp) return '死亡';
      return (hp - b - l - a) <= 0 ? '昏迷' : '正常';
    }
    const fusionDamage = b + 2 * l + 4 * a;
    if (fusionDamage >= hp) return '死亡';
    return fusionDamage >= hp * 0.7 ? '昏迷' : '正常';
  }

  function stStatusClass(status) {
    return status === '死亡' ? 'dead' : status === '昏迷' ? 'down' : status === '未建卡' ? 'muted' : '';
  }

  function stRemainingHp(e) {
    return Math.max(0, Math.min(C.num(e.hpMax), C.num(e.hpMax) - C.num(e.b) - C.num(e.l) - C.num(e.a)));
  }

  function stSyncHpFromDamage(e) {
    e.hpCurrent = stRemainingHp(e);
  }

  function stApplyHp(e, value) {
    const hpMax = C.num(e.hpMax);
    const target = Math.max(0, Math.min(hpMax, C.num(value)));
    let damage = Math.max(0, hpMax - target);
    let b = Math.max(0, C.num(e.b));
    let l = Math.max(0, C.num(e.l));
    let a = Math.max(0, C.num(e.a));
    const total = b + l + a;
    if (damage > total) {
      b += damage - total;
    } else if (damage < total) {
      let remove = total - damage;
      const takeB = Math.min(b, remove); b -= takeB; remove -= takeB;
      const takeL = Math.min(l, remove); l -= takeL; remove -= takeL;
      a = Math.max(0, a - remove);
    }
    e.b = b; e.l = l; e.a = a;
    stSyncHpFromDamage(e);
  }

  function stEntryAttacks(e) {
    if (Array.isArray(e.attacks) && e.attacks.length) return e.attacks;
    if (!e.sourceProfileId) return [];
    const p = profiles.find(x => x.id === e.sourceProfileId);
    if (!p) return [];
    return (C.compute(p.state).attacks || []).map(a => ({
      id: a.id, name: a.name, dp: a.dp, cap: a.cap,
      extraSuccess: a.extraSuccess, attackCount: a.attackCount,
      flatfootedGrade: a.flatfootedGrade, contactGrade: a.contactGrade,
      highSpeed: a.highSpeed, armorPierce: a.armorPierce, magicPierce: a.magicPierce,
      note: a.note || ''
    }));
  }

  function stAttackImportOptions() {
    const items = [];
    (stTool.entries || []).forEach(e => {
      stEntryAttacks(e).forEach(a => {
        items.push(`<option value="${esc(e.id)}|${esc(a.id)}">${esc(e.name || '调查员')} · ${esc(a.name || '攻击')} · DP ${fmt(a.dp)}</option>`);
      });
    });
    return items.length
      ? `<option value="">读取角色攻击检定…</option>${items.join('')}`
      : '<option value="">没有可读取的攻击</option>';
  }

  function stCardHTML(e) {
    const hp = stRemainingHp(e);
    const pct = e.hpMax > 0 ? Math.max(0, Math.min(100, hp / e.hpMax * 100)) : 0;
    const status = stStatus(e);
    const cardCollapsed = ui.stCollapsedEntries.has(e.id);
    const defenses = (e.defense || []).map(d => {
      if (d.key === 'flatfooted' || d.key === 'contact') {
        const grade = e[d.key + 'Grade'] || 'none';
        const tip = EFFECT_TIPS[d.key] || '';
        return `<span class="st-def-item st-def-effect" title="${esc(tip)}"><em title="${esc(tip)}">${esc(d.name)}</em><b class="st-effect-value" title="${esc(tip)}">${fmt(d.value)}</b><select data-st-effect="${esc(e.id)}" data-effect-key="${esc(d.key)}" title="${esc(tip)}">${D.EFFECT_GRADES.map(g => `<option value="${g.value}" ${g.value === grade ? 'selected' : ''}>${g.label}</option>`).join('')}</select></span>`;
      }
      return `<span class="st-def-item"><em>${esc(d.name)}</em><input type="number" data-st-def="${esc(e.id)}" data-def-key="${esc(d.key)}" value="${fmt(d.value)}"></span>`;
    }).join('');
    return `<div class="st-card ${cardCollapsed ? 'st-card-collapsed' : ''}" data-st-card="${esc(e.id)}">
      <div class="st-card-head">
        <div class="st-avatar">${e.avatar ? `<img src="${esc(e.avatar)}" alt="">` : esc((e.name || '调').slice(0, 1))}</div>
        <div class="st-name"><b>${esc(e.name || '未命名调查员')}</b><small>${e.sourceProfileId ? '本地角色卡' : '导入文件'}</small></div>
        <div class="st-mode-switch">
          <button class="${e.healthMode === 'fusion' ? 'active' : ''}" data-action="st-health-mode" data-id="${esc(e.id)}" data-mode="fusion">融合流</button>
          <button class="${e.healthMode === 'rm' ? 'active' : ''}" data-action="st-health-mode" data-id="${esc(e.id)}" data-mode="rm">RM</button>
        </div>
        <span class="st-status ${stStatusClass(status)}">${status}</span>
        <button class="st-card-btn" data-action="st-toggle-card" data-id="${esc(e.id)}">${cardCollapsed ? '展开' : '收起'}</button>
        <button class="st-card-btn danger" data-action="st-remove" data-id="${esc(e.id)}">移除</button>
      </div>
      <div class="st-card-body ${cardCollapsed ? 'collapsed' : ''}">
      <div class="st-hp-row">
        <div class="st-hp-label">生命</div>
        <div class="st-hp-value"><b>${fmt(hp)}</b><span>/ ${fmt(e.hpMax)}</span></div>
        <div class="st-hp-controls">
          <button data-action="st-hp-delta" data-id="${esc(e.id)}" data-delta="-5">−5</button>
          <button data-action="st-hp-delta" data-id="${esc(e.id)}" data-delta="-1">−1</button>
          <button data-action="st-hp-delta" data-id="${esc(e.id)}" data-delta="1">+1</button>
          <button data-action="st-hp-delta" data-id="${esc(e.id)}" data-delta="5">+5</button>
          <input type="number" data-st-hp="${esc(e.id)}" value="${fmt(hp)}" title="直接填写当前生命">
        </div>
      </div>
      <div class="st-hp-bar"><i style="width:${pct}%"></i></div>
      <div class="st-will">
        <span>意志</span><input type="number" data-st-will="${esc(e.id)}" value="${fmt(e.willCurrent)}"><span>/ ${fmt(e.willMax)}</span>
        <span class="st-dmg-label">伤害</span>
        <span>B</span><input type="number" data-st-dmg="${esc(e.id)}" data-dmg-key="b" value="${fmt(e.b)}">
        <span>L</span><input type="number" data-st-dmg="${esc(e.id)}" data-dmg-key="l" value="${fmt(e.l)}">
        <span>A</span><input type="number" data-st-dmg="${esc(e.id)}" data-dmg-key="a" value="${fmt(e.a)}">
        <span class="st-health-formula">完好生命 = 上限 − B − L − A</span>
      </div>
      <div class="st-defense-grid">${defenses}</div>
      ${e.defenseNote ? `<div class="st-defense-note">防御备注：${esc(e.defenseNote)}</div>` : ''}
      </div>
    </div>`;
  }

  function stEntryDefenseValues(entry) {
    const values = {};
    D.DEFENSE_ITEMS.forEach(d => { values[d.key] = 0; });
    if (entry && entry.defenseValues && typeof entry.defenseValues === 'object') {
      D.DEFENSE_ITEMS.forEach(d => { values[d.key] = C.num(entry.defenseValues[d.key]); });
      return values;
    }
    const p = entry && profiles.find(x => x.id === entry.sourceProfileId);
    if (p) {
      const c = C.compute(p.state);
      D.DEFENSE_ITEMS.forEach(d => { values[d.key] = c.defense.byKey[d.key] || 0; });
    }
    return values;
  }

  function stAttackCalc(attack, forcedTarget) {
    const flags = {
      flatfooted: !!(attack.flatfootedGrade && attack.flatfootedGrade !== 'none'),
      contact: !!(attack.contactGrade && attack.contactGrade !== 'none')
    };
    const target = forcedTarget || stTargetForAttack(attack);
    const eff = C.effectiveDefense((target && target.values) || stTool.combat.values || {}, {
      highSpeed: C.num(attack.highSpeed),
      armorPierce: C.num(attack.armorPierce),
      magicPierce: C.num(attack.magicPierce)
    }, flags);
    const dp = C.num(attack.dp);
    const cap = Math.max(0, C.num(attack.cap));
    const extra = Math.max(0, C.num(attack.extra));
    const count = Math.max(1, C.num(attack.count) || 1);
    const finalDP = dp - eff.total;
    const expectedSuccess = Math.max(0, finalDP) / 3 + extra;
    const damage = Math.min(expectedSuccess, cap);
    return { defense: eff.total, finalDP, damage, total: damage * count, count };
  }

  function stAttackFields(a, id) {
    const c = stAttackCalc(a);
    const grades = D.EFFECT_GRADES.map(g => `<option value="${g.value}" ${g.value === a.flatfootedGrade ? 'selected' : ''}>${g.label}</option>`).join('');
    const contactGrades = D.EFFECT_GRADES.map(g => `<option value="${g.value}" ${g.value === a.contactGrade ? 'selected' : ''}>${g.label}</option>`).join('');
    const importOptions = stAttackImportOptions();
    return {
      c, id, grades, contactGrades,
      importSelect: `<select class="cell-input" data-st-import-attack="${id}" title="从已载入的调查员读取攻击预设的总 DP">${importOptions}</select>`,
      name: `<input class="cell-input st-attack-name" data-st-attack="${id}" data-st-field="name" value="${esc(a.name || '')}" placeholder="攻击名">`,
      dp: `<input class="cell-input st-attack-num" type="number" data-st-attack="${id}" data-st-field="dp" value="${esc(C.num(a.dp))}" title="ST 直接填写总攻击 DP">`,
      cap: `<input class="cell-input st-attack-num" type="number" data-st-attack="${id}" data-st-field="cap" value="${esc(C.num(a.cap))}" title="ST 直接填写伤害上限">`,
      extra: `<input class="cell-input st-attack-num" type="number" data-st-attack="${id}" data-st-field="extra" value="${esc(C.num(a.extra))}" title="附加成功，直接加到期望伤害">`,
      count: `<input class="cell-input st-attack-num" type="number" min="1" data-st-attack="${id}" data-st-field="count" value="${esc(C.num(a.count))}">`,
      highSpeed: `<input class="cell-input st-attack-num" type="number" data-st-attack="${id}" data-st-field="highSpeed" value="${esc(C.num(a.highSpeed))}" title="高速：削减基础 / 闪避 / 洞察 / 格挡">`,
      armorPierce: `<input class="cell-input st-attack-num" type="number" data-st-attack="${id}" data-st-field="armorPierce" value="${esc(C.num(a.armorPierce))}" title="破甲：削减盾牌 / 盔甲 / 天生防御">`,
      magicPierce: `<input class="cell-input st-attack-num" type="number" data-st-attack="${id}" data-st-field="magicPierce" value="${esc(C.num(a.magicPierce))}" title="破魔：削减亵渎 / 神圣 / 偏斜 / 力场 / 其他">`,
      effect: `<textarea class="cell-input st-attack-effect" data-st-attack="${id}" data-st-field="effect" placeholder="攻击命中后的状态、持续效果、消耗、特殊说明…">${esc(a.effect || '')}</textarea>`,
      source: `<input class="cell-input st-attack-source" data-st-attack="${id}" data-st-field="source" value="${esc(a.source || '')}" placeholder="ST 填写加值来源 / 备注">`,
      flat: `<select class="cell-input st-attack-select" data-st-attack="${id}" data-st-field="flatfootedGrade">${grades}</select>`,
      contact: `<select class="cell-input st-attack-select" data-st-attack="${id}" data-st-field="contactGrade">${contactGrades}</select>`
    };
  }

  function stComparisonRowsHTML() {
    const attacks = stTool.combat.attacks || [];
    const targets = stTargets();
    return attacks.flatMap(a => targets.map(t => {
      const c = stAttackCalc(a, t);
      return `<tr><td class="st-cmp-attack">${esc(a.name || '未命名攻击')}</td><td>${esc(t.name || '未命名目标')}</td><td>${fmt(c.defense)}</td><td>${fmt(c.finalDP)}</td><td>${fmt(C.round1(c.total))}</td></tr>`;
    })).join('');
  }

  function stTargetComparisonHTML() {
    const attacks = stTool.combat.attacks || [];
    const targets = stTargets();
    if (!attacks.length || targets.length < 2) return '';
    return `<div class="panel mt18 st-compare-panel" id="st-section-compare">
      <div class="panel-head"><div class="panel-title">目标对比</div><div class="panel-head-right"><span class="panel-sub">同一条攻击对所有目标的有效防御 / 最终 DP / 期望伤害</span></div></div>
      <div class="panel-body"><div class="st-compare-wrap"><table class="st-compare-table">
        <thead><tr><th>攻击</th><th>目标</th><th>有效防御</th><th>最终DP</th><th>期望伤害</th></tr></thead>
        <tbody id="st-compare-body">${stComparisonRowsHTML()}</tbody>
      </table></div><div class="matrix-wrap-note">这里只做对比，不会修改上方攻击行选中的目标。</div></div>
    </div>`;
  }

  function stCombatHTML() {
    const combat = stTool.combat;
    const entries = stTool.entries || [];
    const activeTarget = stActiveTarget();
    const selected = entries.some(e => e.id === activeTarget.sourceId) ? activeTarget.sourceId : '';
    const options = entries.map(e => `<option value="${esc(e.id)}" ${e.id === selected ? 'selected' : ''}>${esc(e.name || '未命名调查员')}</option>`).join('');
    const defCollapsed = ui.collapsedSections.has('st-combat-defense');
    const atkCollapsed = ui.collapsedSections.has('st-combat-attacks');
    const targetFields = D.DEFENSE_ITEMS.map(d =>
      `<div class="target-field"><label>${esc(d.name)}</label><input type="number" data-st-target="${esc(d.key)}" value="${fmt(activeTarget.values[d.key] || 0)}"></div>`
    ).join('');
    const targetCards = stTargets().map(t => {
      const src = (stTool.entries || []).find(e => e.id === t.sourceId);
      const total = D.DEFENSE_ITEMS.filter(d => !d.counter).reduce((sum, d) => sum + C.num(t.values[d.key]), 0);
      return `<button class="st-target-card ${t.id === activeTarget.id ? 'active' : ''}" data-action="st-select-target" data-id="${esc(t.id)}"><b>${esc(t.name || '未命名目标')}</b><small>${src ? esc(src.name || '调查员') : '手动防御'}</small><span>防御 ${fmt(total)}</span></button>`;
    }).join('');
    const attackItems = (combat.attacks || []).map(a => {
      const id = esc(a.id);
      const f = stAttackFields(a, id);
      if (COMPACT()) {
        return `<div class="st-attack-card" data-st-attack-row="${id}">
          <div class="st-attack-card-head">${f.name}<button class="icon-btn" data-action="st-remove-attack" data-id="${id}" title="删除攻击">${ic('trash')}</button></div>
          <div class="st-attack-fields">
            <label><span>总DP</span>${f.dp}</label>
            <label><span>伤害上限</span>${f.cap}</label>
            <label><span>附加</span>${f.extra}</label>
            <label><span>次数</span>${f.count}</label>
          </div>
          <div class="st-attack-effects"><label><span>措手不及</span>${f.flat}</label><label><span>接触</span>${f.contact}</label></div>
          <div class="st-attack-card-source">${f.source}</div>
          <label class="st-attack-import"><span>读取攻击检定</span>${f.importSelect}</label>
          <div class="st-attack-detail-fields">
            <label><span>高速</span>${f.highSpeed}</label>
            <label><span>破甲</span>${f.armorPierce}</label>
            <label><span>破魔</span>${f.magicPierce}</label>
          </div>
          <label class="st-attack-effect-field"><span>攻击后效果 / 备注</span>${f.effect}</label>
          <div class="st-attack-card-output">
            <span>有效防御 <b data-st-out="defense:${id}">${fmt(f.c.defense)}</b></span>
            <span>最终DP <b class="st-attack-final" data-st-out="final:${id}">${fmt(f.c.finalDP)}</b></span>
            <span>期望伤害 <b class="st-attack-damage" data-st-out="damage:${id}">${fmt(C.round1(f.c.total))}</b></span>
          </div>
        </div>`;
      }
      return `<tr data-st-attack-row="${id}">
        <td>${f.name}</td><td>${f.dp}</td><td>${f.cap}</td><td>${f.extra}</td><td>${f.count}</td>
        <td>${f.flat}</td><td>${f.contact}</td><td>${f.source}</td>
        <td class="st-attack-result" data-st-out="defense:${id}">${fmt(f.c.defense)}</td>
        <td class="st-attack-result st-attack-final" data-st-out="final:${id}">${fmt(f.c.finalDP)}</td>
        <td class="st-attack-result st-attack-damage" data-st-out="damage:${id}">${fmt(C.round1(f.c.total))}</td>
        <td class="st-attack-actions"><button class="icon-btn ${expanded ? '' : 'collapsed'}" data-action="st-toggle-attack" data-id="${id}" title="展开 / 折叠详情">${ic('chevron')}</button><button class="icon-btn" data-action="st-remove-attack" data-id="${id}" title="删除攻击">${ic('trash')}</button></td>
      </tr>
      <tr class="st-attack-detail ${expanded ? '' : 'st-attack-detail-collapsed'}" data-st-detail="${id}"><td colspan="13">
        <div class="st-attack-detail-fields">
          <label><span>高速</span>${f.highSpeed}</label>
          <label><span>破甲</span>${f.armorPierce}</label>
          <label><span>破魔</span>${f.magicPierce}</label>
          <label class="st-attack-import"><span>读取攻击检定</span>${f.importSelect}</label>
          <label class="st-attack-effect-field"><span>攻击后效果 / 备注</span>${f.effect}</label>
        </div>
      </td></tr>`;
    }).join('');
    return `
      <div class="panel mt18 collapsible" id="st-section-targets">
        <div class="panel-head">
          <div class="panel-title">战斗 · 目标</div>
          <div class="panel-head-right"><span class="panel-sub">读取调查员快照，或直接修改 13 项防御</span>
            <button class="collapse-btn ${defCollapsed ? 'collapsed' : ''}" data-action="toggle-section" data-section="st-combat-defense" aria-expanded="${defCollapsed ? 'false' : 'true'}" title="折叠 / 展开">${ic('chevron')}</button>
          </div>
        </div>
        <div class="panel-body ${defCollapsed ? 'collapsed' : ''}" data-section-body="st-combat-defense">
          <div class="st-target-cards">${targetCards}<button class="st-target-card st-target-add" data-action="st-add-target">${ic('plus')} 新目标</button></div>
          <div class="st-target-editor-head">
            <input class="cell-input" data-st-target-name value="${esc(activeTarget.name || '')}" placeholder="目标名称">
            <label class="st-target-grade">措手不及<select class="cell-input" data-st-target-grade="flatfootedGrade">${D.EFFECT_GRADES.map(g => `<option value="${g.value}" ${g.value === (activeTarget.flatfootedGrade || 'none') ? 'selected' : ''}>${g.label}</option>`).join('')}</select></label>
            <label class="st-target-grade">接触<select class="cell-input" data-st-target-grade="contactGrade">${D.EFFECT_GRADES.map(g => `<option value="${g.value}" ${g.value === (activeTarget.contactGrade || 'none') ? 'selected' : ''}>${g.label}</option>`).join('')}</select></label>
            <button class="btn small" data-action="st-remove-target">删除当前目标</button>
          </div>
          <div class="st-combat-toolbar">
            <label class="st-source-picker">读取自<select class="cell-input" data-st-defense-source><option value="">手动填写</option>${options}</select></label>
            <button class="btn small" data-action="st-load-defense">${ic('refresh')} 重新读取</button>
            <button class="btn small" data-action="st-clear-defense">清空</button>
            <span class="st-combat-hint">${selected ? '当前来源：' + esc((entries.find(e => e.id === selected) || {}).name || '') : '手动防御'}</span>
          </div>
          <div class="defense-target st-target-grid">${targetFields}</div>
          <div class="matrix-wrap-note">选择玩家后自动读取其防御；读取后仍可直接修改。措手不及 / 接触在下方每条攻击里单独选择。</div>
        </div>
      </div>
      <div class="panel mt18 collapsible" id="st-section-attacks">
        <div class="panel-head">
          <div class="panel-title">战斗 · 攻击预设</div>
          <div class="panel-head-right"><span class="panel-sub">总 DP / 上限 / 附加 / 次数 / 来源由 ST 填写</span>
            <button class="btn small gold" data-action="st-add-attack">${ic('plus')} 新增攻击</button>
            <button class="collapse-btn ${atkCollapsed ? 'collapsed' : ''}" data-action="toggle-section" data-section="st-combat-attacks" aria-expanded="${atkCollapsed ? 'false' : 'true'}" title="折叠 / 展开">${ic('chevron')}</button>
          </div>
        </div>
        <div class="panel-body ${atkCollapsed ? 'collapsed' : ''}" data-section-body="st-combat-attacks">
          ${attackItems ? (COMPACT() ? `<div class="st-attack-cards">${attackItems}</div>` : `<div class="st-attack-wrap"><table class="st-attack-table"><thead><tr><th>目标</th><th>攻击名</th><th>总DP</th><th>伤害上限</th><th>附加</th><th>次数</th><th>措手不及</th><th>接触</th><th>加成来源</th><th>有效防御</th><th>最终DP</th><th>期望伤害</th><th></th></tr></thead><tbody>${attackItems}</tbody></table></div>`) : `<div class="empty"><b>还没有 ST 攻击预设</b>点右上角“新增攻击”，填入 ST 自己计算好的总 DP、伤害上限与来源。</div>`}
          <div class="matrix-wrap-note">期望伤害 = min(max(最终DP, 0) ÷ 3 + 附加, 伤害上限) × 次数；最终DP = 总DP − 目标有效防御。展开攻击行可用「读取攻击检定」从角色卡导入完整预设。</div>
        </div>
      </div>
      ${stTargetComparisonHTML()}`;
  }

  function stSyncTargetDefenseUI() {
    const active = stActiveTarget();
    D.DEFENSE_ITEMS.forEach(d => {
      const el = document.querySelector(`[data-st-target="${d.key}"]`);
      if (el) el.value = fmt(active.values[d.key] || 0);
    });
    const sel = document.querySelector('[data-st-defense-source]');
    if (sel) sel.value = (stActiveTarget().sourceId || '') || '';
    const hint = document.querySelector('.st-combat-hint');
    if (hint) {
      const entry = (stTool.entries || []).find(e => e.id === active.sourceId);
      hint.textContent = entry ? `当前来源：${entry.name || '调查员'}` : '当前来源：手动填写';
    }
    refreshSTCombatOutputs();
  }

  function stLoadDefense(sourceId) {
    const entry = (stTool.entries || []).find(e => e.id === sourceId);
    if (!entry) {
      stTool.combat.sourceId = '';
      stActiveTarget().sourceId = '';
      saveSTTool();
      stSyncTargetDefenseUI();
      return;
    }
    stTool.combat.sourceId = entry.id;
    const active = stActiveTarget();
    active.sourceId = entry.id;
    active.flatfootedGrade = entry.flatfootedGrade || 'none';
    active.contactGrade = entry.contactGrade || 'none';
    const values = stEntryDefenseValues(entry);
    stTool.combat.values = Object.assign({}, values);
    D.DEFENSE_ITEMS.forEach(d => { active.values[d.key] = values[d.key] || 0; });
    saveSTTool();
    stRerenderPreserve();
    toast(`已读取 ${entry.name || '调查员'} 的防御`);
  }

  function stClearDefense() {
    stTool.combat.sourceId = '';
    const active = stActiveTarget();
    active.sourceId = '';
    D.DEFENSE_ITEMS.forEach(d => { stTool.combat.values[d.key] = 0; active.values[d.key] = 0; });
    active.flatfootedGrade = 'none';
    active.contactGrade = 'none';
    saveSTTool();
    stRerenderPreserve();
  }

  function stRerenderPreserve() {
    const main = $('#main');
    const top = main ? main.scrollTop : 0;
    renderView('st');
    if (main) {
      main.scrollTop = top;
      requestAnimationFrame(() => { main.scrollTop = top; });
    }
  }

  function stAddAttack() {
    const a = blankSTAttack();
    a.name = `攻击 ${stTool.combat.attacks.length + 1}`;
    stTool.combat.attacks.push(a);
    ui.stCollapsedAttacks.delete(a.id);
    saveSTTool();
    stRerenderPreserve();
  }

  function stRemoveAttack(id) {
    ui.stCollapsedAttacks.delete(id);
    stTool.combat.attacks = stTool.combat.attacks.filter(a => a.id !== id);
    saveSTTool();
    stRerenderPreserve();
  }

  function stUpdateAttack(id, field, value) {
    const a = stTool.combat.attacks.find(x => x.id === id);
    if (!a) return;
    if (['dp', 'cap', 'extra', 'count', 'highSpeed', 'armorPierce', 'magicPierce'].includes(field)) a[field] = C.num(value);
    else a[field] = value;
    saveSTTool();
    refreshSTCombatOutputs();
  }

  function refreshSTCombatOutputs() {
    $$('[data-st-attack-row]').forEach(row => {
      const a = stTool.combat.attacks.find(x => x.id === row.dataset.stAttackRow);
      if (!a) return;
      const c = stAttackCalc(a);
      const set = (key, value) => {
        const el = row.querySelector(`[data-st-out="${key}:${a.id}"]`);
        if (el) el.textContent = value;
      };
      set('defense', fmt(c.defense));
      set('final', fmt(c.finalDP));
      set('damage', fmt(C.round1(c.total)));
    });
    const cmp = document.getElementById('st-compare-body');
    if (cmp) cmp.innerHTML = stComparisonRowsHTML();
  }

  function openSTNotesFloat() {
    if (document.getElementById('st-note-float')) return;
    const box = document.createElement('div');
    box.id = 'st-note-float';
    box.className = 'st-note-float';
    box.innerHTML = `<div class="st-note-float-head"><span>ST 笔记</span><button type="button" class="st-note-float-close" title="关闭">×</button></div><textarea class="st-note-float-text" placeholder="记录战斗、剧情、NPC、临时裁定…"></textarea>`;
    document.body.appendChild(box);
    const text = box.querySelector('.st-note-float-text');
    const base = document.getElementById('st-notes');
    text.value = stTool.notes || '';
    const sync = () => {
      stTool.notes = text.value;
      if (base) base.value = text.value;
      saveSTTool();
    };
    text.addEventListener('input', sync);
    box.querySelector('.st-note-float-close').onclick = () => box.remove();
    const head = box.querySelector('.st-note-float-head');
    let drag = null;
    head.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return;
      drag = { x: e.clientX, y: e.clientY, left: box.offsetLeft, top: box.offsetTop };
      e.preventDefault();
    });
    const move = e => {
      if (!drag) return;
      box.style.left = Math.max(0, drag.left + e.clientX - drag.x) + 'px';
      box.style.top = Math.max(0, drag.top + e.clientY - drag.y) + 'px';
    };
    const up = () => { drag = null; };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    box._cleanup = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    const oldRemove = box.remove.bind(box);
    box.remove = () => { if (box._cleanup) box._cleanup(); oldRemove(); };
    text.focus();
  }

  function stHTML() {
    const entries = stTool.entries || [];
    const targetCount = stTargets().length;
    const attackCount = (stTool.combat.attacks || []).length;
    return `
      ${pageHeader('ST TOOL / 主持人工具', 'ST 工具', '同时读取多名调查员的状态；这里调整生命值只作用于 ST 面板，不会修改原角色卡。', '')}
      <div class="st-jump">
        <button data-action="st-jump" data-target="st-section-characters">调查员 <b>${entries.length}</b></button>
        <button data-action="st-jump" data-target="st-section-targets">目标 <b>${targetCount}</b></button>
        <button data-action="st-jump" data-target="st-section-attacks">攻击 <b>${attackCount}</b></button>
        ${targetCount >= 2 && attackCount ? `<button data-action="st-jump" data-target="st-section-compare">对比</button>` : ''}
        <button data-action="st-jump" data-target="st-section-notes">笔记</button>
      </div>
      <div class="panel" id="st-section-characters">
        <div class="panel-head"><div class="panel-title">调查员状态</div><div class="panel-head-right st-toolbar">
          <button class="btn small gold" data-action="st-picker">${ic('users')} 选择角色卡</button>
          <button class="btn small" data-action="st-import">${ic('upload')} 导入 JSON</button>
          <button class="btn small" data-action="st-refresh">${ic('refresh')} 刷新快照</button>
          <button class="btn small" data-action="st-clear">清空</button>
        </div></div>
        <div class="panel-body">${entries.length ? `<div class="st-grid">${entries.map(stCardHTML).join('')}</div>` : `<div class="empty st-empty"><b>还没有载入调查员</b>从本地角色卡中选择，或导入其他调查员的角色卡 JSON。调整只保存在 ST 工具中，不影响原卡。</div>`}</div>
      </div>
      ${stCombatHTML()}
      <div class="panel mt18 st-notes-panel" id="st-section-notes">
        <div class="panel-head"><div class="panel-title">ST 笔记</div><div class="panel-head-right"><span class="panel-sub">双击文本框放大，浮窗可拖动 / 调整大小</span><button class="btn small" data-action="st-note-expand">放大</button></div></div>
        <div class="panel-body"><textarea class="st-notes-input" id="st-notes" rows="4" placeholder="记录战斗、剧情、NPC、临时裁定…">${esc(stTool.notes || '')}</textarea></div>
      </div>`;
  }

  function stAddProfile(profileId) {
    const p = profiles.find(x => x.id === profileId);
    if (!p) return false;
    const snapshot = stCaptureEntry(p.state, p.id);
    const existing = stTool.entries.find(e => e.sourceProfileId === p.id);
    if (existing) {
      snapshot.id = existing.id;
      Object.assign(existing, snapshot);
    } else {
      stTool.entries.push(snapshot);
    }
    return true;
  }

  function openSTPicker() {
    if (!profiles.length) {
      toast('还没有本地角色卡');
      return;
    }
    saveNow();
    const layer = $('#modal-layer');
    const card = $('#modal-card');
    card.style.width = '540px';
    card.innerHTML = `<div class="modal-title">选择调查员</div>
      <div class="modal-text st-picker-note">可以一次勾选多张本地角色卡；已经载入过的会刷新快照。</div>
      <div class="st-picker-list">${profiles.map(p => `<label class="st-pick-item">
        <input type="checkbox" data-st-profile="${esc(p.id)}" ${stTool.entries.some(e => e.sourceProfileId === p.id) ? 'checked' : ''}>
        <span>${esc(p.name || '未命名调查员')}</span><small>${new Date(p.updatedAt || Date.now()).toLocaleDateString('zh-CN')}</small>
      </label>`).join('')}</div>
      <div class="modal-actions"><button class="btn" data-modal="cancel">取消</button><button class="btn gold" data-modal="add">加入 ST 面板</button></div>`;
    layer.hidden = false;
    const close = () => { layer.hidden = true; card.style.width = ''; };
    card.querySelector('[data-modal="cancel"]').onclick = close;
    card.querySelector('[data-modal="add"]').onclick = () => {
      const ids = $$('[data-st-profile]:checked', card).map(x => x.dataset.stProfile);
      let n = 0;
      ids.forEach(id => { if (stAddProfile(id)) n++; });
      saveSTTool();
      close();
      stRerenderPreserve();
      toast(n ? `已载入 ${n} 名调查员` : '没有选择角色卡');
    };
    layer.onclick = e => { if (e.target === layer) close(); };
    window.__modalClose = close;
  }

  async function stImportJSON() {
    try {
      const msg = await request('file.import', {}, 300000);
      if (!msg.ok) throw new Error(msg.message || '未选择文件');
      const raw = JSON.parse(msg.content);
      if (!raw || typeof raw !== 'object') throw new Error('文件内容不是有效的角色卡');
      const st = normalizeState(raw);
      stTool.entries.push(stCaptureEntry(st, ''));
      saveSTTool();
      stRerenderPreserve();
      toast('已加入 ST 面板', 'success');
    } catch (e) {
      toast('导入失败：' + e.message, 'error');
    }
  }

  function stRefresh() {
    saveNow();
    let n = 0;
    stTool.entries.forEach(e => {
      if (!e.sourceProfileId) return;
      const p = profiles.find(x => x.id === e.sourceProfileId);
      if (!p) return;
      const snap = stCaptureEntry(p.state, p.id);
      snap.id = e.id;
      Object.assign(e, snap);
      n++;
    });
    saveSTTool();
    stRerenderPreserve();
    toast(n ? `已刷新 ${n} 名调查员` : '没有可刷新的本地角色卡');
  }

  function stClear() {
    if (!stTool.entries.length) return;
    confirmDialog({
      title: '清空 ST 面板？',
      text: '只会移除 ST 工具中的调查员，不会删除角色卡。',
      danger: true,
      okText: '清空',
      onConfirm: () => {
        stTool.entries = [];
        stTool.combat = blankSTCombat();
        saveSTTool();
        stRerenderPreserve();
        toast('ST 面板已清空');
      }
    });
  }

  function stRefreshCard(id) {
    const e = stTool.entries.find(x => x.id === id);
    const card = document.querySelector(`.st-card[data-st-card="${id}"]`);
    if (!e || !card) return;
    const hp = stRemainingHp(e);
    const pct = C.num(e.hpMax) > 0 ? Math.max(0, Math.min(100, hp / C.num(e.hpMax) * 100)) : 0;
    const status = stStatus(e);
    const hpValue = card.querySelector('.st-hp-value b');
    const hpMax = card.querySelector('.st-hp-value span');
    const bar = card.querySelector('.st-hp-bar i');
    const pill = card.querySelector('.st-status');
    const hpInput = card.querySelector(`[data-st-hp="${id}"]`);
    if (hpValue) hpValue.textContent = fmt(hp);
    if (hpMax) hpMax.textContent = `/ ${fmt(e.hpMax)}`;
    if (bar) bar.style.width = pct + '%';
    if (pill) { pill.textContent = status; pill.className = 'st-status ' + stStatusClass(status); }
    if (hpInput && document.activeElement !== hpInput) hpInput.value = fmt(hp);
    card.querySelectorAll('[data-action="st-health-mode"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === e.healthMode);
    });
    ['b', 'l', 'a'].forEach(key => {
      const el = card.querySelector(`[data-st-dmg="${id}"][data-dmg-key="${key}"]`);
      if (el) el.value = fmt(e[key]);
    });
  }

  function stSetHp(id, value) {
    const e = stTool.entries.find(x => x.id === id);
    if (!e) return;
    stApplyHp(e, value);
    saveSTTool();
    stRefreshCard(id);
  }

  function stHpDelta(id, delta) {
    const e = stTool.entries.find(x => x.id === id);
    if (!e) return;
    stApplyHp(e, stRemainingHp(e) + C.num(delta));
    saveSTTool();
    stRefreshCard(id);
  }

  function stSetHealthMode(id, mode) {
    const e = stTool.entries.find(x => x.id === id);
    if (!e) return;
    e.healthMode = mode === 'rm' ? 'rm' : 'fusion';
    saveSTTool();
    stRefreshCard(id);
  }

  function stSetWill(id, value) {
    const e = stTool.entries.find(x => x.id === id);
    if (!e) return;
    e.willCurrent = Math.max(0, Math.min(C.num(e.willMax), C.num(value)));
    saveSTTool();
  }

  function stSetDamage(id, key, value) {
    const e = stTool.entries.find(x => x.id === id);
    if (!e || !['b', 'l', 'a'].includes(key)) return;
    e[key] = Math.max(0, C.num(value));
    stSyncHpFromDamage(e);
    saveSTTool();
    stRefreshCard(id);
  }

  function stSetDefense(id, key, value) {
    const e = stTool.entries.find(x => x.id === id);
    if (!e) return;
    const item = (e.defense || []).find(d => d.key === key);
    if (!item) return;
    item.value = C.num(value);
    saveSTTool();
  }

  function stSetEffectGrade(id, key, value) {
    const e = stTool.entries.find(x => x.id === id);
    if (!e || !['flatfooted', 'contact'].includes(key)) return;
    e[key + 'Grade'] = D.EFFECT_GRADES.some(g => g.value === value) ? value : 'none';
    saveSTTool();
  }

  function stImportAttackCheck(id, value) {
    if (!value) return;
    const parts = value.split('|');
    if (parts.length !== 2) return;
    const entry = stTool.entries.find(x => x.id === parts[0]);
    const source = entry ? stEntryAttacks(entry).find(x => x.id === parts[1]) : null;
    const attack = (stTool.combat.attacks || []).find(x => x.id === id);
    if (!entry || !source || !attack) return;
    attack.dp = C.num(source.dp);
    attack.cap = C.num(source.cap);
    attack.extra = C.num(source.extraSuccess);
    attack.count = Math.max(1, C.num(source.attackCount) || 1);
    attack.flatfootedGrade = source.flatfootedGrade || 'none';
    attack.contactGrade = source.contactGrade || 'none';
    attack.highSpeed = C.num(source.highSpeed);
    attack.armorPierce = C.num(source.armorPierce);
    attack.magicPierce = C.num(source.magicPierce);
    if (source.note) attack.effect = source.note;
    if (!attack.name || /^攻击\s*\d+$/.test(attack.name)) attack.name = source.name || attack.name;
    attack.source = `${entry.name || '调查员'} · ${source.name || '攻击'} · 攻击检定`;
    saveSTTool();
    stRerenderPreserve();
    refreshSTCombatOutputs();
    toast(`已读取 ${entry.name || '调查员'} 的攻击预设`);
  }

  function loadProfileState() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.profiles) && data.profiles.length) {
          profiles = data.profiles.map(p => ({
            id: p.id || ('char_' + uid()),
            name: p.name || '未命名调查员',
            updatedAt: p.updatedAt || Date.now(),
            state: p.state || D.createDefaultState()
          }));
          activeProfileId = profiles.some(p => p.id === data.activeId) ? data.activeId : profiles[0].id;
          const active = profiles.find(p => p.id === activeProfileId);
          return normalizeState(active.state);
        }
      }
    } catch (e) {
      console.warn('load profiles failed', e);
    }
    let legacy = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) legacy = JSON.parse(raw);
    } catch (e) { }
    const st = legacy ? normalizeState(legacy) : D.createDefaultState();
    const first = {
      id: 'char_' + uid(),
      name: profileLabel(st),
      updatedAt: Date.now(),
      state: st
    };
    profiles = [first];
    activeProfileId = first.id;
    persistProfiles();
    return st;
  }

  function loadState() {
    return loadProfileState();
  }

  let state = loadState();
  let computed = C.compute(state);
  let statDeltas = {};
  let stTool = loadSTTool();
  let activeView = 'overview';
  let saveTimer = null;
  let lastSaved = null;

  const ui = {
    ready: false,
    appDir: '',
    dataRoot: '',
    extraFolders: [],
    skillFilter: 'all',
    stCollapsedAttacks: new Set(),
    stCollapsedEntries: new Set(),
    skillQuery: '',
    collapsedSections: new Set(['identity', 'attributes', 'skills', 'defense', 'equipment', 'notes']),
    resourceTab: 'traits',
    rulesMounted: false,
    rules: {
      books: [],
      activeBook: '',
      toc: [],
      tocLoading: false,
      tocBook: '',
      nodeMap: {},
      expanded: new Set(),
      pagePath: '',
      pageTitle: '',
      pageBook: '',
      searchQuery: '',
      searchActive: false,
      searchScope: 'all',
      libraryCollapsed: false,
      searching: false,
      results: [],
      total: 0,
      elapsed: 0,
      error: '',
      requestSeq: 0,
      searchTimer: null
    }
  };

  const pending = new Map();
  const APP_VERSION = 'V1.112';
  const UPDATES = [
    {
      version: 'V1.112', date: '2026-11-06', title: '全站重绘降抖动', current: true,
      notes: ['重绘保留滚动位置', '重绘恢复输入焦点']
    },
    {
      version: 'V1.111', date: '2026-11-06', title: 'ST 点击抖动修复',
      notes: ['折叠/切目标不再整页重绘', '导航即时跳转']
    },
    {
      version: 'V1.110', date: '2026-11-06', title: 'ST 导航与折叠按钮修复',
      notes: ['修复导航/目标卡点击', '折叠和移除改为文字按钮']
    },
    {
      version: 'V1.109', date: '2026-11-06', title: 'ST 调查员卡折叠',
      notes: ['ST 调查员卡可折叠']
    },
    {
      version: 'V1.108', date: '2026-11-06', title: 'ST 攻击行折叠',
      notes: ['每条攻击可展开/折叠详情']
    },
    {
      version: 'V1.107', date: '2026-11-06', title: 'ST 页面导航与底部笔记',
      notes: ['笔记移到底部', '新增吸顶快捷导航', '修正攻击区旧说明']
    },
    {
      version: 'V1.106', date: '2026-11-06', title: 'ST 目标对比',
      notes: ['新增目标对比表', '对比随数值实时刷新']
    },
    {
      version: 'V1.105', date: '2026-11-06', title: 'ST 目标卡片与布局整理',
      notes: ['ST 目标改为目标卡片', 'ST 攻击完整读取', 'ST 笔记浮窗']
    },
    {
      version: 'V1.104', date: '2026-11-06', title: '防御反制与 ST 攻击导入',
      notes: ['新增抵高速/抵破甲/抵破魔', 'ST 完整读取攻击预设', 'ST 新增可拖动笔记']
    },
    {
      version: 'V1.103', date: '2026-11-03', title: '技能属性配色修复',
      notes: ['修复技能属性颜色被通用样式覆盖']
    },
    {
      version: 'V1.102', date: '2026-11-03', title: '技能属性配色',
      notes: ['技能关键属性按类别配色', '防御列文字/数字居中']
    },
    {
      version: 'V1.101', date: '2026-11-03', title: '防御列对齐与技能筛选',
      notes: ['防御列固定对齐', '已点技能筛选移动并即时更新']
    },
    {
      version: 'V1.100', date: '2026-11-03', title: 'ST 目标改名与规则书排除',
      notes: ['ST 目标改名即时更新', '目录信息支持不扫描规则书', '关于致谢更新']
    },
    {
      version: 'V1.99', date: '2026-11-03', title: '缩放拖动与来源配色',
      notes: ['缩放松开后应用，避免拖错', '防御来源自动绿/手动红/来源金']
    },
    {
      version: 'V1.98', date: '2026-11-03', title: '字体缩放与 ST 目标来源',
      notes: ['缩放面板新增字体缩放', 'ST 每个目标记住来源人物', '手机角色卡切换器缩短']
    },
    {
      version: 'V1.97', date: '2026-11-03', title: '缩放与 ST 多目标',
      notes: ['界面缩放恢复 85%', '防御来源数值即时计入合计', 'ST 支持多目标防御档案']
    },
    {
      version: 'V1.96', date: '2026-11-03', title: '防御来源语法',
      notes: ['来源支持括号数值计入合计', '表头增加语法说明']
    },
    {
      version: 'V1.95', date: '2026-11-03', title: '界面缩放回归页面缩放',
      notes: ['界面缩放最低 100%', '规则书独立缩放保留']
    },
    {
      version: 'V1.94', date: '2026-11-03', title: '手机适配与防御来源',
      notes: ['更多菜单增加导航栏黑框开关', '技能表压缩并支持已点技能筛选', '防御表支持来源标签与合计公式', 'ST 显示防御备注']
    },
    {
      version: 'V1.93', date: '2026-11-03', title: '规则书缩放与检索语法',
      notes: ['阅读栏新增规则书缩放条', '检索支持 AND / OR / NOT / NEAR / 短语 / 括号 / 通配符', '检索结果增加序号并移除页面路径']
    },
    {
      version: 'V1.92', date: '2026-11-04', title: '修复弹窗抖动',
      notes: ['移除弹窗背景模糊和透明度过渡']
    },
    {
      version: 'V1.91', date: '2026-11-04', title: '快速建卡预算',
      notes: ['模板改为初始规则预算', '显示属性点 / 技能点余额']
    },
    {
      version: 'V1.90', date: '2026-11-04', title: '建卡检查',
      notes: ['角色卡菜单新增检查角色卡']
    },
    {
      version: 'V1.89', date: '2026-11-04', title: '快速建卡',
      notes: ['角色卡菜单新增快速建卡', '四个模板，只改名称和三个关键属性']
    },
    {
      version: 'V1.87', date: '2026-11-04', title: '战斗示例读取真实攻击',
      notes: ['优先读取第一个攻击预设', '没有预设时才使用示例数字']
    },
    {
      version: 'V1.86', date: '2026-11-04', title: '一轮战斗示例',
      notes: ['新增“看懂一轮战斗”三步演示']
    },
    {
      version: 'V1.85', date: '2026-11-04', title: '数值变化提示',
      notes: ['修改属性后核心数值卡显示变化', '可直接打开对应数值说明']
    },
    {
      version: 'V1.84', date: '2026-11-04', title: '核心数值新手说明',
      notes: ['六张核心数值卡增加 ? 说明入口', '帮助页增加核心数值说明']
    },
    {
      version: 'V1.79', date: '2026-11-04', title: '检索摘要开关',
      notes: ['CHM 检索结果增加摘要显示 / 隐藏按钮']
    },
    {
      version: 'V1.78', date: '2026-11-04', title: '检索结果精简',
      notes: ['CHM 检索结果不再显示截断摘要']
    },
    {
      version: 'V1.76', date: '2026-11-04', title: '关于致谢更新',
      notes: ['更新关于页致谢文案']
    },
    {
      version: 'V1.75', date: '2026-11-03', title: '桌面功能同步',
      notes: [
        '攻击预设新增第二属性，支持决心 + 沉着',
        '自定义技能关键属性可选无',
        '手机版同步桌面 V1.75 的检定结构'
      ]
    },
    {
      version: 'V1.68', date: '2026-10-30', title: '手机版布局修复',
      notes: [
        '收支账本在手机上改为记录卡片，添加后完整显示',
        '人物卡防御构成的折叠按钮右对齐',
        'ST 工具按钮改成两列对齐'
      ]
    },
    {
      version: 'V1.67', date: '2026-10-29', title: '攻击预设列位右移',
      notes: [
        '总 DP、伤害上限、附加、能量四列整体右移',
        '攻击方式列加宽'
      ]
    },
    {
      version: 'V1.66', date: '2026-10-29', title: '新增攻击名称与备注调整',
      notes: [
        '新增攻击的名称输入框按标注收窄',
        '关键词 / 备注支持双击放大为可拖动浮窗'
      ]
    },
    {
      version: 'V1.65', date: '2026-10-29', title: '资源页效果框全部放大',
      notes: [
        '被动特性、主干资源、专长、主动技艺与载具效果框都支持双击放大',
        '放大窗口统一为可拖动的右侧浮窗'
      ]
    },
    {
      version: 'V1.64', date: '2026-10-29', title: '专长效果双击放大',
      notes: [
        '专长与开卡专长的效果框支持双击放大',
        '放大窗口与新增攻击相同，可拖动、可关闭',
        '保存后同步回原效果框'
      ]
    },
    {
      version: 'V1.63', date: '2026-10-29', title: '资源页字段精简',
      notes: [
        '专长与开卡专长字段等宽，效果框加宽',
        '移除专长 XP 计算与收支账本专长 XP',
        '主干资源不再填写支线与分数',
        '被动特性效果框加宽'
      ]
    },
    {
      version: 'V1.62', date: '2026-10-29', title: '购买清单浮窗精简',
      notes: [
        '购买清单只显示资源与资源介绍',
        '查看窗口改为与新增攻击相同的右侧浮窗，可拖动'
      ]
    },
    {
      version: 'V1.61', date: '2026-10-29', title: '资源页查看购买清单',
      notes: [
        '资源与技艺页的每个添加按钮旁新增“查看购买清单”',
        '弹窗只读展示收支账本中的购买记录与合计'
      ]
    },
    {
      version: 'V1.60', date: '2026-10-29', title: '账本列宽调整', current: false,
      notes: [
        '收窄支线、分数、经验三列输入框',
        '把腾出的宽度分配给备注与资源介绍'
      ]
    },
    {
      version: 'V1.59', date: '2026-10-29', title: '账本上下排列与拖动排序',
      notes: [
        '购买清单移动到收入记录下方',
        '收入记录默认折叠、购买清单默认展开',
        '两边的记录都支持拖动排序'
      ]
    },
    {
      version: 'V1.58', date: '2026-10-29', title: '账本放大框改为浮窗',
      notes: [
        '资源介绍与备注的放大框改为右侧浮窗',
        '浮窗可以继续查看其他页面，并可拖动'
      ]
    },
    {
      version: 'V1.57', date: '2026-10-29', title: '账本放大框可移动',
      notes: [
        '资源介绍与备注的放大窗口可以拖动标题栏移动',
        '移动位置会记住'
      ]
    },
    {
      version: 'V1.56', date: '2026-10-29', title: '账本占位提示与备注放大',
      notes: [
        '资源介绍与备注的占位文字统一改为“双击放大”',
        '收入记录的备注也支持双击弹出大文本框编辑'
      ]
    },
    {
      version: 'V1.55', date: '2026-10-29', title: '账本对齐与资源介绍放大', current: false,
      notes: [
        '收支账本的标题、数值与合计全部改为左对齐',
        '购买清单的资源介绍支持双击弹出大文本框编辑',
        '资源介绍弹窗保存后同步回表格'
      ]
    },
    {
      version: 'V1.54', date: '2026-10-29', title: '能量池描述框可调整',
      notes: [
        '能量池 / 刻度的恢复方式改为可拖动高度的多行文本框',
        '基础使用方式改为可拖动高度的多行文本框',
        '调整后的高度会自动保存'
      ]
    },
    {
      version: 'V1.53', date: '2026-10-29', title: '规则书目录展开标记', current: false,
      notes: [
        '规则书目录用 > 表示折叠、用 V 表示展开',
        '移除了目录左侧的竖线，层级只保留缩进'
      ]
    },
    {
      version: 'V1.52', date: '2026-10-29', title: '移除默认攻击与浮窗拖动',
      notes: [
        '战斗页不再自带任何默认攻击预设',
        '已有角色卡中的内置默认攻击会一并移除',
        '新增 / 编辑攻击预设的浮窗可以拖动标题栏移动'
      ]
    },
    {
      version: 'V1.50', date: '2026-10-28', title: '浮窗编辑与技能附加显示', current: false,
      notes: [
        '攻击预设编辑器改为浮窗，可继续切换其他页面',
        '攻击行新增复制按钮',
        '关键词备注改为可调整高度的文本框',
        '防御构成新增备注框',
        '手机端技能卡与总览技能速查显示附加成功'
      ]
    },
    {
      version: 'V1.48', date: '2026-10-27', title: '战斗预设额外附加成功',
      notes: [
        '战斗页的攻击预设编辑器新增“额外附加成功”输入',
        '额外附加成功会与属性、技能的附加成功相加，显示在攻击行',
        '编辑已有攻击时会保留并回填该数值'
      ]
    },
    {
      version: 'V1.47', date: '2026-10-27', title: 'ST 生命与总览对齐',
      notes: [
        'ST 的伤势计算回退为总览口径：完好生命 = 生命上限 − B − L − A',
        'B / L / A 不再自动转换进位，保留输入原值',
        'ST 调查员卡片增加融合流 / RM 切换按钮',
        '状态判定按当前模式执行，与总览的生命与状态一致',
        '角色卡多选导入继续保留'
      ]
    },
    {
      version: 'V1.46', date: '2026-10-27', title: '多选导入与伤势转换',
      notes: [
        '角色卡导入支持一次多选多个 JSON，批量加入角色卡列表',
        'ST 的 B / L / A 伤势会按 2B → 1L、2L → 1A 自动转换',
        '转换后当前生命、生命条和状态同步更新',
        '单文件导入仍保持替换当前角色卡，多文件导入会批量新增'
      ]
    },
    {
      version: 'V1.45', date: '2026-10-27', title: 'ST 所有操作保持位置',
      current: false,
      notes: [
        '新增攻击、删除攻击、刷新快照、载入调查员、导入 JSON、移除调查员、清空面板均保持滚动位置',
        'ST 操作不再回到页面顶部',
        '原有字段编辑、读取防御、伤势折算的原地更新继续保留'
      ]
    },
    {
      version: 'V1.44', date: '2026-10-27', title: 'ST 重新读取防御修复',
      notes: [
        '点击“重新读取防御”或切换防御来源时不再整页刷新',
        '目标防御数值、当前来源和攻击结算结果原地更新',
        '滚动位置与当前操作位置保持不变'
      ]
    },
    {
      version: 'V1.43', date: '2026-10-27', title: 'ST 操作与攻击检定读取',
      notes: [
        'ST 面板填写生命、意志、伤害、防御时不再整页刷新，滚动位置与输入焦点保持稳定',
        '填写 B / L / A 伤势会按融合流或 RM 规则自动折算当前生命，生命条与状态同步更新',
        'ST 攻击预设新增“读取攻击检定”，可从已载入的调查员攻击预设读取总 DP',
        '读取攻击检定时会同步攻击名与来源，之后仍可手动微调'
      ]
    },
    {
      version: 'V1.42', date: '2026-10-26', title: 'ST 破防与攻击效果',
      notes: [
        'ST 攻击预设新增高速、破甲、破魔三个数值',
        '三者会按战斗规则自动削减目标防御并影响最终DP',
        '每条 ST 攻击新增“攻击后效果 / 备注”文本框',
        '效果文本随 ST 面板保存，不参与数值计算'
      ]
    },
    {
      version: 'V1.41', date: '2026-10-26', title: 'ST 战斗计算与竖屏更多菜单',
      notes: [
        'ST 工具新增目标防御面板，可选择调查员读取防御，也可直接修改 13 项防御',
        'ST 新增独立攻击预设，总DP / 伤害上限 / 附加 / 次数 / 来源全部由 ST 填写',
        '按目标防御自动计算有效防御、最终DP与期望伤害，两个面板均可折叠',
        '竖屏标题栏新增“更多”，可打开更新目录、关于、帮助和重置'
      ]
    },
    {
      version: 'V1.40', date: '2026-10-25', title: '窗口边缘缩放修复',
      notes: [
        '修复无边框窗口四边和四角无法拖拽缩放的问题',
        'WebView2 不再覆盖整个窗口，边缘留出可拖拽区域',
        '手机端不受窗口缩放影响，沿用同一版本记录'
      ]
    },
    {
      version: 'V1.39', date: '2026-10-25', title: '技能专业栏',
      notes: [
        '技能检定表新增可编辑“专业”栏，可填写领域、专业或子项',
        '手机端技能改为卡片，专业栏使用亮黄色文字',
        '专业改为纯文本记录，不再计入 DP；专业加值请填“其他DP”',
        '技能筛选会同时匹配专业栏内容'
      ]
    },
    {
      version: 'V1.38', date: '2026-10-24', title: '规则书收藏夹与阅读亮度修正',
      notes: [
        '亮度 / 对比度 / 灰度不再作用于规则书正文，阅读页面保持原始清晰度',
        '规则书侧栏、目录和搜索仍可跟随显示调节',
        '新增收藏夹，可收藏单个规则页面并随时打开',
        '收藏夹支持折叠 / 展开，标题、计数与按钮和 book / TOC 使用同一套样式',
        '阅读栏新增星标按钮，可收藏或取消收藏当前页'
      ]
    },
    {
      version: 'V1.37', date: '2026-10-24', title: '界面字号整体上调',
      notes: [
        '软件内所有文字统一放大 1.5px',
        '覆盖总览、人物卡、战斗、资源、规则书、ST、弹窗、帮助与引导',
        '动态生成的内容也会自动应用同样字号',
        '现有布局、按钮和表格宽度保持不变'
      ]
    },
    {
      version: 'V1.36', date: '2026-10-24', title: '显示亮度 / 对比度 / 灰度调节',
      notes: [
        '标题栏新增“显示”按钮，可调亮度、对比度和灰度',
        '调节按明亮 / 暗黑主题分别保存',
        '明亮模式默认降低亮度与对比度，减少刺眼感',
        '显示面板可一键恢复当前主题默认值'
      ]
    },
    {
      version: 'V1.35', date: '2026-10-24', title: '攻击预设列居中',
      notes: [
        '总 DP、伤害上限、附加、能量和操作列改为居中',
        '表头与数值使用同一对齐方式',
        '攻击方式列仍保持左对齐'
      ]
    },
    {
      version: 'V1.34', date: '2026-10-24', title: '新手引导',
      notes: [
        '帮助弹窗新增“开始新手引导”入口',
        '用 15 步高亮介绍角色卡切换、总览、属性、防御、战斗、资源、规则书和 ST 工具',
        '支持上一步 / 下一步 / 跳过，窗口变化时自动重新定位高亮区域'
      ]
    },
    {
      version: 'V1.33', date: '2026-10-24', title: '攻击预设加入多次攻击与动作',
      notes: [
        '每个攻击预设可单独选择措手不及 / 接触攻击等级',
        '新增攻击次数，可计算多次攻击的总期望伤害',
        '新增动作消耗选择：标准 / 移动 / 迅捷 / 自由 / 反应 / 整轮',
        '攻击行摘要会显示次数、动作和本次附加效果'
      ]
    },
    {
      version: 'V1.32', date: '2026-10-24', title: 'ST 效果行顺序与配色',
      notes: [
        'ST 中措手不及 / 接触攻击改为“名称 → 数值框 → 等级选择”',
        '两个效果名称改为亮黄色',
        '数值框保持固定宽度并在两列中对齐'
      ]
    },
    {
      version: 'V1.31', date: '2026-10-24', title: 'ST 效果说明与数值前置',
      notes: [
        '鼠标移到措手不及 / 接触攻击上会显示该情形防御值的说明',
        '战斗页对方防御同样支持悬停说明',
        'ST 工具中这两个情形的防御数值移到名称前面，并对齐成固定框'
      ]
    },
    {
      version: 'V1.30', date: '2026-10-24', title: '措手不及与接触攻击分级',
      notes: [
        'ST 工具的措手不及、接触攻击改为无 / D / C / B / A / S 选择',
        '战斗页对方防御的措手不及、接触攻击也改为同样的分级选择',
        '无 = 不启用，选择等级后仍按原有规则扣除对应防御'
      ]
    },
    {
      version: 'V1.29', date: '2026-10-24', title: '攻击预设配色调整',
      notes: [
        '攻击预设的自动计算标签改为亮黄色',
        '总 DP、伤害上限、附加、最终 DP、期望伤害等数值改为蓝色',
        '明亮模式下使用对应的深黄 / 深蓝配色'
      ]
    },
    {
      version: 'V1.28', date: '2026-10-24', title: '规则书头部完全统一',
      notes: [
        '“规则书 / LIBRARY”改用“目录 / CONTENTS”的标题字号与字距',
        '书籍数量与目录页数使用同一套计数样式',
        '折叠 / 展开按钮直接复用目录按钮的尺寸与配色'
      ]
    },
    {
      version: 'V1.27', date: '2026-10-24', title: 'ST 手动调整、规则书风格统一',
      notes: [
        '攻击预设的自动计算数值改为黄色',
        'ST 工具中的意志、伤害 B/L/A 与五项防御值均可手动调整',
        '规则书页的书籍字体、说明字号与按钮样式统一',
        '规则书折叠按钮与目录按钮使用同一套视觉风格'
      ]
    },
    {
      version: 'V1.26', date: '2026-10-24', title: '规则书列表折叠',
      notes: [
        '规则书列表标题栏新增折叠 / 展开按钮',
        '折叠后只显示当前选中的规则书，方便专注阅读',
        '展开后恢复全部已添加的规则书'
      ]
    },
    {
      version: 'V1.25', date: '2026-10-24', title: 'ST 工具、开卡专长与描述框补全',
      notes: [
        '新增“ST 工具”页面，可载入多名调查员的生命与防御状态',
        'ST 面板内调整生命值只影响临时面板，不修改原角色卡',
        '被动特性、普通专长与开卡专长的效果改为可拖动描述框',
        '专长页新增开卡专长：等级、专长名、建卡专长点、效果',
        '攻击预设的自动计算数值改为青绿色显示',
        '总览移除导出按钮与身份档案按钮'
      ]
    },
    {
      version: 'V1.24', date: '2026-10-24', title: '档案摘要并入总览头部',
      notes: [
        '总览底部的档案摘要合并到顶部角色信息区',
        '摘要内容改为可滚动的档案文本，不再单独占一个大面板',
        '身份档案按钮移到编辑 / 导出按钮下方'
      ]
    },
    {
      version: 'V1.23', date: '2026-10-24', title: '多角色卡与描述框尺寸记忆',
      notes: [
        '标题栏新增角色卡切换器，可新建、复制、切换与删除多张角色卡',
        '每张角色卡状态独立保存；原来的单卡数据自动迁移为第一张卡',
        '所有可拖动的描述框高度会自动保存，退出软件后仍保持',
        '帮助旁的重置改为菜单，可单独重置描述框尺寸，或重置角色卡'
      ]
    },
    {
      version: 'V1.22', date: '2026-10-24', title: '多条自定义加值',
      notes: [
        '攻击检定与伤害上限的自定义加值改为可添加多条',
        '每条自定义加值都可以独立命名和填写数值',
        '自定义加值支持逐条删除，并分别计入攻击 DP 与伤害上限'
      ]
    },
    {
      version: 'V1.21', date: '2026-10-24', title: '自定义加值、能量字段拆分与身份入口',
      notes: [
        '攻击检定和伤害上限的加值类型都增加可改名的自定义加值',
        '总览头像右侧增加身份档案入口，点击直接展开人物卡身份档案',
        '能量池名称统一为“名称”',
        '恢复方式与基础使用方式拆成上下两个独立输入框'
      ]
    },
    {
      version: 'V1.20', date: '2026-10-24', title: '攻击加骰、加值拆分、头像与刻度',
      notes: [
        '攻击预设新增 8 / 9 / 10 加骰选择，并参与期望值估算',
        '攻击检定与伤害上限的加值按内在 / 增强 / 能量 / 器械 / 完美 / 修行 / 其他拆分',
        '总览头像支持点击上传图片、自动裁切为方形并本地保存',
        '能量池扩展为“能量池 / 刻度”，可分别添加；恢复方式改为“恢复方式 / 基础使用方式”'
      ]
    },
    {
      version: 'V1.19', date: '2026-10-24', title: '基础防御属性可选与传奇加值',
      notes: [
        '防御构成可选择基础防御的两项属性，并切换取低 / 取高',
        '支持耐力等其他属性作为基础防御；两项选同一属性即单属性防御',
        '属性构成新增“传奇加值”列，PL 可手动追加传奇属性',
        '传奇加值会即时影响传奇、技能附加成功与衍生数值'
      ]
    },
    {
      version: 'V1.18', date: '2026-10-24', title: '人物卡全折叠与能量池横排',
      notes: [
        '人物卡六个分区都支持折叠，身份档案和角色备注补上折叠按钮',
        '进入人物卡时默认全部收起，点标题或箭头展开',
        '战斗页能量池改为横向卡片排列',
        '能量池移动到 PL 技艺面板上方'
      ]
    },
    {
      version: 'V1.17', date: '2026-10-24', title: '攻击预设与防御减免自由配置',
      notes: [
        '防御构成新增伤害减免 DR，可记录数值、类型 / 弱点与来源',
        '攻击预设可自由选择攻击属性、技能，并单独配置伤害上限',
        '可新增 / 命名 / 删除攻击预设，伤害上限支持属性 + 技能 + 武器 / 威力 / 其他',
        '逐条命中对照改为 PL 主动技艺面板；主动技艺可新增和删除栏位'
      ]
    },
    {
      version: 'V1.16', date: '2026-10-24', title: '小窗侧栏固定底部',
      notes: [
        '侧栏内容改为独立滚动，矮窗口不再把底部顶出画面',
        '帮助与重置固定在侧栏底部，小窗也能直接点',
        '正常窗口布局保持不变'
      ]
    },
    {
      version: 'V1.15', date: '2026-10-24', title: '战斗预设表全列收敛',
      notes: [
        '检查所有页面在 115% 缩放下的边界',
        '攻击预设表缩进卡片内，默认窗口可看到完整列',
        '窄窗口仍保留横向滚动，不影响填写'
      ]
    },
    {
      version: 'V1.14', date: '2026-10-24', title: '战斗结果表格自适应',
      notes: [
        '逐条命中对照表宽度收进卡片内，不再压到右侧能量池',
        '“能量”列和底部说明可以完整显示',
        '窗口缩放后仍保留横向滚动兜底'
      ]
    },
    {
      version: 'V1.13', date: '2026-10-24', title: '全局界面缩放',
      notes: [
        '按钮、字体、表格和阅读页统一放大到参考截图的大小',
        '窗口内所有区域按 115% 缩放，布局与侧栏同步调整',
        '主题切换、检索和角色卡功能保持不变'
      ]
    },
    {
      version: 'V1.12', date: '2026-10-24', title: '本书内检索与装备可读性',
      notes: [
        '规则书检索增加“全库 / 本书内”范围切换',
        '规则书检索结果字号与对比度提高',
        '装备位的槽位名、名称与效果输入更清晰'
      ]
    },
    {
      version: 'V1.11', date: '2026-10-24', title: '全页面说明文字对比优化',
      notes: [
        '统一提高说明、注释、表头、技能类别等次级文字的亮度与字号',
        '暗黑 / 明亮两套主题同步调整',
        '总览说明列右对齐，防御情形、技能速查等说明更清晰'
      ]
    },
    {
      version: 'V1.10', date: '2026-10-24', title: '明亮模式与可读性',
      notes: [
        '标题栏新增暗黑 / 明亮模式切换，并记住选择',
        '衍生与豁免表头“说明”改为右对齐',
        '继续提高字号与文字 / 背景对比度'
      ]
    },
    {
      version: 'V1.9', date: '2026-10-24', title: '更新目录与关于迁移',
      notes: [
        '侧栏红框区域新增“更新目录”和“关于”入口',
        '关于页从规则书右上角迁入侧栏',
        '版本号按每次更新递增'
      ]
    },
    {
      version: 'V1.8', date: '2026-10-23', title: '人物卡折叠分区',
      notes: [
        '属性构成、技能检定、防御构成、装备位支持折叠 / 展开',
        '点击分区标题或右侧下拉箭头即可收起'
      ]
    },
    {
      version: 'V1.7', date: '2026-10-23', title: '表单与可读性更新',
      notes: [
        '能量池名称、当前 / 上限、恢复方式改为独立标签输入',
        '身份档案补上怪癖、美德 / 恶德、缺陷',
        '衍生与豁免新增“加值”列',
        '整体字号放大，关键数值改为金色高亮'
      ]
    },
    {
      version: 'V1.6', date: '2026-10-23', title: '防御基础取高',
      notes: [
        '总览 → 防御情形新增“基础取高”切换',
        '同时影响自动基础防御、五种防御情形与套用防御'
      ]
    },
    {
      version: 'V1.5', date: '2026-10-23', title: '修复窗口拖动',
      notes: [
        '改用 Windows 原生标题栏拖动',
        '最大化状态下拖动也能还原为窗口'
      ]
    },
    {
      version: 'V1.4', date: '2026-10-23', title: '新增关于致谢页',
      notes: [
        '感谢滑稽金_金子、觉妖怪、啤酒鸦和广大群友',
        '加入 ∞ 徽记、轨道环与金色重点高亮'
      ]
    },
    {
      version: 'V1.3', date: '2026-10-23', title: '高亮展开与折叠',
      notes: [
        '目录“展开 / 折叠”按钮改为金色高亮',
        '提升字号与对比度'
      ]
    },
    {
      version: 'V1.2', date: '2026-10-23', title: 'CHM 子页显示',
      notes: [
        '规则书一级目录默认展开，直接显示子页面',
        '目录栏增加展开全部 / 折叠全部'
      ]
    },
    {
      version: 'V1.1', date: '2026-10-23', title: '修复打开目录报错',
      notes: [
        '不再调用 explorer.exe，避免 0xc0000142',
        '改为软件内目录信息面板，支持复制路径'
      ]
    },
    {
      version: 'V1.0', date: '2026-10-23', title: '初版交付',
      notes: [
        '根据 Excel 实现角色卡、战斗计算、资源与收支账本',
        '内置 CHM 目录阅读与全文检索',
        '确认 WebView2 组件并添加启动快捷方式'
      ]
    }
  ];

  function post(obj) {
    try {
      if (window.chrome && window.chrome.webview) window.chrome.webview.postMessage(obj);
      else console.debug('[bridge]', obj);
    } catch (e) {
      console.warn('post failed', e);
    }
  }

  function request(type, payload, timeoutMs) {
    const requestId = 'req_' + (++ui.rules.requestSeq) + '_' + Date.now();
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
      post(Object.assign({ type, requestId }, payload || {}));
      window.setTimeout(() => {
        if (pending.has(requestId)) {
          pending.delete(requestId);
          reject(new Error('请求超时，请稍后重试'));
        }
      }, timeoutMs || 30000);
    });
  }

  function setSaveState(dirty) {
    const dot = $('#save-dot');
    const label = $('#save-label');
    if (!dot || !label) return;
    if (dirty) {
      dot.classList.remove('on');
      label.textContent = '有未保存的改动 · 自动保存中';
    } else {
      dot.classList.add('on');
      label.textContent = (lastSaved ? '已保存 ' + lastSaved : '本地工作台 · 自动存档');
    }
  }

  function saveNow() {
    try {
      syncActiveProfile();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      persistProfiles();
      lastSaved = nowTime();
      setSaveState(false);
      updateCharacterSwitcher();
    } catch (e) {
      toast('自动保存失败：' + e.message, 'error');
    }
  }

  function scheduleSave() {
    setSaveState(true);
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNow, 320);
  }

  function setPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (cur[p] === undefined || cur[p] === null) cur[p] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o === null || o === undefined) ? undefined : o[k], obj);
  }

  function toast(message, type) {
    const wrap = $('#toasts');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = message;
    wrap.appendChild(el);
    window.setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      el.style.transition = 'opacity .25s, transform .25s';
      window.setTimeout(() => el.remove(), 280);
    }, 3600);
  }

  function confirmDialog(opts) {
    const layer = $('#modal-layer');
    const card = $('#modal-card');
    card.style.width = '';
    card.innerHTML = `
      <div class="modal-title">${esc(opts.title || '确认操作')}</div>
      <div class="modal-text">${opts.text || ''}</div>
      <div class="modal-actions">
        <button class="btn" data-modal="cancel">${esc(opts.cancelText || '取消')}</button>
        <button class="btn ${opts.danger ? 'primary' : 'gold'}" data-modal="ok">${esc(opts.okText || '确认')}</button>
      </div>`;
    layer.hidden = false;
    const close = () => { layer.hidden = true; };
    $$('[data-modal]', card).forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.modal === 'ok') {
          close();
          if (opts.onConfirm) opts.onConfirm();
        } else close();
      };
    });
    layer.onclick = e => { if (e.target === layer) close(); };
    window.__modalClose = close;
  }

  function pageHeader(kicker, title, desc, actions) {
    return `<div class="page-head">
      <div>
        <div class="eyebrow">${esc(kicker)}</div>
        <h1 class="page-title">${esc(title)}</h1>
        ${desc ? `<p class="page-desc">${esc(desc)}</p>` : ''}
      </div>
      <div class="head-actions">${actions || ''}</div>
    </div>`;
  }

  function pill(tone, text) {
    return `<span class="status-pill ${tone || ''}">${esc(text)}</span>`;
  }

  function nInput(bind, value, cls, extra) {
    const v = (value === null || value === undefined) ? '' : value;
    return `<input type="number" class="${cls || 'cell-input'}" data-bind="${esc(bind)}" value="${esc(v)}" step="1" ${extra || ''}>`;
  }

  function tInput(bind, value, cls, placeholder) {
    return `<input type="text" class="${cls || 'cell-input'}" data-bind="${esc(bind)}" value="${esc(value || '')}" placeholder="${esc(placeholder || '')}">`;
  }

  function selectInput(bind, options, value, cls) {
    return `<select class="${cls || 'cell-input'}" data-bind="${esc(bind)}">${options.map(o => {
      const val = typeof o === 'string' ? o : o.value;
      const label = typeof o === 'string' ? o : o.label;
      return `<option value="${esc(val)}" ${String(val) === String(value || '') ? 'selected' : ''}>${esc(label)}</option>`;
    }).join('')}</select>`;
  }

  function statusTone(tone) { return tone === 'dead' ? 'dead' : tone === 'down' ? 'down' : tone === 'muted' ? 'muted' : ''; }

  function updateSidebar() {
    const c = computed;
    const st = $('#side-status');
    if (st) {
      st.className = 'status-pill ' + statusTone(c.health.statusTone);
      st.textContent = c.health.status;
    }
    const hp = $('#side-hp'); if (hp) hp.textContent = fmt(c.hp);
    const will = $('#side-will'); if (will) will.textContent = fmt(c.health.willCurrent) + ' / ' + fmt(c.will);
    const init = $('#side-init'); if (init) init.textContent = (c.initiative >= 0 ? '+' : '') + fmt(c.initiative) + ' · ' + fmt(c.speed);
    const def = $('#side-def'); if (def) def.textContent = fmt(c.baseDefense);
    updateCharacterSwitcher();
  }

  function updateChmSidebar() {
    const count = $('#chm-count');
    const dot = $('#chm-dot');
    const books = ui.rules.books || [];
    const ready = books.filter(b => b.status === 'ready').length;
    const busy = books.some(b => b.status === 'extracting' || b.status === 'indexing' || b.status === 'queued');
    if (count) count.textContent = books.length ? `${ready}/${books.length} 本可检索` : '未发现 CHM';
    if (dot) {
      dot.className = 'chm-dot ' + (ready > 0 && !busy ? 'ready' : busy ? 'busy' : '');
    }
  }

  function switchView(name) {
    if (!['overview', 'character', 'combat', 'resources', 'ledger', 'rules', 'st'].includes(name)) return;
    activeView = name;
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.nav === name));
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
    $('#main').classList.toggle('rules-mode', name === 'rules');
    if (name === 'rules') {
      if (!ui.rulesMounted) renderRules();
      else updateLibraryUI();
    } else {
      renderView(name);
      const main = $('#main');
      if (main) main.scrollTop = 0;
    }
  }

  function closeCharacterMenu() {
    const menu = $('#character-menu');
    if (menu) menu.hidden = true;
  }

  function renderCharacterMenu() {
    const menu = $('#character-menu');
    if (!menu) return;
    syncActiveProfile();
    menu.innerHTML = `<div class="cm-head"><span>角色卡</span><b>${profiles.length}</b></div>
      <div class="cm-list">${profiles.map(p => `<button class="cm-item ${p.id === activeProfileId ? 'active' : ''}" data-action="switch-character" data-id="${esc(p.id)}">
        <span class="cm-name">${esc(p.name || '未命名调查员')}</span>
        <span class="cm-meta">${p.id === activeProfileId ? '当前角色' : new Date(p.updatedAt || Date.now()).toLocaleDateString('zh-CN')}</span>
      </button>`).join('')}</div>
      <div class="cm-actions">
        <button data-action="quick-build">快速建卡</button><button data-action="check-character">检查角色卡</button><button data-action="create-character">＋ 新建</button>
        <button data-action="duplicate-character">复制</button>
        <button data-action="delete-character">删除</button>
      </div>`;
  }

  function toggleCharacterMenu() {
    const menu = $('#character-menu');
    if (!menu) return;
    if (menu.hidden) {
      renderCharacterMenu();
      menu.hidden = false;
    } else {
      menu.hidden = true;
    }
  }

  function updateCharacterSwitcher() {
    const name = $('#character-switch-name');
    if (name) name.textContent = profileLabel(state);
    const menu = $('#character-menu');
    if (menu && !menu.hidden) renderCharacterMenu();
  }

  function switchCharacter(id) {
    if (!id || id === activeProfileId) { closeCharacterMenu(); return; }
    const target = profiles.find(p => p.id === id);
    if (!target) return;
    saveNow();
    activeProfileId = id;
    state = normalizeState(JSON.parse(JSON.stringify(target.state)));
    computed = C.compute(state);
    statDeltas = {};
    ui.skillFilter = 'all';
    ui.skillQuery = '';
    closeCharacterMenu();
    switchView('overview');
    updateSidebar();
    saveNow();
    toast('已切换到「' + profileLabel(state) + '」');
  }

  function createCharacter() {
    saveNow();
    const st = D.createDefaultState();
    st.meta.name = '新角色';
    const p = { id: 'char_' + uid(), name: st.meta.name, updatedAt: Date.now(), state: st };
    profiles.push(p);
    activeProfileId = p.id;
    state = st;
    computed = C.compute(state);
    statDeltas = {};
    closeCharacterMenu();
    switchView('overview');
    updateSidebar();
    saveNow();
    toast('已新建角色卡');
  }

  function duplicateCharacter() {
    saveNow();
    const st = JSON.parse(JSON.stringify(state));
    st.meta.name = (state.meta.name || '角色') + ' 副本';
    const p = { id: 'char_' + uid(), name: st.meta.name, updatedAt: Date.now(), state: st };
    profiles.push(p);
    activeProfileId = p.id;
    state = normalizeState(st);
    computed = C.compute(state);
    statDeltas = {};
    closeCharacterMenu();
    switchView('overview');
    updateSidebar();
    saveNow();
    toast('已复制当前角色卡');
  }

  function deleteCharacter() {
    if (profiles.length <= 1) {
      toast('至少保留一张角色卡');
      return;
    }
    const current = profiles.find(p => p.id === activeProfileId);
    if (!current) return;
    confirmDialog({
      title: '删除角色卡？',
      text: `将删除「${esc(current.name || '未命名调查员')}」。此操作不可撤销，建议先导出备份。`,
      danger: true,
      okText: '删除角色卡',
      onConfirm: () => {
        profiles = profiles.filter(p => p.id !== activeProfileId);
        activeProfileId = profiles[0].id;
        state = normalizeState(JSON.parse(JSON.stringify(profiles[0].state)));
        computed = C.compute(state);
        statDeltas = {};
        closeCharacterMenu();
        switchView('overview');
        updateSidebar();
        saveNow();
        toast('已删除角色卡');
      }
    });
  }

  function textareaSizeMap() {
    try { return JSON.parse(localStorage.getItem(TEXTAREA_SIZES_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }

  function applyTextareaSizes() {
    const sizes = textareaSizeMap();
    const view = $('#view-' + activeView) || document;
    $$('textarea', view).forEach((el, i) => {
      if (!el.dataset.resizeKey) el.dataset.resizeKey = el.dataset.bind || ('ta_' + i);
      const h = Number(sizes[el.dataset.resizeKey]);
      if (Number.isFinite(h) && h >= 24) el.style.height = h + 'px';
    });
  }

  function saveTextareaSize(el) {
    if (!el || !el.dataset.resizeKey) return;
    const h = Math.round(el.getBoundingClientRect().height);
    if (!Number.isFinite(h) || h < 24) return;
    const sizes = textareaSizeMap();
    sizes[el.dataset.resizeKey] = h;
    try { localStorage.setItem(TEXTAREA_SIZES_KEY, JSON.stringify(sizes)); } catch (e) { }
  }

  function resetTextareaSizes() {
    try { localStorage.removeItem(TEXTAREA_SIZES_KEY); } catch (e) { }
    $$('textarea').forEach(el => { el.style.height = ''; });
    toast('已重置所有描述框尺寸');
  }

  function renderView(name) {
    const mount = $('#view-' + name);
    if (!mount) return;
    const main = $('#main');
    const hadContent = mount.childElementCount > 0;
    const keepScroll = hadContent && main ? main.scrollTop : 0;
    const focused = document.activeElement;
    const focusBind = focused && focused.getAttribute ? focused.getAttribute('data-bind') : '';
    const focusId = focused && focused.id ? focused.id : '';
    let selStart = null, selEnd = null;
    try {
      if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) {
        selStart = focused.selectionStart; selEnd = focused.selectionEnd;
      }
    } catch (e) { }
    if (name === 'overview') mount.innerHTML = overviewHTML();
    else if (name === 'character') mount.innerHTML = characterHTML();
    else if (name === 'combat') mount.innerHTML = combatHTML();
    else if (name === 'resources') mount.innerHTML = resourcesHTML();
    else if (name === 'ledger') mount.innerHTML = ledgerHTML();
    else if (name === 'st') mount.innerHTML = stHTML();
    if (name === 'overview') refreshOverview();
    if (name === 'character') { applySkillFilter(); refreshCharacter(); }
    if (name === 'combat') refreshCombat();
    if (name === 'resources') refreshResources();
    if (name === 'ledger') refreshLedger();
    applyTextareaSizes();
    if (hadContent && main) {
      main.scrollTop = keepScroll;
      requestAnimationFrame(() => { if (main) main.scrollTop = keepScroll; });
    }
    if (focusBind || focusId) {
      const target = focusId ? document.getElementById(focusId) : document.querySelector(`[data-bind="${CSS.escape(focusBind)}"]`);
      if (target) {
        target.focus({ preventScroll: true });
        if (selStart !== null) {
          try { target.setSelectionRange(selStart, selEnd); } catch (e) { }
        }
      }
    }
  }

  function stateChanged(opts) {
    computed = computeTracked();
    updateSidebar();
    scheduleSave();
    if (opts && opts.rerender) {
      renderView(activeView);
      return;
    }
    if (activeView === 'overview') refreshOverview();
    else if (activeView === 'character') refreshCharacter();
    else if (activeView === 'combat') refreshCombat();
    else if (activeView === 'resources') refreshResources();
    else if (activeView === 'ledger') refreshLedger();
  }

  function healthModeText(mode) {
    return mode === 'rm' ? '海马 / RM 口径' : '融合流口径';
  }

  function overviewHTML() {
    const c = computed;
    const db = state.derivedBonus || {};
    const baseAName = (D.ATTR_MAP[state.defense.baseA] || D.ATTR_MAP.agi).name;
    const baseBName = (D.ATTR_MAP[state.defense.baseB] || D.ATTR_MAP.per).name;
    const dbonus = key => nInput('derivedBonus.' + key, db[key] || 0, 'cell-input derived-input');
    const name = state.meta.name || '未命名调查员';
    const tagBits = [
      state.meta.concept, state.meta.race, state.meta.team
    ].filter(Boolean);
    const summaryHTML = state.notes
      ? esc(state.notes).replace(/\n/g, '<br>')
      : (state.meta.appearance || state.meta.concept
        ? esc(state.meta.appearance || state.meta.concept).replace(/\n/g, '<br>')
        : '<span class="dim">还没有写下角色概述。前往「人物卡」补充身份、外貌与备注。</span>');
    const tags = [
      `<span class="hero-tag accent">${esc(healthModeText(state.healthMode))}</span>`,
      ...tagBits.slice(0, 4).map(t => `<span class="hero-tag">${esc(t)}</span>`),
      c.health.status === '正常' ? '<span class="hero-tag">状态稳定</span>' : `<span class="hero-tag">${esc(c.health.status)}</span>`
    ].join('');
    const attrGroups = D.ATTR_GROUPS.map(g => `
      <div class="attr-group">
        <div class="group-tag"><b>${esc(g.name)}</b><span>${esc(g.en)}</span></div>
        <div class="attr-cards">
          ${g.attrs.map(k => {
            const a = c.attrs[k];
            return `<div class="attr-card" data-action="goto-character">
              <div><div class="attr-card-name">${esc(D.ATTR_MAP[k].name)}</div><div class="attr-card-en">${esc(D.ATTR_MAP[k].en)}</div></div>
              <div class="attr-card-value"><b>${fmt(a.total)}</b><span class="${a.legend ? '' : 'zero'}">传奇 ${a.legend}${a.extra ? ' · 附 +' + a.extra : ''}</span></div>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('');

    const scenarios = c.defense.scenarios.map(s => `
      <div class="def-row ${s.key === 'normal' ? 'highlight' : ''}">
        <span class="def-name">${esc(s.name)}</span>
        <span class="def-num" data-ov-def="${s.key}">${fmt(s.value)}</span>
        <span class="def-note">${esc(s.note)}</span>
      </div>`).join('');

    const energy = c.energyPools.length ? c.energyPools.map(p => `
      <div class="energy-item">
        <div class="energy-line"><span class="energy-name">${p.kind === 'gauge' ? '刻度 · ' : ''}${esc(p.name || '未命名')}</span><span class="energy-val">${fmt(p.current)} / ${fmt(p.max)}</span></div>
        <div class="energy-bar"><i style="width:${p.pct}%"></i></div>
      </div>`).join('') : '<div class="empty" style="padding:14px 10px;font-size:9px;">尚未建立能量池 / 刻度</div>';

    const skills = c.topSkills.length ? `<table class="skill-mini">
      <thead><tr><th>技能</th><th>类别</th><th>附加</th><th>检定 DP</th></tr></thead>
      <tbody>${c.topSkills.map(s => `<tr><td>${esc(s.name)}</td><td class="skill-cat">${esc(s.group)}</td><td class="skill-mini-succ">+${s.success}</td><td><b>${fmt(s.dp)}</b></td></tr>`).join('')}</tbody>
    </table>` : '<div class="empty" style="padding:14px 10px;font-size:9px;">还没有投入技能等级</div>';

    const warnings = c.warnings.length ? `<div class="panel mt18" style="border-color:rgba(208,94,94,.22);"><div class="panel-body" style="padding:11px 14px;color:#c98b86;font-size:9.5px;line-height:1.8;">${c.warnings.map(w => '· ' + esc(w)).join('<br>')}</div></div>` : '';

    return `
      ${pageHeader('CHARACTER OVERVIEW / 档案', '总览', '九属性、衍生值、防御与资源的即时快照。灰色数字会自动结算。', `
        <button class="btn gold" data-action="goto-rules">${ic('book')} 查阅规则书</button>
        <button class="btn primary" data-action="goto-combat">${ic('sword')} 进入战斗</button>`)}
      <section class="hero">
        <div class="hero-avatar ${state.meta.avatar ? 'has-avatar' : ''}" data-action="pick-avatar" title="点击上传 / 更换角色头像">
          ${state.meta.avatar ? `<img src="${esc(state.meta.avatar)}" alt="角色头像">` : `<span class="avatar-letter">${esc(name.slice(0, 1) === '未' ? '∞' : name.slice(0, 1))}</span>`}
          <span class="avatar-badge" aria-hidden="true">${ic('upload')}</span>
          ${state.meta.avatar ? `<button class="avatar-remove" data-action="remove-avatar" title="移除头像">${ic('close')}</button>` : ''}
        </div>
        <div class="hero-main">
          <div class="hero-profile">
            <div class="hero-kicker">INVESTIGATOR / 轮回档案 ${state.meta.player ? '· PLAYER ' + esc(state.meta.player) : ''}</div>
            <div class="hero-name">${esc(name)}</div>
            <div class="hero-tags">${tags}</div>
          </div>
          <div class="hero-summary">
            <div class="hero-summary-head"><span>ARCHIVE / 档案摘要</span><em>${state.meta.race ? esc(state.meta.race) : 'PROFILE'}</em></div>
            <div class="hero-summary-text">${summaryHTML}</div>
          </div>
        </div>
        <div class="hero-side">
          <div class="hero-status">${pill(statusTone(c.health.statusTone), c.health.status)}<span style="font-size:8px;color:#6e685e;">${esc(healthModeText(state.healthMode))}</span></div>
          <div class="hero-actions">
            <button class="btn small" data-action="goto-character">编辑人物卡</button>
            ${COMPACT() ? `<button class="btn small" data-action="import">${ic('upload')} 导入</button><button class="btn small" data-action="export">${ic('download')} 导出</button>` : ''}
          </div>
        </div>
      </section>
      <input id="avatar-input" type="file" accept="image/*" hidden>

      <div class="stat-strip">
        <div class="stat-card" style="--accent:rgba(184,73,78,.8)"><div class="stat-label">生命上限</div><div class="stat-value" data-ov="hp">${fmt(c.hp)}${statDeltaBadge('hp')}</div><div class="stat-foot">耐力 + 体型 + 传奇耐力</div>${statHelpButton('hp')}</div>
        <div class="stat-card" style="--accent:rgba(124,164,123,.75)"><div class="stat-label">意志上限</div><div class="stat-value" data-ov="will">${fmt(c.will)}${statDeltaBadge('will')}</div><div class="stat-foot">决心 + 沉着 + 双传奇</div>${statHelpButton('will')}</div>
        <div class="stat-card" style="--accent:rgba(201,168,110,.65)"><div class="stat-label">基础防御</div><div class="stat-value" data-ov="baseDefense">${fmt(c.baseDefense)}${statDeltaBadge('baseDefense')}</div><div class="stat-foot">${esc(baseAName)} / ${esc(baseBName)} 取${state.defense.baseMode === 'high' ? '高' : '低'}</div>${statHelpButton('baseDefense')}</div>
        <div class="stat-card" style="--accent:rgba(98,169,163,.65)"><div class="stat-label">先攻</div><div class="stat-value" data-ov="initiative">+${fmt(c.initiative)}${statDeltaBadge('initiative')}</div><div class="stat-foot">敏捷 + 沉着 + 传奇沉着</div>${statHelpButton('initiative')}</div>
        <div class="stat-card" style="--accent:rgba(201,168,110,.45)"><div class="stat-label">速度</div><div class="stat-value" data-ov="speed">${fmt(c.speed)}${statDeltaBadge('speed')}</div><div class="stat-foot">力量 + 敏捷 + 体型</div>${statHelpButton('speed')}</div>
        <div class="stat-card" style="--accent:rgba(98,169,163,.45)"><div class="stat-label">敏感范围</div><div class="stat-value" data-ov="sensitive">${fmt(c.sensitive)}<small>m</small>${statDeltaBadge('sensitive')}</div><div class="stat-foot">模糊范围 ${fmt(c.fuzzy)} m</div>${statHelpButton('sensitive')}</div>
      </div>
      ${statDeltaNote()}

      <div class="overview-grid">
        <div class="overview-left">
          <div class="panel">
            <div class="panel-head"><div class="panel-title">九属性</div><span class="panel-sub">合计 · 传奇 · 附加成功</span></div>
            <div class="panel-body"><div class="attr-groups">${attrGroups}</div></div>
          </div>
          <div class="panel">
            <div class="panel-head"><div class="panel-title">衍生与豁免</div><span class="panel-sub">AUTO DERIVED + 加值</span></div>
            <div class="panel-body">
              <table class="derived-table">
                <thead><tr><th>项目</th><th>加值</th><th>数值</th><th>说明</th></tr></thead>
                <tbody>
                  <tr><td>体积 / 体型</td><td>${dbonus('size')}</td><td><span data-derived="size">${fmt(c.size)}</span></td><td>基础 5 + 体型加值</td></tr>
                  <tr><td>速度</td><td>${dbonus('speed')}</td><td class="derived-value"><span data-derived="speed">${fmt(c.speed)}</span></td><td>力量 + 敏捷 + 传奇敏捷 ×3 + 体型</td></tr>
                  <tr><td>先攻</td><td>${dbonus('initiative')}</td><td class="derived-value"><span data-derived="initiative">${fmt(c.initiative)}</span></td><td>敏捷 + 沉着 + 传奇沉着</td></tr>
                  <tr><td>基础防御</td><td>${dbonus('baseDefense')}</td><td class="derived-value"><span data-derived="baseDefense">${fmt(c.baseDefense)}</span></td><td>${esc(baseAName)} / ${esc(baseBName)} 取${state.defense.baseMode === 'high' ? '高' : '低'}</td></tr>
                  <tr><td>生命上限</td><td>${dbonus('hp')}</td><td class="derived-value"><span data-derived="hp">${fmt(c.hp)}</span></td><td>耐力 + 体型 + 传奇耐力</td></tr>
                  <tr><td>意志上限</td><td>${dbonus('will')}</td><td class="derived-value"><span data-derived="will">${fmt(c.will)}</span></td><td>决心 + 沉着 + 双传奇</td></tr>
                  <tr><td>反射</td><td>${dbonus('reflex')}</td><td class="derived-value"><span data-derived="reflex">${fmt(c.reflex)}</span></td><td>敏捷 + 运动</td></tr>
                  <tr><td>强韧</td><td>${dbonus('fortitude')}</td><td class="derived-value"><span data-derived="fortitude">${fmt(c.fortitude)}</span></td><td>耐力 + 求生</td></tr>
                  <tr><td>意志豁免</td><td>${dbonus('willSave')}</td><td class="derived-value"><span data-derived="willSave">${fmt(c.willSave)}</span></td><td>意志值 + 传奇决心 + 加值</td></tr>
                  <tr><td>敏感范围</td><td>${dbonus('sensitive')}</td><td class="derived-value"><span data-derived="sensitive">${fmt(c.sensitive)}</span><span class="derived-unit">m</span></td><td>感知 ×10 + 传奇感知 ×20</td></tr>
                  <tr><td>模糊范围</td><td>${dbonus('fuzzy')}</td><td class="derived-value"><span data-derived="fuzzy">${fmt(c.fuzzy)}</span><span class="derived-unit">m</span></td><td>敏感范围 × 10</td></tr>
                  <tr><td>融合流伤害值</td><td><span class="derived-na">—</span></td><td class="derived-value"><span data-derived="fusionDamage">${fmt(c.health.fusionDamage)}</span></td><td>B + 2L + 4A</td></tr>
                </tbody>
              </table>
              <div class="derived-note">加值用于资源 / 装备 / 状态提供的衍生加值，会叠加到自动值。<b>基础防御加值</b>只加在自动值上，和防御构成中的手动格叠加；生命 / 意志加值会即时影响状态判定。</div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><div class="panel-title">技能速查</div><button class="btn small" data-action="goto-character">全部技能</button></div>
            <div class="panel-body">${skills}</div>
          </div>
        </div>
        <div class="overview-right">
          <div class="panel health-panel">
            <div class="panel-head">
              <div class="panel-title">生命与状态</div>
              <div style="display:flex;gap:4px;">
                <button class="chip ${state.healthMode === 'fusion' ? 'active' : ''}" data-action="health-mode" data-mode="fusion">融合流</button>
                <button class="chip ${state.healthMode === 'rm' ? 'active' : ''}" data-action="health-mode" data-mode="rm">RM</button>
              </div>
            </div>
            <div class="panel-body">
              <div class="health-top">
                <div><div class="stat-label">完好生命</div><div class="hp-big" id="ov-hp-big">${fmt(c.hp - c.health.b - c.health.l - c.health.a)}<small>/ ${fmt(c.hp)}</small></div></div>
                <div>${pill(statusTone(c.health.statusTone), c.health.status)}</div>
              </div>
              <div class="health-parts">
                <label class="health-part b"><div class="hp-label"><span>冲击 B</span></div>${nInput('health.b', state.health.b, '', 'min="0"')}</label>
                <label class="health-part l"><div class="hp-label"><span>严重 L</span></div>${nInput('health.l', state.health.l, '', 'min="0"')}</label>
                <label class="health-part a"><div class="hp-label"><span>恶性 A</span></div>${nInput('health.a', state.health.a, '', 'min="0"')}</label>
              </div>
              <div class="hp-bar"><i id="ov-hp-bar" style="width:${c.hp > 0 ? Math.max(0, Math.min(100, (c.hp - c.health.b - c.health.l - c.health.a) / c.hp * 100)) : 0}%"></i></div>
              <div class="health-note" id="ov-health-note">${state.healthMode === 'fusion'
                ? '融合流：伤害值 = B + 2L + 4A；达到生命上限的 70% 时昏迷，填满生命即死亡。'
                : '海马 / RM：无完好生命即昏迷，恶性 A 达到生命上限即死亡；2B → 1L，2L → 1A。'}</div>
              <div class="will-line">
                <span class="will-label">当前意志</span>
                ${nInput('defense.willCurrent', c.health.willCurrent, '', 'min="0"')}
                <span class="will-max" id="ov-will-max">/ ${fmt(c.will)}</span>
                <button class="btn small" data-action="refill-will">回满</button>
              </div>
              <div class="health-note" style="margin-top:7px;">已消耗意志 ${fmt(c.health.willConsumed)} · 生命判定同时计算两种口径，当前展示 ${esc(healthModeText(state.healthMode))}</div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title">防御情形</div>
              <div class="def-head-tools">
                <span class="panel-sub">DEFENSE</span>
                <button class="def-high-btn ${state.defense.baseMode === 'high' ? 'on' : ''}" data-action="toggle-base-defense" aria-pressed="${state.defense.baseMode === 'high' ? 'true' : 'false'}" title="部分资源允许基础防御按所选属性取高">
                  ${ic('shield')} 基础取${state.defense.baseMode === 'high' ? '高' : '低'}
                </button>
              </div>
            </div>
            <div class="panel-body"><div class="def-list">${scenarios}</div>
              <div class="def-mode-note">当前基础防御按 <b>${esc(baseAName)} / ${esc(baseBName)} 取${state.defense.baseMode === 'high' ? '高' : '低'}</b>${state.defense.baseMode === 'high' ? '（资源效果）' : '（模板默认）'}；手动加值不受影响。</div>
              <button class="btn small mt12" data-action="goto-character">编辑防御构成</button>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><div class="panel-title">能量池 / 刻度</div><button class="btn small" data-action="goto-combat">管理</button></div>
            <div class="panel-body"><div class="energy-list">${energy}</div></div>
          </div>
        </div>
      </div>
      ${warnings}`;
  }

  function refreshOverview() {
    const c = computed;
    $$('[data-ov]').forEach(el => {
      const key = el.dataset.ov;
      let v = c[key];
      if (key === 'sensitive') { el.innerHTML = fmt(c.sensitive) + '<small>m</small>'; return; }
      el.textContent = key === 'initiative' ? '+' + fmt(v) : fmt(v);
    });
    $$('[data-ov-def]').forEach(el => {
      const s = c.defense.scenarios.find(x => x.key === el.dataset.ovDef);
      if (s) el.textContent = fmt(s.value);
    });
    const bar = $('#ov-hp-bar');
    if (bar) bar.style.width = (c.hp > 0 ? Math.max(0, Math.min(100, (c.hp - c.health.b - c.health.l - c.health.a) / c.hp * 100)) : 0) + '%';
    const hpBig = $('#ov-hp-big');
    if (hpBig) hpBig.innerHTML = `${fmt(c.hp - c.health.b - c.health.l - c.health.a)}<small>/ ${fmt(c.hp)}</small>`;
    const willMax = $('#ov-will-max');
    if (willMax) willMax.textContent = '/ ' + fmt(c.will);
    const derivedValues = {
      size: c.size, speed: c.speed, initiative: c.initiative, baseDefense: c.baseDefense,
      hp: c.hp, will: c.will, reflex: c.reflex, fortitude: c.fortitude,
      willSave: c.willSave, sensitive: c.sensitive, fuzzy: c.fuzzy,
      fusionDamage: c.health.fusionDamage
    };
    $$('[data-derived]').forEach(el => {
      const v = derivedValues[el.dataset.derived];
      if (v !== undefined) el.textContent = fmt(v);
    });
    if (state.defense.willCurrent === null || state.defense.willCurrent === undefined) {
      const wi = $('input[data-bind="defense.willCurrent"]');
      if (wi) wi.value = c.health.willCurrent;
    }
    const status = $('.health-panel .status-pill');
    if (status) {
      status.className = 'status-pill ' + statusTone(c.health.statusTone);
      status.textContent = c.health.status;
    }
    const heroStatus = $('.hero-status .status-pill');
    if (heroStatus) {
      heroStatus.className = 'status-pill ' + statusTone(c.health.statusTone);
      heroStatus.textContent = c.health.status;
    }
    const note = $('#ov-health-note');
    if (note) note.textContent = state.healthMode === 'fusion'
      ? '融合流：伤害值 = B + 2L + 4A；达到生命上限的 70% 时昏迷，填满生命即死亡。'
      : '海马 / RM：无完好生命即昏迷，恶性 A 达到生命上限即死亡；2B → 1L，2L → 1A。';
    updateSidebar();
  }

  function handleAvatarFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast('请选择图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('图片过大，请选择 10MB 以内的图片');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 360;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        state.meta.avatar = canvas.toDataURL('image/jpeg', 0.86);
        stateChanged({ rerender: true });
        toast('头像已更新');
      };
      img.onerror = () => toast('无法读取这张图片');
      img.src = reader.result;
    };
    reader.onerror = () => toast('无法读取这张图片');
    reader.readAsDataURL(file);
  }

  /* ============================================================
     CHARACTER
     ============================================================ */
  function characterHTML() {
    const c = computed;
    const attrOptions = [{ value: 'none', label: '无' }].concat(D.ATTRS.map(a => ({ value: a.key, label: a.name })));
    const baseAName = (D.ATTR_MAP[state.defense.baseA] || D.ATTR_MAP.agi).name;
    const baseBName = (D.ATTR_MAP[state.defense.baseB] || D.ATTR_MAP.per).name;
    const idFields = [
      ['name', '姓名', 'text'], ['player', '玩家', 'text'], ['gender', '性别', 'text'], ['age', '年龄', 'text'],
      ['race', '种族', 'text'], ['nationality', '国籍', 'text'], ['height', '身高', 'text'], ['weight', '体重', 'text'],
      ['languages', '语言', 'text'], ['team', '队伍 / 团名', 'text'], ['concept', '概念 / 身份', 'text'], ['origin', '出身 / 世界', 'text']
    ].map(([key, label]) => `<div class="field"><label>${esc(label)}</label>${tInput('meta.' + key, state.meta[key], '', '')}</div>`).join('');

    const matrixRows = D.ATTR_GROUPS.map(g => `
      <tr class="matrix-group-row"><td colspan="13">${esc(g.name)} <span>${esc(g.en)}</span></td></tr>
      ${g.attrs.map(k => {
        const a = D.ATTR_MAP[k];
        const v = state.attributes[k] || {};
        const ca = c.attrs[k];
        return `<tr>
          <td class="attr-name">${esc(a.name)} <span>${esc(a.en)}</span></td>
          <td>${nInput('attributes.' + k + '.base', v.base, 'cell-input matrix-input', 'min="0"')}</td>
          <td>${nInput('attributes.' + k + '.internal', v.internal, 'cell-input matrix-input')}</td>
          <td>${nInput('attributes.' + k + '.enhance', v.enhance, 'cell-input matrix-input')}</td>
          <td>${nInput('attributes.' + k + '.energy', v.energy, 'cell-input matrix-input')}</td>
          <td>${nInput('attributes.' + k + '.instrument', v.instrument, 'cell-input matrix-input')}</td>
          <td>${nInput('attributes.' + k + '.perfect', v.perfect, 'cell-input matrix-input')}</td>
          <td>${nInput('attributes.' + k + '.practice', v.practice, 'cell-input matrix-input')}</td>
          <td>${nInput('attributes.' + k + '.other', v.other, 'cell-input matrix-input')}</td>
          <td class="matrix-total" data-attr-total="${k}">${fmt(ca.total)}</td>
          <td>${nInput('attributes.' + k + '.legendBonus', v.legendBonus, 'cell-input matrix-input legend-input', 'min="0"')}</td>
          <td class="matrix-legend" data-attr-legend="${k}">${ca.legend}</td>
          <td>${nInput('attributes.' + k + '.extra', v.extra, 'cell-input matrix-input', 'min="0"')}</td>
        </tr>`;
      }).join('')}
    `).join('');

    function skillRow(def, calc, index, custom) {
      const stored = custom ? state.customSkills[index] : state.skills[def.key];
      const attrKey = stored.attrOverride || def.attr;
      const attrName = attrKey === 'none' ? '无' : (D.ATTR_MAP[attrKey] ? D.ATTR_MAP[attrKey].name : attrKey);
      const group = custom ? (D.ATTR_MAP[stored.attr] ? D.ATTR_MAP[stored.attr].group : '其他') : def.group;
      const groupClass = group === '心智' ? 'attr-mental' : group === '生理' ? 'attr-physical' : group === '互动' ? 'attr-social' : '';
      const bind = custom ? 'customSkills.' + index : 'skills.' + def.key;
      const skillId = custom ? 'custom:' + index : def.key;
      const search = (stored.name || def.name) + ' ' + attrName + ' ' + group + ' ' + (stored.major || '') + ' ' + (def.note || '');
      if (COMPACT()) {
        return `<div class="skill-card" data-skill-row data-custom="${custom ? '1' : '0'}" data-group="${esc(group)}" data-note="${esc(def.note || '')}" data-search="${esc(search)}">
          <div class="skill-card-head">
            <div class="skill-card-name">
              ${custom ? tInput(bind + '.name', stored.name, 'cell-input mobile-skill-name', '技能名称') : `<b>${esc(def.name)}</b>${def.note ? `<small>${esc(def.note)}</small>` : ''}`}
            </div>
            <div class="skill-card-side">
              <span class="mobile-skill-succ" data-skill-succ-badge="${skillId}">附加 +${calc.success}</span>
              ${custom ? selectInput(bind + '.attr', [{ value: 'none', label: '无' }].concat(D.ATTRS.map(a => ({ value: a.key, label: a.name }))), stored.attr, 'cell-input mobile-skill-attr') : `<span class="mobile-skill-attr">${esc(attrName)}</span>`}
              ${custom ? `<button class="icon-btn" data-action="remove-custom-skill" data-index="${index}" title="删除技能">${ic('trash')}</button>` : ''}
            </div>
          </div>
          <div class="skill-card-major"><span class="mobile-skill-label">专业</span>${tInput(bind + '.major', stored.major, 'cell-input skill-major-input mobile-skill-major', '专业 / 领域 / 子项')}</div>
          <div class="skill-card-grid">
            <label class="mobile-skill-field"><span>等级</span>${nInput(bind + '.level', stored.level, 'cell-input', 'min="0"')}</label>
            <label class="mobile-skill-field"><span>附加</span>${nInput(bind + '.bonus', stored.bonus, 'cell-input')}</label>
            <label class="mobile-skill-field"><span>临时</span>${nInput(bind + '.temp', stored.temp, 'cell-input')}</label>
          </div>
          <div class="skill-card-extra">
            <label class="mobile-skill-field"><span>其他DP</span>${nInput(bind + '.otherDP', stored.otherDP, 'cell-input')}</label>
            <label class="mobile-skill-field"><span>其他附加</span>${nInput(bind + '.otherSuccess', stored.otherSuccess, 'cell-input')}</label>
            <span class="skill-card-stat">技能附加 <b class="${calc.over ? 'skill-over' : ''}" data-skill-succ="${skillId}">+${calc.success}</b></span>
            <span class="skill-card-stat">检定DP <b class="${calc.over ? 'skill-over' : ''}" data-skill-dp="${skillId}">${fmt(calc.dp)}</b></span>
          </div>
        </div>`;
      }
      return `<tr data-skill-row data-custom="${custom ? '1' : '0'}" data-level="${Number(stored.level) || 0}" data-group="${esc(group)}" data-note="${esc(def.note || '')}" data-search="${esc(search)}">
        <td class="skill-name ${custom ? 'skill-name-user' : ''}">
          ${custom ? tInput(bind + '.name', stored.name, 'cell-input', '技能名称') : esc(def.name) + (def.note ? `<small>${esc(def.note)}</small>` : '')}
        </td>
        <td class="skill-attr ${groupClass}">${custom ? selectInput(bind + '.attr', [{ value: 'none', label: '无' }].concat(D.ATTRS.map(a => ({ value: a.key, label: a.name }))), stored.attr, 'cell-input') : esc(attrName)}</td>
        <td class="center">${nInput(bind + '.level', stored.level, 'cell-input', 'min="0"')}</td>
        <td class="center">${nInput(bind + '.bonus', stored.bonus, 'cell-input')}</td>
        <td class="center">${nInput(bind + '.temp', stored.temp, 'cell-input')}</td>
        <td class="skill-major">${tInput(bind + '.major', stored.major, 'cell-input skill-major-input', '专业 / 领域 / 子项')}</td>
        <td class="center">${nInput(bind + '.otherDP', stored.otherDP, 'cell-input')}</td>
        <td class="center">${nInput(bind + '.otherSuccess', stored.otherSuccess, 'cell-input')}</td>
        <td class="skill-succ ${calc.over ? 'skill-over' : ''}" data-skill-succ="${skillId}">+${calc.success}</td>
        <td class="skill-dp ${calc.over ? 'skill-over' : ''}" data-skill-dp="${skillId}">${fmt(calc.dp)}</td>
        <td class="center">${custom ? `<button class="icon-btn" data-action="remove-custom-skill" data-index="${index}" title="删除技能">${ic('trash')}</button>` : ''}</td>
      </tr>`;
    }

    const baseRows = D.SKILLS.map(def => skillRow(def, c.skills[def.key], -1, false)).join('');
    const customRows = state.customSkills.map((s, i) => skillRow({ key: s.id, name: s.name, group: '', attr: s.attr, note: '自定义' }, c.customSkills[i], i, true)).join('');

    return `
      ${pageHeader('CHARACTER SHEET / 角色卡', '人物卡', '属性、技能与装备的所有可编辑字段。浅色数字由公式实时结算，不需要手动加总。', `
        <button class="btn gold" data-action="goto-overview">${ic('grid')} 返回总览</button>
        <button class="btn" data-action="export">${ic('download')} 导出存档</button>`)}
      <div class="panel collapsible">
        <div class="panel-head" data-section-head="identity">
          <div class="panel-title">身份档案</div>
          <div class="panel-head-right"><span class="panel-sub">IDENTITY</span>
            <button class="collapse-btn ${ui.collapsedSections.has('identity') ? 'collapsed' : ''}" data-action="toggle-section" data-section="identity" aria-expanded="${ui.collapsedSections.has('identity') ? 'false' : 'true'}" title="折叠 / 展开">${ic('chevron')}</button>
          </div>
        </div>
        <div class="panel-body ${ui.collapsedSections.has('identity') ? 'collapsed' : ''}" data-section-body="identity"><div class="identity-grid">${idFields}
          <div class="field wide-2"><label>外貌 / 特征</label>${tInput('meta.appearance', state.meta.appearance, '', '外貌、气质、标志性特征')}</div>
          <div class="field wide-2 identity-trait"><label>怪癖</label>${tInput('meta.quirks', state.meta.quirks, '', '习惯、执念、让人记住的小动作')}</div>
          <div class="field wide-2 identity-trait"><label>美德 / 恶德</label>${tInput('meta.virtue', state.meta.virtue, '', '例如：坚毅 / 傲慢')}</div>
          <div class="field wide-2 identity-trait"><label>缺陷</label>${tInput('meta.flaw', state.meta.flaw, '', '例如：旧伤、恐惧、无法拒绝赌局')}</div>
        </div></div>
      </div>

      <div class="panel mt18 collapsible">
        <div class="panel-head" data-section-head="attributes">
          <div class="panel-title">九属性构成</div>
          <div class="panel-head-right"><span class="panel-sub">合计 = 基础 + 内在 + 增强 + 能量 + 器械 + 完美 + 修行 + 其他</span>
            <button class="collapse-btn ${ui.collapsedSections.has('attributes') ? 'collapsed' : ''}" data-action="toggle-section" data-section="attributes" aria-expanded="${ui.collapsedSections.has('attributes') ? 'false' : 'true'}" title="折叠 / 展开">${ic('chevron')}</button>
          </div>
        </div>
        <div class="panel-body ${ui.collapsedSections.has('attributes') ? 'collapsed' : ''}" data-section-body="attributes">
          <div class="attr-matrix-wrap">
            <table class="matrix">
              <thead><tr>
                <th>属性</th><th>基础</th><th>内在</th><th>增强</th><th>能量</th><th>器械</th><th>完美</th><th>修行</th><th>其他</th><th>合计</th><th title="PL 手动追加的传奇属性">传奇加值</th><th>传奇</th><th>附加</th>
              </tr></thead>
              <tbody>${matrixRows}</tbody>
            </table>
          </div>
          <div class="matrix-wrap-note">传奇 = TRUNC((合计 - 1) / 5) + 传奇加值；「传奇加值」供 PL 手动写入资源、装备或能力额外提供的传奇属性。「附加」是属性带来的额外附加成功。合计为公式格，角色卡中无需手填。</div>
        </div>
      </div>

      <div class="panel mt18 collapsible">
        <div class="panel-head" data-section-head="skills">
          <div class="panel-title">技能检定</div>
          <div class="panel-head-right"><span class="panel-sub">DP = 关键属性 + 技能合计 + 其他DP　·　专业栏可填领域 / 子项</span>
            <button class="collapse-btn ${ui.collapsedSections.has('skills') ? 'collapsed' : ''}" data-action="toggle-section" data-section="skills" aria-expanded="${ui.collapsedSections.has('skills') ? 'false' : 'true'}" title="折叠 / 展开">${ic('chevron')}</button>
          </div>
        </div>
        <div class="panel-body ${ui.collapsedSections.has('skills') ? 'collapsed' : ''}" data-section-body="skills">
          <div class="skill-toolbar">
            <div class="search">${ic('search')}<input type="text" id="skill-search" value="${esc(ui.skillQuery)}" placeholder="筛选技能…"></div>
            <div class="filter-chips">
              <button class="chip ${ui.skillFilter === 'all' ? 'active' : ''}" data-skill-filter="all">全部</button>
              <button class="chip ${ui.skillFilter === 'learned' ? 'active' : ''}" data-skill-filter="learned">已点技能</button>
              <button class="chip ${ui.skillFilter === '心智' ? 'active' : ''}" data-skill-filter="心智">心智</button>
              <button class="chip ${ui.skillFilter === '生理' ? 'active' : ''}" data-skill-filter="生理">生理</button>
              <button class="chip ${ui.skillFilter === '互动' ? 'active' : ''}" data-skill-filter="互动">互动</button>
              <button class="chip ${ui.skillFilter === 'custom' ? 'active' : ''}" data-skill-filter="custom">自定义</button>
            </div>
            <button class="btn small gold" data-action="add-custom-skill">${ic('plus')} 自定义技能</button>
          </div>
          ${COMPACT() ? `<div class="skill-cards">${baseRows}${customRows}</div>` : `<div style="overflow-x:auto;">
            <table class="skill-table">
              <colgroup><col style="width:26%"><col style="width:7%"><col style="width:5%"><col style="width:5%"><col style="width:5%"><col style="width:18%"><col style="width:6%"><col style="width:6%"><col style="width:7%"><col style="width:10%"><col style="width:5%"></colgroup>
              <thead><tr>
                <th>技能</th><th>关键属性</th><th class="center">等级</th><th class="center">附加</th><th class="center">临时</th><th>专业</th><th class="center">其他DP</th><th class="center">其他附加</th><th class="center">技能附加</th><th class="center">检定DP</th><th></th>
              </tr></thead>
              <tbody>${baseRows}${customRows}</tbody>
            </table>
          </div>`}
          <div class="matrix-wrap-note">技能附加成功按等级阈值自动计算：5 / 10 / 11 / 13 / 15 级分别 +1 / +2 / +3 / +4 / +5。超过 15 级会以红色提示。自然成功数为 0 即失败，附加成功不能救回失败。</div>
        </div>
      </div>

      <div class="panel mt18 collapsible">
        <div class="panel-head" data-section-head="defense">
          <div class="panel-title">防御构成</div>
          <div class="panel-head-right"><span class="panel-sub">平时 = 合计 − 格挡　·　全力防御 = 合计 + 基础</span>
            <button class="collapse-btn ${ui.collapsedSections.has('defense') ? 'collapsed' : ''}" data-action="toggle-section" data-section="defense" aria-expanded="${ui.collapsedSections.has('defense') ? 'false' : 'true'}" title="折叠 / 展开">${ic('chevron')}</button>
          </div>
        </div>
        <div class="panel-body ${ui.collapsedSections.has('defense') ? 'collapsed' : ''}" data-section-body="defense">
          <div class="base-defense-config">
            <div class="base-defense-title">基础防御属性</div>
            <label class="base-defense-field">属性 A${selectInput('defense.baseA', attrOptions, state.defense.baseA || 'agi', 'cell-input base-defense-select')}</label>
            <label class="base-defense-field">属性 B${selectInput('defense.baseB', attrOptions, state.defense.baseB || 'per', 'cell-input base-defense-select')}</label>
            <button class="flag-toggle ${state.defense.baseMode === 'high' ? 'on' : ''}" data-action="toggle-base-defense">取${state.defense.baseMode === 'high' ? '高' : '低'}</button>
            <label class="base-defense-field">措手不及${selectInput('defense.flatfootedGrade', D.EFFECT_GRADES, state.defense.flatfootedGrade || 'none', 'cell-input base-defense-select')}</label>
            <label class="base-defense-field">接触攻击${selectInput('defense.contactGrade', D.EFFECT_GRADES, state.defense.contactGrade || 'none', 'cell-input base-defense-select')}</label>
            <span class="base-defense-hint">当前 = ${esc(baseAName)} / ${esc(baseBName)} 取${state.defense.baseMode === 'high' ? '高' : '低'}；选同一属性即单属性防御。</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="defense-table">
              <colgroup><col style="width:15%"><col style="width:6%"><col style="width:8%"><col style="width:6%"><col style="width:65%"></colgroup>
              <thead><tr><th>项目</th><th class="center">自动</th><th class="center">手动</th><th class="center">合计</th><th>来源 / 说明 <button class="def-th-help" data-action="defense-syntax-help" title="查看来源语法">?</button></th></tr></thead>
              <tbody>${D.DEFENSE_ITEMS.map(d => `<tr>
                <td class="def-name">${esc(d.name)}</td>
                <td class="center def-auto" data-defense-auto="${d.key}">${fmt((computed.defense.items.find(i => i.key === d.key) || {}).auto || 0)}</td>
                <td class="center">${nInput('defense.manual.' + d.key, state.defense.manual[d.key] || 0, 'cell-input defense-input')}</td>
                <td class="center def-total" data-defense-total="${d.key}">${fmt(computed.defense.byKey[d.key] || 0)}</td>
                <td class="def-desc"><input class="cell-input def-label-input" data-bind="defense.labels.${d.key}" value="${esc((state.defense.labels || {})[d.key] || '')}" placeholder="${esc(d.key === 'base' ? `${baseAName} / ${baseBName} 取${state.defense.baseMode === 'high' ? '高' : '低'}` : d.desc)}"></td>
              </tr>`).join('')}</tbody>
            </table>
            <div class="defense-formula" id="defense-formula">${defenseFormulaHTML(computed)}</div>
          </div>
          <div class="defense-note-row">
            <label>防御备注 / 附加成功<textarea data-bind="defense.note" rows="2" placeholder="记录防御附加成功、特殊防御、条件加值或需要提醒 ST 的效果…">${esc(state.defense.note || '')}</textarea></label>
          </div>
          <div class="dr-block">
            <div class="dr-head">
              <div><span class="dr-title">伤害减免 DR</span><span class="dr-sub">按类型 / 弱点记录，同一次伤害取能生效的最高值</span></div>
              <button class="btn small gold" data-action="add-dr">${ic('plus')} 新增 DR</button>
            </div>
            ${state.damageReductions.length ? `<div class="dr-table-wrap"><table class="dr-table">
              <thead><tr><th>来源</th><th>数值</th><th>类型 / 弱点</th><th>补充说明</th><th>备注</th><th></th></tr></thead>
              <tbody>${state.damageReductions.map((d, i) => `<tr>
                <td>${tInput('damageReductions.' + i + '.source', d.source, 'cell-input', '来源 / 装备')}</td>
                <td>${nInput('damageReductions.' + i + '.value', d.value, 'cell-input', 'min="0"')}</td>
                <td>${selectInput('damageReductions.' + i + '.type', D.DR_TYPES, d.type || '/-', 'cell-input')}</td>
                <td>${tInput('damageReductions.' + i + '.detail', d.detail, 'cell-input', '例如：银 / 寒铁 / 神兵')}</td>
                <td>${tInput('damageReductions.' + i + '.note', d.note, 'cell-input', '来源说明')}</td>
                <td><button class="icon-btn" data-action="remove-dr" data-index="${i}" title="删除">${ic('trash')}</button></td>
              </tr>`).join('')}</tbody>
            </table></div>` : `<div class="dr-empty">还没有伤害减免。点“新增 DR”记录类型、数值和弱点，例如 <b>DR 5 / 魔法</b> 或 <b>DR 3 / -</b>。</div>`}
            <div class="dr-note">伤害减免不叠加；同一来源或同一次伤害只取能生效的最高值。DR 后面的类型是“被什么穿透 / 弱点”，例如 <b>DR 5 / 魔法</b> 表示普通物理伤害减免 5，魔法攻击不受此 DR。</div>
          </div>
          <div class="matrix-wrap-note">自动列：基础防御 = ${esc(baseAName)} / ${esc(baseBName)} 取${state.defense.baseMode === 'high' ? '高' : '低'}，闪避 = 传奇敏捷，洞察 = 传奇感知；其余来自手动加值。格挡通常等于白刃 / 肉搏技能等级。防御总值为 13 项合计。</div>
        </div>
      </div>

      <div class="panel mt18 collapsible">
        <div class="panel-head" data-section-head="equipment">
          <div class="panel-title">装备位</div>
          <div class="panel-head-right"><span class="panel-sub">同一装备位多件只取支线等级最高的一件</span>
            <button class="collapse-btn ${ui.collapsedSections.has('equipment') ? 'collapsed' : ''}" data-action="toggle-section" data-section="equipment" aria-expanded="${ui.collapsedSections.has('equipment') ? 'false' : 'true'}" title="折叠 / 展开">${ic('chevron')}</button>
          </div>
        </div>
        <div class="panel-body ${ui.collapsedSections.has('equipment') ? 'collapsed' : ''}" data-section-body="equipment"><div class="equip-grid">${state.equipment.map((e, i) => `
          <div class="equip-item"><div class="equip-slot">${esc(e.slot)}</div>
            ${tInput('equipment.' + i + '.name', e.name, '', '名称 / 来源')}
            <textarea data-bind="equipment.${i}.effect" placeholder="效果 / 数值">${esc(e.effect || '')}</textarea>
          </div>`).join('')}</div>
          <div class="matrix-wrap-note">负重上限 = 体积 + 力量；每点可带 100 发子弹 / 20 支箭。效果写不下时，可在「收支账本」的资源说明中展开记录。</div>
        </div>
      </div>

      <div class="panel mt18 collapsible">
        <div class="panel-head" data-section-head="notes">
          <div class="panel-title">角色备注</div>
          <div class="panel-head-right"><span class="panel-sub">自由文本</span>
            <button class="collapse-btn ${ui.collapsedSections.has('notes') ? 'collapsed' : ''}" data-action="toggle-section" data-section="notes" aria-expanded="${ui.collapsedSections.has('notes') ? 'false' : 'true'}" title="折叠 / 展开">${ic('chevron')}</button>
          </div>
        </div>
        <div class="panel-body ${ui.collapsedSections.has('notes') ? 'collapsed' : ''}" data-section-body="notes"><textarea class="notes-area" data-bind="notes" placeholder="记录剧情线索、约定、队伍关系与需要长期跟踪的事项…">${esc(state.notes || '')}</textarea></div>
      </div>`;
  }

  function findSkillCalc(id) {
    if (id.startsWith('custom:')) {
      const idx = Number(id.slice(7));
      return computed.customSkills[idx] || { dp: 0, success: 0, over: false };
    }
    return computed.skills[id] || { dp: 0, success: 0, over: false };
  }

  function refreshCharacter() {
    $$('[data-attr-total]').forEach(el => { const a = computed.attrs[el.dataset.attrTotal]; if (a) el.textContent = fmt(a.total); });
    $$('[data-attr-legend]').forEach(el => { const a = computed.attrs[el.dataset.attrLegend]; if (a) el.textContent = a.legend; });
    $$('[data-skill-dp]').forEach(el => {
      const s = findSkillCalc(el.dataset.skillDp);
      el.textContent = fmt(s.dp);
      el.classList.toggle('skill-over', !!s.over);
    });
    $$('[data-skill-succ]').forEach(el => {
      const s = findSkillCalc(el.dataset.skillSucc);
      el.textContent = '+' + s.success;
      el.classList.toggle('skill-over', !!s.over);
    });
    $$('[data-skill-succ-badge]').forEach(el => {
      const s = findSkillCalc(el.dataset.skillSuccBadge);
      el.textContent = '附加 +' + s.success;
      el.classList.toggle('skill-over', !!s.over);
    });
    $$('[data-defense-total]').forEach(el => {
      el.textContent = fmt(computed.defense.byKey[el.dataset.defenseTotal] || 0);
    });
    $$('[data-defense-auto]').forEach(el => {
      const item = computed.defense.items.find(i => i.key === el.dataset.defenseAuto);
      el.textContent = fmt((item && item.auto) || 0);
    });
  }

  function refreshDefenseOutputs() {
    $$('[data-defense-total]').forEach(el => {
      const key = el.dataset.defenseTotal;
      el.textContent = fmt(computed.defense.byKey[key] || 0);
    });
    const formula = $('#defense-formula');
    if (formula) formula.innerHTML = defenseFormulaHTML(computed);
  }

  function showDefenseSyntaxHelp() {
    const layer = $('#modal-layer');
    const card = $('#modal-card');
    card.style.width = '520px';
    card.innerHTML = `<div class="modal-title">防御来源语法</div>
      <div class="modal-text" style="line-height:1.9;">
        在「来源 / 说明」里写：<br>
        <code class="def-syntax-example">闪避与格挡（3）+ 精通先攻（3）+ 翱翔于天际（8）</code><br>
        括号里的数字会自动加入「合计」。<br><br>
        <b class="gold">规则</b><br>
        · 格式：<code>XXX（数值）</code><br>
        · 多个来源用 <code>+</code> 连接<br>
        · 中文括号 <code>（）</code> 或英文括号 <code>()</code> 都可以<br>
        · 「基础防御」行不会读取来源里的数字，避免和自动属性重复计算<br>
        · 手动列仍然可以独立填写数值
      </div>
      <div class="modal-actions"><button class="btn gold" data-modal="ok">知道了</button></div>`;
    layer.hidden = false;
    const close = () => { layer.hidden = true; card.style.width = ''; };
    card.querySelector('[data-modal="ok"]').onclick = close;
    layer.onclick = e => { if (e.target === layer) close(); };
    window.__modalClose = close;
  }

  function defenseFormulaHTML(c) {
    const parts = [];
    const labels = state.defense.labels || {};
    (c.defense.items || []).forEach(item => {
      if (item.counter) return;
      const custom = (labels[item.key] || '').trim();
      if (item.key === 'base') {
        const a = c.attrs[state.defense.baseA] || { total: 0 };
        const b = c.attrs[state.defense.baseB] || { total: 0 };
        parts.push(`<span class="def-src-auto">${D.ATTR_MAP[state.defense.baseA].name}（${fmt(a.total)}）/${D.ATTR_MAP[state.defense.baseB].name}（${fmt(b.total)}）</span>`);
        return;
      }
      if (item.auto > 0) parts.push(`<span class="def-src-auto">${item.name}自动（${fmt(item.auto)}）</span>`);
      if (item.manual > 0) parts.push(`<span class="def-src-manual">${item.name}手动（${fmt(item.manual)}）</span>`);
      if (item.source > 0) parts.push(`<span class="def-src-extra">${esc(custom || `${item.name}来源（${fmt(item.source)}）`)}</span>`);
    });
    if (!parts.length) return '还没有可用于展示的防御来源。';
    return `防御来源：${parts.join(' + ')} = ${fmt(c.defense.sum)}`;
  }

  function applySkillFilter() {
    const q = (ui.skillQuery || '').trim().toLowerCase();
    $$('[data-skill-row]').forEach(row => {
      const group = row.dataset.group || '';
      const custom = row.dataset.custom === '1';
      let groupOk = true;
      if (ui.skillFilter === 'custom') groupOk = custom;
      else if (ui.skillFilter === 'learned') groupOk = Number(row.dataset.level) > 0;
      else if (ui.skillFilter !== 'all') groupOk = group === ui.skillFilter;
      const hay = (row.dataset.search || '').toLowerCase();
      row.hidden = !(groupOk && (!q || hay.includes(q)));
    });
    $$('[data-skill-filter]').forEach(chip => chip.classList.toggle('active', chip.dataset.skillFilter === ui.skillFilter));
  }

  /* ============================================================
     COMBAT
     ============================================================ */
  function attrOptions(selected) {
    return D.ATTRS.map(a => `<option value="${a.key}" ${a.key === selected ? 'selected' : ''}>${a.name}</option>`).join('');
  }

  function skillSelectOptions(selected, includeNone) {
    const base = D.SKILLS.map(s => ({ id: s.key, name: s.name, group: s.group }));
    const custom = (state.customSkills || []).map(s => ({ id: s.id, name: s.name, group: s.group }));
    const all = base.concat(custom);
    const none = includeNone ? `<option value="none" ${selected === 'none' || !selected ? 'selected' : ''}>无</option>` : '';
    return none + all.map(s => `<option value="${esc(s.id)}" ${s.id === selected ? 'selected' : ''}>${esc(s.name)}${s.group ? ' · ' + esc(s.group) : ''}</option>`).join('');
  }

  function attackRow(a, index) {
    const ca = computed.attacks[index];
    const energyText = ca.energyState === 'none' ? '—' : ca.energyState === 'ok' ? '✓ 足够' : ca.energyState === 'short' ? '✗ 不足' : '! 未匹配';
    const energyClass = 'energy-' + ca.energyState;
    const attrLine = ca.attr2Key ? `${ca.attrName} + ${ca.attr2Name}` : ca.attrName;
    const parts = [];
    if (ca.attackCount > 1) parts.push('×' + ca.attackCount + ' 次攻击');
    if (ca.actionCost) parts.push(ca.actionCost);
    if (ca.flatfootedGrade && ca.flatfootedGrade !== 'none') parts.push('措手不及 ' + ca.flatfootedGrade);
    if (ca.contactGrade && ca.contactGrade !== 'none') parts.push('接触攻击 ' + ca.contactGrade);
    parts.push(ca.explodeAt + ' 加骰');
    if (ca.highSpeed) parts.push('高速 ' + ca.highSpeed);
    if (ca.armorPierce) parts.push('破甲 ' + ca.armorPierce);
    if (ca.magicPierce) parts.push('破魔 ' + ca.magicPierce);
    const typedNames = D.BONUS_TYPES
      .map(b => ({ name: b.name, value: C.num(a['dp' + b.key.charAt(0).toUpperCase() + b.key.slice(1)]) }))
      .filter(b => b.value);
    (a.dpCustoms || []).forEach(x => {
      if (C.num(x && x.value)) typedNames.push({ name: (x && x.name) || '自定义', value: C.num(x.value) });
    });
    if (typedNames.length) parts.push('加值 ' + typedNames.map(b => b.name + '+' + b.value).join(' / '));
    const settle = (ca.energyCost > 0 || ca.willCost > 0)
      ? `<button class="mini-action" data-action="settle-attack" data-index="${index}" title="扣除能量 / 意志">结算</button>`
      : '';
    return `<tr data-attack-row="${index}">
      <td class="attack-name">
        <div class="atk-name-line"><b>${esc(a.name)}</b>${a.note ? `<span class="atk-note">${esc(a.note)}</span>` : ''}</div>
        <small>${esc(attrLine)}${ca.skillKey ? ' + ' + esc(ca.skillName) : ''}${parts.length ? ' · ' + esc(parts.join(' · ')) : ''}</small>
        <div class="atk-outcome">
          <span>最终 DP <b>${fmt(ca.finalDP)}</b></span>
          <span>期望伤害 <b>${ca.attackCount > 1 ? `${fmt(C.round1(ca.expectedDamage).toFixed(1))} ×${ca.attackCount} = ${fmt(C.round1(ca.totalExpectedDamage).toFixed(1))}` : fmt(C.round1(ca.expectedDamage).toFixed(1))}</b></span>
          <span>附加 <b>+${ca.extraSuccess}</b></span>
        </div>
      </td>
      <td><span class="atk-computed">${fmt(ca.dp)}</span></td>
      <td><span class="atk-computed">${fmt(ca.cap)}</span></td>
      <td><span class="atk-success">+${ca.extraSuccess}</span></td>
      <td class="${energyClass}">${energyText}</td>
      <td><div class="atk-row-actions">${settle}
        <button class="icon-btn" data-action="edit-attack" data-index="${index}" title="编辑攻击预设">${ic('edit')}</button>
        <button class="icon-btn" data-action="copy-attack" data-index="${index}" title="复制攻击预设">${ic('copy')}</button>
        <button class="icon-btn" data-action="remove-attack" data-index="${index}" title="删除攻击预设">${ic('trash')}</button>
      </div></td>
    </tr>`;
  }

  function combatTechsHTML() {
    const techs = (state.techniques || []).filter(t => t && (t.name || t.text));
    if (!techs.length) {
      return `<div class="empty combat-tech-empty"><b>还没有主动技艺</b>在「资源 · 技艺 → 主动技艺」里新增，战斗中会显示在这里。</div>`;
    }
    return `<div class="combat-tech-list">${techs.map(t => `
      <div class="combat-tech">
        <div class="combat-tech-head"><span class="tech-action">${esc(t.action || '标准动作')}</span><b>${esc(t.name || '未命名技艺')}</b></div>
        ${t.text ? `<p>${esc(t.text).slice(0, 180)}${t.text.length > 180 ? '…' : ''}</p>` : ''}
      </div>`).join('')}</div>`;
  }

  function combatHTML() {
    const c = computed;
    const targetFields = D.DEFENSE_ITEMS.map(d => `<div class="target-field"><label>${esc(d.name)}</label><input type="number" data-bind="targetDefense.values.${d.key}" value="${esc(state.targetDefense.values[d.key] || 0)}"></div>`).join('');
    return `
      ${pageHeader('COMBAT CALCULATOR / 战斗', '战斗计算', '把对方的防御填一次，逐条比较当前攻击预设；攻击属性和技能、伤害上限都可以由 PL 自己配置。', `
        <button class="btn" data-action="apply-my-defense">套用本方防御</button>
        <button class="btn gold" data-action="goto-character">${ic('shield')} 防御构成</button>`)}
      <div class="panel">
        <div class="panel-head"><div class="panel-title">对方防御</div><span class="panel-sub">原值 · 不自动叠甲</span></div>
        <div class="panel-body">
          <div class="defense-target">${targetFields}</div>
          <div class="target-toolbar">
            <label class="target-effect" title="${esc(EFFECT_TIPS.flatfooted)}">措手不及 ${selectInput('targetDefense.flatfootedGrade', D.EFFECT_GRADES, state.targetDefense.flatfootedGrade, 'cell-input effect-grade')}</label>
            <label class="target-effect" title="${esc(EFFECT_TIPS.contact)}">接触攻击 ${selectInput('targetDefense.contactGrade', D.EFFECT_GRADES, state.targetDefense.contactGrade, 'cell-input effect-grade')}</label>
            <span class="target-hint">无 = 不启用　·　D / C / B / A / S = 效果等级　·　措手不及去基础 / 闪避 / 洞察 / 格挡，接触攻击去天生 / 盔甲 / 盾牌</span>
          </div>
        </div>
      </div>

      <div class="panel mt18">
        <div class="panel-head"><div class="panel-title">攻击预设</div><div class="panel-head-right"><span class="panel-sub">攻击检定 = 属性 + 技能 + 武器 + 威力 + 其他 · 点右侧铅笔编辑</span><button class="btn small gold" data-action="add-attack">${ic('plus')} 新增攻击</button></div></div>
        <div class="panel-body flush"><div class="attack-table-wrap">
          <table class="attack-table">
            <colgroup><col style="width:50%"><col style="width:7%"><col style="width:9%"><col style="width:5%"><col style="width:14%"><col style="width:15%"></colgroup>
            <thead><tr>
              <th>攻击方式</th><th>总 DP</th><th>伤害上限</th><th>附加</th><th>能量</th><th>操作</th>
            </tr></thead>
            <tbody id="attack-rows">${state.attacks.map((a, i) => attackRow(a, i)).join('')}</tbody>
          </table>
        </div></div>
      </div>

      <div class="panel mt18">
        <div class="panel-head"><div class="panel-title">能量池 / 刻度</div><div class="panel-head-right"><button class="btn small" data-action="add-energy-pool">${ic('plus')} 添加能量池</button><button class="btn small" data-action="add-gauge">${ic('plus')} 添加刻度</button></div></div>
        <div class="panel-body"><div class="energy-manage horizontal" id="energy-manage">${state.energyPools.map((p, i) => {
          const cp = computed.energyPools[i] || { pct: 0 };
          const isGauge = p.kind === 'gauge';
          return `<div class="pool-card ${isGauge ? 'gauge' : ''}">
            <div class="pool-kind">${isGauge ? '刻度' : '能量池'}</div>
            <div class="pool-grid">
              <label class="pool-field pool-name-field"><span>名称</span><input class="pool-name" type="text" data-bind="energyPools.${i}.name" value="${esc(p.name || '')}" placeholder="${isGauge ? '例如：混乱能量 / 机' : '例如：内力 / 魔力'}"></label>
              <label class="pool-field pool-amount-field"><span>当前 / 上限</span><span class="pool-amount"><input type="number" data-bind="energyPools.${i}.current" value="${esc(p.current || 0)}"><em>/</em><input type="number" data-bind="energyPools.${i}.max" value="${esc(p.max || 0)}"></span></label>
              <button class="icon-btn pool-remove" data-action="remove-energy-pool" data-index="${i}" title="移除">${ic('trash')}</button>
            </div>
            <div class="pool-bar"><i data-pool-bar="${i}" style="width:${cp.pct}%"></i></div>
            <label class="pool-field pool-recovery-field"><span>恢复方式</span><textarea rows="2" data-bind="energyPools.${i}.recovery" placeholder="${isGauge ? '例如：每轮 +1 / 清空触发' : '例如：短休回满 / 每轮 +1'}">${esc(p.recovery || '')}</textarea></label>
            <label class="pool-field pool-usage-field"><span>基础使用方式</span><textarea rows="2" data-bind="energyPools.${i}.usage" placeholder="${isGauge ? '例如：满值消耗 / 触发效果' : '例如：强化攻击 / 支付技艺'}">${esc(p.usage || '')}</textarea></label>
          </div>`;
        }).join('') || '<div class="empty" style="padding:14px 10px;font-size:9px;">没有能量池或刻度。添加后可在攻击预设中选择。</div>'}</div></div>
      </div>

      <div class="panel mt18">
        <div class="panel-head"><div class="panel-title">PL 技艺</div><div class="panel-head-right"><span class="panel-sub">战斗速查</span><button class="btn small" data-action="goto-techniques">管理技艺</button></div></div>
        <div class="panel-body" id="combat-techniques">${combatTechsHTML()}</div>
      </div>

      <div class="panel mt18">
        <div class="panel-head"><div class="panel-title">战斗备忘</div><span class="panel-sub">伤害口径</span></div>
        <div class="panel-body" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;color:#877f73;font-size:9.5px;line-height:1.9;">
          <div><b class="gold">海马 / RM</b><br>2B → 1L，2L → 1A。无完好生命即昏迷，恶性 A 达到生命上限即死亡。总览同时给出两种判定，跟 ST 口径保持一致即可。</div>
          <div><b class="gold">融合流</b><br>每点生命 4 格，伤害值 B=1 / L=2 / A=4；达到 70% 生命昏迷，填满生命死亡。生命上限建议 ×4。</div>
        </div>
      </div>`;
  }

  function refreshCombat() {
    const rows = $('#attack-rows');
    if (rows) rows.innerHTML = state.attacks.map((a, i) => attackRow(a, i)).join('');
    const techs = $('#combat-techniques');
    if (techs) techs.innerHTML = combatTechsHTML();
    $$('[data-pool-bar]').forEach(el => {
      const i = Number(el.dataset.poolBar);
      const p = computed.energyPools[i];
      if (p) el.style.width = p.pct + '%';
    });
  }

  function openAttackNoteEditor(source) {
    const previousClose = window.__modalClose;
    const layer = document.createElement('div');
    layer.className = 'modal-layer attack-float';
    layer.style.zIndex = '120';
    const card = document.createElement('div');
    card.className = 'modal-card attack-float-card';
    card.style.width = '640px';
    card.innerHTML = `
      <div class="modal-title attack-note-title attack-float-title">
        <span>关键词 / 备注</span>
        <button class="icon-btn" data-modal="attack-note-close" title="关闭">${ic('close')}</button>
      </div>
      <div class="modal-text" style="margin-bottom:10px;">双击原备注框可再次打开；这里可以直接写长备注。</div>
      <textarea class="attack-note-editor" id="attack-note-editor" placeholder="关键词 / 备注">${esc(source.value || '')}</textarea>
      <div class="modal-actions">
        <button class="btn" data-modal="attack-note-cancel">取消</button>
        <button class="btn gold" data-modal="attack-note-save">保存</button>
      </div>`;
    layer.appendChild(card);
    document.body.appendChild(layer);
    setupAttackWindowDrag(card, 'attackNotePos', '.attack-note-title');
    const area = card.querySelector('#attack-note-editor');
    const close = () => {
      layer.remove();
      if (window.__modalClose === close) window.__modalClose = previousClose;
    };
    card.querySelector('[data-modal="attack-note-close"]').onclick = close;
    card.querySelector('[data-modal="attack-note-cancel"]').onclick = close;
    card.querySelector('[data-modal="attack-note-save"]').onclick = () => {
      source.value = area.value;
      source.dispatchEvent(new Event('input', { bubbles: true }));
      close();
    };
    window.__modalClose = close;
    area.focus();
  }

  function copyAttack(index) {
    const src = state.attacks[index];
    if (!src) return;
    const clone = JSON.parse(JSON.stringify(src));
    clone.id = 'atk_' + uid();
    clone.name = (src.name || '攻击') + ' 副本';
    state.attacks.splice(index + 1, 0, clone);
    stateChanged({ rerender: true });
    toast('已复制攻击预设');
  }

  function setupAttackWindowDrag(card, storageKey, titleSelector) {
    const key = storageKey || 'attackEditorPos';
    const title = card.querySelector(titleSelector || '.attack-float-title');
    if (!title) return;
    const clampPos = (x, y) => {
      const r = card.getBoundingClientRect();
      return {
        x: Math.max(4, Math.min(Math.max(4, window.innerWidth - r.width - 4), x)),
        y: Math.max(4, Math.min(Math.max(4, window.innerHeight - 44), y))
      };
    };
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { saved = null; }
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      const p = clampPos(saved.x, saved.y);
      card.style.position = 'fixed';
      card.style.left = p.x + 'px';
      card.style.top = p.y + 'px';
      card.style.right = 'auto';
      card.style.margin = '0';
    }
    title.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      const r = card.getBoundingClientRect();
      const ox = e.clientX - r.left;
      const oy = e.clientY - r.top;
      card.style.position = 'fixed';
      card.style.left = r.left + 'px';
      card.style.top = r.top + 'px';
      card.style.right = 'auto';
      card.style.margin = '0';
      try { title.setPointerCapture(e.pointerId); } catch (err) {}
      const move = ev => {
        const p = clampPos(ev.clientX - ox, ev.clientY - oy);
        card.style.left = p.x + 'px';
        card.style.top = p.y + 'px';
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        const rr = card.getBoundingClientRect();
        try { localStorage.setItem(key, JSON.stringify({ x: rr.left, y: rr.top })); } catch (err) {}
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }

  function openAttackEditor(index) {
    const isNew = index < 0 || index === undefined || index === null;
    const src = isNew ? D.newAttack('新攻击') : state.attacks[index];
    if (!src) return;
    const a = Object.assign({}, src);
    const layer = $('#modal-layer');
    const card = $('#modal-card');
    const dpCustoms = Array.isArray(a.dpCustoms) ? a.dpCustoms : [];
    const capCustoms = Array.isArray(a.capCustoms) ? a.capCustoms : [];
    const customRowHTML = (x) => `<div class="custom-bonus-row">
      <input class="cell-input custom-name" type="text" value="${esc((x && x.name) || '')}" placeholder="自定义名称，例如：招式 / 环境">
      <input class="cell-input custom-value" type="number" value="${esc((x && x.value) || 0)}" placeholder="数值">
      <button class="icon-btn custom-remove" type="button" title="删除这条自定义加值">${ic('trash')}</button>
    </div>`;
    const customListHTML = list => (list || []).map(customRowHTML).join('');
    card.style.width = '700px';
    card.classList.add('attack-float-card');
    layer.classList.add('attack-float');
    card.innerHTML = `
      <div class="modal-title attack-float-title">
        <span>${isNew ? '新增攻击预设' : '编辑攻击预设'}</span>
        <button class="icon-btn" data-modal="float-close" title="关闭编辑窗口">${ic('close')}</button>
      </div>
      <div class="attack-editor">
        <div class="attack-editor-row">
          <label class="field field-grow"><span>名称</span><input id="ae-name" type="text" value="${esc(a.name || '')}" placeholder="例如：霰弹枪 / 终结技"></label>
          <label class="field"><span>关键词 / 备注</span><textarea id="ae-note" class="attack-note-input" rows="3" title="双击放大编辑" placeholder="双击放大编辑；也可拖拽右下角调整高度">${esc(a.note || '')}</textarea></label>
        </div>
        <div class="editor-section">
          <div class="editor-section-title">攻击检定</div>
          <div class="editor-grid five">
            <label class="field"><span>属性</span><select id="ae-attr">${attrOptions(a.attr)}</select></label>
            <label class="field"><span>第二属性</span><select id="ae-attr2"><option value="none">无</option>${attrOptions(a.attr2 || 'none')}</select></label>
            <label class="field"><span>技能</span><select id="ae-skill">${skillSelectOptions(a.skill, true)}</select></label>
            <label class="field"><span>武器伤害</span><input id="ae-weapon" type="number" value="${esc(a.weapon || 0)}"></label>
            <label class="field"><span>威力</span><input id="ae-power" type="number" value="${esc(a.power || 0)}"></label>
          </div>
          <div class="editor-grid four">
            <label class="field"><span>高速</span><input id="ae-high" type="number" value="${esc(a.highSpeed || 0)}"></label>
            <label class="field"><span>破甲</span><input id="ae-armor" type="number" value="${esc(a.armorPierce || 0)}"></label>
            <label class="field"><span>破魔</span><input id="ae-magic" type="number" value="${esc(a.magicPierce || 0)}"></label>
            <label class="field"><span>加骰</span><select id="ae-explode">${[10, 9, 8].map(v => `<option value="${v}" ${Number(a.explodeAt || 10) === v ? 'selected' : ''}>${v} 加骰</option>`).join('')}</select></label>
          </div>
          <div class="editor-grid five">
            <label class="field"><span>攻击次数</span><input id="ae-count" type="number" min="1" value="${esc(a.attackCount || 1)}"></label>
            <label class="field"><span>额外附加成功</span><input id="ae-extra-success" type="number" value="${esc(a.extraSuccessBonus || 0)}" title="手动追加的附加成功，会与属性 / 技能的附加成功相加"></label>
            <label class="field"><span>动作消耗</span><select id="ae-action">${D.TECH_ACTIONS.map(x => `<option value="${esc(x)}" ${x === (a.actionCost || '标准动作') ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
            <label class="field"><span>本次措手不及</span><select id="ae-flatfooted">${D.EFFECT_GRADES.map(g => `<option value="${g.value}" ${g.value === (a.flatfootedGrade || 'none') ? 'selected' : ''}>${g.label}</option>`).join('')}</select></label>
            <label class="field"><span>本次接触攻击</span><select id="ae-contact">${D.EFFECT_GRADES.map(g => `<option value="${g.value}" ${g.value === (a.contactGrade || 'none') ? 'selected' : ''}>${g.label}</option>`).join('')}</select></label>
          </div>
          <div class="editor-subsection">
            <div class="editor-section-title">攻击检定加值类型</div>
            <div class="editor-grid seven">
              ${D.BONUS_TYPES.map(b => `<label class="field"><span>${b.name}</span><input id="ae-dp-${b.key}" type="number" value="${esc(a['dp' + b.key.charAt(0).toUpperCase() + b.key.slice(1)] || 0)}"></label>`).join('')}
              <label class="field"><span>其他加值</span><input id="ae-other" type="number" value="${esc(a.other || 0)}"></label>
            </div>
            <div class="custom-bonus-header"><span>自定义加值</span><button class="btn small" type="button" data-custom-add="dp">${ic('plus')} 添加</button></div>
            <div class="custom-bonus-list" id="ae-dp-customs">${customListHTML(dpCustoms)}</div>
          </div>
        </div>
        <div class="editor-section">
          <div class="editor-section-title">伤害上限</div>
          <div class="editor-grid four">
            <label class="field"><span>上限属性</span><select id="ae-cap-attr"><option value="none">无</option>${attrOptions(a.capAttr)}</select></label>
            <label class="field"><span>上限技能</span><select id="ae-cap-skill">${skillSelectOptions(a.capSkill, true)}</select></label>
            <label class="field"><span>武器倍率</span><select id="ae-cap-weapon"><option value="0" ${Number(a.capWeapon) === 0 ? 'selected' : ''}>不计</option><option value="1" ${Number(a.capWeapon) === 1 ? 'selected' : ''}>×1</option><option value="2" ${Number(a.capWeapon) === 2 ? 'selected' : ''}>×2</option></select></label>
            <label class="field"><span>计入威力</span><select id="ae-cap-power"><option value="0" ${Number(a.capPower) !== 1 ? 'selected' : ''}>否</option><option value="1" ${Number(a.capPower) === 1 ? 'selected' : ''}>是</option></select></label>
          </div>
          <div class="editor-subsection">
            <div class="editor-section-title">伤害上限加值类型</div>
            <div class="editor-grid seven">
              ${D.BONUS_TYPES.map(b => `<label class="field"><span>${b.name}</span><input id="ae-cap-${b.key}" type="number" value="${esc(a['cap' + b.key.charAt(0).toUpperCase() + b.key.slice(1)] || 0)}"></label>`).join('')}
              <label class="field"><span>其他加值</span><input id="ae-cap-other" type="number" value="${esc(a.capOther || 0)}"></label>
            </div>
            <div class="custom-bonus-header"><span>自定义加值</span><button class="btn small" type="button" data-custom-add="cap">${ic('plus')} 添加</button></div>
            <div class="custom-bonus-list" id="ae-cap-customs">${customListHTML(capCustoms)}</div>
          </div>
          <label class="editor-check"><input id="ae-cap-legend" type="checkbox" ${a.capLegend ? 'checked' : ''}> 加上限属性对应的传奇三角加值</label>
        </div>
        <div class="editor-section">
          <div class="editor-section-title">消耗</div>
          <div class="editor-grid three">
            <label class="field"><span>绑定能量池 / 刻度</span><select id="ae-pool"><option value="">未绑定</option>${state.energyPools.map(p => `<option value="${esc(p.name)}" ${p.name === a.energyPool ? 'selected' : ''}>${p.kind === 'gauge' ? '刻度' : '能量池'} · ${esc(p.name || '未命名')}</option>`).join('')}</select></label>
            <label class="field"><span>能耗</span><input id="ae-cost" type="number" value="${esc(a.energyCost || 0)}"></label>
            <label class="field"><span>意志消耗</span><input id="ae-will" type="number" value="${esc(a.willCost || 0)}"></label>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn" data-modal="cancel">取消</button>
        <button class="btn gold" data-modal="save">保存</button>
      </div>`;
    layer.hidden = false;
    setupAttackWindowDrag(card);
    card.querySelectorAll('[data-custom-add]').forEach(btn => {
      btn.onclick = () => {
        const list = card.querySelector(btn.dataset.customAdd === 'dp' ? '#ae-dp-customs' : '#ae-cap-customs');
        if (list) list.insertAdjacentHTML('beforeend', customRowHTML({}));
      };
    });
    const editorBody = card.querySelector('.attack-editor');
    if (editorBody) {
      editorBody.addEventListener('click', e => {
        const rm = e.target.closest('.custom-remove');
        if (rm) {
          const row = rm.closest('.custom-bonus-row');
          if (row) row.remove();
        }
      });
    }
    const close = () => {
      layer.hidden = true;
      layer.classList.remove('attack-float');
      card.classList.remove('attack-float-card');
      card.style.width = '';
    };
    card.querySelector('[data-modal="cancel"]').onclick = close;
    card.querySelector('[data-modal="float-close"]').onclick = close;
    card.querySelector('[data-modal="save"]').onclick = () => {
      const name = card.querySelector('#ae-name').value.trim() || '未命名攻击';
      const vals = {
        name,
        note: card.querySelector('#ae-note').value.trim(),
        attr: card.querySelector('#ae-attr').value,
        attr2: card.querySelector('#ae-attr2').value,
        skill: card.querySelector('#ae-skill').value,
        weapon: C.num(card.querySelector('#ae-weapon').value),
        power: C.num(card.querySelector('#ae-power').value),
        other: C.num(card.querySelector('#ae-other').value),
        highSpeed: C.num(card.querySelector('#ae-high').value),
        armorPierce: C.num(card.querySelector('#ae-armor').value),
        magicPierce: C.num(card.querySelector('#ae-magic').value),
        explodeAt: Number(card.querySelector('#ae-explode').value),
        extraSuccessBonus: C.num(card.querySelector('#ae-extra-success').value),
        attackCount: Math.max(1, Number(card.querySelector('#ae-count').value) || 1),
        actionCost: card.querySelector('#ae-action').value,
        flatfootedGrade: card.querySelector('#ae-flatfooted').value,
        contactGrade: card.querySelector('#ae-contact').value,
        capAttr: card.querySelector('#ae-cap-attr').value,
        capSkill: card.querySelector('#ae-cap-skill').value,
        capWeapon: Number(card.querySelector('#ae-cap-weapon').value),
        capPower: Number(card.querySelector('#ae-cap-power').value),
        capOther: C.num(card.querySelector('#ae-cap-other').value),
        capLegend: card.querySelector('#ae-cap-legend').checked,
        energyPool: card.querySelector('#ae-pool').value,
        energyCost: C.num(card.querySelector('#ae-cost').value),
        willCost: C.num(card.querySelector('#ae-will').value)
      };
      D.BONUS_TYPES.forEach(b => {
        const suffix = b.key.charAt(0).toUpperCase() + b.key.slice(1);
        vals['dp' + suffix] = C.num(card.querySelector('#ae-dp-' + b.key).value);
        vals['cap' + suffix] = C.num(card.querySelector('#ae-cap-' + b.key).value);
      });
      const readCustoms = scope => [...card.querySelectorAll('#ae-' + scope + '-customs .custom-bonus-row')]
        .map(row => ({
          name: row.querySelector('.custom-name').value.trim(),
          value: C.num(row.querySelector('.custom-value').value)
        }))
        .filter(x => x.name || x.value);
      vals.dpCustoms = readCustoms('dp');
      vals.capCustoms = readCustoms('cap');
      if (isNew) state.attacks.push(Object.assign(D.newAttack(name), vals));
      else {
        Object.assign(state.attacks[index], vals);
        if (!state.attacks[index].id) state.attacks[index].id = uid();
      }
      close();
      stateChanged({ rerender: true });
      toast(isNew ? '已新增攻击预设' : '已保存攻击预设');
    };
    window.__modalClose = close;
  }

  /* ============================================================
     RESOURCES
     ============================================================ */
  const RES_TABS = [
    { id: 'traits', name: '被动特性' },
    { id: 'resources', name: '主干资源' },
    { id: 'feats', name: '专长' },
    { id: 'techniques', name: '主动技艺' },
    { id: 'vehicle', name: '载具位' }
  ];

  function resourcesHTML() {
    const tabs = RES_TABS.map(t => `<button class="tab-btn ${ui.resourceTab === t.id ? 'active' : ''}" data-res-tab="${t.id}">${esc(t.name)}</button>`).join('');
    return `
      ${pageHeader('TRAITS & RESOURCES / 资源', '资源 · 技艺', '被动特性、主干资源、专长与主动技艺。', `
        <button class="btn gold" data-action="goto-ledger">${ic('coin')} 查看收支</button>`)}
      <div class="tab-row">${tabs}</div>
      <div class="tab-pane ${ui.resourceTab === 'traits' ? 'active' : ''}" data-res-pane="traits">${traitsPane()}</div>
      <div class="tab-pane ${ui.resourceTab === 'resources' ? 'active' : ''}" data-res-pane="resources">${resourcesPane()}</div>
      <div class="tab-pane ${ui.resourceTab === 'feats' ? 'active' : ''}" data-res-pane="feats">${featsPane()}</div>
      <div class="tab-pane ${ui.resourceTab === 'techniques' ? 'active' : ''}" data-res-pane="techniques">${techniquesPane()}</div>
      <div class="tab-pane ${ui.resourceTab === 'vehicle' ? 'active' : ''}" data-res-pane="vehicle">${vehiclePane()}</div>`;
  }

  function purchaseListButton() {
    return `<button class="btn small" data-action="view-purchases">${ic('coin')} 查看购买清单</button>`;
  }

  function traitsPane() {
    const head = `<div class="panel-head"><div class="panel-title">被动特性</div><div style="display:flex;gap:6px;align-items:center;"><span class="panel-sub">${state.traits.length} 条</span><button class="btn small gold" data-action="add-trait">${ic('plus')} 添加</button>${purchaseListButton()}</div></div>`;
    if (COMPACT()) {
      return `<div class="panel">${head}
        <div class="panel-body">${state.traits.length ? `<div class="trait-cards">
          ${state.traits.map((t, i) => `<div class="trait-card">
            <div class="mobile-card-head">${tInput('traits.' + i + '.name', t.name, 'cell-input mobile-card-name', '特性名')}<button class="icon-btn" data-action="remove-trait" data-index="${i}">${ic('trash')}</button></div>
            <div class="mobile-card-source"><span class="mobile-mini-label">来源</span>${tInput('traits.' + i + '.source', t.source, 'cell-input mobile-source-input', '来源')}</div>
            <label class="mobile-mini-label mobile-effect-label">效果 / 数值</label>
            <textarea class="cell-input trait-effect" data-bind="traits.${i}.effect" data-trait-effect="${i}" placeholder="常驻效果 / 数值 / 触发条件">${esc(t.effect || '')}</textarea>
          </div>`).join('')}
        </div>` : `<div class="empty"><b>还没有被动特性</b>把一直生效的效果写在这里，会随场景变化的放进备注，避免结算漏算。</div>`}</div>
      </div>`;
    }
    return `<div class="panel">${head}
      <div class="panel-body">${state.traits.length ? `<div style="overflow-x:auto;"><table class="editable-table" style="table-layout:fixed;min-width:620px;"><colgroup><col style="width:20%"><col style="width:20%"><col><col style="width:30px"></colgroup><thead><tr><th>特性名</th><th>来源</th><th>效果 / 数值</th><th></th></tr></thead><tbody>
        ${state.traits.map((t, i) => `<tr>
          <td class="w-name">${tInput('traits.' + i + '.name', t.name, 'cell-input', '特性名')}</td>
          <td>${tInput('traits.' + i + '.source', t.source, 'cell-input', '来源')}</td>
          <td><textarea class="cell-input trait-effect" data-bind="traits.${i}.effect" data-trait-effect="${i}" placeholder="常驻效果 / 数值 / 触发条件">${esc(t.effect || '')}</textarea></td>
          <td><button class="icon-btn" data-action="remove-trait" data-index="${i}">${ic('trash')}</button></td>
        </tr>`).join('')}</tbody></table></div>` : `<div class="empty"><b>还没有被动特性</b>把一直生效的效果写在这里，会随场景变化的放进备注，避免结算漏算。</div>`}</div>
    </div>`;
  }

  function resourcesPane() {
    return `<div class="panel">
      <div class="panel-head"><div class="panel-title">主干资源</div><div style="display:flex;gap:6px;align-items:center;"><span class="panel-sub">血统 / 改造 / 瞳术 / 修真 / 魔导书，五选一</span><button class="btn small gold" data-action="add-resource">${ic('plus')} 添加</button>${purchaseListButton()}</div></div>
      <div class="panel-body">${state.resources.length ? `<div class="resource-list">
        ${state.resources.map((r, i) => `<div class="resource-card">
          <div class="res-type">${selectInput('resources.' + i + '.type', D.RESOURCE_TYPES, r.type, 'cell-input')}</div>
          <div class="res-main">${tInput('resources.' + i + '.name', r.name, 'cell-input', '资源名称 / 来源')}<textarea data-bind="resources.${i}.effect" data-resource-effect="${i}" placeholder="关键效果 / 备注，双击放大">${esc(r.effect || '')}</textarea></div>
          <div class="res-actions"><button class="icon-btn" data-action="remove-resource" data-index="${i}" title="删除">${ic('trash')}</button></div>
        </div>`).join('')}</div>` : `<div class="empty"><b>还没有主干资源</b>从血统、改造、瞳术、修真、魔导书中选择；称号、流派、技艺可以多选，统一记在这里。</div>`}</div>
    </div>`;
  }

  function featsPane() {
    const compact = COMPACT();
    const starting = state.startingFeats || [];
    const startPoints = starting.reduce((s, f) => s + C.num(f.points), 0);
    const startingHead = `<div class="panel-head"><div class="panel-title">开卡专长</div><div style="display:flex;gap:6px;align-items:center;"><span class="panel-sub">建卡专长点 <b class="gold" id="starting-feat-total">${fmt(startPoints)}</b></span><button class="btn small gold" data-action="add-starting-feat">${ic('plus')} 添加</button>${purchaseListButton()}</div></div>`;
    const startingHTML = compact ? `<div class="panel">${startingHead}
      <div class="panel-body">${starting.length ? `<div class="feat-cards">
        ${starting.map((f, i) => `<div class="feat-card">
          <div class="mobile-card-head">${tInput('startingFeats.' + i + '.name', f.name, 'cell-input mobile-card-name', '开卡专长名')}<button class="icon-btn" data-action="remove-starting-feat" data-index="${i}">${ic('trash')}</button></div>
          <div class="mobile-feat-meta">
            <label class="mobile-inline-field"><span>等级</span>${nInput('startingFeats.' + i + '.level', f.level, 'cell-input', 'min="0"')}</label>
            <label class="mobile-inline-field"><span>建卡专长点</span>${nInput('startingFeats.' + i + '.points', f.points, 'cell-input', 'min="0"')}</label>
          </div>
          <label class="mobile-mini-label mobile-effect-label">效果</label>
          <textarea class="cell-input feat-effect" data-bind="startingFeats.${i}.effect" data-starting-feat-effect="${i}" placeholder="开卡专长的效果 / 建卡说明">${esc(f.effect || '')}</textarea>
        </div>`).join('')}
      </div><div class="matrix-wrap-note">开卡专长点由 ST 建卡规则决定，仅作记录；不会进入普通专长的 XP 累计。</div>` : `<div class="empty"><b>还没有开卡专长</b>点右上角“添加”记录建卡时获得的专长。</div>`}</div>
    </div>` : `<div class="panel">${startingHead}
      <div class="panel-body">${starting.length ? `<div style="overflow-x:auto;"><table class="editable-table" style="table-layout:fixed;min-width:760px;"><colgroup><col style="width:15%"><col style="width:15%"><col style="width:15%"><col><col style="width:30px"></colgroup><thead><tr><th class="w-num">等级</th><th class="w-name">专长名</th><th class="w-num">建卡专长点</th><th>效果</th><th></th></tr></thead><tbody>
        ${starting.map((f, i) => `<tr>
          <td>${nInput('startingFeats.' + i + '.level', f.level, 'cell-input', 'min="0"')}</td>
          <td>${tInput('startingFeats.' + i + '.name', f.name, 'cell-input', '开卡专长名')}</td>
          <td>${nInput('startingFeats.' + i + '.points', f.points, 'cell-input', 'min="0"')}</td>
          <td><textarea class="cell-input feat-effect" data-bind="startingFeats.${i}.effect" data-starting-feat-effect="${i}" placeholder="开卡专长的效果 / 建卡说明">${esc(f.effect || '')}</textarea></td>
          <td><button class="icon-btn" data-action="remove-starting-feat" data-index="${i}">${ic('trash')}</button></td>
        </tr>`).join('')}</tbody></table></div><div class="matrix-wrap-note">开卡专长点由 ST 建卡规则决定，仅作记录；不会进入普通专长的 XP 累计。</div>` : `<div class="empty"><b>还没有开卡专长</b>点右上角“添加”记录建卡时获得的专长。</div>`}</div>
    </div>`;
    return `${startingHTML}<div class="panel mt18">
      <div class="panel-head"><div class="panel-title">专长</div><div style="display:flex;gap:6px;align-items:center;"><button class="btn small gold" data-action="add-feat">${ic('plus')} 添加</button>${purchaseListButton()}</div></div>
      <div class="panel-body">${state.feats.length ? (compact ? `<div class="feat-cards">
        ${state.feats.map((f, i) => `<div class="feat-card">
          <div class="mobile-card-head">${tInput('feats.' + i + '.name', f.name, 'cell-input mobile-card-name', '专长名称')}<button class="icon-btn" data-action="remove-feat" data-index="${i}">${ic('trash')}</button></div>
          <div class="mobile-feat-meta">
            <label class="mobile-inline-field"><span>等级</span>${nInput('feats.' + i + '.level', f.level, 'cell-input', 'min="0"')}</label>
          </div>
          <div class="mobile-feat-prereq"><span class="mobile-mini-label">前提</span>${tInput('feats.' + i + '.prereq', f.prereq, 'cell-input', '前提')}</div>
          <label class="mobile-mini-label mobile-effect-label">效果</label>
          <textarea class="cell-input feat-effect" data-bind="feats.${i}.effect" data-feat-effect="${i}" placeholder="专长效果 / 数值">${esc(f.effect || '')}</textarea>
        </div>`).join('')}
      </div><div class="matrix-wrap-note">同一专长的不同等级分开写；重复购买同一专长会分行累计 XP。</div>` : `<div style="overflow-x:auto;"><table class="editable-table" style="table-layout:fixed;min-width:760px;"><colgroup><col style="width:15%"><col style="width:15%"><col style="width:15%"><col><col style="width:30px"></colgroup><thead><tr><th class="w-num">等级</th><th class="w-name">专长名称</th><th>前提</th><th>效果</th><th></th></tr></thead><tbody>
        ${state.feats.map((f, i) => `<tr>
          <td>${nInput('feats.' + i + '.level', f.level, 'cell-input', 'min="0"')}</td>
          <td>${tInput('feats.' + i + '.name', f.name, 'cell-input', '专长名称')}</td>
          <td>${tInput('feats.' + i + '.prereq', f.prereq, 'cell-input', '前提')}</td>
          <td><textarea class="cell-input feat-effect" data-bind="feats.${i}.effect" data-feat-effect="${i}" placeholder="专长效果 / 数值">${esc(f.effect || '')}</textarea></td>
          <td><button class="icon-btn" data-action="remove-feat" data-index="${i}">${ic('trash')}</button></td>
        </tr>`).join('')}</tbody></table></div><div class="matrix-wrap-note">同一专长的不同等级分开写；重复购买同一专长会分行累计 XP。</div>`) : `<div class="empty"><b>还没有专长</b>按等级逐条填写专长。</div>`}</div>
    </div>`;
  }

  function techniquesPane() {
    return `<div class="panel">
      <div class="panel-head"><div class="panel-title">主动技艺</div><div class="panel-head-right"><span class="panel-sub">${state.techniques.length} 个栏位</span><button class="btn small gold" data-action="add-technique">${ic('plus')} 新增技艺</button>${purchaseListButton()}</div></div>
      <div class="panel-body">${state.techniques.length ? `<div class="technique-grid">${state.techniques.map((t, i) => `
        <div class="technique-card">
          <div class="technique-head">${selectInput('techniques.' + i + '.action', D.TECH_ACTIONS, t.action, '')}${tInput('techniques.' + i + '.name', t.name, '', '技能名')}<button class="icon-btn technique-remove" data-action="remove-technique" data-index="${i}" title="删除此栏位">${ic('trash')}</button></div>
          <textarea data-bind="techniques.${i}.text" data-technique-effect="${i}" placeholder="效果、判定、消耗与关键词，双击放大">${esc(t.text || '')}</textarea>
        </div>`).join('')}</div>` : `<div class="empty"><b>还没有主动技艺</b>点右上角“新增技艺”添加自己的技能、招式或法术。</div>`}</div>
    </div>`;
  }

  function vehiclePane() {
    const v = state.vehicle;
    const fields = [
      ['name', '载具名称'], ['structure', '结构值'], ['armor', '装甲值'], ['hardness', '硬度'],
      ['baseDefense', '基础防御'], ['threshold', '阈值'], ['speed', '速度'], ['reflex', '反射'],
      ['output', '出力'], ['mobility', '机动']
    ].map(([k, label]) => `<div class="field"><label>${esc(label)}</label>${k === 'name' ? tInput('vehicle.name', v.name, '', '载具名称') : nInput('vehicle.' + k, v[k], 'cell-input')}</div>`).join('');
    return `<div class="panel">
      <div class="panel-head"><div class="panel-title">载具位</div><span class="panel-sub">VEHICLE / 可选</span></div>
      <div class="panel-body"><div class="vehicle-grid">${fields}<div class="field wide"><label>其他效果 / 备注</label><textarea data-bind="vehicle.notes" data-vehicle-effect placeholder="武器、特殊规则、消耗…，双击放大">${esc(v.notes || '')}</textarea></div></div></div>
    </div>`;
  }

  function openFeatEffect(kind, index) {
    const specs = {
      starting: {
        item: () => (state.startingFeats || [])[index],
        field: 'effect',
        label: '开卡专长效果',
        selector: `[data-starting-feat-effect="${index}"]`
      },
      feat: {
        item: () => state.feats[index],
        field: 'effect',
        label: '专长效果',
        selector: `[data-feat-effect="${index}"]`
      },
      trait: {
        item: () => state.traits[index],
        field: 'effect',
        label: '被动特性效果',
        selector: `[data-trait-effect="${index}"]`
      },
      resource: {
        item: () => state.resources[index],
        field: 'effect',
        label: '主干资源效果',
        selector: `[data-resource-effect="${index}"]`
      },
      technique: {
        item: () => state.techniques[index],
        field: 'text',
        label: '主动技艺效果',
        selector: `[data-technique-effect="${index}"]`
      },
      vehicle: {
        item: () => state.vehicle,
        field: 'notes',
        label: '载具效果 / 备注',
        selector: '[data-vehicle-effect]'
      }
    };
    const spec = specs[kind];
    const item = spec && spec.item();
    if (!spec || !item) return;
    const layer = $('#modal-layer');
    const card = $('#modal-card');
    layer.classList.add('attack-float');
    card.classList.add('attack-float-card');
    card.style.width = '640px';
    card.innerHTML = `
      <div class="modal-title feat-effect-title attack-float-title">
        <span>${spec.label}</span>
        <button class="icon-btn" data-modal="feat-effect-close" title="关闭">${ic('close')}</button>
      </div>
      <div class="modal-text" style="margin-bottom:10px;">双击原效果框可再次打开；这里可以直接写长效果。</div>
      <textarea class="feat-effect-editor" id="feat-effect-editor" placeholder="效果 / 说明">${esc(item[spec.field] || '')}</textarea>
      <div class="modal-actions">
        <button class="btn" data-modal="feat-effect-cancel">取消</button>
        <button class="btn gold" data-modal="feat-effect-save">保存</button>
      </div>`;
    layer.hidden = false;
    setupAttackWindowDrag(card, 'featEffectPos', '.feat-effect-title');
    const area = card.querySelector('#feat-effect-editor');
    const close = () => {
      layer.hidden = true;
      layer.classList.remove('attack-float');
      card.classList.remove('attack-float-card');
      card.style.width = '';
    };
    const save = () => {
      item[spec.field] = area.value;
      const input = document.querySelector(spec.selector);
      if (input) input.value = item[spec.field];
      scheduleSave();
      close();
      toast('效果已保存');
    };
    card.querySelector('[data-modal="feat-effect-close"]').onclick = close;
    card.querySelector('[data-modal="feat-effect-cancel"]').onclick = close;
    card.querySelector('[data-modal="feat-effect-save"]').onclick = save;
    window.__modalClose = close;
    area.focus();
  }

  function refreshResources() {
    const startingTotal = $('#starting-feat-total');
    if (startingTotal) startingTotal.textContent = fmt((state.startingFeats || []).reduce((s, f) => s + C.num(f.points), 0));
  }

  /* ============================================================
     LEDGER
     ============================================================ */
  function ledgerCollapsedState() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(LEDGER_UI_KEY) || 'null'); } catch (e) { raw = null; }
    return {
      income: raw && typeof raw.income === 'boolean' ? raw.income : true,
      purchase: raw && typeof raw.purchase === 'boolean' ? raw.purchase : false
    };
  }

  function saveLedgerCollapsedState(stateObj) {
    try { localStorage.setItem(LEDGER_UI_KEY, JSON.stringify(stateObj)); } catch (e) {}
  }

  function toggleLedgerSection(type) {
    const stateObj = ledgerCollapsedState();
    stateObj[type] = !stateObj[type];
    saveLedgerCollapsedState(stateObj);
    const body = document.querySelector('[data-ledger-body="' + type + '"]');
    const btn = document.querySelector('[data-ledger-toggle="' + type + '"]');
    if (body) body.classList.toggle('collapsed', stateObj[type]);
    if (btn) {
      btn.classList.toggle('collapsed', stateObj[type]);
      btn.setAttribute('aria-expanded', String(!stateObj[type]));
    }
  }

  function moveLedgerItem(type, from, to) {
    const arr = type === 'income' ? state.incomes : state.purchases;
    if (!Array.isArray(arr) || from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return;
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    scheduleSave();
    renderView('ledger');
  }

  function ledgerCompactList(type, rows, total) {
    const isIncome = type === 'income';
    return `<div class="ledger-records">
      ${rows.map((r, i) => `<div class="ledger-record" data-ledger-row="${type}" data-index="${i}">
        <div class="ledger-record-head">
          <span class="ledger-drag" draggable="true" data-ledger-drag="${type}" data-index="${i}" title="拖动排序">≡</span>
          <div class="ledger-record-name">${isIncome
            ? tInput('incomes.' + i + '.name', r.name, 'cell-input', '团名 / 来源')
            : tInput('purchases.' + i + '.name', r.name, 'cell-input', '资源名称')}</div>
          <button class="icon-btn" data-action="remove-${type}" data-index="${i}" title="删除">${ic('trash')}</button>
        </div>
        <div class="ledger-record-grid">
          <label><span>支线</span>${isIncome ? nInput('incomes.' + i + '.level', r.level, 'cell-input') : nInput('purchases.' + i + '.level', r.level, 'cell-input')}</label>
          <label><span>分数</span>${isIncome ? nInput('incomes.' + i + '.points', r.points, 'cell-input') : nInput('purchases.' + i + '.points', r.points, 'cell-input')}</label>
          <label><span>经验</span>${isIncome ? nInput('incomes.' + i + '.xp', r.xp, 'cell-input') : nInput('purchases.' + i + '.xp', r.xp, 'cell-input')}</label>
        </div>
        <label class="ledger-record-note"><span>${isIncome ? '备注' : '资源介绍'}</span><input type="text" class="cell-input ${isIncome ? 'ledger-note-input' : 'ledger-desc-input'}" data-bind="${isIncome ? 'incomes.' + i + '.note' : 'purchases.' + i + '.desc'}" ${isIncome ? `data-ledger-note="${i}"` : `data-ledger-desc="${i}"`} value="${esc((isIncome ? r.note : r.desc) || '')}" placeholder="双击放大" title="双击放大"></label>
      </div>`).join('')}
      <div class="ledger-record-total">
        <span>合计</span>
        <span>支线 <b>${fmt(total.level)}</b> · 分数 <b>${fmt(total.points)}</b> · 经验 <b>${fmt(total.xp)}</b></span>
      </div>
    </div>`;
  }

  function ledgerHTML() {
    const c = computed;
    const ledgerCollapsed = ledgerCollapsedState();
    return `
      ${pageHeader('BUDGET & REWARDS / 账本', '收支账本', '记录每次团务获得的支线、分数与经验，以及购买资源的花费；余额自动汇总。', `
        <button class="btn gold" data-action="goto-resources">${ic('spark')} 返回资源</button>`)}
      <div class="ledger-summary">
        <div class="ledger-card" style="--accent:rgba(201,168,110,.75)"><div class="ledger-label">支线余额</div><div class="ledger-value ${c.ledger.balance.level < 0 ? 'negative' : ''}" id="ledger-level">${fmt(c.ledger.balance.level)}</div><div class="ledger-sub">收入 ${fmt(c.ledger.income.level)} · 已用 ${fmt(c.ledger.spent.level)}</div></div>
        <div class="ledger-card" style="--accent:rgba(98,169,163,.7)"><div class="ledger-label">分数余额</div><div class="ledger-value ${c.ledger.balance.points < 0 ? 'negative' : ''}" id="ledger-points">${fmt(c.ledger.balance.points)}</div><div class="ledger-sub">收入 ${fmt(c.ledger.income.points)} · 已用 ${fmt(c.ledger.spent.points)}</div></div>
        <div class="ledger-card" style="--accent:rgba(184,73,78,.75)"><div class="ledger-label">经验余额</div><div class="ledger-value ${c.ledger.balance.xp < 0 ? 'negative' : ''}" id="ledger-xp">${fmt(c.ledger.balance.xp)}</div><div class="ledger-sub">收入 ${fmt(c.ledger.income.xp)} · 已用 ${fmt(c.ledger.spent.xp)}</div></div>
      </div>
      <div class="ledger-tables">
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">收入记录</div>
            <div class="panel-head-right">
              <button class="btn small gold" data-action="add-income">${ic('plus')} 添加</button>
              <button class="collapse-btn ${ledgerCollapsed.income ? 'collapsed' : ''}" data-action="toggle-ledger" data-ledger-toggle="income" aria-expanded="${String(!ledgerCollapsed.income)}" title="折叠 / 展开">${ic('chevron')}</button>
            </div>
          </div>
          <div class="panel-body flush ${ledgerCollapsed.income ? 'collapsed' : ''}" data-ledger-body="income" style="overflow-x:auto;">
            ${state.incomes.length ? (COMPACT() ? ledgerCompactList('income', state.incomes, c.ledger.income) : `<table class="ledger-table" id="income-table"><colgroup><col style="width:20px"><col style="width:17%"><col style="width:88px"><col style="width:104px"><col style="width:88px"><col><col style="width:30px"></colgroup><thead><tr><th class="drag-col"></th><th>团名 / 来源</th><th>支线</th><th>分数</th><th>经验</th><th>备注</th><th></th></tr></thead><tbody>
              ${state.incomes.map((r, i) => `<tr data-ledger-row="income" data-index="${i}">
                <td class="drag-col"><span class="ledger-drag" draggable="true" data-ledger-drag="income" data-index="${i}" title="拖动排序">≡</span></td>
                <td>${tInput('incomes.' + i + '.name', r.name, 'cell-input', '团名 / 来源')}</td>
                <td class="num-cell">${nInput('incomes.' + i + '.level', r.level, 'cell-input')}</td>
                <td class="num-cell">${nInput('incomes.' + i + '.points', r.points, 'cell-input')}</td>
                <td class="num-cell">${nInput('incomes.' + i + '.xp', r.xp, 'cell-input')}</td>
                <td><input type="text" class="cell-input ledger-note-input" data-bind="incomes.${i}.note" data-ledger-note="${i}" value="${esc(r.note || '')}" placeholder="双击放大" title="双击放大"></td>
                <td><button class="icon-btn" data-action="remove-income" data-index="${i}">${ic('trash')}</button></td>
              </tr>`).join('')}</tbody>
              <tfoot><tr><td></td><td>合计</td><td><b id="income-total-level">${fmt(c.ledger.income.level)}</b></td><td><b id="income-total-points">${fmt(c.ledger.income.points)}</b></td><td><b id="income-total-xp">${fmt(c.ledger.income.xp)}</b></td><td></td><td></td></tr></tfoot>
            </table>`) : `<div class="empty" style="margin:16px;"><b>还没有收入记录</b>每次团务结束后在这里记一笔。</div>`}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">购买清单</div>
            <div class="panel-head-right">
              <button class="btn small gold" data-action="add-purchase">${ic('plus')} 添加</button>
              <button class="collapse-btn ${ledgerCollapsed.purchase ? 'collapsed' : ''}" data-action="toggle-ledger" data-ledger-toggle="purchase" aria-expanded="${String(!ledgerCollapsed.purchase)}" title="折叠 / 展开">${ic('chevron')}</button>
            </div>
          </div>
          <div class="panel-body flush ${ledgerCollapsed.purchase ? 'collapsed' : ''}" data-ledger-body="purchase" style="overflow-x:auto;">
            ${state.purchases.length ? (COMPACT() ? ledgerCompactList('purchase', state.purchases, c.ledger.spent) : `<table class="ledger-table" id="purchase-table"><colgroup><col style="width:20px"><col style="width:17%"><col style="width:88px"><col style="width:104px"><col style="width:88px"><col><col style="width:30px"></colgroup><thead><tr><th class="drag-col"></th><th>资源</th><th>支线</th><th>分数</th><th>经验</th><th>资源介绍</th><th></th></tr></thead><tbody>
              ${state.purchases.map((r, i) => `<tr data-ledger-row="purchase" data-index="${i}">
                <td class="drag-col"><span class="ledger-drag" draggable="true" data-ledger-drag="purchase" data-index="${i}" title="拖动排序">≡</span></td>
                <td>${tInput('purchases.' + i + '.name', r.name, 'cell-input', '资源名称')}</td>
                <td class="num-cell">${nInput('purchases.' + i + '.level', r.level, 'cell-input')}</td>
                <td class="num-cell">${nInput('purchases.' + i + '.points', r.points, 'cell-input')}</td>
                <td class="num-cell">${nInput('purchases.' + i + '.xp', r.xp, 'cell-input')}</td>
                <td><input type="text" class="cell-input ledger-desc-input" data-bind="purchases.${i}.desc" data-ledger-desc="${i}" value="${esc(r.desc || '')}" placeholder="双击放大" title="双击放大"></td>
                <td><button class="icon-btn" data-action="remove-purchase" data-index="${i}">${ic('trash')}</button></td>
              </tr>`).join('')}</tbody>
              <tfoot><tr><td></td><td>合计</td><td><b id="spent-total-level">${fmt(c.ledger.spent.level)}</b></td><td><b id="spent-total-points">${fmt(c.ledger.spent.points)}</b></td><td><b id="spent-total-xp">${fmt(c.ledger.spent.xp)}</b></td><td></td><td></td></tr></tfoot>
            </table>`) : `<div class="empty" style="margin:16px;"><b>还没有购买记录</b>把支线、分数、经验与资源说明一并填在这里。</div>`}
          </div>
        </div>
      </div>
      <div class="ledger-note">「已获得」统计收入记录，「已使用」统计购买清单；余额 = 已获得 − 已使用。负数表示超支。支线 / 分数 / 经验分别结算，不互相换算。</div>`;
  }

  function openPurchaseList() {
    const rows = state.purchases || [];
    const layer = $('#modal-layer');
    const card = $('#modal-card');
    const table = rows.length ? `<table class="ledger-table purchase-view-table">
      <colgroup><col style="width:30%"><col></colgroup>
      <thead><tr><th>资源</th><th>资源介绍</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${esc(r.name || '未命名资源')}</td>
        <td class="purchase-view-desc">${esc(r.desc || '—')}</td>
      </tr>`).join('')}</tbody>
    </table>` : '<div class="empty" style="margin:16px;"><b>购买清单还是空的</b>到收支账本里添加购买记录。</div>';
    layer.classList.add('attack-float');
    card.classList.add('attack-float-card');
    card.style.width = '720px';
    card.innerHTML = `
      <div class="modal-title purchase-title attack-float-title">
        <span>购买清单</span>
        <button class="icon-btn" data-modal="purchase-close" title="关闭">${ic('close')}</button>
      </div>
      <div class="modal-text">来自收支账本的购买记录，只读查看。</div>
      <div class="purchase-view-wrap">${table}</div>
      <div class="modal-actions">
        <button class="btn" data-modal="purchase-close-bottom">关闭</button>
        <button class="btn gold" data-modal="purchase-ledger">打开收支账本</button>
      </div>`;
    layer.hidden = false;
    setupAttackWindowDrag(card, 'purchaseListPos', '.purchase-title');
    const close = () => {
      layer.hidden = true;
      layer.classList.remove('attack-float');
      card.classList.remove('attack-float-card');
      card.style.width = '';
    };
    card.querySelector('[data-modal="purchase-close"]').onclick = close;
    card.querySelector('[data-modal="purchase-close-bottom"]').onclick = close;
    card.querySelector('[data-modal="purchase-ledger"]').onclick = () => { close(); switchView('ledger'); };
    window.__modalClose = close;
  }

  function openLedgerDesc(index) {
    const p = state.purchases[index];
    if (!p) return;
    const layer = $('#modal-layer');
    const card = $('#modal-card');
    layer.classList.add('attack-float');
    card.classList.add('attack-float-card');
    card.style.width = '560px';
    card.innerHTML = `
      <div class="modal-title ledger-title attack-float-title">
        <span>资源介绍</span>
        <button class="icon-btn" data-modal="float-close" title="关闭">${ic('close')}</button>
      </div>
      <div class="modal-text" style="margin-bottom:10px;">双击表格里的资源介绍可再次打开；这里可以直接写长描述。</div>
      <textarea class="ledger-desc-editor" id="ledger-desc-editor" data-bind="purchases.${index}.desc" placeholder="资源效果、限制、来源与备注…">${esc(p.desc || '')}</textarea>
      <div class="modal-actions">
        <button class="btn" data-modal="cancel">取消</button>
        <button class="btn gold" data-modal="save">保存</button>
      </div>`;
    layer.hidden = false;
    setupAttackWindowDrag(card, 'ledgerEditorPos', '.ledger-title');
    const area = card.querySelector('#ledger-desc-editor');
    const close = () => {
      layer.hidden = true;
      layer.classList.remove('attack-float');
      card.classList.remove('attack-float-card');
      card.style.width = '';
    };
    card.querySelector('[data-modal="cancel"]').onclick = close;
    card.querySelector('[data-modal="float-close"]').onclick = close;
    card.querySelector('[data-modal="save"]').onclick = () => {
      p.desc = area.value;
      const input = document.querySelector(`[data-ledger-desc="${index}"]`);
      if (input) input.value = p.desc;
      scheduleSave();
      close();
      toast('资源介绍已保存');
    };
    window.__modalClose = close;
    area.focus();
  }

  function openLedgerNote(index) {
    const r = state.incomes[index];
    if (!r) return;
    const layer = $('#modal-layer');
    const card = $('#modal-card');
    layer.classList.add('attack-float');
    card.classList.add('attack-float-card');
    card.style.width = '560px';
    card.innerHTML = `
      <div class="modal-title ledger-title attack-float-title">
        <span>备注</span>
        <button class="icon-btn" data-modal="float-close" title="关闭">${ic('close')}</button>
      </div>
      <div class="modal-text" style="margin-bottom:10px;">双击表格里的备注可再次打开；这里可以直接写长备注。</div>
      <textarea class="ledger-desc-editor" id="ledger-note-editor" data-bind="incomes.${index}.note" placeholder="备注">${esc(r.note || '')}</textarea>
      <div class="modal-actions">
        <button class="btn" data-modal="cancel">取消</button>
        <button class="btn gold" data-modal="save">保存</button>
      </div>`;
    layer.hidden = false;
    setupAttackWindowDrag(card, 'ledgerEditorPos', '.ledger-title');
    const area = card.querySelector('#ledger-note-editor');
    const close = () => {
      layer.hidden = true;
      layer.classList.remove('attack-float');
      card.classList.remove('attack-float-card');
      card.style.width = '';
    };
    card.querySelector('[data-modal="cancel"]').onclick = close;
    card.querySelector('[data-modal="float-close"]').onclick = close;
    card.querySelector('[data-modal="save"]').onclick = () => {
      r.note = area.value;
      const input = document.querySelector(`[data-ledger-note="${index}"]`);
      if (input) input.value = r.note;
      scheduleSave();
      close();
      toast('备注已保存');
    };
    window.__modalClose = close;
    area.focus();
  }

  function refreshLedger() {
    const c = computed;
    const set = (id, v) => { const el = $('#' + id); if (el) { el.textContent = fmt(v); el.classList.toggle('negative', v < 0); } };
    set('ledger-level', c.ledger.balance.level);
    set('ledger-points', c.ledger.balance.points);
    set('ledger-xp', c.ledger.balance.xp);
    const setT = (id, v) => { const el = $('#' + id); if (el) el.textContent = fmt(v); };
    setT('income-total-level', c.ledger.income.level);
    setT('income-total-points', c.ledger.income.points);
    setT('income-total-xp', c.ledger.income.xp);
    setT('spent-total-level', c.ledger.spent.level);
    setT('spent-total-points', c.ledger.spent.points);
    setT('spent-total-xp', c.ledger.spent.xp);
  }

  /* ============================================================
     RULES / CHM
     ============================================================ */
  function findBook(key) {
    return (ui.rules.books || []).find(b => b.key === key) || null;
  }

  function bookStatusLabel(b) {
    if (!b) return '';
    if (b.status === 'ready') return b.pageCount + ' 页';
    if (b.status === 'queued') return '排队中';
    if (b.status === 'extracting') return '解包 ' + b.progress + '%';
    if (b.status === 'indexing') return '索引 ' + b.progress + '%';
    if (b.status === 'error') return '读取失败';
    if (b.status === 'ignored') return '不扫描';
    return b.status;
  }

  function bookStateClass(b) {
    if (!b) return '';
    if (b.status === 'ready') return 'ready';
    if (b.status === 'error') return 'error';
    if (b.status === 'extracting' || b.status === 'indexing' || b.status === 'queued') return 'busy';
    return '';
  }

  function renderRules() {
    ui.rulesMounted = true;
    const mount = $('#view-rules');
    mount.innerHTML = `
      <div class="rules-head">
        <div>
          <div class="eyebrow">RULES LIBRARY / 规则库</div>
          <h1 class="page-title">规则书 <small>CHM 全文检索</small></h1>
          <p class="page-desc">点「目录」打开书库和目录；导入 CHM 在「目录信息」里，导入后会自动扫描书库。</p>
        </div>
        <div class="head-actions">
          <button class="btn" data-action="toggle-rules-drawer">${ic('book')} 目录</button>
          <button class="btn" data-action="chm-folder-info">${ic('folder')} 目录信息</button>
          <button class="btn gold" data-action="chm-refresh">${ic('refresh')} 重新扫描</button>
        </div>
      </div>
      <div class="rules-toolbar">
        <div class="rules-search">
          ${ic('search')}
          <input type="text" id="chm-search" value="${esc(ui.rules.searchQuery)}" placeholder="搜索全部规则书：技能、血统、物品、法术、关键词…" title="支持 AND / OR / NOT / NEAR / &quot;完整短语&quot; / ( ) / wild*" autocomplete="off">
          <button class="search-clear" data-action="chm-clear-search" style="${ui.rules.searchQuery ? 'display:flex' : 'display:none'}">${ic('close')}</button>
          <span class="search-hint">CTRL + K</span>
        </div>
        <div class="rules-index-state" id="rules-index-state"></div>
      </div>
      <div class="rules-shell">
        <div class="rules-side">
          <div class="favorites-panel" id="favorites-panel"></div>
          <div class="book-list" id="book-list"></div>
          <div class="toc-panel" id="toc-panel"></div>
        </div>
        <div class="reader-pane" id="reader-pane"></div>
      </div>`;
    updateLibraryUI();
    renderTocPanel();
    renderReaderPane();
    applyDisplayFilter();
  }

  function updateRulesIndexState() {
    const el = $('#rules-index-state');
    if (!el) return;
    const books = ui.rules.books || [];
    const ready = books.filter(b => b.status === 'ready');
    const pages = ready.reduce((n, b) => n + (b.pageCount || 0), 0);
    const busy = books.some(b => b.status === 'queued' || b.status === 'extracting' || b.status === 'indexing');
    el.className = 'rules-index-state' + (busy ? ' busy' : '');
    el.innerHTML = `<span class="dot"></span>${ready.length}/${books.length} 本 · ${pages} 页${busy ? ' · 后台建索引' : ''}`;
  }

  function renderBookList() {
    const box = $('#book-list');
    if (!box) return;
    const books = ui.rules.books || [];
    const collapsed = !!ui.rules.libraryCollapsed;
    const shown = collapsed && ui.rules.activeBook
      ? books.filter(b => b.key === ui.rules.activeBook)
      : (collapsed && books.length ? [books[0]] : books);
    box.innerHTML = `<div class="book-list-head">
        <span class="toc-head-title">规则书 / LIBRARY</span>
        <div class="toc-head-actions"><button class="toc-mini" data-action="toggle-rules-library" title="${collapsed ? '展开全部规则书' : '只显示当前规则书'}">${collapsed ? '展开' : '折叠'}</button><span class="toc-head-count">${collapsed ? shown.length + '/' + books.length : books.length} 本</span></div>
      </div>` +
      (shown.length ? shown.map(b => `
        <div class="book-item ${b.key === ui.rules.activeBook ? 'active' : ''}" data-book="${esc(b.key)}" title="${esc(b.fileName)}">
          <div class="book-mark">CHM</div>
          <div class="book-main">
            <div class="book-title">${esc(b.title)}</div>
            <div class="book-meta"><span class="book-state ${bookStateClass(b)}"></span><span>${esc(bookStatusLabel(b))}</span></div>
            ${(b.status === 'extracting' || b.status === 'indexing') ? `<div class="book-progress"><i style="width:${b.progress}%"></i></div>` : ''}
            ${b.status === 'error' ? `<div class="book-error">${esc(b.error || '无法读取')}</div>` : ''}
          </div>
        </div>`).join('') : `<div class="toc-empty">还没有发现 CHM。<br>点「目录信息」导入本地文件。</div>`);
  }

  function toggleRulesLibrary() {
    ui.rules.libraryCollapsed = !ui.rules.libraryCollapsed;
    renderBookList();
  }

  function favoriteId(bookKey, path) {
    return String(bookKey) + '::' + String(path);
  }

  function isFavorite(bookKey, path) {
    if (!bookKey || !path) return false;
    return favorites.some(f => f.id === favoriteId(bookKey, path));
  }

  function renderFavorites() {
    const box = $('#favorites-panel');
    if (!box) return;
    const collapsed = !!ui.rules.favoritesCollapsed;
    const items = favorites;
    box.innerHTML = `<div class="favorites-head">
        <span class="toc-head-title">收藏夹 / FAVORITES</span>
        <div class="toc-head-actions"><button class="toc-mini" data-action="toggle-favorites" title="${collapsed ? '展开收藏夹' : '折叠收藏夹'}">${collapsed ? '展开' : '折叠'}</button><span class="toc-head-count">${items.length}</span></div>
      </div>` +
      (collapsed ? '' : items.length ? `<div class="favorites-list">${items.map(f => `
        <div class="favorite-item" data-action="open-favorite" data-favorite-id="${esc(f.id)}" title="${esc(f.bookTitle + ' / ' + f.title)}">
          <span class="favorite-star">★</span>
          <div class="favorite-main"><div class="favorite-title">${esc(f.title)}</div><div class="favorite-meta">${esc(f.bookTitle)}</div></div>
          <button class="favorite-remove" data-action="remove-favorite" data-favorite-id="${esc(f.id)}" title="移除收藏">×</button>
        </div>`).join('')}</div>` : `<div class="favorites-empty">打开规则页面后，点右上角星标即可收藏。</div>`);
  }

  function toggleFavoritesPanel() {
    ui.rules.favoritesCollapsed = !ui.rules.favoritesCollapsed;
    renderFavorites();
  }

  function updateReaderFavoriteButton() {
    const btn = $('[data-action="reader-favorite"]');
    if (!btn) return;
    const r = ui.rules;
    const fav = isFavorite(r.pageBook || r.activeBook, r.pagePath);
    btn.classList.toggle('active', fav);
    btn.title = fav ? '取消收藏此页' : '收藏此页';
    btn.setAttribute('aria-pressed', fav ? 'true' : 'false');
    btn.innerHTML = ic('star');
  }

  function toggleCurrentFavorite() {
    const r = ui.rules;
    const bookKey = r.pageBook || r.activeBook;
    const path = r.pagePath;
    if (!bookKey || !path) return;
    const id = favoriteId(bookKey, path);
    const idx = favorites.findIndex(f => f.id === id);
    if (idx >= 0) {
      favorites.splice(idx, 1);
      toast('已取消收藏');
    } else {
      const book = findBook(bookKey);
      favorites.unshift({
        id, bookKey,
        bookTitle: book ? book.title : bookKey,
        path,
        title: r.pageTitle || tocTitleForPath(path) || String(path).split('/').pop(),
        addedAt: Date.now()
      });
      toast('已收藏此页');
    }
    saveFavorites();
    renderFavorites();
    updateReaderFavoriteButton();
  }

  function openFavorite(id) {
    const f = favorites.find(x => x.id === id);
    if (!f) return;
    openPage(f.path, f.title, f.bookKey);
  }

  function removeFavorite(id) {
    const idx = favorites.findIndex(f => f.id === id);
    if (idx < 0) return;
    favorites.splice(idx, 1);
    saveFavorites();
    renderFavorites();
    updateReaderFavoriteButton();
    toast('已移除收藏');
  }

  function updateLibraryUI() {
    renderBookList();
    renderFavorites();
    updateRulesIndexState();
    updateChmSidebar();
    if (!ui.rules.books.length) {
      ui.rules.activeBook = '';
      return;
    }
    if (!ui.rules.activeBook || !findBook(ui.rules.activeBook)) {
      const first = ui.rules.books.find(b => b.status === 'ready') || ui.rules.books[0];
      ui.rules.activeBook = first ? first.key : '';
      ui.rules.toc = [];
      ui.rules.tocBook = '';
    }
    const active = findBook(ui.rules.activeBook);
    if (active && active.status === 'ready' && ui.rules.tocBook !== active.key && !ui.rules.tocLoading) {
      loadToc(active.key);
    }
    if (!active || active.status !== 'ready') {
      if (ui.rules.tocBook !== ui.rules.activeBook) {
        ui.rules.toc = [];
        ui.rules.tocBook = '';
      }
      renderTocPanel();
      if (!ui.rules.pagePath) renderReaderPane();
    }
    renderBookList();
  }

  function prepareToc(nodes) {
    const map = {};
    const titleMap = {};
    let seq = 0;
    function walk(list) {
      (list || []).forEach(n => {
        n._id = 'tn_' + (++seq);
        n._children = Array.isArray(n.children) ? n.children : [];
        map[n._id] = n;
        if (n.path) {
          const clean = String(n.path).split('#')[0];
          if (!titleMap[clean]) titleMap[clean] = n.name;
        }
        walk(n._children);
      });
    }
    walk(nodes);
    ui.rules.nodeMap = map;
    ui.rules.titleMap = titleMap;
  }

  function tocNodeHTML(n) {
    const has = n._children && n._children.length > 0;
    const labelClass = ui.rules.pagePath && n.path && String(n.path).split('#')[0] === ui.rules.pagePath ? 'current' : '';
    return `<div class="toc-node">
      <div class="toc-row">
        <button class="toc-caret ${has ? '' : 'leaf'}" data-toc-toggle="${esc(n._id)}">${has ? '>' : ''}</button>
        <span class="toc-label ${labelClass}" data-toc-path="${esc(n.path || '')}" data-toc-title="${esc(n.name || '')}" data-toc-node="${esc(n._id)}">${esc(n.name || '未命名')}</span>
      </div>
      ${has ? `<div class="toc-children" data-toc-children="${esc(n._id)}"></div>` : ''}
    </div>`;
  }

  function setTocOpen(id, open) {
    const node = ui.rules.nodeMap[id];
    if (!node) return;
    const box = document.querySelector('[data-toc-children="' + id + '"]');
    if (!box) return;
    if (open && !box.dataset.loaded) {
      box.innerHTML = (node._children || []).map(tocNodeHTML).join('');
      box.dataset.loaded = '1';
    }
    box.classList.toggle('open', open);
    const caret = document.querySelector('[data-toc-toggle="' + id + '"]');
    if (caret) {
      caret.classList.toggle('open', open);
      caret.textContent = open ? 'V' : '>';
    }
  }

  function toggleToc(id) {
    const box = document.querySelector('[data-toc-children="' + id + '"]');
    if (!box) return;
    setTocOpen(id, !box.classList.contains('open'));
  }

  function toggleSection(key) {
    const body = document.querySelector('[data-section-body="' + key + '"]');
    if (!body) return;
    const collapsed = body.classList.toggle('collapsed');
    const btn = document.querySelector('.collapse-btn[data-section="' + key + '"]');
    if (btn) {
      btn.classList.toggle('collapsed', collapsed);
      btn.setAttribute('aria-expanded', String(!collapsed));
    }
    if (collapsed) ui.collapsedSections.add(key);
    else ui.collapsedSections.delete(key);
  }

  function expandAllToc() {
    const walk = node => {
      if (node._children && node._children.length) {
        setTocOpen(node._id, true);
        node._children.forEach(walk);
      }
    };
    (ui.rules.toc || []).forEach(walk);
  }

  function collapseAllToc() {
    $$('.toc-children.open').forEach(box => box.classList.remove('open'));
    $$('.toc-caret.open').forEach(caret => {
      caret.classList.remove('open');
      caret.textContent = '>';
    });
  }

  function renderTocPanel() {
    const panel = $('#toc-panel');
    if (!panel) return;
    const r = ui.rules;
    if (r.searchActive) {
      panel.innerHTML = `<div class="toc-head">
          <span class="toc-head-title">${r.searchScope === 'book' ? '本书内检索' : '全文检索'}</span>
          <div class="toc-head-right">
            <button class="scope-tab snippet-toggle ${r.showSnippet !== false ? 'active' : ''}" data-action="toggle-search-snippet" aria-pressed="${r.showSnippet !== false ? 'true' : 'false'}" title="显示 / 隐藏简略摘要">摘要</button>
            <div class="scope-tabs">
              <button class="scope-tab ${r.searchScope === 'all' ? 'active' : ''}" data-action="set-search-scope" data-scope="all" aria-pressed="${r.searchScope === 'all' ? 'true' : 'false'}">全库</button>
              <button class="scope-tab ${r.searchScope === 'book' ? 'active' : ''}" data-action="set-search-scope" data-scope="book" aria-pressed="${r.searchScope === 'book' ? 'true' : 'false'}">本书内</button>
            </div>
            <span class="toc-head-count">${r.searching ? '检索中' : r.total + ' 条'}</span>
          </div>
        </div>
        <div class="toc-scroll" id="toc-scroll">${searchResultsHTML()}</div>`;
      return;
    }
    const active = findBook(r.activeBook);
    let body;
    if (r.tocLoading) {
      body = `<div class="toc-empty"><span class="spinner" style="display:inline-block;vertical-align:-2px;margin-right:6px;"></span>正在读取目录…</div>`;
    } else if (!active) {
      body = `<div class="toc-empty">选择一本规则书查看目录。</div>`;
    } else if (active.status === 'error') {
      body = `<div class="toc-empty">${esc(active.error || '这本 CHM 读取失败')}</div>`;
    } else if (active.status !== 'ready') {
      body = `<div class="toc-empty">正在准备「${esc(active.title)}」…<br>${esc(bookStatusLabel(active))}</div>`;
    } else if (!r.toc.length) {
      body = `<div class="toc-empty">这本规则书没有目录，可直接使用全文检索。</div>`;
    } else {
      body = r.toc.map(tocNodeHTML).join('');
    }
    panel.innerHTML = `<div class="toc-head"><span class="toc-head-title">目录 / CONTENTS</span>
        <div class="toc-head-actions">
          <button class="toc-mini" data-action="toc-expand-all">展开</button>
          <button class="toc-mini" data-action="toc-collapse-all">折叠</button>
          <span class="toc-head-count">${active && active.status === 'ready' ? (active.pageCount || '') + ' 页' : ''}</span>
        </div></div>
      <div class="toc-scroll" id="toc-scroll">${body}</div>`;
    // The first level is the chapter list. Expanding it makes the actual
    // sub-pages visible immediately instead of hiding them behind a tiny caret.
    (r.toc || []).forEach(n => { if (n._children && n._children.length) setTocOpen(n._id, true); });
    setTocCurrent();
  }

  function searchResultsHTML() {
    const r = ui.rules;
    if (r.searching) return `<div class="toc-empty"><span class="spinner" style="display:inline-block;vertical-align:-2px;margin-right:6px;"></span>正在扫描全部页面…</div>`;
    if (r.error) return `<div class="toc-empty">${esc(r.error)}<br><button class="btn small mt12" data-action="chm-retry-search">重试</button></div>`;
    if (!r.results.length) return `<div class="toc-empty">没有找到「${esc(r.searchQuery)}」。<br>试试更短的关键词，或只输入核心名词。</div>`;
    return `<div class="search-summary">${r.searchScope === 'book' ? '本书内' : '全部规则书'} · 找到 ${r.total} 条${r.total > r.results.length ? '，显示前 ' + r.results.length + ' 条' : ''} · ${r.elapsed} ms</div>` +
      r.results.map((h, i) => `<div class="toc-search-result" data-result-index="${i}">
        <div class="result-line">
          <span class="result-rank">${i + 1}</span>
          <span class="result-title">${highlightText(h.title, r.searchQuery)}</span>
          <span class="result-book-inline">${esc(h.bookTitle)}</span>
        </div>
        ${r.showSnippet !== false ? `<div class="result-snippet">${highlightText(h.snippet, r.searchQuery)}</div>` : ''}
      </div>`).join('');
  }

  function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function highlightText(text, query) {
    let out = esc(text || '');
    const terms = (query || '').replace(/[()\"]/g, ' ').split(/\s+/)
      .filter(t => t && !['AND', 'OR', 'NOT', 'NEAR'].includes(t.toUpperCase()))
      .map(t => t.replace(/\*/g, '')).filter(Boolean).slice(0, 6);
    terms.forEach(t => {
      try {
        const rx = new RegExp('(' + escapeRegExp(esc(t)) + ')', 'gi');
        out = out.replace(rx, '<mark>$1</mark>');
      } catch (e) { }
    });
    return out;
  }

  function tocTitleForPath(path) {
    return (ui.rules.titleMap && ui.rules.titleMap[path]) || '';
  }

  async function loadToc(key) {
    if (!key) return;
    if (ui.rules.tocLoading && ui.rules.tocBook === key) return;
    const book = findBook(key);
    if (!book || book.status !== 'ready') {
      ui.rules.toc = [];
      ui.rules.tocBook = '';
      renderTocPanel();
      return;
    }
    ui.rules.tocLoading = true;
    ui.rules.tocBook = key;
    ui.rules.toc = [];
    renderTocPanel();
    try {
      const msg = await request('chm.toc', { bookKey: key }, 30000);
      if (ui.rules.activeBook !== key) return;
      const toc = Array.isArray(msg.toc) ? msg.toc : [];
      prepareToc(toc);
      ui.rules.toc = toc;
      ui.rules.tocLoading = false;
      renderTocPanel();
    } catch (e) {
      if (ui.rules.activeBook !== key) return;
      ui.rules.tocLoading = false;
      ui.rules.toc = [];
      renderTocPanel();
      toast('读取目录失败：' + e.message, 'error');
    }
  }

  function selectBook(key) {
    if (!key || ui.rules.activeBook === key) return;
    ui.rules.activeBook = key;
    ui.rules.toc = [];
    ui.rules.tocBook = '';
    ui.rules.tocLoading = false;
    ui.rules.pagePath = '';
    ui.rules.pageTitle = '';
    ui.rules.pageBook = key;
    renderBookList();
    renderTocPanel();
    renderReaderPane();
    const b = findBook(key);
    if (b && b.status === 'ready') loadToc(key);
    if (ui.rules.searchScope === 'book' && ui.rules.searchActive && ui.rules.searchQuery.trim()) {
      window.setTimeout(() => startSearch(ui.rules.searchQuery), 0);
    }
  }

  function chmUrl(bookKey, path) {
    const [file, anchor] = String(path || '').split('#');
    const encoded = file.split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return `https://chm.local/${encodeURIComponent(bookKey)}/${encoded}` + (anchor ? '#' + encodeURIComponent(anchor) : '');
  }

  function openPage(path, title, bookKey) {
    bookKey = bookKey || ui.rules.activeBook;
    if (!bookKey) return;
    const b = findBook(bookKey);
    if (!b || b.status !== 'ready') { toast('这本规则书还没有准备好', 'error'); return; }
    ui.rules.pageBook = bookKey;
    ui.rules.activeBook = bookKey;
    ui.rules.pagePath = path;
    ui.rules.pageTitle = title || tocTitleForPath(path) || String(path).split('/').pop();
    if (ui.rules.tocBook !== bookKey) loadToc(bookKey);
    renderBookList();
    renderReaderPane();
    setTocCurrent();
  }

  function renderReaderPane() {
    const pane = $('#reader-pane');
    if (!pane) return;
    const r = ui.rules;
    if (!r.pagePath) {
      const active = findBook(r.activeBook);
      const ready = r.books.filter(b => b.status === 'ready').length;
      pane.innerHTML = `<div class="reader-welcome">
        <div class="big-mark">∞</div>
        <h3>${ready ? '规则书已就绪' : '正在准备规则书'}</h3>
        <p>${ready ? '左侧是目录。你可以点开任意章节，也可以直接用上方搜索框在全部 CHM 中检索。' : '程序正在自动解包并索引 CHM。首次打开大体积规则书可能需要几十秒，之后会使用本地缓存。'}</p>
        <p style="font-size:9px;color:#a39681;">点「导入 CHM 文件」选择手机里的规则书；导入后会自动扫描书库。</p>
        <p style="font-size:9px;color:#a39681;">${r.books.length} 本规则书 · ${ready} 本可检索${active ? ' · 当前：' + esc(active.title) : ''}</p>
        <div style="display:flex;gap:7px;margin-top:4px;">
          ${ready ? `<button class="btn small" data-action="focus-search">${ic('search')} 全文检索</button>` : ''}
          <button class="btn small" data-action="chm-add-folder">${ic('folder')} 导入 CHM 文件</button>
        </div>
      </div>`;
      return;
    }
    const book = findBook(r.pageBook || r.activeBook);
    const url = chmUrl(r.pageBook || r.activeBook, r.pagePath);
    const favorite = isFavorite(r.pageBook || r.activeBook, r.pagePath);
    pane.innerHTML = `<div class="reader-bar">
        <div class="reader-breadcrumb">
          <span class="crumb-book" id="reader-book">${esc(book ? book.title : '')}</span>
          <span class="crumb-sep">/</span>
          <span class="crumb-page" id="reader-page">${esc(r.pageTitle || r.pagePath)}</span>
        </div>
        <label class="reader-zoom" title="只缩放规则书正文">
          <span>缩放</span>
          <input id="reader-zoom-range" type="range" min="80" max="180" step="5" value="100">
          <output id="reader-zoom-value">100%</output>
        </label>
        <div class="reader-actions">
          <button class="reader-action favorite-btn ${favorite ? 'active' : ''}" data-action="reader-favorite" title="${favorite ? '取消收藏此页' : '收藏此页'}" aria-pressed="${favorite ? 'true' : 'false'}">${ic('star')}</button>
          <button class="reader-action" data-action="reader-refresh" title="刷新页面">${ic('refresh')}</button>
          <button class="reader-action" data-action="reader-source" title="查看目录信息">${ic('folder')}</button>
          <button class="reader-action" data-action="reader-close" title="关闭阅读">${ic('close')}</button>
        </div>
      </div>
      <div class="reader-frame-wrap" id="reader-frame-wrap">
        <iframe id="chm-frame" src="${esc(url)}" title="${esc(r.pageTitle || '规则书页面')}"></iframe>
        <div class="reader-loading" id="reader-loading"><span class="spinner"></span>载入页面…</div>
      </div>`;
    const frame = $('#chm-frame');
    const hide = () => { const el = $('#reader-loading'); if (el) el.remove(); };
    if (frame) {
      frame.addEventListener('load', () => { applyReaderZoom(); window.setTimeout(hide, 80); });
      // Local CHM pages are usually instantaneous; never leave the overlay
      // covering a page if the load event raced with listener attachment.
      window.setTimeout(hide, 700);
    }
  }

  function updateReaderBar() {
    const b = $('#reader-book');
    const p = $('#reader-page');
    const book = findBook(ui.rules.pageBook || ui.rules.activeBook);
    if (b) b.textContent = book ? book.title : '';
    if (p) p.textContent = ui.rules.pageTitle || ui.rules.pagePath;
  }

  function setTocCurrent() {
    $$('.toc-label.current').forEach(el => el.classList.remove('current'));
    if (!ui.rules.pagePath) return;
    const target = $$('[data-toc-path]').find(el => String(el.dataset.tocPath).split('#')[0] === ui.rules.pagePath);
    if (target) target.classList.add('current');
  }

  function startSearch(query) {
    const r = ui.rules;
    query = (query || '').trim();
    r.searchQuery = query;
    r.searchActive = !!query;
    r.error = '';
    if (!query) {
      r.currentSearch = '';
      r.searching = false;
      r.results = [];
      r.total = 0;
      renderTocPanel();
      return;
    }
    if (!r.books.some(b => b.status === 'ready')) {
      r.searching = false;
      r.results = [];
      r.total = 0;
      r.error = '规则书还在解包 / 索引中，请稍候再搜索。';
      renderTocPanel();
      return;
    }
    const scopeBook = r.searchScope === 'book' ? r.activeBook : '';
    if (r.searchScope === 'book' && !scopeBook) {
      r.searching = false;
      r.results = [];
      r.total = 0;
      r.error = '当前没有选中的规则书，请先在左侧选择一本。';
      renderTocPanel();
      return;
    }
    r.searching = true;
    r.results = [];
    r.total = 0;
    const id = 'search_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    r.currentSearch = id;
    renderTocPanel();
    post({ type: 'chm.search', requestId: id, query, bookKey: scopeBook });
  }

  function refreshSearchInput() {
    const input = $('#chm-search');
    if (!input) return;
    input.value = ui.rules.searchQuery || '';
  }

  function parseChmPath(rawPath) {
    try {
      const parts = String(rawPath || '').split('/').filter(Boolean);
      if (!parts.length) return null;
      const key = decodeURIComponent(parts[0]);
      const path = parts.slice(1).map(decodeURIComponent).join('/');
      return { key, path };
    } catch (e) { return null; }
  }

  function handleChmNavigated(msg) {
    const parsed = parseChmPath(msg.path);
    if (!parsed || !parsed.path) return;
    ui.rules.pageBook = parsed.key;
    ui.rules.pagePath = parsed.path;
    if (ui.rules.activeBook !== parsed.key) {
      ui.rules.activeBook = parsed.key;
      renderBookList();
      if (ui.rules.tocBook !== parsed.key) loadToc(parsed.key);
    }
    const t = (msg.title || '').trim();
    const tocTitle = tocTitleForPath(parsed.path);
    ui.rules.pageTitle = (t && !/^(microsoft|untitled|无标题|新建)/i.test(t) ? t : '') || tocTitle || parsed.path.split('/').pop();
    updateReaderBar();
    setTocCurrent();
    const loading = $('#reader-loading');
    if (loading) loading.remove();
  }

  function openFromChmUrl(url) {
    try {
      const u = new URL(url);
      const parsed = parseChmPath(u.pathname);
      if (parsed) openPage(parsed.path, tocTitleForPath(parsed.path), parsed.key);
    } catch (e) { }
  }

  /* ============================================================
     ACTIONS
     ============================================================ */
  function addCustomSkill() {
    const s = D.newCustomSkill({ name: '新技能', group: '心智', attr: 'int' });
    state.customSkills.push(s);
    stateChanged({ rerender: true });
    toast('已添加自定义技能');
  }

  function settleAttack(index) {
    const a = computed.attacks[index];
    if (!a) return;
    if (a.energyCost > 0) {
      if (a.energyState === 'missing') { toast('未找到能量池「' + (a.energyPool || '') + '」', 'error'); return; }
      if (a.energyState === 'short') { toast('能量不足：需要 ' + a.energyCost + '，当前 ' + a.poolCurrent, 'error'); return; }
      const pool = state.energyPools.find(p => p.name === a.energyPool);
      if (pool) pool.current = Math.max(0, C.num(pool.current) - a.energyCost);
    }
    if (a.willCost > 0) {
      if (computed.health.willCurrent < a.willCost) { toast('意志不足：需要 ' + a.willCost, 'error'); return; }
      state.defense.willCurrent = Math.max(0, computed.health.willCurrent - a.willCost);
    }
    stateChanged({ rerender: true });
    toast('已结算「' + a.name + '」的消耗');
  }

  function addEnergyPool(kind) {
    kind = kind === 'gauge' ? 'gauge' : 'energy';
    const prefix = kind === 'gauge' ? '刻度 ' : '能量池 ';
    let n = 1;
    while (state.energyPools.some(p => p.name === prefix + String.fromCharCode(64 + n)) && n < 26) n++;
    const name = prefix + String.fromCharCode(64 + Math.min(n, 26));
    state.energyPools.push({ id: uid(), kind, name, max: 0, current: 0, recovery: '', usage: '' });
    stateChanged({ rerender: true });
  }

  function doExport() {
    saveNow();
    post({ type: 'file.export', json: JSON.stringify(state, null, 2), name: state.meta.name || '角色卡' });
  }

  async function doImport() {
    try {
      const msg = await request('file.import', {}, 300000);
      if (!msg.ok) throw new Error(msg.message || '未选择文件');
      const incoming = Array.isArray(msg.files) && msg.files.length
        ? msg.files
        : [{ name: '', content: msg.content, path: msg.path }];
      const valid = [];
      const failed = [];
      incoming.forEach(f => {
        try {
          const raw = JSON.parse(f.content);
          if (!raw || typeof raw !== 'object') throw new Error('不是有效的角色卡');
          valid.push({ name: f.name || '', state: normalizeState(raw) });
        } catch (e) {
          failed.push(f.name || '未命名文件');
        }
      });
      if (!valid.length) throw new Error('没有可导入的有效角色卡');
      if (incoming.length === 1 && valid.length === 1) {
        state = valid[0].state;
        computed = C.compute(state);
        statDeltas = {};
        saveNow();
        if (activeView === 'rules') switchView('overview');
        else renderView(activeView);
        updateSidebar();
        toast('角色卡已导入', 'success');
        return;
      }
      saveNow();
      const added = valid.map(v => {
        const p = {
          id: 'char_' + uid(),
          name: profileLabel(v.state),
          updatedAt: Date.now(),
          state: v.state
        };
        profiles.push(p);
        return p;
      });
      const last = added[added.length - 1];
      activeProfileId = last.id;
      state = normalizeState(JSON.parse(JSON.stringify(last.state)));
      computed = C.compute(state);
      statDeltas = {};
      persistProfiles();
      updateCharacterSwitcher();
      switchView('overview');
      updateSidebar();
      saveNow();
      const skipped = C.num(msg.skipped);
      toast(`已导入 ${added.length} 张角色卡${failed.length ? `，${failed.length} 个失败` : ''}${skipped ? `，${skipped} 个超过 20MB` : ''}`, 'success');
    } catch (e) {
      toast('导入失败：' + e.message, 'error');
    }
  }

  function currentTheme() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme, persist) {
    const light = theme === 'light';
    if (light) document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = light ? 'light' : 'dark';
    document.querySelectorAll('[data-theme-icon]').forEach(el => { el.innerHTML = ic(light ? 'moon' : 'sun'); });
    document.querySelectorAll('[data-theme-label]').forEach(el => { el.textContent = light ? '暗黑' : '明亮'; });
    document.querySelectorAll('[data-action="toggle-theme"]').forEach(el => {
      el.title = light ? '切换到暗黑模式' : '切换到明亮模式';
      el.setAttribute('aria-pressed', light ? 'true' : 'false');
    });
    if (persist) {
      try { localStorage.setItem('infinite-terminal/theme', light ? 'light' : 'dark'); } catch (e) { }
    }
    applyDisplayFilter();
    syncDisplayControls();
  }

  function saveDisplaySettings() {
    try { localStorage.setItem(DISPLAY_KEY, JSON.stringify(displaySettings)); } catch (e) { }
  }

  function loadZoomValue(key, fallback) {
    try {
      const v = Number(localStorage.getItem(key));
      return Number.isFinite(v) && v > 0 ? v : fallback;
    } catch (e) { return fallback; }
  }

  let uiZoom = Math.max(85, Math.min(150, loadZoomValue(UI_ZOOM_KEY, 115)));
  let readerZoom = Math.max(80, Math.min(180, loadZoomValue(READER_ZOOM_KEY, 100)));
  let fontZoom = Math.max(80, Math.min(150, loadZoomValue(FONT_ZOOM_KEY, 100)));
  let uiZoomTimer = null;

  function applyUiZoom(send) {
    document.documentElement.style.zoom = '';
    if (HAS_UI_ZOOM && send) {
      try { post({ type: 'ui.zoom', value: uiZoom / 100 }); } catch (e) { }
    }
    const range = $('#ui-zoom-range');
    const out = $('#ui-zoom-value');
    if (range) range.value = uiZoom;
    if (out) out.textContent = uiZoom + '%';
    applyReaderZoom();
  }

  function applyReaderZoom() {
    const frame = $('#chm-frame');
    const out = $('#reader-zoom-value');
    const range = $('#reader-zoom-range');
    if (range) range.value = readerZoom;
    if (out) out.textContent = readerZoom + '%';
    if (!frame) return;
    const scale = HAS_UI_ZOOM ? (readerZoom / uiZoom) : (readerZoom / 100);
    frame.style.zoom = String(Math.max(0.5, Math.min(2.5, scale)));
  }

  function setUiZoom(v, commit) {
    uiZoom = Math.max(85, Math.min(150, Number(v) || 115));
    try { localStorage.setItem(UI_ZOOM_KEY, String(uiZoom)); } catch (e) { }
    const out = $('#ui-zoom-value');
    if (out) out.textContent = uiZoom + '%';
    window.clearTimeout(uiZoomTimer);
    if (commit) applyUiZoom(true);
  }

  function setFontZoom(v, commit) {
    fontZoom = Math.max(80, Math.min(150, Number(v) || 100));
    try { localStorage.setItem(FONT_ZOOM_KEY, String(fontZoom)); } catch (e) { }
    const out = $('#font-zoom-value');
    if (out) out.textContent = fontZoom + '%';
    if (commit) applyFontZoom();
  }

  function applyFontZoom() {
    const range = $('#font-zoom-range');
    const out = $('#font-zoom-value');
    if (range) range.value = fontZoom;
    if (out) out.textContent = fontZoom + '%';
    $$('[data-font-bumped]').forEach(el => {
      const base = Number(el.dataset.fontBase);
      if (!Number.isFinite(base) || base <= 0) return;
      el.style.fontSize = (Math.round((base + FONT_BUMP) * fontZoom) / 100 * 10 / 10) + 'px';
    });
  }

  function setReaderZoom(v) {
    readerZoom = Math.max(80, Math.min(180, Number(v) || 100));
    try { localStorage.setItem(READER_ZOOM_KEY, String(readerZoom)); } catch (e) { }
    applyReaderZoom();
  }

  function toggleZoomPanel() {
    const panel = $('#zoom-panel');
    if (!panel) return;
    const open = !panel.hidden;
    closeDisplayPanel();
    if (open) panel.hidden = true;
    else { applyUiZoom(false); panel.hidden = false; }
  }

  function closeZoomPanel() {
    const panel = $('#zoom-panel');
    if (panel) panel.hidden = true;
  }

  function resetUiZoom() {
    uiZoom = 115;
    try { localStorage.setItem(UI_ZOOM_KEY, '115'); } catch (e) { }
    applyUiZoom(true);
    toast('界面缩放已恢复为 115%');
  }

  function applyDisplayFilter() {
    const app = $('#app');
    const s = displaySettings[currentTheme()] || DISPLAY_DEFAULTS[currentTheme()];
    const value = `brightness(${s.brightness}%) contrast(${s.contrast}%) grayscale(${s.grayscale}%)`;
    if (app) app.style.filter = '';
    $$('.titlebar, .sidebar').forEach(el => { el.style.filter = value; });
    $$('.view').forEach(view => {
      if (view.id === 'view-rules') {
        view.style.filter = '';
        ['.rules-head', '.rules-toolbar', '.rules-side'].forEach(sel => {
          view.querySelectorAll(sel).forEach(el => { el.style.filter = value; });
        });
        const reader = view.querySelector('.reader-pane');
        if (reader) reader.style.filter = '';
      } else {
        view.style.filter = value;
      }
    });
  }

  function syncDisplayControls() {
    const s = displaySettings[currentTheme()] || DISPLAY_DEFAULTS[currentTheme()];
    ['brightness', 'contrast', 'grayscale'].forEach(key => {
      const input = $('#display-' + key);
      const out = $('#display-' + key + '-value');
      if (input) input.value = s[key];
      if (out) out.textContent = s[key] + '%';
    });
  }

  function toggleDisplayPanel() {
    const panel = $('#display-panel');
    if (!panel) return;
    closeZoomPanel();
    const open = !panel.hidden;
    if (open) panel.hidden = true;
    else {
      syncDisplayControls();
      panel.hidden = false;
    }
  }

  function closeDisplayPanel() {
    const panel = $('#display-panel');
    if (panel) panel.hidden = true;
  }

  function resetDisplaySettings() {
    displaySettings[currentTheme()] = Object.assign({}, DISPLAY_DEFAULTS[currentTheme()]);
    saveDisplaySettings();
    applyDisplayFilter();
    syncDisplayControls();
    toast('已恢复当前主题的默认显示');
  }

  function renderChangelog() {
    const list = $('#changelog-list');
    if (!list) return;
    const count = $('#changelog-count');
    const current = $('#changelog-current');
    if (count) count.textContent = UPDATES.length;
    if (current) current.textContent = APP_VERSION;
    list.innerHTML = UPDATES.map(u => `
      <article class="update-item ${u.current ? 'latest' : ''}">
        <div class="update-version">
          <span class="update-badge">${esc(u.version)}</span>
          ${u.current ? '<span class="update-current">当前</span>' : ''}
          <span class="update-date">${esc(u.date)}</span>
        </div>
        <div class="update-rail"><span class="update-dot"></span></div>
        <div class="update-content">
          <div class="update-title">${esc(u.title)}</div>
          <ul class="update-notes">${u.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
        </div>
      </article>`).join('');
  }

  function openChangelog() {
    const layer = $('#changelog-layer');
    if (!layer) return;
    renderChangelog();
    layer.hidden = false;
    requestAnimationFrame(() => layer.classList.add('show'));
    const close = $('.about-close', layer);
    if (close) close.focus();
  }

  function closeChangelog() {
    const layer = $('#changelog-layer');
    if (!layer) return;
    layer.classList.remove('show');
    window.setTimeout(() => { layer.hidden = true; }, 180);
  }

  function openAbout() {
    const layer = $('#about-layer');
    if (!layer) return;
    layer.hidden = false;
    requestAnimationFrame(() => layer.classList.add('show'));
    const close = $('.about-close', layer);
    if (close) close.focus();
  }

  function closeAbout() {
    const layer = $('#about-layer');
    if (!layer) return;
    layer.classList.remove('show');
    window.setTimeout(() => { layer.hidden = true; }, 180);
  }

  function closeCharacterCheck() {
    const layer = document.getElementById('character-check-layer');
    if (layer) layer.remove();
  }

  function openCharacterCheck() {
    const c = C.compute(state);
    const name = state.meta.name || '未命名调查员';
    const normalDef = (c.defense.scenarios.find(s => s.key === 'normal') || {}).value || 0;
    const skillCount = (c.allSkills || []).filter(s => Number(s.level) > 0).length;
    const attackCount = (state.attacks || []).length;
    const checks = [
      { ok: name !== '未命名调查员' && name !== '新角色', label: '角色名', pass: name, tip: '给角色一个名字，导出和切换角色时会更好认。' },
      { ok: c.hp > 0, label: '生命上限', pass: `生命 ${fmt(c.hp)}`, tip: '生命是承受伤害的基础；先确认它不是 0。' },
      { ok: c.will > 0, label: '意志上限', pass: `意志 ${fmt(c.will)}`, tip: '意志用于能力和精神抵抗；不是当前生命。' },
      { ok: normalDef > 0, label: '防御', pass: `平时防御 ${fmt(normalDef)}`, tip: '战斗页会用防御总值参与结算；基础防御只是其中一项。' },
      { ok: attackCount > 0, label: '攻击预设', pass: `${attackCount} 个攻击`, tip: '没有攻击预设，战斗页就没有可结算的行。' },
      { ok: skillCount >= 2, label: '核心技能', pass: `${skillCount} 个有等级技能`, tip: '至少准备两个常用技能，避免所有判定都靠裸属性。' }
    ];
    const passed = checks.filter(x => x.ok).length;
    let layer = document.getElementById('character-check-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'character-check-layer';
      layer.className = 'stat-guide-layer';
      document.body.appendChild(layer);
      layer.addEventListener('click', e => {
        if (e.target === layer || e.target.closest('[data-check-close]')) { closeCharacterCheck(); return; }
        if (e.target.closest('[data-check-goto]')) {
          closeCharacterCheck();
          switchView(e.target.closest('[data-check-goto]').dataset.checkGoto);
        }
      });
    }
    layer.innerHTML = `<div class="stat-guide-card quick-build-card character-check-card" role="dialog" aria-modal="true" aria-label="检查角色卡">
      <button class="stat-guide-close" data-check-close aria-label="关闭">✕</button>
      <div class="stat-guide-kicker">CHARACTER CHECK / 检查角色卡</div>
      <h2>${passed >= checks.length ? '这张卡可以开跑了' : '这张卡还能再稳一点'}</h2>
      <p class="quick-note">不是规则审判，只检查容易漏掉、会直接影响战斗的东西。</p>
      <div class="character-check-list">
        ${checks.map(x => `<div class="character-check-item ${x.ok ? 'ok' : 'warn'}">
          <span class="character-check-icon">${x.ok ? '✓' : '!'}</span>
          <div><b>${esc(x.label)}</b><small>${x.ok ? esc(x.pass) : esc(x.tip)}</small></div>
        </div>`).join('')}
      </div>
      <div class="character-check-actions">
        <button class="btn" data-check-close>关闭</button>
        <span style="flex:1"></span>
        <button class="btn" data-check-goto="character">去人物卡</button>
        <button class="btn gold" data-check-goto="combat">去战斗页</button>
      </div>
    </div>`;
    requestAnimationFrame(() => layer.classList.add('show'));
  }

  const QUICK_BUILD_TEMPLATES = [
    {
      key: 'vanguard', name: '耐力前排', tag: '站得住', concept: '前排',
      desc: '生命和防御优先，适合第一次战斗站在队友前面。',
      primary: ['sta', 'str', 'com'],
      attrs: { int: 1, per: 2, res: 2, str: 3, agi: 2, sta: 4, pre: 1, man: 1, com: 2 },
      skills: { brawl: 3, athletics: 3, survival: 3, melee: 3, firearms: 2, drive: 2, stealth: 2, persuasion: 2 },
      defense: { baseA: 'sta', baseB: 'agi', baseMode: 'low' },
      attack: 'brawl'
    },
    {
      key: 'scout', name: '敏捷调查', tag: '先手与线索',
      concept: '调查 / 敏捷',
      desc: '先攻、躲藏和调查兼顾，适合观察、找线索和先手攻击。',
      primary: ['agi', 'per', 'int'],
      attrs: { int: 3, per: 3, res: 1, str: 1, agi: 4, sta: 2, pre: 1, man: 1, com: 2 },
      skills: { investigation: 3, stealth: 3, firearms: 3, athletics: 3, survival: 3, drive: 2, empathy: 3 },
      defense: { baseA: 'agi', baseB: 'per', baseMode: 'low' },
      attack: 'firearms'
    },
    {
      key: 'caster', name: '意志术法', tag: '资源爆发',
      concept: '术法',
      desc: '意志和智力优先，依赖资源与法术攻击；生命和防御偏低。',
      primary: ['res', 'int', 'com'],
      attrs: { int: 4, per: 2, res: 4, str: 1, agi: 1, sta: 2, pre: 1, man: 1, com: 2 },
      skills: { occult: 3, academics: 3, investigation: 3, empathy: 3, persuasion: 3, medicine: 2, science: 3 },
      defense: { baseA: 'res', baseB: 'int', baseMode: 'low' },
      attack: 'spell'
    },
    {
      key: 'face', name: '社交支援', tag: '交涉与辅助',
      concept: '社交 / 支援',
      desc: '风度和操控优先，适合交涉、情报和支援队友。',
      primary: ['pre', 'man', 'com'],
      attrs: { int: 1, per: 2, res: 2, str: 1, agi: 2, sta: 2, pre: 3, man: 4, com: 1 },
      skills: { persuasion: 3, empathy: 3, subterfuge: 3, investigation: 3, expressionA: 3, intimidate: 3, animal: 2 },
      defense: { baseA: 'agi', baseB: 'per', baseMode: 'low' },
      attack: 'lightThrow'
    }
  ];

  const QUICK_ATTR_BUDGET = 9;
  const QUICK_SKILL_BUDGET = 20;

  function quickBuildAttrCost(st) {
    return Object.values(st.attributes).reduce((sum, a) => {
      const v = Math.max(1, Math.min(5, Number(a.base) || 1));
      return sum + (v - 1) + (v === 5 ? 1 : 0);
    }, 0);
  }

  function quickBuildSkillCost(st) {
    return Object.values(st.skills).reduce((sum, s) => sum + Math.max(0, Number(s.level) || 0), 0);
  }

  function quickBuildBudgetHTML(st) {
    const attr = quickBuildAttrCost(st);
    const skill = quickBuildSkillCost(st);
    return `<div class="quick-budget ${attr > QUICK_ATTR_BUDGET || skill > QUICK_SKILL_BUDGET ? 'over' : ''}">
      <span>属性点 <b>${attr}</b> / ${QUICK_ATTR_BUDGET}</span>
      <span>技能点 <b>${skill}</b> / ${QUICK_SKILL_BUDGET}</span>
    </div>`;
  }

  let quickBuildDraft = null;
  let quickBuildStep = 0;

  function quickBuildFromTemplate(key) {
    const tpl = QUICK_BUILD_TEMPLATES.find(t => t.key === key);
    if (!tpl) return null;
    const st = D.createDefaultState();
    Object.entries(tpl.attrs).forEach(([k, v]) => { if (st.attributes[k]) st.attributes[k].base = v; });
    Object.entries(tpl.skills).forEach(([k, v]) => { if (st.skills[k]) st.skills[k].level = v; });
    Object.assign(st.defense, tpl.defense || {});
    const t = D.ATTACK_TEMPLATES.find(x => x.key === tpl.attack);
    if (t) {
      const a = D.newAttack(t.name);
      a.name = t.name;
      a.attr = t.attr;
      a.skill = t.skill;
      a.capAttr = t.capAttr;
      a.capSkill = t.capSkill;
      a.capWeapon = t.capWeapon;
      a.capPower = t.capPower;
      a.capLegend = t.capLegend;
      a.weapon = t.key === 'spell' ? 0 : t.capWeapon;
      a.power = t.key === 'spell' ? 1 : 0;
      st.attacks = [a];
    }
    st.meta.name = '新角色';
    st.meta.concept = tpl.concept;
    st.meta.team = tpl.name;
    return { template: tpl, state: st };
  }

  function closeQuickBuild() {
    const layer = document.getElementById('quick-build-layer');
    if (layer) layer.remove();
  }

  function quickBuildPreviewHTML(st) {
    const c = C.compute(st);
    const a = (c.attacks || [])[0];
    const hp = Math.round(c.hp);
    const will = Math.round(c.will);
    return quickBuildBudgetHTML(st) + `<div class="quick-preview-grid">
      <div><span>生命上限</span><b>${fmt(hp)}</b></div>
      <div><span>意志上限</span><b>${fmt(will)}</b></div>
      <div><span>基础防御</span><b>${fmt(c.baseDefense)}</b></div>
      <div><span>先攻</span><b>${c.initiative >= 0 ? '+' : ''}${fmt(c.initiative)}</b></div>
      <div><span>攻击 DP</span><b>${a ? fmt(a.dp) : '—'}</b></div>
      <div><span>期望伤害</span><b>${a ? fmt(C.round1(a.expectedDamage)) : '—'}</b></div>
    </div>`;
  }

  function renderQuickBuild() {
    const layer = document.getElementById('quick-build-layer');
    if (!layer) return;
    const tpl = quickBuildDraft ? quickBuildDraft.template : null;
    const st = quickBuildDraft ? quickBuildDraft.state : null;
    let body = '';
    if (quickBuildStep === 0) {
      body = `<div class="quick-template-grid">
        ${QUICK_BUILD_TEMPLATES.map(t => `<button class="quick-template ${t.key === (tpl && tpl.key) ? 'active' : ''}" data-qb-template="${t.key}">
          <div class="quick-template-top"><b>${esc(t.name)}</b><span>${esc(t.tag)}</span></div>
          <p>${esc(t.desc)}</p>
          <small>关键：${t.primary.map(k => esc(D.ATTR_MAP[k].name)).join(' · ')}</small>
        </button>`).join('')}
      </div>`;
    } else if (quickBuildStep === 1 && st) {
      body = `<div class="quick-field"><label for="qb-name">角色名</label><input id="qb-name" type="text" maxlength="40" value="${esc(st.meta.name || '')}" placeholder="例如：阿黛尔"></div>
        <div class="quick-field"><label>你想重点调整的三个属性</label>
          <div class="quick-primary-list">${tpl.primary.map(k => `<label class="quick-primary"><span>${esc(D.ATTR_MAP[k].name)}<small>${esc(D.ATTR_MAP[k].desc)}</small></span><input data-qb-attr="${k}" type="number" min="1" max="5" value="${fmt(st.attributes[k].base)}"></label>`).join('')}</div>
        </div>
        <div class="quick-note">其余六项属性、技能和防御已经按「${esc(tpl.name)}」模板填好，之后可以在人物卡里继续修改。</div>
        ${quickBuildPreviewHTML(st)}`;
    } else if (st) {
      body = `<div class="quick-review-title">${esc(st.meta.name || '未命名调查员')}</div>
        <div class="quick-review-sub">${esc(st.meta.team || '')} · ${esc(st.meta.concept || '')}</div>
        ${quickBuildPreviewHTML(st)}
        <div class="quick-review-list">
          ${tpl.primary.map(k => `<span>${esc(D.ATTR_MAP[k].name)} <b>${fmt(st.attributes[k].base)}</b></span>`).join('')}
          <span>攻击 <b>${esc((st.attacks[0] && st.attacks[0].name) || '—')}</b></span>
        </div>
        <div class="quick-note">这是可修改的起点。建卡后可以继续补装备、技能和资源。</div>`;
    }
    const last = quickBuildStep === 2;
    layer.innerHTML = `<div class="stat-guide-card quick-build-card" role="dialog" aria-modal="true" aria-label="快速建卡">
      <button class="stat-guide-close" data-qb-close aria-label="关闭">✕</button>
      <div class="stat-guide-kicker">QUICK BUILD / 快速建卡</div>
      <div class="quick-build-steps"><span class="${quickBuildStep === 0 ? 'active' : ''}">1 选模板</span><i>→</i><span class="${quickBuildStep === 1 ? 'active' : ''}">2 改三项</span><i>→</i><span class="${last ? 'active' : ''}">3 看结果</span></div>
      <h2>${quickBuildStep === 0 ? '先选一个能直接玩的起点' : quickBuildStep === 1 ? '只改最重要的三项' : '确认你的角色'}</h2>
      ${body}
      <div class="quick-build-actions">
        <button class="btn" data-qb-close>取消</button>
        <span style="flex:1"></span>
        ${quickBuildStep > 0 ? '<button class="btn" data-qb-back>上一步</button>' : ''}
        <button class="btn gold" data-qb-next ${quickBuildStep === 0 ? 'disabled' : ''}>${last ? '创建角色' : '下一步'}</button>
      </div>
    </div>`;
  }

  function openQuickBuild() {
    closeCharacterMenu();
    quickBuildStep = 0;
    quickBuildDraft = null;
    let layer = document.getElementById('quick-build-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'quick-build-layer';
      layer.className = 'stat-guide-layer';
      document.body.appendChild(layer);
      layer.addEventListener('click', e => {
        if (e.target === layer || e.target.closest('[data-qb-close]')) { closeQuickBuild(); return; }
        const t = e.target.closest('[data-qb-template]');
        if (t) {
          quickBuildDraft = quickBuildFromTemplate(t.dataset.qbTemplate);
          quickBuildStep = 1;
          renderQuickBuild();
          return;
        }
        if (e.target.closest('[data-qb-back]')) {
          quickBuildStep = Math.max(0, quickBuildStep - 1);
          renderQuickBuild();
          return;
        }
        if (e.target.closest('[data-qb-next]')) {
          if (quickBuildStep === 0) { if (!quickBuildDraft) return; quickBuildStep = 1; renderQuickBuild(); return; }
          if (quickBuildStep === 1) {
            const nameInput = document.getElementById('qb-name');
            if (nameInput) quickBuildDraft.state.meta.name = nameInput.value.trim() || '未命名调查员';
            document.querySelectorAll('[data-qb-attr]').forEach(input => {
              const key = input.dataset.qbAttr;
              const v = Math.max(1, Math.min(5, Number(input.value) || 1));
              if (quickBuildDraft.state.attributes[key]) quickBuildDraft.state.attributes[key].base = v;
            });
            if (quickBuildAttrCost(quickBuildDraft.state) > QUICK_ATTR_BUDGET) {
              toast('属性点超出：初始最多 9 点（4→5 需要 2 点）', 'error');
              return;
            }
            quickBuildStep = 2;
          } else if (quickBuildStep === 2) {
            saveNow();
            const st = normalizeState(quickBuildDraft.state);
            st.meta.name = st.meta.name || '未命名调查员';
            const p = { id: 'char_' + uid(), name: profileLabel(st), updatedAt: Date.now(), state: st };
            profiles.push(p);
            activeProfileId = p.id;
            state = normalizeState(JSON.parse(JSON.stringify(st)));
            computed = C.compute(state);
            statDeltas = {};
            persistProfiles();
            updateCharacterSwitcher();
            closeQuickBuild();
            switchView('overview');
            updateSidebar();
            saveNow();
            toast('快速建卡完成，可以开始填装备和资源了');
          } else {
            quickBuildStep = 1;
          }
          renderQuickBuild();
        }
      });
    }
    renderQuickBuild();
    requestAnimationFrame(() => layer.classList.add('show'));
  }

  const STAT_GUIDE = {
    hp: {
      label: '生命上限', en: 'HP / HEALTH',
      value: () => fmt(computed.hp),
      purpose: '你能承受的伤害总量。受到伤害后扣这里；扣到 0 会昏迷或濒死。',
      formula: '耐力 + 体型 + 传奇耐力 + 生命加值',
      changes: '耐力、体型、传奇耐力、装备 / 资源提供的生命加值发生变化时。',
      example: '战斗里受到伤害，看“生命与状态”中的完好生命；生命上限本身不是当前生命。'
    },
    will: {
      label: '意志上限', en: 'WILL / RESOLVE',
      value: () => fmt(computed.will),
      purpose: '意志资源的上限。释放需要意志的能力、抵抗精神影响时会消耗当前意志。',
      formula: '决心 + 沉着 + 双传奇 + 意志加值',
      changes: '决心、沉着、传奇属性、资源或装备提供的意志加值变化时。',
      example: '当前意志可以低于上限；休息或使用恢复效果后，再把它补回上限。'
    },
    baseDefense: {
      label: '基础防御', en: 'DEFENSE / BASE',
      value: () => fmt(computed.baseDefense),
      purpose: '防御总值中的基础部分。敌人攻击你时，用防御参与判断是否命中；它不是直接减伤。',
      formula: '属性 A / 属性 B 取低或取高 + 防御加值',
      changes: '在人物卡 → 防御构成里换属性、切换取低 / 取高，或增加防御加值时。',
      example: '基础防御只是防御的一项；总防御还会叠加闪避、洞察、格挡、护甲等来源。'
    },
    initiative: {
      label: '先攻', en: 'INITIATIVE',
      value: () => '+' + fmt(computed.initiative),
      purpose: '战斗开始时的行动顺序。先攻高的人通常先行动。',
      formula: '敏捷 + 沉着 + 传奇沉着 + 先攻加值',
      changes: '敏捷、沉着、传奇属性或先攻加值变化时。',
      example: '先攻不是速度。先攻决定谁先动，速度用于移动和距离。'
    },
    speed: {
      label: '速度', en: 'SPEED',
      value: () => fmt(computed.speed),
      purpose: '移动和部分行动可用的距离 / 能力。速度高不等于一定先行动。',
      formula: '力量 + 敏捷 + 传奇敏捷 × 3 + 体型 + 速度加值',
      changes: '力量、敏捷、体型、传奇敏捷或速度加值变化时。',
      example: '战斗里需要移动时看速度；决定行动顺序则看先攻。'
    },
    sensitive: {
      label: '敏感范围', en: 'PERCEPTION / RANGE',
      value: () => fmt(computed.sensitive) + ' m',
      purpose: '能够清楚感知目标的距离。超出后还有模糊范围，但只能知道大概方向。',
      formula: '感知 × 10 + 传奇感知 × 20',
      changes: '感知、传奇感知或感知范围加值变化时。',
      example: '总览下方会同时显示模糊范围，通常是敏感范围 × 10。'
    }
  };

  function statHelpButton(key) {
    return `<button class="stat-help" data-action="open-stat-guide" data-stat="${key}" title="这个数值是做什么的？" aria-label="数值说明">?</button>`;
  }

  const STAT_KEYS = ['hp', 'will', 'baseDefense', 'initiative', 'speed', 'sensitive'];

  function computeTracked() {
    const next = C.compute(state);
    const deltas = {};
    for (const key of STAT_KEYS) {
      const before = Number(computed[key]) || 0;
      const after = Number(next[key]) || 0;
      if (Math.abs(after - before) > 0.0001) deltas[key] = after - before;
    }
    statDeltas = deltas;
    return next;
  }

  function statDeltaBadge(key) {
    const d = statDeltas[key];
    if (!d) return '';
    return `<span class="stat-delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${fmt(d)}</span>`;
  }

  function statDeltaNote() {
    const keys = Object.keys(statDeltas);
    if (!keys.length) return '';
    const parts = keys.map(key => {
      const d = statDeltas[key];
      const label = STAT_GUIDE[key] ? STAT_GUIDE[key].label : key;
      return `${label} ${d > 0 ? '+' : ''}${fmt(d)}`;
    }).join(' · ');
    return `<div class="stat-delta-note"><span>本次修改后：${parts}</span><button class="stat-delta-help" data-action="open-stat-guide" data-stat="${keys[0]}">看说明</button></div>`;
  }

  function closeStatGuide() {
    const layer = document.getElementById('stat-guide-layer');
    if (layer) layer.remove();
  }

  function openStatGuide(key) {
    const active = STAT_GUIDE[key] ? key : 'hp';
    const item = STAT_GUIDE[active];
    const tabs = Object.entries(STAT_GUIDE).map(([k, v]) =>
      `<button class="stat-guide-tab ${k === active ? 'active' : ''}" data-guide-tab="${k}">${esc(v.label)}</button>`).join('');
    let layer = document.getElementById('stat-guide-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'stat-guide-layer';
      layer.className = 'stat-guide-layer';
      document.body.appendChild(layer);
      layer.addEventListener('click', e => {
        if (e.target === layer || e.target.closest('[data-guide-close]')) {
          closeStatGuide();
          return;
        }
        const tab = e.target.closest('[data-guide-tab]');
        if (tab) openStatGuide(tab.dataset.guideTab);
      });
    }
    layer.innerHTML = `
      <div class="stat-guide-card" role="dialog" aria-modal="true" aria-label="数值说明">
        <button class="stat-guide-close" data-guide-close aria-label="关闭">✕</button>
        <div class="stat-guide-kicker">STAT GUIDE / 数值说明</div>
        <div class="stat-guide-heading"><h2>${esc(item.label)}</h2><span>${esc(item.en)}</span></div>
        <div class="stat-guide-tabs">${tabs}</div>
        <div class="stat-guide-value"><b>${item.value()}</b><span>当前值</span></div>
        <p class="stat-guide-purpose">${esc(item.purpose)}</p>
        <div class="stat-guide-sections">
          <div><h4>怎么算</h4><p>${esc(item.formula)}</p></div>
          <div><h4>什么时候会变</h4><p>${esc(item.changes)}</p></div>
        </div>
        <div class="stat-guide-example"><b>举个例</b><span>${esc(item.example)}</span></div>
        <div class="stat-guide-note">只解释本软件里的用途；具体判定以你使用的规则书为准。</div>
        <div class="stat-guide-actions"><button class="btn" data-action="open-combat-demo">看一轮战斗示例</button><button class="btn gold" data-guide-close>知道了</button></div>
      </div>`;
    requestAnimationFrame(() => layer.classList.add('show'));
  }

  let combatDemoIndex = 0;

  function combatDemoSteps() {
    const maxHp = Math.max(0, Math.round(Number(computed.hp) || 0));
    const maxWill = Math.max(0, Math.round(Number(computed.will) || 0));
    const currentWill = Math.max(0, Math.round(Number(computed.health?.willCurrent ?? maxWill) || 0));
    const attack = (computed.attacks || [])[0] || null;
    const rawDP = attack ? Math.max(0, Math.round(Number(attack.dp) || 0)) : 8;
    const defense = attack ? Math.max(0, Math.round(Number(attack.effectiveDefense) || 0)) : 5;
    const finalDP = attack ? Number(attack.finalDP) || 0 : 3;
    const expected = attack ? Number(attack.expectedDamage) || 0 : 3;
    const damage = Math.max(0, Math.round(expected * 10) / 10);
    const willCost = attack ? Math.max(0, Math.round(Number(attack.willCost) || 0)) : 1;
    const afterHp = Math.max(0, Math.round((maxHp - damage) * 10) / 10);
    const afterWill = Math.max(0, currentWill - willCost);
    const attackLabel = attack ? `「${esc(attack.name || '当前攻击')}」` : '示例攻击';
    const sourceNote = attack
      ? '这一页读取的是你当前的第一个攻击预设。'
      : '你还没有攻击预设，下面用一组示例数字；实际战斗请先新建攻击预设。';
    return [
      {
        kicker: 'STEP 1 / 3',
        title: '先攻决定谁先行动',
        body: `战斗开始时先比较先攻。你的先攻是 <b>${esc(String(computed.initiative >= 0 ? '+' : '') + fmt(computed.initiative))}</b>；示例敌人是 <b>+1</b>。<br>这个例子里你先行动。先攻只决定顺序，不决定你打得多疼。`,
        formula: '先攻 = 敏捷 + 沉着 + 传奇沉着 + 先攻加值'
      },
      {
        kicker: 'STEP 2 / 3',
        title: '攻击看 DP 和对方防御',
        body: `${attackLabel} 的攻击 DP 是 <b>${fmt(rawDP)}</b>，对方防御是 <b>${fmt(defense)}</b>。<br>软件先算 <b>最终 DP = ${fmt(rawDP)} − ${fmt(defense)} = ${fmt(finalDP)}</b>，再按最终 DP 计算期望伤害。<br><span style="color:#7f7668;">${sourceNote}</span>`,
        formula: `最终 DP = 攻击 DP ${fmt(rawDP)} − 对方防御 ${fmt(defense)} = ${fmt(finalDP)}`
      },
      {
        kicker: 'STEP 3 / 3',
        title: '最终 DP 变成伤害，再看资源',
        body: `这个例子的期望伤害是 <b>${fmt(damage)}</b>。满生命是 <b>${maxHp}</b>，扣完是 <b>${afterHp}</b>。<br>${willCost > 0 ? `如果这次攻击消耗 <b>${willCost}</b> 点意志，当前意志从 <b>${currentWill}</b> 变成 <b>${afterWill}</b>。` : '这个攻击不消耗意志；如果消耗能量，则看对应能量池。'}`,
        formula: `生命：${maxHp} − ${fmt(damage)} = ${afterHp}　·　意志：${currentWill} − ${willCost} = ${afterWill}`
      }
    ];
  }

  function closeCombatDemo() {
    const layer = document.getElementById('combat-demo-layer');
    if (layer) layer.remove();
  }

  function renderCombatDemo() {
    const layer = document.getElementById('combat-demo-layer');
    if (!layer) return;
    const steps = combatDemoSteps();
    combatDemoIndex = Math.max(0, Math.min(combatDemoIndex, steps.length - 1));
    const step = steps[combatDemoIndex];
    const dots = steps.map((_, i) => `<span class="combat-demo-dot ${i === combatDemoIndex ? 'active' : ''}"></span>`).join('');
    const last = combatDemoIndex === steps.length - 1;
    layer.innerHTML = `
      <div class="stat-guide-card combat-demo-card" role="dialog" aria-modal="true" aria-label="看懂一轮战斗">
        <button class="stat-guide-close" data-combat-close aria-label="关闭">✕</button>
        <div class="stat-guide-kicker">COMBAT WALKTHROUGH / 看懂一轮战斗</div>
        <div class="combat-demo-dots">${dots}</div>
        <div class="combat-demo-kicker">${esc(step.kicker)}</div>
        <h2>${esc(step.title)}</h2>
        <p class="combat-demo-body">${step.body}</p>
        <div class="combat-demo-formula">${esc(step.formula)}</div>
        <div class="stat-guide-note">示例数值只用来演示顺序，不代表你的实际角色或攻击预设；实际结果以战斗页自动计算为准。</div>
        <div class="combat-demo-actions">
          <button class="btn" data-combat-close>关闭</button>
          <span style="flex:1"></span>
          <button class="btn" data-combat-prev ${combatDemoIndex === 0 ? 'disabled' : ''}>上一步</button>
          <button class="btn gold" data-combat-next>${last ? '完成' : '下一步'}</button>
        </div>
      </div>`;
  }

  function openCombatDemo() {
    closeStatGuide();
    combatDemoIndex = 0;
    let layer = document.getElementById('combat-demo-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'combat-demo-layer';
      layer.className = 'stat-guide-layer';
      document.body.appendChild(layer);
      layer.addEventListener('click', e => {
        if (e.target === layer || e.target.closest('[data-combat-close]')) {
          closeCombatDemo();
          return;
        }
        if (e.target.closest('[data-combat-prev]')) {
          combatDemoIndex--;
          renderCombatDemo();
        } else if (e.target.closest('[data-combat-next]')) {
          const total = combatDemoSteps().length;
          if (combatDemoIndex >= total - 1) closeCombatDemo();
          else { combatDemoIndex++; renderCombatDemo(); }
        }
      });
    }
    renderCombatDemo();
    requestAnimationFrame(() => layer.classList.add('show'));
  }

  const GUIDE_STEPS = [
    {
      title: '欢迎使用无限流角色终端',
      body: '这个软件把<strong>建卡、战斗计算、规则书检索和 ST 管理</strong>放在同一个窗口里。<br>接下来用十几步带你认识主要数值和入口；右上角可以随时跳过，之后再从“帮助”里重新打开。'
    },
    {
      title: '顶部：角色卡切换与主题',
      target: '.character-switcher',
      body: '左上红框是<strong>角色卡切换器</strong>。点开可以新建、复制、切换或删除角色卡，每张卡独立保存。<br>旁边的“明亮 / 暗黑”按钮切换界面主题，右侧的导入 / 导出负责迁移单张角色卡。'
    },
    {
      title: '总览：角色身份与档案',
      view: 'overview', target: '.hero',
      body: '这里汇总角色名、头像、状态和<strong>档案摘要</strong>。<br>点左上角头像可以上传图片；“编辑人物卡”进入详细建卡页。'
    },
    {
      title: '总览：六个核心数值',
      target: '.stat-strip',
      body: '这六张卡是战斗最常用的结果：<strong>生命上限、意志上限、基础防御、先攻、速度、敏感范围</strong>。<br>下方小字是计算来源；改了属性或资源后会自动重算。每张卡右上角的 <strong>?</strong> 可以查看“这个数值做什么、怎么来、什么时候变”。'
    },
    {
      title: '总览：衍生与防御',
      target: '.derived-table',
      body: '衍生与豁免表会自动计算体积、防御、生命、意志、反射、强韧、意志豁免和感知范围。<br>“加值”列可以临时补资源 / 装备提供的额外数值；基础防御可在人物卡里选择用哪两项属性取低 / 取高。'
    },
    {
      title: '人物卡：六个可折叠分区',
      view: 'character', target: '.panel',
      body: '人物卡分成<strong>身份、属性、技能、防御、装备、备注</strong>六个区，默认全部收起。<br>点分区标题或右侧箭头展开；所有描述框都可以拖动调整高度，退出后仍会记住。'
    },
    {
      title: '属性构成：合计、传奇与附加',
      view: 'character', open: 'attributes', target: '[data-section-body="attributes"] .matrix',
      body: '<strong>合计</strong>是属性总点数，<strong>传奇</strong>默认按 TRUNC((合计−1)/5) 计算，<strong>传奇加值</strong>给 PL 手动追加资源 / 装备提供的传奇点，<strong>附加</strong>是额外附加成功。'
    },
    {
      title: '防御构成：基础属性与 DR',
      view: 'character', open: 'defense', target: '.base-defense-config',
      body: '基础防御可以选择<strong>属性 A / 属性 B</strong>，再切换取低 / 取高；选择耐力即可做耐力防御。<br>下方“伤害减免 DR”记录数值与类型 / 弱点，例如 DR 5 / 魔法；DR 不叠加，同一次伤害取能生效的最高值。'
    },
    {
      title: '战斗：攻击预设',
      view: 'combat', target: '#attack-rows',
      body: '每次攻击都可以单独选择属性、技能、武器 / 威力、类型加值、伤害上限和<strong>加骰</strong>。<br>还可以填写攻击次数、动作消耗，以及本次攻击是否附带措手不及 / 接触攻击。黄色是标签，蓝色是自动计算结果。'
    },
    {
      title: '战斗：能量池 / 刻度与 PL 技艺',
      target: '#energy-manage',
      body: '能量池和刻度横向排列，分别填写名称、当前 / 上限、恢复方式和基础使用方式。<br>攻击可以绑定能量池 / 刻度消耗；下方 PL 技艺会显示资源页里填写的主动技艺，方便战斗中快速查看。'
    },
    {
      title: '资源：特性、专长与技艺',
      view: 'resources', tab: 'feats', target: '[data-res-pane="feats"]',
      body: '资源页管理被动特性、主干资源、专长和主动技艺。<br>专长页分为<strong>开卡专长</strong>（等级 / 专长名 / 建卡专长点 / 效果）和普通专长（只记录，不再计算 XP）；效果都是可拖动描述框。'
    },
    {
      title: '规则书：检索、目录与折叠',
      view: 'rules', target: '.rules-search',
      body: '把 CHM 放进程序目录即可自动发现。上方搜索支持<strong>全库 / 本书内</strong>切换；左侧可以折叠书库，只显示当前规则书；目录和正文在下方阅读。<br>阅读栏的星标可以收藏当前页，收藏夹能折叠；页面按钮和目录按钮使用同一套样式。'
    },
    {
      title: 'ST 工具：多调查员状态板',
      view: 'st', target: '.st-toolbar',
      body: 'ST 工具可以一次载入多张本地角色卡，或导入其他调查员的 JSON。<br>可以临时调整生命、意志、伤害 B/L/A 和五项防御；措手不及 / 接触攻击可以选择无或 D/C/B/A/S 等级。所有调整只作用于 ST 面板，不改原卡。'
    },
    {
      title: '存档与开始建卡',
      target: '.titlebar-right',
      body: '软件会自动保存。右上角“导出”备份当前角色卡，“导入”可以把 JSON 加入当前卡；多角色卡则在顶部切换器管理。<br>现在可以从“人物卡”开始填九属性，或先在“资源”里记录开卡专长。'
    },
    {
      title: '引导完成',
      body: '你已经认识主要页面和数值了。以后随时可以从左下角<strong>帮助</strong>重新打开这份引导。<br>建议先完成一张基础角色卡，再逐步补资源、攻击预设和规则书检索。'
    }
  ];
  let guideStepIndex = -1;
  let guideTimer = null;

  function updateGuideCard() {
    const step = GUIDE_STEPS[guideStepIndex];
    if (!step) return;
    $('#guide-kicker').textContent = `新手引导 · ${guideStepIndex + 1} / ${GUIDE_STEPS.length}`;
    $('#guide-title').textContent = step.title;
    $('#guide-body').innerHTML = step.body;
    const prev = $('[data-action="guide-prev"]');
    const next = $('[data-action="guide-next"]');
    if (prev) prev.disabled = guideStepIndex === 0;
    if (next) next.textContent = guideStepIndex === GUIDE_STEPS.length - 1 ? '完成' : '下一步';
  }

  function positionGuide(step) {
    const layer = $('#guide-layer');
    const spot = $('#guide-spotlight');
    const card = $('#guide-card');
    if (!layer || !card) return;
    const target = step && step.target ? document.querySelector(step.target) : null;
    if (!target) {
      spot.hidden = true;
      layer.classList.add('guide-center');
      card.style.left = '50%';
      card.style.top = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      card.style.visibility = 'visible';
      return;
    }
    layer.classList.remove('guide-center');
    const r = target.getBoundingClientRect();
    const pad = 7;
    const vw = window.innerWidth, vh = window.innerHeight;
    spot.hidden = false;
    spot.style.left = Math.max(4, r.left - pad) + 'px';
    spot.style.top = Math.max(4, r.top - pad) + 'px';
    spot.style.width = Math.max(20, r.width + pad * 2) + 'px';
    spot.style.height = Math.max(18, r.height + pad * 2) + 'px';
    card.style.transform = 'none';
    card.style.visibility = 'hidden';
    card.style.left = '0px';
    card.style.top = '0px';
    const cw = card.offsetWidth, ch = card.offsetHeight;
    let left;
    if (r.left > cw + 26) left = r.left - cw - 18;
    else if (r.right + cw + 26 < vw) left = r.right + 18;
    else left = (vw - cw) / 2;
    left = Math.max(16, Math.min(vw - cw - 16, left));
    let top;
    if (r.top > vh * 0.58 || r.height > vh * 0.55) top = r.top - ch - 16;
    else top = r.bottom + 16;
    if (top < 16) top = r.bottom + 16;
    top = Math.max(16, Math.min(vh - ch - 16, top));
    card.style.left = left + 'px';
    card.style.top = top + 'px';
    card.style.visibility = 'visible';
  }

  function showGuideStep() {
    const step = GUIDE_STEPS[guideStepIndex];
    const layer = $('#guide-layer');
    if (!step || !layer) return;
    layer.hidden = false;
    if (step.tab) ui.resourceTab = step.tab;
    if (step.open) ui.collapsedSections.delete(step.open);
    if (step.view && activeView !== step.view) switchView(step.view);
    else if (step.open && activeView === 'character') renderView('character');
    else if (step.tab && activeView === 'resources') renderView('resources');
    updateGuideCard();
    window.clearTimeout(guideTimer);
    const delay = step.view === 'rules' ? 700 : step.view ? 280 : 40;
    guideTimer = window.setTimeout(() => {
      const target = step.target ? document.querySelector(step.target) : null;
      if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      window.setTimeout(() => positionGuide(step), target ? 240 : 20);
    }, delay);
  }

  function startGuide() {
    guideStepIndex = 0;
    const layer = $('#guide-layer');
    if (layer) layer.hidden = false;
    showGuideStep();
  }

  function endGuide() {
    window.clearTimeout(guideTimer);
    guideStepIndex = -1;
    const layer = $('#guide-layer');
    if (layer) layer.hidden = true;
    const spot = $('#guide-spotlight');
    if (spot) spot.hidden = true;
  }

  function nextGuideStep() {
    if (guideStepIndex < 0) return;
    if (guideStepIndex >= GUIDE_STEPS.length - 1) { endGuide(); return; }
    guideStepIndex++;
    showGuideStep();
  }

  function prevGuideStep() {
    if (guideStepIndex <= 0) return;
    guideStepIndex--;
    showGuideStep();
  }

  function showHelp() {
    const layer = $('#modal-layer');
    const card = $('#modal-card');
    card.style.width = '560px';
    card.innerHTML = `
      <div class="modal-title">五分钟上手</div>
      <div class="modal-text" style="line-height:2;">
        <b class="gold">1 · 建卡</b>　在「人物卡」填九属性与技能等级，合计、传奇、DP、伤害上限都会自动计算。<br>
        <b class="gold">2 · 总览</b>　一页查看生命、意志、防御五情形、技能速查与能量池。<br>
        <b class="gold">3 · 战斗</b>　先填「对方防御」，点攻击行右侧铅笔编辑属性、技能和伤害上限，也可以新增自己的攻击预设；每行直接显示最终 DP 与期望伤害。<br>
        <b class="gold">4 · 规则书</b>　点「导入 CHM」选择本机文件；导入后左侧出目录，上方可全文检索，结果点开即读；阅读栏星标可收藏当前页，收藏夹支持折叠。<br>
        <b class="gold">5 · 存档</b>　所有改动自动保存到本机；用右上角「导出 / 导入」迁移角色卡 JSON。<br>
        <span style="color:#6e675c;">快捷键：Ctrl + K 全文检索　·　Ctrl + S 立即保存　·　Esc 关闭弹窗。</span>
      </div>
      <div class="modal-actions"><button class="btn" data-action="open-stat-guide" data-stat="hp">核心数值说明</button><button class="btn" data-action="open-combat-demo">看懂一轮战斗</button><button class="btn" data-guide-start>开始新手引导</button><button class="btn gold" data-modal="ok">知道了</button></div>`;
    layer.hidden = false;
    const close = () => { layer.hidden = true; card.style.width = ''; };
    card.querySelector('[data-modal="ok"]').onclick = close;
    card.querySelector('[data-guide-start]').onclick = () => { close(); startGuide(); };
    layer.onclick = e => { if (e.target === layer) close(); };
    window.__modalClose = close;
  }

  function dirOf(path) {
    return String(path || '').replace(/[\\/][^\\/]+$/, '');
  }

  function showFolderInfo() {
    const current = findBook(ui.rules.pageBook || ui.rules.activeBook);
    const dir = current ? dirOf(current.filePath) : (ui.appDir || '');
    ui.rules.folderPath = dir;
    const books = (ui.rules.books || []).filter(b => dirOf(b.filePath).toLowerCase() === dir.toLowerCase());
    const layer = $('#modal-layer');
    const card = $('#modal-card');
    const androidNative = !!window.AndroidApp;
    card.style.width = '560px';
    card.innerHTML = `
      <div class="modal-title">规则书存储目录</div>
      <div class="modal-text" style="line-height:1.8;">
        ${androidNative ? 'CHM 实际保存位置（应用私有目录）：' : '当前目录：'}<br>
        <code class="folder-path">${esc(dir || '（未知路径）')}</code>
        <div class="folder-note">${androidNative ? '这是 Android 应用内部目录，普通文件管理器和电脑都无法直接打开，不需要手动把 CHM 放进去。请用下方「导入 CHM」选择手机里的文件，程序会自动复制到此处并加入书库。' : '为避免部分系统环境限制外部资源管理器，这里直接在软件内显示目录信息。可复制路径后自行打开。'}</div>
        <div class="folder-list">
          ${books.length ? books.map(b => `<div class="folder-book-row">
            <button class="folder-book" data-action="open-book-modal" data-key="${esc(b.key)}">
              <span class="book-mark">CHM</span>
              <span><b>${esc(b.title)}</b><small>${esc(b.fileName)} · ${esc(bookStatusLabel(b))}</small></span>
            </button>
            <button class="folder-delete" data-action="delete-book" data-key="${esc(b.key)}" data-title="${esc(b.title)}" title="删除此 CHM">${ic('trash')}</button>
          </div>`).join('') : '<div class="toc-empty">当前目录下没有已识别的 CHM 文件。</div>'}
        </div>
      </div>
      <div class="modal-actions">
        ${androidNative ? '' : '<button class="btn" data-action="copy-folder-path">复制路径</button>'}
        <button class="btn" data-action="chm-add-folder">导入 CHM</button>
        <button class="btn gold" data-action="modal-close">关闭</button>
      </div>`;
    layer.hidden = false;
    const close = () => { layer.hidden = true; card.style.width = ''; };
    window.__modalClose = close;
    layer.onclick = e => { if (e.target === layer) close(); };
  }

  function confirmCharacterReset() {
    confirmDialog({
      title: '重置当前角色卡？',
      text: '这会清空当前角色、战斗配置与账本。导出的 JSON 存档不会被删除。<br><br><span style="color:#a96662;">建议先导出备份。</span>',
      okText: '重置角色卡',
      danger: true,
      onConfirm: () => {
        state = D.createDefaultState();
        computed = C.compute(state);
        statDeltas = {};
        saveNow();
        if (activeView === 'rules') switchView('overview');
        else renderView(activeView);
        updateSidebar();
        toast('已重置角色卡');
      }
    });
  }

  function doReset() {
    const layer = $('#modal-layer');
    const card = $('#modal-card');
    card.style.width = '470px';
    card.innerHTML = `
      <div class="modal-title">重置</div>
      <div class="modal-text">可以只重置所有描述框尺寸，也可以清空当前角色卡。<br><br><span style="color:#a96662;">重置角色卡不可撤销，建议先导出备份。</span></div>
      <div class="modal-actions reset-actions">
        <button class="btn" data-modal="cancel">取消</button>
        <button class="btn gold" data-modal="sizes">重置描述框尺寸</button>
        <button class="btn primary" data-modal="character">重置角色卡</button>
      </div>`;
    layer.hidden = false;
    const close = () => { layer.hidden = true; card.style.width = ''; };
    card.querySelector('[data-modal="cancel"]').onclick = close;
    card.querySelector('[data-modal="sizes"]').onclick = () => { close(); resetTextareaSizes(); };
    card.querySelector('[data-modal="character"]').onclick = () => { close(); confirmCharacterReset(); };
    layer.onclick = e => { if (e.target === layer) close(); };
    window.__modalClose = close;
  }

  function handleAction(action, el) {
    switch (action) {
      case 'goto-overview': switchView('overview'); break;
      case 'goto-character': switchView('character'); break;
      case 'goto-identity':
        ui.collapsedSections.delete('identity');
        switchView('character');
        window.setTimeout(() => {
          const body = document.querySelector('[data-section-body="identity"]');
          if (body) body.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 40);
        break;
      case 'goto-combat': switchView('combat'); break;
      case 'goto-resources': switchView('resources'); break;
      case 'goto-ledger': switchView('ledger'); break;
      case 'view-purchases': openPurchaseList(); break;
      case 'goto-rules': switchView('rules'); break;
      case 'st-picker': openSTPicker(); break;
      case 'st-import': stImportJSON(); break;
      case 'st-refresh': stRefresh(); break;
      case 'st-clear': stClear(); break;
      case 'st-remove': {
        stTool.entries = stTool.entries.filter(x => x.id !== el.dataset.id);
        if (stTool.combat.sourceId === el.dataset.id) stTool.combat.sourceId = '';
        saveSTTool();
        stRerenderPreserve();
        break;
      }
      case 'st-jump': {
        const target = document.getElementById(el.dataset.target);
        if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
        break;
      }
      case 'st-note-expand': openSTNotesFloat(); break;
      case 'st-select-target': stSwitchTarget(el.dataset.id); break;
      case 'st-add-target': {
        const target = { id: 'stt_' + uid(), name: '目标 ' + (stTargets().length + 1), sourceId: '', flatfootedGrade: 'none', contactGrade: 'none', values: Object.assign({}, stActiveTarget().values) };
        stTool.combat.targets.push(target);
        stTool.combat.activeTargetId = target.id;
        saveSTTool(); renderView('st');
        break;
      }
      case 'st-remove-target': {
        if (stTargets().length <= 1) { toast('至少保留一个目标'); break; }
        stTool.combat.targets = stTargets().filter(t => t.id !== stTool.combat.activeTargetId);
        stTool.combat.activeTargetId = stTool.combat.targets[0].id;
        saveSTTool(); renderView('st');
        break;
      }
      case 'st-active-target': break;
      case 'st-load-defense': {
        const source = document.querySelector('[data-st-defense-source]');
        stLoadDefense(source ? source.value : '');
        break;
      }
      case 'st-clear-defense': stClearDefense(); break;
      case 'st-add-attack': stAddAttack(); break;
      case 'st-toggle-card': {
        const id = el.dataset.id;
        const card = el.closest('.st-card');
        const collapsed = ui.stCollapsedEntries.has(id);
        if (collapsed) ui.stCollapsedEntries.delete(id); else ui.stCollapsedEntries.add(id);
        if (card) {
          const body = card.querySelector('.st-card-body');
          if (body) body.classList.toggle('collapsed', !collapsed);
          card.classList.toggle('st-card-collapsed', !collapsed);
          el.textContent = !collapsed ? '展开' : '收起';
        }
        break;
      }
      case 'st-toggle-attack': {
        const id = el.dataset.id;
        const collapsed = ui.stCollapsedAttacks.has(id);
        if (collapsed) ui.stCollapsedAttacks.delete(id); else ui.stCollapsedAttacks.add(id);
        const row = document.querySelector(`[data-st-attack-row="${id}"]`);
        const detail = row ? row.nextElementSibling : null;
        if (detail) detail.classList.toggle('st-attack-detail-collapsed', !collapsed);
        el.classList.toggle('collapsed', !collapsed);
        break;
      }
      case 'st-remove-attack': stRemoveAttack(el.dataset.id); break;
      case 'st-hp-delta': stHpDelta(el.dataset.id, Number(el.dataset.delta)); break;
      case 'st-health-mode': stSetHealthMode(el.dataset.id, el.dataset.mode); break;
      case 'toggle-character-menu': toggleCharacterMenu(); break;
      case 'switch-character': switchCharacter(el.dataset.id); break;
      case 'quick-build': openQuickBuild(); break;
      case 'check-character': openCharacterCheck(); break;
      case 'create-character': createCharacter(); break;
      case 'duplicate-character': duplicateCharacter(); break;
      case 'delete-character': deleteCharacter(); break;
      case 'export': doExport(); break;
      case 'import': doImport(); break;
      case 'pick-avatar': {
        const input = $('#avatar-input');
        if (input) input.click();
        break;
      }
      case 'remove-avatar':
        state.meta.avatar = '';
        stateChanged({ rerender: true });
        toast('已移除头像');
        break;
      case 'open-combat-demo':
        if (window.__modalClose) window.__modalClose();
        openCombatDemo();
        break;
      case 'open-stat-guide':
        if (window.__modalClose) window.__modalClose();
        openStatGuide(el.dataset.stat || 'hp');
        break;
      case 'help': showHelp(); break;
      case 'guide-prev': prevGuideStep(); break;
      case 'guide-next': nextGuideStep(); break;
      case 'guide-skip': endGuide(); break;
      case 'reset': doReset(); break;
      case 'health-mode':
        state.healthMode = el.dataset.mode === 'rm' ? 'rm' : 'fusion';
        stateChanged({ rerender: true });
        break;
      case 'defense-syntax-help': showDefenseSyntaxHelp(); break;
      case 'toggle-base-defense':
        state.defense.baseMode = state.defense.baseMode === 'high' ? 'low' : 'high';
        stateChanged({ rerender: true });
        toast(state.defense.baseMode === 'high' ? '基础防御已改为取高' : '基础防御已改为取低');
        break;
      case 'refill-will':
        state.defense.willCurrent = computed.will;
        stateChanged({ rerender: true });
        toast('意志已回满');
        break;
      case 'add-custom-skill': addCustomSkill(); break;
      case 'remove-custom-skill': {
        const i = Number(el.dataset.index);
        state.customSkills.splice(i, 1);
        stateChanged({ rerender: true });
        break;
      }
      case 'apply-my-defense':
        D.DEFENSE_ITEMS.forEach(d => { state.targetDefense.values[d.key] = computed.defense.byKey[d.key] || 0; });
        stateChanged({ rerender: true });
        toast('已套用本方防御构成');
        break;
      case 'toggle-flatfooted':
        state.targetDefense.flatfooted = !state.targetDefense.flatfooted;
        stateChanged({ rerender: true });
        break;
      case 'toggle-contact':
        state.targetDefense.contact = !state.targetDefense.contact;
        stateChanged({ rerender: true });
        break;
      case 'settle-attack': settleAttack(Number(el.dataset.index)); break;
      case 'add-attack': openAttackEditor(-1); break;
      case 'edit-attack': openAttackEditor(Number(el.dataset.index)); break;
      case 'copy-attack': copyAttack(Number(el.dataset.index)); break;
      case 'remove-attack': {
        const i = Number(el.dataset.index);
        const target = state.attacks[i];
        if (!target) break;
        confirmDialog({
          title: '删除攻击预设？',
          text: `将删除「${esc(target.name || '未命名攻击')}」。`,
          danger: true,
          okText: '删除',
          onConfirm: () => {
            state.attacks.splice(i, 1);
            stateChanged({ rerender: true });
            toast('已删除攻击预设');
          }
        });
        break;
      }
      case 'add-dr':
        state.damageReductions.push({ id: uid(), source: '', value: 0, type: '/-', detail: '', note: '' });
        stateChanged({ rerender: true });
        break;
      case 'remove-dr':
        state.damageReductions.splice(Number(el.dataset.index), 1);
        stateChanged({ rerender: true });
        break;
      case 'go-techniques':
      case 'goto-techniques':
        ui.resourceTab = 'techniques';
        switchView('resources');
        break;
      case 'add-technique':
        state.techniques.push({ action: '标准动作', name: '', text: '' });
        stateChanged({ rerender: true });
        break;
      case 'remove-technique':
        state.techniques.splice(Number(el.dataset.index), 1);
        stateChanged({ rerender: true });
        break;
      case 'add-energy-pool': addEnergyPool('energy'); break;
      case 'add-gauge': addEnergyPool('gauge'); break;
      case 'remove-energy-pool': {
        const i = Number(el.dataset.index);
        const removed = state.energyPools[i];
        if (removed) state.attacks.forEach(a => { if (a.energyPool === removed.name) a.energyPool = ''; });
        state.energyPools.splice(i, 1);
        stateChanged({ rerender: true });
        break;
      }
      case 'add-trait':
        state.traits.push({ name: '', source: '', effect: '' });
        stateChanged({ rerender: true });
        break;
      case 'remove-trait':
        state.traits.splice(Number(el.dataset.index), 1);
        stateChanged({ rerender: true });
        break;
      case 'add-resource':
        state.resources.push({ type: '血统', name: '', level: 0, points: 0, effect: '' });
        stateChanged({ rerender: true });
        break;
      case 'remove-resource':
        state.resources.splice(Number(el.dataset.index), 1);
        stateChanged({ rerender: true });
        break;
      case 'add-feat':
        state.feats.push({ level: 0, name: '', prereq: '', effect: '' });
        stateChanged({ rerender: true });
        break;
      case 'remove-feat':
        state.feats.splice(Number(el.dataset.index), 1);
        stateChanged({ rerender: true });
        break;
      case 'add-starting-feat':
        state.startingFeats.push({ level: 0, name: '', points: 0, effect: '' });
        stateChanged({ rerender: true });
        break;
      case 'remove-starting-feat':
        state.startingFeats.splice(Number(el.dataset.index), 1);
        stateChanged({ rerender: true });
        break;
      case 'add-income':
        state.incomes.push({ name: '', level: 0, points: 0, xp: 0, note: '' });
        stateChanged({ rerender: true });
        break;
      case 'remove-income':
        state.incomes.splice(Number(el.dataset.index), 1);
        stateChanged({ rerender: true });
        break;
      case 'add-purchase':
        state.purchases.push({ name: '', level: 0, points: 0, xp: 0, desc: '' });
        stateChanged({ rerender: true });
        break;
      case 'remove-purchase':
        state.purchases.splice(Number(el.dataset.index), 1);
        stateChanged({ rerender: true });
        break;
      case 'toggle-rules-library': toggleRulesLibrary(); break;
      case 'chm-refresh': post({ type: 'chm.refresh' }); toast('正在重新扫描规则书…'); break;
      case 'chm-add-folder':
        if (window.__modalClose) window.__modalClose();
        post({ type: 'chm.addFolder' });
        break;
      case 'toggle-section': toggleSection(el.dataset.section); break;
      case 'toggle-ledger': toggleLedgerSection(el.dataset.ledgerToggle); break;
      case 'toggle-theme':
        applyTheme(currentTheme() === 'light' ? 'dark' : 'light', true);
        break;
      case 'toggle-display-panel': toggleDisplayPanel(); break;
      case 'toggle-zoom-panel': toggleZoomPanel(); break;
      case 'close-zoom-panel': closeZoomPanel(); break;
      case 'reset-ui-zoom': resetUiZoom(); break;
      case 'close-display-panel': closeDisplayPanel(); break;
      case 'reset-display': resetDisplaySettings(); break;
      case 'changelog-open': openChangelog(); break;
      case 'changelog-close': closeChangelog(); break;
      case 'about-open': openAbout(); break;
      case 'about-close': closeAbout(); break;
      case 'chm-folder-info': showFolderInfo(); break;
      case 'toggle-rules-drawer':
        if (window.__toggleRulesDrawer) window.__toggleRulesDrawer();
        break;
      case 'toc-expand-all': expandAllToc(); break;
      case 'toc-collapse-all': collapseAllToc(); break;
      case 'copy-folder-path':
        post({ type: 'clipboard.copy', text: ui.rules.folderPath || ui.appDir });
        if (window.__modalClose) window.__modalClose();
        break;
      case 'modal-close':
        if (window.__modalClose) window.__modalClose();
        break;
      case 'delete-book': {
        const key = el.dataset.key;
        const title = el.dataset.title || '这本规则书';
        if (window.__modalClose) window.__modalClose();
        confirmDialog({
          title: '删除规则书？',
          text: `将删除「${esc(title)}」的 CHM 文件。删除后需要重新导入才能恢复。`,
          danger: true,
          okText: '删除 CHM',
          onConfirm: () => post({ type: 'chm.delete', bookKey: key })
        });
        break;
      }
      case 'open-book-modal':
        if (window.__modalClose) window.__modalClose();
        switchView('rules');
        selectBook(el.dataset.key);
        break;
      case 'focus-search': {
        const input = $('#chm-search');
        if (input) { input.focus(); input.select(); }
        break;
      }
      case 'toggle-search-snippet':
        ui.rules.showSnippet = ui.rules.showSnippet === false;
        renderTocPanel();
        break;
      case 'set-search-scope':
        ui.rules.searchScope = el.dataset.scope === 'book' ? 'book' : 'all';
        if (ui.rules.searchActive && ui.rules.searchQuery.trim()) startSearch(ui.rules.searchQuery);
        else renderTocPanel();
        break;
      case 'chm-clear-search':
        ui.rules.searchQuery = '';
        ui.rules.searchActive = false;
        ui.rules.currentSearch = '';
        ui.rules.searching = false;
        ui.rules.results = [];
        ui.rules.total = 0;
        refreshSearchInput();
        const clearBtn = $('.rules-search .search-clear');
        if (clearBtn) clearBtn.style.display = 'none';
        renderTocPanel();
        break;
      case 'chm-retry-search':
        startSearch(ui.rules.searchQuery);
        break;
      case 'reader-refresh':
        renderReaderPane();
        break;
      case 'reader-source':
        showFolderInfo();
        break;
      case 'reader-close':
        ui.rules.pagePath = '';
        ui.rules.pageTitle = '';
        renderReaderPane();
        setTocCurrent();
        break;
      case 'reader-favorite': toggleCurrentFavorite(); break;
      case 'toggle-favorites': toggleFavoritesPanel(); break;
      case 'open-favorite': openFavorite(el.dataset.favoriteId); break;
      case 'remove-favorite': removeFavorite(el.dataset.favoriteId); break;
    }
  }

  /* ============================================================
     BRIDGE EVENTS
     ============================================================ */
  function handleBridgeMessage(ev) {
    const msg = ev.data;
    if (!msg || typeof msg !== 'object' || !msg.type) return;
    if (msg.requestId && pending.has(msg.requestId)) {
      const p = pending.get(msg.requestId);
      pending.delete(msg.requestId);
      p.resolve(msg);
    }
    switch (msg.type) {
      case 'init':
        ui.ready = true;
        ui.appDir = msg.appDir || '';
        ui.dataRoot = msg.dataRoot || '';
        ui.extraFolders = msg.extraFolders || [];
        ui.rules.books = Array.isArray(msg.books) ? msg.books : [];
        updateChmSidebar();
        if (ui.rulesMounted) updateLibraryUI();
        break;
      case 'chmLibrary':
        ui.rules.books = Array.isArray(msg.books) ? msg.books : [];
        ui.extraFolders = msg.extraFolders || ui.extraFolders;
        updateChmSidebar();
        if (ui.rulesMounted) updateLibraryUI();
        break;
      case 'chmSearch':
        if (msg.requestId !== ui.rules.currentSearch) return;
        ui.rules.searching = false;
        ui.rules.error = (msg.response && msg.response.error) || '';
        ui.rules.results = (msg.response && Array.isArray(msg.response.results)) ? msg.response.results : [];
        ui.rules.total = (msg.response && msg.response.total) || ui.rules.results.length;
        ui.rules.elapsed = (msg.response && msg.response.elapsedMs) || 0;
        renderTocPanel();
        break;
      case 'chmSearchError':
        if (msg.requestId !== ui.rules.currentSearch) return;
        ui.rules.searching = false;
        ui.rules.error = msg.message || '检索失败';
        renderTocPanel();
        break;
      case 'chmNavigated':
        handleChmNavigated(msg);
        break;
      case 'chmNewWindow':
        if (msg.url) openFromChmUrl(msg.url);
        break;
      case 'clipboardCopied':
        toast('目录路径已复制', 'success');
        break;
      case 'exportDone':
        if (msg.ok) toast(msg.message || '角色卡已导出', 'success');
        else if (msg.message) toast('导出失败：' + msg.message, 'error');
        break;
      case 'toast':
        toast(msg.message || '');
        break;
      case 'windowState':
        $('#max-icon').textContent = msg.maximized ? '❐' : '□';
        break;
      case 'uiError':
        break;
    }
  }

  /* ============================================================
     EVENTS / INIT
     ============================================================ */
  function bindGlobalEvents() {
    document.addEventListener('click', e => {
      if (!e.target.closest('.character-switcher')) closeCharacterMenu();
      if (!e.target.closest('.display-control')) { closeDisplayPanel(); closeZoomPanel(); }
      const nav = e.target.closest('[data-nav]');
      if (nav) { switchView(nav.dataset.nav); return; }
      const win = e.target.closest('[data-window]');
      if (win) { post({ type: 'window', action: win.dataset.window }); return; }
      const tab = e.target.closest('[data-res-tab]');
      if (tab) { ui.resourceTab = tab.dataset.resTab; renderView('resources'); return; }
      const filter = e.target.closest('[data-skill-filter]');
      if (filter) { ui.skillFilter = filter.dataset.skillFilter; applySkillFilter(); return; }
      const book = e.target.closest('[data-book]');
      if (book) { selectBook(book.dataset.book); return; }
      const toggle = e.target.closest('[data-toc-toggle]');
      if (toggle) {
        if (!toggle.classList.contains('leaf')) toggleToc(toggle.dataset.tocToggle);
        return;
      }
      const toc = e.target.closest('[data-toc-path]');
      if (toc) {
        const path = toc.dataset.tocPath;
        const title = toc.dataset.tocTitle;
        const nodeId = toc.dataset.tocNode;
        if (path) openPage(path, title, ui.rules.activeBook);
        else if (nodeId) {
          const node = ui.rules.nodeMap[nodeId];
          if (node && node._children && node._children.length) toggleToc(nodeId);
        }
        return;
      }
      const result = e.target.closest('[data-result-index]');
      if (result) {
        const h = ui.rules.results[Number(result.dataset.resultIndex)];
        if (h) openPage(h.path, h.title, h.bookKey);
        return;
      }
      const action = e.target.closest('[data-action]');
      if (action) { handleAction(action.dataset.action, action); return; }
      const sectionHead = e.target.closest('[data-section-head]');
      if (sectionHead) toggleSection(sectionHead.dataset.sectionHead);
    });

    document.addEventListener('input', e => {
      if (e.target && e.target.id === 'st-notes') { stTool.notes = e.target.value; saveSTTool(); return; }
    });
    document.addEventListener('dblclick', e => {
      if (e.target && e.target.id === 'st-notes') openSTNotesFloat();
    });

    document.addEventListener('change', e => {
      if (e.target && e.target.matches('[data-book-ignore]')) {
        post({ type: 'chm.setIgnored', bookKey: e.target.dataset.bookIgnore, ignored: e.target.checked });
        if (window.__modalClose) window.__modalClose();
        return;
      }
      if (e.target && e.target.id === 'ui-zoom-range') { setUiZoom(e.target.value, true); return; }
      if (e.target && e.target.id === 'font-zoom-range') { setFontZoom(e.target.value, true); return; }
    });

    document.addEventListener('input', e => {
      const el = e.target;
      if (el.id === 'skill-search') {
        ui.skillQuery = el.value;
        applySkillFilter();
        return;
      }
      if (el.id === 'ui-zoom-range') { setUiZoom(el.value, false); return; }
      if (el.id === 'font-zoom-range') { setFontZoom(el.value, false); return; }
      if (el.id === 'reader-zoom-range') { setReaderZoom(el.value); return; }
      if (el.id.indexOf('display-') === 0 && el.type === 'range') {
        const key = el.id.replace('display-', '');
        if (['brightness', 'contrast', 'grayscale'].includes(key)) {
          displaySettings[currentTheme()][key] = Number(el.value);
          saveDisplaySettings();
          applyDisplayFilter();
          const out = $('#display-' + key + '-value');
          if (out) out.textContent = el.value + '%';
        }
        return;
      }
      if (el.id === 'chm-search') {
        ui.rules.searchQuery = el.value;
        ui.rules.searchActive = !!el.value.trim();
        window.clearTimeout(ui.rules.searchTimer);
        const clear = $('.rules-search .search-clear');
        if (clear) clear.style.display = el.value.trim() ? 'flex' : 'none';
        if (!el.value.trim()) {
          startSearch('');
          return;
        }
        ui.rules.searchTimer = window.setTimeout(() => startSearch(el.value), 420);
        return;
      }
      if (el.matches('[data-st-active-target]')) {
        stTool.combat.activeTargetId = el.value;
        stSyncTargetDefenseUI();
        saveSTTool();
        return;
      }
      if (el.matches('[data-st-target-grade]')) {
        stActiveTarget()[el.dataset.stTargetGrade] = el.value;
        saveSTTool();
        return;
      }
      if (el.matches('[data-st-target-name]')) {
        stActiveTarget().name = el.value;
        saveSTTool();
        stUpdateTargetNames();
        return;
      }
      if (el.matches('[data-st-target]')) {
        const active = stActiveTarget();
        active.values[el.dataset.stTarget] = C.num(el.value);
        stTool.combat.values[el.dataset.stTarget] = C.num(el.value);
        saveSTTool();
        refreshSTCombatOutputs();
        return;
      }
      if (el.matches('[data-st-attack]')) {
        stUpdateAttack(el.dataset.stAttack, el.dataset.stField, el.value);
        return;
      }
      if (!el.matches('[data-bind]')) return;
      const bind = el.dataset.bind;
      let val;
      if (el.type === 'number') val = el.value === '' ? 0 : Number(el.value);
      else val = el.value;
      if (!Number.isFinite(val) && el.type === 'number') val = 0;
      setPath(state, bind, val);
      if (el.closest('[data-skill-row]') && bind.endsWith('.name')) {
        const row = el.closest('[data-skill-row]');
        row.dataset.search = [el.value || '', row.dataset.group || '', row.dataset.note || ''].join(' ');
      }
      if (el.closest('[data-skill-row]') && bind.endsWith('.level')) {
        const row = el.closest('[data-skill-row]');
        row.dataset.level = String(Math.max(0, Number(val) || 0));
        if (ui.skillFilter === 'learned') applySkillFilter();
      }
      if (bind.startsWith('defense.labels.')) {
        computed = C.compute(state);
        refreshDefenseOutputs();
        scheduleSave();
        updateSidebar();
        return;
      }
      if (bind === 'defense.baseA' || bind === 'defense.baseB') {
        stateChanged({ rerender: true });
      } else if (bind === 'targetDefense.flatfootedGrade' || bind === 'targetDefense.contactGrade') {
        state.targetDefense.flatfooted = state.targetDefense.flatfootedGrade !== 'none';
        state.targetDefense.contact = state.targetDefense.contactGrade !== 'none';
        stateChanged({ rerender: true });
      } else if (el.type === 'number' || el.tagName === 'SELECT') {
        stateChanged();
      } else {
        scheduleSave();
        updateSidebar();
      }
    });

    const repositionGuide = () => {
      if (guideStepIndex < 0) return;
      const step = GUIDE_STEPS[guideStepIndex];
      if (step) positionGuide(step);
    };
    window.addEventListener('resize', repositionGuide);
    const guideMain = $('#main');
    if (guideMain) guideMain.addEventListener('scroll', repositionGuide, { passive: true });

    document.addEventListener('mouseup', e => {
      const hit = e.target && e.target.closest ? e.target.closest('textarea') : null;
      const ta = hit && hit.dataset.resizeKey ? hit
        : (document.activeElement && document.activeElement.matches && document.activeElement.matches('textarea[data-resize-key]') ? document.activeElement : null);
      if (ta) window.setTimeout(() => saveTextareaSize(ta), 0);
    });

    document.addEventListener('dblclick', e => {
      const aeNote = e.target && e.target.closest ? e.target.closest('#ae-note') : null;
      if (aeNote) {
        e.preventDefault();
        openAttackNoteEditor(aeNote);
        return;
      }
      const desc = e.target && e.target.closest ? e.target.closest('[data-ledger-desc]') : null;
      if (desc) {
        e.preventDefault();
        openLedgerDesc(Number(desc.dataset.ledgerDesc));
        return;
      }
      const note = e.target && e.target.closest ? e.target.closest('[data-ledger-note]') : null;
      if (note) {
        e.preventDefault();
        openLedgerNote(Number(note.dataset.ledgerNote));
        return;
      }
      const effect = e.target && e.target.closest
        ? e.target.closest('[data-trait-effect], [data-resource-effect], [data-technique-effect], [data-vehicle-effect], [data-feat-effect], [data-starting-feat-effect]')
        : null;
      if (effect) {
        e.preventDefault();
        const map = [
          ['data-starting-feat-effect', 'starting'],
          ['data-feat-effect', 'feat'],
          ['data-trait-effect', 'trait'],
          ['data-resource-effect', 'resource'],
          ['data-technique-effect', 'technique'],
          ['data-vehicle-effect', 'vehicle']
        ];
        const found = map.find(([attr]) => effect.hasAttribute(attr));
        if (found) {
          const kind = found[1];
          const raw = kind === 'starting' ? effect.dataset.startingFeatEffect
            : kind === 'feat' ? effect.dataset.featEffect
              : kind === 'trait' ? effect.dataset.traitEffect
                : kind === 'resource' ? effect.dataset.resourceEffect
                  : kind === 'technique' ? effect.dataset.techniqueEffect
                    : '0';
          openFeatEffect(kind, Number(raw));
        }
      }
    });

    document.addEventListener('dragstart', e => {
      const handle = e.target && e.target.closest ? e.target.closest('[data-ledger-drag]') : null;
      if (!handle) return;
      ledgerDrag = { type: handle.dataset.ledgerDrag, index: Number(handle.dataset.index) };
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ledgerDrag.type + ':' + ledgerDrag.index);
      }
      const row = handle.closest('[data-ledger-row]');
      if (row) row.classList.add('dragging');
    });

    document.addEventListener('dragover', e => {
      if (!ledgerDrag) return;
      const row = e.target && e.target.closest ? e.target.closest('[data-ledger-row]') : null;
      if (!row || row.dataset.ledgerRow !== ledgerDrag.type) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('[data-ledger-row].drag-over').forEach(x => x.classList.remove('drag-over'));
      row.classList.add('drag-over');
    });

    document.addEventListener('drop', e => {
      if (!ledgerDrag) return;
      const row = e.target && e.target.closest ? e.target.closest('[data-ledger-row]') : null;
      if (!row || row.dataset.ledgerRow !== ledgerDrag.type) return;
      e.preventDefault();
      const to = Number(row.dataset.index);
      const from = ledgerDrag.index;
      const type = ledgerDrag.type;
      ledgerDrag = null;
      document.querySelectorAll('[data-ledger-row].dragging, [data-ledger-row].drag-over').forEach(x => x.classList.remove('dragging', 'drag-over'));
      moveLedgerItem(type, from, to);
    });

    document.addEventListener('dragend', () => {
      ledgerDrag = null;
      document.querySelectorAll('[data-ledger-row].dragging, [data-ledger-row].drag-over').forEach(x => x.classList.remove('dragging', 'drag-over'));
    });
    document.addEventListener('change', e => {
      if (e.target && e.target.matches('[data-st-defense-source]')) {
        stLoadDefense(e.target.value);
        return;
      }
      if (e.target && e.target.matches('[data-st-hp]')) {
        stSetHp(e.target.dataset.stHp, e.target.value);
        return;
      }
      if (e.target && e.target.matches('[data-st-will]')) {
        stSetWill(e.target.dataset.stWill, e.target.value);
        return;
      }
      if (e.target && e.target.matches('[data-st-dmg]')) {
        stSetDamage(e.target.dataset.stDmg, e.target.dataset.dmgKey, e.target.value);
        return;
      }
      if (e.target && e.target.matches('[data-st-def]')) {
        stSetDefense(e.target.dataset.stDef, e.target.dataset.defKey, e.target.value);
        return;
      }
      if (e.target && e.target.matches('[data-st-effect]')) {
        stSetEffectGrade(e.target.dataset.stEffect, e.target.dataset.effectKey, e.target.value);
        return;
      }
      if (e.target && e.target.matches('[data-st-import-attack]')) {
        stImportAttackCheck(e.target.dataset.stImportAttack, e.target.value);
        e.target.value = '';
        return;
      }
      if (e.target && e.target.id === 'avatar-input') {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        handleAvatarFile(file);
      }
    });

    document.addEventListener('keydown', e => {
      if (guideStepIndex >= 0) {
        if (e.key === 'Escape') { e.preventDefault(); endGuide(); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); nextGuideStep(); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); prevGuideStep(); return; }
      }
      if (e.key === 'Escape') {
        const displayPanel = $('#display-panel');
        if (displayPanel && !displayPanel.hidden) { displayPanel.hidden = true; return; }
        const charMenu = $('#character-menu');
        if (charMenu && !charMenu.hidden) { charMenu.hidden = true; return; }
        const changelog = $('#changelog-layer');
        if (changelog && !changelog.hidden) {
          closeChangelog();
          return;
        }
        const about = $('#about-layer');
        if (about && !about.hidden) {
          closeAbout();
          return;
        }
        if (!$('#modal-layer').hidden) {
          if (window.__modalClose) window.__modalClose();
          return;
        }
        if (document.activeElement && document.activeElement.id === 'chm-search') {
          document.activeElement.blur();
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (activeView !== 'rules') switchView('rules');
        window.setTimeout(() => { const input = $('#chm-search'); if (input) { input.focus(); input.select(); } }, 30);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveNow();
        toast('已保存到本地');
      }
      if (e.target && e.target.id === 'chm-search' && e.key === 'Enter') {
        e.preventDefault();
        window.clearTimeout(ui.rules.searchTimer);
        startSearch(e.target.value);
      }
    });

    const titlebar = $('#titlebar');
    titlebar.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (e.target.closest('button, input, select, .display-control, .character-switcher')) return;
      post({ type: 'window', action: 'drag' });
    });
    titlebar.addEventListener('dblclick', e => {
      if (e.target.closest('button, input, select, .display-control, .character-switcher')) return;
      post({ type: 'window', action: 'maximize' });
    });

    const aboutLayer = $('#about-layer');
    if (aboutLayer) {
      aboutLayer.addEventListener('click', e => {
        if (e.target === aboutLayer) closeAbout();
      });
    }
    const changelogLayer = $('#changelog-layer');
    if (changelogLayer) {
      changelogLayer.addEventListener('click', e => {
        if (e.target === changelogLayer) closeChangelog();
      });
    }

    window.addEventListener('error', ev => {
      try {
        post({ type: 'ui.error', message: (ev.message || '') + ' @ ' + (ev.filename || '') + ':' + (ev.lineno || '') });
      } catch (e) { }
    });
  }

  function injectIcons() {
    $$('[data-icon]').forEach(el => { el.innerHTML = ic(el.dataset.icon); });
  }

  const FONT_BUMP = 1.5;
  let fontBumpTimer = null;
  const fontBumpQueue = new Set();

  function hasDirectText(el) {
    return Array.from(el.childNodes).some(n => n.nodeType === 3 && n.nodeValue && n.nodeValue.trim().length);
  }

  function bumpFontBranch(root) {
    if (!root || root.nodeType !== 1) return;
    const all = [root, ...root.querySelectorAll('*')];
    const batch = [];
    for (const el of all) {
      if (!el.isConnected) continue;
      if (el.closest('[data-font-bumped]')) continue;
      if (el.matches('script, style, noscript, svg, path, defs, use')) continue;
      if (!hasDirectText(el) && !el.matches('input, textarea, select')) continue;
      const base = Number(el.dataset.fontBase) || parseFloat(getComputedStyle(el).fontSize);
      if (base > 0) batch.push({ el, size: base });
    }
    batch.forEach(({ el, size }) => {
      el.dataset.fontBumped = '1';
      el.dataset.fontBase = String(size);
      el.style.fontSize = (Math.round((size + FONT_BUMP) * fontZoom) / 100 * 10 / 10) + 'px';
    });
  }

  function scheduleFontBump(node) {
    if (!node) return;
    fontBumpQueue.add(node);
    window.clearTimeout(fontBumpTimer);
    fontBumpTimer = window.setTimeout(() => {
      const roots = [...fontBumpQueue];
      fontBumpQueue.clear();
      roots.forEach(root => {
        if (root && root.isConnected) bumpFontBranch(root.nodeType === 3 ? root.parentElement : root);
      });
    }, 50);
  }

  function initFontBump() {
    bumpFontBranch(document.body);
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === 'characterData') {
          if (m.target.nodeValue && m.target.nodeValue.trim()) scheduleFontBump(m.target.parentElement);
          continue;
        }
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) scheduleFontBump(n);
          else if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()) scheduleFontBump(m.target);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function init() {
    injectIcons();
    applyTheme(currentTheme(), false);
    bindGlobalEvents();
    switchView('overview');
    updateChmSidebar();
    setSaveState(false);
    initFontBump();
    applyFontZoom();
    applyUiZoom(HAS_UI_ZOOM);
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.addEventListener('message', handleBridgeMessage);
    }
    window.__INF = {
      get state() { return state; },
      get computed() { return computed; },
      get ui() { return ui; },
      get activeView() { return activeView; },
      switchView, renderView
    };
    post({ type: 'ready' });
  }



  document.addEventListener('DOMContentLoaded', init);
})();
