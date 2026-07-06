/* ============================================
   NexCode — Core Interactions
   ============================================ */

/* ── CURSOR ── */
(function () {
  if (!window.matchMedia('(hover:hover)').matches) return;
  const dot = document.getElementById('cur-dot');
  const ring = document.getElementById('cur-ring');
  if (!dot || !ring) return;
  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px'; });
  (function tick() { rx += (mx - rx) * .12; ry += (my - ry) * .12; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(tick); })();
  const grow = () => ring.classList.add('grow'), shrink = () => ring.classList.remove('grow');
  document.querySelectorAll('a,button,.card,.tilt,input,textarea,select').forEach(el => { el.addEventListener('mouseenter', grow); el.addEventListener('mouseleave', shrink); });
})();

/* ── NAV ── */
(function () {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const check = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', check, { passive: true });
  check();
  document.querySelector('.burger')?.addEventListener('click', () => nav.classList.toggle('open'));
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-center a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === 'index.html' && href === 'index.html') || (href !== 'index.html' && href && path.includes(href.replace('.html', '')))) a.classList.add('active');
  });
})();

/* ── SCROLL REVEAL ── */
(function () {
  const els = document.querySelectorAll('.reveal,.reveal-l,.reveal-r,.reveal-s');
  if (!els.length) return;
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => obs.observe(el));
  } else els.forEach(el => el.classList.add('in'));
})();

/* ── SPOTLIGHT ── */
document.querySelectorAll('.spot').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--sx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    el.style.setProperty('--sy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  });
});

/* ── TILT ── */
document.querySelectorAll('.tilt').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    el.style.transform = `perspective(1000px) rotateY(${dx * 5}deg) rotateX(${-dy * 5}deg) translateY(-4px)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
    el.style.transform = '';
    setTimeout(() => el.style.transition = '', 600);
  });
});

/* ── MAGNETIC ── */
document.querySelectorAll('.mag').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .3}px,${(e.clientY - r.top - r.height / 2) * .3}px)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
    el.style.transform = '';
    setTimeout(() => el.style.transition = '', 500);
  });
});

/* ── RIPPLE ── */
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  const size = Math.max(r.width, r.height);
  const sp = document.createElement('span');
  sp.className = 'ripple';
  sp.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  btn.appendChild(sp);
  setTimeout(() => sp.remove(), 600);
});

/* ── SMOOTH ANCHOR ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const t = document.querySelector(id);
    if (t) { e.preventDefault(); document.querySelector('.nav')?.classList.remove('open'); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

/* ── COUNTER ── */
(function () {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length || !('IntersectionObserver' in window)) return;
  const animate = el => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const isFloat = String(target).includes('.');
    const dur = 1800, start = performance.now();
    (function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      const v = target * eased;
      el.textContent = prefix + (isFloat ? v.toFixed(1) : Math.round(v).toLocaleString()) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(start);
  };
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { animate(e.target); obs.unobserve(e.target); } });
  }, { threshold: .5 });
  els.forEach(el => obs.observe(el));
})();

/* ── FAQ ACCORDION ── */
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const body = item.querySelector('.faq-a');
    const open = btn.classList.contains('open');
    document.querySelectorAll('.faq-q.open').forEach(b => {
      b.classList.remove('open');
      b.closest('.faq-item').querySelector('.faq-a').style.maxHeight = '0';
    });
    if (!open) { btn.classList.add('open'); body.style.maxHeight = body.scrollHeight + 40 + 'px'; }
  });
});

/* ── FAQ CATEGORY FILTER ── */
document.querySelectorAll('.faq-cat').forEach(cat => {
  cat.addEventListener('click', () => {
    document.querySelectorAll('.faq-cat').forEach(c => c.classList.remove('on'));
    cat.classList.add('on');
    const g = cat.dataset.cat;
    document.querySelectorAll('.faq-group').forEach(gr => gr.style.display = gr.dataset.cat === g ? 'block' : 'none');
  });
});

/* ── FAQ SEARCH ── */
const faqSearch = document.getElementById('faq-search');
if (faqSearch) {
  faqSearch.addEventListener('input', function () {
    const q = this.value.toLowerCase().trim();
    const noRes = document.getElementById('faq-no-results');
    if (!q) {
      document.querySelectorAll('.faq-group').forEach(g => g.style.display = 'block');
      document.querySelectorAll('.faq-item').forEach(i => i.style.display = '');
      if (noRes) noRes.style.display = 'none';
      return;
    }
    let found = 0;
    document.querySelectorAll('.faq-group').forEach(g => g.style.display = 'block');
    document.querySelectorAll('.faq-item').forEach(item => {
      const show = item.textContent.toLowerCase().includes(q);
      item.style.display = show ? '' : 'none';
      if (show) found++;
    });
    if (noRes) noRes.style.display = found ? 'none' : 'block';
    document.querySelectorAll('.faq-cat').forEach(c => c.classList.remove('on'));
  });
}

/* ── PRICING TOGGLE ── */
const billingTog = document.getElementById('billing-toggle');
if (billingTog) {
  let annual = false;
  billingTog.addEventListener('click', () => {
    annual = !annual;
    billingTog.classList.toggle('active', annual);
    billingTog.setAttribute('aria-checked', annual);
    document.getElementById('lbl-monthly')?.classList.toggle('on', !annual);
    document.getElementById('lbl-annual')?.classList.toggle('on', annual);
    document.querySelectorAll('[data-monthly]').forEach(el => {
      const from = parseFloat(annual ? el.dataset.monthly : el.dataset.annual);
      const to = parseFloat(annual ? el.dataset.annual : el.dataset.monthly);
      const dur = 400, start = performance.now();
      (function step(now) {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = '$' + Math.round(from + (to - from) * eased);
        if (p < 1) requestAnimationFrame(step);
      })(start);
    });
    document.querySelectorAll('[data-annual-note]').forEach(el => {
      el.style.display = annual ? 'block' : 'none';
    });
  });
  billingTog.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); billingTog.click(); } });
}

/* ── CONTACT FORM ── */
const contactSend = document.getElementById('contact-send');
if (contactSend) {
  contactSend.addEventListener('click', () => {
    const req = ['cf-name', 'cf-email', 'cf-topic', 'cf-msg'];
    let valid = true;
    req.forEach(id => { const el = document.getElementById(id); if (el && !el.value.trim()) valid = false; });
    if (!valid) {
      contactSend.style.background = 'rgba(240,82,82,.22)';
      const orig = contactSend.innerHTML;
      contactSend.textContent = 'Please fill in all required fields';
      setTimeout(() => { contactSend.style.background = ''; contactSend.innerHTML = orig; }, 2200);
      return;
    }
    document.getElementById('contact-form').style.display = 'none';
    document.getElementById('contact-success').style.display = 'block';
  });
}

/* ── DOCS SCROLL-SPY ── */
(function () {
  const sections = document.querySelectorAll('.docs-section');
  const links = document.querySelectorAll('.ds-link');
  if (!sections.length || !links.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('on'));
        document.querySelector(`.ds-link[href="#${e.target.id}"]`)?.classList.add('on');
      }
    });
  }, { rootMargin: '-25% 0px -65% 0px' });
  sections.forEach(s => obs.observe(s));
})();

/* ── COMPILE SETTINGS DEMO (features page) ── */
document.querySelectorAll('.toggle-demo').forEach(t => {
  t.addEventListener('click', () => t.classList.toggle('on'));
});
