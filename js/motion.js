/* ==========================================================================
   motion.js: dependency-free motion layer for the starter.
   Covers ~90% of what a small-business site needs: scroll reveals with
   stagger, masked headline reveals, image unmasks, count-ups, header state,
   light parallax, SVG line draws, mobile nav. Reach for GSAP + ScrollTrigger
   (pinned exact version) only for pinned/scrubbed sequences or timelines.
   ========================================================================== */
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Split [data-split] headings into masked words. Screen readers get the
     original sentence via aria-label; the word spans are hidden from them. */
  document.querySelectorAll('[data-split]').forEach((el) => {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    let i = 0;
    /* Split text nodes into masked words, keeping any inline spans (e.g. a
       greyed phrase) and their classes intact. */
    const splitNode = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span');
            inner.style.setProperty('--i', i++); inner.textContent = part;
            w.appendChild(inner); frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          child.setAttribute('aria-hidden', 'true');
          splitNode(child);
        }
      });
    };
    splitNode(el);
    el.setAttribute('data-reveal', '');
  });

  /* Stagger: children of [data-stagger] reveal one after another */
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    [...group.children].forEach((child, i) => {
      child.setAttribute('data-reveal', '');
      child.style.setProperty('--i', i);
    });
  });

  /* SVG line length for draw-on */
  document.querySelectorAll('.draw path').forEach((p) => {
    if (p.getTotalLength) p.closest('.draw').style.setProperty('--len', Math.ceil(p.getTotalLength()));
  });

  /* Count-up numbers: <span data-count="120" data-suffix="+">120+</span>.
     The real number is in the HTML, so no-JS and reduced motion see it. */
  const countUp = (el) => {
    const end = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    if (reduce) return;
    const dur = 1600;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = prefix + (end * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* One observer for everything that reveals */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-in');
      if (el.dataset.count) countUp(el);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

  document.querySelectorAll('[data-reveal], [data-count]').forEach((el) => {
    if (reduce) el.classList.add('is-in');
    else io.observe(el);
  });

  /* Failsafe: nothing above the fold may stay hidden if the observer is late
     (background tab, slow device). */
  window.addEventListener('load', () => setTimeout(() => {
    document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add('is-in'); io.unobserve(el); }
    });
  }, 1200));

  /* Header: compact + hairline once the page scrolls */
  const header = document.querySelector('.site-header');
  const parallax = reduce ? [] : [...document.querySelectorAll('[data-parallax]')];
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (header) header.classList.toggle('is-scrolled', y > 8);
      parallax.forEach((el) => {
        const r = el.getBoundingClientRect();
        const speed = parseFloat(el.dataset.parallax) || 0.08;
        const offset = (r.top + r.height / 2 - window.innerHeight / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile nav */
  const toggle = document.querySelector('.nav-toggle');
  const panel = document.getElementById('mobile-nav');
  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });
    panel.addEventListener('click', (e) => {
      if (e.target.closest('a')) { toggle.setAttribute('aria-expanded', 'false'); panel.hidden = true; }
    });
  }
})();
