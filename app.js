(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Barra de progreso de scroll ---------- */
  const progress = document.querySelector('.progress');
  const updateProgress = () => {
    const max = root.scrollHeight - innerHeight;
    progress.style.setProperty('--p', max > 0 ? scrollY / max : 0);
  };
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);
  updateProgress();

  /* ---------- Luz que sigue al cursor ---------- */
  if (finePointer && !reduceMotion) {
    let raf = 0;
    addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        root.style.setProperty('--cx', e.clientX + 'px');
        root.style.setProperty('--cy', e.clientY + 'px');
        raf = 0;
      });
    }, { passive: true });
  }

  /* ---------- Aparición al hacer scroll (tickets y secciones) ---------- */
  const tickets = document.querySelectorAll('.ticket');

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    tickets.forEach((t) => { t.classList.add('reveal'); io.observe(t); });
    document.querySelectorAll('.rv').forEach((el) => { el.classList.add('rv-hide'); io.observe(el); });
  }

  /* ---------- Tickets: tilt 3D y brillo que sigue al cursor ---------- */
  if (finePointer && !reduceMotion) {
    tickets.forEach((t) => {
      t.addEventListener('pointermove', (e) => {
        const r = t.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;   // 0 → 1
        const y = (e.clientY - r.top) / r.height;   // 0 → 1
        t.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        t.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        t.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
        t.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
      });
      t.addEventListener('pointerleave', () => {
        ['--mx', '--my', '--rx', '--ry'].forEach((p) => t.style.removeProperty(p));
      });
    });
  }

  /* ---------- Utilidad: cerrar un <dialog> con animación ---------- */
  const closeDialog = (dlg, done) => {
    if (!dlg.open || dlg.classList.contains('closing')) return;
    dlg.classList.add('closing');
    setTimeout(() => {
      dlg.classList.remove('closing');
      dlg.close();
      done?.();
    }, reduceMotion ? 0 : 250);
  };

  /* ---------- Modal de proyecto ---------- */
  const modal = document.getElementById('modal');
  const mImg = document.getElementById('modal-img');
  const mTitle = document.getElementById('modal-title');
  const mText = document.getElementById('modal-text');
  const mTags = document.getElementById('modal-tags');
  const mNum = document.getElementById('modal-num');
  const mRepos = document.getElementById('modal-repos');
  const mDemo = document.getElementById('modal-demo');
  let lastTrigger = null;
  let activeTicket = null;

  const repoButton = ({ label, url }) => {
    const a = document.createElement('a');
    a.className = 'btn';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-github"/></svg>';
    a.append(label || 'Repositorio');
    return a;
  };

  const openModal = (ticket) => {
    const img = ticket.querySelector('.card-img-start');
    mImg.src = img.currentSrc || img.src;
    mImg.alt = img.alt;
    mTitle.textContent = ticket.querySelector('.card-title').textContent;

    // Párrafo largo del modal (si no existe, usa el texto corto del ticket)
    const detail = ticket.querySelector('.detail');
    if (detail) {
      mText.innerHTML = detail.innerHTML;
    } else {
      const p = document.createElement('p');
      p.textContent = ticket.querySelector('.card-text').textContent.trim();
      mText.replaceChildren(p);
    }

    mTags.innerHTML = ticket.querySelector('.tags')?.innerHTML ?? '';
    mNum.textContent = ticket.dataset.num ?? '';

    let repos = [];
    try { repos = JSON.parse(ticket.dataset.repos || '[]'); } catch { /* JSON inválido: sin botones */ }
    mRepos.replaceChildren(...repos.filter((r) => r.url).map(repoButton));

    activeTicket = ticket;
    lastTrigger = ticket;
    document.body.classList.add('modal-open');
    modal.showModal();
    modal.scrollTop = 0;
  };

  const closeModal = () => closeDialog(modal);

  tickets.forEach((t) => {
    t.addEventListener('click', () => openModal(t));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(t);
      }
    });
  });

  modal.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); }); // clic en el backdrop
  modal.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(); });      // Esc
  modal.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    lastTrigger?.focus({ preventScroll: true });
  });

  /* ---------- Modal de video (demo) ---------- */
  const vModal = document.getElementById('video-modal');
  const vStage = document.getElementById('video-stage');
  const vTitle = document.getElementById('video-title');

  const makeIframe = (src) => {
    const f = document.createElement('iframe');
    f.src = src;
    f.title = 'Demo del proyecto';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    return f;
  };

  // Acepta archivos locales/URL directas (.mp4, .webm…), YouTube o Vimeo
  const makePlayer = (src) => {
    const yt = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return makeIframe(`https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`);
    const vm = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return makeIframe(`https://player.vimeo.com/video/${vm[1]}?autoplay=1`);
    const v = document.createElement('video');
    v.src = new URL(src, document.baseURI).href;   // codifica espacios en el nombre del archivo
    v.preload = 'metadata';
    v.addEventListener('error', () => vStage.replaceChildren());   // archivo no encontrado → placeholder
    v.controls = true;
    v.autoplay = true;
    v.playsInline = true;
    return v;
  };

  const openVideo = () => {
    const src = activeTicket?.dataset.video?.trim();
    vTitle.textContent = 'Demo — ' + (mTitle.textContent || '');
    vStage.replaceChildren(...(src ? [makePlayer(src)] : []));   // vacío = placeholder visible
    vModal.showModal();
  };

  const closeVideo = () => {
    vStage.querySelector('video')?.pause();
    closeDialog(vModal, () => vStage.replaceChildren());          // detiene también iframes
  };

  mDemo.addEventListener('click', openVideo);
  vModal.querySelectorAll('[data-close-video]').forEach((b) => b.addEventListener('click', closeVideo));
  vModal.addEventListener('click', (e) => { if (e.target === vModal) closeVideo(); });
  vModal.addEventListener('cancel', (e) => { e.preventDefault(); closeVideo(); });
})();
