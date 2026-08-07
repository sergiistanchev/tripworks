/**
 * TripWorks homepage interactions.
 * Optional dependencies: Swiper; GSAP + Flip + ScrollTrigger.
 * Every feature is guarded by its required DOM and dependency checks.
 */

const onReady = callback => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
};

const runtimeSources = {
  swiper: 'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js',
  gsap: 'https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js',
  flip: 'https://cdn.prod.website-files.com/gsap/3.15.0/Flip.min.js',
  scrollTrigger: 'https://cdn.prod.website-files.com/gsap/3.15.0/ScrollTrigger.min.js'
};

const runtimeLoads = new Map();

function loadRuntimeScript(src, isReady) {
  if (isReady()) return Promise.resolve();
  if (runtimeLoads.has(src)) return runtimeLoads.get(src);

  const promise = new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(script => script.src === src);
    const script = existing || document.createElement('script');

    const finish = () => isReady()
      ? resolve()
      : reject(new Error(`Loaded ${src}, but its browser API is unavailable.`));

    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error(`Unable to load ${src}.`)), { once: true });

    if (!existing) {
      script.src = src;
      script.async = true;
      script.dataset.tripworksRuntime = 'true';
      document.head.appendChild(script);
    }
  });

  runtimeLoads.set(src, promise);
  return promise;
}

async function ensureSwiper() {
  await loadRuntimeScript(runtimeSources.swiper, () => Boolean(window.Swiper));
}

async function ensureGsap() {
  await loadRuntimeScript(runtimeSources.gsap, () => Boolean(window.gsap));
  await Promise.all([
    loadRuntimeScript(runtimeSources.flip, () => Boolean(window.Flip)),
    loadRuntimeScript(runtimeSources.scrollTrigger, () => Boolean(window.ScrollTrigger))
  ]);
}

function scheduleNonCriticalWork(callback) {
  let started = false;

  const run = () => {
    if (started) return;
    started = true;
    callback();
  };

  const schedule = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 1200 });
      } else {
        window.setTimeout(run, 250);
      }
    }));
  };

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });

  ['pointerover', 'touchstart', 'keydown', 'wheel'].forEach(eventName => {
    document.addEventListener(eventName, run, { once: true, passive: true });
  });
}

function initTypewriter() {
  const el = document.querySelector('[data-type]');
  if (!el) return;

  const phrases = (el.getAttribute('data-type') || '')
    .split(',')
    .map(phrase => phrase.trim())
    .filter(Boolean);

  if (!phrases.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = phrases[0];
    return;
  }

  if (!document.getElementById('typewriter-cursor-style')) {
    const style = document.createElement('style');
    style.id = 'typewriter-cursor-style';
    style.textContent = `
      .tw-cursor { display:inline-block; margin-left:.08em; width:.6ch; animation:twBlink 1s step-end infinite; }
      @keyframes twBlink { 50% { opacity:0; } }
    `;
    document.head.appendChild(style);
  }

  const cursor = document.createElement('span');
  cursor.className = 'tw-cursor';
  cursor.textContent = '|';

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;
  let timer;

  const render = text => {
    el.textContent = text;
    el.appendChild(cursor);
  };

  const tick = () => {
    const phrase = phrases[phraseIndex];
    charIndex += deleting ? -1 : 1;
    render(phrase.slice(0, Math.max(0, charIndex)));

    let delay = deleting ? 35 : 60;
    if (!deleting && charIndex >= phrase.length) {
      deleting = true;
      delay = 1000;
    } else if (deleting && charIndex <= 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      delay = 250;
    }

    timer = window.setTimeout(tick, delay);
  };

  document.addEventListener('visibilitychange', () => {
    window.clearTimeout(timer);
    if (!document.hidden) tick();
  });

  render('');
  tick();
}

function initResponsiveSwipers() {
  if (!window.Swiper) return;

  const update = () => {
    document.querySelectorAll('.hero_slider').forEach(wrapper => {
      const container = wrapper.querySelector('.swiper-container');
      if (!container) return;

      if (window.innerWidth <= 991) {
        if (container.swiper) return;
        new Swiper(container, {
          slidesPerView: 'auto', slidesPerGroup: 1, spaceBetween: 16, speed: 400,
          watchOverflow: true, resizeObserver: false,
          navigation: {
            prevEl: wrapper.querySelector('.hero-prev'),
            nextEl: wrapper.querySelector('.hero-next')
          }
        });
      } else if (container.swiper) {
        container.swiper.destroy(true, true);
      }
    });

    document.querySelectorAll('.swiper_slider').forEach(wrapper => {
      const container = wrapper.querySelector('.swiper-container');
      if (!container) return;

      if (window.innerWidth <= 767) {
        if (container.swiper) return;
        new Swiper(container, {
          slidesPerView: 'auto', speed: 350, allowTouchMove: true, spaceBetween: 16,
          rewind: true, watchOverflow: true, resizeObserver: false,
          navigation: {
            nextEl: wrapper.querySelector('.swiper-next'),
            prevEl: wrapper.querySelector('.swiper-prev')
          }
        });
      } else if (container.swiper) {
        container.swiper.destroy(true, true);
      }
    });
  };

  let resizeTimer;
  const scheduleUpdate = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(update, 150);
  };

  update();
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true });
}

function initScrollReveals() {
  if (!window.gsap || !window.ScrollTrigger) return;
  const elements = document.querySelectorAll('[gsap]');
  if (!elements.length) return;

  gsap.registerPlugin(ScrollTrigger);
  const fold = window.innerHeight * 1.05;
  const revealItems = [...elements].map(element => ({
    element,
    aboveFold: element.getBoundingClientRect().top <= fold
  }));

  revealItems.forEach(({ element, aboveFold }) => {
    if (aboveFold) {
      gsap.set(element, { x: 0, y: 0, rotationZ: 0, opacity: 1 });
      return;
    }

    const direction = element.getAttribute('gsap');
    const from = direction === 'from-left'
      ? { x: '-6rem', y: '5rem', rotationZ: '6deg', opacity: 0 }
      : direction === 'from-right'
        ? { x: '6rem', y: '5rem', rotationZ: '-6deg', opacity: 0 }
        : { opacity: 0 };

    gsap.fromTo(element, from, {
      x: 0, y: 0, rotationZ: 0, opacity: 1, ease: 'power1.out',
      scrollTrigger: {
        trigger: element,
        start: 'top bottom',
        end: `top ${element.getAttribute('gsap-end') || '50%'}`,
        scrub: 0.3
      }
    });
  });
}

function initSyncedHeroSwiper() {
  if (!window.Swiper) return;
  const cardEl = document.querySelector('.hero-card-swiper');
  const imageEl = document.querySelector('.hero-image-swiper');
  const tabs = [...document.querySelectorAll('.hero-tab')];
  if (!cardEl || !imageEl || !tabs.length) return;

  const cardSwiper = new Swiper(cardEl, {
    slidesPerView: 1, slidesPerGroup: 1, speed: 850, spaceBetween: 32,
    // `rewind` preserves the circular experience without creating loop clones.
    // Cloned hero images can become late LCP candidates after initial render.
    rewind: true, allowTouchMove: false
  });

  const sync = (swiper, speed) => {
    cardSwiper.slideTo(swiper.realIndex, speed);
    tabs.forEach((tab, index) => tab.classList.toggle('is-active', index === swiper.realIndex));
  };

  const imageSwiper = new Swiper(imageEl, {
    slidesPerView: 1, slidesPerGroup: 1, speed: 850, spaceBetween: 0,
    rewind: true,
    on: {
      init: swiper => sync(swiper, 0),
      realIndexChange: swiper => sync(swiper, 850)
    }
  });

  // Autoplay begins only after genuine visitor intent. This keeps the first hero
  // image stable during LCP measurement while preserving rotation for visitors.
  let autoplayTimer;
  const startAutoplay = () => {
    if (autoplayTimer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    autoplayTimer = window.setInterval(() => imageSwiper.slideNext(850), 5000);
  };

  const intentEvents = ['pointerdown', 'touchstart', 'keydown', 'wheel'];
  const onIntent = () => {
    startAutoplay();
    intentEvents.forEach(eventName => document.removeEventListener(eventName, onIntent));
  };
  intentEvents.forEach(eventName => document.addEventListener(eventName, onIntent, {
    passive: true,
    once: true
  }));

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      imageSwiper.slideTo(index, 850);
      startAutoplay();
    });
  });
}

function initGsapInteractions() {
  if (!window.gsap || !window.Flip || !window.ScrollTrigger) return;
  gsap.ticker.lagSmoothing(0);
  gsap.registerPlugin(Flip, ScrollTrigger);

  // ── Shared state ─────────────────────────────────────────────────────────────
  const state = { active: null };

  function closeActive(cb) {
    if (state.active === 'hero') collapseHero(cb);
    else if (state.active === 'box') collapseBox(cb);
    else cb?.();
  }


  // ════════════════════════════════════════════════════════════════════════════
  // HERO AI (scroll-driven)
  // ════════════════════════════════════════════════════════════════════════════

  const ai         = document.querySelector('.is-hero-ai');
  const triggerEl  = document.querySelector('.hero-spacer');
  const heroTarget = document.querySelector('.hero-ai-target');

  if (ai && triggerEl && heroTarget) {
    const originalParent = ai.parentNode;
    const originalNext   = ai.nextElementSibling;

    const detailsSel     = '[gsap-hero="details"], [data-gsap-hero="details"]';
    const colLeftSel     = '[gsap-hero="col-left"], [data-gsap-hero="col-left"]';
    const colRightSel    = '[gsap-hero="col-right"], [data-gsap-hero="col-right"]';
    const iconInSel      = '[gsap-hero="icon"], [data-gsap-hero="icon"]';
    const iconDefaultSel = '[gsap-hero="icon-default"], [data-gsap-hero="icon-default"]';

    let heroFlipTween   = null;
    let heroRevealTween = null;
    let heroColsTL      = null;
    let heroHideTween   = null;
    let heroExpanded    = false;

    const $h = sel => ai.querySelectorAll(sel);

    function killHeroTweens() {
      heroFlipTween?.progress(1).kill();   heroFlipTween   = null;
      heroRevealTween?.progress(1).kill(); heroRevealTween = null;
      heroColsTL?.kill();                  heroColsTL      = null;
      heroHideTween?.kill();               heroHideTween   = null;
      gsap.killTweensOf([
        $h(detailsSel), $h(colLeftSel), $h(colRightSel),
        $h(iconInSel),  $h(iconDefaultSel)
      ]);
    }

    function setDetailsHidden() {
      const items = $h(detailsSel);
      if (items.length) gsap.set(items, { display: 'none', y: '3rem', autoAlpha: 0 });
    }

    function revealDetails() {
      const items = $h(detailsSel);
      if (!items.length) return;
      gsap.set(items, { display: 'block' });
      heroRevealTween = gsap.to(items, {
        y: 0, autoAlpha: 1, duration: 0.6,
        ease: 'power2.out', stagger: 0.15, overwrite: 'auto'
      });
    }

    function hideDetailsNoStagger(cb) {
      const items = $h(detailsSel);
      if (!items.length) { cb?.(); return; }
      heroHideTween = gsap.to(items, {
        y: '3rem', autoAlpha: 0, duration: 0.25,
        ease: 'power2.inOut', stagger: 0, overwrite: 'auto',
        onComplete:  () => { gsap.set(items, { display: 'none' }); cb?.(); },
        onInterrupt: () => { gsap.set(items, { display: 'none' }); cb?.(); }
      });
    }

    function prepColsAndIcons() {
      const left   = $h(colLeftSel),  right   = $h(colRightSel);
      const iconIn = $h(iconInSel),   iconDef = $h(iconDefaultSel);
      if (left.length)    gsap.set(left,    { xPercent: 100,  autoAlpha: 0 });
      if (right.length)   gsap.set(right,   { xPercent: -100, autoAlpha: 0 });
      if (iconIn.length)  gsap.set(iconIn,  { scale: 0, autoAlpha: 0, transformOrigin: '50% 50%' });
      if (iconDef.length) gsap.set(iconDef, { scale: 1, autoAlpha: 1, transformOrigin: '50% 50%' });
    }

    function revealColsAndIcons() {
      const left   = $h(colLeftSel),  right   = $h(colRightSel);
      const iconIn = $h(iconInSel),   iconDef = $h(iconDefaultSel);
      heroColsTL = gsap.timeline({ defaults: { overwrite: 'auto' } });
      if (left.length)    heroColsTL.to(left,    { xPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' }, 0);
      if (right.length)   heroColsTL.to(right,   { xPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' }, 0);
      if (iconIn.length)  heroColsTL.to(iconIn,  { scale: 1,    autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, 0.05);
      if (iconDef.length) heroColsTL.to(iconDef, { scale: 0,    autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, 0.05);
    }

    function hideColsAndIcons() {
      const left   = $h(colLeftSel),  right   = $h(colRightSel);
      const iconIn = $h(iconInSel),   iconDef = $h(iconDefaultSel);
      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });
      if (iconIn.length)  tl.to(iconIn,  { scale: 0, autoAlpha: 0, duration: 0.2, ease: 'power2.in' }, 0);
      if (iconDef.length) tl.to(iconDef, { scale: 1, autoAlpha: 1, duration: 0.2, ease: 'power2.in' }, 0);
      if (left.length)    tl.to(left,    { xPercent: 100,  autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, 0);
      if (right.length)   tl.to(right,   { xPercent: -100, autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, 0);
      return tl;
    }

    function expandHero() {
      if (heroExpanded) return;
      heroExpanded = true;
      state.active = 'hero';

      killHeroTweens();
      setDetailsHidden();
      prepColsAndIcons();

      const cardItems = ai.querySelectorAll('[data-gsap="card-content"]');
      gsap.to(cardItems, {
        autoAlpha: 0, scale: 1.12, duration: 0.22, ease: 'power2.in', overwrite: 'auto',
        onComplete:  () => { gsap.set(cardItems, { display: 'none' }); doHeroFlip(); },
        onInterrupt: () => { gsap.set(cardItems, { display: 'none' }); doHeroFlip(); }
      });

      function doHeroFlip() {
        const s = Flip.getState(ai);
        heroTarget.appendChild(ai);
        heroTarget.classList.add('is-active');
        ai.classList.add('is-hero-ai--expanded');

        heroFlipTween = Flip.from(s, {
          duration: 0.9, ease: 'power2.inOut', absolute: true, scale: false, nested: true,
          onComplete:  () => { heroFlipTween = null; revealColsAndIcons(); revealDetails(); },
          onInterrupt: () => { heroFlipTween = null; }
        });
      }
    }

    function collapseHero(onDone) {
      if (!heroExpanded) { onDone?.(); return; }
      heroExpanded = false;
      state.active = null;

      killHeroTweens();
      hideDetailsNoStagger(() => {
        hideColsAndIcons();
        const s = Flip.getState(ai);
        heroTarget.classList.remove('is-active');
        ai.classList.remove('is-hero-ai--expanded');

        if (originalNext?.parentNode === originalParent) {
          originalParent.insertBefore(ai, originalNext);
        } else {
          originalParent.appendChild(ai);
        }

        heroFlipTween = Flip.from(s, {
          duration: 0.9, ease: 'power2.inOut', absolute: true, scale: false, nested: true,
          onComplete: () => {
            heroFlipTween = null;
            const cardItems = ai.querySelectorAll('[data-gsap="card-content"]');
            gsap.set(cardItems, { display: '' });
            gsap.fromTo(cardItems,
              { autoAlpha: 0, scale: 1.12 },
              { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out', stagger: 0.06, overwrite: 'auto' }
            );
            onDone?.();
          },
          onInterrupt: () => { heroFlipTween = null; onDone?.(); }
        });
      });
    }

    ScrollTrigger.create({
      trigger: triggerEl,
      start: 'top 50%',
      invalidateOnRefresh: true,
      onEnter:     () => { if (!heroExpanded) closeActive(() => expandHero()); },
      onLeaveBack: () => {
        if (!heroExpanded) return;
        // Ignore if FLIP is less than 15% through — scroll jitter, not intentional
        if (heroFlipTween && heroFlipTween.progress() < 0.15) return;
        collapseHero();
      }
    });

    const prepareHeroInteraction = () => {
      setDetailsHidden();
      prepColsAndIcons();
    };

    if (document.readyState === 'complete') prepareHeroInteraction();
    else window.addEventListener('load', prepareHeroInteraction, { once: true });
  }


  // ════════════════════════════════════════════════════════════════════════════
  // GRID BOXES (click-driven)
  // ════════════════════════════════════════════════════════════════════════════

  const boxTarget = document.querySelector('[data-gsap="box-target"]');
  const overlay   = document.querySelector('[data-gsap="overlay"]');
  if (!boxTarget) return;

  let activeBox    = null;
  let activeOrigin = null;
  let boxFlipTween = null;
  let boxRevealTL  = null;
  let _scrollY     = 0;

  function lockScroll() {
    _scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top      = `-${_scrollY}px`;
    document.body.style.width    = '100%';
  }

  function unlockScroll() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top      = '';
    document.body.style.width    = '';
    window.scrollTo(0, _scrollY);
  }

  function killBoxTweens() {
    boxFlipTween?.progress(1).kill(); boxFlipTween = null;
    boxRevealTL?.progress(1).kill();  boxRevealTL  = null;
  }

  // ── Selectors ────────────────────────────────────────────────────────────────

  const reveals = box => {
    const wrapper = box.querySelector('[data-gsap="reveal"]');
    if (!wrapper) return [];
    const children = wrapper.children;
    return children.length > 1 ? children : [wrapper];
  };

  const cardContents = box => box.querySelectorAll('[data-gsap="card-content"]');

  // ── Card content (visible in closed state) ───────────────────────────────────

  function setCardContentHidden(box) {
    const items = cardContents(box);
    if (items.length) gsap.set(items, { display: 'none', autoAlpha: 0, scale: 1.12 });
  }

  function hideCardContent(box, onDone) {
    const items = cardContents(box);
    if (!items.length) { onDone?.(); return; }
    gsap.to(items, {
      autoAlpha : 0,
      scale     : 1.12,
      duration  : 0.22,
      ease      : 'power2.in',
      stagger   : 0,
      overwrite : 'auto',
      onComplete : () => { gsap.set(items, { display: 'none' }); onDone?.(); },
      onInterrupt: () => { gsap.set(items, { display: 'none' }); onDone?.(); }
    });
  }

  function revealCardContent(box) {
    const items = cardContents(box);
    if (!items.length) return;
    gsap.set(items, { display: '' });
    gsap.fromTo(items,
      { autoAlpha: 0, scale: 1.12 },
      { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out', stagger: 0.06, overwrite: 'auto' }
    );
  }

  // ── Expanded reveal content ───────────────────────────────────────────────────

  const revealWrapper = box => box.querySelector('[data-gsap="reveal"]');

  function setRevealHidden(box) {
    const wrapper = revealWrapper(box);
    if (wrapper) gsap.set(wrapper, { autoAlpha: 0, y: 40 });
    gsap.set(reveals(box), { autoAlpha: 0, y: 40 });
  }

  function animateReveal(box) {
    const wrapper = revealWrapper(box);
    const items   = reveals(box);
    if (!wrapper) return;
    // unhide wrapper instantly, then stagger children
    gsap.set(wrapper, { autoAlpha: 1, y: 0 });
    if (!items.length) return;
    boxRevealTL = gsap.to(items, {
      autoAlpha: 1, y: 0, duration: 0.55,
      ease: 'power2.out', stagger: 0.1, overwrite: 'auto'
    });
  }

  function hideReveal(box, onDone) {
    const wrapper = revealWrapper(box);
    const items   = reveals(box);
    if (!wrapper) { onDone?.(); return; }
    if (!items.length) {
      gsap.to(wrapper, {
        autoAlpha: 0, y: 40, duration: 0.2, ease: 'power2.in',
        onComplete: onDone, onInterrupt: onDone
      });
      return;
    }
    gsap.to(items, {
      autoAlpha: 0, y: 40, duration: 0.2,
      ease: 'power2.in', stagger: 0, overwrite: 'auto',
      onComplete:  () => { gsap.set(wrapper, { autoAlpha: 0, y: 40 }); onDone?.(); },
      onInterrupt: () => { gsap.set(wrapper, { autoAlpha: 0, y: 40 }); onDone?.(); }
    });
  }

  // ── Overlay ───────────────────────────────────────────────────────────────────

  function showOverlay() {
    if (!overlay) return;
    gsap.set(overlay, { display: 'block' });
    gsap.to(overlay, { autoAlpha: 1, duration: 0.3 });
  }

  function hideOverlay() {
    if (!overlay) return;
    gsap.to(overlay, {
      autoAlpha: 0, duration: 0.25,
      onComplete: () => gsap.set(overlay, { display: 'none' })
    });
  }

  // ── Expand ────────────────────────────────────────────────────────────────────

  function expandBox(box) {
    killBoxTweens();
    setRevealHidden(box);

    // 1 — zoom-out card content, then FLIP
    hideCardContent(box, () => {
      activeBox    = box;
      activeOrigin = { parent: box.parentNode, next: box.nextElementSibling };
      state.active = 'box';

      const s = Flip.getState(box);
      box.classList.add('is-box--expanded');
      box.querySelector('.hero_flip-content')?.classList.add('is-active');
      boxTarget.appendChild(box);
      boxTarget.classList.add('is-active');
      showOverlay();

      // 2 — FLIP to expanded position
      boxFlipTween = Flip.from(s, {
        duration  : 0.75,
        ease      : 'power2.inOut',
        absolute  : true,
        scale     : false,
        nested    : true,
        onComplete : () => {
          boxFlipTween = null;
          animateReveal(box); // 3 — stagger in expanded content
        },
        onInterrupt: () => { boxFlipTween = null; }
      });
    });
  }

  // ── Collapse ──────────────────────────────────────────────────────────────────

  function collapseBox(onDone) {
    if (!activeBox) { onDone?.(); return; }

    const box    = activeBox;
    const origin = activeOrigin;
    activeBox    = null;
    activeOrigin = null;
    state.active = null;

    killBoxTweens();
    hideOverlay();

    // 1 — hide expanded content
    hideReveal(box, () => {
      setCardContentHidden(box);

      const s = Flip.getState(box);
      box.classList.remove('is-box--expanded');

      boxTarget.classList.remove('is-active');
      box.querySelector('.hero_flip-content')?.classList.remove('is-active');

      if (origin.next?.parentNode === origin.parent) {
        origin.parent.insertBefore(box, origin.next);
      } else {
        origin.parent.appendChild(box);
      }

      // 2 — FLIP back to grid position
      boxFlipTween = Flip.from(s, {
        duration  : 0.75,
        ease      : 'power2.inOut',
        absolute  : true,
        scale     : false,
        nested    : true,
        onComplete : () => {
          boxFlipTween = null;

          revealCardContent(box); // 3 — zoom card content back in
          onDone?.();
        },
        onInterrupt: () => {
          boxFlipTween = null;

          revealCardContent(box);
          onDone?.();
        }
      });
    });
  }

  // ── Events ────────────────────────────────────────────────────────────────────

  const isCloseBtn = el => el.closest('[data-gsap="close-btn"], [data-gsap="close-button"]');

  document.querySelectorAll('[data-gsap="box"]').forEach(box => {
    box.addEventListener('click', e => {
      if (isCloseBtn(e.target)) return;
      if (activeBox === box) return;
      closeActive(() => expandBox(box));
    });
  });

  document.addEventListener('click', e => {
    if (isCloseBtn(e.target)) collapseBox();
  });

  overlay?.addEventListener('click', () => collapseBox());

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeActive();
  });
}

onReady(() => {
  initTypewriter();

  scheduleNonCriticalWork(async () => {
    const needsSwiper = document.querySelector(
      '.hero_slider, .swiper_slider, .hero-card-swiper, .hero-image-swiper'
    );
    const needsGsap = document.querySelector(
      '[gsap], .is-hero-ai, [data-gsap="box"], [data-gsap="box-target"]'
    );

    const tasks = [];

    if (needsSwiper) {
      tasks.push(ensureSwiper().then(() => {
        initResponsiveSwipers();
        initSyncedHeroSwiper();
      }));
    }

    if (needsGsap) {
      tasks.push(ensureGsap().then(() => {
        initScrollReveals();
        initGsapInteractions();
      }));
    }

    const results = await Promise.allSettled(tasks);
    results.forEach(result => {
      if (result.status === 'rejected') console.warn('[TripWorks interactions]', result.reason);
    });
  });
});
