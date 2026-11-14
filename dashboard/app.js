// Token Radar's dashboard: it reads window.RADAR (written beside dashboard/ by main.ts) and renders
// the ranked board, the model's own working, a per-protocol detail view with its farm plan, and the
// live-token list. No network: every byte it shows is in data.js. Filters and the open detail are
// kept in the URL hash, so a state can be linked and screenshotted.

(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) {
    document.body.innerHTML = '<p style="padding:2rem">data.js did not load.</p>';
    return;
  }

  // Watchlist membership rides on each row: data.js marks the rows the snapshot's watchlist named.
  var state = { q: '', category: 'all', chain: 'all', watch: false, sort: 'implied', dir: -1, detail: null };

  function $(id) { return document.getElementById(id); }
  function money(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toLocaleString('en-US');
  }
  function fullMoney(n) {
    if (n === null || n === undefined) return '—';
    return '$' + n.toLocaleString('en-US');
  }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    var s = (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
    return s;
  }
  function ageText(days) {
    if (days === null || days === undefined) return '—';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.floor(days / 30) + 'm';
    return (days / 365).toFixed(1) + 'y';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- farm plan, generated in the page from the row's own figures ---------------------------
  function chainOf(r) { return r.chains.length > 0 ? r.chains[0] : 'its main chain'; }
  function capitalFor(r) {
    if (r.tvl_usd >= 5e9) return 250;
    if (r.tvl_usd >= 1e9) return 150;
    if (r.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(r, capital, chain) {
    var c = (r.category || '').toLowerCase();
    var name = r.name;
    if (c.indexOf('lend') !== -1 || c.indexOf('cdp') !== -1 || c.indexOf('collateral') !== -1) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' as collateral, borrow a small amount against it, and keep the loan healthy.';
    if (c.indexOf('dex') !== -1 || c.indexOf('leveraged farm') !== -1) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' in a balanced pair and keep the position open.';
    if (c.indexOf('yield aggregator') !== -1) return 'Deposit $' + capital + " of USDC into " + name + "'s auto-compounding vault on " + chain + ' and leave the shares untouched.';
    if (c.indexOf('yield') !== -1) return 'Deposit $' + capital + " into " + name + "'s highest-TVL yield vault on " + chain + ' and keep the receipt token.';
    if (c.indexOf('bridge') !== -1 || c.indexOf('canonical') !== -1) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds inside its own app.';
    if (c.indexOf('restak') !== -1 || c.indexOf('liquid staking') !== -1 || c.indexOf('staking') !== -1) return 'Stake $' + capital + " of the chain's staking asset through " + name + ' and keep the liquid receipt token.';
    if (c.indexOf('perpetual') !== -1 || c.indexOf('derivative') !== -1) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position, then leave it.';
    if (c.indexOf('prediction') !== -1) return 'Fund $' + capital + ' and place one market position on ' + name + ' on an outcome you have read about.';
    if (c.indexOf('curator') !== -1 || c.indexOf('allocator') !== -1 || c.indexOf('capital') !== -1) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the vault shares for the whole season.';
    if (c.indexOf('stable') !== -1) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + ' and hold the balance.';
    if (c.indexOf('rwa') !== -1) return 'Mint $' + capital + " of the protocol's yield-bearing asset on " + chain + ' and hold it in the same wallet.';
    if (c.indexOf('insurance') !== -1) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active.';
    if (c.indexOf('basis') !== -1) return 'Deposit $' + capital + " into " + name + "'s basis-trading vault on " + chain + ' and keep the position through one funding cycle.';
    if (c.indexOf('chain') !== -1) return 'Bridge $' + capital + " of the chain's native asset to " + name + ' and use it in one of its own apps.';
    if (c.indexOf('cedefi') !== -1) return 'Deposit $' + capital + " into " + name + "'s CeDeFi vault on " + chain + ' and keep the shares.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function farmSteps(r) {
    var chain = chainOf(r);
    var capital = capitalFor(r);
    var hold = holdFor(r.age_days);
    var extra = r.chains.length > 1 ? ' It also runs on ' + r.chains.slice(1, 3).join(' and ') + ', but farm on ' + chain + ' first.' : '';
    return [
      'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline. Cost: under $3 of gas for the first transaction. Time: 5 minutes.',
      actionFor(r, capital, chain) + extra + ' Cost: $' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas. Time: 15 minutes to set up.',
      'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote on ' + chain + '. Cost: about $2 of gas a week. Time: 10 minutes a week.',
      'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot. Cost: the $' + capital + ' stays in the position. Time: ' + hold + ' days.',
      "Before you withdraw, open " + r.name + "'s own points or rewards page and claim only from the link it publishes. Cost: no fee to check, and never pay to claim. Time: 10 minutes.",
      'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it. Cost: nothing but the log. Time: 5 minutes.'
    ];
  }

  // ---- hash state ----------------------------------------------------------------------------
  function readHash() {
    var h = location.hash.replace(/^#/, '');
    var out = {};
    h.split('&').forEach(function (part) {
      var kv = part.split('=');
      if (kv[0]) out[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return out;
  }
  function writeHash() {
    var parts = [];
    if (state.q) parts.push('q=' + encodeURIComponent(state.q));
    if (state.category !== 'all') parts.push('cat=' + encodeURIComponent(state.category));
    if (state.chain !== 'all') parts.push('chain=' + encodeURIComponent(state.chain));
    if (state.watch) parts.push('watch=1');
    if (state.detail) parts.push('detail=' + encodeURIComponent(state.detail));
    var h = parts.join('&');
    if (location.hash.replace(/^#/, '') !== h) history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
  }

  // ---- static panels ---------------------------------------------------------------------------
  function renderStatic() {
    $('asof').textContent = DATA.as_of;
    $('stat-total').textContent = DATA.snapshot_size;
    $('stat-board').textContent = DATA.board_size;
    $('stat-watch').textContent = DATA.watchlist_size + ' / ' + DATA.watchlist_size;
    $('stat-live').textContent = DATA.live_size;
    $('row-count').textContent = '(' + DATA.board_size + ' rows)';
    $('live-count').textContent = DATA.live_size;

    var cats = Object.keys(DATA.category_multiples).sort(function (a, b) { return DATA.category_multiples[b] - DATA.category_multiples[a]; });
    $('cat-table').innerHTML = cats.map(function (c) {
      return '<tr><td>' + esc(c) + '</td><td>' + DATA.category_multiples[c].toFixed(2) + '&times;</td></tr>';
    }).join('');
    $('tier-table').innerHTML = DATA.size_tiers.map(function (t) {
      var label = t.max === -1 ? 'over $10B' : 'up to ' + money(t.max);
      return '<tr><td>' + label + '</td><td>' + t.multiple.toFixed(2) + '&times;</td></tr>';
    }).join('');

    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    categories.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      $('category').appendChild(o);
    });
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains); }, []))).sort();
    chains.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      $('chain').appendChild(o);
    });
  }

  // ---- board -----------------------------------------------------------------------------------
  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.watch && !r.watchlist) return false;
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && r.chains.indexOf(state.chain) === -1) return false;
      if (q && (r.name.toLowerCase().indexOf(q) === -1 && r.slug.toLowerCase().indexOf(q) === -1)) return false;
      return true;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    var dir = state.dir;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? -1 : a.age_days; bv = b.age_days === null ? -1 : b.age_days; }
      else if (key === 'name') { return dir * (a.name < b.name ? -1 : a.name > b.name ? 1 : 0); }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      return dir * (av - bv);
    });
  }
  function renderBoard() {
    var list = sortedRows(filteredRows());
    $('row-count').textContent = '(' + list.length + ' of ' + DATA.board_size + ' rows)';
    $('empty').hidden = list.length !== 0;
    $('board-body').innerHTML = list.map(function (r) {
      var g = r.change_7d === null ? '<span>—</span>' : '<span class="' + (r.change_7d >= 0 ? 'pos' : 'neg') + '">' + pct(r.change_7d) + '</span>';
      var watch = r.watchlist ? '<span class="watch">WATCHLIST</span>' : '';
      return '<tr data-slug="' + esc(r.slug) + '" class="' + (state.detail === r.slug ? 'selected' : '') + '">' +
        '<td class="num">' + r.rank + '</td>' +
        '<td class="name">' + esc(r.name) + watch + '<small>' + esc(r.slug) + '</small></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 3).join(', ') || '—') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + g + '</td>' +
        '<td class="num">' + ageText(r.age_days) + '</td>' +
        '<td class="num">' + money(r.implied_value_usd) + '</td></tr>';
    }).join('');
    Array.prototype.forEach.call($('board-body').querySelectorAll('tr'), function (tr) {
      tr.addEventListener('click', function () { openDetail(tr.getAttribute('data-slug')); });
    });
  }

  // ---- detail ----------------------------------------------------------------------------------
  function openDetail(slug) {
    state.detail = slug;
    writeHash();
    renderDetail();
    renderBoard();
    var el = $('detail');
    if (el && !el.hidden) el.scrollIntoView({ block: 'start' });
  }
  function renderDetail() {
    var panel = $('detail');
    var row = DATA.rows.filter(function (r) { return r.slug === state.detail; })[0];
    if (!row) { panel.hidden = true; return; }
    panel.hidden = false;
    $('d-rank').textContent = '#' + row.rank;
    $('d-cat').textContent = row.category || '—';
    $('d-name').textContent = row.name;
    var base = row.tvl_usd * row.category_multiple * row.size_multiple;
    var stats = [
      ['Implied value', fullMoney(row.implied_value_usd)],
      ['TVL', fullMoney(row.tvl_usd)],
      ['7-day growth', pct(row.change_7d)],
      ['Age', row.age_days === null ? 'unknown' : row.age_days + ' days'],
      ['Chains', row.chains.join(', ') || '—'],
      ['Watchlist', row.watchlist ? 'yes' : 'no']
    ];
    $('d-stats').innerHTML = stats.map(function (s) { return '<div><dt>' + s[0] + '</dt><dd>' + esc(s[1]) + '</dd></div>'; }).join('');
    var rows = [
      ['TVL', fullMoney(row.tvl_usd)],
      ['&times; category multiple (' + esc(row.category || 'default') + ')', row.category_multiple.toFixed(2) + '×'],
      ['&times; size tier', row.size_multiple.toFixed(2) + '×'],
      ['= base value', fullMoney(Math.round(base))],
      ['&times; growth (' + pct(row.change_7d) + ')', row.growth_multiplier.toFixed(2) + '×'],
      ['&times; maturity (' + ageText(row.age_days) + ')', row.maturity_multiplier.toFixed(2) + '×'],
      ['&times; chains (' + row.chains.length + ')', row.chain_multiplier.toFixed(2) + '×'],
      ['= implied value', fullMoney(row.implied_value_usd)]
    ];
    $('d-model').innerHTML = rows.map(function (s) { return '<tr><td>' + s[0] + '</td><td>' + esc(s[1]) + '</td></tr>'; }).join('');
    $('d-steps').innerHTML = farmSteps(row).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
  }

  // ---- live view ---------------------------------------------------------------------------------
  function renderLive() {
    $('live-body').innerHTML = DATA.live.map(function (r) {
      var g = r.change_7d === null ? '—' : pct(r.change_7d);
      return '<tr><td class="name">' + esc(r.name) + '<small>' + esc(r.slug) + '</small></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 3).join(', ') || '—') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + money(r.mcap_usd) + '</td>' +
        '<td class="num">' + g + '</td></tr>';
    }).join('');
  }

  // ---- wire up -----------------------------------------------------------------------------------
  function init() {
    // The static panels populate the filter options first; only then can the hash set a select's value.
    renderStatic();
    var h = readHash();
    if (h.q) { state.q = h.q; $('q').value = h.q; }
    if (h.cat) { state.category = h.cat; $('category').value = h.cat; }
    if (h.chain) { state.chain = h.chain; $('chain').value = h.chain; }
    if (h.watch === '1') { state.watch = true; $('watchonly').checked = true; }
    if (h.detail) state.detail = h.detail;

    $('q').addEventListener('input', function () { state.q = $('q').value; writeHash(); renderBoard(); });
    $('category').addEventListener('change', function () { state.category = $('category').value; writeHash(); renderBoard(); });
    $('chain').addEventListener('change', function () { state.chain = $('chain').value; writeHash(); renderBoard(); });
    $('watchonly').addEventListener('change', function () { state.watch = $('watchonly').checked; writeHash(); renderBoard(); });
    $('sort').addEventListener('change', function () {
      state.sort = $('sort').value;
      state.dir = state.sort === 'name' ? 1 : -1;
      renderBoard();
    });
    $('clear').addEventListener('click', function () {
      state.q = ''; state.category = 'all'; state.chain = 'all'; state.watch = false;
      $('q').value = ''; $('category').value = 'all'; $('chain').value = 'all'; $('watchonly').checked = false;
      writeHash(); renderBoard();
    });
    $('d-close').addEventListener('click', function () { state.detail = null; writeHash(); renderDetail(); renderBoard(); });

    renderBoard();
    renderDetail();
    renderLive();
  }

  init();
})();
