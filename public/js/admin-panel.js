(() => {
  const shell = document.querySelector("[data-admin-shell]");
  if (!shell) return;

  const toggle = shell.querySelector("[data-sidebar-toggle]");
  const overlay = shell.querySelector("[data-sidebar-overlay]");
  const search = shell.querySelector("[data-admin-search]");
  const results = shell.querySelector("[data-admin-search-results]");
  const storageKey = "gatondo-admin-sidebar-collapsed";
  const mobileQuery = window.matchMedia("(max-width: 767px)");

  const setExpanded = (expanded) => {
    shell.classList.toggle("is-mobile-open", expanded && mobileQuery.matches);
    if (!mobileQuery.matches) shell.classList.toggle("is-collapsed", !expanded);
    toggle?.setAttribute("aria-expanded", String(expanded));
    toggle?.setAttribute("aria-label", expanded ? "Contraer menú" : "Expandir menú");
    overlay?.setAttribute("tabindex", expanded && mobileQuery.matches ? "0" : "-1");
  };

  if (!mobileQuery.matches) {
    setExpanded(window.localStorage.getItem(storageKey) !== "true");
  } else {
    toggle?.setAttribute("aria-label", "Abrir menú");
    toggle?.setAttribute("aria-expanded", "false");
  }

  toggle?.addEventListener("click", () => {
    const expanded = mobileQuery.matches
      ? !shell.classList.contains("is-mobile-open")
      : shell.classList.contains("is-collapsed");
    setExpanded(expanded);
    if (!mobileQuery.matches) window.localStorage.setItem(storageKey, String(!expanded));
  });

  overlay?.addEventListener("click", () => setExpanded(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && shell.classList.contains("is-mobile-open")) {
      setExpanded(false);
      toggle?.focus();
    }
  });
  mobileQuery.addEventListener?.("change", (event) => {
    shell.classList.remove("is-mobile-open");
    if (event.matches) {
      shell.classList.remove("is-collapsed");
      toggle?.setAttribute("aria-expanded", "false");
      toggle?.setAttribute("aria-label", "Abrir menú");
    } else {
      setExpanded(window.localStorage.getItem(storageKey) !== "true");
    }
  });

  const navLinks = [...shell.querySelectorAll("[data-admin-link]")];
  const hideResults = () => { if (results) results.hidden = true; };
  search?.addEventListener("input", () => {
    const query = search.value.trim().toLocaleLowerCase("es");
    if (!results) return;
    results.replaceChildren();
    if (!query) { hideResults(); return; }
    const matches = navLinks.filter((link) => `${link.dataset.label} ${link.textContent}`.toLocaleLowerCase("es").includes(query));
    for (const link of matches) {
      const result = document.createElement("a");
      result.href = link.href;
      result.setAttribute("role", "option");
      result.textContent = link.querySelector(".admin-nav-label")?.textContent.trim() || link.textContent.trim();
      result.addEventListener("click", () => setExpanded(false));
      results.append(result);
    }
    if (!matches.length) {
      const empty = document.createElement("span");
      empty.className = "admin-search-empty";
      empty.textContent = "No hay secciones disponibles con ese nombre.";
      results.append(empty);
    }
    results.hidden = false;
  });
  search?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { hideResults(); search.blur(); }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-admin-search-wrap]")) hideResults();
  });
})();
