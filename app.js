// ============================================================
//  ÉTAT GLOBAL
// ============================================================
const subjectForm    = document.getElementById("subjects-form");
const subjectPreview = document.getElementById("subjects-preview");
const classSelect    = document.getElementById("input-class");
const loadSampleBtn  = document.getElementById("load-sample");

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
            if (json.values) json.values.slice(1).forEach(row => { if (row[0]) classCodes[row[0]] = String(row[1]).trim(); });
          })
      );
    }
    if (sheetNames.includes("direction")) {
      promises.push(
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("direction")}!A:A?key=${apiKey}`)
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
  document.getElementById("input-principal").innerHTML = '<option value="">Selectionner</option>';
  principals.forEach(p => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = p;
    document.getElementById("input-principal").appendChild(opt);
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

function updateAccueilBtn() {
  const btn       = document.getElementById("accueil-btn-commencer");
  const codeWrap  = document.getElementById("accueil-code-wrap");
  const codeInput = document.getElementById("accueil-code");
  const codeErr   = document.getElementById("accueil-code-erreur");
  const classe    = document.getElementById("accueil-classe").value;
  const trim      = document.getElementById("accueil-trim").value;
  const date      = document.getElementById("accueil-date").value;

  // Afficher/cacher le champ code selon la classe choisie
  if (classe) {
    const codeRaw = classCodes[classe];
    const aUnCode = codeRaw && codeRaw.toString().trim() !== "";
    codeWrap.style.display = aUnCode ? "flex" : "none";
    if (!aUnCode) { codeInput.value = ""; codeErr.style.display = "none"; }
  } else {
    codeWrap.style.display = "none";
    codeInput.value = "";
    codeErr.style.display = "none";
  }

  // Activer le bouton seulement si tout est rempli
  const tout = classe && trim && date;
  btn.disabled = !tout;
  if (!classe) btn.textContent = "Sélectionnez une classe…";
  else if (!trim) btn.textContent = "Sélectionnez un trimestre…";
  else if (!date) btn.textContent = "Sélectionnez une date…";
  else btn.textContent = "Commencer ➜";
}

document.getElementById("accueil-classe").addEventListener("change", updateAccueilBtn);
document.getElementById("accueil-trim").addEventListener("change", updateAccueilBtn);
document.getElementById("accueil-date").addEventListener("change", updateAccueilBtn);

document.getElementById("accueil-btn-commencer").addEventListener("click", async () => {
  const classe    = document.getElementById("accueil-classe").value;
  const trimestre = document.getElementById("accueil-trim").value;
  const date      = document.getElementById("accueil-date").value;
  if (!classe) return;

  const codeRaw     = classCodes[classe];
  const codeAttendu = (codeRaw && codeRaw.toString().trim() !== "") ? codeRaw.toString().trim() : null;
  if (codeAttendu && sessionStorage.getItem(`access_${classe}`) !== "granted") {
    const codeInput = document.getElementById("accueil-code");
    const codeErr   = document.getElementById("accueil-code-erreur");
    const codeSaisi = codeInput ? codeInput.value.trim() : "";
    if (codeSaisi === codeAttendu) {
      sessionStorage.setItem(`access_${classe}`, "granted");
      codeErr.style.display = "none";
    } else {
      if (codeErr) codeErr.style.display = "block";
      if (codeInput) codeInput.focus();
      return;
    }
  }

  // Afficher l'écran app EN PREMIER
  document.getElementById("screen-accueil").style.display = "none";
  document.getElementById("screen-app").style.display     = "block";

  // Remplir les selects cachés (pour les bindings)
  classSelect.value = classe;
  document.getElementById("input-term").value = trimestre;
  if (date) document.getElementById("input-date").value = date;

  // Remplir les champs affichage lecture seule
  document.getElementById("input-class-display").value = classe;
  document.getElementById("input-term-display").value = trimestre;
  document.getElementById("input-date-display").value = formatDate(date);

  // Forcer la mise à jour de l'aperçu (les events ne se déclenchent pas sur setValue)
  setPreview("preview-title", `Conseil de classe ${classe || "—"}`);
  setPreview("preview-term", trimestre || "—");
  setPreview("header-date", formatDate(date));

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
// ============================================================
//  GÉNÉRATION PDF
// ============================================================
document.getElementById("print").addEventListener("click", () => generatePDF());

async function imageToBase64(url) {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const classe    = classSelect.value || "-";
  const trimestre = document.getElementById("input-term").value || "-";
  const date      = formatDate(document.getElementById("input-date").value);
  const principal = document.getElementById("input-principal").value || "-";
  const parents   = document.getElementById("input-parents").value || "-";
  const students  = document.getElementById("input-students").value || "-";
  const others    = document.getElementById("input-others").value || "-";
  const fel       = document.getElementById("input-fel").value || "-";
  const comp      = document.getElementById("input-comp").value || "-";
  const enc       = document.getElementById("input-enc").value || "-";
  const avc       = document.getElementById("input-avc").value || "-";
  const avt       = document.getElementById("input-avt").value || "-";
  const ava       = document.getElementById("input-ava").value || "-";
  const obsPrincipal = document.getElementById("input-obs-principal").value || "-";
  const obsPP        = document.getElementById("input-obs-pp").value || "-";
  const obsEleves    = document.getElementById("input-obs-eleves").value || "-";
  const obsParents   = document.getElementById("input-obs-parents").value || "-";

  const pageW = 210;
  const pageH = 297;
  const margin = 12;
  const colW = pageW - margin * 2;

  // Couleurs
  const colorAccent  = [31, 111, 139];   // #1f6f8b
  const colorMuted   = [93, 107, 123];   // #5d6b7b
  const colorLine    = [214, 221, 229];  // #d6dde5
  const colorHeader  = [240, 244, 247];  // #f0f4f7
  const colorInk     = [27, 31, 36];     // #1b1f24

  // ---- Fonction utilitaires ----
  function drawHeader(yStart, logoAcad, logoParents) {
    // Fond header
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...colorLine);
    doc.roundedRect(margin, yStart, colW, 28, 3, 3, "FD");

    // Logo academie (gauche)
    if (logoAcad) {
      doc.addImage(logoAcad, "PNG", margin + 2, yStart + 2, 22, 22);
    }

    // Logo parents (droite)
    if (logoParents) {
      doc.addImage(logoParents, "PNG", pageW - margin - 24, yStart + 2, 22, 22);
    }

    // Titre centre
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colorInk);
    doc.text("COMPTE RENDU DES PARENTS DELEGUES", pageW / 2, yStart + 8, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colorAccent);
    doc.text(`Conseil de classe ${classe} - ${trimestre}`, pageW / 2, yStart + 15, { align: "center" });

    doc.setTextColor(...colorMuted);
    doc.text(date, pageW / 2, yStart + 21, { align: "center" });

    return yStart + 32;
  }

  function drawSectionTitle(text, y) {
    doc.setFillColor(...colorAccent);
    doc.rect(margin, y, colW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(text.toUpperCase(), margin + 3, y + 4);
    return y + 8;
  }

  function drawTableHeader(cols, y, heights = 6) {
    doc.setFillColor(...colorHeader);
    doc.setDrawColor(...colorLine);
    doc.rect(margin, y, colW, heights, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...colorMuted);
    let x = margin;
    cols.forEach(([label, w]) => {
      doc.text(label.toUpperCase(), x + 2, y + 4);
      x += w;
    });
    return y + heights;
  }

  function drawTableRow(cells, y, rowH = 7, bg = null) {
    if (bg) { doc.setFillColor(...bg); doc.rect(margin, y, colW, rowH, "F"); }
    doc.setDrawColor(...colorLine);
    doc.rect(margin, y, colW, rowH);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...colorInk);
    let x = margin;
    cells.forEach(([text, w, align]) => {
      const tx = align === "center" ? x + w / 2 : x + 2;
      const lines = doc.splitTextToSize(text || "-", w - 3);
      doc.text(lines[0], tx, y + 5, { align: align || "left" });
      x += w;
    });
    return y + rowH;
  }

  function drawTextBlock(title, text, y) {
    const lines = doc.splitTextToSize(text || "-", colW - 6);
    const blockH = Math.max(14, lines.length * 4 + 8);

    // Verifier si on depasse la page
    if (y + blockH > pageH - margin) {
      doc.addPage();
      y = drawHeader(margin) + 4;
    }

    doc.setDrawColor(...colorLine);
    doc.setFillColor(250, 251, 252);
    doc.roundedRect(margin, y, colW, blockH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...colorMuted);
    doc.text(title.toUpperCase(), margin + 3, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colorInk);
    doc.text(lines, margin + 3, y + 9);
    return y + blockH + 3;
  }

  // Chargement des logos
  let logoAcad = null;
  let logoParents = null;
  try {
    logoAcad    = await imageToBase64("assets/logo-academie.svg");
    logoParents = await imageToBase64("assets/logo-parents.png");
  } catch(e) { console.warn("Logos non charges", e); }

  // ============ PAGE 1 ============
  let y = margin;
  y = drawHeader(y, logoAcad, logoParents);
  y += 2;

  // President de seance
  y = drawSectionTitle("President(e) de seance", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...colorInk);
  doc.text(principal, margin + 3, y + 4);
  y += 8;

  // Equipe pedagogique
  y = drawSectionTitle("Equipe pedagogique", y);
  const colsProfs = [["Matiere", 70], ["Professeur(s)", 100], ["Present", 16]];
  y = drawTableHeader(colsProfs, y);

  const rows = document.querySelectorAll("#subjects-form .row:not(.header)");
  rows.forEach((row, i) => {
    const inputs   = row.querySelectorAll("input");
    const presence = row._getPresence ? row._getPresence() : "Oui";
    const bg = i % 2 === 0 ? [255,255,255] : [248, 250, 252];
    const presColor = presence === "Oui" ? [39, 174, 96] : [231, 76, 60];

    // Fond de la ligne
    doc.setFillColor(...bg);
    doc.setDrawColor(...colorLine);
    doc.rect(margin, y, colW, 6, "FD");

    // Matiere et prof
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...colorInk);
    doc.text(doc.splitTextToSize(inputs[0]?.value || "-", 67)[0], margin + 2, y + 4);
    doc.text(doc.splitTextToSize(inputs[1]?.value || "-", 95)[0], margin + 73, y + 4);

    // Present en couleur (sans doublon)
    doc.setTextColor(...presColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(presence, pageW - margin - 8, y + 4, { align: "center" });

    y += 6;
  });
  doc.setTextColor(...colorInk);
  doc.setFont("helvetica", "normal");

  y += 4;

  // Participants
  y = drawSectionTitle("Participants", y);
  const colsPart = [["Parents delegues", 62], ["Eleves delegues", 62], ["Autres", 62]];
  y = drawTableHeader(colsPart, y);

  const maxLines = Math.max(
    parents.split("\n").length,
    students.split("\n").length,
    others.split("\n").length,
    1
  );
  const partH = Math.max(10, maxLines * 4 + 4);
  doc.setFillColor(255,255,255);
  doc.setDrawColor(...colorLine);
  doc.rect(margin, y, colW, partH, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colorInk);
  doc.text(doc.splitTextToSize(parents, 58), margin + 2, y + 4);
  doc.text(doc.splitTextToSize(students, 58), margin + 64, y + 4);
  doc.text(doc.splitTextToSize(others, 58), margin + 128, y + 4);
  y += partH + 4;

  // ============ PAGE 2 ============
  doc.addPage();
  y = margin;
  y = drawHeader(y, logoAcad, logoParents);
  y += 4;

  // Synthese
  y = drawSectionTitle("Synthese", y);
  const colsSynth = [["Felicitations", 32], ["Compliments", 32], ["Encouragements", 32], ["Av. comportement", 32], ["Av. travail", 32], ["Av. assiduite", 26]];
  y = drawTableHeader(colsSynth, y);
  y = drawTableRow([
    [fel, 32, "center"], [comp, 32, "center"], [enc, 32, "center"],
    [avc, 32, "center"], [avt, 32, "center"], [ava, 26, "center"]
  ], y, 8);
  y += 6;

  // Observations
  y = drawSectionTitle("Observations generales", y);
  y += 4;
  y = drawTextBlock("Direction / Principal(e)", obsPrincipal, y);
  y = drawTextBlock("Professeur principal", obsPP, y);
  y = drawTextBlock("Eleves delegues", obsEleves, y);
  y = drawTextBlock("Parents delegues", obsParents, y);

  // Sauvegarde
  const nomFichier = `Compte-rendu_${classe}_${trimestre}`.replace(/\s+/g, "_");
  doc.save(`${nomFichier}.pdf`);
}

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
//  ONGLETS MOBILE
// ============================================================
function switchTab(tab) {
  const formPanel    = document.querySelector(".form-panel");
  const previewPanel = document.querySelector(".preview-panel");
  const tabSaisie    = document.getElementById("tab-saisie");
  const tabApercu    = document.getElementById("tab-apercu");

  if (tab === "saisie") {
    formPanel.classList.remove("mobile-hidden");
    previewPanel.classList.remove("mobile-visible");
    tabSaisie.classList.add("active");
    tabApercu.classList.remove("active");
  } else {
    formPanel.classList.add("mobile-hidden");
    previewPanel.classList.add("mobile-visible");
    tabSaisie.classList.remove("active");
    tabApercu.classList.add("active");
  }
}

// ============================================================
//  DÉMARRAGE
// ============================================================
setupBindings();
loadConfig();
