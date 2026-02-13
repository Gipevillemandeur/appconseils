const subjectForm = document.getElementById("subjects-form");
const subjectPreview = document.getElementById("subjects-preview");
const classSelect = document.getElementById("input-class");
const loadSampleBtn = document.getElementById("load-sample");
const principalSelect = document.getElementById("input-principal");

let csvData = {};
let config = { principals: [] };

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

const bindMap = [
  ["input-class", "preview-title", (v) => `Conseil de classe ${v || "-"}`],
  ["input-term", "preview-term"],
  ["input-date", "header-date", formatDate],
  ["input-principal", "preview-principal"],
  ["input-parents", "preview-parents"],
  ["input-students", "preview-students"],
  ["input-others", "preview-others"],
  ["input-fel", "preview-fel"],
  ["input-comp", "preview-comp"],
  ["input-enc", "preview-enc"],
  ["input-avc", "preview-avc"],
  ["input-avt", "preview-avt"],
  ["input-ava", "preview-ava"],
  ["input-obs-principal", "preview-obs-principal"],
  ["input-obs-pp", "preview-obs-pp"],
  ["input-obs-eleves", "preview-obs-eleves"],
];

function setPreviewText(inputId, previewId, transform) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  const update = () => {
    const value = input.value.trim();
    const text = transform ? transform(value) : value || "-";
    if (input.tagName === "TEXTAREA") {
      preview.innerHTML = text.replace(/\n/g, '<br>');
    } else {
      preview.textContent = text;
    }
  };
  input.addEventListener("input", update);
  input.addEventListener("change", update);
  update();
}

bindMap.forEach(([inputId, previewId, transform]) => setPreviewText(inputId, previewId, transform));

function createSubjectRow(values = {}) {
  const row = document.createElement("div");
  row.className = "row";
  const matiere = document.createElement("input");
  matiere.value = values.matiere || "";
  const prof = document.createElement("input");
  prof.value = values.prof || "";
  const presentBtn = document.createElement("button");
  presentBtn.type = "button";
  presentBtn.className = "presence-btn";
  let isPresent = values.present === "Oui" || values.present === "";
  const updatePresenceBtn = () => {
    presentBtn.className = isPresent ? "presence-btn present" : "presence-btn absent";
    presentBtn.textContent = isPresent ? "✓" : "✗";
  };
  updatePresenceBtn();
  presentBtn.addEventListener("click", () => { isPresent = !isPresent; updatePresenceBtn(); renderSubjects(); });
  row.appendChild(matiere); row.appendChild(prof); row.appendChild(presentBtn);
  const onChange = () => renderSubjects();
  matiere.addEventListener("input", onChange); prof.addEventListener("input", onChange);
  row._getPresence = () => isPresent ? "Oui" : "Non";
  return row;
}

function renderSubjects() {
  subjectPreview.innerHTML = "";
  const rows = subjectForm.querySelectorAll(".row:not(.header)");
  rows.forEach((row) => {
    const inputs = row.querySelectorAll("input");
    const previewRow = document.createElement("div");
    previewRow.className = "row";
    [inputs[0].value || "-", inputs[1].value || "-", row._getPresence()].forEach((text) => {
      const cell = document.createElement("div");
      cell.textContent = text;
      previewRow.appendChild(cell);
    });
    subjectPreview.appendChild(previewRow);
  });
}

function applyClassSubjects(className) {
    const rows = subjectForm.querySelectorAll(".row:not(.header)");
    rows.forEach(r => r.remove());
    const entries = csvData[className] || [];
    if (entries.length === 0) {
        subjectForm.appendChild(createSubjectRow());
    } else {
        entries.forEach(entry => subjectForm.appendChild(createSubjectRow(entry)));
    }
    renderSubjects();
}

// --- ACTIONS BOUTONS ---

document.getElementById("print").addEventListener("click", () => {
    const alertMsg = "Attention : veuillez bien sélectionner 'Enregistrer au format PDF' pour l'envoi au GIPE.";
    if (confirm(alertMsg)) {
        const classe = classSelect.value || "Classe";
        const trimestre = document.getElementById("input-term").value || "Trimestre";
        const nomFichier = `Compte-rendu_${classe}_${trimestre}`.replace(/\s+/g, '_');
        const originalTitle = document.title;
        document.title = nomFichier;
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 1000);
    }
});

document.getElementById("listing-eleves").addEventListener("click", () => {
  const classe = classSelect.value;
  if(!classe) { alert("Sélectionnez une classe"); return; }
  window.open(`listing-eleves.html?classe=${encodeURIComponent(classe)}&trimestre=${encodeURIComponent(document.getElementById("input-term").value)}&date=${document.getElementById("input-date").value}`, '_blank');
});

document.getElementById("print-vierge").addEventListener("click", () => {
  const classe = classSelect.value;
  if(!classe) { alert("Sélectionnez une classe"); return; }
  window.open(`listing-eleves.html?print=true&classe=${encodeURIComponent(classe)}&trimestre=${encodeURIComponent(document.getElementById("input-term").value)}&date=${document.getElementById("input-date").value}`, '_blank');
});

// --- CHARGEMENT ---

async function loadConfig() {
  try {
    const response = await fetch("data/config.json");
    config = await response.json();
    setPrincipalOptions(config.principals || []);
    if (config.googleSheets?.apiKey) loadGoogleSheets();
  } catch (err) { console.error(err); }
}

async function loadGoogleSheets() {
  const { apiKey, spreadsheetId } = config.googleSheets;
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
    const metaResponse = await fetch(metaUrl);
    const metaData = await metaResponse.json();
    csvData = {};
    const classes = [];
    for (const sheet of metaData.sheets || []) {
        const name = sheet.properties.title;
        if(name.toLowerCase() === "direction") continue;
        classes.push(name);
        const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(name)}!A:C?key=${apiKey}`;
        const resp = await fetch(dataUrl);
        const json = await resp.json();
        if (json.values) {
            csvData[name] = json.values.slice(1).map(row => ({
                matiere: row[0] || "", prof: row[1] || "", present: row[2] || ""
            }));
        }
    }
    classSelect.innerHTML = '<option value="">Selectionner</option>';
    classes.sort().forEach(n => {
        const o = document.createElement("option");
        o.value = o.textContent = n;
        classSelect.appendChild(o);
    });
  } catch (err) { console.error(err); }
}

function setPrincipalOptions(principals) {
  principalSelect.innerHTML = '<option value="">Selectionner</option>';
  principals.forEach(p => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = p;
    principalSelect.appendChild(opt);
  });
}

classSelect.addEventListener("change", (e) => applyClassSubjects(e.target.value));
loadSampleBtn.addEventListener("click", () => loadGoogleSheets());
loadConfig();