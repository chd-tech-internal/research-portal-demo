/** Selects one element. */
const $ = (selector, root = document) => root.querySelector(selector);
/** Selects many elements. */
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Updates the transparent navigation state. */
function initNav() {
  const nav = $('[data-nav]');
  const logo = $('[data-logo]');
  if (!nav || !logo) return;
  const navyLogo = '/assets/img/logo-navy-transparent.png';
  const whiteLogo = '/assets/img/logo-white-transparent.png';
  if (document.body.dataset.hasHero !== 'true') {
    logo.src = navyLogo;
    return;
  }
  const update = () => {
    const solid = window.scrollY > 80;
    nav.classList.toggle('scrolled', solid);
    logo.src = solid ? navyLogo : whiteLogo;
  };
  update();
  const hero = $('.hero');
  if ('IntersectionObserver' in window && hero) {
    const observer = new IntersectionObserver((entries) => {
      const solid = !entries[0].isIntersecting;
      nav.classList.toggle('scrolled', solid);
      logo.src = solid ? navyLogo : whiteLogo;
    }, { threshold: 0.08 });
    observer.observe(hero);
  } else {
    window.addEventListener('scroll', update, { passive: true });
  }
}

/** Wires the mobile navigation drawer. */
function initDrawer() {
  const drawer = $('[data-drawer]');
  const overlay = $('[data-drawer-overlay]');
  const button = $('[data-drawer-open]');
  const open = () => {
    drawer?.classList.add('open'); overlay?.classList.add('open'); document.body.classList.add('drawer-open');
    button?.setAttribute('aria-expanded', 'true');
  };
  const close = () => {
    drawer?.classList.remove('open'); overlay?.classList.remove('open'); document.body.classList.remove('drawer-open');
    button?.setAttribute('aria-expanded', 'false');
  };
  button?.setAttribute('aria-expanded', 'false');
  button?.addEventListener('click', open);
  $('[data-drawer-close]')?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
  drawer?.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
}

/** Wires the admin sidebar as an off-canvas menu on tablet and mobile. */
function initAdminMenu() {
  const sidebar = $('[data-admin-sidebar]');
  const overlay = $('[data-admin-overlay]');
  const button = $('[data-admin-menu]');
  if (!sidebar || !button) return;
  const open = () => {
    sidebar.classList.add('open'); overlay?.classList.add('open'); document.body.classList.add('drawer-open');
    button.setAttribute('aria-expanded', 'true');
  };
  const close = () => {
    sidebar.classList.remove('open'); overlay?.classList.remove('open'); document.body.classList.remove('drawer-open');
    button.setAttribute('aria-expanded', 'false');
  };
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', open);
  $('[data-admin-menu-close]')?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
  sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
}

/** Runs the home carousel. */
function initHero() {
  const slides = $$('.hero-slide');
  const bars = $$('.hero-bars button');
  if (!slides.length) return;
  let index = 0;
  const show = (next) => {
    slides[index].classList.remove('active');
    bars[index]?.classList.remove('active');
    index = next;
    slides[index].classList.add('active');
    bars[index]?.classList.add('active');
  };
  bars.forEach((bar, i) => bar.addEventListener('click', () => show(i)));
  setInterval(() => show((index + 1) % slides.length), 7000);
}

/** Wires tab button panels. */
function initTabs() {
  $$('.tabs').forEach((tabs) => {
    const buttons = $$('.tab-button', tabs);
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.tab;
        buttons.forEach((item) => item.classList.toggle('active', item === button));
        $$('.tab-panel', tabs.parentElement).forEach((panel) => panel.classList.toggle('active', panel.id === target));
        document.getElementById(target)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    });
  });
}

/** Wires account dropdown toggles. */
function initAccount() {
  $('[data-account-toggle]')?.addEventListener('click', (event) => {
    event.currentTarget.closest('.account-menu')?.classList.toggle('open');
  });
}

/** Sends API logout links through fetch so users do not land on raw JSON. */
function initLogoutLinks() {
  $$('a[href*="action=logout"]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const response = await fetch(link.href, { credentials: 'same-origin' });
      const data = await response.json().catch(() => ({ ok: true, data: { redirect: '/login.php' } }));
      window.location.href = (data.data && data.data.redirect) || '/login.php';
    });
  });
}

/** Wires AJAX forms with inline success messages and mock authentication. */
function initAjaxForms() {
  $$('form[data-ajax]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitter = event.submitter || form.querySelector('button[type="submit"], input[type="submit"]');
      let messageBox = $('[data-form-message]', form);
      const ensureMessageBox = () => {
        if (!messageBox) {
          messageBox = document.createElement('div');
          messageBox.dataset.formMessage = '';
          const firstField = $('.field', form);
          if (firstField) form.insertBefore(messageBox, firstField);
          else form.prepend(messageBox);
        }
        return messageBox;
      };
      const endpoint = form.getAttribute('action') || form.action;
      const isLogin = endpoint.includes('auth.php?action=login') || endpoint.includes('subscriber-auth.php?action=login');
      const originalLabel = submitter ? submitter.textContent : '';
      if (submitter) {
        submitter.disabled = true;
        submitter.textContent = isLogin ? 'Signing in...' : 'Working...';
      }
      
      const body = submitter ? new FormData(form, submitter) : new FormData(form);
      
      if (isLogin) {
        const email = body.get('email');
        const password = body.get('password');
        setTimeout(() => {
          if ((email === 'subscriber.local@chd.test' && password === 'SubscriberLocal123!') ||
              (email === 'admin.local@chd.test' && password === 'AdminLocal123!')) {
            localStorage.setItem('auth_role', email.includes('admin') ? 'admin' : 'subscriber');
            window.location.href = './reports.html';
          } else {
            messageBox = ensureMessageBox();
            messageBox.className = 'notice notice-error login-message';
            messageBox.textContent = 'Invalid email or password.';
            if (submitter) {
              submitter.disabled = false;
              submitter.textContent = originalLabel;
            }
          }
        }, 500);
        return;
      }
      
      setTimeout(() => {
        messageBox = ensureMessageBox();
        messageBox.className = 'notice notice-success login-message';
        messageBox.textContent = 'Thank you. A member of our team will be in touch shortly.';
        if (submitter) {
          submitter.disabled = false;
          submitter.textContent = originalLabel;
        }
      }, 500);
    });
  });
}

function applyLocalAuth() {
  const role = localStorage.getItem('auth_role');
  if (role) {
    if (window.location.pathname.endsWith('analytics.html')) {
      window.location.href = './analytics-full.html';
      return;
    }
    document.querySelectorAll('a[href="./login.html"]').forEach(el => {
      el.textContent = 'LOGOUT';
      el.href = '#';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('auth_role');
        window.location.href = './';
      });
    });
    document.querySelectorAll('.locked-panel').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.report-card.locked').forEach(el => el.classList.remove('locked'));
  } else {
    if (window.location.pathname.endsWith('analytics-full.html')) {
      window.location.href = './analytics.html';
      return;
    }
  }
}
window.addEventListener('DOMContentLoaded', applyLocalAuth);

/** Wires mobile filter bottom sheets. */
function initSheets() {
  $('[data-sheet-open]')?.addEventListener('click', () => $('.bottom-sheet')?.classList.add('open'));
  $('[data-sheet-close]')?.addEventListener('click', () => $('.bottom-sheet')?.classList.remove('open'));
}

/** Adds mobile labels to responsive table cells from their header text. */
function applyResponsiveTableLabels(root = document) {
  $$('table', root).forEach((table) => {
    const headers = $$('thead th', table).map((th) => th.textContent.trim());
    if (!headers.length) return;
    $$('tbody tr', table).forEach((row) => {
      $$('td', row).forEach((cell, index) => {
        if (headers[index]) cell.dataset.label = headers[index];
      });
    });
  });
}

window.applyResponsiveTableLabels = applyResponsiveTableLabels;

document.addEventListener('DOMContentLoaded', () => {
  initNav(); initDrawer(); initAdminMenu(); initHero(); initTabs(); initAccount(); initLogoutLinks(); initAjaxForms(); initSheets(); applyResponsiveTableLabels();
});
