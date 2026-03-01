/**
 * Job Notification Tracker — Router, preferences, match scoring
 * No full page reloads. Deterministic match score engine.
 */

(function () {
  var SAVED_KEY = 'savedJobIds';
  var PREFS_KEY = 'jobTrackerPreferences';
  var DIGEST_PREFIX = 'jobTrackerDigest_';
  var STATUS_KEY = 'jobTrackerStatus';
  var STATUS_HISTORY_KEY = 'jobTrackerStatusHistory';

  var DEFAULT_PREFS = {
    roleKeywords: '',
    preferredLocations: [],
    preferredMode: [],
    experienceLevel: '',
    skills: '',
    minMatchScore: 40
  };

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

  /* ─── Preferences (localStorage) ────────────────────────────────── */
  function getPreferences() {
    try {
      var raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      return {
        roleKeywords: p.roleKeywords || '',
        preferredLocations: Array.isArray(p.preferredLocations) ? p.preferredLocations : [],
        preferredMode: Array.isArray(p.preferredMode) ? p.preferredMode : [],
        experienceLevel: p.experienceLevel || '',
        skills: p.skills || '',
        minMatchScore: typeof p.minMatchScore === 'number' ? Math.max(0, Math.min(100, p.minMatchScore)) : 40
      };
    } catch (e) {
      return null;
    }
  }

  function hasPreferences() {
    var p = getPreferences();
    return p !== null && (p.roleKeywords || p.preferredLocations.length > 0 || p.preferredMode.length > 0 || p.experienceLevel || p.skills);
  }

  function savePreferences(prefs) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {}
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

  /* ─── Job Status (localStorage) ──────────────────────────────────── */
  function getStatusMap() {
    try {
      var raw = localStorage.getItem(STATUS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function getJobStatus(id) {
    var map = getStatusMap();
    var s = map[id];
    if (s === 'Applied' || s === 'Rejected' || s === 'Selected') return s;
    return 'Not Applied';
  }

  function setJobStatus(id, status, job) {
    var map = getStatusMap();
    map[id] = status;
    try {
      localStorage.setItem(STATUS_KEY, JSON.stringify(map));
    } catch (e) {}
    if (status !== 'Not Applied' && job) {
      addStatusHistory(id, job.title, job.company, status);
      showToast('Status updated: ' + status);
    }
  }

  function addStatusHistory(jobId, title, company, status) {
    try {
      var raw = localStorage.getItem(STATUS_HISTORY_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      arr.unshift({ jobId: jobId, title: title, company: company, status: status, dateChanged: new Date().toISOString().slice(0, 10) });
      if (arr.length > 50) arr = arr.slice(0, 50);
      localStorage.setItem(STATUS_HISTORY_KEY, JSON.stringify(arr));
    } catch (e) {}
  }

  function getStatusHistory() {
    try {
      var raw = localStorage.getItem(STATUS_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /* ─── Toast ─────────────────────────────────────────────────────── */
  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('toast--visible'); });
    setTimeout(function () {
      toast.classList.remove('toast--visible');
      setTimeout(function () {
        if (toast.parentNode) document.body.removeChild(toast);
      }, 200);
    }, 2500);
  }

  /* ─── Match Score Engine (deterministic) ─────────────────────────── */
  function computeMatchScore(job, prefs) {
    if (!prefs) return 0;
    var score = 0;

    var roleKeywords = (prefs.roleKeywords || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    var userSkills = (prefs.skills || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    var titleLower = (job.title || '').toLowerCase();
    var descLower = (job.description || '').toLowerCase();

    if (roleKeywords.length > 0) {
      var anyInTitle = roleKeywords.some(function (kw) { return kw && titleLower.indexOf(kw) >= 0; });
      var anyInDesc = roleKeywords.some(function (kw) { return kw && descLower.indexOf(kw) >= 0; });
      if (anyInTitle) score += 25;
      if (anyInDesc) score += 15;
    }

    if (prefs.preferredLocations && prefs.preferredLocations.length > 0) {
      var locMatch = prefs.preferredLocations.some(function (loc) {
        return (job.location || '').toLowerCase() === (loc || '').toLowerCase();
      });
      if (locMatch) score += 15;
    }

    if (prefs.preferredMode && prefs.preferredMode.length > 0) {
      var modeMatch = prefs.preferredMode.some(function (m) {
        return (job.mode || '').toLowerCase() === (m || '').toLowerCase();
      });
      if (modeMatch) score += 10;
    }

    if (prefs.experienceLevel && (job.experience || '').toLowerCase() === (prefs.experienceLevel || '').toLowerCase()) {
      score += 10;
    }

    if (userSkills.length > 0 && job.skills && Array.isArray(job.skills)) {
      var jobSkillsLower = job.skills.map(function (s) { return (s || '').toLowerCase(); });
      var skillMatch = userSkills.some(function (us) {
        return jobSkillsLower.some(function (js) { return js.indexOf(us) >= 0 || us.indexOf(js) >= 0; });
      });
      if (skillMatch) score += 15;
    }

    if ((job.postedDaysAgo || 999) <= 2) score += 5;
    if ((job.source || '').toLowerCase() === 'linkedin') score += 5;

    return Math.min(100, score);
  }

  function getMatchBadgeClass(score) {
    if (score >= 80) return 'match-badge match-badge--high';
    if (score >= 60) return 'match-badge match-badge--medium';
    if (score >= 40) return 'match-badge match-badge--neutral';
    return 'match-badge match-badge--low';
  }

  function getStatusBadgeClass(status) {
    if (status === 'Applied') return 'status-badge status-badge--applied';
    if (status === 'Rejected') return 'status-badge status-badge--rejected';
    if (status === 'Selected') return 'status-badge status-badge--selected';
    return 'status-badge status-badge--neutral';
  }

  /* ─── Digest Engine ─────────────────────────────────────────────── */
  function getTodayDateStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function getDigestKey(dateStr) {
    return DIGEST_PREFIX + dateStr;
  }

  function getDigest(dateStr) {
    try {
      var raw = localStorage.getItem(getDigestKey(dateStr || getTodayDateStr()));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveDigest(dateStr, digest) {
    try {
      localStorage.setItem(getDigestKey(dateStr), JSON.stringify(digest));
    } catch (e) {}
  }

  function generateDigestData() {
    var jobs = typeof JOBS !== 'undefined' ? JOBS : [];
    var prefs = getPreferences();
    var jobsWithScores = jobs.map(function (j) {
      return { job: j, matchScore: computeMatchScore(j, prefs) };
    });
    jobsWithScores.sort(function (a, b) {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.job.postedDaysAgo - b.job.postedDaysAgo;
    });
    return jobsWithScores.slice(0, 10);
  }

  function getOrCreateTodayDigest() {
    var dateStr = getTodayDateStr();
    var existing = getDigest(dateStr);
    if (existing) return existing;
    var items = generateDigestData();
    var digest = { date: dateStr, items: items };
    saveDigest(dateStr, digest);
    return digest;
  }

  function digestToPlainText(digest) {
    if (!digest || !digest.items || digest.items.length === 0) return '';
    var lines = [
      'Top 10 Jobs For You — 9AM Digest',
      digest.date || getTodayDateStr(),
      ''
    ];
    digest.items.forEach(function (item, i) {
      var j = item.job;
      lines.push((i + 1) + '. ' + j.title + ' at ' + j.company);
      lines.push('   Location: ' + j.location + ' | Experience: ' + j.experience + ' | Match: ' + item.matchScore + '%');
      lines.push('   Apply: ' + j.applyUrl);
      lines.push('');
    });
    lines.push('This digest was generated based on your preferences.');
    return lines.join('\n');
  }

  /* ─── Salary extraction for sorting ─────────────────────────────── */
  function extractSalaryValue(salaryRange) {
    if (!salaryRange) return 0;
    var m = salaryRange.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  /* ─── Filtering ─────────────────────────────────────────────────── */
  function filterJobs(jobsWithScores, filters, prefs) {
    var keyword = (filters.keyword || '').toLowerCase().trim();
    var location = (filters.location || '').toLowerCase();
    var mode = (filters.mode || '').toLowerCase();
    var experience = (filters.experience || '').toLowerCase();
    var source = (filters.source || '').toLowerCase();
    var sort = (filters.sort || 'latest').toLowerCase();
    var statusFilter = (filters.status || '').toLowerCase();
    var aboveThreshold = filters.aboveThreshold === true;
    var minScore = (prefs && typeof prefs.minMatchScore === 'number') ? prefs.minMatchScore : 40;

    var out = jobsWithScores.filter(function (item) {
      var j = item.job;
      if (keyword) {
        var match = (j.title + ' ' + j.company).toLowerCase().indexOf(keyword) >= 0;
        if (!match) return false;
      }
      if (location && j.location.toLowerCase() !== location) return false;
      if (mode && j.mode.toLowerCase() !== mode) return false;
      if (experience && j.experience.toLowerCase() !== experience) return false;
      if (source && j.source.toLowerCase() !== source) return false;
      if (aboveThreshold && item.matchScore < minScore) return false;
      if (statusFilter) {
        var jobStatus = (getJobStatus(j.id) || 'Not Applied').toLowerCase().replace(/\s/g, '');
        var filterNorm = statusFilter.toLowerCase().replace(/\s/g, '');
        if (jobStatus !== filterNorm) return false;
      }
      return true;
    });

    out.sort(function (a, b) {
      if (sort === 'match') return b.matchScore - a.matchScore;
      if (sort === 'salary') return extractSalaryValue(b.job.salaryRange) - extractSalaryValue(a.job.salaryRange);
      if (sort === 'oldest') return b.job.postedDaysAgo - a.job.postedDaysAgo;
      return a.job.postedDaysAgo - b.job.postedDaysAgo;
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
  function jobCardHtml(item, saved, showUnsave) {
    var job = item.job;
    var score = item.matchScore;
    var status = getJobStatus(job.id);
    var posted = job.postedDaysAgo === 0 ? 'Today' :
      job.postedDaysAgo === 1 ? '1 day ago' : job.postedDaysAgo + ' days ago';
    var saveLabel = showUnsave ? 'Unsave' : 'Save';
    var scoreBadge = '<span class="' + getMatchBadgeClass(score) + '">' + score + '%</span>';
    var statusSelect = (
      '<select class="job-card__status ' + getStatusBadgeClass(status) + '" data-job-id="' + escapeHtml(job.id) + '">' +
        '<option value="Not Applied"' + (status === 'Not Applied' ? ' selected' : '') + '>Not Applied</option>' +
        '<option value="Applied"' + (status === 'Applied' ? ' selected' : '') + '>Applied</option>' +
        '<option value="Rejected"' + (status === 'Rejected' ? ' selected' : '') + '>Rejected</option>' +
        '<option value="Selected"' + (status === 'Selected' ? ' selected' : '') + '>Selected</option>' +
      '</select>'
    );
    return (
      '<div class="job-card" data-job-id="' + escapeHtml(job.id) + '">' +
        '<div class="job-card__header">' +
          '<div>' +
            '<h3 class="job-card__title">' + escapeHtml(job.title) + '</h3>' +
            '<p class="job-card__company">' + escapeHtml(job.company) + '</p>' +
          '</div>' +
          '<div class="job-card__badges">' +
            scoreBadge +
            '<span class="source-badge">' + escapeHtml(job.source) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="job-card__meta">' +
          escapeHtml(job.location) + ' · ' + escapeHtml(job.mode) + ' · ' + escapeHtml(job.experience) +
        '</div>' +
        '<div class="job-card__salary">' + escapeHtml(job.salaryRange) + '</div>' +
        '<div class="job-card__meta">' + escapeHtml(posted) + '</div>' +
        '<div class="job-card__status-row">' + statusSelect + '</div>' +
        '<div class="job-card__footer">' +
          '<button type="button" class="btn btn--secondary job-card__view">View</button>' +
          '<button type="button" class="btn btn--secondary job-card__save">' + saveLabel + '</button>' +
          '<a class="btn btn--primary job-card__apply" href="' + escapeHtml(job.applyUrl) + '" target="_blank" rel="noopener">Apply</a>' +
        '</div>' +
      '</div>'
    );
  }

  var prefsForScoring = null;

  /* ─── Filter Bar HTML ───────────────────────────────────────────── */
  function filterBarHtml(locations, filters) {
    var aboveChecked = filters.aboveThreshold ? ' checked' : '';
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
        '<select class="input filter-status">' +
          '<option value="">All</option>' +
          '<option value="Not Applied"' + (filters.status === 'Not Applied' ? ' selected' : '') + '>Not Applied</option>' +
          '<option value="Applied"' + (filters.status === 'Applied' ? ' selected' : '') + '>Applied</option>' +
          '<option value="Rejected"' + (filters.status === 'Rejected' ? ' selected' : '') + '>Rejected</option>' +
          '<option value="Selected"' + (filters.status === 'Selected' ? ' selected' : '') + '>Selected</option>' +
        '</select>' +
        '<select class="input filter-sort">' +
          '<option value="latest"' + (filters.sort === 'latest' ? ' selected' : '') + '>Latest</option>' +
          '<option value="match"' + (filters.sort === 'match' ? ' selected' : '') + '>Match Score</option>' +
          '<option value="salary"' + (filters.sort === 'salary' ? ' selected' : '') + '>Salary</option>' +
          '<option value="oldest"' + (filters.sort === 'oldest' ? ' selected' : '') + '>Oldest</option>' +
        '</select>' +
      '</div>' +
      '<div class="toggle-row">' +
        '<input type="checkbox" id="above-threshold" class="filter-above-threshold"' + aboveChecked + '>' +
        '<label for="above-threshold">Show only jobs above my threshold</label>' +
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
    var p = getPreferences() || DEFAULT_PREFS;
    var roleVal = escapeHtml(p.roleKeywords || '');
    var skillsVal = escapeHtml(p.skills || '');
    var expVal = p.experienceLevel || '';
    var minVal = p.minMatchScore;
    var locOpts = (typeof JOBS !== 'undefined' ? getUniqueValues(JOBS, 'location') : []).map(function (loc) {
      var sel = (p.preferredLocations || []).indexOf(loc) >= 0 ? ' selected' : '';
      return '<option value="' + escapeHtml(loc) + '"' + sel + '>' + escapeHtml(loc) + '</option>';
    }).join('');
    var remoteChecked = (p.preferredMode || []).indexOf('Remote') >= 0 ? ' checked' : '';
    var hybridChecked = (p.preferredMode || []).indexOf('Hybrid') >= 0 ? ' checked' : '';
    var onsiteChecked = (p.preferredMode || []).indexOf('Onsite') >= 0 ? ' checked' : '';
    return (
      '<section class="route-view__content">' +
        '<h1 class="context-header__title">Settings</h1>' +
        '<p class="context-header__subtext">Configure your job preferences. Changes are saved automatically.</p>' +
        '<div class="card form-card">' +
          '<div class="form-fields">' +
            '<div class="input-group">' +
              '<label class="input-group__label" for="role-keywords">Role keywords (comma-separated)</label>' +
              '<input id="role-keywords" class="input" type="text" placeholder="e.g. Software Engineer, Product Manager" value="' + roleVal + '">' +
            '</div>' +
            '<div class="input-group">' +
              '<label class="input-group__label" for="preferred-locations">Preferred locations (hold Ctrl/Cmd to multi-select)</label>' +
              '<select id="preferred-locations" class="input" multiple>' +
                locOpts +
              '</select>' +
            '</div>' +
            '<div class="input-group">' +
              '<label class="input-group__label">Preferred mode</label>' +
              '<div class="checkbox-group">' +
                '<label><input type="checkbox" name="preferred-mode" value="Remote"' + remoteChecked + '> Remote</label>' +
                '<label><input type="checkbox" name="preferred-mode" value="Hybrid"' + hybridChecked + '> Hybrid</label>' +
                '<label><input type="checkbox" name="preferred-mode" value="Onsite"' + onsiteChecked + '> Onsite</label>' +
              '</div>' +
            '</div>' +
            '<div class="input-group">' +
              '<label class="input-group__label" for="experience-level">Experience level</label>' +
              '<select id="experience-level" class="input">' +
                '<option value="">Select level</option>' +
                '<option value="Fresher"' + (expVal === 'Fresher' ? ' selected' : '') + '>Fresher</option>' +
                '<option value="0-1"' + (expVal === '0-1' ? ' selected' : '') + '>0-1</option>' +
                '<option value="1-3"' + (expVal === '1-3' ? ' selected' : '') + '>1-3</option>' +
                '<option value="3-5"' + (expVal === '3-5' ? ' selected' : '') + '>3-5</option>' +
              '</select>' +
            '</div>' +
            '<div class="input-group">' +
              '<label class="input-group__label" for="skills">Skills (comma-separated)</label>' +
              '<input id="skills" class="input" type="text" placeholder="e.g. React, Java, Python" value="' + skillsVal + '">' +
            '</div>' +
            '<div class="input-group slider-group">' +
              '<label class="input-group__label" for="min-match-score">Minimum match score (0–100)</label>' +
              '<input id="min-match-score" type="range" min="0" max="100" value="' + minVal + '">' +
              '<span class="slider-group__value" id="min-match-score-value">' + minVal + '</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn btn--primary" id="save-preferences">Save preferences</button>' +
        '</div>' +
      '</section>'
    );
  }

  function viewDashboard(filters) {
    var jobs = typeof JOBS !== 'undefined' ? JOBS : [];
    var prefs = getPreferences();
    prefsForScoring = prefs;
    var jobsWithScores = jobs.map(function (j) {
      return { job: j, matchScore: computeMatchScore(j, prefs) };
    });
    var locations = getUniqueValues(jobs, 'location');
    var f = filters || {};
    var filtered = filterJobs(jobsWithScores, f, prefs);
    var filterHtml = filterBarHtml(locations, f);
    var listHtml;
    var noPrefsBanner = !hasPreferences() ? '<div class="prefs-banner">Set your preferences to activate intelligent matching.</div>' : '';
    if (filtered.length === 0) {
      listHtml = '<div class="empty-state"><h2 class="empty-state__title">No roles match your criteria. Adjust filters or lower threshold.</h2></div>';
    } else {
      listHtml = filtered.map(function (item) {
        return jobCardHtml(item, isSaved(item.job.id), false);
      }).join('');
    }
    return (
      '<section class="route-view__content">' +
        '<h1 class="context-header__title">Dashboard</h1>' +
        '<p class="context-header__subtext">Browse and filter jobs. View details, save for later, or apply directly.</p>' +
        noPrefsBanner +
        filterHtml +
        '<div class="job-list">' + listHtml + '</div>' +
      '</section>'
    );
  }

  function viewSaved() {
    var jobs = typeof JOBS !== 'undefined' ? JOBS : [];
    var prefs = getPreferences();
    prefsForScoring = prefs;
    var savedIds = getSavedIds();
    var savedJobs = jobs.filter(function (j) { return savedIds.indexOf(j.id) >= 0; }).map(function (j) {
      return { job: j, matchScore: computeMatchScore(j, prefs) };
    });
    var listHtml;
    if (savedJobs.length === 0) {
      listHtml = '<div class="empty-state"><h2 class="empty-state__title">Saved jobs</h2><p class="empty-state__message">Jobs you save for later will appear here.</p></div>';
    } else {
      listHtml = savedJobs.map(function (item) {
        return jobCardHtml(item, true, true);
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
    var prefs = hasPreferences();
    var todayStr = getTodayDateStr();
    var digest = getDigest(todayStr);

    if (!prefs) {
      return (
        '<section class="route-view__content">' +
          '<h1 class="context-header__title">Daily Digest</h1>' +
          '<p class="context-header__subtext">Your personalized summary, delivered daily at 9AM.</p>' +
          '<div class="digest-blocking">' +
            '<p class="digest-blocking__message">Set preferences to generate a personalized digest.</p>' +
          '</div>' +
        '</section>'
      );
    }

    var digestHtml = '';
    if (digest && digest.items && digest.items.length > 0) {
      digestHtml = (
        '<div class="digest-card">' +
          '<div class="digest-header">' +
            '<h2 class="digest-header__title">Top 10 Jobs For You — 9AM Digest</h2>' +
            '<p class="digest-header__date">' + escapeHtml(digest.date || todayStr) + '</p>' +
          '</div>' +
          '<div class="digest-body">' +
            digest.items.map(function (item, i) {
              var j = item.job;
              return (
                '<div class="digest-job">' +
                  '<h3 class="digest-job__title">' + escapeHtml(j.title) + '</h3>' +
                  '<p class="digest-job__meta">' + escapeHtml(j.company) + ' · ' + escapeHtml(j.location) + ' · ' + escapeHtml(j.experience) + '</p>' +
                  '<div class="digest-job__footer">' +
                    '<span class="' + getMatchBadgeClass(item.matchScore) + '">' + item.matchScore + '%</span>' +
                    '<a class="btn btn--primary digest-job__apply" href="' + escapeHtml(j.applyUrl) + '" target="_blank" rel="noopener">Apply</a>' +
                  '</div>' +
                '</div>'
              );
            }).join('') +
          '</div>' +
          '<div class="digest-footer">' +
            '<p class="digest-footer__text">This digest was generated based on your preferences.</p>' +
            '<div class="digest-actions flex-gap">' +
              '<button type="button" class="btn btn--secondary" id="digest-copy">Copy Digest to Clipboard</button>' +
              '<a class="btn btn--secondary" id="digest-email" href="#">Create Email Draft</a>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    } else if (digest && digest.items && digest.items.length === 0) {
      digestHtml = '<div class="empty-state"><h2 class="empty-state__title">No matching roles today. Check again tomorrow.</h2></div>';
    } else {
      digestHtml = '';
    }

    var statusHistory = getStatusHistory();
    var recentUpdatesHtml = '';
    if (statusHistory.length > 0) {
      recentUpdatesHtml = (
        '<div class="digest-card digest-recent-updates">' +
          '<h2 class="digest-header__title">Recent Status Updates</h2>' +
          statusHistory.slice(0, 10).map(function (h) {
            return (
              '<div class="digest-job digest-job--update">' +
                '<h3 class="digest-job__title">' + escapeHtml(h.title) + '</h3>' +
                '<p class="digest-job__meta">' + escapeHtml(h.company) + '</p>' +
                '<div class="digest-job__footer">' +
                  '<span class="' + getStatusBadgeClass(h.status) + '">' + escapeHtml(h.status) + '</span>' +
                  '<span class="digest-job__date">' + escapeHtml(h.dateChanged) + '</span>' +
                '</div>' +
              '</div>'
            );
          }).join('') +
        '</div>'
      );
    }

    return (
      '<section class="route-view__content digest-view">' +
        '<h1 class="context-header__title">Daily Digest</h1>' +
        '<p class="context-header__subtext">Your personalized summary, delivered daily at 9AM.</p>' +
        '<p class="digest-note">Demo Mode: Daily 9AM trigger simulated manually.</p>' +
        '<button type="button" class="btn btn--primary digest-generate-btn" id="digest-generate">Generate Today\'s 9AM Digest (Simulated)</button>' +
        recentUpdatesHtml +
        digestHtml +
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

  /* ─── Dashboard Filters ─────────────────────────────────────────── */
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
      status: (root.querySelector('.filter-status') || {}).value || '',
      sort: (root.querySelector('.filter-sort') || {}).value || 'latest',
      aboveThreshold: !!(root.querySelector('.filter-above-threshold') || {}).checked
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
    root.querySelectorAll('.filter-location, .filter-mode, .filter-experience, .filter-source, .filter-status, .filter-sort').forEach(function (el) {
      el.addEventListener('change', applyFiltersAndRender);
    });
    var aboveEl = root.querySelector('.filter-above-threshold');
    if (aboveEl) aboveEl.addEventListener('change', applyFiltersAndRender);
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
        if (saved) unsaveJob(id);
        else saveJob(id);
        var path = getPath();
        if (path === '/saved') render();
        else applyFiltersAndRender();
      });
    });

    root.querySelectorAll('.job-card__apply').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var href = a.getAttribute('href');
        if (href) window.open(href, '_blank', 'noopener');
      });
    });

    root.querySelectorAll('.job-card__status').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var id = sel.getAttribute('data-job-id');
        var status = sel.value || 'Not Applied';
        var job = id && jobMap[id];
        if (id && job) {
          setJobStatus(id, status, job);
          var path = getPath();
          if (path === '/saved') render();
          else applyFiltersAndRender();
        }
      });
    });
  }

  /* ─── Settings mount ────────────────────────────────────────────── */
  function attachSettingsListeners() {
    var root = document.getElementById('root');
    if (!root) return;
    var rangeEl = root.querySelector('#min-match-score');
    var valueEl = root.querySelector('#min-match-score-value');
    if (rangeEl && valueEl) {
      rangeEl.addEventListener('input', function () {
        valueEl.textContent = rangeEl.value;
      });
    }
    var saveBtn = root.querySelector('#save-preferences');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var roleKeywords = (root.querySelector('#role-keywords') || {}).value || '';
        var locSelect = root.querySelector('#preferred-locations');
        var locs = [];
        if (locSelect) {
          for (var i = 0; i < locSelect.options.length; i++) {
            if (locSelect.options[i].selected) locs.push(locSelect.options[i].value);
          }
        }
        var modeCheckboxes = root.querySelectorAll('input[name="preferred-mode"]:checked');
        var modes = [];
        modeCheckboxes.forEach(function (cb) { modes.push(cb.value); });
        var experienceLevel = (root.querySelector('#experience-level') || {}).value || '';
        var skills = (root.querySelector('#skills') || {}).value || '';
        var minMatchScore = parseInt((root.querySelector('#min-match-score') || {}).value || '40', 10) || 40;
        savePreferences({
          roleKeywords: roleKeywords.trim(),
          preferredLocations: locs,
          preferredMode: modes,
          experienceLevel: experienceLevel,
          skills: skills.trim(),
          minMatchScore: Math.max(0, Math.min(100, minMatchScore))
        });
        navigate('/dashboard');
      });
    }
  }

  /* ─── Digest mount ──────────────────────────────────────────────── */
  function attachDigestListeners() {
    var root = document.getElementById('root');
    if (!root) return;

    var genBtn = root.querySelector('#digest-generate');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        getOrCreateTodayDigest();
        render();
      });
    }

    var copyBtn = root.querySelector('#digest-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var digest = getDigest(getTodayDateStr());
        var text = digestToPlainText(digest);
        if (text) {
          navigator.clipboard.writeText(text).then(function () {
            copyBtn.textContent = 'Copied!';
            setTimeout(function () { copyBtn.textContent = 'Copy Digest to Clipboard'; }, 2000);
          }).catch(function () {});
        }
      });
    }

    var emailLink = root.querySelector('#digest-email');
    if (emailLink) {
      emailLink.addEventListener('click', function (e) {
        e.preventDefault();
        var digest = getDigest(getTodayDateStr());
        var body = digestToPlainText(digest);
        var subject = 'My 9AM Job Digest';
        var mailto = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        window.location.href = mailto;
      });
    }
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
      mount: function () { attachJobCardListeners(); }
    },
    '/digest': {
      view: function () { return viewDigest(); },
      title: 'Digest',
      mount: function () { attachDigestListeners(); }
    },
    '/settings': {
      view: function () { return viewSettings(); },
      title: 'Settings',
      mount: function () { attachSettingsListeners(); }
    },
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
    if (menuBtn) menuBtn.addEventListener('click', toggleMobileNav);

    document.addEventListener('click', function (e) {
      var nav = document.getElementById('topbar-nav');
      if (nav && nav.classList.contains('is-open') && !e.target.closest('.topbar')) {
        closeMobileNav();
      }
    });
  });
})();
