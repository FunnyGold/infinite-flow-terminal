(function (root) {
  'use strict';

  const ATTR_GROUPS = [
    { name: '心智', en: 'MENTAL', attrs: ['int', 'per', 'res'] },
    { name: '生理', en: 'PHYSICAL', attrs: ['str', 'agi', 'sta'] },
    { name: '社交', en: 'SOCIAL', attrs: ['pre', 'man', 'com'] }
  ];

  const ATTRS = [
    { key: 'int', name: '智力', group: '心智', en: 'INT', desc: '记忆、分析、逻辑与知识' },
    { key: 'per', name: '感知', group: '心智', en: 'PER', desc: '观察、直觉与警觉' },
    { key: 'res', name: '决心', group: '心智', en: 'RES', desc: '意志、专注与精神抗性' },
    { key: 'str', name: '力量', group: '生理', en: 'STR', desc: '爆发、负重与近战伤害' },
    { key: 'agi', name: '敏捷', group: '生理', en: 'AGI', desc: '速度、协调与闪避' },
    { key: 'sta', name: '耐力', group: '生理', en: 'STA', desc: '体魄、生命与强韧' },
    { key: 'pre', name: '风度', group: '社交', en: 'PRE', desc: '存在感、气质与表达' },
    { key: 'man', name: '操控', group: '社交', en: 'MAN', desc: '话术、威压与社交手腕' },
    { key: 'com', name: '沉着', group: '社交', en: 'COM', desc: '冷静、先攻与意志' }
  ];

  const ATTR_MAP = Object.fromEntries(ATTRS.map(a => [a.key, a]));

  const SKILLS = [
    { key: 'academics', name: '学识', group: '心智', attr: 'int', note: '文件解读 / 知识 / 怪物知识' },
    { key: 'computer', name: '电脑', group: '心智', attr: 'int', note: '黑客 / 防火墙' },
    { key: 'investigation', name: '调查', group: '心智', attr: 'int', note: '搜索 / 聆听可用感知' },
    { key: 'medicine', name: '医学', group: '心智', attr: 'int', note: '急救 / 长线治疗' },
    { key: 'craftA', name: '手艺 · 子项A', group: '心智', attr: 'int', note: '每个子项独立' },
    { key: 'craftB', name: '手艺 · 子项B', group: '心智', attr: 'int', note: '每个子项独立' },
    { key: 'craftC', name: '手艺 · 子项C', group: '心智', attr: 'int', note: '每个子项独立' },
    { key: 'occult', name: '神秘学', group: '心智', attr: 'int', note: '施法 / 法术辨识' },
    { key: 'science', name: '科学', group: '心智', attr: 'int', note: '解读图纸' },
    { key: 'athletics', name: '运动', group: '生理', attr: 'agi', note: '投掷 / 平衡 / 跳跃 / 攀爬 / 游泳' },
    { key: 'brawl', name: '肉搏', group: '生理', attr: 'str', note: '擒抱 / 冲撞 / 摔绊' },
    { key: 'drive', name: '驾驶', group: '生理', attr: 'agi', note: '' },
    { key: 'firearms', name: '枪械', group: '生理', attr: 'agi', note: '炮用智力' },
    { key: 'sleight', name: '手上功夫', group: '生理', attr: 'agi', note: '人物卡旧名「盗窃」' },
    { key: 'stealth', name: '躲藏', group: '生理', attr: 'agi', note: '隐匿与潜行' },
    { key: 'survival', name: '求生', group: '生理', attr: 'per', note: '强韧豁免用它' },
    { key: 'melee', name: '白刃', group: '生理', attr: 'str', note: '近战武器' },
    { key: 'animal', name: '动物沟通', group: '互动', attr: 'man', note: '骑术' },
    { key: 'empathy', name: '感受', group: '互动', attr: 'res', note: '坚定立场 / 察言观色' },
    { key: 'expressionA', name: '表达 · 子项A', group: '互动', attr: 'pre', note: '' },
    { key: 'expressionB', name: '表达 · 子项B', group: '互动', attr: 'pre', note: '' },
    { key: 'expressionC', name: '表达 · 子项C', group: '互动', attr: 'pre', note: '' },
    { key: 'intimidate', name: '胁迫', group: '互动', attr: 'man', note: '威吓 / 咆哮' },
    { key: 'persuasion', name: '交际', group: '互动', attr: 'man', note: '交涉 / 说服 / 情报' },
    { key: 'subterfuge', name: '掩饰', group: '互动', attr: 'int', note: '唬骗 / 易容 / 伪装' }
  ];

  const CUSTOM_DEFAULT = [
    { id: 'c_archery', name: '弓箭', group: '生理', attr: 'agi' },
    { id: 'c_politics', name: '政治', group: '心智', attr: 'int' },
    { id: 'c_taigumodao', name: '太古魔道', group: '生理', attr: 'str' },
    { id: 'c_streetwise', name: '街头智慧', group: '互动', attr: 'man' }
  ];

  const DEFENSE_ITEMS = [
    { key: 'base', name: '基础防御', auto: true, desc: '敏捷 / 感知取低' },
    { key: 'dodge', name: '闪避', auto: true, desc: '传奇敏捷；其他另填' },
    { key: 'insight', name: '洞察', auto: true, desc: '传奇感知；其他另填' },
    { key: 'parry', name: '格挡', auto: false, desc: '白刃 / 肉搏格挡 = 技能等级' },
    { key: 'natural', name: '天生防御', auto: false, desc: '种族、变异、天生护甲' },
    { key: 'armor', name: '盔甲', auto: false, desc: '护甲与防具' },
    { key: 'shield', name: '盾牌', auto: false, desc: '通常 = 盾牌体积' },
    { key: 'deflection', name: '偏斜', auto: false, desc: '偏斜力场' },
    { key: 'force', name: '力场', auto: false, desc: '力场护盾' },
    { key: 'sacred', name: '神圣', auto: false, desc: '神圣 / 光明加护' },
    { key: 'unholy', name: '亵渎', auto: false, desc: '亵渎 / 黑暗加护' },
    { key: 'morale', name: '士气', auto: false, desc: '士气与精神加值' },
    { key: 'other', name: '其他', auto: false, desc: '法术防御等' }
  ];

  const DEFENSE_MAP = Object.fromEntries(DEFENSE_ITEMS.map(d => [d.key, d]));

  const ATTACK_TEMPLATES = [
    {
      key: 'brawl', name: '肉搏', attr: 'str', skill: 'brawl',
      capAttr: 'str', capSkill: 'brawl', capWeapon: 1, capPower: 0, capLegend: true,
      desc: '力量 + 肉搏 + 武器；伤害上限含传奇力量三角'
    },
    {
      key: 'melee', name: '白刃', attr: 'str', skill: 'melee',
      capAttr: 'str', capSkill: 'melee', capWeapon: 1, capPower: 0, capLegend: true,
      desc: '力量 + 白刃 + 武器；伤害上限含传奇力量三角'
    },
    {
      key: 'firearms', name: '枪械', attr: 'agi', skill: 'firearms',
      capAttr: 'none', capSkill: 'firearms', capWeapon: 2, capPower: 0, capLegend: false,
      desc: '敏捷 + 枪械 + 武器；伤害上限 = 枪械 + 武器 ×2'
    },
    {
      key: 'archery', name: '弓箭', attr: 'agi', skill: 'c_archery',
      capAttr: 'none', capSkill: 'c_archery', capWeapon: 2, capPower: 0, capLegend: false,
      desc: '敏捷 + 弓箭 + 武器；伤害上限 = 弓箭 + 武器 ×2'
    },
    {
      key: 'lightThrow', name: '轻投掷', attr: 'agi', skill: 'athletics',
      capAttr: 'none', capSkill: 'athletics', capWeapon: 2, capPower: 0, capLegend: false,
      desc: '敏捷 + 运动 + 武器；伤害上限 = 运动 + 武器 ×2'
    },
    {
      key: 'heavyThrow', name: '重投掷', attr: 'str', skill: 'athletics',
      capAttr: 'none', capSkill: 'athletics', capWeapon: 2, capPower: 0, capLegend: false,
      desc: '力量 + 运动 + 武器；伤害上限 = 运动 + 武器 ×2'
    },
    {
      key: 'spell', name: '法术', attr: 'int', skill: 'occult',
      capAttr: 'int', capSkill: 'occult', capWeapon: 0, capPower: 1, capLegend: false,
      desc: '智力 + 神秘学 + 威力；伤害上限 = 智力 + 神秘学 + 威力'
    }
  ];

  const DR_TYPES = [
    { value: '/-', label: '/-（无弱点）' },
    { value: '/魔法', label: '/魔法' },
    { value: '/神兵', label: '/神兵' },
    { value: '/银', label: '/银' },
    { value: '/精金', label: '/精金' },
    { value: '/寒铁', label: '/寒铁' },
    { value: '/挥砍', label: '/挥砍' },
    { value: '/穿刺', label: '/穿刺' },
    { value: '/钝击', label: '/钝击' },
    { value: '/其他', label: '/其他（在说明中填写）' }
  ];

  const EQUIP_SLOTS = [
    '头盔', '护符', '项链', '披风', '腰带', '盔甲', '手套', '左手戒指',
    '右手戒指', '鞋袜', '法宝', '概念武装', '主手', '副手', '无装备位', '负重 / 储物'
  ];

  const RESOURCE_TYPES = ['血统', '改造', '瞳术', '修真', '魔导书', '称号', '流派', '技艺', '其他'];
  const TECH_ACTIONS = ['标准动作', '移动动作', '迅捷动作', '自由动作', '反应动作', '整轮动作'];

  const BONUS_TYPES = [
    { key: 'internal', name: '内在' },
    { key: 'enhance', name: '增强' },
    { key: 'energy', name: '能量' },
    { key: 'instrument', name: '器械' },
    { key: 'perfect', name: '完美' },
    { key: 'practice', name: '修行' }
  ];

  const EFFECT_GRADES = [
    { value: 'none', label: '无' },
    { value: 'D', label: 'D 级' },
    { value: 'C', label: 'C 级' },
    { value: 'B', label: 'B 级' },
    { value: 'A', label: 'A 级' },
    { value: 'S', label: 'S 级' }
  ];

  function blankSkill(attr) {
    return {
      level: 0, bonus: 0, temp: 0, specialty: 0,
      major: '', otherDP: 0, otherSuccess: 0, attrOverride: attr || ''
    };
  }

  function newCustomSkill(obj) {
    return Object.assign({
      id: 'c_' + Math.random().toString(36).slice(2, 9),
      name: '新技能', group: '心智', attr: 'int',
      level: 0, bonus: 0, temp: 0, specialty: 0,
      major: '', otherDP: 0, otherSuccess: 0
    }, obj || {});
  }

  function newAttack(name) {
    return {
      id: 'atk_' + Math.random().toString(36).slice(2, 9),
      name: name || '新攻击', desc: '',
      kind: 'attack', checkA: 'res', checkB: 'com',
      attr: 'str', skill: 'brawl',
      capAttr: 'str', capSkill: 'brawl', capWeapon: 1, capPower: 0,
      capLegend: false, capOther: 0,
      dpInternal: 0, dpEnhance: 0, dpEnergy: 0, dpInstrument: 0, dpPerfect: 0, dpPractice: 0,
      extraSuccessBonus: 0,
      dpCustoms: [],
      capInternal: 0, capEnhance: 0, capEnergy: 0, capInstrument: 0, capPerfect: 0, capPractice: 0,
      capCustoms: [],
      attackCount: 1, actionCost: '标准动作',
      flatfootedGrade: 'none', contactGrade: 'none',
      explodeAt: 10,
      weapon: 0, power: 0, other: 0,
      highSpeed: 0, armorPierce: 0, magicPierce: 0,
      energyPool: '', energyCost: 0, willCost: 0,
      keywords: '', note: '', enabled: true
    };
  }

  function createDefaultState() {
    const attributes = {};
    ATTRS.forEach(a => {
      attributes[a.key] = {
        base: 1, internal: 0, enhance: 0, energy: 0, instrument: 0,
        perfect: 0, practice: 0, other: 0, extra: 0, legendBonus: 0
      };
    });
    const skills = {};
    SKILLS.forEach(s => { skills[s.key] = blankSkill(s.attr); });
    const manual = {};
    DEFENSE_ITEMS.forEach(d => { manual[d.key] = 0; });
    const targetValues = {};
    DEFENSE_ITEMS.forEach(d => { targetValues[d.key] = 0; });

    return {
      format: 'infinite-terminal-character',
      version: 2,
      meta: {
        name: '未命名调查员', player: '', gender: '', age: '', nationality: '',
        race: '', height: '', weight: '', languages: '', appearance: '',
        concept: '', team: '', origin: '', quirks: '', virtue: '', flaw: '', notes: '', avatar: ''
      },
      attributes,
      size: { bonus: 0, other: 0 },
      derivedBonus: {
        size: 0, speed: 0, initiative: 0, baseDefense: 0, hp: 0, will: 0,
        reflex: 0, fortitude: 0, willSave: 0, sensitive: 0, fuzzy: 0
      },
      skills,
      customSkills: CUSTOM_DEFAULT.map(s => Object.assign(blankSkill(s.attr), s)),
      defense: { manual, willCurrent: null, baseMode: 'low', baseA: 'agi', baseB: 'per', note: '' },
      damageReductions: [],
      targetDefense: { values: targetValues, flatfooted: false, contact: false, flatfootedGrade: 'none', contactGrade: 'none' },
      quickCheck: { a: 'res', b: 'com' },
      health: { b: 0, l: 0, a: 0 },
      healthMode: 'fusion',
      attacks: [],
      energyPools: [
        { id: 'ep_1', kind: 'energy', name: '能量池 A', max: 0, current: 0, recovery: '', usage: '' },
        { id: 'ep_2', kind: 'energy', name: '能量池 B', max: 0, current: 0, recovery: '', usage: '' }
      ],
      traits: [],
      resources: [],
      startingFeats: [{ level: 0, name: '', points: 0, effect: '' }],
      feats: [],
      purchases: [],
      incomes: [],
      techniques: Array.from({ length: 6 }, () => ({ action: '标准动作', name: '', text: '' })),
      equipment: EQUIP_SLOTS.map(slot => ({ slot, name: '', effect: '' })),
      vehicle: {
        name: '', structure: 0, armor: 0, hardness: 0, baseDefense: 0,
        threshold: 0, speed: 0, reflex: 0, output: 0, mobility: 0, notes: ''
      },
      notes: ''
    };
  }

  const DATA = {
    VERSION: '1.0.0',
    ATTR_GROUPS, ATTRS, ATTR_MAP, SKILLS, CUSTOM_DEFAULT,
    DEFENSE_ITEMS, DEFENSE_MAP, ATTACK_TEMPLATES, DR_TYPES, EQUIP_SLOTS,
    RESOURCE_TYPES, TECH_ACTIONS, BONUS_TYPES, EFFECT_GRADES,
    createDefaultState, blankSkill, newCustomSkill, newAttack
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.APP_DATA = DATA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
