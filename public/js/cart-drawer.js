(function () {
  "use strict";

  const drawer = document.querySelector(
    "[data-ref10-cart-drawer]"
  );

  const panel = document.querySelector(
    "[data-ref10-cart-panel]"
  );

  if (!drawer || !panel) return;

  const loading = document.querySelector(
    "[data-ref10-cart-loading]"
  );

  const errorBox = document.querySelector(
    "[data-ref10-cart-error]"
  );

  const emptyBox = document.querySelector(
    "[data-ref10-cart-empty]"
  );

  const itemsBox = document.querySelector(
    "[data-ref10-cart-items]"
  );

  const footer = document.querySelector(
    "[data-ref10-cart-footer]"
  );

  const totalEl = document.querySelector(
    "[data-ref10-cart-total]"
  );

  const whatsappLink = document.querySelector(
    "[data-ref10-cart-whatsapp]"
  );

  const stockWarning = document.querySelector(
    "[data-ref10-cart-stock-warning]"
  );

  const toast = document.querySelector(
    "[data-ref10-cart-toast]"
  );

  let lastFocusedElement = null;
  let toastTimer = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatCurrency(value) {
    return "RD$ " + Number(value || 0).toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  function safeImage(value) {
    const url = String(value || "").trim();

    if (
      url.startsWith("/") ||
      url.startsWith("https://") ||
      url.startsWith("http://")
    ) {
      return escapeHtml(url);
    }

    return "/images/logo-gatondo-color.png";
  }

  function updateBadges(count) {
    const safeCount = Math.max(0, Number(count || 0));

    document
      .querySelectorAll(".ref10-cart-link")
      .forEach(function (link) {
        let badge = link.querySelector(
          ".ref10-cart-count"
        );

        if (safeCount <= 0) {
          if (badge) badge.remove();
          return;
        }

        if (!badge) {
          badge = document.createElement("span");
          badge.className = "ref10-cart-count";
          link.appendChild(badge);
        }

        badge.textContent = String(safeCount);
      });
  }

  function showToast(message) {
    if (!toast) return;

    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;

    requestAnimationFrame(function () {
      toast.classList.add("is-visible");
    });

    toastTimer = setTimeout(function () {
      toast.classList.remove("is-visible");

      setTimeout(function () {
        toast.hidden = true;
      }, 220);
    }, 2400);
  }

  async function api(path, data) {
    const options = {
      method: data ? "POST" : "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json"
      }
    };

    if (data) {
      options.headers["Content-Type"] =
        "application/x-www-form-urlencoded;charset=UTF-8";

      options.body = new URLSearchParams(
        data
      ).toString();
    }

    const response = await fetch(path, options);

    const payload = await response.json().catch(
      function () {
        return {
          ok: false,
          message: "Respuesta inválida del servidor."
        };
      }
    );

    if (!response.ok) {
      const error = new Error(
        payload.message ||
        "No pudimos actualizar el carrito."
      );

      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function itemMeta(item) {
    const parts = [];

    if (item.variantLabel || item.variantOptionValue) {
      parts.push(
        item.variantLabel || item.variantOptionValue
      );
    }

    if (item.fontName) {
      parts.push("Fuente: " + item.fontName);
    }

    if (item.customizationSummary) {
      parts.push(item.customizationSummary);
    }

    return parts.join(" · ");
  }

  function renderItem(item) {
    const quantity = Math.max(
      1,
      Number(item.quantity || 1)
    );

    const availableStock = Math.max(
      0,
      Number(item.availableStock || 0)
    );

    const unavailable = Boolean(
      item.stockUnavailable
    );

    const cannotIncrease =
      unavailable ||
      (
        availableStock > 0 &&
        quantity >= availableStock
      );

    const meta = itemMeta(item);

    const oldPrice =
      Number(item.compareAtPrice || 0) >
      Number(item.unitPrice || 0)
        ? "<del>" +
          formatCurrency(item.compareAtPrice) +
          "</del>"
        : "";

    return [
      '<article class="ref10-cart-item',
      unavailable ? " has-stock-error" : "",
      '">',
      '<a class="ref10-cart-item-image" href="/product/',
      encodeURIComponent(item.productSlug || ""),
      '">',
      '<img src="',
      safeImage(item.imageUrl),
      '" alt="',
      escapeHtml(item.productName),
      '">',
      "</a>",
      '<div class="ref10-cart-item-main">',
      '<div class="ref10-cart-item-heading">',
      "<div>",
      '<a href="/product/',
      encodeURIComponent(item.productSlug || ""),
      '">',
      escapeHtml(item.productName),
      "</a>",
      meta
        ? "<p>" + escapeHtml(meta) + "</p>"
        : "",
      "</div>",
      "<strong>",
      formatCurrency(item.lineTotal),
      "</strong>",
      "</div>",
      '<div class="ref10-cart-unit-price">',
      "<span>",
      formatCurrency(item.unitPrice),
      "</span>",
      oldPrice,
      "</div>",
      item.stockMessage
        ? '<p class="ref10-cart-stock-message">' +
          escapeHtml(item.stockMessage) +
          "</p>"
        : "",
      '<div class="ref10-cart-item-actions">',
      '<div class="ref10-cart-quantity">',
      '<button type="button" ',
      'data-ref10-cart-action="decrease" ',
      'data-cart-key="',
      escapeHtml(item.cartKey),
      '" data-quantity="',
      String(quantity),
      '" aria-label="Reducir cantidad"',
      unavailable ? " disabled" : "",
      ">−</button>",
      "<span>",
      String(quantity),
      "</span>",
      '<button type="button" ',
      'data-ref10-cart-action="increase" ',
      'data-cart-key="',
      escapeHtml(item.cartKey),
      '" data-quantity="',
      String(quantity),
      '" aria-label="Aumentar cantidad"',
      cannotIncrease ? " disabled" : "",
      ">+</button>",
      "</div>",
      '<button type="button" ',
      'class="ref10-cart-remove" ',
      'data-ref10-cart-action="remove" ',
      'data-cart-key="',
      escapeHtml(item.cartKey),
      '">Quitar</button>',
      "</div>",
      "</div>",
      "</article>"
    ].join("");
  }

  function render(payload) {
    const items = Array.isArray(payload.items)
      ? payload.items
      : [];

    if (loading) loading.hidden = true;
    if (errorBox) errorBox.hidden = true;

    updateBadges(payload.itemCount || 0);

    if (!items.length) {
      if (itemsBox) itemsBox.innerHTML = "";
      if (emptyBox) emptyBox.hidden = false;
      if (footer) footer.hidden = true;
      return;
    }

    if (emptyBox) emptyBox.hidden = true;

    if (itemsBox) {
      itemsBox.innerHTML = items
        .map(renderItem)
        .join("");
    }

    if (totalEl) {
      totalEl.textContent = formatCurrency(
        payload.subtotal
      );
    }

    if (stockWarning) {
      stockWarning.hidden = !payload.hasStockIssues;
    }

    if (whatsappLink) {
      const enabled =
        typeof payload.whatsappUrl === "string" &&
        payload.whatsappUrl.startsWith(
          "https://wa.me/"
        ) &&
        !payload.hasStockIssues;

      whatsappLink.href = enabled
        ? payload.whatsappUrl
        : "#";

      whatsappLink.classList.toggle(
        "is-disabled",
        !enabled
      );

      whatsappLink.setAttribute(
        "aria-disabled",
        enabled ? "false" : "true"
      );
    }

    if (footer) footer.hidden = false;
  }

  function renderError(message) {
    if (loading) loading.hidden = true;
    if (emptyBox) emptyBox.hidden = true;
    if (footer) footer.hidden = true;
    if (itemsBox) itemsBox.innerHTML = "";

    if (errorBox) {
      errorBox.textContent =
        message || "No pudimos cargar el carrito.";
      errorBox.hidden = false;
    }
  }

  async function refresh() {
    if (loading) loading.hidden = false;
    if (errorBox) errorBox.hidden = true;

    try {
      const payload = await api("/api/cart");
      render(payload);
      return payload;
    } catch (error) {
      renderError(error.message);
      throw error;
    }
  }

  async function openDrawer() {
    lastFocusedElement = document.activeElement;

    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add(
      "ref10-cart-open"
    );
    document.body.classList.add("ref10-cart-open");

    requestAnimationFrame(function () {
      panel.focus({ preventScroll: true });
    });

    await refresh().catch(function () {});
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove(
      "ref10-cart-open"
    );
    document.body.classList.remove(
      "ref10-cart-open"
    );

    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus === "function"
    ) {
      lastFocusedElement.focus({
        preventScroll: true
      });
    }
  }

  async function changeQuantity(
    cartKey,
    quantity,
    button
  ) {
    if (button) button.disabled = true;

    try {
      const payload = await api(
        "/api/cart/update",
        {
          cartKey: cartKey,
          quantity: String(Math.max(1, quantity))
        }
      );

      render(payload);
    } catch (error) {
      showToast(error.message);
      await refresh().catch(function () {});
    }
  }

  async function removeItem(cartKey, button) {
    if (button) button.disabled = true;

    try {
      const payload = await api(
        "/api/cart/remove",
        {
          cartKey: cartKey
        }
      );

      render(payload);
      showToast("Producto eliminado.");
    } catch (error) {
      showToast(error.message);
      await refresh().catch(function () {});
    }
  }

  async function quickAdd(trigger) {
    const slug = String(
      trigger.dataset.productSlug || ""
    ).trim();

    if (!slug) return;

    trigger.classList.add("is-loading");
    trigger.setAttribute("aria-busy", "true");

    try {
      const payload = await api(
        "/api/cart/quick-add",
        {
          slug: slug
        }
      );

      render(payload);
      await openDrawer();
      showToast("Producto agregado al carrito.");
    } catch (error) {
      const payload = error.payload || {};

      if (
        payload.requiresConfiguration &&
        payload.productUrl
      ) {
        window.location.href = payload.productUrl;
        return;
      }

      showToast(error.message);
    } finally {
      trigger.classList.remove("is-loading");
      trigger.removeAttribute("aria-busy");
    }
  }

  function installShopButtons() {
    document
      .querySelectorAll(
        "a.product-card[href^='/product/']"
      )
      .forEach(function (card) {
        if (
          card.querySelector(
            "[data-ref10-quick-add]"
          )
        ) {
          return;
        }

        const href = card.getAttribute("href") || "";
        const slug = href
          .replace(/^\/product\//, "")
          .split(/[?#]/)[0];

        if (!slug) return;

        const button = document.createElement("span");
        button.className =
          "ref10-generated-quick-add";
        button.dataset.ref10QuickAdd = "";
        button.dataset.productSlug =
          decodeURIComponent(slug);
        button.setAttribute("role", "button");
        button.setAttribute("tabindex", "0");
        button.setAttribute(
          "aria-label",
          "Agregar producto al carrito"
        );
        button.textContent = "+";

        card.appendChild(button);
      });
  }

  document.addEventListener(
    "click",
    function (event) {
      const closeButton = event.target.closest(
        "[data-ref10-cart-close]"
      );

      if (closeButton) {
        event.preventDefault();
        closeDrawer();
        return;
      }

      const cartLink = event.target.closest(
        ".ref10-cart-link"
      );

      if (
        cartLink &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault();
        openDrawer();
        return;
      }

      const quickButton = event.target.closest(
        "[data-ref10-quick-add]"
      );

      if (quickButton) {
        event.preventDefault();
        event.stopPropagation();
        quickAdd(quickButton);
        return;
      }

      const actionButton = event.target.closest(
        "[data-ref10-cart-action]"
      );

      if (!actionButton) return;

      event.preventDefault();

      const action =
        actionButton.dataset.ref10CartAction;

      const cartKey =
        actionButton.dataset.cartKey || "";

      const quantity = Number(
        actionButton.dataset.quantity || 1
      );

      if (action === "increase") {
        changeQuantity(
          cartKey,
          quantity + 1,
          actionButton
        );
      }

      if (action === "decrease") {
        changeQuantity(
          cartKey,
          Math.max(1, quantity - 1),
          actionButton
        );
      }

      if (action === "remove") {
        removeItem(cartKey, actionButton);
      }
    }
  );

  document.addEventListener(
    "keydown",
    function (event) {
      if (
        event.key === "Escape" &&
        drawer.classList.contains("is-open")
      ) {
        closeDrawer();
        return;
      }

      const quickButton = event.target.closest(
        "[data-ref10-quick-add]"
      );

      if (
        quickButton &&
        (
          event.key === "Enter" ||
          event.key === " "
        )
      ) {
        event.preventDefault();
        quickAdd(quickButton);
      }
    }
  );

  window.addEventListener(
    "ref10:cart:open",
    function (event) {
      openDrawer();

      const message =
        event.detail &&
        event.detail.message
          ? event.detail.message
          : "Producto agregado al carrito.";

      showToast(message);
    }
  );

  installShopButtons();

  if (
    new URLSearchParams(
      window.location.search
    ).get("cart") === "added"
  ) {
    openDrawer();
  }
})();

// GATON DO FASE 3C-2 — CARRITO PERSONALIZADO
