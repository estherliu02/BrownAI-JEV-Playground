
    const $ = (id) => document.getElementById(id);
    const WIDE = new Set(["Question", "Participant Text"]);
    let COLUMNS = [], ROWS = [], GENERATED = [];
    let filters = [];   // [{label, op, value}], all must pass
    let sorts = [];     // [{label, dir: 1 | -1}], earlier levels take precedence
    let visibleIds = [];
    let drag = null;     // {list, from} while a sort chip or applied question is being dragged

    const primitive = () => document.querySelector("input[name=type]:checked").value;
    const isMissing = (v) => v === undefined || v === null || v === "";
    const fmt = (v) => (isMissing(v) ? "" : typeof v === "number" && !Number.isInteger(v) ? v.toFixed(2) : String(v));
    const status = (text) => ($("apply-status").textContent = text);

    function cell(tag, text, className) {
      const el = document.createElement(tag);
      el.textContent = text;
      if (className) el.className = className;
      return el;
    }

    // Table columns: the original Excel columns, then one (or two, for Choice) per generated Jev question.
    function allColumns() {
      const cols = COLUMNS.map((name) => ({ label: name, get: (r) => r[name] }));
      for (const g of GENERATED) {
        const title = `${g.type}: ${g.instruction}` + (g.criteria ? "\n• " + g.criteria.join("\n• ") : "") + `\nSaved source model: ${g.model}`;
        const add = (label, key) => cols.push({ label, title, gen: true, get: (r) => g.answers[r.id]?.[key] });
        if (g.type === "noul") add(g.column_name, "noul");
        if (g.type === "score") add(g.column_name, "score");
        if (g.type === "choice") {
          add(g.column_name, "choice");
          add(g.column_name + " Confidence", "confidence");
        }
      }
      return cols;
    }

    function compare(a, b) {
      if (typeof a === "number" && typeof b === "number") return a - b;
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
    }

    function passes(value, op, target) {
      if (isMissing(value)) return false; // rows a question was not applied to never match its filters
      if (op === "contains") return String(value).toLowerCase().includes(target.toLowerCase());
      const t = typeof value === "number" && !isNaN(target) ? Number(target) : target;
      const c = compare(value, t);
      return { "==": c === 0, "!=": c !== 0, ">=": c >= 0, "<=": c <= 0, ">": c > 0, "<": c < 0 }[op];
    }

    // Columns with a short list of text values get a real dropdown for == / !=; otherwise the value is typed.
    function updateValueField() {
      const col = allColumns().find((c) => c.label === $("f-col").value);
      const values = col ? [...new Set(ROWS.map((r) => col.get(r)).filter((v) => typeof v === "string" && v))] : [];
      const pick = values.length > 0 && values.length <= 100 && ["==", "!="].includes($("f-op").value);
      const selected = $("f-pick").value;
      $("f-pick").replaceChildren(...(pick ? values.sort(compare) : []).map((v) => new Option(v, v)));
      if (values.includes(selected)) $("f-pick").value = selected;
      $("f-pick").hidden = !pick;
      $("f-val").hidden = pick;
    }

    function render() {
      const cols = allColumns();
      const byLabel = Object.fromEntries(cols.map((c) => [c.label, c]));
      filters = filters.filter((f) => byLabel[f.label]);
      sorts = sorts.filter((s) => byLabel[s.label]);

      let rows = ROWS.filter((r) => filters.every((f) => passes(byLabel[f.label].get(r), f.op, f.value)));
      if (sorts.length) {
        rows = [...rows].sort((a, b) => {
          for (const s of sorts) {
            const get = byLabel[s.label].get, va = get(a), vb = get(b);
            const c = isMissing(va) - isMissing(vb) || (isMissing(va) ? 0 : compare(va, vb) * s.dir); // blanks last
            if (c) return c;
          }
          return 0;
        });
      }
      visibleIds = rows.map((r) => r.id);

      const header = document.createElement("tr");
      for (const c of cols) {
        const level = sorts.findIndex((s) => s.label === c.label), s = sorts[level];
        const arrow = s ? (s.dir > 0 ? " ▲" : " ▼") + (sorts.length > 1 ? level + 1 : "") : "";
        const th = cell("th", c.label + arrow, c.gen ? "gen" : "");
        th.title = c.title || "Click to sort";
        th.tabIndex = 0;
        th.setAttribute("aria-sort", s ? (s.dir > 0 ? "ascending" : "descending") : "none");
        th.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); th.click(); } };
        th.onclick = () => { // a header click sorts by that column alone; the Sort panel builds multiple levels
          sorts = [{ label: c.label, dir: sorts.length === 1 && s ? -s.dir : 1 }];
          render();
        };
        header.append(th);
      }
      $("thead").replaceChildren(header);

      $("tbody").replaceChildren(...rows.map((r) => {
        const tr = document.createElement("tr");
        for (const c of cols) tr.append(cell("td", fmt(c.get(r)), c.gen ? "gen" : WIDE.has(c.label) ? "wide" : ""));
        return tr;
      }));

      $("count").textContent = `Showing ${rows.length} of ${ROWS.length} rows`;
      $("apply").textContent = `Apply to Current Rows (${rows.length})`;

      const selected = $("f-col").value;
      $("f-col").replaceChildren(...cols.map((c) => new Option(c.label, c.label)));
      if (byLabel[selected]) $("f-col").value = selected;
      updateValueField();

      $("f-list").replaceChildren(...filters.map((f, i) => {
        const chip = cell("span", `${f.label} ${f.op} ${f.value} `, "chip");
        const remove = cell("button", "×");
        remove.title = "Remove filter";
        remove.onclick = () => { filters.splice(i, 1); render(); };
        chip.append(remove);
        return chip;
      }));

      const sortSelected = $("s-col").value;
      $("s-col").replaceChildren(...cols.map((c) => new Option(c.label, c.label)));
      if (byLabel[sortSelected]) $("s-col").value = sortSelected;

      $("s-list").replaceChildren(...sorts.map((s, i) => {
        const chip = cell("span", `${s.label} ${s.dir > 0 ? "▲" : "▼"} `, "chip sort-chip");
        chip.prepend(dragHandle());
        reorderable(chip, sorts, i, $("s-list"), false);
        chip.title = "Drag (or focus and press ← / →) to change sort priority";
        const remove = cell("button", "×");
        remove.title = "Remove sort level";
        remove.onclick = () => { sorts.splice(i, 1); render(); };
        chip.append(remove);
        return chip;
      }));

      $("questions").replaceChildren(...GENERATED.map((g, i) => {
        const li = document.createElement("li");
        reorderable(li, GENERATED, i, $("questions"), true);
        li.title = "Drag (or focus and press ↑ / ↓) to reorder its table columns";
        const remove = cell("button", "×");
        remove.title = "Remove this question and its columns";
        remove.onclick = () => { GENERATED.splice(i, 1); render(); };
        const text = cell("span", ` (${g.type}, ${Object.keys(g.answers).length} rows): ${g.instruction}`, "q-text");
        text.prepend(cell("b", g.column_name));
        li.append(dragHandle(), text, remove);
        return li;
      }));
    }

    function dragHandle() {
      const handle = cell("span", "☰", "handle");
      handle.setAttribute("aria-hidden", "true");
      return handle;
    }
    // Let `el` (item i of `list`, rendered into `container`) be dragged, or moved with arrow keys, to reorder `list`.
    function reorderable(el, list, i, container, vertical) {
      const after = (e) => { const b = el.getBoundingClientRect(); return vertical ? e.clientY > b.top + b.height / 2 : e.clientX > b.left + b.width / 2; };
      const [back, forward] = vertical ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
      el.draggable = true;
      el.tabIndex = 0;
      el.ondragstart = (e) => { drag = { list, from: i }; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", el.textContent); el.classList.add("dragging"); };
      el.ondragend = () => { drag = null; el.classList.remove("dragging"); };
      el.ondragover = (e) => {
        if (drag?.list !== list) return;
        e.preventDefault();
        el.classList.toggle("drop-before", !after(e));
        el.classList.toggle("drop-after", after(e));
      };
      el.ondragleave = () => el.classList.remove("drop-before", "drop-after");
      el.ondrop = (e) => { e.preventDefault(); if (drag?.list === list) move(list, drag.from, i + after(e)); };
      el.onkeydown = (e) => {
        if (e.target !== el) return;
        if (e.key === back && i > 0) { e.preventDefault(); move(list, i, i - 1, container); }
        if (e.key === forward && i < list.length - 1) { e.preventDefault(); move(list, i, i + 2, container); }
      };
    }
    // Move item `from` to insertion point `to` (an index into the list before the move).
    function move(list, from, to, focusIn) {
      const dest = to > from ? to - 1 : to;
      list.splice(dest, 0, ...list.splice(from, 1));
      render();
      if (focusIn) focusIn.children[dest].focus();
    }

    // Size the read-only instruction box to its text instead of a fixed number of rows.
    function fitInstruction() {
      const el = $("instruction");
      el.style.height = "auto";
      el.style.height = el.scrollHeight + el.offsetHeight - el.clientHeight + "px";
    }
    function selectPreset() {
      const q = DEMO.questions.find(q => q.column_name === $("preset").value);
      $("instruction").value = q.instruction;
      fitInstruction();
      $("rubric-box").hidden = q.type !== "score";
      $("choices-box").hidden = q.type !== "choice";
      $("rubric").value = $("choices").value = q.criteria.join("\n");
      document.querySelector(`input[name=type][value=${q.type}]`).checked = true;
      status("");
    }
    function presetsForType() {
      $("preset").replaceChildren(...DEMO.questions.filter(q => q.type === primitive()).map(q => new Option(q.column_name, q.column_name)));
      selectPreset();
    }
    document.querySelectorAll("input[name=type]").forEach(r => r.onchange = presetsForType);
    $("preset").onchange = selectPreset;
    window.addEventListener("resize", fitInstruction);
    $("apply").onclick = () => {
      if (!visibleIds.length) return status("No rows to apply to. Clear or adjust your filters.");
      const q = DEMO.questions.find(q => q.column_name === $("preset").value);
      let g = GENERATED.find(g => g.column_name === q.column_name);
      if (!g) { g = {...q, answers: {}}; GENERATED.push(g); }
      for (const id of visibleIds) g.answers[id] = {...q.answers[id]};
      render();
      status("");
    };

    $("f-col").onchange = $("f-op").onchange = updateValueField;
    $("f-add").onclick = () => {
      const value = $("f-pick").hidden ? $("f-val").value.trim().replace(/^["']|["']$/g, "") : $("f-pick").value;
      if (!value) return;
      filters.push({ label: $("f-col").value, op: $("f-op").value, value });
      $("f-val").value = "";
      render();
    };
    $("f-val").onkeydown = (e) => { if (e.key === "Enter") $("f-add").click(); };
    $("f-clear").onclick = () => { filters = []; render(); };

    $("s-add").onclick = () => { // adds a sort level; re-applying a column already sorted on changes its direction
      const label = $("s-col").value, dir = Number($("s-dir").value);
      const s = sorts.find((s) => s.label === label);
      if (s) s.dir = dir; else sorts.push({ label, dir });
      render();
    };
    $("s-clear").onclick = () => { sorts = []; render(); };

    $("reset").onclick = () => {
      GENERATED = [];
      render();
      status("");
    };
    $("export").onclick = () => {
      const cols = allColumns();
      const rowsById = new Map(ROWS.map(r => [r.id, r]));
      const table = [cols.map(c => c.label), ...visibleIds.map(id => {
        const r = rowsById.get(id); return cols.map(c => c.get(r) ?? "");
      })];
      const questions = [["Column", "Type", "Instruction", "Criteria", "Model", "Rows applied"], ...GENERATED.map(g => [g.column_name, g.type, g.instruction, g.criteria.join("\n"), g.model, visibleIds.filter(id => g.answers[id]).length])];
      saveWorkbook([{name:"Table", rows:table}, {name:"Questions", rows:questions}]);
    };
    COLUMNS = DEMO.columns;
    ROWS = DEMO.rows;
    presetsForType();
    render();
