// Show logged-in user via JWT cookie
(async function () {
  const badge = document.getElementById('userBadge');
  const joinBtn = document.getElementById('joinBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const user = data.user;
    const displayName = user.name || user.email;
    if (badge) { badge.textContent = 'Hi, ' + displayName; badge.style.display = 'inline'; }
    if (joinBtn) joinBtn.style.display = 'none';
    const nutritionNav = document.getElementById('nutritionNav');
    if (nutritionNav) nutritionNav.style.display = 'inline';
    if (logoutBtn) {
      logoutBtn.style.display = 'inline-block';
      logoutBtn.addEventListener('click', async function () {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        localStorage.removeItem('gymUser');
        window.location.reload();
      });
    }
  } catch (e) {}
})();

// Reveal on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Animated counters
const counters = document.querySelectorAll('.num');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = +el.dataset.target;
    let start = 0;
    const duration = 1800;
    const step = (ts) => {
      if (!el._start) el._start = ts;
      const progress = Math.min((ts - el._start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target) + (target === 98 ? '%' : '+');
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });
counters.forEach(c => counterObserver.observe(c));
