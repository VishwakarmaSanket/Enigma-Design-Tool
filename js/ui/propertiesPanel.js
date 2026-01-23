import editorState from "../state.js";

export function initPropertiesPanel(registerSelectionChange) {
  const emptyState = document.querySelector(".properties-panel .empty-state");
  const form = document.querySelector(".properties-form");
  const canvas = document.querySelector(".canvas");

  function updatePropertiesPanel() {
    if (!editorState.selectedElementId) {
      emptyState.classList.remove("hidden");
      form.classList.add("hidden");
      return;
    }

    const element = editorState.elements.find(
      (el) => el.id === editorState.selectedElementId,
    );
    if (!element) return;

    emptyState.classList.add("hidden");
    form.classList.remove("hidden");

    // ✅ Numbers only (NO px)
    form.querySelector('[data-prop="x"]').value = element.x;
    form.querySelector('[data-prop="y"]').value = element.y;
    form.querySelector('[data-prop="width"]').value = element.width;
    form.querySelector('[data-prop="height"]').value = element.height;
    form.querySelector('[data-prop="backgroundColor"]').value =
      element.backgroundColor || "#4a90e2";
  }

  // 🔗 register callback
  registerSelectionChange(updatePropertiesPanel);

  // 🎛️ input handling with constraints
  form.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      if (!editorState.selectedElementId) return;

      const prop = input.dataset.prop;
      const rawValue =
        input.type === "color" ? input.value : Number(input.value);

      const element = editorState.elements.find(
        (el) => el.id === editorState.selectedElementId,
      );
      if (!element) return;

      const canvasRect = canvas.getBoundingClientRect();

      // 🔒 clamp logic (same rules as drag/resize)
      if (prop === "x") {
        element.x = Math.max(
          0,
          Math.min(rawValue, canvasRect.width - element.width),
        );
      } else if (prop === "y") {
        element.y = Math.max(
          0,
          Math.min(rawValue, canvasRect.height - element.height),
        );
      } else if (prop === "width") {
        element.width = Math.max(
          40,
          Math.min(rawValue, canvasRect.width - element.x),
        );
      } else if (prop === "height") {
        element.height = Math.max(
          40,
          Math.min(rawValue, canvasRect.height - element.y),
        );
      } else if (prop === "backgroundColor") {
        element.backgroundColor = rawValue;
      }

      const domEl = document.querySelector(
        `.canvas > [data-id="${element.id}"]`,
      );
      if (!domEl) return;

      // ✅ single DOM sync
      domEl.style.left = element.x + "px";
      domEl.style.top = element.y + "px";
      domEl.style.width = element.width + "px";
      domEl.style.height = element.height + "px";
      if (element.backgroundColor) {
        domEl.style.backgroundColor = element.backgroundColor;
      }

      // 🔁 re-sync panel (for clamped values)
      updatePropertiesPanel();
    });
  });

  updatePropertiesPanel();
}
