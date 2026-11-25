(function () {
  "use strict";

  const root = document.querySelector(
    "[data-product-personalization]"
  );

  if (!root) return;

  const configNode = root.querySelector(
    "[data-product-config]"
  );

  let config = {};

  try {
    config = JSON.parse(
      configNode.textContent || "{}"
    );
  } catch (_) {
    config = {};
  }

  const form = root.querySelector(
    "[data-product-form]"
  );

  if (!form) return;

  const mainImage = root.querySelector(
    "[data-product-main-image]"
  );

  const mainVideo = root.querySelector(
    "[data-product-main-video]"
  );

  const priceEl = root.querySelector(
    "[data-product-price]"
  );

  const compareEl = root.querySelector(
    "[data-product-compare]"
  );

  const stockEl = root.querySelector(
    "[data-product-stock]"
  );

  const variantInput = form.querySelector(
    "[data-variant-index]"
  );

  const choiceInput = form.querySelector(
    "[data-choice-json]"
  );

  const customizationInput = form.querySelector(
    "[data-customization-json]"
  );

  const fontInput = form.querySelector(
    "[data-font-name]"
  );

  const quantityInput = form.querySelector(
    "[data-quantity-input]"
  );

  const submitButton = form.querySelector(
    "[data-add-cart-button]"
  );

  const errorBox = form.querySelector(
    "[data-product-error]"
  );

  const engravingPreview = form.querySelector(
    "[data-engraving-preview]"
  );

  const whatsappLink = form.querySelector(
    "[data-product-whatsapp]"
  );

  const variants = Array.isArray(
    config.variants
  )
    ? config.variants
    : [];

  let selectedVariantIndex =
    config.defaultVariantIndex;

  let selectedVariant =
    selectedVariantIndex !== null &&
    variants[selectedVariantIndex]
      ? variants[selectedVariantIndex]
      : null;

  function formatCurrency(value) {
    return "RD$ " + Number(value || 0)
      .toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      );
  }

  function variantStock(variant) {
    return Math.max(
      0,
      Number(variant?.stock || 0)
    );
  }

  function variantUnavailable(variant) {
    return (
      Boolean(variant?.outOfStock) ||
      variantStock(variant) <= 0
    );
  }

  function setMedia(button) {
    const url = button.dataset.mediaUrl || "";
    const type =
      button.dataset.mediaType || "image";
    const alt =
      button.dataset.mediaAlt ||
      config.name ||
      "";

    if (type === "video") {
      if (mainImage) {
        mainImage.classList.add("hidden");
      }

      if (mainVideo) {
        mainVideo.classList.remove("hidden");
        mainVideo.innerHTML = "";

        const source =
          document.createElement("source");

        source.src = url;
        mainVideo.appendChild(source);
        mainVideo.load();
      }
    } else {
      if (mainVideo) {
        mainVideo.pause();
        mainVideo.classList.add("hidden");
      }

      if (mainImage) {
        mainImage.src = url;
        mainImage.alt = alt;
        mainImage.classList.remove("hidden");
      }
    }

    root
      .querySelectorAll(
        "[data-product-media-tab]"
      )
      .forEach(function (item) {
        const active =
          item.dataset.mediaUrl === url;

        item.classList.toggle(
          "is-active",
          active
        );

        item.setAttribute(
          "aria-selected",
          active ? "true" : "false"
        );
      });
  }

  function selectedChoices() {
    const output = {};

    root
      .querySelectorAll("[data-choice-group]")
      .forEach(function (group) {
        const key = group.dataset.choiceKey || "";

        const active = group.querySelector(
          "[data-choice-button].is-selected"
        );

        const select = group.querySelector(
          "[data-choice-select]"
        );

        const value = active
          ? active.dataset.choiceValue
          : select
            ? select.value
            : "";

        if (key && value) {
          output[key] = value;
        }
      });

    return output;
  }

  function customizationValues() {
    const output = {};

    form
      .querySelectorAll("[data-custom-field]")
      .forEach(function (field) {
        const key =
          field.dataset.customKey || "";

        const value =
          String(field.value || "").trim();

        if (key && value) {
          output[key] = value;
        }
      });

    return output;
  }

  function selectedFont() {
    const checked = form.querySelector(
      "[data-font-option]:checked"
    );

    return checked
      ? {
          name: checked.value || "",
          family:
            checked.dataset.fontFamily || ""
        }
      : {
          name: "",
          family: ""
        };
  }

  function updatePreview() {
    const firstField = form.querySelector(
      "[data-custom-field]"
    );

    const text =
      String(firstField?.value || "").trim() ||
      "Tu texto";

    const font = selectedFont();

    if (engravingPreview) {
      engravingPreview.textContent = text;
      engravingPreview.style.fontFamily =
        font.family || "inherit";
    }

    if (choiceInput) {
      choiceInput.value = JSON.stringify(
        selectedChoices()
      );
    }

    if (customizationInput) {
      customizationInput.value =
        JSON.stringify(
          customizationValues()
        );
    }

    if (fontInput) {
      fontInput.value = font.name;
    }

    updateWhatsApp();
  }

  function updateWhatsApp() {
    if (!whatsappLink) return;

    const parts = [
      "Hola, me interesa el producto: " +
      String(config.name || "")
    ];

    if (selectedVariant) {
      parts.push(
        "Variante: " +
        String(
          selectedVariant.label ||
          selectedVariant.optionValue ||
          ""
        )
      );
    }

    const choices = selectedChoices();

    Object.keys(choices).forEach(function (key) {
      parts.push(key + ": " + choices[key]);
    });

    const custom = customizationValues();

    Object.keys(custom).forEach(function (key) {
      parts.push(key + ": " + custom[key]);
    });

    const font = selectedFont();

    if (font.name) {
      parts.push("Tipografía: " + font.name);
    }

    whatsappLink.href =
      "https://wa.me/" +
      String(config.whatsappDigits || "") +
      "?text=" +
      encodeURIComponent(parts.join(" | "));
  }

  function updateBuyState(
    unavailable,
    stock
  ) {
    const safeStock = Math.max(
      0,
      Number(stock || 0)
    );

    if (quantityInput) {
      quantityInput.max =
        safeStock > 0
          ? String(safeStock)
          : "1";

      quantityInput.disabled = unavailable;

      if (!unavailable) {
        quantityInput.value = String(
          Math.min(
            Math.max(
              1,
              Number(quantityInput.value || 1)
            ),
            safeStock
          )
        );
      }
    }

    if (submitButton) {
      submitButton.disabled = unavailable;

      const text =
        submitButton.querySelector("span");

      if (text) {
        text.textContent = unavailable
          ? "Agotado"
          : "Agregar al carrito";
      }
    }

    if (stockEl) {
      stockEl.textContent = unavailable
        ? "Agotado"
        : "Disponible: " + safeStock;

      stockEl.classList.toggle(
        "is-unavailable",
        unavailable
      );
    }
  }

  function applyVariant(index) {
    const variant = variants[index];

    if (!variant) return;

    selectedVariantIndex = index;
    selectedVariant = variant;

    if (variantInput) {
      variantInput.value = String(index);
    }

    const price = Number(
      variant.price ||
      config.basePrice ||
      0
    );

    const compareAt = Number(
      variant.compareAtPrice || 0
    );

    if (priceEl) {
      priceEl.textContent =
        formatCurrency(price);
    }

    if (compareEl) {
      const visible = compareAt > price;

      compareEl.classList.toggle(
        "hidden",
        !visible
      );

      if (visible) {
        compareEl.textContent =
          formatCurrency(compareAt);
      }
    }

    if (
      variant.imageUrl &&
      mainImage
    ) {
      mainImage.src = variant.imageUrl;

      if (mainVideo) {
        mainVideo.pause();
        mainVideo.classList.add("hidden");
      }

      mainImage.classList.remove("hidden");
    }

    updateBuyState(
      variantUnavailable(variant),
      variantStock(variant)
    );

    root
      .querySelectorAll("[data-variant-button]")
      .forEach(function (button) {
        button.classList.toggle(
          "is-selected",
          Number(button.dataset.index) === index
        );
      });

    updatePreview();
  }

  function showError(message) {
    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    if (!errorBox) return;
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function validateSelections() {
    let valid = true;
    let message = "";

    root
      .querySelectorAll("[data-choice-group]")
      .forEach(function (group) {
        if (!valid) return;

        const required =
          group.dataset.choiceRequired === "true";

        if (!required) return;

        const selected =
          group.querySelector(
            "[data-choice-button].is-selected"
          ) ||
          (
            group.querySelector(
              "[data-choice-select]"
            )?.value
          );

        if (!selected) {
          const legend = group.querySelector(
            "legend"
          );

          valid = false;
          message =
            "Selecciona " +
            String(
              legend?.textContent || "una opción"
            ).replace("*", "").trim() +
            ".";
        }
      });

    if (!valid) {
      showError(message);
    }

    return valid;
  }

  root.addEventListener(
    "click",
    function (event) {
      const media = event.target.closest(
        "[data-product-media-tab]"
      );

      if (media) {
        event.preventDefault();
        setMedia(media);
        return;
      }

      const variant = event.target.closest(
        "[data-variant-button]"
      );

      if (variant) {
        event.preventDefault();

        if (
          variant.dataset.unavailable === "true"
        ) {
          return;
        }

        applyVariant(
          Number(variant.dataset.index)
        );

        return;
      }

      const choice = event.target.closest(
        "[data-choice-button]"
      );

      if (choice) {
        event.preventDefault();

        const group = choice.closest(
          "[data-choice-group]"
        );

        group
          .querySelectorAll("[data-choice-button]")
          .forEach(function (button) {
            button.classList.remove(
              "is-selected"
            );
          });

        choice.classList.add("is-selected");
        hideError();
        updatePreview();
        return;
      }

      const quantityAction =
        event.target.closest(
          "[data-quantity-action]"
        );

      if (quantityAction && quantityInput) {
        event.preventDefault();

        const current = Math.max(
          1,
          Number(quantityInput.value || 1)
        );

        const max = Math.max(
          1,
          Number(quantityInput.max || 1)
        );

        quantityInput.value = String(
          quantityAction.dataset.quantityAction ===
          "increase"
            ? Math.min(current + 1, max)
            : Math.max(current - 1, 1)
        );
      }
    }
  );

  form
    .querySelectorAll(
      "[data-choice-select], " +
      "[data-custom-field], " +
      "[data-font-option]"
    )
    .forEach(function (field) {
      field.addEventListener(
        "input",
        function () {
          hideError();
          updatePreview();
        }
      );

      field.addEventListener(
        "change",
        function () {
          hideError();
          updatePreview();
        }
      );
    });

  form
    .querySelectorAll("[data-custom-field]")
    .forEach(function (field) {
      const counter = field
        .closest(".gaton-custom-field")
        ?.querySelector(
          "[data-character-count]"
        );

      field.addEventListener(
        "input",
        function () {
          if (counter) {
            counter.textContent =
              String(field.value.length);
          }
        }
      );
    });

  const designFile = form.querySelector(
    "[data-design-file]"
  );

  if (designFile) {
    designFile.addEventListener(
      "change",
      function () {
        const file = designFile.files?.[0];
        const filename = form.querySelector(
          "[data-upload-filename]"
        );

        if (filename) {
          filename.textContent = file
            ? file.name
            : "Seleccionar archivo";
        }

        const maxMb = Math.max(
          1,
          Number(
            config.customizationUploadMaxSizeMB ||
            20
          )
        );

        if (
          file &&
          file.size > maxMb * 1024 * 1024
        ) {
          designFile.value = "";

          if (filename) {
            filename.textContent =
              "Seleccionar archivo";
          }

          showError(
            "El archivo supera el máximo de " +
            maxMb +
            " MB."
          );
        } else {
          hideError();
        }
      }
    );
  }

  form.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();
      hideError();

      if (!validateSelections()) {
        return;
      }

      if (!form.reportValidity()) {
        return;
      }

      updatePreview();

      submitButton?.classList.add(
        "is-loading"
      );

      submitButton?.setAttribute(
        "aria-busy",
        "true"
      );

      try {
        const response = await fetch(
          form.action,
          {
            method: "POST",
            body: new FormData(form),
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
              "X-Requested-With":
                "XMLHttpRequest"
            }
          }
        );

        const payload = await response
          .json()
          .catch(function () {
            return {
              ok: false,
              message:
                "Respuesta inválida del servidor."
            };
          });

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.message ||
            "No pudimos agregar el producto."
          );
        }

        window.dispatchEvent(
          new CustomEvent(
            "ref10:cart:open",
            {
              detail: {
                message:
                  payload.message ||
                  "Producto agregado al carrito."
              }
            }
          )
        );
      } catch (error) {
        showError(error.message);
      } finally {
        submitButton?.classList.remove(
          "is-loading"
        );

        submitButton?.removeAttribute(
          "aria-busy"
        );
      }
    }
  );

  root
    .querySelectorAll("[data-choice-group]")
    .forEach(function (group) {
      const firstButton = group.querySelector(
        "[data-choice-button]"
      );

      if (firstButton) {
        firstButton.classList.add(
          "is-selected"
        );
      }
    });

  if (variants.length) {
    const initial =
      selectedVariantIndex !== null
        ? selectedVariantIndex
        : variants.findIndex(
            function (variant) {
              return !variantUnavailable(variant);
            }
          );

    if (initial >= 0) {
      applyVariant(initial);
    }
  } else {
    updateBuyState(
      Boolean(config.productUnavailable),
      Number(config.defaultStock || 0)
    );
  }

  updatePreview();
})();
