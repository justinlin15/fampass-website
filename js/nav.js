// ============================================
// FamPass — Shared Navigation & Footer
// ============================================

(function () {
  const currentPath = window.location.pathname;

  function isActive(path) {
    if (path === '/' && (currentPath === '/' || currentPath === '/index.html')) return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  }

  function navLink(href, label) {
    const active = isActive(href) ? ' nav__link--active' : '';
    return `<a href="${href}" class="nav__link${active}">${label}</a>`;
  }

  const headerHTML = `
    <header class="site-header">
      <nav class="nav">
        <a href="/" class="nav__logo">
          <span class="icon-wrap"><img src="/assets/images/logo.png?v=7" alt="FamPass" width="36" height="36"></span>
          <span>FamPass</span>
        </a>
        <div class="nav__links" id="navLinks">
          ${navLink('/', 'Home')}
          ${navLink('/resources/', 'Resources')}
          ${navLink('/about.html', 'About')}
          ${navLink('/support.html', 'Support')}
          <a href="#download" class="btn btn--primary btn--sm nav__cta">Download</a>
        </div>
        <button class="nav__toggle" id="navToggle" aria-label="Toggle navigation">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </nav>
    </header>
  `;

  const footerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer__grid">
          <div>
            <div class="footer__brand">
              <img src="/assets/images/logo.png?v=5" alt="FamPass" width="32" height="32">
              <span>FamPass</span>
            </div>
            <p class="footer__description">
              Your family fun calendar. Discover the best local events, activities, and places for families in Orange County and Los Angeles.
            </p>
          </div>
          <div>
            <h4 class="footer__heading">Explore</h4>
            <ul class="footer__links">
              <li><a href="/">Home</a></li>
              <li><a href="/resources/">Resources</a></li>
              <li><a href="/about.html">About</a></li>
              <li><a href="/support.html">Support</a></li>
            </ul>
          </div>
          <div>
            <h4 class="footer__heading">Legal</h4>
            <ul class="footer__links">
              <li><a href="/privacy-policy.html">Privacy Policy</a></li>
              <li><a href="/terms-of-service.html">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h4 class="footer__heading">Contact</h4>
            <ul class="footer__links">
              <li><a href="mailto:dev@fampass.io">dev@fampass.io</a></li>
            </ul>
          </div>
        </div>
        <div class="footer__bottom">
          <span>&copy; ${new Date().getFullYear()} Appystrano, LLC. All rights reserved.</span>
          <span>
            <a href="/privacy-policy.html">Privacy</a> &middot;
            <a href="/terms-of-service.html">Terms</a>
          </span>
        </div>
      </div>
    </footer>
  `;

  // Inject header
  const headerEl = document.getElementById('site-header');
  if (headerEl) headerEl.innerHTML = headerHTML;

  // Inject footer
  const footerEl = document.getElementById('site-footer');
  if (footerEl) footerEl.innerHTML = footerHTML;

  // Mobile nav toggle
  document.addEventListener('click', function (e) {
    const toggle = e.target.closest('#navToggle');
    if (toggle) {
      const links = document.getElementById('navLinks');
      if (links) links.classList.toggle('nav__links--open');
    }
  });

  // Close mobile nav on link click
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('nav__link')) {
      const links = document.getElementById('navLinks');
      if (links) links.classList.remove('nav__links--open');
    }
  });
})();
