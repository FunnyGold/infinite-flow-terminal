(function (root) {
  'use strict';
  const D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.APP_DATA;
  const num = v => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const trunc = n => (n < 0 ? Math.ceil(n) : Math.floor(n));
  const round1 = n => Math.round(n * 10) / 10;

  function successBonus(level) {
    level = num(level);
    if (level >= 15) return 5;
    if (level >= 13) return 4;
    if (level >= 11) return 3;
    if (level >= 10) return 2;
    if (level >= 5) return 1;
    return 0;
  }

  function attrOf(state, key) {
    const a = (state.attributes && state.attributes[key]) || {};
    const total = num(a.base) + num(a.internal) + num(a.enhance) + num(a.energy) +
      num(a.instrument) + num(a.perfect) + num(a.practice) + num(a.other);
    const legendAuto = trunc((total - 1) / 5);
    const legendBonus = num(a.legendBonus);
    const legend = legendAuto + legendBonus;
    const extra = num(a.extra);
    return {
      key, total, legendAuto, legendBonus, legend, extra,
      success: legend + extra,
      base: num(a.base), internal: num(a.internal), enhance: num(a.enhance),
      energy: num(a.energy), instrument: num(a.instrument), perfect: num(a.perfect),
      practice: num(a.practice), other: num(a.other)
    };
  }

  function skillCalc(state, id, def, storedOverride) {
    const stored = storedOverride || (state.skills && state.skills[id]) || {};
    const attrKey = stored.attr || stored.attrOverride || (def && def.attr) || 'int';
    const attr = attrKey === 'none' ? { total: 0, legend: 0, success: 0 } : attrOf(state, attrKey);
    const level = num(stored.level);
    const bonus = num(stored.bonus);
    const temp = num(stored.temp);
    const total = level + bonus + temp;
    const specialty = num(stored.specialty);
    const otherDP = num(stored.otherDP);
    const otherSuccess = num(stored.otherSuccess);
    return {
      id,
      name: (def && def.name) || stored.name || id,
      group: (def && def.group) || stored.group || '其他',
      note: (def && def.note) || '',
      attrKey,
      attrName: attrKey === 'none' ? '无' : ((D.ATTR_MAP[attrKey] && D.ATTR_MAP[attrKey].name) || attrKey),
      attrTotal: attr.total,
      level, bonus, temp, total, specialty, otherDP, otherSuccess,
      dp: attr.total + total + otherDP,
      success: successBonus(level) + otherSuccess,
      over: level > 15
    };
  }

  function baseDefenseInfo(state, attrs) {
    const baseA = (state.defense && state.defense.baseA) || 'agi';
    const baseB = (state.defense && state.defense.baseB) || 'per';
    const a = attrs[baseA] || attrs.agi;
    const b = attrs[baseB] || attrs.per;
    const mode = state.defense && state.defense.baseMode === 'high' ? 'high' : 'low';
    const value = mode === 'high' ? Math.max(a.total, b.total) : Math.min(a.total, b.total);
    return { baseA, baseB, mode, value };
  }

  function defenseCalc(state) {
    const attrs = {};
    D.ATTRS.forEach(a => { attrs[a.key] = attrOf(state, a.key); });
    const manual = (state.defense && state.defense.manual) || {};
    const labels = (state.defense && state.defense.labels) || {};
    const sourceValue = text => {
      let total = 0;
      const rx = /[（(]\s*([+-]?\d+(?:\.\d+)?)\s*[）)]/g;
      let m;
      while ((m = rx.exec(String(text || '')))) total += num(m[1]);
      return total;
    };
    const db = state.derivedBonus || {};
    const baseInfo = baseDefenseInfo(state, attrs);
    const baseMode = baseInfo.mode;
    const items = D.DEFENSE_ITEMS.map(item => {
      let auto = 0;
      if (item.key === 'base') auto = baseInfo.value + num(db.baseDefense);
      else if (item.key === 'dodge') auto = attrs.agi.legend;
      else if (item.key === 'insight') auto = attrs.per.legend;
      const m = num(manual[item.key]);
      const source = item.key === 'base' ? 0 : sourceValue(labels[item.key]);
      return Object.assign({}, item, { auto, manual: m, source, total: auto + m + source });
    });
    const byKey = Object.fromEntries(items.map(i => [i.key, i.total]));
    const sum = items.filter(i => !i.counter).reduce((s, i) => s + i.total, 0);
    return {
      items, byKey, sum, baseMode, baseA: baseInfo.baseA, baseB: baseInfo.baseB,
      scenarios: [
        { key: 'normal', name: '平时', value: sum - byKey.parry, note: '不含格挡（格挡是主动动作）' },
        { key: 'parry', name: '格挡', value: sum, note: '先填「格挡」行' },
        { key: 'allOut', name: '全力防御', value: sum - byKey.parry + byKey.base, note: '基础防御 ×2' },
        { key: 'flatfooted', name: '措手不及', value: sum - byKey.base - byKey.dodge - byKey.insight - byKey.parry, note: '失去基础 / 闪避 / 洞察 / 格挡' },
        { key: 'contact', name: '接触攻击', value: sum - byKey.parry - byKey.natural - byKey.armor - byKey.shield, note: '无视天生 / 盔甲 / 盾牌' }
      ]
    };
  }

  function effectiveDefense(values, attack, flags) {
    const v = {};
    D.DEFENSE_ITEMS.forEach(d => { v[d.key] = num(values[d.key]); });
    const spent = {};
    const apply = (amount, order) => {
      amount = Math.max(0, num(amount));
      for (const key of order) {
        if (amount <= 0) break;
        const take = Math.min(amount, Math.max(0, v[key]));
        if (take > 0) {
          v[key] -= take;
          amount -= take;
          spent[key] = (spent[key] || 0) + take;
        }
      }
      return amount;
    };

    const flat = !!(flags && flags.flatfooted);
    const contact = !!(flags && flags.contact);
    const highSpeed = Math.max(0, num(attack.highSpeed) - Math.max(0, v.antiHighSpeed));
    const armorPierce = Math.max(0, num(attack.armorPierce) - Math.max(0, v.antiArmorPierce));
    const magicPierce = Math.max(0, num(attack.magicPierce) - Math.max(0, v.antiMagicPierce));
    if (flat) {
      ['base', 'dodge', 'insight', 'parry'].forEach(k => { v[k] = 0; });
    } else {
      apply(highSpeed, ['base', 'dodge', 'insight', 'parry']);
    }
    if (contact) {
      ['natural', 'armor', 'shield'].forEach(k => { v[k] = 0; });
    } else {
      apply(armorPierce, ['shield', 'armor', 'natural']);
    }
    apply(magicPierce, ['unholy', 'sacred', 'deflection', 'force', 'other']);
    const counterKeys = new Set(D.DEFENSE_ITEMS.filter(d => d.counter).map(d => d.key));
    const total = Object.entries(v).filter(([k]) => !counterKeys.has(k)).reduce((s, [, x]) => s + Math.max(0, x), 0);
    return { total, remaining: v, spent };
  }

  function compute(state) {
    const attrs = {};
    D.ATTRS.forEach(a => { attrs[a.key] = attrOf(state, a.key); });

    const db = state.derivedBonus || {};
    const size = 5 + num(state.size && state.size.bonus) + num(state.size && state.size.other) + num(db.size);
    const hp = attrs.sta.total + size + attrs.sta.legend * (attrs.sta.legend + 1) / 2 + num(db.hp);
    const will = attrs.res.total + attrs.com.total + attrs.res.legend + attrs.com.legend + num(db.will);
    const speed = attrs.str.total + attrs.agi.total + attrs.agi.legend * 3 + size + num(db.speed);
    const initiative = attrs.agi.total + attrs.com.total + attrs.com.legend + num(db.initiative);
    const baseInfo = baseDefenseInfo(state, attrs);
    const baseDefense = baseInfo.value + num(db.baseDefense);
    const sensitive = attrs.per.total * 10 + attrs.per.legend * 20 + num(db.sensitive);
    const fuzzy = sensitive * 10 + num(db.fuzzy);

    const skills = {};
    D.SKILLS.forEach(s => { skills[s.key] = skillCalc(state, s.key, s); });
    const customSkills = (state.customSkills || []).map(s => skillCalc(state, s.id, s, s));
    const skillLookup = Object.assign({}, skills, Object.fromEntries(customSkills.map(s => [s.id, s])));
    const allSkills = Object.values(skills).concat(customSkills);

    const reflex = attrs.agi.total + (skills.athletics ? skills.athletics.total : 0) + num(db.reflex);
    const fortitude = attrs.sta.total + (skills.survival ? skills.survival.total : 0) + num(db.fortitude);
    const willSave = will + num(db.willSave);

    const defense = defenseCalc(state);
    const targetRaw = (state.targetDefense && state.targetDefense.values) || {};
    const flags = {
      flatfooted: !!(state.targetDefense && state.targetDefense.flatfooted),
      contact: !!(state.targetDefense && state.targetDefense.contact)
    };

    const attacks = (state.attacks || []).map(a => {
      const attrKey = a.attr && a.attr !== 'none' ? a.attr : '';
      const attr = attrKey ? (attrs[attrKey] || { total: 0, legend: 0, success: 0 }) : {
        total: 0, legend: 0, success: 0
      };
      const attr2Key = a.attr2 && a.attr2 !== 'none' ? a.attr2 : '';
      const attr2 = attr2Key ? (attrs[attr2Key] || { total: 0, legend: 0, success: 0 }) : { total: 0, legend: 0, success: 0 };
      const skillKey = a.skill && a.skill !== 'none' ? a.skill : '';
      const skill = skillKey ? (skillLookup[skillKey] || { total: 0, success: 0, name: '—', level: 0 }) : {
        total: 0, success: 0, name: '—', level: 0
      };
      const capAttrKey = a.capAttr && a.capAttr !== 'none' ? a.capAttr : '';
      const capAttr = capAttrKey ? (attrs[capAttrKey] || { total: 0, legend: 0 }) : { total: 0, legend: 0 };
      const capSkillKey = a.capSkill && a.capSkill !== 'none' ? a.capSkill : '';
      const capSkill = capSkillKey ? (skillLookup[capSkillKey] || { total: 0 }) : { total: 0 };
      const weapon = num(a.weapon);
      const power = num(a.power);
      const other = num(a.other);
      const typedDP = ['dpInternal', 'dpEnhance', 'dpEnergy', 'dpInstrument', 'dpPerfect', 'dpPractice']
        .reduce((s, k) => s + num(a[k]), 0) +
        (Array.isArray(a.dpCustoms) ? a.dpCustoms.reduce((s, x) => s + num(x && x.value), 0) : 0);
      const typedCap = ['capInternal', 'capEnhance', 'capEnergy', 'capInstrument', 'capPerfect', 'capPractice']
        .reduce((s, k) => s + num(a[k]), 0) +
        (Array.isArray(a.capCustoms) ? a.capCustoms.reduce((s, x) => s + num(x && x.value), 0) : 0);
      const dp = attr.total + attr2.total + skill.total + weapon + power + typedDP + other;
      const capWeapon = [0, 1, 2].includes(num(a.capWeapon)) ? num(a.capWeapon) : 0;
      const capPower = num(a.capPower) === 1 ? 1 : 0;
      const capLegendBonus = a.capLegend ? capAttr.legend * (capAttr.legend + 1) / 2 : 0;
      const cap = capAttr.total + capSkill.total + weapon * capWeapon + power * capPower + typedCap + num(a.capOther) + capLegendBonus;
      const extraSuccess = attr.success + attr2.success + skill.success + num(a.extraSuccessBonus);
      const explodeAt = [8, 9, 10].includes(num(a.explodeAt)) ? num(a.explodeAt) : 10;
      const explodeFactor = explodeAt === 8 ? 3 / 7 : explodeAt === 9 ? 3 / 8 : 1 / 3;
      const attackFlags = {
        flatfooted: !!(flags.flatfooted || (a.flatfootedGrade && a.flatfootedGrade !== 'none')),
        contact: !!(flags.contact || (a.contactGrade && a.contactGrade !== 'none'))
      };
      const attackCount = Math.max(1, num(a.attackCount));
      const actionCost = a.actionCost || '标准动作';
      const eff = effectiveDefense(targetRaw, a, attackFlags);
      const finalDP = dp - eff.total;
      const expectedSuccess = Math.max(finalDP, 0) * explodeFactor;
      const expectedDamage = Math.min(expectedSuccess, Math.max(0, cap));
      const totalExpectedDamage = expectedDamage * attackCount;
      const cost = num(a.energyCost);
      const pool = (state.energyPools || []).find(p => p.name && p.name === a.energyPool);
      let energyState = 'none';
      if (cost > 0) {
        if (!pool) energyState = 'missing';
        else energyState = num(pool.current) >= cost ? 'ok' : 'short';
      }
      return Object.assign({}, a, {
        attrKey, attrName: attrKey ? D.ATTR_MAP[attrKey].name : '无',
        attrTotal: attr.total, legend: attr.legend || 0,
        attr2Key, attr2Name: attr2Key ? D.ATTR_MAP[attr2Key].name : '无',
        attr2Total: attr2.total, attr2Legend: attr2.legend || 0,
        skillKey, skillName: skillKey ? (skill.name || '—') : '无',
        skillTotal: skill.total, skillSuccess: skill.success,
        capAttrName: capAttrKey ? D.ATTR_MAP[capAttrKey].name : '无',
        capSkillName: capSkillKey ? (skillLookup[capSkillKey] || {}).name || '—' : '无',
        capWeapon, capPower, capLegendBonus, explodeAt, explodeFactor,
        typedDP, typedCap,
        attackCount, actionCost, attackFlags, totalExpectedDamage,
        dp, cap, extraSuccess, effectiveDefense: eff.total,
        defenseSpent: eff.spent, finalDP, expectedSuccess, expectedDamage,
        energyState, poolName: pool ? pool.name : '', poolCurrent: pool ? num(pool.current) : 0,
        poolMax: pool ? num(pool.max) : 0, energyCost: cost,
        willCost: num(a.willCost)
      });
    });

    const b = num(state.health && state.health.b);
    const l = num(state.health && state.health.l);
    const a = num(state.health && state.health.a);
    const rmRemaining = hp - b - l - a;
    const fusionDamage = b + 2 * l + 4 * a;
    const rmStatus = hp <= 0 ? '未建卡' : (a >= hp ? '死亡' : (rmRemaining <= 0 ? '昏迷' : '正常'));
    const fusionStatus = hp <= 0 ? '未建卡' : (fusionDamage >= hp ? '死亡' : (fusionDamage >= hp * 0.7 ? '昏迷' : '正常'));
    const healthMode = state.healthMode === 'rm' ? 'rm' : 'fusion';
    const status = healthMode === 'rm' ? rmStatus : fusionStatus;
    const statusTone = status === '死亡' ? 'dead' : (status === '昏迷' ? 'down' : (status === '未建卡' ? 'muted' : 'ok'));
    const willCurrentRaw = state.defense ? state.defense.willCurrent : null;
    const willCurrent = (willCurrentRaw === null || willCurrentRaw === undefined || willCurrentRaw === '') ? will : num(willCurrentRaw);
    const willConsumed = Math.max(0, will - willCurrent);

    const ledger = {
      income: (state.incomes || []).reduce((acc, x) => {
        acc.level += num(x.level); acc.points += num(x.points); acc.xp += num(x.xp); return acc;
      }, { level: 0, points: 0, xp: 0 }),
      spent: (state.purchases || []).reduce((acc, x) => {
        acc.level += num(x.level); acc.points += num(x.points); acc.xp += num(x.xp); return acc;
      }, { level: 0, points: 0, xp: 0 })
    };
    ledger.balance = {
      level: ledger.income.level - ledger.spent.level,
      points: ledger.income.points - ledger.spent.points,
      xp: ledger.income.xp - ledger.spent.xp
    };

    const energyPools = (state.energyPools || []).map(p => {
      const max = num(p.max);
      const current = num(p.current);
      return Object.assign({}, p, { max, current, pct: max > 0 ? Math.max(0, Math.min(100, current / max * 100)) : 0 });
    });

    const topSkills = allSkills.filter(s => s.level > 0 || s.dp > 0)
      .sort((x, y) => y.dp - x.dp || y.level - x.level).slice(0, 8);

    const warnings = [];
    allSkills.forEach(s => { if (s.level > 15) warnings.push(s.name + ' 等级超过 15'); });
    if (hp <= 0) warnings.push('生命上限为 0，请先完成建卡');
    if (willCurrent > will) warnings.push('当前意志高于意志上限');
    if (willCurrent < 0) warnings.push('当前意志为负');

    return {
      attrs, groups: D.ATTR_GROUPS.map(g => ({ name: g.name, en: g.en, attrs: g.attrs.map(k => Object.assign({}, D.ATTR_MAP[k], attrs[k])) })),
      size, hp, will, speed, initiative, baseDefense, sensitive, fuzzy,
      reflex, fortitude, willSave, derivedBonus: db,
      defense, targetRaw, flags, attacks,
      skills, customSkills, allSkills, topSkills, skillLookup,
      health: {
        b, l, a, rmRemaining, fusionDamage, rmStatus, fusionStatus,
        status, statusTone, willCurrent, willConsumed, healthMode
      },
      ledger, energyPools, warnings,
      attackBonus: {
        attrSuccess: 0,
        note: '附加成功只在实际命中后追加，不能把失败变成功'
      }
    };
  }

  function fmt(n, digits) {
    if (!Number.isFinite(n)) return '0';
    if (digits === undefined) return String(Math.round(n * 100) / 100);
    return n.toFixed(digits);
  }

  const API = { num, trunc, round1, successBonus, attrOf, compute, effectiveDefense, fmt, defenseCalc };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Calc = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
