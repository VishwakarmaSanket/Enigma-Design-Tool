console.log("🚀 Script Logic Starting...");

/* ===================== 0. INTERNAL STATE ===================== */
const editorState = {
  elements: [],
  selectedElementId: null,
};

/* ===================== GLOBAL VARIABLES ===================== */
let isDragging = false;
let isResizing = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let activeDOMElement = null;

// Helpers
const getEl = (sel) => document.querySelector(sel);
const generateID = () => crypto.randomUUID();

/* ===================== 1. PROPERTIES PANEL LOGIC ===================== */
function renderProperties() {
  try {
    const panel = getEl(".properties-panel");
    const empty = getEl(".empty-state");
    const form = getEl(".properties-form");

    if (!panel || !empty || !form) return;

    const id = editorState.selectedElementId;

    // A. No Selection
    if (!id) {
      empty.classList.remove("hidden");
      form.classList.add("hidden");
      return;
    }

    const element = editorState.elements.find((el) => el.id === id);
    if (!element) return;

    // B. Selection Exists
    empty.classList.add("hidden");
    form.classList.remove("hidden");

    // ✅ SMART TOGGLE: Only show Typography inputs if it's Text
    const textSections = document.querySelectorAll(".text-only");
    textSections.forEach((section) => {
      if (element.type === "text") section.classList.remove("hidden");
      else section.classList.add("hidden");
    });

    // C. Update Inputs (Safe Update)
    const setVal = (sel, val) => {
      const el = getEl(sel);
      if (el && el !== document.activeElement) {
        el.value = val;
      }
    };

    // Standard Props
    setVal('[data-prop="x"]', Math.round(element.x));
    setVal('[data-prop="y"]', Math.round(element.y));
    setVal('[data-prop="width"]', Math.round(element.width));
    setVal('[data-prop="height"]', Math.round(element.height));
    setVal('[data-prop="rotate"]', element.rotate || 0);
    setVal(
      '[data-prop="backgroundColor"]',
      element.backgroundColor || "#4a90e2",
    );

    // ✅ NEW: Text Props
    if (element.type === "text") {
      setVal('[data-prop="fontSize"]', element.fontSize || 16);
      setVal('[data-prop="color"]', element.color || "#333333");
      setVal('[data-prop="textAlign"]', element.textAlign || "left");
    }
  } catch (error) {
    console.error("Render Properties Error:", error);
  }
}

// Attach Input Listeners (2-Way Binding)
function initPropertyListeners() {
  const attach = (sel, key) => {
    const input = getEl(sel);
    if (!input) return;

    input.addEventListener("input", (e) => {
      const id = editorState.selectedElementId;
      if (!id) return;
      const element = editorState.elements.find((el) => el.id === id);
      if (!element) return;

      let val = e.target.value;
      if (input.type === "number") {
        if (val === "") return;
        val = parseInt(val, 10);
      }

      element[key] = val; // Update Data

      // Update Visuals on Canvas
      const domEl = getEl(`.canvas > [data-id="${id}"]`);
      if (domEl) {
        if (key === "x") domEl.style.left = val + "px";
        if (key === "y") domEl.style.top = val + "px";
        if (key === "width") domEl.style.width = val + "px";
        if (key === "height") domEl.style.height = val + "px";
        if (key === "rotate") domEl.style.transform = `rotate(${val}deg)`;
        if (key === "backgroundColor") domEl.style.backgroundColor = val;

        // ✅ NEW: Text Live Updates
        if (key === "fontSize") domEl.style.fontSize = val + "px";
        if (key === "color") domEl.style.color = val;
        if (key === "textAlign") domEl.style.textAlign = val; // Works because of flex-box setup below
        if (key === "textAlign")
          domEl.style.justifyContent =
            val === "center"
              ? "center"
              : val === "right"
                ? "flex-end"
                : "flex-start";
      }
    });
  };

  attach('[data-prop="x"]', "x");
  attach('[data-prop="y"]', "y");
  attach('[data-prop="width"]', "width");
  attach('[data-prop="height"]', "height");
  attach('[data-prop="rotate"]', "rotate");
  attach('[data-prop="backgroundColor"]', "backgroundColor");

  // ✅ NEW: Attach Text Listeners
  attach('[data-prop="fontSize"]', "fontSize");
  attach('[data-prop="color"]', "color");
  attach('[data-prop="textAlign"]', "textAlign");
}

/* ===================== 2. EXPORT LOGIC ===================== */
function initExportButtons() {
  const btnJson = getEl("#btn-export-json");
  if (btnJson) {
    btnJson.addEventListener("click", () => {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(editorState.elements));
      const a = document.createElement("a");
      a.href = dataStr;
      a.download = "design.json";
      a.click();
    });
  }

  const btnPng = getEl("#btn-export-png");
  if (btnPng) {
    btnPng.addEventListener("click", () => {
      const tempCanvas = document.createElement("canvas");
      const ctx = tempCanvas.getContext("2d");
      tempCanvas.width = 800;
      tempCanvas.height = 500;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      editorState.elements.forEach((el) => {
        ctx.save();
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;

        ctx.translate(cx, cy);
        ctx.rotate(((el.rotate || 0) * Math.PI) / 180);
        ctx.translate(-cx, -cy);

        if (el.type === "text") {
          // ✅ NEW: Better Text Export Logic
          ctx.fillStyle = el.color || "#333333";
          ctx.font = `${el.fontSize || 16}px Inter, sans-serif`;
          ctx.textBaseline = "top";

          // Handle Alignment in Export
          let xPos = el.x;
          if (el.textAlign === "center") xPos = el.x + el.width / 2;
          if (el.textAlign === "right") xPos = el.x + el.width;

          ctx.textAlign = el.textAlign || "left";
          ctx.fillText(el.text || "", xPos, el.y);
        } else if (el.type === "ellipse") {
          ctx.fillStyle = el.backgroundColor || "transparent";
          ctx.beginPath();
          ctx.ellipse(cx, cy, el.width / 2, el.height / 2, 0, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          ctx.fillStyle = el.backgroundColor || "transparent";
          ctx.fillRect(el.x, el.y, el.width, el.height);
        }
        ctx.restore();
      });

      const a = document.createElement("a");
      a.download = "design.png";
      a.href = tempCanvas.toDataURL();
      a.click();
    });
  }
}

/* ===================== 3. CORE ELEMENT LOGIC ===================== */
const canvas = getEl(".canvas");

if (canvas) {
  canvas.addEventListener("mousedown", (e) => {
    if (e.target === canvas) clearSelection();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea, [contenteditable]")) return;
  if (e.key !== "Delete" && e.key !== "Backspace") return;
  if (!editorState.selectedElementId) return;

  const id = editorState.selectedElementId;
  const el = getEl(`.canvas > [data-id="${id}"]`);
  if (el) el.remove();

  editorState.elements = editorState.elements.filter((el) => el.id !== id);
  clearSelection();
  renderLayers();
});

document.addEventListener("mousemove", (e) => {
  if (
    isResizing ||
    !isDragging ||
    !editorState.selectedElementId ||
    !activeDOMElement
  )
    return;

  const element = editorState.elements.find(
    (el) => el.id === editorState.selectedElementId,
  );
  if (!element) return;

  const rect = canvas.getBoundingClientRect();
  let newX = e.clientX - rect.left - dragOffsetX;
  let newY = e.clientY - rect.top - dragOffsetY;

  newX = Math.max(0, Math.min(newX, rect.width - element.width));
  newY = Math.max(0, Math.min(newY, rect.height - element.height));

  element.x = newX;
  element.y = newY;
  activeDOMElement.style.left = newX + "px";
  activeDOMElement.style.top = newY + "px";

  renderProperties();
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  activeDOMElement = null;
});

/* ===================== SELECTION & LAYERS ===================== */
function clearSelection() {
  document.querySelectorAll(".selected").forEach((el) => {
    el.classList.remove("selected");
    el.querySelectorAll(".resize-handle").forEach((h) => h.remove());
  });

  editorState.selectedElementId = null;
  isDragging = false;
  isResizing = false;
  activeDOMElement = null;

  document
    .querySelectorAll(".layers-list li")
    .forEach((li) => li.classList.remove("active"));
  document
    .querySelectorAll(".toolbar .tool button")
    .forEach((btn) => btn.classList.remove("active"));

  renderProperties();
}

function selectElement(id) {
  if (editorState.selectedElementId === id) return;
  clearSelection();
  editorState.selectedElementId = id;

  const domEl = getEl(`.canvas > [data-id="${id}"]`);
  if (!domEl) return;

  domEl.classList.add("selected");

  ["top-left", "top-right", "bottom-left", "bottom-right"].forEach((pos) => {
    const h = document.createElement("div");
    h.className = `resize-handle ${pos}`;
    domEl.appendChild(h);
    attachResizeLogic(h, id, pos);
  });

  document
    .querySelectorAll(".layers-list li")
    .forEach((li) => li.classList.remove("active"));
  const a = getEl(`.layers-list li[data-id="${id}"]`);
  if (a) a.classList.add("active");

  renderProperties();
}

/* ===================== RESIZE LOGIC ===================== */
function attachResizeLogic(handle, id, position) {
  handle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    isResizing = true;
    isDragging = false;
    activeDOMElement = null;

    const element = editorState.elements.find((el) => el.id === id);
    if (!element) return;
    const domEl = getEl(`.canvas > [data-id="${id}"]`);

    const startX = e.clientX;
    const startY = e.clientY;
    const sW = element.width;
    const sH = element.height;
    const sX = element.x;
    const sY = element.y;
    const rect = canvas.getBoundingClientRect();

    function onMove(e) {
      if (!isResizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let nW = sW,
        nH = sH,
        nX = sX,
        nY = sY;

      if (position.includes("right")) nW = sW + dx;
      if (position.includes("left")) {
        nW = sW - dx;
        nX = sX + dx;
      }
      if (position.includes("bottom")) nH = sH + dy;
      if (position.includes("top")) {
        nH = sH - dy;
        nY = sY + dy;
      }

      if (nX < 0) {
        nX = 0;
        nW = sX + sW;
      }
      if (nY < 0) {
        nY = 0;
        nH = sY + sH;
      }
      if (nX + nW > rect.width) {
        if (position.includes("right")) nW = rect.width - nX;
      }
      if (nY + nH > rect.height) {
        if (position.includes("bottom")) nH = rect.height - nY;
      }

      if (nW < 20) {
        nW = 20;
        if (position.includes("left")) nX = sX + sW - 20;
      }
      if (nH < 5) {
        nH = 5;
        if (position.includes("top")) nY = sY + sH - 5;
      }

      if (element.type === "line") {
        nH = sH;
        nY = sY;
      }

      element.x = nX;
      element.y = nY;
      element.width = nW;
      element.height = nH;
      if (domEl) {
        domEl.style.left = nX + "px";
        domEl.style.top = nY + "px";
        domEl.style.width = nW + "px";
        domEl.style.height = nH + "px";
      }
      renderProperties();
    }

    function onUp() {
      isResizing = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

/* ===================== RENDER ELEMENT ===================== */
function renderElement(element) {
  const div = document.createElement("div");
  const styles = {
    position: "absolute",
    left: element.x + "px",
    top: element.y + "px",
    width: element.width + "px",
    height: element.height + "px",
    backgroundColor: element.backgroundColor || "#4a90e2",
    transform: `rotate(${element.rotate || 0}deg)`,
    display: "flex",
    alignItems: "center", // Vertical Align: Center by default
    justifyContent: "center", // Horizontal Align: Center by default
    fontSize: (element.fontSize || 16) + "px", // ✅ NEW: Font Size
    color: element.color || "#333", // ✅ NEW: Text Color
    userSelect: "none",
    boxSizing: "border-box",
    overflow: "visible",
  };

  if (element.type === "ellipse") styles.borderRadius = "50%";
  else if (element.type === "line") {
    styles.height = "5px";
    div.style.height = "5px";
    styles.borderRadius = "2px";
  } else if (element.type === "text") {
    styles.backgroundColor = "transparent";
    styles.border = "1px dashed #ccc";
    styles.padding = "4px";

    // ✅ NEW: Text Alignment Logic
    const align = element.textAlign || "left";
    styles.textAlign = align;
    styles.justifyContent =
      align === "center"
        ? "center"
        : align === "right"
          ? "flex-end"
          : "flex-start";

    div.innerText = element.text || "Double click";
  }

  Object.assign(div.style, styles);
  div.dataset.id = element.id;
  canvas.appendChild(div);

  // Text Editing
  if (element.type === "text") {
    div.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      div.contentEditable = true;
      div.focus();
      div.style.userSelect = "text";
      div.style.cursor = "text";
      div.style.border = "1px solid #4a90e2";
      const r = document.createRange();
      r.selectNodeContents(div);
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    });
    div.addEventListener("blur", () => {
      div.contentEditable = false;
      div.style.userSelect = "none";
      div.style.cursor = "grab";
      div.style.border = "1px dashed #ccc";
      element.text = div.innerText;
    });
  }

  // Dragging
  div.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("resize-handle")) return;
    if (div.isContentEditable) return;
    e.stopPropagation();
    selectElement(element.id);
    const r = div.getBoundingClientRect();
    dragOffsetX = e.clientX - r.left;
    dragOffsetY = e.clientY - r.top;
    isDragging = true;
    activeDOMElement = div;
  });
}

/* ===================== CREATE ELEMENT ===================== */
function createElement(type) {
  const defaults = {
    rectangle: { w: 100, h: 100 },
    ellipse: { w: 100, h: 100 },
    line: { w: 150, h: 5 },
    text: { w: 200, h: 40 },
  };
  const size = defaults[type];

  const element = {
    id: generateID(),
    type,
    x: 100,
    y: 100,
    width: size.w,
    height: size.h,
    backgroundColor: "#4a90e2",
    text: type === "text" ? "Double click" : "",
    rotate: 0,
    // ✅ NEW: Default Text Styles
    fontSize: 16,
    color: "#333333",
    textAlign: "left",
  };

  editorState.elements.push(element);
  renderElement(element);

  // Render Layers
  const list = getEl(".layers-list");
  if (list) {
    list.innerHTML = "";
    editorState.elements.forEach((el, index) => {
      const li = document.createElement("li");
      li.textContent = `${el.type} ${index + 1}`;
      li.dataset.id = el.id;
      li.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        selectElement(el.id);
      });
      list.appendChild(li);
    });
  }

  selectElement(element.id);

  // Highlight Tool
  document.querySelectorAll(".toolbar .tool button").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.tool === type) btn.classList.add("active");
  });
}

/* ===================== INIT ===================== */
// Bind Tool Buttons
["rectangle", "ellipse", "line", "text"].forEach((tool) => {
  const btn = getEl(`[data-tool="${tool}"]`);
  if (btn) btn.addEventListener("click", () => createElement(tool));
});

console.log("🚀 Initializing listeners...");
initPropertyListeners();
initExportButtons();
console.log("✅ Initialization Complete");
