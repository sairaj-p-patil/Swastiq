/* SWASTIQ STUDIOS — progressive enhancement. No dependencies. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Page enter / leave transitions ─────────────────── */
  requestAnimationFrame(() => document.body.classList.add('ready'));
  window.addEventListener('pageshow', (e) => { if (e.persisted) document.body.classList.remove('leaving'); });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && (url.hash || url.search === location.search)) return; // in-page
    if (reduce) return;
    e.preventDefault();
    document.body.classList.add('leaving');
    setTimeout(() => { location.href = a.href; }, 320);
  });

  /* ── Images fade in once decoded ────────────────────── */
  $$('.img').forEach((img) => {
    const done = () => img.classList.add('loaded');
    if (img.complete) done(); else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
  });

  /* ── Header: hide on scroll down, show on scroll up ─── */
  const header = $('.site-header');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('scrolled', y > 24);
    if (!$('.primary.open')) header.classList.toggle('hide', y > lastY + 4 && y > 400 ? true : y < lastY - 4 ? false : header.classList.contains('hide'));
    lastY = y; ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ── Mobile menu ────────────────────────────────────── */
  const toggle = $('.menu-toggle'), nav = $('#primary-nav');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('open', open);
    header.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); toggle.focus(); } });
  matchMedia('(min-width: 901px)').addEventListener('change', (m) => m.matches && setMenu(false));

  /* ── Reveal on scroll ───────────────────────────────── */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add('in'));

  /* ── Cursor label on imagery (fine pointers only) ───── */
  const cursor = $('.cursor');
  if (cursor && matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    const label = $('span', cursor);
    let x = 0, y = 0, cx = 0, cy = 0, raf;
    const loop = () => {
      cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    document.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; if (!raf) { cx = x; cy = y; loop(); } }, { passive: true });
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-cursor]');
      if (t && t.dataset.cursor) { label.textContent = t.dataset.cursor; cursor.classList.add('on'); } else cursor.classList.remove('on');
    });
    document.addEventListener('mouseleave', () => cursor.classList.remove('on'));
  }

  /* ── Portfolio filtering ────────────────────────────── */
  const grid = $('#grid');
  if (grid) {
    const buttons = $$('.filter'), cards = $$('.card', grid), status = $('.filter-status');
    const labels = Object.fromEntries(buttons.map((b) => [b.dataset.filter, b.textContent.trim()]));
    const apply = (f, push = true) => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
      let shown = 0;
      cards.forEach((c) => {
        const match = f === 'all' || c.dataset.category === f;
        if (match) shown++;
        if (reduce) { c.hidden = !match; return; }
        if (match) { c.hidden = false; requestAnimationFrame(() => c.classList.remove('out')); }
        else { c.classList.add('out'); setTimeout(() => { if (c.classList.contains('out')) c.hidden = true; }, 380); }
      });
      status.textContent = f === 'all' ? '' : `${shown} ${shown === 1 ? 'project' : 'projects'} in ${labels[f]}`;
      if (push) history.replaceState(null, '', f === 'all' ? location.pathname : `#${f}`);
    };
    buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.filter)));
    const initial = location.hash.slice(1);
    if (initial && labels[initial]) apply(initial, false);

    // Video previews on hover (when a project defines a video)
    cards.forEach((c) => {
      const link = $('.card-link', c);
      const src = link && link.dataset.video;
      if (!src) return;
      let v;
      link.addEventListener('mouseenter', () => {
        if (!v) { v = document.createElement('video'); v.src = src; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none'; v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover'; $('.card-media', c).appendChild(v); }
        v.play().catch(() => {});
      });
      link.addEventListener('mouseleave', () => v && v.pause());
    });
  }

  /* ── Lightbox gallery ───────────────────────────────── */
  const gal = $('[data-gallery]');
  const lb = $('.lightbox');
  if (gal && lb) {
    const items = $$('.gal-btn', gal);
    const srcs = items.map((b) => $('img', b).currentSrc || $('img', b).src);
    const imgEl = $('.lb-stage img', lb), cap = $('.lb-stage figcaption', lb);
    let i = 0, opener = null, tx = 0;
    const show = (n) => {
      i = (n + items.length) % items.length;
      imgEl.style.opacity = 0;
      const next = new Image();
      next.onload = next.onerror = () => { imgEl.src = srcs[i]; imgEl.alt = `${gal.dataset.title || 'Gallery'}, image ${i + 1} of ${items.length}`; imgEl.style.opacity = 1; };
      next.src = srcs[i];
      cap.textContent = `${i + 1} / ${items.length}`;
    };
    const open = (n, from) => { opener = from; lb.hidden = false; requestAnimationFrame(() => lb.classList.add('open')); document.body.classList.add('lb-open'); show(n); $('.lb-close', lb).focus(); };
    const close = () => { lb.classList.remove('open'); document.body.classList.remove('lb-open'); setTimeout(() => { lb.hidden = true; }, 400); opener && opener.focus(); };
    items.forEach((b, n) => b.addEventListener('click', () => open(n, b)));
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', () => show(i - 1));
    $('.lb-next', lb).addEventListener('click', () => show(i + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(i - 1);
      else if (e.key === 'ArrowRight') show(i + 1);
      else if (e.key === 'Tab') { // keep focus inside the dialog
        const f = $$('button', lb); const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    lb.addEventListener('touchstart', (e) => { tx = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) show(i + (d < 0 ? 1 : -1)); }, { passive: true });
  }

  /* ── Enquiry form ───────────────────────────────────── */
  const form = $('#enquiry');
  if (form) {
    const status = $('.form-status', form);
    const org = $('.org', form);
    const orgInput = $('#org', form);

    $$('input[name="clientType"]', form).forEach((r) => r.addEventListener('change', () => {
      const corp = r.checked && r.value !== 'Individual';
      if (r.checked) { org.hidden = !corp; if (!corp) orgInput.value = ''; }
    }));

    // Prefill from links such as /contact/?type=corporate
    const q = new URLSearchParams(location.search);
    const map = { weddings: 'Wedding', corporate: 'Corporate Event', parties: 'Birthday / Private Party', live: 'Concert / Live Show', brands: 'Brand / Commercial Shoot', portraits: 'Portrait / Lifestyle', design: 'Other' };
    if (q.get('type') && map[q.get('type')]) {
      $('#eventType', form).value = map[q.get('type')];
      if (q.get('type') === 'corporate' || q.get('type') === 'brands') { $('input[name="clientType"][value^="Company"]', form).click(); }
    }
    $('#date', form).min = new Date().toISOString().slice(0, 10);

    const rules = {
      name: (v) => v.trim().length < 2 && 'Please enter your name.',
      email: (v) => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) && 'Please enter a valid email address.',
      phone: (v) => v.replace(/\D/g, '').length < 7 && 'Please enter a valid phone number.',
      eventType: (v) => !v && 'Please choose an event type.',
    };
    const validateField = (name) => {
      const el = form.elements[name]; const msg = rules[name](el.value) || '';
      $(`.err[data-for="${name}"]`, form).textContent = msg;
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg) el.setAttribute('aria-describedby', `err-${name}`); else el.removeAttribute('aria-describedby');
      $(`.err[data-for="${name}"]`, form).id = `err-${name}`;
      return !msg;
    };
    Object.keys(rules).forEach((n) => form.elements[n].addEventListener('blur', () => validateField(n)));
    Object.keys(rules).forEach((n) => form.elements[n].addEventListener('input', () => form.elements[n].getAttribute('aria-invalid') === 'true' && validateField(n)));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.className = 'form-status'; status.textContent = '';
      const results = Object.keys(rules).map(validateField);
      if (results.includes(false)) {
        const firstBad = Object.keys(rules).find((n) => form.elements[n].getAttribute('aria-invalid') === 'true');
        form.elements[firstBad].focus();
        status.classList.add('bad'); status.textContent = 'Please check the highlighted fields.';
        return;
      }
      if (form.elements.company_website.value) return; // honeypot

      const fd = new FormData(form);
      const data = {
        clientType: fd.get('clientType'), organisation: fd.get('organisation') || '', name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'),
        eventType: fd.get('eventType'), date: fd.get('date') || '', location: fd.get('location') || '',
        services: fd.getAll('services'), duration: fd.get('duration') || '', notes: fd.get('notes') || '',
      };
      const btn = $('button[type="submit"]', form);
      const endpoint = form.dataset.endpoint;

      if (endpoint) {
        btn.disabled = true; btn.style.opacity = '.6';
        try {
          const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
          if (!res.ok) throw new Error(String(res.status));
          form.reset(); org.hidden = true;
          status.classList.add('ok'); status.textContent = 'Thank you. Your enquiry has reached us, and we’ll reply personally.';
          status.focus();
        } catch {
          status.classList.add('bad'); status.textContent = `Something went wrong sending your enquiry. Please email us directly at ${form.dataset.mailto}.`;
        } finally { btn.disabled = false; btn.style.opacity = ''; }
        return;
      }

      // No backend configured: open the visitor's email app with the enquiry pre-written.
      const lines = [
        `Enquiry from: ${data.name} (${data.clientType}${data.organisation ? ' — ' + data.organisation : ''})`,
        `Email: ${data.email}`, `Phone: ${data.phone}`, `Event type: ${data.eventType}`,
        `Event date: ${data.date || 'TBC'}`, `Location: ${data.location || 'TBC'}`,
        `Services: ${data.services.length ? data.services.join(', ') : 'Not specified'}`,
        `Duration: ${data.duration || 'TBC'}`, '', data.notes || '',
      ];
      location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent('Enquiry: ' + data.eventType + ' — ' + data.name)}&body=${encodeURIComponent(lines.join('\n'))}`;
      status.classList.add('ok');
      status.textContent = 'Your email app should now open with your enquiry ready to send. If it doesn’t, please write to us directly.';
      status.focus();
    });
  }
})();
