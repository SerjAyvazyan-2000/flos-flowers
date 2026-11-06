/* FLOS — interactions */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Preloader ---------- */
  const pre = $('#preloader');
  let readyFired = false;
  const ready = () => {
    if (readyFired) return; readyFired = true;
    pre.classList.add('is-done');
    body.classList.remove('is-loading');
    setTimeout(() => body.classList.add('is-ready'), 250);
    setTimeout(() => pre.remove(), 1400);
  };
  window.addEventListener('load', () => setTimeout(ready, reduce ? 0 : 900));
  setTimeout(ready, 3500);

  /* ---------- Split headings into words ---------- */
  $$('[data-split]').forEach(el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            w.appendChild(s); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.classList.contains('script')) {
          const w = document.createElement('span'); w.className = 'w';
          const s = document.createElement('span'); s.style.setProperty('--i', i++);
          n.replaceWith(w); s.appendChild(n); w.appendChild(s);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  });

  /* ---------- Reveal observer ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.hasAttribute('data-count-wrap')) runCounters(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal],[data-split],[data-clip],.m-item,.steps__list li,.steps__svg,.cloud').forEach(el => io.observe(el));

  // stagger masonry
  $$('.m-item').forEach((el, i) => el.style.transitionDelay = (i % 4) * 90 + 'ms');
  $$('.cloud li').forEach((el, i) => el.style.transitionDelay = i * 90 + 'ms');

  /* ---------- Counters ---------- */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, to = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0), suf = el.dataset.suffix || '';
      const dur = 1800, t0 = performance.now();
      const tick = t => {
        const p = clamp((t - t0) / dur, 0, 1), v = to * (1 - Math.pow(1 - p, 4));
        el.textContent = v.toFixed(dec).replace('.', ',') + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      reduce ? (el.textContent = to.toFixed(dec).replace('.', ',') + suf) : requestAnimationFrame(tick);
      countIO.unobserve(el);
    });
  }, { threshold: 0.5 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Header / progress / mbar / active nav ---------- */
  const header = $('#header'), prog = $('.progress i'), mbar = $('.mbar');
  const navLinks = $$('.nav a');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = $('#mobileMenu').classList.contains('is-open');
    header.classList.toggle('is-hidden', !menuOpen && y > 400 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove('is-hidden');
    lastY = y;
    prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    mbar.classList.toggle('is-visible', y > innerHeight * 0.7 && y < h - 300);
    let cur = null;
    sections.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * 0.4) cur = s; });
    navLinks.forEach(a => a.classList.toggle('is-active', cur && a.getAttribute('href') === '#' + cur.id));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Burger ---------- */
  const burger = $('#burger'), mmenu = $('#mobileMenu');
  const setMenu = open => {
    burger.classList.toggle('is-open', open);
    mmenu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mmenu.setAttribute('aria-hidden', !open);
    body.classList.toggle('is-locked', open);
    if (open) header.classList.remove('is-hidden');
  };
  burger.addEventListener('click', () => setMenu(!mmenu.classList.contains('is-open')));
  $$('a', mmenu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('resize', () => { if (innerWidth > 980) setMenu(false); });

  /* ---------- Custom cursor ---------- */
  if (fine && !reduce) {
    body.classList.add('has-cursor');
    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px)`; }, { passive: true });
    const loop = () => { rx = lerp(rx, mx, .16); ry = lerp(ry, my, .16); ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener('mouseover', e => {
      const t = e.target;
      cur.classList.toggle('is-view', !!t.closest('[data-cursor]') && !t.closest('button,a'));
      cur.classList.toggle('is-link', !!t.closest('a,button,input,textarea,label,[data-tilt]') && !t.closest('[data-cursor]'));
    });
    document.addEventListener('mouseleave', () => cur.style.opacity = 0);
    document.addEventListener('mouseenter', () => cur.style.opacity = 1);
  }

  /* ---------- Magnetic buttons ---------- */
  if (fine && !reduce) {
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * .28, y = (e.clientY - r.top - r.height / 2) * .38;
        el.style.transform = `translate(${x}px,${y}px)`;
      });
      el.addEventListener('mouseleave', () => el.style.transform = '');
    });
  }

  /* ---------- Hero parallax (mouse) ---------- */
  const hv = $('#heroVisual');
  if (hv && fine && !reduce) {
    const items = $$('[data-depth]', hv);
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener('mousemove', e => { tx = (e.clientX / innerWidth - .5); ty = (e.clientY / innerHeight - .5); }, { passive: true });
    const loop = () => {
      cx = lerp(cx, tx, .06); cy = lerp(cy, ty, .06);
      if (scrollY < innerHeight) items.forEach(it => { const d = +it.dataset.depth; it.style.transform = `translate3d(${cx * d * -28}px,${cy * d * -22}px,0)`; });
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- Falling petals canvas ---------- */
  const cv = $('#petals');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d');
    let W, H, dpr, petals = [], running = true, mouse = { x: -999, y: -999 };
    const colors = ['#e7c3bd', '#f0d6d1', '#c4223a', '#e03a51', '#f4ede5'];
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.offsetWidth; H = cv.offsetHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = W < 640 ? 14 : 30;
      while (petals.length < n) petals.push(mk(true));
      petals.length = n;
    };
    const mk = init => ({
      x: Math.random() * W, y: init ? Math.random() * H : -30,
      s: 6 + Math.random() * 11, vy: .35 + Math.random() * .8, vx: -.3 + Math.random() * .6,
      r: Math.random() * Math.PI * 2, vr: (-.5 + Math.random()) * .03,
      sw: Math.random() * Math.PI * 2, flip: Math.random() * Math.PI * 2,
      c: colors[Math.floor(Math.random() * colors.length)], a: .45 + Math.random() * .45
    });
    const draw = p => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.abs(Math.cos(p.flip)) * .7 + .3);
      ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.moveTo(0, -p.s);
      ctx.bezierCurveTo(p.s * .9, -p.s * .7, p.s * .7, p.s * .6, 0, p.s);
      ctx.bezierCurveTo(-p.s * .7, p.s * .6, -p.s * .9, -p.s * .7, 0, -p.s);
      ctx.fill(); ctx.restore();
    };
    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      petals.forEach((p, i) => {
        p.sw += .015; p.flip += .03; p.r += p.vr;
        p.x += p.vx + Math.sin(p.sw) * .6; p.y += p.vy;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 120) { p.x += dx / d * 2.2; p.y += dy / d * 1.2; }
        if (p.y > H + 30 || p.x < -40 || p.x > W + 40) petals[i] = mk(false);
        draw(p);
      });
      requestAnimationFrame(tick);
    };
    resize(); addEventListener('resize', resize);
    cv.parentElement.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    new IntersectionObserver(([e]) => { const was = running; running = e.isIntersecting; if (running && !was) tick(); }).observe(cv);
    tick();
  }

  /* ---------- Occasion tabs ---------- */
  const occData = [
    { tag: 'Повод: любимой', name: 'Чёрный бархат', desc: 'Глубокие красные розы в чёрной упаковке с атласной лентой. Смелый жест, который запоминают надолго.', price: 'от 6 500 ₽' },
    { tag: 'Повод: маме', name: 'Пионовый сад', desc: 'Пионы, лилии, гортензия и ромашки — нежно, щедро и по-домашнему тепло. Как её объятия.', price: 'от 5 900 ₽' },
    { tag: 'Повод: день рождения', name: 'Пастельное облако', desc: 'Пышные гортензии в голубом, пудровом и ванильном. Праздник, который видно с порога.', price: 'от 7 500 ₽' },
    { tag: 'Повод: просто так', name: 'Ромашковое поле', desc: 'Сотни маленьких солнц в матовой плёнке. Лучший способ сказать «думаю о тебе» без всякого повода.', price: 'от 2 900 ₽' },
    { tag: 'Повод: извиниться', name: 'Белый флаг', desc: '25 белых роз в нежно-голубой упаковке. Чистый белый цвет честнее любых оправданий.', price: 'от 4 900 ₽' },
    { tag: 'Повод: коллеге', name: 'Сухоцвет в стакане', desc: 'Компактная композиция на рабочий стол: хлопок, гортензия, лаванда. Простоит год без воды.', price: 'от 2 400 ₽' }
  ];
  const tabs = $$('.occ-tab'), imgs = $$('.occ-img'), info = $('.occasion__info'), timer = $('.occasion__timer i');
  let occIdx = 0, occAuto = true, occT;
  const setOcc = (i, user) => {
    if (i === occIdx && !user) return;
    if (user) occAuto = false;
    const prev = occIdx; occIdx = i;
    tabs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-selected', k === i); });
    imgs.forEach((im, k) => { im.classList.remove('is-leaving'); if (k === prev && k !== i) im.classList.add('is-leaving'); im.classList.toggle('is-active', k === i); });
    info.classList.add('is-swap');
    setTimeout(() => {
      const d = occData[i];
      $('#occTag').textContent = d.tag; $('#occName').textContent = d.name;
      $('#occDesc').textContent = d.desc; $('#occPrice').textContent = d.price;
      $('#occBtn').dataset.name = d.name;
      info.classList.remove('is-swap');
    }, 320);
    if (user && innerWidth <= 980) tabs[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    restartTimer();
  };
  const restartTimer = () => {
    clearTimeout(occT); timer.classList.remove('run'); void timer.offsetWidth;
    if (!occAuto || reduce) { timer.style.transform = 'scaleX(0)'; return; }
    timer.classList.add('run');
    occT = setTimeout(() => setOcc((occIdx + 1) % occData.length), 6000);
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => setOcc(i, true)));
  new IntersectionObserver(([e]) => { if (e.isIntersecting && occAuto) restartTimer(); else clearTimeout(occT); }, { threshold: .3 }).observe($('#occasion'));

  /* ---------- Horizontal catalog (desktop pin) ---------- */
  const cat = $('#catalog'), track = $('#catTrack'), bar = $('#catBar'), vp = $('.catalog__viewport');
  let pinned = false, maxX = 0, curX = 0, tgtX = 0;
  const setupCat = () => {
    pinned = innerWidth > 980 && innerHeight >= 620 && !reduce;
    cat.classList.toggle('is-pinned', pinned);
    if (pinned) {
      track.style.transform = '';
      maxX = Math.max(0, track.scrollWidth - innerWidth);
      cat.style.height = (innerHeight + maxX) + 'px';
    } else { cat.style.height = ''; track.style.transform = ''; }
  };
  const catScroll = () => {
    if (pinned) {
      const r = cat.getBoundingClientRect();
      const p = clamp(-r.top / (cat.offsetHeight - innerHeight || 1), 0, 1);
      tgtX = p * maxX; bar.style.transform = `scaleX(${.08 + p * .92})`;
    } else {
      const m = vp.scrollWidth - vp.clientWidth;
      bar.style.transform = `scaleX(${.08 + (m ? vp.scrollLeft / m : 0) * .92})`;
    }
  };
  const catLoop = () => {
    if (pinned) { curX = lerp(curX, tgtX, .1); track.style.transform = `translate3d(${-curX}px,0,0)`; }
    requestAnimationFrame(catLoop);
  };
  setupCat(); catScroll(); catLoop();
  addEventListener('scroll', catScroll, { passive: true });
  vp.addEventListener('scroll', catScroll, { passive: true });
  let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { setupCat(); catScroll(); }, 150); });
  addEventListener('load', () => { setupCat(); catScroll(); });

  /* ---------- Tilt cards ---------- */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach(c => {
      c.addEventListener('mousemove', e => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-6px)`;
      });
      c.addEventListener('mouseleave', () => c.style.transform = '');
    });
  }

  /* ---------- Scroll parallax ---------- */
  const scaleNum = $('#scaleNum'), scaleSec = $('#scale'), parImgs = $$('[data-parallax]');
  const par = () => {
    if (reduce) return;
    const r = scaleSec.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) {
      const p = (innerHeight - r.top) / (innerHeight + r.height);
      scaleNum.style.transform = `translate(${(-p * 40 + 10)}%,-50%)`;
    }
    parImgs.forEach(im => {
      const rr = im.parentElement.getBoundingClientRect();
      if (rr.bottom < 0 || rr.top > innerHeight) return;
      const p = (rr.top + rr.height / 2 - innerHeight / 2) / innerHeight;
      im.style.transform = `translateY(${p * -100 * +im.dataset.parallax}%)`;
    });
  };
  addEventListener('scroll', par, { passive: true }); par();

  /* ---------- Postcard ---------- */
  const pc = $('#pc'), pcIn = $('#pcInput'), pcMsg = $('#pcMsg'), pcCount = $('#pcCount');
  const placeholder = 'Напишите что-нибудь важное…';
  let prevText = '';
  const renderMsg = (text, animate) => {
    const t = text.trim() || placeholder;
    if (!animate || reduce) { pcMsg.textContent = t; prevText = t; return; }
    // animate only newly added characters
    let common = 0; while (common < prevText.length && prevText[common] === t[common]) common++;
    pcMsg.textContent = '';
    [...t].forEach((ch, i) => {
      const s = document.createElement('span'); s.className = i >= common ? 'ch' : '';
      if (i >= common) s.style.animationDelay = Math.min((i - common) * 22, 900) + 'ms';
      s.textContent = ch; pcMsg.appendChild(s);
    });
    prevText = t;
  };
  const flipTo = back => pc.classList.toggle('is-flipped', back);
  pcIn.addEventListener('input', () => { pcCount.textContent = pcIn.value.length; flipTo(true); renderMsg(pcIn.value, true); $$('.chip').forEach(c => c.classList.remove('is-active')); });
  $$('.chip').forEach(c => c.addEventListener('click', () => {
    $$('.chip').forEach(x => x.classList.toggle('is-active', x === c));
    pcIn.value = c.dataset.msg; pcCount.textContent = pcIn.value.length;
    prevText = ''; flipTo(true); renderMsg(pcIn.value, true);
  }));
  pc.addEventListener('click', () => flipTo(!pc.classList.contains('is-flipped')));
  $('#pcFlip').addEventListener('click', () => flipTo(!pc.classList.contains('is-flipped')));
  $('#pcOrder').addEventListener('click', () => openOrder('', pcIn.value.trim()));
  renderMsg('', false);

  /* ---------- Compare slider ---------- */
  const cmp = $('#compare'), cmpR = $('#compareRange');
  const setCmp = v => cmp.style.setProperty('--pos', v + '%');
  cmpR.addEventListener('input', () => setCmp(cmpR.value));
  // gentle intro sweep
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting || reduce) return; o.disconnect();
    const t0 = performance.now();
    const sweep = t => { const p = clamp((t - t0) / 2200, 0, 1); const v = 55 + Math.sin(p * Math.PI * 2) * 30 * (1 - p); setCmp(v); cmpR.value = v; if (p < 1) requestAnimationFrame(sweep); };
    requestAnimationFrame(sweep);
  }, { threshold: .5 }).observe(cmp);

  /* ---------- Accordion ---------- */
  $$('.acc__q').forEach(q => q.addEventListener('click', () => {
    const it = q.parentElement, open = !it.classList.contains('is-open');
    $$('.acc__item').forEach(x => { x.classList.remove('is-open'); $('.acc__q', x).setAttribute('aria-expanded', 'false'); });
    if (open) { it.classList.add('is-open'); q.setAttribute('aria-expanded', 'true'); }
  }));

  /* ---------- Modals ---------- */
  let lastFocus = null;
  const openModal = m => { lastFocus = document.activeElement; m.classList.add('is-open'); m.setAttribute('aria-hidden', 'false'); body.classList.add('is-locked'); setTimeout(() => { const f = $('input:not([type=hidden]),button', $('.modal__box', m)); f && f.focus({ preventScroll: true }); }, 300); };
  const closeModal = m => { m.classList.remove('is-open'); m.setAttribute('aria-hidden', 'true'); if (!$('.modal.is-open') && !mmenu.classList.contains('is-open')) body.classList.remove('is-locked'); lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); };
  $$('.modal').forEach(m => $$('[data-close]', m).forEach(b => b.addEventListener('click', () => closeModal(m))));

  const orderModal = $('#orderModal');
  const openOrder = (name, card) => {
    const f = $('#orderForm'); f.classList.remove('is-sent');
    $('#orderName').textContent = name ? `«${name}»` : 'букет';
    $('#orderBouquet').value = name || '';
    if (card !== undefined) $('#orderCard').value = card;
    openModal(orderModal);
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-order]');
    if (b) { e.preventDefault(); openOrder(b.dataset.name || '', undefined); }
    const p = e.target.closest('[data-policy]');
    if (p) { e.preventDefault(); setPolicy(p.dataset.policy); openModal($('#policyModal')); }
  });
  const setPolicy = k => {
    $$('.ptab').forEach(t => t.classList.toggle('is-active', t.dataset.ptab === k));
    $('#policy-terms').hidden = k !== 'terms'; $('#policy-privacy').hidden = k !== 'privacy';
    $('#policyModal .modal__box').scrollTop = 0;
  };
  $$('.ptab').forEach(t => t.addEventListener('click', () => setPolicy(t.dataset.ptab)));

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), gItems = $$('#gallery .m-item');
  let lbI = 0;
  const showLb = i => {
    lbI = (i + gItems.length) % gItems.length;
    const it = gItems[lbI];
    lbImg.classList.remove('ok');
    setTimeout(() => { lbImg.src = it.dataset.full; lbImg.alt = $('img', it).alt; lbCap.textContent = $('figcaption', it).textContent; }, 120);
  };
  lbImg.addEventListener('load', () => lbImg.classList.add('ok'));
  gItems.forEach((it, i) => it.addEventListener('click', () => { showLb(i); lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); body.classList.add('is-locked'); }));
  const closeLb = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); body.classList.remove('is-locked'); };
  lb.addEventListener('click', e => {
    const a = e.target.closest('[data-lb]');
    if (a) { a.dataset.lb === 'close' ? closeLb() : showLb(lbI + (a.dataset.lb === 'next' ? 1 : -1)); }
    else if (e.target === lb) closeLb();
  });
  let tx0 = null;
  lb.addEventListener('touchstart', e => tx0 = e.touches[0].clientX, { passive: true });
  lb.addEventListener('touchend', e => { if (tx0 === null) return; const dx = e.changedTouches[0].clientX - tx0; if (Math.abs(dx) > 50) showLb(lbI + (dx < 0 ? 1 : -1)); tx0 = null; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (lb.classList.contains('is-open')) closeLb(); $$('.modal.is-open').forEach(closeModal); if (mmenu.classList.contains('is-open')) setMenu(false); }
    if (lb.classList.contains('is-open')) { if (e.key === 'ArrowRight') showLb(lbI + 1); if (e.key === 'ArrowLeft') showLb(lbI - 1); }
  });

  /* ---------- Phone mask ---------- */
  $$('[data-phone]').forEach(inp => {
    const fmt = v => {
      let d = v.replace(/\D/g, '');
      if (d.startsWith('8')) d = '7' + d.slice(1);
      if (!d.startsWith('7')) d = '7' + d;
      d = d.slice(0, 11);
      let o = '+7';
      if (d.length > 1) o += ' (' + d.slice(1, 4);
      if (d.length >= 4) o += ')';
      if (d.length > 4) o += ' ' + d.slice(4, 7);
      if (d.length > 7) o += '-' + d.slice(7, 9);
      if (d.length > 9) o += '-' + d.slice(9, 11);
      return o;
    };
    inp.addEventListener('input', () => inp.value = inp.value ? fmt(inp.value) : '');
    inp.addEventListener('focus', () => { if (!inp.value) inp.value = '+7 ('; });
    inp.addEventListener('blur', () => { if (inp.value.replace(/\D/g, '').length <= 1) inp.value = ''; });
  });

  /* ---------- Forms ---------- */
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('is-show'); setTimeout(() => t.classList.remove('is-show'), 3200); };
  const handleForm = form => form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach(inp => {
      const wrap = inp.closest('.field,.check');
      let valid = inp.type === 'checkbox' ? inp.checked : inp.type === 'tel' ? inp.value.replace(/\D/g, '').length === 11 : inp.value.trim().length > 1;
      wrap && wrap.classList.toggle('is-error', !valid);
      if (!valid) ok = false;
    });
    if (!ok) { toast('Проверьте имя, телефон и согласие'); return; }
    form.classList.add('is-sent');
    setTimeout(() => { form.reset(); }, 400);
  });
  $$('#leadForm,#orderForm').forEach(handleForm);
  document.addEventListener('input', e => { const w = e.target.closest('.is-error'); w && w.classList.remove('is-error'); });
  document.addEventListener('change', e => { const w = e.target.closest('.is-error'); w && w.classList.remove('is-error'); });

  /* ---------- Cookie ---------- */
  const ck = $('#cookie');
  if (!store.get('flos_cookie')) setTimeout(() => ck.classList.add('is-visible'), 2600);
  $('#cookieOk').addEventListener('click', () => { store.set('flos_cookie', '1'); ck.classList.remove('is-visible'); });

  /* ---------- Year ---------- */
  $('#year').textContent = new Date().getFullYear();
})();
