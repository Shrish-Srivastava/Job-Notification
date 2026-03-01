/**
 * Job Notification App — Client-side router
 * No full page reloads. Active link updates without flicker.
 */

(function () {
  var PLACEHOLDER_SUBTEXT = 'This section will be built in the next step.';

  var routes = [
    { path: '/', title: 'Home', pageTitle: 'Home' },
    { path: '/dashboard', title: 'Dashboard', pageTitle: 'Dashboard' },
    { path: '/settings', title: 'Settings', pageTitle: 'Settings' },
    { path: '/saved', title: 'Saved', pageTitle: 'Saved' },
    { path: '/digest', title: 'Digest', pageTitle: 'Digest' },
    { path: '/proof', title: 'Proof', pageTitle: 'Proof' }
  ];

  function getPath() {
    return window.location.pathname.replace(/\/$/, '') || '/';
  }

  function findRoute(path) {
    var normalized = path === '' ? '/' : path;
    return routes.find(function (r) { return r.path === normalized; }) || null;
  }

  function renderPlaceholder(title, subtext) {
    return (
      '<section class="context-header">' +
        '<h1 class="context-header__title">' + escapeHtml(title) + '</h1>' +
        '<p class="context-header__subtext">' + escapeHtml(subtext) + '</p>' +
      '</section>'
    );
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function setPageTitle(title) {
    document.title = title + ' — Job Notification App';
  }

  function render() {
    var path = getPath();
    var route = findRoute(path);
    var root = document.getElementById('root');
    if (!root) return;

    if (route) {
      root.innerHTML = renderPlaceholder(route.pageTitle, PLACEHOLDER_SUBTEXT);
      setPageTitle(route.pageTitle);
    } else {
      root.innerHTML = renderPlaceholder(
        'Page Not Found',
        'The page you are looking for does not exist.'
      );
      setPageTitle('Page Not Found');
    }

    updateNavActive(path);
  }

  function updateNavActive(path) {
    var links = document.querySelectorAll('.nav-link[data-path]');
    links.forEach(function (link) {
      var linkPath = link.getAttribute('data-path');
      if (linkPath === path) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });
  }

  function handleClick(e) {
    var link = e.target.closest('a[data-path]');
    if (!link) return;
    if (link.classList.contains('is-active')) {
      e.preventDefault();
      return;
    }
    var path = link.getAttribute('data-path');
    if (path && path !== getPath()) {
      e.preventDefault();
      window.history.pushState({}, '', path === '/' ? '/' : path);
      render();
      closeMobileNav();
    }
  }

  function closeMobileNav() {
    var nav = document.getElementById('topbar-nav');
    if (nav) nav.classList.remove('is-open');
  }

  function toggleMobileNav() {
    var nav = document.getElementById('topbar-nav');
    if (nav) nav.classList.toggle('is-open');
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    document.addEventListener('click', handleClick);
    window.addEventListener('popstate', render);

    var menuBtn = document.getElementById('topbar-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', toggleMobileNav);
    }

    document.addEventListener('click', function (e) {
      var nav = document.getElementById('topbar-nav');
      if (nav && nav.classList.contains('is-open') && !e.target.closest('.topbar')) {
        closeMobileNav();
      }
    });
  });
})();
