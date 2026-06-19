/** Filters report cards client-side without a page reload. */
(function () {
  const cards = () => [...document.querySelectorAll('[data-report-card]')];
  const searches = () => [...document.querySelectorAll('[data-report-search]')];
  const checks = () => [...document.querySelectorAll('[data-report-filter]')];

  function activeCategories() {
    return new Set(checks().filter((input) => input.checked).map((input) => input.value));
  }

  function searchTerm() {
    return searches().map((input) => input.value.trim().toLowerCase()).find(Boolean) || '';
  }

  function syncControl(source) {
    if (source.matches('[data-report-search]')) {
      searches().forEach((input) => {
        if (input !== source) input.value = source.value;
      });
    }
    if (source.matches('[data-report-filter]')) {
      checks().forEach((input) => {
        if (input !== source && input.value === source.value) input.checked = source.checked;
      });
    }
  }

  function applyFilters() {
    const selected = activeCategories();
    const term = searchTerm();
    let visible = 0;
    const total = cards().length;
    cards().forEach((card) => {
      const categoryMatch = selected.size === 0 || selected.has(card.dataset.category);
      const searchMatch = term === '' || (card.dataset.search || '').includes(term);
      const show = categoryMatch && searchMatch;
      card.hidden = !show;
      if (show) visible += 1;
    });
    const empty = document.querySelector('[data-report-empty]');
    if (empty) empty.hidden = visible > 0;
    document.querySelectorAll('[data-report-count]').forEach((node) => {
      const label = visible === 1 ? 'report' : 'reports';
      node.textContent = `${visible} of ${total} ${label} shown`;
    });
    const selectedLabels = checks()
      .filter((input) => input.checked)
      .map((input) => input.closest('.checkbox-item')?.querySelector('label')?.textContent?.trim())
      .filter(Boolean);
    const summary = selectedLabels.length || term
      ? `${selectedLabels.length ? selectedLabels.join(', ') : 'All categories'}${term ? ` · "${term}"` : ''}`
      : 'No filters applied.';
    document.querySelectorAll('[data-report-filter-summary]').forEach((node) => {
      node.textContent = summary;
    });
    checks().forEach((input) => {
      input.closest('.checkbox-item')?.classList.toggle('active', input.checked);
    });
    document.querySelectorAll('[data-taxonomy-link]').forEach((link) => {
      const category = link.dataset.taxonomyCategory;
      const active = selected.size === 0 ? category === 'all' : selected.has(category);
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  function applyQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const selected = params.getAll('category').flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
    const term = params.get('search') || '';
    if (selected.length) {
      checks().forEach((input) => {
        input.checked = selected.includes(input.value);
      });
    }
    if (term !== '') {
      searches().forEach((input) => {
        input.value = term;
      });
    }
  }

  document.addEventListener('input', (event) => {
    if (!event.target.matches('[data-report-search],[data-report-filter]')) return;
    syncControl(event.target);
    applyFilters();
  });

  document.addEventListener('click', (event) => {
    if (!event.target.matches('[data-clear-filters]')) return;
    searches().forEach((input) => { input.value = ''; });
    checks().forEach((input) => { input.checked = false; });
    applyFilters();
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-taxonomy-link]');
    if (!link) return;
    event.preventDefault();
    const category = link.dataset.taxonomyCategory;
    checks().forEach((input) => {
      input.checked = category !== 'all' && input.value === category;
    });
    applyFilters();
  });

  applyQueryParams();
  applyFilters();
}());
