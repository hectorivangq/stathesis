/* ==========================================================================
   STATHESIS interaction layer.
   1. The data field: ~1,200 points assemble into the S and its point, react
      to the cursor, and drift apart as the hero scrolls away.
   2. Discipline tabs, the service-area map legend, the services side index.
   3. Small things that make it feel alive: cursor spotlight on panels,
      magnetic buttons and a reading progress bar.
   4. GSAP 3.13.0 + ScrollTrigger (home only): the pinned forest plot, the
      engagement line, the closing seal turning with the scroll.
   Everything is written to its finished state in the HTML, so no-JS and
   reduced-motion visitors get the complete page.
   ========================================================================== */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;

  /* ---------------------------------------------------------------- progress bar */
  const bar = document.querySelector('.progress');
  if (bar) {
    let ticking = false;
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--p', h > 0 ? (window.scrollY / h).toFixed(4) : 0);
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------------------------------------------------------------- spotlight + magnetic */
  if (fine) {
    document.querySelectorAll('.spot').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
    if (!reduce) {
      document.querySelectorAll('.magnetic').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const x = e.clientX - (r.left + r.width / 2);
          const y = e.clientY - (r.top + r.height / 2);
          el.style.transform = `translate(${(x * 0.2).toFixed(1)}px, ${(y * 0.3).toFixed(1)}px)`;
        });
        el.addEventListener('pointerleave', () => { el.style.transform = ''; });
      });
    }
  }

  /* ---------------------------------------------------------------- reveal safety net */
  if (!reduce) {
    let t;
    const settle = () => document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) el.classList.add('is-in');
    });
    window.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(settle, 180); }, { passive: true });
  }

  /* ---------------------------------------------------------------- 1. the data field */
  const field = document.querySelector('.field');
  const canvas = field && field.querySelector('canvas');
  const ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (ctx) {
    // Geometry of the Point mark, in its 100-unit box (same numbers as build_logo_v4.py)
    const T = 21, R = (100 - T) / 4, RX = R * 1.08, CX = 50, TC = 50 - R, BC = 50 + R;
    const A0 = -32, A1 = 128, DOT_A = 160, DOT_R = 9.6;
    const rad = (d) => (d * Math.PI) / 180;
    let seed = 20180318;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    const topSpan = A0 + 270, botSpan = A1 + 90, span = topSpan + botSpan;
    const pts = [];
    const add = (x, y, dot) => pts.push({ ux: x, uy: y, dot, x: 0, y: 0, vx: 0, vy: 0,
      s: dot ? 1.5 + rnd() * 1.4 : 0.8 + rnd() * 1.5, a: dot ? 0.95 : 0.35 + rnd() * 0.6,
      ph: rnd() * Math.PI * 2, delay: rnd() * 650, sx: rnd(), sy: rnd() });
    for (let i = 0; i < 1100; i++) {
      const u = rnd() * span, o = (rnd() - 0.5) * T * 0.94;
      if (u < topSpan) { const th = rad(A0 - u); add(CX + (RX + o) * Math.cos(th), TC + (R + o) * Math.sin(th), false); }
      else { const th = rad(-90 + (u - topSpan)); add(CX + (RX + o) * Math.cos(th), BC + (R + o) * Math.sin(th), false); }
    }
    const dcx = CX + RX * Math.cos(rad(DOT_A)), dcy = BC + R * Math.sin(rad(DOT_A));
    for (let i = 0; i < 140; i++) {
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * DOT_R * 0.92;
      add(dcx + rr * Math.cos(a), dcy + rr * Math.sin(a), true);
    }

    let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0;
    const mouse = { x: 0, y: 0, on: false };
    const size = () => {
      const r = field.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(W, H) * 0.0066;
      ox = W / 2 - 50 * scale; oy = H / 2 - 50 * scale;
      pts.forEach((p) => { p.tx = ox + p.ux * scale; p.ty = oy + p.uy * scale; });
    };
    size();

    const draw = (t) => {
      ctx.clearRect(0, 0, W, H);
      const groups = [[], [], []];
      pts.forEach((p) => groups[p.dot ? 2 : (p.a > 0.7 ? 1 : 0)].push(p));
      const fills = ['rgba(169,184,201,0.55)', 'rgba(255,255,255,0.9)', '#E06C79'];
      groups.forEach((g, gi) => {
        ctx.beginPath();
        g.forEach((p) => { const s = gi === 2 ? p.s * (1 + 0.12 * Math.sin(t / 420 + p.ph)) : p.s; ctx.moveTo(p.x + s, p.y); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); });
        ctx.fillStyle = fills[gi]; ctx.fill();
      });
    };

    if (reduce) {
      pts.forEach((p) => { p.x = p.tx; p.y = p.ty; });
      draw(0);
    } else {
      // start as scattered raw data
      pts.forEach((p) => { p.x = p.sx * W; p.y = p.sy * H; });
      let running = false, start = 0, raf = 0, scatter = 0;
      const MR = 80;
      const tick = (now) => {
        if (!start) start = now;
        const t = now - start;
        // scrolling the hero away dissolves the mark back toward data
        const fr = field.getBoundingClientRect();
        scatter = Math.min(1, Math.max(0, -fr.top / (fr.height * 0.9)));
        pts.forEach((p) => {
          const ready = Math.min(1, Math.max(0, (t - p.delay) / 600));
          const wob = 0.9 * Math.sin(t / 900 + p.ph);
          const tx = p.tx + wob + (p.sx - 0.5) * W * 0.9 * scatter;
          const ty = p.ty + wob * 0.6 + (p.sy - 0.5) * H * 0.9 * scatter;
          let ax = (tx - p.x) * 0.055 * ready, ay = (ty - p.y) * 0.055 * ready;
          if (mouse.on) {
            const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
            if (d2 < MR * MR) { const d = Math.sqrt(d2) || 1, f = (1 - d / MR) ** 2 * 3.4; ax += (dx / d) * f; ay += (dy / d) * f; }
          }
          p.vx = (p.vx + ax) * 0.86; p.vy = (p.vy + ay) * 0.86;
          p.x += p.vx; p.y += p.vy;
        });
        draw(t);
        if (running) raf = requestAnimationFrame(tick);
      };
      const run = (on) => {
        if (on && !running) { running = true; raf = requestAnimationFrame(tick); }
        if (!on && running) { running = false; cancelAnimationFrame(raf); }
      };
      new IntersectionObserver((es) => es.forEach((e) => run(e.isIntersecting))).observe(field);
      document.addEventListener('visibilitychange', () => run(!document.hidden && field.getBoundingClientRect().bottom > 0));
      field.addEventListener('pointermove', (e) => { const r = field.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true; });
      field.addEventListener('pointerleave', () => { mouse.on = false; });
    }
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); if (reduce) { pts.forEach((p) => { p.x = p.tx; p.y = p.ty; }); draw(0); } }, 120); });
  }

  /* ---------------------------------------------------------------- 2a. discipline tabs */
  const tabs = [...document.querySelectorAll('.disc-tab')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  if (tabs.length && panels.every(Boolean)) {
    let current = 0, hoverT;
    const select = (i, focus) => {
      if (i === current && !focus) return;
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach((p, k) => {
        if (k === i) { p.hidden = false; if (!reduce) { p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering'); } }
        else p.hidden = true;
      });
      if (focus) tabs[i].focus();
      current = i;
    };
    panels.forEach((p, k) => { p.hidden = k !== 0; });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const n = tabs.length;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select((current + 1) % n, true); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select((current - 1 + n) % n, true); }
        if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        if (e.key === 'End') { e.preventDefault(); select(n - 1, true); }
      });
      if (fine) {
        t.addEventListener('pointerenter', () => { clearTimeout(hoverT); hoverT = setTimeout(() => select(i), 140); });
        t.addEventListener('pointerleave', () => clearTimeout(hoverT));
      }
    });
  }

  /* ---------------------------------------------------------------- 2b. map legend */
  const mapTile = document.querySelector('.tile-map');
  if (mapTile) {
    const note = mapTile.querySelector('.region-note');
    const base = note ? note.textContent : '';
    const keys = [...mapTile.querySelectorAll('.legend button')];
    let pinned = null;
    const show = (b) => {
      mapTile.dataset.active = b ? b.dataset.region : '';
      if (note) note.textContent = b ? b.dataset.note : base;
    };
    keys.forEach((b) => {
      b.addEventListener('pointerenter', () => { if (!pinned) show(b); });
      b.addEventListener('pointerleave', () => { if (!pinned) show(null); });
      b.addEventListener('focus', () => { if (!pinned) show(b); });
      b.addEventListener('blur', () => { if (!pinned) show(null); });
      b.addEventListener('click', () => {
        pinned = pinned === b ? null : b;
        keys.forEach((k) => k.setAttribute('aria-pressed', String(k === pinned)));
        show(pinned);
      });
    });
  }

  /* ---------------------------------------------------------------- 2c. services side index */
  const index = document.querySelector('.side-index');
  if (index) {
    const links = [...index.querySelectorAll('a')];
    const blocks = links.map((a) => document.querySelector(a.getAttribute('href')));
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a, k) => a.classList.toggle('is-active', blocks[k] === e.target));
    }), { rootMargin: '-35% 0px -60% 0px' });
    blocks.forEach((b) => b && io.observe(b));
    const wrap = document.querySelector('.svc-content');
    const fill = index.querySelector('.bar');
    if (wrap && fill) {
      const upd = () => {
        const r = wrap.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (window.innerHeight * 0.4 - r.top) / r.height));
        fill.style.setProperty('--read', p.toFixed(3));
      };
      window.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true });
      upd();
    }
  }

  /* ---------------------------------------------------------------- 4. GSAP sequences (home) */
  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();

  // Engagement line draws across the three steps and lights each node
  const pathWrap = document.querySelector('.path-wrap');
  if (pathWrap) {
    const steps = [...pathWrap.querySelectorAll('.path-step')];
    const line = pathWrap.querySelector('.path-line');
    ScrollTrigger.create({
      trigger: pathWrap, start: 'top 78%', end: 'bottom 55%', scrub: 0.5,
      onUpdate: (self) => {
        if (line) line.style.setProperty('--line-p', self.progress.toFixed(3));
        steps.forEach((s, i) => s.classList.toggle('is-lit', self.progress >= (steps.length > 1 ? i / (steps.length - 1) : 0) - 0.02));
      },
    });
    if (line) line.style.setProperty('--line-p', 0);
  }

  // The closing seal turns as the band scrolls through
  const seal = document.querySelector('.closing .seal-wrap img');
  if (seal) gsap.fromTo(seal, { rotate: -40 }, { rotate: 40, ease: 'none', scrollTrigger: { trigger: '.closing', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });

  // Method: pin the section and build the forest plot (desktop)
  const method = document.querySelector('.method');
  if (!method) return;
  mm.add('(min-width: 60rem)', () => {
    const mSteps = [...method.querySelectorAll('.mstep')];
    const question = method.querySelector('.plot .question');
    const rows = [...method.querySelectorAll('.plot .row')];
    const cis = rows.map((r) => r.querySelector('.ci'));
    const pooled = method.querySelector('.plot .pooled-g');
    method.classList.add('is-pinned');
    const setActive = (i) => mSteps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    setActive(0);
    gsap.set(question, { opacity: 0, y: 8 });
    gsap.set(rows, { opacity: 0 });
    cis.forEach((ci) => gsap.set(ci, { attr: { x1: +ci.dataset.w1, x2: +ci.dataset.w2 } }));
    gsap.set(pooled, { opacity: 0, scale: 0.3, transformOrigin: '50% 50%' });
    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: { trigger: method, start: 'top top', end: '+=280%', scrub: 0.6, pin: true, anticipatePin: 1,
        onUpdate: (self) => setActive(Math.min(mSteps.length - 1, Math.floor(self.progress * mSteps.length * 0.999))) },
    });
    tl.to(question, { opacity: 1, y: 0, duration: 1 })
      .to(rows, { opacity: 1, duration: 0.6, stagger: 0.18 }, '+=0.3')
      .to(cis, { attr: { x1: (i, el) => +el.dataset.n1, x2: (i, el) => +el.dataset.n2 }, duration: 1.4, stagger: 0.06, ease: 'power3.inOut' }, '+=0.4')
      .to(pooled, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' }, '+=0.3');
    tl.to({}, { duration: 0.6 });
    return () => method.classList.remove('is-pinned');
  });
})();
