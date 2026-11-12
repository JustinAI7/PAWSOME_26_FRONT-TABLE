(function () {
  'use strict';
  var C = window.PAWSOME_CONFIG;
  var $ = function (s) { return document.querySelector(s); };
  var pin = '';
  var who = '';
  var scanner = null;

  function el(tag, props) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'class') n.className = props[k];
      else if (k === 'text') n.textContent = props[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), props[k]);
      else n.setAttribute(k, props[k]);
    });
    for (var i = 2; i < arguments.length; i++) { if (arguments[i]) n.append(arguments[i]); }
    return n;
  }

  async function api(payload) {
    payload.pin = pin;
    var res = await fetch(C.SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
    return res.json();
  }

  function notice(text, kind) {
    var n = $('#notice');
    n.textContent = text || '';
    n.className = 'msg ' + (kind || 'ok') + (text ? '' : ' hidden');
  }

  /* ---- PIN gate ---- */
  $('#pinForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    $('#pinError').classList.add('hidden');
    if (!C.SCRIPT_URL || C.SCRIPT_URL.indexOf('PASTE_') === 0) {
      $('#pinError').textContent = 'The system is not connected yet. Set SCRIPT_URL in config.js.';
      $('#pinError').classList.remove('hidden');
      return;
    }
    pin = $('#pin').value.trim();
    who = $('#who').value.trim();
    var btn = $('#pinBtn');
    btn.disabled = true;
    try {
      var data = await api({ action: 'stats' });
      if (!data.ok) throw new Error(data.error || 'Could not open.');
      try { sessionStorage.setItem('pawsome_pin', pin); sessionStorage.setItem('pawsome_who', who); } catch (err) {}
      openApp(data.stats);
    } catch (err) {
      $('#pinError').textContent = err.message || 'Could not open.';
      $('#pinError').classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  });

  function openApp(stats) {
    $('#pinForm').classList.add('hidden');
    $('#app').classList.remove('hidden');
    var act = $('#activity');
    act.textContent = '';
    act.append(el('option', { value: '', text: 'All activities' }));
    Object.keys(stats).forEach(function (k) { act.append(el('option', { value: k, text: stats[k].label })); });
    if (Object.keys(stats).length === 1) {
      ['#activity'].forEach(function (id) {
        var n = $(id);
        n.classList.add('hidden');
        if (n.previousElementSibling && n.previousElementSibling.tagName === 'LABEL') n.previousElementSibling.classList.add('hidden');
      });
    }
    renderStats(stats);
    $('#query').focus();
  }

  function renderStats(stats) {
    var box = $('#stats');
    box.textContent = '';
    Object.keys(stats).forEach(function (k) {
      var s = stats[k];
      box.append(el('div', { class: 'stat' },
        el('b', { text: s.checkedIn + ' / ' + s.registered }),
        el('span', { text: s.label + ': checked in / registered' })));
      if (s.limit > 0) {
        box.append(el('div', { class: 'stat' },
          el('b', { text: s.pets + ' / ' + s.limit }),
          el('span', { text: s.label + ': pets registered / limit' })));
      }
    });
  }

  async function refreshStats() {
    try {
      var d = await api({ action: 'stats' });
      if (d.ok) renderStats(d.stats);
    } catch (err) {}
  }
  $('#refresh').addEventListener('click', refreshStats);

  /* ---- lookup and check-in ---- */
  $('#lookupForm').addEventListener('submit', function (e) {
    e.preventDefault();
    find($('#query').value);
  });

  async function find(q) {
    notice('');
    $('#results').textContent = '';
    if (!String(q).trim()) return;
    notice('Searching...', 'ok');
    try {
      var d = await api({ action: 'lookup', query: q, event: $('#activity').value });
      if (!d.ok) { notice(d.error || 'Search failed.', 'err'); return; }
      if (!d.results.length) { notice('No match. Check the code, or search by name or email.', 'err'); return; }
      notice('');
      d.results.forEach(function (r) { $('#results').append(card(r)); });
    } catch (err) {
      notice('Could not reach the system. Check the connection.', 'err');
    }
  }

  function badge(status) {
    var cls = status === 'Checked in' ? 'in' : status === 'Cancelled' ? 'cx' : 'reg';
    return el('span', { class: 'badge ' + cls, text: status });
  }

  function card(r) {
    var pets = el('ul');
    r.pets.forEach(function (p) {
      pets.append(el('li', { text: [p.name, p.species, p.breed, p.sex, p.age].filter(Boolean).join(' · ') }));
    });
    var actions = el('div', { class: 'row', style: 'margin-top:10px' });
    var box = el('div', { class: 'person' },
      el('div', { class: 'row', style: 'justify-content:space-between' },
        el('h3', { text: r.name }), badge(r.status)),
      el('div', { class: 'meta', text: r.code + ' · ' + r.eventLabel }),
      el('div', { class: 'meta', text: [r.college, r.role, r.contact].filter(Boolean).join(' · ') }),
      r.pets.length ? pets : null,
      r.status === 'Checked in' ? el('div', { class: 'meta', text: 'Checked in at ' + r.checkedInAt }) : null,
      actions);

    if (r.status === 'Registered') {
      actions.append(el('button', { class: 'btn', type: 'button', text: 'Confirm check-in', onclick: async function (ev) {
        ev.target.disabled = true;
        var d = await api({ action: 'checkin', code: r.code, event: r.event, by: who });
        if (d.ok || d.already) { replace(box, d.record || r); refreshStats(); notice(''); showResult(d.ok ? 'ok' : 'warn', d.record || r); }
        else { ev.target.disabled = false; notice(d.error || 'Failed.', 'err'); }
      } }));
    } else if (r.status === 'Checked in') {
      actions.append(el('button', { class: 'btn ghost small', type: 'button', text: 'Undo check-in', onclick: async function () {
        var d = await api({ action: 'undo', code: r.code, event: r.event });
        if (d.ok) { replace(box, d.record); refreshStats(); notice('Check-in undone.', 'ok'); }
        else notice(d.error || 'Failed.', 'err');
      } }));
    }
    return box;
  }

  function replace(oldNode, record) { oldNode.replaceWith(card(record)); }

  // Large result panel, readable from across the table
  function showResult(kind, r) {
    var box = $('#result');
    box.className = 'result ' + kind;
    box.textContent = '';
    var petText = r.pets.map(function (p) { return p.name + ' (' + p.species + ')'; }).join(' · ');
    [
      el('div', { class: 'state', text: kind === 'ok' ? 'CHECKED IN' : 'ALREADY CHECKED IN' }),
      el('div', { class: 'big', text: r.name }),
      el('div', { class: 'line', text: r.code + ' · ' + r.eventLabel }),
      petText ? el('div', { class: 'line', text: petText }) : null,
      kind === 'warn' && r.checkedInAt ? el('div', { class: 'line', text: 'First checked in at ' + r.checkedInAt }) : null,
      el('button', { class: 'btn', type: 'button', text: 'Next participant', onclick: function () {
        box.className = 'result hidden';
        box.textContent = '';
        $('#results').textContent = '';
        $('#query').value = '';
        $('#query').focus();
      } })
    ].forEach(function (n) { if (n) box.append(n); });
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  (function renderLogos() {
    var holder = $('#logos');
    if (!holder) return;
    holder.textContent = '';
    (C.LOGOS || []).forEach(function (l) { holder.append(el('img', { src: l.src, alt: l.alt || '' })); });
  })();

  /* ---- QR scanning ---- */
  $('#scanBtn').addEventListener('click', async function () {
    var reader = $('#reader');
    if (typeof Html5Qrcode === 'undefined') { notice('Scanner could not load. Type the code instead.', 'err'); return; }
    if (scanner) { await stopScan(); return; }
    reader.classList.remove('hidden');
    scanner = new Html5Qrcode('reader');
    try {
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 240 }, function (text) {
        $('#query').value = text.trim();
        stopScan();
        find(text.trim());
      });
      $('#scanBtn').textContent = 'Stop scan';
    } catch (err) {
      await stopScan();
      notice('Camera is not available. Allow camera access, or type the code.', 'err');
    }
  });

  async function stopScan() {
    try { if (scanner) { await scanner.stop(); scanner.clear(); } } catch (err) {}
    scanner = null;
    $('#reader').classList.add('hidden');
    $('#scanBtn').textContent = 'Scan QR';
  }

  /* ---- names for the raffle wheel ---- */
  $('#namesBtn').addEventListener('click', async function () {
    var msg = $('#namesMsg'), box = $('#namesBox');
    msg.className = 'msg hidden'; box.classList.add('hidden');
    try {
      var d = await api({ action: 'names', checkedInOnly: $('#namesWho').value === 'in' });
      if (!d.ok) { msg.textContent = d.error || 'Could not get the names.'; msg.className = 'msg err'; return; }
      if (!d.count) { msg.textContent = 'No names yet.'; msg.className = 'msg err'; return; }
      var text = d.names.join('\n');
      box.value = text; box.classList.remove('hidden');
      var copied = false;
      try { await navigator.clipboard.writeText(text); copied = true; } catch (err) {}
      msg.textContent = (d.count + (d.count === 1 ? ' name' : ' names')) + (copied ? ' copied. Paste into the wheel.' : ' below. Tap the box, select all and copy.');
      msg.className = 'msg ok';
    } catch (err) {
      msg.textContent = 'Could not reach the system. Try again.'; msg.className = 'msg err';
    }
  });

  /* ---- resume after reload ---- */
  try {
    var savedPin = sessionStorage.getItem('pawsome_pin');
    if (savedPin) {
      $('#pin').value = savedPin;
      $('#who').value = sessionStorage.getItem('pawsome_who') || '';
    }
  } catch (err) {}
})();
