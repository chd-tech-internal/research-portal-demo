/** Wires analyst modal cards. */
function initAnalystModals() {
  document.querySelectorAll('[data-analyst-card]').forEach((card) => {
    const openModal = (event) => {
      event.preventDefault();
      const modal = document.getElementById(card.dataset.modal);
      if (modal && typeof modal.showModal === 'function') modal.showModal();
    };

    card.addEventListener('click', openModal);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') openModal(event);
    });
  });

  document.querySelectorAll('.analyst-modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.close();
    });
  });
}
function initAnalystCarousel() {
  // Check prefers-reduced-motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  document.querySelectorAll('.analyst-strip-shell').forEach((shell) => {
    const strip = shell.querySelector('.analyst-strip');
    if (!strip) return;

    // Remove arrows if they exist
    const prevBtn = shell.querySelector('.analyst-arrow-prev');
    const nextBtn = shell.querySelector('.analyst-arrow-next');
    if (prevBtn) prevBtn.remove();
    if (nextBtn) nextBtn.remove();

    let animationId = null;
    let speed = 0;

    const updateSpeed = (event) => {
      const rect = shell.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const edgeZone = Math.min(90, rect.width * 0.18);
      const maxSpeed = 9;

      if (x < edgeZone) {
        speed = -((edgeZone - x) / edgeZone) * maxSpeed;
      } else if (x > rect.width - edgeZone) {
        const dist = rect.width - x;
        speed = ((edgeZone - dist) / edgeZone) * maxSpeed;
      } else {
        speed = 0;
      }
    };

    const scrollLoop = () => {
      if (speed !== 0) {
        // Disable scroll-snap so smooth scrolling works
        if (strip.style.scrollSnapType !== 'none') {
          strip.style.scrollSnapType = 'none';
        }
        strip.scrollLeft += speed;
      } else {
        if (strip.style.scrollSnapType === 'none') {
          strip.style.scrollSnapType = '';
        }
      }
      animationId = requestAnimationFrame(scrollLoop);
    };

    const startLoop = (event) => {
      updateSpeed(event);
      if (!animationId) {
        animationId = requestAnimationFrame(scrollLoop);
      }
    };

    shell.addEventListener('pointerenter', startLoop);
    shell.addEventListener('pointermove', updateSpeed);

    shell.addEventListener('pointerleave', () => {
      speed = 0;
      strip.style.scrollSnapType = '';
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAnalystModals();
  initAnalystCarousel();
});
