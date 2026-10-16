/* Accounting App Builder
 * Interviews the user about their personal finances and assembles a build
 * prompt for an AI coding agent. Everything runs in the browser; answers are
 * only ever stored in this browser's localStorage.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'accounting-app-builder:v1';

  const DEFAULT_CATEGORIES = [
    'Groceries', 'Dining out', 'Gas & fuel', 'Transportation', 'Subscriptions',
    'Utilities', 'Housing', 'Travel', 'Kids', 'Pets', 'Home & household',
    'Medical', 'Shopping', 'Entertainment', 'Gifts & donations', 'Personal care',
    'Income', 'Transfers'
  ];
  const SUGGESTED_CATEGORIES = [
    'Insurance', 'Education', 'Fitness', 'Clothing', 'Car maintenance', 'Coffee',
    'Alcohol', 'Hobbies', 'Charity', 'Taxes', 'Business expenses', 'Childcare', 'Savings'
  ];

  const blank = {
    account: () => ({ label: '', kind: '', source: '', owner: '', notes: '' }),
    transfer: () => ({ label: '', purpose: '' }),
    store: () => ({ name: '', source: '', notes: '' }),
    rule: () => ({ match: '', category: '' }),
    recurring: () => ({ name: '', amount: '', frequency: '', notes: '' })
  };

  function defaultState() {
    return {
      about: { name: '', os: '', currency: 'USD', history: '', comfort: '' },
      accounts: [blank.account(), blank.account()],
      shared: { mode: '', people: '', perPerson: '', notes: '' },
      transfers: { has: '', list: [blank.transfer()] },
      stores: { has: '', list: [blank.store()] },
      marketplace: { has: '', which: '', access: '', notes: '' },
      categories: DEFAULT_CATEGORIES.slice(),
      rules: [blank.rule(), blank.rule()],
      learning: 'learn',
      ai: { mode: '', provider: '', model: '', budget: '', localTool: '', hardware: '', threshold: 85 },
      receipts: { mode: '', stores: '', notes: '' },
      recurring: { has: '', list: [blank.recurring()] },
      output: {
        format: '', other: '', edits: 'yes', learnFromEdits: 'yes',
        cadence: 'monthly', cadenceNotes: '',
        summaries: ['category', 'mom'], budgets: '', summariesOther: '',
        review: 'queue', reviewNotes: ''
      },
      safety: { local: false, secrets: false, backup: false, repo: '' }
    };
  }

  // ---------- Persistence ----------
  function mergeDefaults(def, saved) {
    if (Array.isArray(def)) return Array.isArray(saved) ? saved : def;
    if (def && typeof def === 'object') {
      const out = {};
      for (const k of Object.keys(def)) out[k] = saved && k in saved ? mergeDefaults(def[k], saved[k]) : def[k];
      return out;
    }
    return saved === undefined || saved === null ? def : saved;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        state: mergeDefaults(defaultState(), parsed.state || {}),
        step: Number(parsed.step) || 0,
        visited: Array.isArray(parsed.visited) ? parsed.visited : [0]
      };
    } catch (_) { return null; }
  }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, step: current, visited: [...visited] }));
        flashSaved();
      } catch (_) { /* storage unavailable: the app still works, it just won't remember */ }
    }, 250);
  }

  const loaded = load();
  let state = loaded ? loaded.state : defaultState();
  let current = loaded ? loaded.step : 0;
  const visited = new Set(loaded ? loaded.visited : [0]);

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = (v) => (v == null ? '' : String(v)).trim();

  function getPath(path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), state);
  }
  function setPath(path, value) {
    const keys = path.split('.');
    let o = state;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = value;
  }
  const fid = (path, suffix) => 'f-' + path.replace(/\./g, '-') + (suffix ? '-' + suffix : '');

  const ICON = {
    info: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5M12 8v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3 2 20h20L12 3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v4M12 17v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    lock: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    download: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrowR: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" fill="currentColor"/></svg>'
  };

  // ---------- Form building blocks ----------
  function field({ path, label, help, placeholder, list, optional, type = 'text', mini, multiline, rows }) {
    const id = fid(path);
    const value = getPath(path);
    const labelHtml = label
      ? `<label class="${mini ? 'mini-label' : ''}" for="${id}">${esc(label)}${optional ? '<span class="optional">optional</span>' : ''}</label>`
      : '';
    const control = multiline
      ? `<textarea class="textarea" id="${id}" data-path="${path}" rows="${rows || 3}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
      : `<input class="input" id="${id}" type="${type}" data-path="${path}" value="${esc(value)}" placeholder="${esc(placeholder)}"${list ? ` list="${list}"` : ''}>`;
    return `<div class="field">${labelHtml}${control}${help ? `<p class="help">${help}</p>` : ''}</div>`;
  }

  function choices({ path, options, cols, label, help, multi }) {
    const value = getPath(path);
    const type = multi ? 'checkbox' : 'radio';
    const items = options.map((o) => {
      const checked = multi ? (value || []).includes(o.value) : value === o.value;
      return `<label class="choice">
        <input type="${type}" name="${path}" value="${esc(o.value)}" data-path="${path}" ${multi ? 'data-multi' : ''} data-rerender ${checked ? 'checked' : ''}>
        <span class="choice-body"><span class="choice-dot"></span><span>
          <span class="choice-title">${esc(o.title)}${o.tag ? `<span class="tag ${o.tagAccent ? 'tag-accent' : ''}">${esc(o.tag)}</span>` : ''}</span>
          ${o.desc ? `<span class="choice-desc">${o.desc}</span>` : ''}
        </span></span>
      </label>`;
    }).join('');
    return `<div class="field" role="${multi ? 'group' : 'radiogroup'}" aria-label="${esc(label || '')}">
      ${label ? `<span class="field-label">${esc(label)}</span>` : ''}
      ${help ? `<p class="help help-top">${help}</p>` : ''}
      <div class="choices ${cols ? 'cols-' + cols : ''}">${items}</div>
    </div>`;
  }

  function toggle({ path, title, desc }) {
    const checked = !!getPath(path);
    return `<label class="choice" style="margin-bottom:10px">
      <input type="checkbox" data-path="${path}" data-rerender ${checked ? 'checked' : ''}>
      <span class="choice-body"><span class="choice-dot"></span><span>
        <span class="choice-title">${esc(title)}</span>
        ${desc ? `<span class="choice-desc">${desc}</span>` : ''}
      </span></span>
    </label>`;
  }

  const yesNo = (yesTitle, noTitle, yesDesc, noDesc) => [
    { value: 'yes', title: yesTitle || 'Yes', desc: yesDesc },
    { value: 'no', title: noTitle || 'No', desc: noDesc }
  ];

  function rowList(listPath, kind, addLabel, renderItem) {
    const list = getPath(listPath);
    return `<div class="rows">${list.map((item, i) => renderItem(item, i, `${listPath}.${i}`)).join('')}</div>
      <button type="button" class="add-btn" data-action="add" data-list="${listPath}" data-kind="${kind}">${ICON.plus}${esc(addLabel)}</button>`;
  }
  const removeBtn = (listPath, i, what) =>
    `<button type="button" class="icon-btn" data-action="remove" data-list="${listPath}" data-index="${i}" aria-label="Remove ${esc(what)}" title="Remove">${ICON.trash}</button>`;

  const callout = (html, kind) => `<div class="callout ${kind || ''}">${ICON[kind === 'warn' ? 'warn' : kind === 'lock' ? 'lock' : 'info']}<p>${html}</p></div>`;
  const card = (title, desc, body) => `<section class="card">${title ? `<h2 class="card-title">${esc(title)}</h2>` : ''}${desc ? `<p class="card-desc">${desc}</p>` : ''}${body}</section>`;
  const datalist = (id, opts) => `<datalist id="${id}">${opts.map((o) => `<option value="${esc(o)}"></option>`).join('')}</datalist>`;

  const stepHead = (title, intro) =>
    `<div class="step-head"><div class="eyebrow">Step ${current} of ${STEPS.length - 2}</div><h1>${esc(title)}</h1><p>${intro}</p></div>`;

  // ---------- Steps ----------
  const STEPS = [
    { nav: 'Welcome', render: renderWelcome },
    { nav: 'Accounts & cards', render: renderAccounts },
    { nav: 'Itemized stores', render: renderStores },
    { nav: 'Categories & rules', render: renderCategories },
    { nav: 'Automation & cost', render: renderAutomation },
    { nav: 'Receipts & bills', render: renderReceipts },
    { nav: 'Output & review', render: renderOutput },
    { nav: 'Safety & trust', render: renderSafety },
    { nav: 'Your build prompt', render: renderResult }
  ];

  function renderWelcome() {
    return `
      <div class="hero">
        <div class="eyebrow">Let's design your app</div>
        <h1>Commission a money-tracking app built around how <em>you</em> actually spend.</h1>
        <p>This tool doesn't touch your finances. It asks you plain-English questions about your cards, stores, and habits, then writes a detailed spec you can hand to an AI coding assistant (like Claude Code) so it can build a custom monthly-accounting app just for you.</p>
        <p>There are no wrong answers. Skip anything you're unsure of and the spec will flag it for the AI to ask you later.</p>
        <div class="how">
          <div class="how-item"><span class="how-num">1</span><b>Answer ~7 short sections</b>About 10 minutes. Your answers save automatically in this browser.</div>
          <div class="how-item"><span class="how-num">2</span><b>Get your build prompt</b>Copy it or download it as a .md file.</div>
          <div class="how-item"><span class="how-num">3</span><b>Hand it to an AI agent</b>Paste it into Claude Code (or similar) and it builds your app.</div>
        </div>
      </div>
      ${callout('<strong>Private by design.</strong> Nothing you type leaves this page. There is no server; answers are kept only in this browser so you can come back later.', 'lock')}
      ${card('A little about you', 'This helps the AI pitch the setup instructions at the right level and target the right computer.', `
        <div class="grid grid-2">
          ${field({ path: 'about.name', label: 'Whose books are these?', placeholder: 'e.g. Sam, or "the Rivera household"', optional: true, help: 'Just a name to make the spec feel like yours.' })}
          ${field({ path: 'about.currency', label: 'Currency', placeholder: 'e.g. USD', list: 'dl-currency', help: 'The currency your accounts use.' })}
        </div>
        <div style="height:18px"></div>
        ${choices({ path: 'about.os', label: 'What computer will you run the app on?', cols: 3, options: [
          { value: 'windows', title: 'Windows' }, { value: 'mac', title: 'Mac' }, { value: 'linux', title: 'Linux' }
        ] })}
        ${choices({ path: 'about.comfort', label: 'How comfortable are you with technical setup?', help: 'Be honest. This only changes how detailed the setup instructions will be.', options: [
          { value: 'novice', title: "I've never used a terminal / command line", desc: 'The app should come with copy-paste instructions and a one-click way to run it.' },
          { value: 'some', title: 'I can follow step-by-step instructions', desc: 'Clear setup steps are enough.' },
          { value: 'comfortable', title: "I'm comfortable with developer tools", desc: 'A concise README is fine.' }
        ] })}
        ${field({ path: 'about.history', label: 'How far back do you want to import?', placeholder: 'e.g. Start from January of this year', optional: true, help: 'Your first run can include older statements, or you can just start fresh this month.' })}
        ${datalist('dl-currency', ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'NZD', 'MXN', 'INR', 'JPY'])}
      `)}
    `;
  }

  function renderAccounts() {
    const shared = state.shared.mode === 'shared';
    return `
      ${stepHead('Accounts & cards', 'List every card or bank account whose spending you want in your books. For each one, tell us how you get the transaction history today. This is what tells the AI which "importers" to build.')}
      ${card('Your accounts', 'Add one row per card or account. Rough answers are fine. Pick from the suggestions or type your own.', `
        ${rowList('accounts', 'account', 'Add another account', (a, i, p) => `
          <div class="row-item">
            <div class="row-item-head"><span class="row-badge">Account ${i + 1}</span>${removeBtn('accounts', i, 'account')}</div>
            <div class="grid grid-2">
              ${field({ path: p + '.label', label: 'Short label', mini: true, placeholder: i === 0 ? 'e.g. Chase Sapphire' : 'e.g. Wells Fargo checking' })}
              ${field({ path: p + '.kind', label: 'Type', mini: true, list: 'dl-kind', placeholder: i === 0 ? 'e.g. Credit card' : 'e.g. Debit / checking' })}
              ${field({ path: p + '.source', label: 'How do you get its transactions?', mini: true, list: 'dl-source', placeholder: i === 0 ? 'e.g. CSV download from the website' : 'e.g. Monthly PDF statement' })}
              ${shared
                ? field({ path: p + '.owner', label: 'Whose is it?', mini: true, placeholder: 'e.g. Joint, or Alex' })
                : field({ path: p + '.notes', label: 'Notes', mini: true, optional: true, placeholder: 'e.g. Only used for gas' })}
            </div>
            ${shared ? `<div style="margin-top:12px">${field({ path: p + '.notes', label: 'Notes', mini: true, optional: true, placeholder: 'e.g. Only used for gas' })}</div>` : ''}
          </div>`)}
        <p class="help" style="margin-top:12px">Not sure how to get a CSV? Most banks have a "Download" or "Export" button on the transactions page. "Not sure" is a perfectly good answer too.</p>
      `)}
      ${card('Do other people share these accounts?', 'If a spouse, partner, or roommate uses some of these cards, your app can split spending by person as well as by category.', `
        ${choices({ path: 'shared.mode', cols: 2, options: [
          { value: 'solo', title: 'Just me', desc: 'All spending is mine.' },
          { value: 'shared', title: 'Shared with others', desc: 'Some accounts are used by more than one person.' }
        ] })}
        ${shared ? `
          ${field({ path: 'shared.people', label: 'Who are the people?', placeholder: 'e.g. Me (Jordan) and my partner (Alex)' })}
          ${choices({ path: 'shared.perPerson', label: 'Track spending per person too?', cols: 2, help: "e.g. \"Alex spent $340 on dining, I spent $120.\"", options: yesNo('Yes, per person and per category', 'No, just by category') })}
          ${field({ path: 'shared.notes', label: 'How should the app tell whose purchase is whose?', optional: true, multiline: true, placeholder: 'e.g. Each of us has our own card on the joint account (different last 4 digits). Purchases on the joint checking account are split 50/50.' })}
        ` : ''}
      `)}
      ${card('Accounts to keep separate from personal spending', 'Some money moves aren\'t really "spending": paying into a shared rental property, a joint savings goal, or a kid\'s account. These are tracked on their own so they don\'t inflate your monthly totals.', `
        ${choices({ path: 'transfers.has', cols: 2, options: yesNo('Yes, I have some', 'No, nothing like that') })}
        ${state.transfers.has === 'yes' ? rowList('transfers.list', 'transfer', 'Add another', (x, i, p) => `
          <div class="row-inline">
            ${field({ path: p + '.label', placeholder: 'e.g. Lake house account' })}
            ${field({ path: p + '.purpose', placeholder: 'e.g. Shared with my brother, track contributions' })}
            ${removeBtn('transfers.list', i, 'item')}
          </div>`) : ''}
      `)}
      ${datalist('dl-kind', ['Credit card', 'Debit card', 'Checking account', 'Savings account', 'Store card', 'PayPal / Venmo', 'Cash'])}
      ${datalist('dl-source', ['CSV download from the website', 'Monthly PDF statement', 'OFX / QFX / Quicken file', 'I type it in manually', 'Bank aggregator / API (e.g. Plaid, SimpleFIN)', 'Not sure yet'])}
    `;
  }

  function renderStores() {
    return `
      ${stepHead('Itemized stores', 'For most purchases, "Target $84.12" is enough. But for some stores (usually groceries) you may want to see <em>what</em> you bought: $40 of food, $30 of household supplies, $14 of pet food. That needs the receipt, not just the card charge.')}
      ${card('Stores to break down item by item', 'Your app will split these purchases into individual line items and categorize each one.', `
        ${choices({ path: 'stores.has', cols: 2, options: yesNo('Yes, itemize some stores', 'No, lump charges are fine') })}
        ${state.stores.has === 'yes' ? rowList('stores.list', 'store', 'Add another store', (s, i, p) => `
          <div class="row-item">
            <div class="row-item-head"><span class="row-badge">Store ${i + 1}</span>${removeBtn('stores.list', i, 'store')}</div>
            <div class="grid grid-2">
              ${field({ path: p + '.name', label: 'Store', mini: true, placeholder: i === 0 ? 'e.g. Kroger' : 'e.g. Costco' })}
              ${field({ path: p + '.source', label: 'How do you get the itemized receipt?', mini: true, list: 'dl-store-source', placeholder: 'e.g. Emailed receipt' })}
            </div>
            <div style="margin-top:12px">${field({ path: p + '.notes', label: 'Notes', mini: true, optional: true, placeholder: 'e.g. Receipts are in the loyalty app under "Purchase history"' })}</div>
          </div>`) : ''}
      `)}
      ${card('Amazon and other marketplaces', 'Instead of "Amazon $47.12", your books could show "Phone charger $12.99, Dog shampoo $18.14, Notebook $15.99". This needs your order history.', `
        ${choices({ path: 'marketplace.has', cols: 2, options: yesNo('Yes, show what I actually bought', 'No / I don\'t shop there much') })}
        ${state.marketplace.has === 'yes' ? `
          ${field({ path: 'marketplace.which', label: 'Which marketplaces?', placeholder: 'e.g. Amazon, Walmart.com, Etsy' })}
          ${field({ path: 'marketplace.access', label: 'How can you get to your order history?', multiline: true, placeholder: 'e.g. Amazon website order history on my own account. My partner also orders from a separate Amazon account. I get email confirmations for every order.', help: 'Mention if more than one login is involved. It affects how orders get matched to card charges.' })}
        ` : ''}
      `)}
      ${datalist('dl-store-source', ['Emailed receipt', 'Store loyalty app export', 'PDF order history from the website', 'Photo of the paper receipt', 'Not sure yet'])}
    `;
  }

  function renderCategories() {
    const missing = SUGGESTED_CATEGORIES.filter((c) => !state.categories.some((x) => x.toLowerCase() === c.toLowerCase()));
    return `
      ${stepHead('Categories & rules', 'Categories are the buckets your spending gets sorted into. Start from our list and make it yours: remove what you don\'t need, add what\'s missing.')}
      ${card('Your spending categories', `${state.categories.length} categories. Click × to remove one.`, `
        <div class="chips">
          ${state.categories.map((c, i) => `<span class="chip">${esc(c)}<button type="button" data-action="remove-cat" data-index="${i}" aria-label="Remove ${esc(c)}">${ICON.x}</button></span>`).join('') || '<span class="help">No categories yet. Add some below.</span>'}
        </div>
        <div class="chip-add">
          <input class="input" id="newCat" placeholder="Add a category, e.g. Golf" aria-label="New category">
          <button type="button" class="btn btn-secondary" data-action="add-cat">${ICON.plus}Add</button>
        </div>
        ${missing.length ? `<p class="help" style="margin-top:14px">Quick add: ${missing.map((c) => `<button type="button" class="link-btn" data-action="suggest-cat" data-value="${esc(c)}">+ ${esc(c)}</button>`).join(' &nbsp;')}</p>` : ''}
        <p class="help"><button type="button" class="link-btn" data-action="reset-cats">Reset to the starter list</button></p>
      `)}
      ${card('Rules you already know', 'Hard-and-fast rules always win. Example: anything containing "VET" is always Pets. The app matches on the text that shows up on your statement.', `
        ${rowList('rules', 'rule', 'Add a rule', (r, i, p) => `
          <div class="row-inline">
            ${field({ path: p + '.match', placeholder: i === 0 ? 'If description contains… e.g. VET' : 'e.g. SHELL' })}
            ${field({ path: p + '.category', list: 'dl-cats', placeholder: i === 0 ? '…then category is e.g. Pets' : 'e.g. Gas & fuel' })}
            ${removeBtn('rules', i, 'rule')}
          </div>`)}
      `)}
      ${card('Should the app learn from you?', 'Once you\'ve told it "STARBUCKS is Dining out", should it remember next time?', `
        ${choices({ path: 'learning', options: [
          { value: 'learn', title: 'Yes, learn my choices and get better over time', tag: 'Recommended', tagAccent: true, desc: 'Most transactions will be categorized automatically after the first month or two. You can always override it.' },
          { value: 'manual', title: 'No, I\'ll categorize everything myself every time', desc: 'Maximum control, more work each month. Your keyword rules above still apply.' }
        ] })}
      `)}
      ${datalist('dl-cats', state.categories)}
    `;
  }

  function renderAutomation() {
    const ai = state.ai;
    const usesAI = ai.mode === 'api' || ai.mode === 'local';
    return `
      ${stepHead('Automation & cost', 'When the app sees a merchant or item it doesn\'t recognize yet, it can ask an AI model for a best guess. You still get the final say: uncertain guesses go to your review list.')}
      ${card('AI suggestions for unknown merchants & items', '', `
        ${choices({ path: 'ai.mode', options: [
          { value: 'api', title: 'Use a paid AI service', tag: 'Most accurate', desc: 'Sends only merchant names / item descriptions (never account numbers) to a provider like Anthropic or OpenAI. Typically costs <strong>a few cents per monthly run</strong>, not dollars. Needs an API key.' },
          { value: 'local', title: 'Use a free AI model on my own computer', tag: 'Most private', desc: 'Nothing leaves your machine. Needs a one-time install, runs slower, and is somewhat less accurate. Works best on a newer computer.' },
          { value: 'skip', title: 'No AI. Just flag unknowns for me to categorize', tag: 'Simplest', desc: 'Zero cost and setup. With learning turned on, there\'s less to do each month anyway.' }
        ] })}
        ${ai.mode === 'api' ? `
          <div class="grid grid-2">
            ${field({ path: 'ai.provider', label: 'Preferred provider', list: 'dl-provider', placeholder: 'e.g. Anthropic (Claude)', help: 'Leave as "No preference" if you don\'t have one.' })}
            ${field({ path: 'ai.model', label: 'Specific model', optional: true, placeholder: 'e.g. the cheapest fast model', help: 'Most people should leave this blank.' })}
          </div>
          <div style="height:14px"></div>
          ${field({ path: 'ai.budget', label: 'Spending cap', optional: true, placeholder: 'e.g. Never spend more than $1 per month', help: 'The app can stop and warn you before going over.' })}
        ` : ''}
        ${ai.mode === 'local' ? `
          <div class="grid grid-2">
            ${field({ path: 'ai.localTool', label: 'Preferred local tool', optional: true, list: 'dl-local', placeholder: 'e.g. No preference' })}
            ${field({ path: 'ai.hardware', label: 'Your computer', optional: true, placeholder: 'e.g. 2023 MacBook Air, 16 GB RAM' })}
          </div>
        ` : ''}
        ${usesAI ? `
          <div class="field" style="margin-top:18px">
            <label class="field-label" for="${fid('ai.threshold')}">Only auto-accept a suggestion when the AI is at least…</label>
            <div class="range-row">
              <input type="range" min="50" max="99" step="1" id="${fid('ai.threshold')}" data-path="ai.threshold" value="${Number(ai.threshold) || 85}">
              <span class="range-value">${Number(ai.threshold) || 85}%</span>
            </div>
            <p class="help">confident. Anything less certain goes into your review list instead. Higher = more manual review, fewer mistakes. 85% is a good start.</p>
          </div>
        ` : ''}
      `)}
      ${datalist('dl-provider', ['No preference', 'Anthropic (Claude)', 'OpenAI (GPT)', 'Google (Gemini)'])}
      ${datalist('dl-local', ['No preference', 'Ollama', 'LM Studio'])}
    `;
  }

  function renderReceipts() {
    const photos = state.receipts.mode === 'yes' || state.receipts.mode === 'sometimes';
    return `
      ${stepHead('Receipts & bills', 'Two more sources of spending: paper receipts you snap a photo of, and regular bills that don\'t go through a card.')}
      ${card('Photographed paper receipts', 'If you take photos of receipts, the app can read them and split them into line items, just like an emailed receipt.', `
        ${choices({ path: 'receipts.mode', cols: 3, options: [
          { value: 'yes', title: 'Yes, regularly' }, { value: 'sometimes', title: 'Occasionally' }, { value: 'no', title: 'No' }
        ] })}
        ${photos ? `
          ${callout(state.ai.mode === 'skip'
            ? 'Reading photos needs an image-to-text step. Since you chose <strong>no AI</strong>, the app will use free offline text recognition (OCR). It\'s less accurate on crumpled receipts, so expect to double-check those.'
            : 'Heads up: reading photos needs an image-to-text ("vision") step. Your spec will tell the AI to build one and to double-check each receipt\'s total before trusting it.')}
          ${field({ path: 'receipts.stores', label: 'Which receipts, roughly?', placeholder: 'e.g. Farmers market, the hardware store, restaurant receipts for splitting' })}
          ${field({ path: 'receipts.notes', label: 'Where do the photos live?', optional: true, placeholder: 'e.g. A "Receipts" album on my iPhone that syncs to iCloud' })}
        ` : ''}
      `)}
      ${card('Recurring expenses that don\'t hit a card', 'Rent paid by check, utilities on autopay from checking, a mortgage you split with a partner, cash allowances. Anything regular that wouldn\'t otherwise show up.', `
        ${choices({ path: 'recurring.has', cols: 2, options: yesNo('Yes, add some', 'No, everything goes through my accounts') })}
        ${state.recurring.has === 'yes' ? rowList('recurring.list', 'recurring', 'Add another', (r, i, p) => `
          <div class="row-item">
            <div class="row-item-head"><span class="row-badge">Expense ${i + 1}</span>${removeBtn('recurring.list', i, 'expense')}</div>
            <div class="grid grid-3">
              ${field({ path: p + '.name', label: 'What', mini: true, placeholder: 'e.g. Rent' })}
              ${field({ path: p + '.amount', label: 'Amount', mini: true, placeholder: 'e.g. 1,850 (or "varies")' })}
              ${field({ path: p + '.frequency', label: 'How often', mini: true, list: 'dl-freq', placeholder: 'e.g. Monthly' })}
            </div>
            <div style="margin-top:12px">${field({ path: p + '.notes', label: 'Notes', mini: true, optional: true, placeholder: 'e.g. Split 60/40 with Alex; paid by check on the 1st' })}</div>
          </div>`) : ''}
      `)}
      ${datalist('dl-freq', ['Monthly', 'Weekly', 'Every 2 weeks', 'Quarterly', 'Yearly'])}
    `;
  }

  function renderOutput() {
    const o = state.output;
    const shared = state.shared.mode === 'shared' && state.shared.perPerson === 'yes';
    const summaryOpts = [
      { value: 'category', title: 'Totals by category' },
      ...(shared ? [{ value: 'person', title: 'Totals per person' }] : []),
      { value: 'mom', title: 'Month-over-month comparison' },
      { value: 'ytd', title: 'Year-to-date totals' },
      { value: 'budget', title: 'Budget vs. actual' },
      { value: 'merchants', title: 'Top merchants' },
      { value: 'recurring', title: 'Subscriptions & recurring charges' },
      { value: 'income', title: 'Income vs. spending (savings rate)' },
      { value: 'charts', title: 'Charts & graphs' }
    ];
    return `
      ${stepHead('Output & review', 'Where will you look at your finished books, and how hands-on do you want to be?')}
      ${card('Where do you want to see your books?', '', `
        ${choices({ path: 'output.format', cols: 2, options: [
          { value: 'excel', title: 'Excel workbook', desc: 'A .xlsx file on your computer. Familiar, easy to edit.' },
          { value: 'sheets', title: 'Google Sheets', desc: 'In your Google Drive; viewable from your phone. Needs a one-time Google connection.' },
          { value: 'dashboard', title: 'Simple web dashboard', desc: 'A private page that runs on your own computer, with charts and click-to-edit.' },
          { value: 'other', title: 'Something else', desc: 'Describe it below.' }
        ] })}
        ${o.format === 'other' ? field({ path: 'output.other', label: 'Describe what you want', multiline: true, placeholder: 'e.g. A CSV I can import into my existing budgeting spreadsheet' }) : ''}
        ${choices({ path: 'output.edits', label: 'Do you want to fix categories directly in that output?', cols: 2, options: yesNo('Yes, let me edit it right there', 'No, I\'ll make changes some other way') })}
        ${o.edits === 'yes' ? choices({ path: 'output.learnFromEdits', label: 'Should the app learn from those edits next time?', cols: 2, options: yesNo('Yes, my corrections should teach it', 'No, just keep my edits') }) : ''}
      `)}
      ${card('How often will you run it?', '', `
        ${choices({ path: 'output.cadence', cols: 3, options: [
          { value: 'monthly', title: 'Monthly' }, { value: 'weekly', title: 'Weekly' }, { value: 'ondemand', title: 'Whenever I feel like it' }
        ] })}
        ${field({ path: 'output.cadenceNotes', label: 'Anything about timing?', optional: true, placeholder: 'e.g. After my statements close around the 5th' })}
      `)}
      ${card('Summaries to calculate automatically', 'Pick any that would be useful. The app will compute them every run.', `
        ${choices({ path: 'output.summaries', multi: true, cols: 2, options: summaryOpts })}
        ${(o.summaries || []).includes('budget') ? field({ path: 'output.budgets', label: 'Your monthly budgets', optional: true, multiline: true, placeholder: 'e.g. Groceries $800, Dining out $300, Entertainment $150 (or leave blank to set them up later)' }) : ''}
        ${field({ path: 'output.summariesOther', label: 'Anything else you want to see?', optional: true, placeholder: 'e.g. How much we spend on the kids each month vs. last year' })}
      `)}
      ${card('Reviewing uncertain transactions', 'Some transactions will always need a human look: new merchants, low-confidence guesses, receipts that didn\'t match a charge.', `
        ${choices({ path: 'output.review', options: [
          { value: 'queue', title: 'Give me a review list; I\'ll approve it, then the month is "final"', tag: 'Recommended', tagAccent: true, desc: 'Clean and deliberate. Books aren\'t considered done until the list is empty.' },
          { value: 'highlight', title: 'Just highlight uncertain rows; I\'ll fix them whenever', desc: 'Lower effort. No formal sign-off step.' },
          { value: 'all', title: 'Let me approve every single transaction', desc: 'Total control. Takes the most time.' }
        ] })}
        ${field({ path: 'output.reviewNotes', label: 'Anything else about reviewing?', optional: true, placeholder: 'e.g. My partner and I review together on the first Sunday of the month' })}
      `)}
    `;
  }

  function renderSafety() {
    const s = state.safety;
    const all = s.local && s.secrets && s.backup;
    return `
      ${stepHead('Safety & trust', 'Your app will handle real bank and card data. These are the ground rules the AI will be told to follow. Please read and confirm each one.')}
      ${card('Ground rules for your data', '', `
        ${toggle({ path: 'safety.local', title: 'Keep everything on my computer by default', desc: 'Statements, receipts, and the ledger stay local. Nothing is uploaded except what you explicitly opt into (like AI suggestions or Google Sheets).' })}
        ${toggle({ path: 'safety.secrets', title: 'Never put passwords, API keys, or statements in a public code repository', desc: 'Keys go in a private settings file; your financial files are excluded from any code backup or sharing.' })}
        ${toggle({ path: 'safety.backup', title: 'Always make a backup before changing my books', desc: 'Any step that rewrites the ledger or spreadsheet first saves a dated copy, so a bug can never wipe out your data.' })}
        ${all ? callout('Great. These rules will be written into the spec as non-negotiable requirements.') : callout('These rules go into the spec either way. Checking them confirms you understand what the app will (and won\'t) do with your data.', 'warn')}
      `)}
      ${card('Will the app\'s code be saved to GitHub or similar?', 'Coding agents often use "git" to track changes. That\'s fine, as long as your financial data never goes with it.', `
        ${choices({ path: 'safety.repo', options: [
          { value: 'none', title: 'No, keep it only on my computer' },
          { value: 'private', title: 'Yes, in a private repository' },
          { value: 'unsure', title: 'I don\'t know what that means', desc: 'No problem. The app will be set up so this is safe either way.' }
        ] })}
      `)}
    `;
  }

  function renderResult() {
    const { text, gaps } = buildPrompt(state);
    const words = text.split(/\s+/).filter(Boolean).length;
    const gapList = gaps.length ? `
      ${card(`${gaps.length} open question${gaps.length === 1 ? '' : 's'}`, 'These are marked <code>[ASK USER]</code> in the prompt, so the AI will ask you about them instead of guessing. You can answer them now if you like.', `
        <ul class="gaps">${gaps.map((g) => `<li><span>${esc(g.what)} <span class="gap-step">· ${esc(STEPS[g.step].nav)}</span></span><button type="button" class="btn btn-sm btn-secondary" data-action="goto" data-step="${g.step}">Answer</button></li>`).join('')}</ul>
      `)}` : callout('Every question is answered. The AI should be able to start building right away.');
    return `
      <div class="step-head">
        <div class="eyebrow">All done</div>
        <h1>Your build prompt is ready</h1>
        <p>This is a complete spec for your custom accounting app. Copy it or download it, then give it to an AI coding agent. Change any answer and come back; it regenerates instantly.</p>
      </div>
      <div class="result-actions">
        <button type="button" class="btn btn-primary btn-lg" data-action="copy">${ICON.copy}Copy to clipboard</button>
        <button type="button" class="btn btn-secondary btn-lg" data-action="download">${ICON.download}Download as .md</button>
      </div>
      <div class="stats"><span><b>${words.toLocaleString()}</b> words</span><span><b>${(state.accounts.filter((a) => t(a.label)).length)}</b> accounts</span><span><b>${state.categories.length}</b> categories</span><span><b>${gaps.length}</b> open questions</span></div>
      <textarea class="prompt-box" id="resultText" readonly spellcheck="false" aria-label="Generated build prompt">${esc(text)}</textarea>
      <div style="height:18px"></div>
      ${gapList}
      ${card('What to do with it', '', `
        <ol class="next-steps">
          <li>Make an empty folder for your new app, e.g. <code>my-money-app</code>.</li>
          <li>Open Claude Code (or your coding agent of choice) in that folder.</li>
          <li>Paste the prompt, or save the downloaded file there and say <code>Build the app described in accounting-app-build-prompt.md</code>.</li>
          <li>Answer its questions, then hand it one sample export per account when it asks. That's how it learns your exact file formats.</li>
        </ol>
      `)}
    `;
  }

  // ---------- Prompt generation ----------
  const joinList = (arr) => {
    const a = arr.filter(Boolean);
    if (a.length <= 1) return a.join('');
    if (a.length === 2) return `${a[0]} and ${a[1]}`;
    return `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`;
  };
  const cell = (s) => (t(s) || '—').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
  const quote = (s) => `"${t(s).replace(/\s*\n\s*/g, ' ')}"`;

  const PARSERS = {
    csv: { name: 'CSV / spreadsheet export', guide: 'One column-mapping entry per institution in config (date column + format, description, amount or separate debit/credit columns, sign convention, header row). Tolerate extra/blank rows and both US and ISO date formats.' },
    pdf: { name: 'PDF statement / document', guide: 'Extract text with a solid PDF library and keep a per-issuer layout profile in config. PDF layouts are fragile: reconcile parsed rows against the document\'s own stated totals/balances where available and fail loudly on mismatch.' },
    ofx: { name: 'OFX / QFX / QIF file', guide: 'Use an existing parsing library. These files carry stable per-transaction IDs (e.g. FITID); store them and use them to strengthen dedup.' },
    manual: { name: 'Manual entry', guide: 'Provide a simple input path (a CSV template the user fills in, or a small entry form) that writes into the same ledger with `source = manual`.' },
    aggregator: { name: 'Bank aggregator / API connection', guide: 'Confirm the exact service with the user. Tokens/keys live only in a local `.env`. Keep it optional: file-based import must still work if the connection breaks or the service changes.' },
    email: { name: 'Emailed receipts / confirmations', guide: 'Simplest robust path: the user saves emails (as .eml or PDF) into an inbox folder that the app parses. Do not build direct mailbox access unless the user asks for it.' },
    photo: { name: 'Photographed paper receipts', guide: 'Needs an image-to-text step. See "Receipt photos" below.' },
    app: { name: 'Store app / loyalty program export', guide: 'Confirm the exact export format (CSV, PDF, email) with a sample before writing the parser.' },
    web: { name: 'Website order history', guide: 'Prefer an official order-history or data export (CSV/PDF) over scraping. Scraping logged-in pages is brittle and should be a last resort, only with the user\'s agreement.' },
    other: { name: 'Other / not yet specified', guide: 'Get a sample from the user before designing the parser.' }
  };
  function parserKind(src) {
    const s = t(src).toLowerCase();
    if (!s) return null;
    if (/photo|picture|image|snap|camera/.test(s)) return 'photo';
    if (/e-?mail|gmail|outlook|inbox/.test(s)) return 'email';
    if (/plaid|aggregat|simplefin|teller|yodlee|\bapi\b|direct connect/.test(s)) return 'aggregator';
    if (/\b(ofx|qfx|qif)\b|quicken/.test(s)) return 'ofx';
    if (/csv|excel|xlsx?\b|spreadsheet/.test(s)) return 'csv';
    if (/pdf/.test(s)) return 'pdf';
    if (/manual|by hand|type it|typed|enter it/.test(s)) return 'manual';
    if (/\bapp\b|loyalty|rewards/.test(s)) return 'app';
    if (/website|order history|online|web/.test(s)) return 'web';
    return 'other';
  }

  function buildPrompt(s) {
    const gaps = [];
    const ask = (what, step) => { gaps.push({ what, step }); return `\`[ASK USER: ${what}]\``; };
    const L = [];
    const p = (...lines) => L.push(...lines);

    const who = t(s.about.name);
    const owner = who ? `the user (${who})` : 'the user';
    const currency = t(s.about.currency) || 'USD';
    const accounts = s.accounts.filter((a) => t(a.label) || t(a.source) || t(a.kind));
    const shared = s.shared.mode === 'shared';
    const perPerson = shared && s.shared.perPerson === 'yes';
    const people = t(s.shared.people);
    const transfers = s.transfers.has === 'yes' ? s.transfers.list.filter((x) => t(x.label) || t(x.purpose)) : [];
    const stores = s.stores.has === 'yes' ? s.stores.list.filter((x) => t(x.name) || t(x.source)) : [];
    const market = s.marketplace.has === 'yes';
    const marketName = t(s.marketplace.which) || 'marketplace';
    const photos = s.receipts.mode === 'yes' || s.receipts.mode === 'sometimes';
    const recurring = s.recurring.has === 'yes' ? s.recurring.list.filter((x) => t(x.name) || t(x.amount)) : [];
    const learn = s.learning !== 'manual';
    const ai = s.ai;
    const usesAI = ai.mode === 'api' || ai.mode === 'local';
    const threshold = Number(ai.threshold) || 85;
    const o = s.output;
    const itemized = stores.length > 0 || market || photos;
    const editLearn = o.edits === 'yes' && o.learnFromEdits === 'yes' && learn;
    const cadenceWord = { monthly: 'monthly', weekly: 'weekly', ondemand: 'on-demand' }[o.cadence] || 'monthly';
    const formatName = {
      excel: 'an Excel workbook (.xlsx)',
      sheets: 'a Google Sheets spreadsheet',
      dashboard: 'a simple local web dashboard',
      other: t(o.other) ? `"${t(o.other)}"` : null
    }[o.format];
    const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    // ---- Header
    p(`# Build request: personal monthly accounting app${who ? ` for ${who}` : ''}`, '');
    p(`> Generated by **Accounting App Builder** on ${today} from an interview with ${owner}.`);
    p('> Read the entire spec before writing code. Anything marked `[ASK USER: …]` was not answered in the interview: ask the user about it before building the part it affects, and never fill it in with a guess. Everything else reflects the user\'s actual answers; build to it.', '');

    // ---- 1. Goal
    const acctLabels = accounts.map((a) => t(a.label)).filter(Boolean);
    const acctPhrase = accounts.length
      ? `${accounts.length} account${accounts.length === 1 ? '' : 's'}${acctLabels.length ? ` (${joinList(acctLabels)})` : ''}`
      : 'their cards and bank accounts';
    const extras = [];
    if (stores.length) extras.push(`break purchases at ${joinList(stores.map((x) => t(x.name) || 'an itemized store'))} down item by item`);
    if (market) extras.push(`expand ${marketName} orders into the individual items purchased`);
    if (photos) extras.push('read photographed paper receipts into line items');
    if (recurring.length) extras.push(`fold in recurring non-card expenses (${joinList(recurring.map((r) => t(r.name)).filter(Boolean)) || 'listed below'})`);
    if (perPerson) extras.push(`attribute every expense to a person${people ? ` (${people})` : ''} as well as a category`);
    const aiSentence = ai.mode === 'api' ? 'Merchants and items it hasn\'t seen before get a category suggestion from a paid AI API; low-confidence suggestions go to a review queue instead of being trusted.'
      : ai.mode === 'local' ? 'Merchants and items it hasn\'t seen before get a category suggestion from a free AI model running locally; low-confidence suggestions go to a review queue instead of being trusted.'
      : ai.mode === 'skip' ? 'It does not use AI: anything it can\'t categorize from rules or history is flagged for the user to categorize by hand.'
      : '';
    const learnSentence = learn
      ? `It should learn from the user's categorization choices${editLearn ? ' (including corrections they make directly in the output)' : ''} so that each period needs less manual work than the last.`
      : 'The user prefers to categorize transactions by hand each time, so it should not auto-apply learned categories (keyword rules still apply).';
    p('## 1. Goal', '');
    p(`Build a private, local-first app that produces ${who ? `${who}'s` : 'the user\'s'} personal books on a ${cadenceWord} basis. Each run it should import transactions from ${acctPhrase}${extras.length ? `, ${joinList(extras)}` : ''}; sort every expense into the ${s.categories.length ? s.categories.length + ' ' : ''}spending categories the user chose; and deliver the result as ${formatName || 'an output format still to be decided'}, where the user reviews and corrects it. ${aiSentence} ${learnSentence} The end state each period is a set of books the user can trust: every transaction categorized, nothing double-counted, and anything uncertain explicitly reviewed rather than silently guessed. All amounts are in ${currency}.`.replace(/\s+/g, ' ').trim(), '');
    if (!formatName) ask('preferred output format (Excel, Google Sheets, web dashboard, other)', 6);

    // ---- 2. Data sources
    p('## 2. Data sources', '');
    p('**Rule for every parser:** before writing it, ask the user for one real sample file for that source (redacted if they prefer) and build and test against its exact layout. Never guess column names or statement layouts. Commit only synthetic fixtures derived from the sample, never the real file.', '');

    p('### 2.1 Accounts and cards', '');
    const usedParsers = {};
    const noteParser = (src, label) => { const k = parserKind(src); if (k) (usedParsers[k] = usedParsers[k] || []).push(label); };
    if (accounts.length) {
      p(`| # | Account | Type | How transaction data arrives |${shared ? ' Owner / user |' : ''} Notes |`);
      p(`|---|---|---|---|${shared ? '---|' : ''}---|`);
      accounts.forEach((a, i) => {
        const label = t(a.label) || ask(`label for account #${i + 1}`, 1);
        const src = t(a.source) ? cell(a.source) : ask(`how transactions for ${t(a.label) ? quote(a.label) : `account #${i + 1}`} are obtained`, 1);
        if (/not sure/i.test(a.source)) gaps.push({ what: `best export method for ${t(a.label) || `account #${i + 1}`} (user is unsure)`, step: 1 });
        p(`| ${i + 1} | ${cell(label)} | ${cell(a.kind)} | ${src} |${shared ? ` ${cell(a.owner)} |` : ''} ${cell(a.notes)} |`);
        noteParser(a.source, t(a.label) || `account #${i + 1}`);
      });
      p('');
    } else {
      p(`${ask('which cards/accounts to track and how each one\'s transaction history is obtained', 1)}`, '');
    }
    p('Each account must be defined in the config file (label, type, owner if applicable, parser to use, and any parser settings), so adding a card later is a one-entry config change.', '');

    p('### 2.2 People', '');
    if (s.shared.mode === 'solo') {
      p('All accounts belong to one person. No per-person attribution is needed.', '');
    } else if (shared) {
      p(`Accounts are shared. People: ${people || ask('names of the people sharing the accounts', 1)}.`);
      if (perPerson) {
        p('- Track spending **per person as well as per category**. Every transaction and line item carries a `person` field (or "shared"/split).');
        p(`- How to attribute purchases: ${t(s.shared.notes) ? quote(s.shared.notes) : ask('how the app should tell whose purchase is whose (card last-4, account, split rule)', 1)}`);
        p('- Default attribution should come from config (e.g. per account or per card number); learned and manual corrections override it.');
      } else if (s.shared.perPerson === 'no') {
        p('- The user does **not** need per-person attribution; categorize by category only.');
        if (t(s.shared.notes)) p(`- Additional context: ${quote(s.shared.notes)}`);
      } else {
        p(`- Per-person attribution: ${ask('whether to attribute spending per person as well as per category', 1)}`);
      }
      p('');
    } else {
      p(`${ask('whether anyone else shares these accounts (and if per-person tracking is wanted)', 1)}`, '');
    }

    p('### 2.3 Internal transfers and separately tracked accounts', '');
    p('Always detect ordinary internal transfers (credit-card payments from checking, moves between the user\'s own accounts, refunds) so they are never counted as spending.');
    if (transfers.length) {
      p('In addition, the user wants these tracked **separately** from personal spending (their own ledger section/summary, excluded from spending totals):');
      transfers.forEach((x) => p(`- **${t(x.label) || 'Unnamed'}**${t(x.purpose) ? `: ${t(x.purpose)}` : ''}`));
    } else if (s.transfers.has === 'no') {
      p('The user has no other accounts that need to be tracked separately.');
    } else {
      p(`Separately tracked accounts: ${ask('any accounts (shared property, joint savings goal, kid\'s account) to track separately from personal spending', 1)}`);
    }
    p('');

    p('### 2.4 Itemized stores (line-item breakdown)', '');
    if (stores.length) {
      p('Purchases at these stores must be broken into individual line items, each categorized on its own:', '');
      p('| Store | How itemized data arrives | Notes |', '|---|---|---|');
      stores.forEach((x, i) => {
        const nm = t(x.name) || ask(`name of itemized store #${i + 1}`, 2);
        const src = t(x.source) ? cell(x.source) : ask(`how itemized receipts for ${t(x.name) ? quote(x.name) : `store #${i + 1}`} are obtained`, 2);
        p(`| ${cell(nm)} | ${src} | ${cell(x.notes)} |`);
        noteParser(x.source, t(x.name) || `store #${i + 1}`);
      });
      p('');
    } else if (s.stores.has === 'no') {
      p('None. Card charges at stores are treated as single transactions. (Keep the design extensible so an itemized store can be added later via config.)', '');
    } else {
      p(`${ask('which stores (if any) to itemize line-by-line, and how receipts are obtained', 2)}`, '');
    }

    p('### 2.5 Marketplace orders', '');
    if (market) {
      p(`The user wants ${marketName} purchases shown as the actual items bought, not a single lump charge.`);
      p(`- How the user can access order history: ${t(s.marketplace.access) ? quote(s.marketplace.access) : ask(`how ${marketName} order history can be accessed`, 2)}`);
      p('- Prefer an official order-history/data export over scraping. Confirm with the user which export they will provide and get a sample.');
      p('- Expect one order to be charged as several card transactions (split shipments), charges posting days after the order date, and partial payment with gift cards/points/refunds. The matcher in §6 must handle these.');
      if (/second|another|separate|partner|shared|two|both|household/i.test(s.marketplace.access)) p('- More than one marketplace login is involved: tag each order with which account it came from and handle each login\'s export separately.');
      noteParser(s.marketplace.access || 'website', `${marketName} orders`);
      p('');
    } else if (s.marketplace.has === 'no') {
      p('Not needed. Marketplace purchases stay as single card charges.', '');
    } else {
      p(`${ask('whether to itemize Amazon/marketplace orders, and how order history is accessed', 2)}`, '');
    }

    p('### 2.6 Receipt photos', '');
    if (photos) {
      p(`The user ${s.receipts.mode === 'yes' ? 'regularly' : 'occasionally'} photographs paper receipts and wants them line-itemized. This requires an **image-to-text (vision/OCR) step**.`);
      if (t(s.receipts.stores)) p(`- Typical receipts: ${quote(s.receipts.stores)}`);
      p(`- Where photos come from: ${t(s.receipts.notes) ? quote(s.receipts.notes) : ask('where receipt photos are stored / how they get to the app', 5)}`);
      if (ai.mode === 'api') p('- Use the same AI provider\'s vision capability to extract store, date, line items, subtotal, tax and total as structured JSON.');
      else if (ai.mode === 'local') p('- Use a local vision-capable model or a local OCR engine; nothing leaves the machine.');
      else if (ai.mode === 'skip') p('- The user opted out of AI, so use free offline OCR (e.g. Tesseract) plus heuristics. Expect lower accuracy and route anything that fails validation to review.');
      else p(`- Vision approach: ${ask('which AI/OCR approach to use for receipt photos', 4)}`);
      p('- Every extracted receipt must pass the subtotal validation in §5 before it is trusted; otherwise queue it for review with the image linked.');
      p('- Store a reference to the original image with its line items, never delete the source photo.');
      noteParser('photo', 'receipt photos');
      p('');
    } else if (s.receipts.mode === 'no') {
      p('Not needed. The user does not photograph receipts.', '');
    } else {
      p(`${ask('whether the user photographs paper receipts that should be line-itemized', 5)}`, '');
    }

    p('### 2.7 Recurring non-card expenses', '');
    if (recurring.length) {
      p('Add these to the ledger automatically each period (from config) so the books are complete. Mark them `source = recurring` and let the user adjust amounts for a given period:', '');
      p('| Expense | Amount | Frequency | Notes |', '|---|---|---|---|');
      recurring.forEach((r) => p(`| ${cell(r.name)} | ${cell(r.amount)} | ${cell(r.frequency)} | ${cell(r.notes)} |`));
      p('');
      p('If any of these also appear as a transaction in an imported account (e.g. autopay from checking), detect it and do not double-count.', '');
    } else if (s.recurring.has === 'no') {
      p('None. All expenses flow through the tracked accounts.', '');
    } else {
      p(`${ask('any recurring non-card expenses (rent, utilities, mortgage split) to include', 5)}`, '');
    }

    p('### 2.8 Parsers to build', '');
    const kinds = Object.keys(usedParsers);
    if (kinds.length) {
      kinds.forEach((k) => p(`- **${PARSERS[k].name}**, used by ${joinList(usedParsers[k])}. ${PARSERS[k].guide}`));
    } else {
      p('No sources have been specified yet. Design a parser plug-in interface (one module per source type, selected via config), and confirm sources with the user first.');
    }
    if (t(s.about.history)) p('', `**Initial import:** ${quote(s.about.history)}. Make the first run able to process a backlog of older files.`);
    p('');

    // ---- 3. Data model
    p('## 3. Data model', '');
    p('Use a single local **SQLite** database (e.g. `data/ledger.db`) as the source of truth. Store money as integer cents to avoid floating-point drift. Recommended tables:', '');
    p(`- **transactions**: \`id\`, \`txn_hash\` (unique; see §5), \`account\`, \`posted_date\`, \`description_raw\`, \`merchant_normalized\`, \`amount_cents\` (signed), \`category\`,${perPerson ? ' `person`,' : ''} \`status\` (\`auto\` / \`suggested\` / \`needs_review\` / \`confirmed\`), \`categorized_by\` (\`learned\` / \`rule\` / ${usesAI ? '`llm` / ' : ''}\`manual\`), \`confidence\`, \`is_transfer\`, \`excluded_reason\` (e.g. matched to an itemized receipt), \`source_file_id\`, \`period\` (YYYY-MM), \`notes\`, timestamps.`);
    if (itemized) {
      p('- **receipts** (one row per itemized receipt or marketplace order): `id`, `store`, `order_date`, `subtotal_cents`, `tax_cents`, `total_cents`, `source_file_id`, `matched_transaction_ids`, `validation_status`, `image_path` (for photos).');
      p(`- **line_items**: \`id\`, \`receipt_id\`, \`description_raw\`, \`item_normalized\`, \`quantity\`, \`amount_cents\`, \`category\`,${perPerson ? ' `person`,' : ''} \`status\`, \`categorized_by\`, \`confidence\`.`);
    }
    p(`- **learned_categories**: keyed by normalized merchant${itemized ? ' or item description' : ''} (\`key\`, \`key_type\`), with \`category\`,${perPerson ? ' optional `person`,' : ''} \`trust_source\` (\`manual_edit\` > \`review_confirmed\` > \`historical\`), \`times_seen\`, \`last_seen\`. ${learn ? '' : '(The user opted out of auto-learning; still record confirmed choices for reference, but do not auto-apply them unless the user turns learning on in config.)'}`.trim());
    p('- **ingested_files**: `id`, `path`, `file_sha256`, `source_type`, `account`, `ingested_at`, `row_count`, `status`. Used to make re-runs safe.');
    if (perPerson) p('- **people** (or a config list): the household members spending is attributed to, plus a "shared" option and split rules.');
    if (recurring.length) p('- **recurring_expenses** materialized per period from config.');
    p('- **periods**: `period`, `status` (`open` / `final`), `finalized_at`, so finished months are protected from accidental re-categorization.');
    p('');

    // ---- 4. Categorization
    p('## 4. Categorization strategy', '');
    p(`**Categories** (from config, user-editable): ${s.categories.length ? s.categories.join(', ') : ask('the list of spending categories', 3)}.`, '');
    const rules = s.rules.filter((r) => t(r.match) || t(r.category));
    p('**Keyword rules** (config, case-insensitive match on the normalized description):', '');
    if (rules.length) {
      p('| If description contains | Category |', '|---|---|');
      rules.forEach((r, i) => p(`| ${cell(r.match) === '—' ? ask(`keyword for rule #${i + 1}`, 3) : '`' + cell(r.match) + '`'} | ${t(r.category) ? cell(r.category) : ask(`category for rule "${t(r.match)}"`, 3)} |`));
      const unknown = rules.filter((r) => t(r.category) && !s.categories.some((c) => c.toLowerCase() === t(r.category).toLowerCase()));
      if (unknown.length) p('', `Note: rule categories not in the category list (${joinList(unknown.map((r) => quote(r.category)))}); add them to the list or ask the user which category was meant.`);
    } else {
      p('None specified yet. The config must still support rules (substring or regex → category), since the user will want to add them over time.');
    }
    p('');
    p('**Tiered pipeline.** For each transaction and line item, apply the first tier that produces an answer:', '');
    let n = 1;
    if (learn) p(`${n++}. **Exact learned match**: look up the normalized merchant/item in \`learned_categories\`; higher-trust sources win ties.`);
    p(`${n++}. **Keyword rules** from config.${learn ? ' (Rules beat historical learned data but not explicit manual edits; make that precedence configurable.)' : ''}`);
    if (ai.mode === 'api') {
      const provider = t(ai.provider);
      const provTxt = !provider ? ask('preferred AI provider/model for category suggestions (or "no preference")', 4)
        : /no pref/i.test(provider) ? 'no preference: choose a current, low-cost model from a major provider and make the provider/model a one-line config change'
        : `**${provider}**${t(ai.model) ? `, model: ${t(ai.model)}` : ' (pick a current, cost-efficient model; make it a one-line config change)'}`;
      p(`${n++}. **LLM suggestion via paid API**, provider: ${provTxt}.`);
      p(`   - Batch all unknowns from a run into as few requests as practical. Constrain output to the configured category list (structured/JSON output) and require a confidence score per item.`);
      p(`   - Auto-accept only at **≥ ${threshold}% confidence** (configurable). Anything lower is saved as \`suggested\` and **still queued for human review**.`);
      p('   - Send only the merchant description / item text, amount and date. Never account numbers, names, or full statements.');
      p('   - API key from an environment variable / local `.env`. Cache responses so re-runs don\'t re-bill. Print the estimated cost of each run (typically cents).');
      if (t(ai.budget)) p(`   - Spending cap: ${quote(ai.budget)}. Stop and warn before exceeding it.`);
    } else if (ai.mode === 'local') {
      const tool = t(ai.localTool);
      p(`${n++}. **LLM suggestion via a free local model**, tool: ${tool && !/no pref/i.test(tool) ? `**${tool}**` : 'no preference: recommend the simplest option for a non-expert and document the one-time install in the README'}.${t(ai.hardware) ? ` User's computer: ${quote(ai.hardware)}; choose a model size that runs acceptably on it.` : ''}`);
      p('   - Constrain output to the configured category list and require a confidence score per item.');
      p(`   - Auto-accept only at **≥ ${threshold}% confidence** (configurable). Anything lower is saved as \`suggested\` and **still queued for human review**.`);
      p('   - Nothing leaves the machine. If the local model isn\'t running, skip this tier gracefully and queue items for review instead of failing the run.');
    } else if (ai.mode === 'skip') {
      p(`${n++}. **No automated suggestions.** The user chose to skip AI entirely: do not call any LLM.`);
    } else {
      p(`${n++}. **LLM suggestion tier:** ${ask('whether to use AI suggestions (paid API, free local model, or skip)', 4)}`);
    }
    p(`${n++}. **Manual review**: anything still uncategorized is flagged \`needs_review\` and shown in the review workflow (§8).`, '');
    if (learn) p('Every human decision (review confirmation or manual edit) is written back to `learned_categories` with the appropriate trust level, so the same merchant/item is handled automatically next time.', '');

    // ---- 5. Ingestion
    p('## 5. Ingestion and dedup requirements', '');
    p('- **Idempotent.** Running the import twice on the same files must change nothing. Record every file\'s SHA-256 in `ingested_files` and skip files already processed (by content hash, not filename, since renamed copies are common).');
    p('- **Transaction-level dedup by content hash.** Compute `txn_hash` from account + posted date + amount + normalized description (plus a per-file occurrence index so two genuinely identical charges on the same day are both kept). Overlapping statement downloads (e.g. a "last 90 days" CSV pulled every month) must never double-count.');
    p('- **Inbox workflow.** The user drops new files into an `inbox/` folder (sub-folder per account/store is fine). After a successful import, move/copy them to an `archive/` folder; never delete originals.');
    if (itemized) p('- **Validate every itemized receipt/order against its own stated subtotal/total** (sum of line items ± tax, discounts, fees, within 1 cent) before trusting it. On mismatch, do not import silently: quarantine it, report it in the run summary, and add it to the review queue. This catches silent parser drift when a vendor changes its export format.');
    else p('- If itemized receipts/orders are added later, each must be validated against its own stated subtotal/total before being trusted (catches silent parser drift when a vendor changes its export format).');
    p('- **Fail loudly, not silently.** Any file that can\'t be parsed, has unexpected columns, or yields zero rows is reported clearly; the run continues with other files.');
    p('- **Dry-run mode** that shows what would be imported/changed without writing anything.');
    p('- End every run with a short summary: files processed/skipped, transactions added, duplicates ignored, items auto-categorized vs. queued for review' + (ai.mode === 'api' ? ', and estimated AI cost' : '') + '.', '');

    // ---- 6. Matching
    p('## 6. Matching and dedup across sources', '');
    if (itemized) {
      const sourcesTxt = joinList([
        ...stores.map((x) => t(x.name)).filter(Boolean),
        market ? `${marketName} orders` : '',
        photos ? 'photographed receipts' : ''
      ]);
      p(`Itemized sources (${sourcesTxt || 'see §2'}) will also appear as a lump charge on a card or bank account. The app must match each receipt/order to its card charge(s) and **exclude the matched card charge from totals** (mark \`excluded_reason\`, never delete it) so spending is not double-counted; the line items carry the categories instead.`, '');
      p('- Match on merchant (via config patterns per store), amount (exact to the cent, allowing for configured tip/fee cases), and a date window: default **±3 days** for in-store receipts, wider (e.g. up to 10 days) for marketplace orders that charge on shipment. Make windows configurable per source.');
      if (market) p(`- ${marketName}: support one order → many charges (split shipments) and many orders → one charge; match by sum where needed. Handle refunds/returns as negative line items linked to the original order.`);
      p('- Unmatched receipts and unmatched store charges both go to the review queue. Never guess a match below a clear confidence bar.');
      p('- Matching must be re-runnable: re-importing the same receipt never creates a second exclusion or duplicate line items.', '');
    } else {
      p('No itemized sources were specified, so no receipt-to-charge matching is needed now. Still structure the code so a matcher (receipt/order ↔ card charge within a date window, excluding the lump charge from totals) can be added when an itemized source is configured.', '');
    }

    // ---- 7. Output
    p('## 7. Output format', '');
    if (o.format === 'excel') {
      p('Generate an **Excel workbook (.xlsx)** on the user\'s computer (e.g. one workbook per year with a sheet per month, or one per month; ask which if it matters to them). Include:');
      p(`- A **Transactions** sheet (date, account, description, amount, category${perPerson ? ', person' : ''}, status, notes) with a data-validation **dropdown of the configured categories** on the category column.`);
      if (itemized) p('- A **Line items** sheet for itemized receipts/orders, linked to their parent receipt.');
      p('- A **Summary** sheet with the summaries below, and a **Review** sheet listing anything still needing attention.');
      p('- Use formatting that makes it pleasant to read: frozen header row, currency formats, column widths, highlighted rows for items needing review.');
    } else if (o.format === 'sheets') {
      p('Publish to **Google Sheets** in the user\'s Drive, with the same structure as an Excel workbook: Transactions (category dropdown via data validation), ' + (itemized ? 'Line items, ' : '') + 'Summary, and Review tabs.');
      p('- Use the official Google Sheets API with OAuth for the user\'s own account; store the credentials/token locally (never committed). Walk the user through the one-time Google setup in the README.');
      p('- The SQLite ledger remains the source of truth; the Sheet is a view the user can edit.');
    } else if (o.format === 'dashboard') {
      p('Build a **simple local web dashboard** served only on `127.0.0.1` (never exposed to the network). Include:');
      p(`- A transactions table with search/filter by period, account, category${perPerson ? ', person' : ''} and status, and **click-to-edit categories** via a dropdown.`);
      if (itemized) p('- Expandable rows showing line items for itemized receipts/orders.');
      p('- A summary view with the summaries below, and a review queue view.');
      p('- Keep the stack light (no heavy frontend build step unless clearly justified). Also offer a CSV export of each period.');
    } else if (o.format === 'other' && t(o.other)) {
      p(`The user asked for: ${quote(o.other)}. Build exactly that, with the SQLite ledger as the source of truth.`);
    } else {
      p(`Output format: ${ask('preferred output format (Excel, Google Sheets, web dashboard, other)', 6)}`);
    }
    p('');
    const SUMMARY_TEXT = {
      category: 'Totals by category for the period',
      person: 'Totals per person (and per person per category)',
      mom: 'Month-over-month comparison by category (amount and % change)',
      ytd: 'Year-to-date totals by category',
      budget: 'Budget vs. actual per category',
      merchants: 'Top merchants by spend',
      recurring: 'Detected subscriptions and recurring charges (flag new or changed ones)',
      income: 'Income vs. spending and savings rate',
      charts: 'Charts: spending by category and trends over time'
    };
    const sums = (o.summaries || []).filter((k) => SUMMARY_TEXT[k] && (k !== 'person' || perPerson));
    p('**Automatic summaries** (computed every run):');
    if (sums.length || t(o.summariesOther)) {
      sums.forEach((k) => p(`- ${SUMMARY_TEXT[k]}`));
      if (sums.includes('budget')) p(`  - Budgets (store in config): ${t(o.budgets) ? quote(o.budgets) : ask('monthly budget amounts per category', 6)}`);
      if (t(o.summariesOther)) p(`- Also requested: ${quote(o.summariesOther)}`);
    } else {
      p(`- ${ask('which summaries/charts to compute automatically', 6)}`);
    }
    p('- Internal transfers and separately tracked accounts are excluded from spending totals and shown on their own.', '');

    p('**Manual edits in the output:**');
    if (o.edits === 'yes') {
      p('- The user wants to correct categories directly in the output.');
      if (editLearn) {
        p('- Provide a **re-import step** that reads the edited output back, diffs it against the ledger, and records each changed category as a manual correction.');
        p('- Manual corrections get the **highest trust weight** (above review confirmations, well above passively observed history) in `learned_categories`, and are never overwritten by lower-trust sources such as rules applied later or LLM suggestions.');
        p('- Regenerating the output must never silently discard edits the user hasn\'t re-imported yet. Detect un-imported edits and import (or warn) first, and back up the file before overwriting it.');
      } else {
        p('- Read edits back into the ledger so they are preserved, but do not use them to auto-categorize future transactions' + (learn ? ' (the user chose not to learn from edits).' : ' (the user opted out of learning).'));
        p('- Never silently discard edits when regenerating; back up the file before overwriting it.');
      }
    } else {
      p('- The user does not want to edit the output directly. Treat it as read-only and make corrections through the review workflow instead.');
    }
    p('');

    // ---- 8. Review
    p('## 8. Review workflow', '');
    const cadenceTxt = { monthly: 'monthly', weekly: 'weekly', ondemand: 'on demand, whenever the user chooses (no fixed schedule)' }[o.cadence];
    p(`- **Cadence:** ${cadenceTxt || ask('how often the app will be run', 6)}.${t(o.cadenceNotes) ? ` Timing note: ${quote(o.cadenceNotes)}.` : ''} The routine is: drop new files in the inbox → run one command → review → done.`);
    if (o.review === 'queue') {
      p('- **Review queue, then sign-off.** Each run produces a review list of everything `needs_review` or `suggested` below threshold' + (itemized ? ', plus unmatched receipts/charges and failed receipt validations' : '') + '. The user approves or fixes each item. A period can only be marked **final** when the queue is empty; finalized periods are protected from accidental changes (re-opening is an explicit action).');
    } else if (o.review === 'highlight') {
      p('- **Highlight, no formal sign-off.** Uncertain items are clearly highlighted in the output and listed in the run summary; the user fixes them whenever convenient. No "final" gate is required, but still record which items were human-confirmed.');
    } else if (o.review === 'all') {
      p('- **Approve everything.** Every transaction and line item requires explicit user approval, even when categorized automatically (pre-fill the suggestion so approving is one click/keystroke). A period is final only when all items are approved.');
    } else {
      p(`- Review style: ${ask('how the user wants to review/approve uncertain transactions', 6)}`);
    }
    p('- The review interface should show, per item: date, account, raw description, amount, proposed category and where it came from (learned / rule' + (usesAI ? ' / AI + confidence' : '') + '), with fast accept/change actions.');
    if (t(o.reviewNotes)) p(`- User note: ${quote(o.reviewNotes)}`);
    p('');

    // ---- 9. Guardrails
    p('## 9. Engineering guardrails', '');
    p('- **Local by default.** All data stays on the user\'s machine. The only outbound calls are ones the user opted into' + (ai.mode === 'api' ? ' (AI category suggestions' + (o.format === 'sheets' ? ', Google Sheets' : '') + ')' : o.format === 'sheets' ? ' (Google Sheets)' : '') + '. No telemetry or analytics.');
    p('- **Back up before any destructive rewrite.** Before any operation that rewrites the ledger, the output file, or the config, save a timestamped copy to `backups/` (keep the last N, configurable). Also provide a simple restore command.');
    p('- **One config file** (e.g. `config.yaml` or `config.toml`) holds all accounts, stores, parsers, categories, keyword rules,' + (perPerson ? ' people and split rules,' : '') + (recurring.length ? ' recurring expenses,' : '') + ' matching windows, AI settings and thresholds. Nothing user-specific is hardcoded; adding a new card later is a one-entry config change. Validate the config on startup with friendly error messages.');
    p('- **Secrets and data never in version control.** API keys/tokens in a local `.env` (provide `.env.example`). A `.gitignore` that excludes `.env`, `data/`, `inbox/`, `archive/`, `backups/`, output files and any real statements/receipts from day one.');
    if (s.safety.repo === 'private') p('  - The user plans to keep the code in a **private** remote repository. Even so, no financial data or secrets may ever be committed; consider a pre-commit check that blocks CSV/PDF/image files outside test fixtures.');
    else if (s.safety.repo === 'none') p('  - The user wants the code kept **only on their computer** (no remote repository). Local git for history is fine.');
    else if (s.safety.repo === 'unsure') p('  - The user is unfamiliar with git. Set things up so this is safe by default, and briefly explain in the README what is and isn\'t safe to share.');
    p('- **Tests** with small synthetic fixtures (never real statements) for: each parser, `txn_hash` dedup and idempotent re-import, receipt subtotal validation, cross-source matching, and the categorization tier order.');
    const osName = { windows: 'Windows', mac: 'macOS', linux: 'Linux' }[s.about.os];
    p(`- **Platform:** ${osName ? `the user runs **${osName}**; make sure setup and the run command work there.` : ask('which operating system the app will run on', 0)} Python 3 with minimal, well-known dependencies is a sensible default unless you have a strong reason otherwise.`);
    const readme = {
      novice: 'The user has **never used a terminal**: write the README for a complete beginner, with copy-paste commands, what success looks like at each step, and fixes for common errors. Provide a double-clickable run script' + (osName === 'Windows' ? ' (`.bat`)' : osName === 'macOS' ? ' (`.command`)' : '') + ' so the monthly run needs no typing.',
      some: 'The user can follow step-by-step instructions: number every setup step and include the exact commands.',
      comfortable: 'The user is comfortable with developer tools; a concise README is fine.'
    }[s.about.comfort];
    p(`- **README** covering: one-time setup, where to put files, the ${cadenceWord} run routine (step by step), how to review, how to add a new account/store/category/rule, how backups and restore work${usesAI ? ', how to set the AI key/model and expected cost' : ''}. ${readme || ''}`.trim());
    p('- Suggested layout: `config.*`, `.env.example`, `inbox/`, `archive/`, `data/ledger.db`, `backups/`, `output/`, `src/` (parsers, categorizer, matcher, exporters), `tests/`, `README.md`.');
    if (!(s.safety.local && s.safety.secrets && s.safety.backup)) {
      ask('confirm they accept the safety ground rules (local-only, no secrets in repos, backups before rewrites)', 7);
    } else {
      p('- The user has explicitly confirmed these safety principles. Treat them as non-negotiable.');
    }
    p('');

    // ---- 10. Non-goals
    p('## 10. Non-goals', '');
    p(`- This is a **personal tool for one household**${who ? ` (${who})` : ''}. Not multi-tenant, no user accounts or authentication, no hosting, and no need to scale beyond one household's data.`);
    p('- It does not move money, pay bills, or connect to anything with write access to financial accounts.');
    p('- It is not tax or investment software. Categorized books and summaries are the goal.');
    p('- Don\'t over-engineer: prefer simple, readable code the user (or a future AI agent) can maintain.', '');

    // ---- Milestones
    p('## Suggested build order', '');
    p('1. Project skeleton, config file + validation, SQLite schema, backup helper, `.gitignore`.');
    p(`2. One parser end-to-end (ask for a sample from ${acctLabels[0] ? quote(acctLabels[0]) : 'the first account'}) with dedup and idempotent re-import, plus tests.`);
    p('3. Remaining account parsers.');
    p(`4. Categorization tiers (learned → rules${usesAI ? ' → AI' : ''} → review).`);
    if (itemized) p('5. Itemized receipt/order parsers with subtotal validation, then cross-source matching.');
    const shortFormat = { excel: 'Excel workbook', sheets: 'Google Sheets', dashboard: 'local dashboard', other: 'custom format' }[o.format] || 'format TBD';
    p(`${itemized ? 6 : 5}. Output (${shortFormat}), summaries${o.edits === 'yes' ? ', and edit re-import' : ''}.`);
    p(`${itemized ? 7 : 6}. Review workflow, run summary, README. Then do a full dry run with the user on one real ${cadenceWord === 'weekly' ? 'week' : 'month'}.`, '');

    // ---- Open questions
    p('## Open questions for the user', '');
    if (gaps.length) {
      p('Ask about these before building the parts they affect (they also appear inline as `[ASK USER: …]`):', '');
      gaps.forEach((g, i) => p(`${i + 1}. ${g.what}`));
    } else {
      p('None. The interview covered everything. Still confirm sample file formats per source before writing each parser.');
    }
    p('');

    return { text: L.join('\n').replace(/\n{3,}/g, '\n\n'), gaps };
  }

  // ---------- Rendering ----------
  const form = $('#wizard');
  const stepper = $('#stepper');
  const navRow = $('#navRow');
  const mobile = $('#mobileProgress');

  function progressPct() { return Math.round((current / (STEPS.length - 1)) * 100); }

  function renderStepper() {
    stepper.innerHTML = `
      <div class="stepper-head">Your progress</div>
      <div class="progress-track"><div class="progress-fill" style="width:${progressPct()}%"></div></div>
      <ol class="step-list">
        ${STEPS.map((st, i) => `<li><button type="button" class="step-link ${i === current ? 'active' : ''} ${visited.has(i) && i !== current ? 'done' : ''}" data-action="goto" data-step="${i}" ${i === current ? 'aria-current="step"' : ''}>
          <span class="step-num">${visited.has(i) && i !== current ? '✓' : i === STEPS.length - 1 ? '★' : i}</span>${esc(st.nav)}</button></li>`).join('')}
      </ol>
      <div class="stepper-note"><strong>Jump around freely.</strong> Every answer is optional, and nothing is lost when you go back.</div>`;
    mobile.innerHTML = `
      <div class="mp-row"><b>${esc(STEPS[current].nav)}</b>
        <select aria-label="Jump to step" id="mobileJump">${STEPS.map((st, i) => `<option value="${i}" ${i === current ? 'selected' : ''}>${i === 0 ? '' : i === STEPS.length - 1 ? '★ ' : i + '. '}${esc(st.nav)}</option>`).join('')}</select>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${progressPct()}%"></div></div>`;
  }

  function renderNav() {
    const last = current === STEPS.length - 1;
    const back = current > 0 ? `<button type="button" class="btn btn-ghost" data-action="back">${ICON.arrowL}Back</button>` : '<span></span>';
    let next;
    if (current === 0) next = `<button type="button" class="btn btn-primary btn-lg" data-action="next">Let's get started${ICON.arrowR}</button>`;
    else if (current === STEPS.length - 2) next = `<button type="button" class="btn btn-primary btn-lg" data-action="next">${ICON.sparkle}Generate my prompt</button>`;
    else if (last) next = '<span class="nav-hint">Change any step and your prompt updates automatically.</span>';
    else next = `<span class="nav-hint">Skip anything you're unsure of.</span><button type="button" class="btn btn-primary btn-lg" data-action="next">Continue${ICON.arrowR}</button>`;
    navRow.innerHTML = `${back}<div style="display:flex;gap:16px;align-items:center">${next}</div>`;
  }

  function renderStep(animate) {
    const active = document.activeElement;
    const focusKey = active && active.dataset && active.dataset.path ? { path: active.dataset.path, value: active.value } : null;
    form.innerHTML = STEPS[current].render();
    if (animate) {
      form.classList.remove('step-enter');
      void form.offsetWidth;
      form.classList.add('step-enter');
    } else if (focusKey) {
      const el = [...form.querySelectorAll('[data-path]')].find((x) => x.dataset.path === focusKey.path && (x.type !== 'radio' && x.type !== 'checkbox' || x.value === focusKey.value));
      if (el) el.focus({ preventScroll: true });
    }
  }

  function renderAll(animate) {
    renderStepper();
    renderStep(animate);
    renderNav();
    updateDrawer();
  }

  function goTo(i) {
    current = Math.max(0, Math.min(STEPS.length - 1, i));
    visited.add(current);
    renderAll(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    save();
  }

  // ---------- Preview drawer ----------
  const drawer = $('#previewDrawer');
  const scrim = $('#scrim');
  const previewBtn = $('#previewBtn');
  function setDrawer(open) {
    drawer.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    previewBtn.setAttribute('aria-expanded', String(open));
    if (open) updateDrawer();
  }
  function updateDrawer() {
    if (!drawer.classList.contains('open')) return;
    const box = $('#drawerText');
    const top = box.scrollTop;
    box.value = buildPrompt(state).text;
    box.scrollTop = top;
  }

  // ---------- Feedback ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  let savedTimer;
  function flashSaved() {
    const el = $('#saveIndicator');
    el.textContent = 'Saved in this browser';
    el.style.opacity = '1';
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => { el.style.opacity = '0'; }, 1800);
  }

  let changeTimer;
  function changed() {
    save();
    clearTimeout(changeTimer);
    changeTimer = setTimeout(updateDrawer, 150);
  }

  // ---------- Actions ----------
  function addCategory(name) {
    const v = t(name);
    if (!v) return false;
    if (state.categories.some((c) => c.toLowerCase() === v.toLowerCase())) { toast(`"${v}" is already in your list`); return false; }
    state.categories.push(v);
    return true;
  }

  async function copyPrompt() {
    const text = buildPrompt(state).text;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const box = $('#resultText');
      box.focus(); box.select();
      try { document.execCommand('copy'); } catch (__) { toast('Select the text and press Ctrl+C to copy'); return; }
    }
    toast('Copied to clipboard');
  }

  function downloadPrompt() {
    const blob = new Blob([buildPrompt(state).text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accounting-app-build-prompt.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Downloaded accounting-app-build-prompt.md');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action } = btn.dataset;
    switch (action) {
      case 'next': goTo(current + 1); break;
      case 'back': goTo(current - 1); break;
      case 'goto': goTo(Number(btn.dataset.step)); break;
      case 'add': {
        const list = getPath(btn.dataset.list);
        list.push(blank[btn.dataset.kind]());
        renderStep(false); changed();
        const rows = form.querySelectorAll(`[data-path^="${btn.dataset.list}.${list.length - 1}."]`);
        if (rows[0]) rows[0].focus();
        break;
      }
      case 'remove': {
        const list = getPath(btn.dataset.list);
        list.splice(Number(btn.dataset.index), 1);
        if (!list.length) list.push(blank[{ accounts: 'account', rules: 'rule', 'transfers.list': 'transfer', 'stores.list': 'store', 'recurring.list': 'recurring' }[btn.dataset.list]]());
        renderStep(false); changed();
        break;
      }
      case 'add-cat': {
        const input = $('#newCat');
        if (addCategory(input.value)) { renderStep(false); changed(); $('#newCat').focus(); }
        break;
      }
      case 'suggest-cat': if (addCategory(btn.dataset.value)) { renderStep(false); changed(); } break;
      case 'remove-cat': state.categories.splice(Number(btn.dataset.index), 1); renderStep(false); changed(); break;
      case 'reset-cats': state.categories = DEFAULT_CATEGORIES.slice(); renderStep(false); changed(); toast('Categories reset'); break;
      case 'copy': copyPrompt(); break;
      case 'download': downloadPrompt(); break;
    }
  });

  form.addEventListener('input', (e) => {
    const el = e.target;
    const path = el.dataset.path;
    if (!path || el.type === 'radio' || el.type === 'checkbox') return;
    const value = el.type === 'range' ? Number(el.value) : el.value;
    setPath(path, value);
    if (el.type === 'range') el.closest('.range-row').querySelector('.range-value').textContent = value + '%';
    changed();
  });

  form.addEventListener('change', (e) => {
    const el = e.target;
    const path = el.dataset.path;
    if (!path) return;
    if (el.type === 'radio') setPath(path, el.value);
    else if (el.type === 'checkbox' && 'multi' in el.dataset) {
      const arr = getPath(path) || [];
      setPath(path, el.checked ? [...new Set([...arr, el.value])] : arr.filter((x) => x !== el.value));
    } else if (el.type === 'checkbox') setPath(path, el.checked);
    else return;
    changed();
    if ('rerender' in el.dataset) renderStep(false);
  });

  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    if (e.target.id === 'newCat' && addCategory(e.target.value)) { renderStep(false); changed(); $('#newCat').focus(); }
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  mobile.addEventListener('change', (e) => { if (e.target.id === 'mobileJump') goTo(Number(e.target.value)); });

  previewBtn.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
  $('#closePreview').addEventListener('click', () => setDrawer(false));
  scrim.addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });

  const resetBtn = $('#resetBtn');
  let resetArmed = null;
  resetBtn.addEventListener('click', () => {
    if (!resetArmed) {
      resetBtn.textContent = 'Click again to erase answers';
      resetBtn.classList.add('confirming');
      resetArmed = setTimeout(() => { resetArmed = null; resetBtn.textContent = 'Start over'; resetBtn.classList.remove('confirming'); }, 3500);
      return;
    }
    clearTimeout(resetArmed); resetArmed = null;
    resetBtn.textContent = 'Start over'; resetBtn.classList.remove('confirming');
    state = defaultState();
    visited.clear(); visited.add(0);
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
    goTo(0);
    toast('All answers cleared');
  });

  // Expose the generator for testing in a console / headless run.
  window.AccountingAppBuilder = { buildPrompt, defaultState };

  renderAll(false);
})();
