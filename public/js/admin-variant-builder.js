(function () {
  const builder = document.querySelector("[data-variant-builder]");
  const container = document.getElementById("variantsContainer");
  if (!builder || !container) return;

  const attrsHost = builder.querySelector("[data-vb-attrs]");
  const addAttrBtn = builder.querySelector("[data-vb-add-attr]");
  const defaultPriceInput = builder.querySelector("[data-vb-default-price]");
  const defaultStockInput = builder.querySelector("[data-vb-default-stock]");
  const generateBtn = builder.querySelector("[data-vb-generate]");
  const applyAllBtn = builder.querySelector("[data-vb-apply-all]");
  const summaryEl = builder.querySelector("[data-vb-summary]");

  const PLACEHOLDERS = [
    { name: "Color", hint: "Ej. Dorado, Plateado, Negro, Oro Rosa" },
    { name: "Tamaño", hint: "Ej. 16 cm, 18 cm, 20 cm, 21 cm" },
    { name: "Metal", hint: "Ej. Acero inoxidable, Plata 925, Oro laminado" },
    { name: "Grosor", hint: "Ej. 4 mm, 6 mm, 8 mm" }
  ];

  const state = {
    attributes: [
      { name: "Color", values: [] },
      { name: "Tamaño", values: [] }
    ]
  };

  function normComboKey(attrs) {
    return attrs.map((a) => `${String(a.name || "").trim().toLowerCase()}=${String(a.value || "").trim().toLowerCase()}`).join("|");
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

  function updateSummary() {
    const count = container.querySelectorAll(".variant-item").length;
    const activeAttrs = state.attributes.filter((a) => a.name.trim() && a.values.length);
    const expected = activeAttrs.length
      ? activeAttrs.reduce((acc, a) => acc * a.values.length, 1)
      : 0;
    if (count > 0) {
      summaryEl.textContent = `${count} variante${count === 1 ? "" : "s"} cargada${count === 1 ? "" : "s"}`;
    } else if (expected > 0) {
      summaryEl.textContent = `Listo para generar ${expected} combinación${expected === 1 ? "" : "es"}`;
    } else {
      summaryEl.textContent = "";
    }
  }

  function renderAttributes() {
    attrsHost.innerHTML = "";
    state.attributes.forEach((attr, attrIndex) => {
      const preset = PLACEHOLDERS[attrIndex] || { name: `Opción ${attrIndex + 1}`, hint: "Escribe valores separados por coma" };
      const card = document.createElement("div");
      card.className = "rounded-xl border border-stone-200 bg-white p-4";

      const topRow = document.createElement("div");
      topRow.className = "flex items-center justify-between gap-2 mb-2";
      const lbl = document.createElement("label");
      lbl.className = "text-xs font-semibold uppercase tracking-wider text-stone-500";
      lbl.textContent = `Atributo ${attrIndex + 1}${attrIndex > 0 ? " (opcional)" : ""}`;
      topRow.appendChild(lbl);

      if (state.attributes.length > 1) {
        const rmAttr = document.createElement("button");
        rmAttr.type = "button";
        rmAttr.className = "vb-link-remove";
        rmAttr.textContent = "Quitar atributo";
        rmAttr.addEventListener("click", () => {
          state.attributes.splice(attrIndex, 1);
          renderAttributes();
        });
        topRow.appendChild(rmAttr);
      }
      card.appendChild(topRow);

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = attr.name;
      nameInput.placeholder = preset.name;
      nameInput.className = "w-full rounded-xl border border-stone-300 px-3 py-2 text-sm mb-3";
      nameInput.addEventListener("input", () => {
        attr.name = nameInput.value;
        updateSummary();
      });
      card.appendChild(nameInput);

      const inputRow = document.createElement("div");
      inputRow.className = "vb-input-row";
      const valInput = document.createElement("input");
      valInput.type = "text";
      valInput.placeholder = `${preset.hint} (Enter)`;
      valInput.className = "w-full rounded-xl border border-stone-300 px-3 py-2 text-sm";
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "vb-btn vb-btn-dark";
      addBtn.textContent = "+ Agregar";

      function commitVal() {
        pushValues(attr.values, valInput.value);
        valInput.value = "";
        renderAttributes();
      }
      addBtn.addEventListener("click", commitVal);
      valInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitVal();
        }
      });

      inputRow.appendChild(valInput);
      inputRow.appendChild(addBtn);
      card.appendChild(inputRow);

      const chipsWrap = document.createElement("div");
      chipsWrap.className = "vb-chips-wrap";
      if (!attr.values.length) {
        const hint = document.createElement("span");
        hint.className = "text-xs text-stone-400";
        hint.textContent = attrIndex === 0 ? "Sin valores aún" : "Déjalo vacío si no aplica";
        chipsWrap.appendChild(hint);
      } else {
        attr.values.forEach((val, vIdx) => {
          const chip = document.createElement("span");
          chip.className = "vb-chip";
          const txt = document.createElement("span");
          txt.textContent = val;
          const xBtn = document.createElement("button");
          xBtn.type = "button";
          xBtn.className = "vb-chip-remove";
          xBtn.textContent = "×";
          xBtn.setAttribute("aria-label", "Quitar " + val);
          xBtn.addEventListener("click", () => {
            attr.values.splice(vIdx, 1);
            renderAttributes();
          });
          chip.appendChild(txt);
          chip.appendChild(xBtn);
          chipsWrap.appendChild(chip);
        });
      }
      card.appendChild(chipsWrap);
      attrsHost.appendChild(card);
    });
    updateSummary();
  }

  addAttrBtn.addEventListener("click", () => {
    const nextIdx = state.attributes.length;
    const preset = PLACEHOLDERS[nextIdx] || { name: `Atributo ${nextIdx + 1}` };
    state.attributes.push({ name: preset.name, values: [] });
    renderAttributes();
  });

  function readExistingVariantsMap() {
    const map = new Map();
    container.querySelectorAll(".variant-item").forEach((row) => {
      const attrsRaw = row.querySelector('input[name="variantAttributesJson"]')?.value || "";
      let attrs = [];
      if (attrsRaw) {
        try {
          const parsed = JSON.parse(attrsRaw);
          if (Array.isArray(parsed)) attrs = parsed;
        } catch {}
      }
      if (!attrs.length) {
        const n1 = row.querySelector('input[name="variantOptionName"]')?.value || "";
        const v1 = row.querySelector('input[name="variantOptionValue"]')?.value || "";
        const n2 = row.querySelector('input[name="variantOptionName2"]')?.value || "";
        const v2 = row.querySelector('input[name="variantOptionValue2"]')?.value || "";
        if (v1) attrs.push({ name: n1 || "Opción 1", value: v1 });
        if (v2) attrs.push({ name: n2 || "Opción 2", value: v2 });
      }
      if (attrs.length) {
        map.set(normComboKey(attrs), {
          label: row.querySelector('input[name="variantLabel"]')?.value || "",
          price: row.querySelector('input[name="variantPrice"]')?.value || "",
          compareAtPrice: row.querySelector('input[name="variantCompareAtPrice"]')?.value || "0",
          stock: row.querySelector('input[name="variantStock"]')?.value || "0",
          imageUrl: row.querySelector('input[name="variantImageUrl"]')?.value || "",
          outOfStock: row.querySelector('select[name="variantOutOfStock"]')?.value || "false"
        });
      }
    });
    return map;
  }

  function cartesianProduct(attrList) {
    return attrList.reduce((acc, attr) => {
      const next = [];
      acc.forEach((combo) => {
        attr.values.forEach((val) => {
          next.push(combo.concat([{ name: attr.name.trim(), value: val }]));
        });
      });
      return next;
    }, [[]]);
  }

  function escapeAttr(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderCompactTable(rowsData) {
    const wrap = document.createElement("div");
    wrap.className = "vb-table-wrap";
    const table = document.createElement("table");
    table.className = "vb-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Combinación</th>
          <th>Precio (RD$)</th>
          <th>Oferta / Anterior</th>
          <th>Stock</th>
          <th>Estado</th>
          <th>Foto</th>
          <th></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    rowsData.forEach((data, idx) => {
      const tr = document.createElement("tr");
      tr.className = "variant-item";
      const attrsJson = escapeAttr(JSON.stringify(data.attributes));
      const n1 = escapeAttr(data.attributes[0]?.name || "");
      const v1 = escapeAttr(data.attributes[0]?.value || "");
      const n2 = escapeAttr(data.attributes[1]?.name || "");
      const v2 = escapeAttr(data.attributes[1]?.value || "");
      const labelEsc = escapeAttr(data.label);
      const priceEsc = escapeAttr(data.price);
      const cmpEsc = escapeAttr(data.compareAtPrice || "0");
      const stockEsc = escapeAttr(data.stock);
      const imgEsc = escapeAttr(data.imageUrl || "");
      const isOut = data.outOfStock === "true";

      tr.innerHTML = `
        <td>
          <input type="hidden" name="variantAttributesJson" value="${attrsJson}">
          <input type="hidden" name="variantOptionName" value="${n1}">
          <input type="hidden" name="variantOptionValue" value="${v1}">
          <input type="hidden" name="variantOptionName2" value="${n2}">
          <input type="hidden" name="variantOptionValue2" value="${v2}">
          <input type="text" name="variantLabel" value="${labelEsc}" class="vb-cell-input vb-cell-label">
        </td>
        <td><input type="text" inputmode="decimal" name="variantPrice" value="${priceEsc}" class="vb-cell-input vb-cell-num"></td>
        <td><input type="text" inputmode="decimal" name="variantCompareAtPrice" value="${cmpEsc}" class="vb-cell-input vb-cell-num"></td>
        <td><input type="number" min="0" name="variantStock" value="${stockEsc}" class="vb-cell-input vb-cell-stock"></td>
        <td>
          <select name="variantOutOfStock" class="vb-cell-input">
            <option value="false"${!isOut ? " selected" : ""}>Disponible</option>
            <option value="true"${isOut ? " selected" : ""}>Agotada</option>
          </select>
        </td>
        <td>
          <input type="hidden" name="variantImageUrl" value="${imgEsc}">
          <input type="file" name="variantImageFile${idx}" accept="image/*" data-upload-prefix="variantImageFile" class="vb-cell-file">
          ${imgEsc ? `<div class="vb-cell-img-note" title="${imgEsc}">Con foto</div>` : ""}
        </td>
        <td><button type="button" class="remove-block vb-row-remove" title="Quitar combinación">Quitar</button></td>
      `;
      tbody.appendChild(tr);
    });

    wrap.appendChild(table);
    container.innerHTML = "";
    container.appendChild(wrap);
  }

  generateBtn.addEventListener("click", () => {
    // Recoger cualquier texto pendiente en los inputs de valores antes de generar
    attrsHost.querySelectorAll(".vb-input-row input").forEach((inp, idx) => {
      if (inp.value.trim() && state.attributes[idx]) {
        pushValues(state.attributes[idx].values, inp.value);
        inp.value = "";
      }
    });
    renderAttributes();

    const activeAttrs = state.attributes.filter((a) => a.name.trim() && a.values.length);
    if (!activeAttrs.length) {
      const firstValInput = attrsHost.querySelector(".vb-input-row input");
      if (firstValInput) firstValInput.focus();
      return;
    }

    const basePriceInput = document.querySelector('input[name="basePrice"]');
    const fallbackPrice = (defaultPriceInput.value || "").trim() || (basePriceInput ? basePriceInput.value.trim() : "") || "0";
    const fallbackStock = (defaultStockInput.value || "").trim() || "0";

    const existing = readExistingVariantsMap();
    const combos = cartesianProduct(activeAttrs);
    const rowsData = combos.map((attrs) => {
      const prev = existing.get(normComboKey(attrs));
      return {
        label: prev?.label || attrs.map((a) => a.value).join(" · "),
        attributes: attrs,
        price: prev ? prev.price : fallbackPrice,
        compareAtPrice: prev ? prev.compareAtPrice : "0",
        stock: prev ? prev.stock : fallbackStock,
        imageUrl: prev ? prev.imageUrl : "",
        outOfStock: prev ? prev.outOfStock : "false"
      };
    });

    renderCompactTable(rowsData);

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
    container.querySelectorAll(".variant-item").forEach((row) => {
      if (newPrice !== "") {
        const p = row.querySelector('input[name="variantPrice"]');
        if (p) p.value = newPrice;
      }
      if (newStock !== "") {
        const s = row.querySelector('input[name="variantStock"]');
        if (s) s.value = newStock;
      }
    });
  });

  // Precargar atributos existentes en Editar producto
  const existingCards = container.querySelectorAll(".variant-item");
  if (existingCards.length) {
    const attrMap = new Map();
    existingCards.forEach((card) => {
      const attrsRaw = card.querySelector('input[name="variantAttributesJson"]')?.value || "";
      let parsed = [];
      if (attrsRaw) {
        try {
          const p = JSON.parse(attrsRaw);
          if (Array.isArray(p)) parsed = p;
        } catch {}
      }
      if (!parsed.length) {
        const n1 = (card.querySelector('input[name="variantOptionName"]')?.value || "").trim();
        const v1 = (card.querySelector('input[name="variantOptionValue"]')?.value || "").trim();
        const n2 = (card.querySelector('input[name="variantOptionName2"]')?.value || "").trim();
        const v2 = (card.querySelector('input[name="variantOptionValue2"]')?.value || "").trim();
        if (v1) parsed.push({ name: n1 || "Color", value: v1 });
        if (v2) parsed.push({ name: n2 || "Tamaño", value: v2 });
      }
      parsed.forEach((entry) => {
        const key = entry.name.toLowerCase();
        if (!attrMap.has(key)) attrMap.set(key, { name: entry.name, values: [] });
        pushValues(attrMap.get(key).values, entry.value);
      });
    });
    if (attrMap.size) {
      state.attributes = Array.from(attrMap.values());
    }
  }

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-block")) {
      setTimeout(updateSummary, 0);
    }
  });

  renderAttributes();
})();
