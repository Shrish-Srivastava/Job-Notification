/**
 * Job Notification Tracker — Client-side router
 * No full page reloads. Active link highlighted with deep red underline.
 */

(function () {
  function getPath() {
    return window.location.pathname.replace(/\/$/, '') || '/';
  }

  function navigate(path) {
    var p = path === '/' ? '/' : path;
    if (getPath() !== p) {
      window.history.pushState({}, '', p);
      render();
    }
    closeMobileNav();
  }

  function setPageTitle(title) {
    document.title = title + ' — Job Notification Tracker';
  }

  /* ─── Views ────────────────────────────────────────────────────── */

  function viewLanding() {
    return (
      '<section class="landing">' +
        '<h1 class="landing__headline">Stop Missing The Right Jobs.</h1>' +
        '<p class="landing__subtext">Precision-matched job discovery delivered daily at 9AM.</p>' +
        '<a class="btn btn--primary landing__cta" href="/settings" data-path="/settings">Start Tracking</a>' +
      '</section>'
    );
  }

  function viewSettings() {
    return (
      '<section class="route-view__content">' +
        '<h1 class="context-header__title">Settings</h1>' +
        '<p class="context-header__subtext">Configure your job preferences. Changes will be saved in a future step.</p>' +
        '<div class="card form-card">' +
          '<div class="form-fields">' +
            '<div class="input-group">' +
              '<label class="input-group__label" for="role-keywords">Role keywords</label>' +
              '<input id="role-keywords" class="input" type="text" placeholder="e.g. Software Engineer, Product Manager">' +
            '</div>' +
            '<div class="input-group">' +
              '<label class="input-group__label" for="locations">Preferred locations</label>' +
              '<input id="locations" class="input" type="text" placeholder="e.g. New York, San Francisco">' +
            '</div>' +
            '<div class="input-group">' +
              '<label class="input-group__label" for="mode">Mode</label>' +
              '<select class="input" id="mode">' +
                '<option value="">Select mode</option>' +
                '<option value="remote">Remote</option>' +
                '<option value="hybrid">Hybrid</option>' +
                '<option value="onsite">Onsite</option>' +
              '</select>' +
            '</div>' +
            '<div class="input-group">' +
              '<label class="input-group__label" for="experience">Experience level</label>' +
              '<select class="input" id="experience">' +
                '<option value="">Select level</option>' +
                '<option value="entry">Entry</option>' +
                '<option value="mid">Mid-level</option>' +
                '<option value="senior">Senior</option>' +
                '<option value="lead">Lead</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function viewDashboard() {
    return (
      '<section class="route-view__content">' +
        '<div class="empty-state">' +
          '<h2 class="empty-state__title">No jobs yet.</h2>' +
          '<p class="empty-state__message">In the next step, you will load a realistic dataset.</p>' +
        '</div>' +
      '</section>'
    );
  }

  function viewSaved() {
    return (
      '<section class="route-view__content">' +
        '<div class="empty-state">' +
          '<h2 class="empty-state__title">Saved jobs</h2>' +
          '<p class="empty-state__message">Jobs you save for later will appear here.</p>' +
        '</div>' +
      '</section>'
    );
  }

  function viewDigest() {
    return (
      '<section class="route-view__content">' +
        '<div class="empty-state">' +
          '<h2 class="empty-state__title">Daily Digest</h2>' +
          '<p class="empty-state__message">Your personalized summary, delivered daily at 9AM. This feature will be built in a future step.</p>' +
        '</div>' +
      '</section>'
    );
  }

  function viewProof() {
    return (
      '<section class="context-header">' +
        '<h1 class="context-header__title">Proof</h1>' +
        '<p class="context-header__subtext">Artifact collection and verification. This section will be built in a future step.</p>' +
      '</section>'
    );
  }

  function view404() {
    return (
      '<section class="context-header">' +
        '<h1 class="context-header__title">Page Not Found</h1>' +
        '<p class="context-header__subtext">The page you are looking for does not exist.</p>' +
      '</section>'
    );
  }

  /* ─── Router ───────────────────────────────────────────────────── */

  var routes = {
    '/': { view: viewLanding, title: 'Job Notification Tracker' },
    '/dashboard': { view: viewDashboard, title: 'Dashboard' },
    '/settings': { view: viewSettings, title: 'Settings' },
    '/saved': { view: viewSaved, title: 'Saved' },
    '/digest': { view: viewDigest, title: 'Digest' },
    '/proof': { view: viewProof, title: 'Proof' }
  };

  function render() {
    var path = getPath();
    var route = routes[path];
    var root = document.getElementById('root');
    if (!root) return;

    if (route) {
      root.innerHTML = route.view();
      setPageTitle(route.title);
    } else {
      root.innerHTML = view404();
      setPageTitle('Page Not Found');
    }

    updateNavActive(path);
  }

  function updateNavActive(path) {
    var links = document.querySelectorAll('.nav-link[data-path]');
    links.forEach(function (link) {
      var linkPath = link.getAttribute('data-path');
      link.classList.toggle('is-active', linkPath === path);
    });
  }

  function handleClick(e) {
    var link = e.target.closest('a[data-path]');
    if (!link) return;
    var path = link.getAttribute('data-path');
    if (!path) return;
    if (path === getPath()) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    navigate(path);
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
