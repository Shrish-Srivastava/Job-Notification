/**
 * Job Notification Tracker — Client-side router & dashboard logic
 * No full page reloads. Jobs, filtering, saved state, modal.
 */

(function () {
  var SAVED_KEY = 'savedJobIds';

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

  /* ─── Saved Jobs (localStorage) ─────────────────────────────────── */
  function getSavedIds() {
    try {
      var raw = localStorage.getItem(SAVED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveJob(id) {
    var ids = getSavedIds();
    if (ids.indexOf(id) === -1) {
      ids.push(id);
      localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
    }
  }

  function unsaveJob(id) {
    var ids = getSavedIds().filter(function (x) { return x !== id; });
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  }

  function isSaved(id) {
    return getSavedIds().indexOf(id) >= 0;
  }

  /* ─── Filtering ─────────────────────────────────────────────────── */
  function filterJobs(jobs, filters) {
    var keyword = (filters.keyword || '').toLowerCase().trim();
    var location = (filters.location || '').toLowerCase();
    var mode = (filters.mode || '').toLowerCase();
    var experience = (filters.experience || '').toLowerCase();
    var source = (filters.source || '').toLowerCase();
    var sort = (filters.sort || 'latest').toLowerCase();

    var out = jobs.filter(function (j) {
      if (keyword) {
        var match = (j.title + ' ' + j.company).toLowerCase().indexOf(keyword) >= 0;
        if (!match) return false;
      }
      if (location && j.location.toLowerCase() !== location.toLowerCase()) return false;
      if (mode && j.mode.toLowerCase() !== mode.toLowerCase()) return false;
      if (experience && j.experience.toLowerCase() !== experience.toLowerCase()) return false;
      if (source && j.source.toLowerCase() !== source.toLowerCase()) return false;
      return true;
    });

    out.sort(function (a, b) {
      if (sort === 'oldest') return b.postedDaysAgo - a.postedDaysAgo;
      return a.postedDaysAgo - b.postedDaysAgo;
    });

    return out;
  }

  function getUniqueValues(jobs, key) {
    var seen = {};
    jobs.forEach(function (j) {
      var v = j[key];
      if (v) seen[v] = 1;
    });
    return Object.keys(seen).sort();
  }

  /* ─── Modal ─────────────────────────────────────────────────────── */
  function openModal(job) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal">' +
        '<h2 class="modal__title">' + escapeHtml(job.title) + '</h2>' +
        '<p class="modal__company">' + escapeHtml(job.company) + '</p>' +
        '<div class="modal__section">' +
          '<div class="modal__label">Description</div>' +
          '<p class="modal__description">' + escapeHtml(job.description) + '</p>' +
        '</div>' +
        '<div class="modal__section">' +
          '<div class="modal__label">Skills</div>' +
          '<div class="modal__skills">' +
            (job.skills || []).map(function (s) {
              return '<span class="modal__skill">' + escapeHtml(s) + '</span>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<button class="btn btn--secondary modal__close">Close</button>' +
      '</div>';
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.classList.contains('modal__close')) {
        document.body.removeChild(overlay);
      }
    });
    document.body.appendChild(overlay);
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  /* ─── Job Card HTML ─────────────────────────────────────────────── */
  function jobCardHtml(job, saved, showUnsave) {
    var posted = job.postedDaysAgo === 0 ? 'Today' :
      job.postedDaysAgo === 1 ? '1 day ago' : job.postedDaysAgo + ' days ago';
    var saveLabel = showUnsave ? 'Unsave' : 'Save';
    return (
      '<div class="job-card" data-job-id="' + escapeHtml(job.id) + '">' +
        '<div class="job-card__header">' +
          '<div>' +
            '<h3 class="job-card__title">' + escapeHtml(job.title) + '</h3>' +
            '<p class="job-card__company">' + escapeHtml(job.company) + '</p>' +
          '</div>' +
          '<span class="source-badge">' + escapeHtml(job.source) + '</span>' +
        '</div>' +
        '<div class="job-card__meta">' +
          escapeHtml(job.location) + ' · ' + escapeHtml(job.mode) + ' · ' + escapeHtml(job.experience) +
        '</div>' +
        '<div class="job-card__salary">' + escapeHtml(job.salaryRange) + '</div>' +
        '<div class="job-card__meta">' + escapeHtml(posted) + '</div>' +
        '<div class="job-card__footer">' +
          '<button type="button" class="btn btn--secondary job-card__view">View</button>' +
          '<button type="button" class="btn btn--secondary job-card__save">' + saveLabel + '</button>' +
          '<a class="btn btn--primary job-card__apply" href="' + escapeHtml(job.applyUrl) + '" target="_blank" rel="noopener">Apply</a>' +
        '</div>' +
      '</div>'
    );
  }

  /* ─── Filter Bar HTML ───────────────────────────────────────────── */
  function filterBarHtml(locations, filters) {
    return (
      '<div class="filter-bar">' +
        '<input type="text" class="input filter-bar__keyword filter-keyword" placeholder="Search title or company" value="' + escapeHtml(filters.keyword || '') + '">' +
        '<select class="input filter-location">' +
          '<option value="">All locations</option>' +
          locations.map(function (loc) {
            return '<option value="' + escapeHtml(loc) + '"' + (filters.location === loc ? ' selected' : '') + '>' + escapeHtml(loc) + '</option>';
          }).join('') +
        '</select>' +
        '<select class="input filter-mode">' +
          '<option value="">All modes</option>' +
          '<option value="Remote"' + (filters.mode === 'Remote' ? ' selected' : '') + '>Remote</option>' +
          '<option value="Hybrid"' + (filters.mode === 'Hybrid' ? ' selected' : '') + '>Hybrid</option>' +
          '<option value="Onsite"' + (filters.mode === 'Onsite' ? ' selected' : '') + '>Onsite</option>' +
        '</select>' +
        '<select class="input filter-experience">' +
          '<option value="">All experience</option>' +
          '<option value="Fresher"' + (filters.experience === 'Fresher' ? ' selected' : '') + '>Fresher</option>' +
          '<option value="0-1"' + (filters.experience === '0-1' ? ' selected' : '') + '>0-1</option>' +
          '<option value="1-3"' + (filters.experience === '1-3' ? ' selected' : '') + '>1-3</option>' +
          '<option value="3-5"' + (filters.experience === '3-5' ? ' selected' : '') + '>3-5</option>' +
        '</select>' +
        '<select class="input filter-source">' +
          '<option value="">All sources</option>' +
          '<option value="LinkedIn"' + (filters.source === 'LinkedIn' ? ' selected' : '') + '>LinkedIn</option>' +
          '<option value="Naukri"' + (filters.source === 'Naukri' ? ' selected' : '') + '>Naukri</option>' +
          '<option value="Indeed"' + (filters.source === 'Indeed' ? ' selected' : '') + '>Indeed</option>' +
        '</select>' +
        '<select class="input filter-sort">' +
          '<option value="latest"' + (filters.sort === 'latest' ? ' selected' : '') + '>Latest</option>' +
          '<option value="oldest"' + (filters.sort === 'oldest' ? ' selected' : '') + '>Oldest</option>' +
        '</select>' +
      '</div>'
    );
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

  function viewDashboard(filters) {
    var jobs = typeof JOBS !== 'undefined' ? JOBS : [];
    var locations = getUniqueValues(jobs, 'location');
    var f = filters || {};
    var filtered = filterJobs(jobs, f);
    var filterHtml = filterBarHtml(locations, f);
    var listHtml;
    if (filtered.length === 0) {
      listHtml = '<div class="empty-state"><h2 class="empty-state__title">No jobs match your search.</h2></div>';
    } else {
      listHtml = filtered.map(function (j) {
        return jobCardHtml(j, isSaved(j.id), false);
      }).join('');
    }
    return (
      '<section class="route-view__content">' +
        '<h1 class="context-header__title">Dashboard</h1>' +
        '<p class="context-header__subtext">Browse and filter jobs. View details, save for later, or apply directly.</p>' +
        filterHtml +
        '<div class="job-list">' + listHtml + '</div>' +
      '</section>'
    );
  }

  function viewSaved() {
    var jobs = typeof JOBS !== 'undefined' ? JOBS : [];
    var savedIds = getSavedIds();
    var savedJobs = jobs.filter(function (j) { return savedIds.indexOf(j.id) >= 0; });
    var listHtml;
    if (savedJobs.length === 0) {
      listHtml = '<div class="empty-state"><h2 class="empty-state__title">Saved jobs</h2><p class="empty-state__message">Jobs you save for later will appear here.</p></div>';
    } else {
      listHtml = savedJobs.map(function (j) {
        return jobCardHtml(j, true, true);
      }).join('');
    }
    return (
      '<section class="route-view__content">' +
        '<h1 class="context-header__title">Saved</h1>' +
        '<p class="context-header__subtext">Jobs you have saved for later.</p>' +
        '<div class="job-list">' + listHtml + '</div>' +
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

  /* ─── Dashboard Filters (in-memory) ─────────────────────────────── */
  var dashboardFilters = {};

  function getFiltersFromDom() {
    var root = document.getElementById('root');
    if (!root) return {};
    return {
      keyword: (root.querySelector('.filter-keyword') || {}).value || '',
      location: (root.querySelector('.filter-location') || {}).value || '',
      mode: (root.querySelector('.filter-mode') || {}).value || '',
      experience: (root.querySelector('.filter-experience') || {}).value || '',
      source: (root.querySelector('.filter-source') || {}).value || '',
      sort: (root.querySelector('.filter-sort') || {}).value || 'latest'
    };
  }

  var keywordDebounceTimer;

  function applyFiltersAndRender() {
    var root = document.getElementById('root');
    if (!root) return;
    dashboardFilters = getFiltersFromDom();
    root.innerHTML = viewDashboard(dashboardFilters);
    attachFilterListeners();
    attachJobCardListeners();
  }

  function attachFilterListeners() {
    var root = document.getElementById('root');
    if (!root) return;
    root.querySelectorAll('.filter-location, .filter-mode, .filter-experience, .filter-source, .filter-sort').forEach(function (el) {
      el.addEventListener('change', applyFiltersAndRender);
    });
    var keywordEl = root.querySelector('.filter-keyword');
    if (keywordEl) {
      keywordEl.addEventListener('input', function () {
        clearTimeout(keywordDebounceTimer);
        keywordDebounceTimer = setTimeout(applyFiltersAndRender, 200);
      });
    }
  }

  function attachJobCardListeners() {
    var root = document.getElementById('root');
    if (!root) return;
    var jobs = typeof JOBS !== 'undefined' ? JOBS : [];
    var jobMap = {};
    jobs.forEach(function (j) { jobMap[j.id] = j; });

    root.querySelectorAll('.job-card__view').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.job-card');
        var id = card && card.getAttribute('data-job-id');
        var job = id && jobMap[id];
        if (job) openModal(job);
      });
    });

    root.querySelectorAll('.job-card__save').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.job-card');
        var id = card && card.getAttribute('data-job-id');
        if (!id) return;
        var saved = isSaved(id);
        if (saved) {
          unsaveJob(id);
        } else {
          saveJob(id);
        }
        var path = getPath();
        if (path === '/saved') {
          render();
        } else {
          var r = document.getElementById('root');
          if (r) {
            r.innerHTML = viewDashboard(dashboardFilters);
            attachFilterListeners();
            attachJobCardListeners();
          }
        }
      });
    });

    root.querySelectorAll('.job-card__apply').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var href = a.getAttribute('href');
        if (href) window.open(href, '_blank', 'noopener');
      });
    });
  }

  /* ─── Router ───────────────────────────────────────────────────── */

  var routes = {
    '/': { view: function () { return viewLanding(); }, title: 'Job Notification Tracker' },
    '/dashboard': {
      view: function () { return viewDashboard(dashboardFilters); },
      title: 'Dashboard',
      mount: function () {
        attachFilterListeners();
        attachJobCardListeners();
      }
    },
    '/saved': {
      view: function () { return viewSaved(); },
      title: 'Saved',
      mount: function () {
        attachJobCardListeners();
      }
    },
    '/digest': { view: function () { return viewDigest(); }, title: 'Digest' },
    '/settings': { view: function () { return viewSettings(); }, title: 'Settings' },
    '/proof': { view: function () { return viewProof(); }, title: 'Proof' }
  };

  function render() {
    var path = getPath();
    var route = routes[path];
    var root = document.getElementById('root');
    if (!root) return;

    if (route) {
      root.innerHTML = route.view();
      setPageTitle(route.title);
      if (route.mount) route.mount();
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
