(function () {
  "use strict";

  const form = document.querySelector(
    "[data-personalization-form]"
  );

  if (!form) return;

  const hidden = form.querySelector(
    "[data-config-json]"
  );

  let state;

  try {
    state = JSON.parse(hidden.value || "{}");
  } catch (_) {
    state = {};
  }

  state.choiceGroups =
    Array.isArray(state.choiceGroups)
      ? state.choiceGroups
      : [];

  state.customizationFields =
    Array.isArray(state.customizationFields)
      ? state.customizationFields
      : [];

  state.fontOptions =
    Array.isArray(state.fontOptions)
      ? state.fontOptions
      : [];

  state.gallery =
    Array.isArray(state.gallery)
      ? state.gallery
      : [];

  const esc = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");

  function optionRow(option = {}) {
    return `
      <div data-option class="grid grid-cols-1 lg:grid-cols-[1fr,1fr,130px,1fr,auto] gap-3">
        <input data-k="label" value="${esc(option.label)}" placeholder="Dorado" class="rounded-lg border px-3 py-2">
        <input data-k="value" value="${esc(option.value)}" placeholder="dorado" class="rounded-lg border px-3 py-2">
        <input data-k="colorHex" value="${esc(option.colorHex)}" placeholder="#D4AF37" class="rounded-lg border px-3 py-2">
        <input data-k="imageUrl" value="${esc(option.imageUrl)}" placeholder="/uploads/images/..." class="rounded-lg border px-3 py-2">
        <button type="button" data-remove-option class="rounded-lg bg-red-600 text-white px-3 py-2">Quitar</button>
      </div>`;
  }

  function groupCard(group = {}) {
    const options = Array.isArray(group.options)
      ? group.options
      : [];

    return `
      <div data-group class="rounded-2xl bg-stone-50 border p-5">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input data-k="key" value="${esc(group.key)}" placeholder="color" class="rounded-xl border px-4 py-3">
          <input data-k="label" value="${esc(group.label)}" placeholder="Color" class="rounded-xl border px-4 py-3">
          <select data-k="displayType" class="rounded-xl border px-4 py-3">
            <option value="button" ${group.displayType === "button" ? "selected" : ""}>Botones</option>
            <option value="swatch" ${group.displayType === "swatch" ? "selected" : ""}>Colores</option>
            <option value="select" ${group.displayType === "select" ? "selected" : ""}>Lista</option>
          </select>
          <label class="flex items-center gap-2">
            <input type="checkbox" data-k="required" ${group.required !== false ? "checked" : ""}>
            Obligatorio
          </label>
        </div>
        <div class="mt-4 flex justify-between">
          <strong>Opciones</strong>
          <button type="button" data-add-option class="rounded-lg bg-stone-900 text-white px-3 py-2">Agregar opción</button>
        </div>
        <div data-options class="space-y-3 mt-3">
          ${options.map(optionRow).join("")}
        </div>
        <button type="button" data-remove-group class="mt-4 rounded-lg bg-red-50 text-red-700 border border-red-200 px-3 py-2">Quitar grupo</button>
      </div>`;
  }

  function fieldRow(field = {}) {
    return `
      <div data-field class="grid grid-cols-1 lg:grid-cols-[1fr,1fr,2fr,110px,120px,auto] gap-3">
        <input data-k="key" value="${esc(field.key)}" placeholder="texto" class="rounded-lg border px-3 py-2">
        <input data-k="label" value="${esc(field.label)}" placeholder="Texto a grabar" class="rounded-lg border px-3 py-2">
        <input data-k="placeholder" value="${esc(field.placeholder)}" placeholder="Ej: Ana, Te amo..." class="rounded-lg border px-3 py-2">
        <input type="number" data-k="maxLength" value="${Number(field.maxLength || 35)}" class="rounded-lg border px-3 py-2">
        <label class="flex items-center gap-2"><input type="checkbox" data-k="required" ${field.required ? "checked" : ""}>Obligatorio</label>
        <button type="button" data-remove-field class="rounded-lg bg-red-600 text-white px-3 py-2">Quitar</button>
      </div>`;
  }

  function fontRow(font = {}) {
    return `
      <div data-font class="grid grid-cols-1 lg:grid-cols-[1fr,1fr,1.5fr,1.5fr,auto] gap-3">
        <input data-k="name" value="${esc(font.name)}" placeholder="Script Elegante" class="rounded-lg border px-3 py-2">
        <input data-k="previewText" value="${esc(font.previewText || "Ana")}" class="rounded-lg border px-3 py-2">
        <input data-k="cssFontFamily" value="${esc(font.cssFontFamily)}" placeholder="'Great Vibes', cursive" class="rounded-lg border px-3 py-2">
        <input data-k="previewImageUrl" value="${esc(font.previewImageUrl)}" placeholder="/uploads/images/..." class="rounded-lg border px-3 py-2">
        <button type="button" data-remove-font class="rounded-lg bg-red-600 text-white px-3 py-2">Quitar</button>
      </div>`;
  }

  function galleryRow(item = {}, index = 0) {
    return `
      <div data-gallery-item class="grid grid-cols-1 lg:grid-cols-[2fr,130px,1fr,1fr] gap-3">
        <input data-k="url" value="${esc(item.url)}" class="rounded-lg border px-3 py-2" readonly>
        <select data-k="type" class="rounded-lg border px-3 py-2">
          <option value="image" ${item.type !== "video" ? "selected" : ""}>Imagen</option>
          <option value="video" ${item.type === "video" ? "selected" : ""}>Video</option>
        </select>
        <input data-k="label" value="${esc(item.label || ("Vista " + (index + 1)))}" placeholder="Vista 1" class="rounded-lg border px-3 py-2">
        <input data-k="altText" value="${esc(item.altText)}" placeholder="Texto alternativo" class="rounded-lg border px-3 py-2">
      </div>`;
  }

  function render() {
    form.querySelector("[data-groups]").innerHTML =
      state.choiceGroups.map(groupCard).join("");

    form.querySelector("[data-fields]").innerHTML =
      state.customizationFields.map(fieldRow).join("");

    form.querySelector("[data-fonts]").innerHTML =
      state.fontOptions.map(fontRow).join("");

    form.querySelector("[data-gallery]").innerHTML =
      state.gallery.map(galleryRow).join("");
  }

  function readObject(root) {
    const output = {};

    root.querySelectorAll(":scope > [data-k]")
      .forEach((field) => {
        output[field.dataset.k] =
          field.type === "checkbox"
            ? field.checked
            : field.value.trim();
      });

    return output;
  }

  function sync() {
    state.choiceGroups = Array.from(
      form.querySelectorAll("[data-group]")
    ).map((group) => ({
      ...readObject(group),
      options: Array.from(
        group.querySelectorAll("[data-option]")
      ).map(readObject)
    }));

    state.customizationFields = Array.from(
      form.querySelectorAll("[data-field]")
    ).map((field) => ({
      ...readObject(field),
      maxLength: Number(
        field.querySelector('[data-k="maxLength"]').value || 35
      )
    }));

    state.fontOptions = Array.from(
      form.querySelectorAll("[data-font]")
    ).map(readObject);

    state.gallery = Array.from(
      form.querySelectorAll("[data-gallery-item]")
    ).map(readObject);

    form.querySelectorAll("[data-global]")
      .forEach((field) => {
        state[field.dataset.global] =
          field.type === "checkbox"
            ? field.checked
            : field.type === "number"
              ? Number(field.value || 20)
              : field.value.trim();
      });

    hidden.value = JSON.stringify(state);
  }

  form.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.matches("[data-add-group]")) {
      state.choiceGroups.push({
        key: "",
        label: "",
        displayType: "button",
        required: true,
        options: [{}]
      });
      render();
    }

    if (button.matches("[data-add-field]")) {
      state.customizationFields.push({
        key: "",
        label: "",
        placeholder: "",
        required: false,
        maxLength: 35
      });
      render();
    }

    if (button.matches("[data-add-font]")) {
      state.fontOptions.push({
        name: "",
        previewText: "Ana",
        cssFontFamily: "",
        previewImageUrl: ""
      });
      render();
    }

    if (button.matches("[data-add-option]")) {
      button.closest("[data-group]")
        .querySelector("[data-options]")
        .insertAdjacentHTML(
          "beforeend",
          optionRow({})
        );
    }

    const pairs = [
      ["[data-remove-option]", "[data-option]"],
      ["[data-remove-group]", "[data-group]"],
      ["[data-remove-field]", "[data-field]"],
      ["[data-remove-font]", "[data-font]"]
    ];

    pairs.forEach(([trigger, item]) => {
      if (button.matches(trigger)) {
        button.closest(item).remove();
      }
    });

    sync();
  });

  form.addEventListener("input", sync);
  form.addEventListener("change", sync);
  form.addEventListener("submit", sync);

  render();
  sync();
})();
