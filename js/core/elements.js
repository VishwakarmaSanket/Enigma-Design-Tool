console.log("🚀 Enigma vFinal Engine Starting...");

/* ===================== 0. INTERNAL STATE ===================== */
const editorState = {
  elements: [],
  selectedElementId: null,
  history: [],
  historyStep: -1,
  clipboard: null,
};

/* ===================== GLOBAL VARIABLES ===================== */
let isDragging = false;
let isResizing = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let activeDOMElement = null;

const getEl = (sel) => document.querySelector(sel);
const generateID = () => crypto.randomUUID();

/* ===================== 1. HISTORY & AUTO-SAVE ===================== */
function saveToLocal() {
  localStorage.setItem("enigma_v2_data", JSON.stringify(editorState.elements));
}

function loadFromLocal() {
  const data = localStorage.getItem("enigma_v2_data");
  if (data) {
    editorState.elements = JSON.parse(data);
    editorState.elements.forEach((el) => renderElement(el));
    renderLayers();
    saveHistory();
  }
}

function saveHistory() {
  if (editorState.historyStep < editorState.history.length - 1) {
    editorState.history = editorState.history.slice(
      0,
      editorState.historyStep + 1,
    );
  }
  if (editorState.history.length > 50) editorState.history.shift();
  editorState.history.push(JSON.stringify(editorState.elements));
  editorState.historyStep++;
  saveToLocal();
}

function undo() {
  if (editorState.historyStep > 0) {
    editorState.historyStep--;
    restoreHistory();
  }
}

function redo() {
  if (editorState.historyStep < editorState.history.length - 1) {
    editorState.historyStep++;
    restoreHistory();
  }
}

function restoreHistory() {
  const json = editorState.history[editorState.historyStep];
  editorState.elements = JSON.parse(json);
  getEl(".canvas").innerHTML = "";
  editorState.elements.forEach((el) => renderElement(el));
  clearSelection();
  renderLayers();
  saveToLocal();
}

/* ===================== 2. PROPERTIES PANEL ===================== */
function renderProperties() {
  const panel = getEl(".properties-panel");
  const empty = getEl(".empty-state");
  const form = getEl(".properties-form");

  if (!panel || !empty || !form) return;

  const id = editorState.selectedElementId;
  if (!id) {
    empty.classList.remove("hidden");
    form.classList.add("hidden");
    return;
  }

  const element = editorState.elements.find((el) => el.id === id);
  if (!element) return;

  empty.classList.add("hidden");
  form.classList.remove("hidden");

  const textSections = document.querySelectorAll(".text-only");
  textSections.forEach((section) => {
    if (element.type === "text") section.classList.remove("hidden");
    else section.classList.add("hidden");
  });

  const setVal = (sel, val) => {
    const el = getEl(sel);
    if (el && el !== document.activeElement) {
      el.value = val;
      if (el.type === "color") {
        const label = el.parentElement.querySelector(".color-value-text");
        if (label) label.innerText = val.toUpperCase();
      }
    }
  };

  setVal('[data-prop="x"]', Math.round(element.x));
  setVal('[data-prop="y"]', Math.round(element.y));
  setVal('[data-prop="width"]', Math.round(element.width));
  setVal('[data-prop="height"]', Math.round(element.height));
  setVal('[data-prop="rotate"]', element.rotate || 0);

  setVal('[data-prop="backgroundColor"]', element.backgroundColor || "#4a90e2");
  setVal(
    '[data-prop="opacity"]',
    element.opacity !== undefined ? element.opacity : 1,
  );
  getEl("#opacity-val").innerText =
    Math.round((element.opacity || 1) * 100) + "%";

  setVal('[data-prop="borderWidth"]', element.borderWidth || 0);
  setVal('[data-prop="borderColor"]', element.borderColor || "#000000");

  setVal('[data-prop="shadowBlur"]', element.shadowBlur || 0);
  setVal('[data-prop="shadowColor"]', element.shadowColor || "#000000");

  if (element.type === "text") {
    setVal('[data-prop="fontSize"]', element.fontSize || 16);
    setVal('[data-prop="color"]', element.color || "#333333");
    setVal('[data-prop="textAlign"]', element.textAlign || "left");
    setVal(
      '[data-prop="fontFamily"]',
      element.fontFamily || "Inter, sans-serif",
    );
  }
}

function initPropertyListeners() {
  const inputs = document.querySelectorAll("[data-prop]");
  inputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      const id = editorState.selectedElementId;
      if (!id) return;
      const element = editorState.elements.find((el) => el.id === id);
      const key = input.dataset.prop;
      let val = e.target.value;

      if (input.type === "number") val = parseInt(val, 10) || 0;
      if (input.type === "range") val = parseFloat(val);

      element[key] = val;

      const domEl = getEl(`.canvas > [data-id="${id}"]`);
      if (domEl) updateElementVisuals(domEl, element);

      if (key === "opacity")
        getEl("#opacity-val").innerText = Math.round(val * 100) + "%";
      if (input.type === "color") {
        const label = input.parentElement.querySelector(".color-value-text");
        if (label) label.innerText = val.toUpperCase();
      }
    });

    input.addEventListener("change", () => saveHistory());
  });

  const btnUndo = getEl("#btn-undo");
  if (btnUndo) btnUndo.addEventListener("click", undo);

  // ✅ EXPORT BUTTON LISTENERS
  const btnHtml = getEl("#btn-export-html");
  if (btnHtml) btnHtml.addEventListener("click", exportToHTML);

  const btnJson = getEl("#btn-export-json");
  if (btnJson) btnJson.addEventListener("click", exportToJSON);

  const btnPng = getEl("#btn-export-png");
  if (btnPng) btnPng.addEventListener("click", exportToPNG);
}

/* ===================== 3. RENDERING ENGINE ===================== */
function updateElementVisuals(containerDiv, element) {
  containerDiv.style.left = element.x + "px";
  containerDiv.style.top = element.y + "px";
  containerDiv.style.width = element.width + "px";
  containerDiv.style.height = element.height + "px";
  containerDiv.style.transform = `rotate(${element.rotate || 0}deg)`;
  containerDiv.style.zIndex = editorState.elements.indexOf(element); // Sync Z-Index

  const contentDiv = containerDiv.querySelector(".element-content");
  if (!contentDiv) return;

  contentDiv.style.opacity =
    element.opacity !== undefined ? element.opacity : 1;
  contentDiv.style.backgroundColor = element.backgroundColor || "transparent";

  if (element.borderWidth > 0) {
    contentDiv.style.border = `${element.borderWidth}px solid ${element.borderColor}`;
  } else {
    contentDiv.style.border =
      element.type === "text" ? "1px dashed transparent" : "none";
    if (
      element.type === "text" &&
      !containerDiv.classList.contains("editing")
    ) {
      contentDiv.style.border = "1px dashed #ccc";
    }
  }

  if (element.shadowBlur > 0) {
    contentDiv.style.filter = `drop-shadow(0px 4px ${element.shadowBlur}px ${element.shadowColor})`;
  } else {
    contentDiv.style.filter = "none";
  }

  if (element.type === "text") {
    contentDiv.style.fontSize = (element.fontSize || 16) + "px";
    contentDiv.style.color = element.color || "#333";
    contentDiv.style.textAlign = element.textAlign || "left";
    contentDiv.style.fontFamily = element.fontFamily || "Inter, sans-serif";
    contentDiv.style.display = "flex";
    contentDiv.style.alignItems = "center";
    contentDiv.style.justifyContent =
      element.textAlign === "center"
        ? "center"
        : element.textAlign === "right"
          ? "flex-end"
          : "flex-start";
    contentDiv.innerText = element.text || "Double click";
  }

  if (element.type === "ellipse") contentDiv.style.borderRadius = "50%";
  else contentDiv.style.borderRadius = "0";
}

function renderElement(element) {
  const container = document.createElement("div");
  container.className = "element-wrapper";
  container.dataset.id = element.id;

  Object.assign(container.style, {
    position: "absolute",
    userSelect: "none",
    boxSizing: "border-box",
    outline: "none",
    zIndex: editorState.elements.indexOf(element), // Initial Z-Index
  });

  const content = document.createElement("div");
  content.className = "element-content";
  Object.assign(content.style, {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    overflow: "visible",
  });

  container.appendChild(content);
  getEl(".canvas").appendChild(container);

  updateElementVisuals(container, element);

  if (element.type === "text") {
    container.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      content.contentEditable = true;
      content.focus();
      container.classList.add("editing");
      content.style.cursor = "text";
      content.style.border = "1px solid #4a90e2";
    });
    content.addEventListener("blur", () => {
      content.contentEditable = false;
      container.classList.remove("editing");
      content.style.cursor = "grab";
      element.text = content.innerText;
      updateElementVisuals(container, element);
      saveHistory();
    });
  }

  container.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("resize-handle")) return;
    if (content.isContentEditable) return;
    e.stopPropagation();
    selectElement(element.id);
    const r = container.getBoundingClientRect();
    dragOffsetX = e.clientX - r.left;
    dragOffsetY = e.clientY - r.top;
    isDragging = true;
    activeDOMElement = container;
  });
}

/* ===================== 4. CREATION & LOGIC ===================== */
function createElement(type) {
  const defaults = {
    rectangle: { w: 100, h: 100, bg: "#4a90e2" },
    ellipse: { w: 100, h: 100, bg: "#ea758b" },
    line: { w: 150, h: 5, bg: "#333" },
    text: { w: 200, h: 40, bg: "transparent" },
  };
  const d = defaults[type];

  const element = {
    id: generateID(),
    type,
    x: 100,
    y: 100,
    width: d.w,
    height: d.h,
    backgroundColor: d.bg,
    rotate: 0,
    opacity: 1,
    borderWidth: 0,
    borderColor: "#000000",
    shadowBlur: 0,
    shadowColor: "#000000",
    text: type === "text" ? "Double click" : "",
    fontSize: 16,
    color: "#333333",
    textAlign: "left",
    fontFamily: "Inter, sans-serif",
  };

  editorState.elements.push(element);
  renderElement(element);
  selectElement(element.id);
  renderLayers();
  saveHistory();
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
  renderLayers();
  renderProperties();
}

function clearSelection() {
  document.querySelectorAll(".selected").forEach((el) => {
    el.classList.remove("selected");
    el.querySelectorAll(".resize-handle").forEach((h) => h.remove());
  });
  editorState.selectedElementId = null;
  renderLayers();
  renderProperties();
}

/* ===================== 5. SHORTCUTS & EXPORTS ===================== */
function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, [contenteditable]")) return;

    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      const id = editorState.selectedElementId;
      if (id)
        editorState.clipboard = JSON.parse(
          JSON.stringify(editorState.elements.find((x) => x.id === id)),
        );
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      if (editorState.clipboard) {
        const newEl = JSON.parse(JSON.stringify(editorState.clipboard));
        newEl.id = generateID();
        newEl.x += 20;
        newEl.y += 20;
        if (newEl.x + newEl.width > 800) newEl.x = 800 - newEl.width;
        if (newEl.y + newEl.height > 500) newEl.y = 500 - newEl.height;
        editorState.elements.push(newEl);
        renderElement(newEl);
        selectElement(newEl.id);
        renderLayers();
        saveHistory();
      }
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      const id = editorState.selectedElementId;
      if (id) {
        getEl(`.canvas > [data-id="${id}"]`).remove();
        editorState.elements = editorState.elements.filter(
          (el) => el.id !== id,
        );
        clearSelection();
        renderLayers();
        saveHistory();
      }
    }
    if (editorState.selectedElementId) {
      const el = editorState.elements.find(
        (x) => x.id === editorState.selectedElementId,
      );
      const dom = getEl(`.canvas > [data-id="${el.id}"]`);
      const step = e.shiftKey ? 10 : 5;

      if (e.key === "ArrowUp") el.y = Math.max(0, el.y - step);
      if (e.key === "ArrowDown") el.y = Math.min(500 - el.height, el.y + step);
      if (e.key === "ArrowLeft") el.x = Math.max(0, el.x - step);
      if (e.key === "ArrowRight") el.x = Math.min(800 - el.width, el.x + step);
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        updateElementVisuals(dom, el);
        renderProperties();
      }
    }
  });
  document.addEventListener("keyup", (e) => {
    if (e.key.startsWith("Arrow") && editorState.selectedElementId)
      saveHistory();
  });
}

function moveLayer(id, direction) {
  const index = editorState.elements.findIndex((el) => el.id === id);
  if (index === -1) return;

  if (direction === "up" && index < editorState.elements.length - 1) {
    [editorState.elements[index], editorState.elements[index + 1]] = [
      editorState.elements[index + 1],
      editorState.elements[index],
    ];
  } else if (direction === "down" && index > 0) {
    [editorState.elements[index], editorState.elements[index - 1]] = [
      editorState.elements[index - 1],
      editorState.elements[index],
    ];
  }

  getEl(".canvas").innerHTML = "";
  editorState.elements.forEach((el) => renderElement(el));

  if (editorState.selectedElementId) {
    const domEl = getEl(
      `.canvas > [data-id="${editorState.selectedElementId}"]`,
    );
    if (domEl) domEl.classList.add("selected");
    selectElement(editorState.selectedElementId);
  }

  renderLayers();
  saveHistory();
}

function renderLayers() {
  const list = getEl(".layers-list");
  if (!list) return;
  list.innerHTML = "";

  editorState.elements
    .slice()
    .reverse()
    .forEach((el) => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";

      const labelSpan = document.createElement("span");
      const typeLabel = el.type.charAt(0).toUpperCase() + el.type.slice(1);
      labelSpan.innerText = typeLabel;

      const btnGroup = document.createElement("div");
      btnGroup.style.display = "flex";
      btnGroup.style.gap = "4px";

      const btnUp = document.createElement("button");
      btnUp.innerText = "↑";
      btnUp.title = "Bring Forward";
      btnUp.style.padding = "2px 6px";
      btnUp.style.fontSize = "10px";
      btnUp.style.cursor = "pointer";
      btnUp.style.background = "rgba(255,255,255,0.1)";
      btnUp.style.border = "none";
      btnUp.style.color = "white";
      btnUp.onclick = (e) => {
        e.stopPropagation();
        moveLayer(el.id, "up");
      };

      const btnDown = document.createElement("button");
      btnDown.innerText = "↓";
      btnDown.title = "Send Backward";
      btnDown.style.padding = "2px 6px";
      btnDown.style.fontSize = "10px";
      btnDown.style.cursor = "pointer";
      btnDown.style.background = "rgba(255,255,255,0.1)";
      btnDown.style.border = "none";
      btnDown.style.color = "white";
      btnDown.onclick = (e) => {
        e.stopPropagation();
        moveLayer(el.id, "down");
      };

      btnGroup.appendChild(btnUp);
      btnGroup.appendChild(btnDown);
      li.appendChild(labelSpan);
      li.appendChild(btnGroup);

      li.dataset.id = el.id;
      li.classList.add(`type-${el.type}`);
      if (el.id === editorState.selectedElementId) li.classList.add("active");

      li.addEventListener("mousedown", (e) => {
        if (e.target.tagName !== "BUTTON") {
          e.stopPropagation();
          selectElement(el.id);
        }
      });
      list.appendChild(li);
    });
}

// ✅ EXPORT JSON
function exportToJSON() {
  const dataStr = JSON.stringify(editorState.elements, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "enigma-design.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ✅ EXPORT HTML
function exportToHTML() {
  let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Enigma Design Export</title>
    <style>
        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f0f0; }
        .canvas { position: relative; width: 800px; height: 500px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
        .element { position: absolute; box-sizing: border-box; display: flex; align-items: center; }
    </style>
</head>
<body>
    <div class="canvas">
`;

  editorState.elements.forEach((el) => {
    let styles = `
            left: ${el.x}px; top: ${el.y}px; 
            width: ${el.width}px; height: ${el.height}px; 
            transform: rotate(${el.rotate || 0}deg);
            background-color: ${el.backgroundColor || "transparent"};
            opacity: ${el.opacity !== undefined ? el.opacity : 1};
            z-index: ${editorState.elements.indexOf(el)};
        `;

    if (el.type === "ellipse") styles += `border-radius: 50%;`;
    if (el.shadowBlur > 0)
      styles += `filter: drop-shadow(0px 4px ${el.shadowBlur}px ${el.shadowColor});`;
    if (el.borderWidth > 0)
      styles += `border: ${el.borderWidth}px solid ${el.borderColor};`;

    let content = "";
    if (el.type === "text") {
      styles += `
                font-size: ${el.fontSize}px; color: ${el.color}; 
                text-align: ${el.textAlign}; font-family: ${el.fontFamily};
                justify-content: ${
                  element.textAlign === "center"
                    ? "center"
                    : element.textAlign === "right"
                      ? "flex-end"
                      : "flex-start"
                };
            `;
      content = el.text;
    }

    htmlContent += `        <div class="element" style="${styles}">${content}</div>\n`;
  });

  htmlContent += `    </div>\n</body>\n</html>`;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "design.html";
  a.click();
}

// ✅ EXPORT PNG (Needs html2canvas in index.html)
function exportToPNG() {
  if (!window.html2canvas) {
    alert(
      "html2canvas library not found! Please add it to your index.html head.",
    );
    return;
  }
  // Clear selection so handles don't show up in image
  clearSelection();

  const canvasEl = getEl(".canvas");
  html2canvas(canvasEl).then((canvas) => {
    const link = document.createElement("a");
    link.download = "design.png";
    link.href = canvas.toDataURL();
    link.click();
  });
}

function attachResizeLogic(handle, id, position) {
  handle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    isResizing = true;
    isDragging = false;
    activeDOMElement = null;
    const element = editorState.elements.find((el) => el.id === id);
    const startX = e.clientX;
    const startY = e.clientY;
    const sW = element.width;
    const sH = element.height;
    const sX = element.x;
    const sY = element.y;
    const rect = getEl(".canvas").getBoundingClientRect();

    function onMove(e) {
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
      if (nW < 20) {
        nW = 20;
        if (position.includes("left")) nX = sX + sW - 20;
      }
      if (nH < 5) {
        nH = 5;
        if (position.includes("top")) nY = sY + sH - 5;
      }

      if (nX < 0) {
        nW += nX;
        nX = 0;
      }
      if (nY < 0) {
        nH += nY;
        nY = 0;
      }
      if (nX + nW > rect.width) nW = rect.width - nX;
      if (nY + nH > rect.height) nH = rect.height - nY;

      element.x = nX;
      element.y = nY;
      element.width = nW;
      element.height = nH;
      updateElementVisuals(getEl(`.canvas > [data-id="${id}"]`), element);
      renderProperties();
    }
    function onUp() {
      isResizing = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      saveHistory();
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

document.addEventListener("mousemove", (e) => {
  if (isResizing || !isDragging || !activeDOMElement) return;
  const element = editorState.elements.find(
    (el) => el.id === editorState.selectedElementId,
  );
  if (!element) return;
  const rect = getEl(".canvas").getBoundingClientRect();
  let newX = e.clientX - rect.left - dragOffsetX;
  let newY = e.clientY - rect.top - dragOffsetY;
  newX = Math.max(0, Math.min(newX, rect.width - element.width));
  newY = Math.max(0, Math.min(newY, rect.height - element.height));
  element.x = newX;
  element.y = newY;
  updateElementVisuals(activeDOMElement, element);
  renderProperties();
});

document.addEventListener("mouseup", () => {
  if (isDragging) saveHistory();
  isDragging = false;
  activeDOMElement = null;
});

["rectangle", "ellipse", "line", "text"].forEach((tool) => {
  const btn = getEl(`[data-tool="${tool}"]`);
  if (btn) btn.addEventListener("click", () => createElement(tool));
});
getEl(".canvas-wrapper").addEventListener("mousedown", (e) => {
  if (
    e.target.classList.contains("canvas-wrapper") ||
    e.target.classList.contains("canvas")
  )
    clearSelection();
});

initPropertyListeners();
initKeyboardShortcuts();
loadFromLocal();
saveHistory();

console.log("✅ Enigma vFinal Ready!");
