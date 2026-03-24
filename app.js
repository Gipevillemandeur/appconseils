// ============================================================
//  ÉTAT GLOBAL
// ============================================================
const subjectForm    = document.getElementById("subjects-form");
const subjectPreview = document.getElementById("subjects-preview");
const classSelect    = document.getElementById("input-class");
const loadSampleBtn  = document.getElementById("load-sample");
const principalSelect = document.getElementById("input-principal");

let classCodes = {};
let allClasses = [];
let config     = {};

// ============================================================
//  UTILITAIRES
// ============================================================
function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function setPreview(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
  const el2 = document.getElementById(id + "-p2");
  if (el2) el2.textContent = text;
}

function setPreviewHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ============================================================
//  BINDINGS FORMULAIRE → APERÇU
// ============================================================
const bindMap = [
  ["input-class",         "preview-title",        (v) => `Conseil de classe ${v || "—"}`],
  ["input-term",          "preview-term"],
  ["input-date",          "header-date",           formatDate],
  ["input-principal",     "preview-principal"],
  ["input-parents",       "preview-parents"],
  ["input-students",      "preview-students"],
  ["input-others",        "preview-others"],
  ["input-fel",           "preview-fel"],
  ["input-comp",          "preview-comp"],
  ["input-enc",           "preview-enc"],
  ["input-avc",           "preview-avc"],
  ["input-avt",           "preview-avt"],
  ["input-ava",           "preview-ava"],
  ["input-obs-principal", "preview-obs-principal"],
  ["input-obs-pp",        "preview-obs-pp"],
  ["input-obs-eleves",    "preview-obs-eleves"],
  ["input-obs-parents",   "preview-obs-parents"],
];

function setupBindings() {
  bindMap.forEach(([inputId, previewId, transform]) => {
    const input   = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;
    const update = () => {
      const value = input.value.trim();
      const text  = transform ? transform(value) : value || "—";
      if (input.tagName === "TEXTAREA") {
        setPreviewHTML(previewId, text.replace(/\n/g, "<br>"));
      } else {
        setPreview(previewId, text);
      }
    };
    input.addEventListener("input",  update);
    input.addEventListener("change", update);
    update();
  });
}

// ============================================================
//  TABLEAU MATIÈRES
// ============================================================
function createSubjectRow(values = {}) {
  const row     = document.createElement("div");
  row.className = "row";
  const matiere = document.createElement("input");
  matiere.value = values.matiere || "";
  const prof    = document.createElement("input");
  prof.value    = values.prof || "";
  const presentBtn = document.createElement("button");
  presentBtn.type  = "button";
  let isPresent    = values.present === "Oui" || values.present === "";
  const updateBtn  = () => {
    presentBtn.className   = isPresent ? "presence-btn present" : "presence-btn absent";
    presentBtn.textContent = isPresent ? "✓" : "✗";
  };
  updateBtn();
  presentBtn.addEventListener("click", () => { isPresent = !isPresent; updateBtn(); renderSubjects(); });
  row.appendChild(matiere); row.appendChild(prof); row.appendChild(presentBtn);
  matiere.addEventListener("input", renderSubjects);
  prof.addEventListener("input",    renderSubjects);
  row._getPresence = () => (isPresent ? "Oui" : "Non");
  return row;
}

function renderSubjects() {
  subjectPreview.innerHTML = "";
  subjectForm.querySelectorAll(".row:not(.header)").forEach((row) => {
    const inputs     = row.querySelectorAll("input");
    const previewRow = document.createElement("div");
    previewRow.className = "row";
    [inputs[0].value || "—", inputs[1].value || "—", row._getPresence()].forEach((text) => {
      const cell = document.createElement("div");
      cell.textContent = text;
      previewRow.appendChild(cell);
    });
    subjectPreview.appendChild(previewRow);
  });
}

function applyClassSubjects(entries = []) {
  subjectForm.querySelectorAll(".row:not(.header)").forEach(r => r.remove());
  if (entries.length === 0) {
    subjectForm.appendChild(createSubjectRow());
  } else {
    entries.forEach(entry => subjectForm.appendChild(createSubjectRow(entry)));
  }
  renderSubjects();
}

// ============================================================
//  CHARGEMENT À LA DEMANDE (une seule classe)
// ============================================================
async function loadClasseData(className) {
  const { apiKey, spreadsheetId } = config.googleSheets;
  const loading = document.getElementById("subjects-loading");
  loading.style.display = "block";
  subjectForm.querySelectorAll(".row:not(.header)").forEach(r => r.remove());
  try {
    const url  = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(className)}!A:C?key=${apiKey}`;
    const resp = await fetch(url);
    const json = await resp.json();
    const entries = json.values
      ? json.values.slice(1).map(row => ({ matiere: row[0] || "", prof: row[1] || "", present: row[2] || "" }))
      : [];
    applyClassSubjects(entries);
  } catch (err) {
    console.error("Erreur chargement classe :", err);
    applyClassSubjects([]);
  } finally {
    loading.style.display = "none";
  }
}

// ============================================================
//  CHARGEMENT INITIAL (meta + liste classes + direction)
// ============================================================
async function loadConfig() {
  try {
    const resp = await fetch("data/config.json");
    config = await resp.json();
  } catch (err) {
    showAccueilErreur(); return;
  }
  if (config.googleSheets?.apiKey) await loadMeta();
}

async function loadMeta() {
  const { apiKey, spreadsheetId } = config.googleSheets;
  try {
    const metaResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`);
    const metaData = await metaResp.json();
    const sheetNames = (metaData.sheets || []).map(s => s.properties.title);

    const promises = [];
    if (sheetNames.includes("code classe")) {
      promises.push(
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("code classe")}!A:B?key=${apiKey}`)
          .then(r => r.json()).then(json => {
            if (json.values) json.values.slice(1).forEach(row => { if (row[0]) classCodes[row[0]] = row[1]; });
          })
      );
    }
    if (sheetNames.includes("Direction")) {
      promises.push(
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("Direction")}!A:A?key=${apiKey}`)
          .then(r => r.json()).then(json => {
            if (json.values) setPrincipalOptions(json.values.flat().slice(1));
          })
      );
    }
    await Promise.all(promises);

    allClasses = sheetNames
      .filter(n => !["code classe", "direction"].includes(n.toLowerCase()))
      .sort();

    populateClasseSelects(allClasses);
    showAccueilFormulaire();
  } catch (err) {
    console.error("Erreur meta :", err);
    showAccueilErreur();
  }
}

function setPrincipalOptions(principals) {
  principalSelect.innerHTML = '<option value="">Selectionner</option>';
  principals.forEach(p => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = p;
    principalSelect.appendChild(opt);
  });
}

function populateClasseSelects(classes) {
  const accueilSelect = document.getElementById("accueil-classe");
  accueilSelect.innerHTML = '<option value="">— Sélectionner —</option>';
  classSelect.innerHTML   = '<option value="">Selectionner</option>';
  classes.forEach(n => {
    [accueilSelect, classSelect].forEach(sel => {
      const o = document.createElement("option");
      o.value = o.textContent = n;
      sel.appendChild(o);
    });
  });
}

// ============================================================
//  ÉCRAN D'ACCUEIL
// ============================================================
function showAccueilFormulaire() {
  document.getElementById("accueil-chargement").style.display = "none";
  document.getElementById("accueil-formulaire").style.display = "flex";
}

function showAccueilErreur() {
  document.getElementById("accueil-chargement").style.display = "none";
  document.getElementById("accueil-erreur").style.display     = "block";
}

document.getElementById("accueil-classe").addEventListener("change", (e) => {
  const btn = document.getElementById("accueil-btn-commencer");
  if (e.target.value) {
    btn.disabled = false;
    btn.textContent = "Commencer ➜";
  } else {
    btn.disabled = true;
    btn.textContent = "Sélectionnez une classe…";
  }
});

document.getElementById("accueil-btn-commencer").addEventListener("click", async () => {
  const classe    = document.getElementById("accueil-classe").value;
  const trimestre = document.getElementById("accueil-trim").value;
  const date      = document.getElementById("accueil-date").value;
  if (!classe) return;

  const codeRaw     = classCodes[classe];
  const codeAttendu = (codeRaw && codeRaw.toString().trim() !== "") ? codeRaw.toString().trim() : null;
  if (codeAttendu && sessionStorage.getItem(`access_${classe}`) !== "granted") {
    const codeSaisi = prompt(`Accès sécurisé GIPE.\nVeuillez entrer le code pour la classe ${classe} :`);
    if (codeSaisi === codeAttendu) {
      sessionStorage.setItem(`access_${classe}`, "granted");
    } else {
      alert("Code incorrect ! L'accès à cette classe est restreint.");
      return;
    }
  }

  classSelect.value = classe;
  document.getElementById("input-term").value = trimestre;
  if (date) document.getElementById("input-date").value = date;

  setupBindings();

  document.getElementById("screen-accueil").style.display = "none";
  document.getElementById("screen-app").style.display     = "block";

  await loadClasseData(classe);
});

// ============================================================
//  CHANGEMENT DE CLASSE DANS LE FORMULAIRE
// ============================================================
classSelect.addEventListener("change", async (e) => {
  const classe = e.target.value;
  if (!classe) { applyClassSubjects([]); return; }
  const codeRaw     = classCodes[classe];
  const codeAttendu = (codeRaw && codeRaw.toString().trim() !== "") ? codeRaw.toString().trim() : null;
  if (codeAttendu && sessionStorage.getItem(`access_${classe}`) !== "granted") {
    const codeSaisi = prompt(`Accès sécurisé GIPE.\nVeuillez entrer le code pour la classe ${classe} :`);
    if (codeSaisi === codeAttendu) {
      sessionStorage.setItem(`access_${classe}`, "granted");
    } else {
      alert("Code incorrect !"); classSelect.value = ""; applyClassSubjects([]); return;
    }
  }
  await loadClasseData(classe);
});

// ============================================================
//  BOUTONS
// ============================================================
document.getElementById("print").addEventListener("click", () => {
  if (confirm("Attention : veuillez bien sélectionner 'Enregistrer au format PDF' pour l'envoi au GIPE.")) {
    const classe    = classSelect.value || "Classe";
    const trimestre = document.getElementById("input-term").value || "Trimestre";
    const nomFichier = `Compte-rendu_${classe}_${trimestre}`.replace(/\s+/g, "_");
    const originalTitle = document.title;
    document.title = nomFichier;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 1000);
  }
});

document.getElementById("listing-eleves").addEventListener("click", () => {
  const classe = classSelect.value;
  if (!classe) { alert("Sélectionnez une classe"); return; }
  window.open(
    `listing-eleves.html?classe=${encodeURIComponent(classe)}&trimestre=${encodeURIComponent(document.getElementById("input-term").value)}&date=${document.getElementById("input-date").value}`,
    "_blank"
  );
});

loadSampleBtn.addEventListener("click", () => {
  const classe = classSelect.value;
  if (classe) loadClasseData(classe);
});

// ============================================================
//  MODALE AIDE
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  const helpModal = document.getElementById("help-modal");
  const helpBtn   = document.getElementById("open-help");
  const helpSpan  = document.querySelector(".close-btn");
  if (helpBtn && helpModal && helpSpan) {
    helpBtn.onclick  = () => { helpModal.style.display = "flex"; };
    helpSpan.onclick = () => { helpModal.style.display = "none"; };
    window.onclick   = (e) => { if (e.target === helpModal) helpModal.style.display = "none"; };
  }
});

// ============================================================
//  DÉMARRAGE
// ============================================================
setupBindings();
loadConfig();
