/**
 * Webflow GSAP Animations
 * Hero AI (scroll-driven) + Grid Boxes (click-driven)
 * Requires: GSAP, Flip plugin, ScrollTrigger plugin
 */

document.addEventListener('DOMContentLoaded', () => {
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

      const s = Flip.getState(ai);
      heroTarget.appendChild(ai);
      ai.classList.add('is-hero-ai--expanded');

      heroFlipTween = Flip.from(s, {
        duration: 0.9, ease: 'power2.inOut', absolute: true, scale: false, nested: true,
        onComplete:  () => { heroFlipTween = null; revealColsAndIcons(); revealDetails(); },
        onInterrupt: () => { heroFlipTween = null; }
      });
    }

    function collapseHero(onDone) {
      if (!heroExpanded) { onDone?.(); return; }
      heroExpanded = false;
      state.active = null;

      killHeroTweens();
      hideDetailsNoStagger(() => {
        hideColsAndIcons();
        const s = Flip.getState(ai);
        ai.classList.remove('is-hero-ai--expanded');

        if (originalNext?.parentNode === originalParent) {
          originalParent.insertBefore(ai, originalNext);
        } else {
          originalParent.appendChild(ai);
        }

        heroFlipTween = Flip.from(s, {
          duration: 0.9, ease: 'power2.inOut', absolute: true, scale: false, nested: true,
          onComplete:  () => { heroFlipTween = null; onDone?.(); },
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

    window.addEventListener('load', () => {
      setDetailsHidden();
      prepColsAndIcons();
      ScrollTrigger.refresh();
    });
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
    if (items.length) gsap.set(items, { autoAlpha: 0, scale: 1.12 });
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
      onComplete : onDone,
      onInterrupt: onDone
    });
  }

  function revealCardContent(box) {
    const items = cardContents(box);
    if (!items.length) return;
    gsap.fromTo(items,
      { autoAlpha: 0, scale: 1.12 },
      { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out', stagger: 0.06, overwrite: 'auto' }
    );
  }

  // ── Expanded reveal content ───────────────────────────────────────────────────

  function setRevealHidden(box) {
    gsap.set(reveals(box), { autoAlpha: 0, y: 40 });
  }

  function animateReveal(box) {
    const items = reveals(box);
    if (!items.length) return;
    boxRevealTL = gsap.to(items, {
      autoAlpha: 1, y: 0, duration: 0.55,
      ease: 'power2.out', stagger: 0.1, overwrite: 'auto'
    });
  }

  function hideReveal(box, onDone) {
    const items = reveals(box);
    if (!items.length) { onDone?.(); return; }
    gsap.to(items, {
      autoAlpha: 0, y: 40, duration: 0.2,
      ease: 'power2.in', stagger: 0, overwrite: 'auto',
      onComplete: onDone, onInterrupt: onDone
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
      lockScroll();

      const s = Flip.getState(box);
      box.classList.add('is-box--expanded');
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
          unlockScroll();
          revealCardContent(box); // 3 — zoom card content back in
          onDone?.();
        },
        onInterrupt: () => {
          boxFlipTween = null;
          unlockScroll();
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

});
