/* ==========================================================================
   qa-audit.js: paste into the browser console (or run through the browser
   tool) on any page of the site, at each test width. Returns a report of the
   mechanical defects a design review misses: horizontal overflow, images
   without dimensions or alt, heading-level skips, off-scale spacing, small
   tap targets, and content hidden without JS. Contrast and performance come
   from Lighthouse, not from here.
   ========================================================================== */
(() => {
  const vw = document.documentElement.clientWidth;
  const px = (v) => parseFloat(v) || 0;
  const report = { width: vw, overflow: [], images: [], headings: [], spacing: [], targets: [], hidden: [] };

  // 1. Horizontal overflow (marquees clip on purpose)
  if (document.documentElement.scrollWidth > vw) report.overflow.push(`page scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);
  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest('.marquee, [aria-hidden="true"]')) return;
    const r = el.getBoundingClientRect();
    if (r.width && r.right > vw + 1) report.overflow.push(`${el.tagName.toLowerCase()}.${el.className} right=${Math.round(r.right)}`);
  });

  // 2. Images: every <img> needs alt (may be empty) and intrinsic size or a .media slot
  document.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (!img.hasAttribute('alt')) report.images.push(`missing alt: ${src}`);
    if (!(img.getAttribute('width') && img.getAttribute('height')) && !img.closest('.media')) report.images.push(`no width/height or slot: ${src}`);
    const r = img.getBoundingClientRect();
    if (img.naturalWidth && r.width && img.naturalWidth < r.width * Math.min(devicePixelRatio, 2) * 0.9) report.images.push(`soft (${img.naturalWidth}px for ${Math.round(r.width)}px box): ${src}`);
  });
  report.images.push(...[...document.querySelectorAll('.media')].filter((m) => !m.querySelector('img, video')).map((m) => `empty slot: ${(m.dataset.label || '').split('\n')[0]}`));

  // 3. Headings: one h1, no skipped levels
  const hs = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  const h1s = hs.filter((h) => h.tagName === 'H1').length;
  if (h1s !== 1) report.headings.push(`${h1s} h1 elements (want 1)`);
  hs.reduce((prev, h) => { const lvl = +h.tagName[1]; if (lvl > prev + 1) report.headings.push(`h${prev} → h${lvl}: "${h.textContent.trim().slice(0, 40)}"`); return lvl; }, 1);

  // 4. Spacing: margins/paddings/gaps must come from the token scale
  const probe = document.createElement('div');
  document.body.appendChild(probe);
  const scale = new Set([0]);
  ['3xs', '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl', 'section'].forEach((k) => {
    probe.style.width = `var(--space-${k})`;
    scale.add(Math.round(probe.getBoundingClientRect().width));
  });
  probe.remove();
  const offScale = new Map();
  document.querySelectorAll('main *, header *, footer *').forEach((el) => {
    const cs = getComputedStyle(el);
    ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'rowGap', 'columnGap'].forEach((prop) => {
      const v = Math.round(px(cs[prop]));
      if (v > 4 && ![...scale].some((s) => Math.abs(s - v) <= 1)) {
        const key = `${prop}:${v}px`;
        if (!offScale.has(key)) offScale.set(key, `${el.tagName.toLowerCase()}.${el.className}`);
      }
    });
  });
  offScale.forEach((el, key) => report.spacing.push(`${key} on ${el}`));

  // 5. Tap targets under 24×24 (WCAG 2.2 2.5.8), inline text links excepted
  document.querySelectorAll('a, button, input, select, textarea, summary, [role="button"]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p, li');
    if (!inline && (r.width < 24 || r.height < 24)) report.targets.push(`${Math.round(r.width)}×${Math.round(r.height)} "${(el.textContent || el.ariaLabel || '').trim().slice(0, 30)}"`);
  });

  // 6. Anything still invisible after reveals ran (scroll the page first).
  //    A hidden tab pauses IntersectionObserver, so only trust this when visible.
  if (!document.hidden) document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < innerHeight) report.hidden.push(`not revealed in view: ${el.tagName.toLowerCase()}.${el.className}`);
  });

  const count = Object.entries(report).filter(([k]) => k !== 'width').reduce((n, [, v]) => n + v.length, 0);
  console.table(Object.fromEntries(Object.entries(report).filter(([k]) => k !== 'width').map(([k, v]) => [k, v.length])));
  return { issues: count, ...report };
})();
