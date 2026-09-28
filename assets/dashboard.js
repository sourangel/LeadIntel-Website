/* LeadIntel — contractor dashboard.
   Speaks the existing API. Nothing here needs a key: the Airtable
   credentials stay inside the Vercel functions, same as before.

     GET  /api/leads               -> { email, leads: [...] }
     POST /api/leads/update-status -> { id, status }   -> { ok, status }
     POST /api/leads/archive       -> { id, archived } -> { ok, archived }
     POST /api/auth/logout
   Any 401 means the session expired -> back to /login. */

(function () {
  'use strict';

  var LOGIN_URL = '/login';
  var STATUSES = ['New', 'Contacted', 'Won', 'Lost'];
  var PRIORITY_RANK = { HOT: 0, WARM: 1, COLD: 2 };

  var state = { leads: [], filter: 'ALL', sort: 'priority', showArchived: false };

  var el = {
    list: document.querySelector('[data-list]'),
    count: document.querySelector('[data-count]'),
    account: document.querySelector('[data-account]'),
    sort: document.querySelector('[data-sort]'),
    archived: document.querySelector('[data-archived-toggle]'),
    chips: Array.prototype.slice.call(document.querySelectorAll('[data-filter]')),
    usage: document.querySelector('[data-usage]'),
    usagePlan: document.querySelector('[data-usage-plan]'),
    usageMeters: document.querySelector('[data-usage-meters]')
  };

  var money = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  });

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function unauthorized() {
    window.location.href = LOGIN_URL;
    throw new Error('unauthenticated');
  }

  /* Estimated Value arrives as free text ("$10,000–$12,000", "$8,500+").
     A range contributes its midpoint; anything without a number contributes 0. */
  function estValueNumber(raw) {
    if (raw == null || raw === '') return 0;
    if (typeof raw === 'number') return isFinite(raw) ? raw : 0;
    var tokens = String(raw).match(/\d[\d,]*(?:\.\d+)?\s*[KkMm]?/g);
    if (!tokens) return 0;
    var nums = tokens
      .map(function (t) {
        var m = t.match(/^([\d,]*\.?\d+)\s*([KkMm]?)$/);
        if (!m) return NaN;
        var n = parseFloat(m[1].replace(/,/g, ''));
        if (!isFinite(n)) return NaN;
        var suffix = m[2].toLowerCase();
        if (suffix === 'k') n *= 1e3;
        else if (suffix === 'm') n *= 1e6;
        return n;
      })
      .filter(function (n) { return isFinite(n); });
    if (!nums.length) return 0;
    if (nums.length === 1) return nums[0];
    return (Math.min.apply(null, nums) + Math.max.apply(null, nums)) / 2;
  }

  function createdTime(raw) {
    if (!raw) return null;
    var t = new Date(raw).getTime();
    return isFinite(t) ? t : null;
  }

  /* True when the record's created timestamp falls in the current calendar
     month (local time) — the window the usage tracker measures against.
     Records with no timestamp are excluded. */
  function inCurrentMonth(raw) {
    var t = createdTime(raw);
    if (t == null) return false;
    var d = new Date(t), now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  function formatDate(raw) {
    var t = createdTime(raw);
    if (t == null) return '';
    var d = new Date(t);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function formatPhone(raw) {
    var d = String(raw == null ? '' : raw).replace(/\D/g, '');
    return d.length === 10 ? d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6) : raw;
  }

  function priorityKey(p) {
    var u = String(p || '').toUpperCase();
    return PRIORITY_RANK[u] != null ? u : '';
  }

  function canonStatus(raw) {
    var needle = String(raw || '').trim().toLowerCase();
    for (var i = 0; i < STATUSES.length; i++) {
      if (STATUSES[i].toLowerCase() === needle) return STATUSES[i];
    }
    return '';
  }

  /* details is one string: "Project type: New Pour • Project area: Driveway • …"
     "Special requests" is pulled out of the grid — it can carry a long
     AI-generated call summary, so it renders as its own clamped
     full-width row instead of stretching the four-column spec.

     Voice-sourced leads can also carry a long free-text segment with
     colons of its own. Splitting that on the first colon makes an
     enormous label and a one-word-wide value column, so a segment whose
     would-be label runs past LABEL_MAX characters, or which runs past
     SEGMENT_MAX in total, keeps its text whole and takes the same
     clamped full-width treatment inside the Project grid. */
  var LABEL_MAX = 30;
  var SEGMENT_MAX = 150;

  function clampedRow(text) {
    return '<div class="spec-long"><dd>' +
      '<p class="special-text">' + esc(text) + '</p>' +
      '<button class="show-toggle" type="button" data-toggle-special aria-expanded="false" hidden>Show more</button>' +
    '</dd></div>';
  }

  function parseDetails(details) {
    var rows = '';
    var special = '';
    String(details || '').split(' • ').forEach(function (seg) {
      var text = seg.trim();
      if (!text) return;
      var split = text.indexOf(': ');
      var label = split === -1 ? '' : text.slice(0, split);
      if (label.trim().toLowerCase() === 'special requests') {
        if (!special) special = text.slice(split + 2).trim();
        return;
      }
      if (label.length > LABEL_MAX || text.length > SEGMENT_MAX) {
        rows += clampedRow(text);
        return;
      }
      if (split === -1) { rows += '<div><dd>' + esc(text) + '</dd></div>'; return; }
      rows += '<div><dt>' + esc(label) + '</dt><dd>' + esc(text.slice(split + 2)) + '</dd></div>';
    });
    /* empty, "None", or whitespace hides the row entirely */
    if (/^none$/i.test(special)) special = '';
    return { rows: rows, special: special };
  }

  function visible() {
    return state.leads.filter(function (l) {
      if (!state.showArchived && l.archived) return false;
      return state.filter === 'ALL' || priorityKey(l.priority) === state.filter;
    });
  }

  function sorted(list) {
    var copy = list.slice();
    function byPriority(a, b) {
      var pa = PRIORITY_RANK[priorityKey(a.priority)];
      var pb = PRIORITY_RANK[priorityKey(b.priority)];
      pa = pa == null ? 3 : pa;
      pb = pb == null ? 3 : pb;
      return pa !== pb ? pa - pb : (b.score || 0) - (a.score || 0);
    }
    if (state.sort === 'score') {
      copy.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    } else if (state.sort === 'created') {
      copy.sort(function (a, b) {
        var ta = createdTime(a.created), tb = createdTime(b.created);
        if (ta == null && tb == null) return byPriority(a, b);
        if (ta == null) return 1;
        if (tb == null) return -1;
        return tb - ta;
      });
    } else if (state.sort === 'value') {
      copy.sort(function (a, b) {
        var d = estValueNumber(b.estimatedValue) - estValueNumber(a.estimatedValue);
        return d !== 0 ? d : byPriority(a, b);
      });
    } else {
      copy.sort(byPriority);
    }
    return copy;
  }

  function renderStats() {
    var live = state.leads.filter(function (l) { return !l.archived; });
    var pipeline = live.reduce(function (s, l) { return s + estValueNumber(l.estimatedValue); }, 0);
    var stats = {
      hot: live.filter(function (l) { return priorityKey(l.priority) === 'HOT'; }).length,
      warm: live.filter(function (l) { return priorityKey(l.priority) === 'WARM'; }).length,
      total: live.length,
      pipeline: money.format(Math.round(pipeline))
    };
    Object.keys(stats).forEach(function (k) {
      var node = document.querySelector('[data-stat="' + k + '"]');
      if (node) node.textContent = stats[k];
    });
  }

  /* Leads captured and voice minutes used in the current calendar month.
     callDurationSecs is per-lead seconds of talk time; anything missing or
     non-numeric contributes nothing. Archived leads still count — archiving
     is a workflow action, not an un-capture. */
  function usageThisMonth() {
    var leads = 0, voiceSecs = 0;
    state.leads.forEach(function (l) {
      if (!inCurrentMonth(l.created)) return;
      leads++;
      if (typeof l.callDurationSecs === 'number' && isFinite(l.callDurationSecs)) {
        voiceSecs += l.callDurationSecs;
      }
    });
    return { leads: leads, voiceMinutes: Math.round(voiceSecs / 60) };
  }

  function meterHTML(id, label, used, cap) {
    var pct = cap > 0 ? (used / cap) * 100 : 0;
    /* keep a sliver visible for any non-zero usage; never overflow the track */
    var width = used > 0 ? Math.max(2, Math.min(100, pct)) : 0;
    var over = used > cap;
    var valuetext = used + ' of ' + cap + ' ' + label.toLowerCase() + ' this month';
    return '' +
      '<div class="meter">' +
        '<div class="meter-top">' +
          '<span class="meter-label" id="ml-' + esc(id) + '">' + esc(label) + '</span>' +
          '<span class="meter-value"><strong>' + esc(used) + '</strong> / ' + esc(cap) + '</span>' +
        '</div>' +
        '<div class="meter-track" role="progressbar" aria-labelledby="ml-' + esc(id) + '"' +
          ' aria-valuemin="0" aria-valuemax="' + esc(cap) + '" aria-valuenow="' + esc(used) + '"' +
          ' aria-valuetext="' + esc(valuetext) + '">' +
          '<span class="meter-fill" style="width:' + width + '%"></span>' +
        '</div>' +
        (over ? '<p class="meter-note">Over your monthly limit — reach out about a higher tier.</p>' : '') +
      '</div>';
  }

  /* Shown only when the API returns a recognized tier and its limits;
     an older response shape or unknown tier simply leaves it hidden. */
  function renderUsage(tier, limits) {
    if (!el.usage) return;
    if (!tier || !limits) { el.usage.hidden = true; return; }

    var used = usageThisMonth();
    var meters = [meterHTML('leads', 'Leads', used.leads, limits.leads)];
    var hasVoice = typeof limits.voiceMinutes === 'number' && limits.voiceMinutes > 0;
    if (hasVoice) {
      meters.push(meterHTML('voice', 'Voice minutes', used.voiceMinutes, limits.voiceMinutes));
    }

    el.usagePlan.textContent = tier + ' plan';
    el.usageMeters.className = 'usage-meters' + (hasVoice ? '' : ' single');
    el.usageMeters.innerHTML = meters.join('');
    el.usage.hidden = false;
  }

  function statusOptions(l) {
    var canon = canonStatus(l.status);
    var opts = STATUSES.map(function (s) {
      return '<option value="' + esc(s) + '"' + (s === canon ? ' selected' : '') + '>' + esc(s) + '</option>';
    });
    if (!canon) opts.unshift('<option value="" disabled selected>Set status…</option>');
    return opts.join('');
  }

  function cardHTML(l) {
    var pri = priorityKey(l.priority);
    var d = parseDetails(l.details);
    var missedCall = /^received via missed call/i.test(d.special);
    return '' +
      '<article class="lead-card" data-priority="' + esc(pri.toLowerCase()) + '" data-archived="' + (l.archived ? 'true' : 'false') + '" data-id="' + esc(l.id) + '">' +
        '<div class="lead-top">' +
          '<div class="lead-id">' +
            '<div class="lead-name">' + esc(l.name || 'Unnamed lead') +
              (missedCall ? ' <span class="badge-missed">Missed Call</span>' : '') + '</div>' +
            '<div class="lead-date">' + esc(formatDate(l.created)) + '</div>' +
          '</div>' +
          '<div class="lead-controls">' +
            (pri ? '<span class="pill pill-' + esc(pri.toLowerCase()) + '">' + esc(pri) + '</span>' : '') +
            (l.score != null ? '<span class="score">' + esc(l.score) + ' <span>/ 100</span></span>' : '') +
            '<label class="sr-only" for="status-' + esc(l.id) + '">Status for ' + esc(l.name || 'lead') + '</label>' +
            '<select class="select select-status" id="status-' + esc(l.id) + '" data-status>' + statusOptions(l) + '</select>' +
            '<button class="btn-quiet" type="button" data-archive>' + (l.archived ? 'Restore' : 'Archive') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="lead-contact">' +
          (l.phone ? '<a href="tel:' + esc(l.phone) + '">' + esc(formatPhone(l.phone)) + '</a>' : '') +
          (l.email ? '<a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a>' : '') +
          (l.estimatedValue ? '<span class="lead-value">Est. ' + esc(l.estimatedValue) + '</span>' : '') +
        '</div>' +
        (l.recommendedAction || d.rows || d.special ?
          '<div class="lead-detail">' +
            (l.recommendedAction ? '<div class="detail-label">Next step</div><p class="next-step">' + esc(l.recommendedAction) + '</p>' : '') +
            (d.rows ? '<div class="detail-label">Project</div><dl class="spec">' + d.rows + '</dl>' : '') +
            (d.special ?
              '<div class="detail-label">Special requests</div>' +
              '<div class="special-req">' +
                '<p class="special-text">' + esc(d.special) + '</p>' +
                '<button class="show-toggle" type="button" data-toggle-special aria-expanded="false" hidden>Show more</button>' +
              '</div>' : '') +
          '</div>' : '') +
        '<p class="row-note" data-note role="status" hidden></p>' +
      '</article>';
  }

  function render() {
    var list = sorted(visible());

    el.count.textContent = list.length === 0
      ? 'No leads match this view'
      : list.length + (list.length === 1 ? ' lead' : ' leads') +
        (state.filter === 'ALL' ? '' : ' · ' + state.filter.toLowerCase()) +
        (state.showArchived ? ' · including archived' : '');

    el.list.innerHTML = list.length === 0
      ? '<div class="empty">' +
          '<h2 class="h-sm">Nothing here right now</h2>' +
          '<p>Clear the filter, or wait. New leads land the moment they are scored.</p>' +
        '</div>'
      : list.map(cardHTML).join('');
    syncSpecialToggles();
  }

  /* Reveal a Show more toggle only where the two-line clamp cut something.
     Measured by briefly unclamping and comparing heights: scrollHeight is
     not trustworthy across the old and new line-clamp implementations.
     Re-run after web fonts settle, since Inter reflows the text. */
  function syncSpecialToggles() {
    Array.prototype.forEach.call(el.list.querySelectorAll('.special-text'), function (p) {
      if (p.classList.contains('expanded')) return;
      var clampedH = p.clientHeight;
      p.classList.add('expanded');
      var fullH = p.clientHeight;
      p.classList.remove('expanded');
      p.nextElementSibling.hidden = fullH <= clampedH + 1;
    });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { syncSpecialToggles(); });
  }
  var resyncTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resyncTimer);
    resyncTimer = setTimeout(syncSpecialToggles, 150);
  });

  function byId(id) {
    return state.leads.filter(function (l) { return l.id === id; })[0];
  }

  /* render() rebuilds the list with innerHTML, which drops keyboard
     focus to <body>. After archiving, put focus back on the same
     lead's button — or the nearest one if the card left the view. */
  function refocusArchive(id) {
    var target = el.list.querySelector('[data-id="' + id + '"] [data-archive]');
    if (!target) target = el.list.querySelector('[data-archive]');
    if (!target) {
      el.count.setAttribute('tabindex', '-1');
      target = el.count;
    }
    target.focus();
  }

  function noteOn(card, message) {
    var note = card.querySelector('[data-note]');
    if (!note) return;
    note.textContent = message;
    note.hidden = !message;
  }

  el.chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      /* chips carry lowercase values; every comparison downstream is uppercase */
      state.filter = chip.getAttribute('data-filter').toUpperCase();
      el.chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      render();
    });
  });

  el.sort.addEventListener('change', function () {
    state.sort = el.sort.value;
    render();
  });

  el.archived.addEventListener('click', function () {
    state.showArchived = !state.showArchived;
    el.archived.setAttribute('aria-pressed', String(state.showArchived));
    render();
  });

  /* Special requests and unsplit long segments share the two-line clamp
     with a per-card toggle. Expansion only grows this card; nothing
     else reflows. */
  el.list.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-toggle-special]');
    if (!btn) return;
    var text = btn.parentNode.querySelector('.special-text');
    var expanded = text.classList.toggle('expanded');
    btn.textContent = expanded ? 'Show less' : 'Show more';
    btn.setAttribute('aria-expanded', String(expanded));
  });

  /* Archive: optimistic locally, reverted if the server disagrees. */
  el.list.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-archive]');
    if (!btn) return;
    var card = btn.closest('.lead-card');
    var lead = byId(card.getAttribute('data-id'));
    if (!lead) return;

    var next = !lead.archived;
    btn.disabled = true;
    noteOn(card, '');

    fetch('/api/leads/archive', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, archived: next })
    })
      .then(function (res) {
        if (res.status === 401) unauthorized();
        return res.json().then(function (data) {
          if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save');
          return data;
        });
      })
      .then(function (data) {
        lead.archived = data.archived != null ? data.archived : next;
        renderStats();
        render();
        refocusArchive(lead.id);
      })
      .catch(function (err) {
        if (err.message === 'unauthenticated') return;
        btn.disabled = false;
        noteOn(card, 'Could not save that change. Check your connection and try again.');
      });
  });

  el.list.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-status]');
    if (!sel) return;
    var card = sel.closest('.lead-card');
    var lead = byId(card.getAttribute('data-id'));
    if (!lead) return;

    var next = sel.value;
    var previous = lead.status;
    sel.disabled = true;
    noteOn(card, '');

    fetch('/api/leads/update-status', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, status: next })
    })
      .then(function (res) {
        if (res.status === 401) unauthorized();
        return res.json().then(function (data) {
          if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save');
          return data;
        });
      })
      .then(function (data) {
        lead.status = data.status || next;
        sel.disabled = false;
      })
      .catch(function (err) {
        if (err.message === 'unauthenticated') return;
        lead.status = previous;
        sel.value = canonStatus(previous);
        sel.disabled = false;
        noteOn(card, 'Could not save that status. Check your connection and try again.');
      });
  });

  var signout = document.querySelector('[data-signout]');
  if (signout) {
    signout.addEventListener('click', function () {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
        .finally(function () { window.location.href = LOGIN_URL; });
    });
  }

  fetch('/api/leads', { credentials: 'same-origin' })
    .then(function (res) {
      if (res.status === 401) unauthorized();
      if (!res.ok) throw new Error('failed');
      return res.json();
    })
    .then(function (data) {
      el.account.textContent = data.email || '';
      state.leads = (data.leads || []).slice();
      renderStats();
      renderUsage(data.tier, data.tierLimits);
      render();
    })
    .catch(function (err) {
      if (err.message === 'unauthenticated') return;
      el.count.textContent = '';
      el.list.innerHTML =
        '<div class="empty">' +
          '<h2 class="h-sm">Could not load your leads</h2>' +
          '<p>Refresh the page. If it keeps failing, get in touch and we will look into it.</p>' +
        '</div>';
    });
})();
