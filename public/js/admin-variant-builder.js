(function () {
  const builder = document.querySelector("[data-variant-builder]");
  const container = document.getElementById("variantsContainer");
  const template = document.getElementById("variantTemplate");
  if (!builder || !container || !template) return;

  const name1Input = builder.querySelector("[data-vb-name1]");
  const name2Input = builder.querySelector("[data-vb-name2]");
  const input1 = builder.querySelector("[data-vb-input1]");
  const input2 = builder.querySelector("[data-vb-input2]");
  const add1Btn = builder.querySelector("[data-vb-add1]");
  const add2Btn = builder.querySelector("[data-vb-add2]");
  const chips1El = builder.querySelector("[data-vb-chips1]");
  const chips2El = builder.querySelector("[data-vb-chips2]");
  const defaultPriceInput = builder.querySelector("[data-vb-default-price]");
  const defaultStockInput = builder.querySelector("[data-vb-default-stock]");
  const generateBtn = builder.querySelector("[data-vb-generate]");
  const applyAllBtn = builder.querySelector("[data-vb-apply-all]");
  const summaryEl = builder.querySelector("[data-vb-summary]");

  const state = {
    values1: [],
    values2: []
  };

  function normKey(v1, v2) {
    return (String(v1 || "").trim().toLowerCase() + "::" + String(v2 || "").trim().toLowerCase());
  }

  function pushValues(list, raw) {
    String(raw || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((val) => {
        if (!list.some((existing) => existing.toLowerCase() === val.toLowerCase())) {
          list.push(val);
        }
      });
  }

  function renderChips(list, hostEl, which) {
    hostEl.innerHTML = "";
    if (!list.length) {
      const hint = document.createElement("span");
      hint.className = "text-xs text-stone-400";
      hint.textContent = which === 1 ? "Sin valores aún" : "Opcional (déjalo vacío si solo usas 1 opción)";
      hostEl.appendChild(hint);
      return;
    }

    list.forEach((val, idx) => {
      const chip = document.createElement("span");
      chip.className = "inline-flex items-center gap-1.5 rounded-full bg-stone-900 text-white px-3 py-1 text-xs font-medium";
      const label = document.createElement("span");
      label.textContent = val;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "×";
      btn.className = "text-stone-300 hover:text-white font-bold leading-none";
      btn.setAttribute("aria-label", "Quitar " + val);
      btn.addEventListener("click", () => {
        list.splice(idx, 1);
        renderAllChips();
      });
      chip.appendChild(label);
      chip.appendChild(btn);
      hostEl.appendChild(chip);
    });
  }

  function updateSummary() {
    const count = container.querySelectorAll(".variant-item").length;
    const expected = state.values1.length
      ? state.values1.length * Math.max(1, state.values2.length)
      : 0;
    if (count > 0) {
      summaryEl.textContent = `${count} variante${count === 1 ? "" : "s"} cargada${count === 1 ? "" : "s"}`;
    } else if (expected > 0) {
      summaryEl.textContent = `Listo para generar ${expected} combinación${expected === 1 ? "" : "es"}`;
    } else {
      summaryEl.textContent = "";
    }
  }

  function renderAllChips() {
    renderChips(state.values1, chips1El, 1);
    renderChips(state.values2, chips2El, 2);
    updateSummary();
  }

  function bindInput(inputEl, addBtn, list) {
    function commit() {
      pushValues(list, inputEl.value);
      inputEl.value = "";
      renderAllChips();
    }
    addBtn.addEventListener("click", commit);
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
    });
  }

  bindInput(input1, add1Btn, state.values1);
  bindInput(input2, add2Btn, state.values2);

  function readExistingVariantsMap() {
    const map = new Map();
    container.querySelectorAll(".variant-item").forEach((card) => {
      const v1 = card.querySelector('input[name="variantOptionValue"]')?.value || "";
      const v2 = card.querySelector('input[name="variantOptionValue2"]')?.value || "";
      const key = normKey(v1, v2);
      if (v1) {
        map.set(key, {
          label: card.querySelector('input[name="variantLabel"]')?.value || "",
          price: card.querySelector('input[name="variantPrice"]')?.value || "",
          compareAtPrice: card.querySelector('input[name="variantCompareAtPrice"]')?.value || "0",
          stock: card.querySelector('input[name="variantStock"]')?.value || "0",
          imageUrl: card.querySelector('input[name="variantImageUrl"]')?.value || "",
          outOfStock: card.querySelector('select[name="variantOutOfStock"]')?.value || "false"
        });
      }
    });
    return map;
  }

  function createVariantCard(data) {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector(".variant-item");
    const setVal = (selector, val) => {
      const el = card.querySelector(selector);
      if (el) el.value = val;
    };
    setVal('input[name="variantLabel"]', data.label);
    setVal('input[name="variantOptionName"]', data.optionName);
    setVal('input[name="variantOptionValue"]', data.optionValue);
    setVal('input[name="variantOptionName2"]', data.optionName2 || "");
    setVal('input[name="variantOptionValue2"]', data.optionValue2 || "");
    setVal('input[name="variantPrice"]', data.price);
    setVal('input[name="variantCompareAtPrice"]', data.compareAtPrice || "0");
    setVal('input[name="variantStock"]', data.stock);
    setVal('input[name="variantImageUrl"]', data.imageUrl || "");
    setVal('select[name="variantOutOfStock"]', data.outOfStock || "false");
    return clone;
  }

  generateBtn.addEventListener("click", () => {
    if (input1.value.trim()) {
      pushValues(state.values1, input1.value);
      input1.value = "";
    }
    if (input2.value.trim()) {
      pushValues(state.values2, input2.value);
      input2.value = "";
    }
    renderAllChips();

    if (!state.values1.length) {
      input1.focus();
      return;
    }

    const basePriceInput = document.querySelector('input[name="basePrice"]');
    const fallbackPrice = (defaultPriceInput.value || "").trim() || (basePriceInput ? basePriceInput.value.trim() : "") || "0";
    const fallbackStock = (defaultStockInput.value || "").trim() || "0";
    const optName1 = (name1Input.value || "").trim() || "Opción";
    const optName2 = (name2Input.value || "").trim() || "Tamaño";

    const existing = readExistingVariantsMap();
    const pairs = [];
    if (state.values2.length) {
      state.values1.forEach((v1) => {
        state.values2.forEach((v2) => {
          pairs.push({ v1, v2 });
        });
      });
    } else {
      state.values1.forEach((v1) => pairs.push({ v1, v2: "" }));
    }

    container.innerHTML = "";
    pairs.forEach(({ v1, v2 }) => {
      const prev = existing.get(normKey(v1, v2));
      const label = prev?.label || (v2 ? `${v1} · ${v2}` : v1);
      container.appendChild(createVariantCard({
        label,
        optionName: optName1,
        optionValue: v1,
        optionName2: v2 ? optName2 : "",
        optionValue2: v2,
        price: prev ? prev.price : fallbackPrice,
        compareAtPrice: prev ? prev.compareAtPrice : "0",
        stock: prev ? prev.stock : fallbackStock,
        imageUrl: prev ? prev.imageUrl : "",
        outOfStock: prev ? prev.outOfStock : "false"
      }));
    });

    const hasVariantsCheckbox = document.querySelector('input[name="hasVariants"]');
    if (hasVariantsCheckbox) hasVariantsCheckbox.checked = true;

    if (typeof window.refreshUploadIndexes === "function") {
      window.refreshUploadIndexes();
    }
    updateSummary();
  });

  applyAllBtn.addEventListener("click", () => {
    const newPrice = (defaultPriceInput.value || "").trim();
    const newStock = (defaultStockInput.value || "").trim();
    container.querySelectorAll(".variant-item").forEach((card) => {
      if (newPrice !== "") {
        const p = card.querySelector('input[name="variantPrice"]');
        if (p) p.value = newPrice;
      }
      if (newStock !== "") {
        const s = card.querySelector('input[name="variantStock"]');
        if (s) s.value = newStock;
      }
    });
  });

  // Precargar chips automáticamente desde las variantes existentes al abrir Editar producto
  const existingCards = container.querySelectorAll(".variant-item");
  if (existingCards.length) {
    let firstN1 = "";
    let firstN2 = "";
    existingCards.forEach((card) => {
      const n1 = (card.querySelector('input[name="variantOptionName"]')?.value || "").trim();
      const v1 = (card.querySelector('input[name="variantOptionValue"]')?.value || "").trim();
      const n2 = (card.querySelector('input[name="variantOptionName2"]')?.value || "").trim();
      const v2 = (card.querySelector('input[name="variantOptionValue2"]')?.value || "").trim();
      if (n1 && !firstN1) firstN1 = n1;
      if (n2 && !firstN2) firstN2 = n2;
      if (v1) pushValues(state.values1, v1);
      if (v2) pushValues(state.values2, v2);
    });
    if (firstN1) name1Input.value = firstN1;
    if (firstN2) name2Input.value = firstN2;
  }

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-block")) {
      setTimeout(updateSummary, 0);
    }
  });

  renderAllChips();
})();
