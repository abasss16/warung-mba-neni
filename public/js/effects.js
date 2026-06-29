// === RIPPLE EFFECT pada semua tombol ===
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  const ripple = document.createElement('span');
  ripple.classList.add('ripple');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

// === SMOOTH SCROLL REVEAL (Intersection Observer) ===
const revealElements = document.querySelectorAll(
  '.menu-card, .stat-card, .order-card, .cart-item, .table-wrapper, .cart-summary'
);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

// === PARALLAX PADA HERO ===
const hero = document.querySelector('.hero');
if (hero) {
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    hero.style.transform = `translateY(${scrolled * 0.3}px)`;
    hero.style.opacity = Math.max(0, 1 - scrolled / 500);
  }, { passive: true });
}

// === TILT EFFECT PADA MENU CARD (Desktop) ===
if (window.innerWidth > 768) {
  document.querySelectorAll('.menu-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / centerY * -4;
      const rotateY = (x - centerX) / centerX * 4;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0) scale(1)';
    });
  });
}

// === MAGNETIC EFFECT PADA TOMBOL (Desktop) ===
if (window.innerWidth > 768) {
  document.querySelectorAll('.btn-primary, .btn-accent').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) translateY(-3px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

// === COUNTER ANIMATION PADA STAT ===
function animateCounter(el, target) {
  let current = 0;
  const isDecimal = String(target).includes('.');
  const duration = 1500;
  const step = target / (duration / 16);

  function update() {
    current += step;
    if (current >= target) {
      el.textContent = isDecimal ? Number(target).toLocaleString('id-ID') : target;
      return;
    }
    el.textContent = isDecimal
      ? Number(current).toLocaleString('id-ID', { maximumFractionDigits: 0 })
      : Math.floor(current).toLocaleString('id-ID');
    requestAnimationFrame(update);
  }
  update();
}

document.querySelectorAll('.stat-value[data-count]').forEach(el => {
  const target = parseFloat(el.dataset.count);
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        animateCounter(el, target);
        obs.unobserve(el);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
  }
});

// === SMOOTH NAVBAR SHADOW ON SCROLL ===
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      navbar.style.boxShadow = '0 4px 30px rgba(14, 165, 233, 0.12)';
      navbar.style.background = 'rgba(14, 165, 233, 0.12)';
    } else {
      navbar.style.boxShadow = 'none';
      navbar.style.background = 'rgba(14, 165, 233, 0.08)';
    }
  }, { passive: true });
}

console.log('%c Warung Bu Neni %c Sky Blue Theme Loaded ',
  'background: #0EA5E9; color: #fff; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: bold;',
  'background: #0369A1; color: #fff; padding: 4px 8px; border-radius: 0 4px 4px 0;'
);

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => {
      console.log('SW REGISTERED', reg);
    })
    .catch(err => {
      console.error('SW ERROR', err);
    });
}