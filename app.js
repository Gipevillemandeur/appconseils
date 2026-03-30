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
  presentBtn.addEventListener("click", () => { isPresent = !isPresent; updateBtn(); renderSubjects(); sauvegarder(); });
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
  activerSauvegardeAuto();
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
document.getElementById("print").addEventListener("click", () => ouvrirApercu());

async function ouvrirApercu() {
  // Sauvegarder la version originale dès l'ouverture (pour comparaison future)
  const savedRaw = localStorage.getItem(SAVE_KEY);
  if (savedRaw) localStorage.setItem(SAVE_KEY_ORIGINAL, savedRaw);

  // Ouvrir la modale avec le spinner
  document.getElementById("modal-apercu").classList.add("open");
  document.getElementById("apercu-loading").style.display = "block";
  document.getElementById("apercu-iframe").style.display  = "none";
  document.getElementById("relecture-section").style.display = "none";

  // Générer le PDF en mémoire et l'afficher dans l'iframe
  try {
    const pdfBlob = await generatePDF(true); // true = aperçu seulement, pas de téléchargement
    const url = URL.createObjectURL(pdfBlob);
    const iframe = document.getElementById("apercu-iframe");
    iframe.src = url;
    iframe.style.display = "block";
    document.getElementById("apercu-loading").style.display = "none";

    // Générer le lien de relecture
    const lien = genererLienRelecture();
    if (lien) {
      document.getElementById("relecture-url").value = lien;
      document.getElementById("relecture-section").style.display = "block";
    }
  } catch(e) {
    console.error("Erreur aperçu PDF", e);
    document.getElementById("apercu-loading").textContent = "⚠️ Erreur lors de la génération de l'aperçu.";
  }
}

function fermerApercu() {
  document.getElementById("modal-apercu").classList.remove("open");
  // Libérer la mémoire de l'iframe
  const iframe = document.getElementById("apercu-iframe");
  if (iframe.src) URL.revokeObjectURL(iframe.src);
  iframe.src = "";
}

function confirmerPDF() {
  fermerApercu();
  generatePDF(false); // false = télécharger
}

// ============================================================
//  LIEN DE RELECTURE
// ============================================================
function collecterDonnees() {
  return {
    classe:       classSelect.value,
    trimestre:    document.getElementById("input-term").value,
    date:         document.getElementById("input-date").value,
    principal:    document.getElementById("input-principal").value,
    parents:      document.getElementById("input-parents").value,
    students:     document.getElementById("input-students").value,
    others:       document.getElementById("input-others").value,
    fel:          document.getElementById("input-fel").value,
    comp:         document.getElementById("input-comp").value,
    enc:          document.getElementById("input-enc").value,
    avc:          document.getElementById("input-avc").value,
    avt:          document.getElementById("input-avt").value,
    ava:          document.getElementById("input-ava").value,
    obsPrincipal: document.getElementById("input-obs-principal").value,
    obsPP:        document.getElementById("input-obs-pp").value,
    obsEleves:    document.getElementById("input-obs-eleves").value,
    obsParents:   document.getElementById("input-obs-parents").value,
    presences:    Array.from(document.querySelectorAll("#subjects-form .row:not(.header)")).map(row => ({
      matiere: row.querySelectorAll("input")[0]?.value || "",
      prof:    row.querySelectorAll("input")[1]?.value || "",
      present: row._getPresence ? row._getPresence() : "Oui"
    }))
  };
}

function genererLien(type) {
  try {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(collecterDonnees()))));
    return `${window.location.origin}${window.location.pathname}?${type}=${encoded}`;
  } catch(e) {
    console.error("Erreur génération lien", e);
    return null;
  }
}

function genererLienRelecture() {
  // Sauvegarder la version originale au moment de générer le lien
  sauvegarder();
  setTimeout(() => {
    const savedRaw = localStorage.getItem(SAVE_KEY);
    if (savedRaw) localStorage.setItem(SAVE_KEY_ORIGINAL, savedRaw);
  }, 100);
  return genererLien("relecture");
}

// Génère un lien retour qui embarque les données modifiées + la version originale
function genererLienRetourAvecOriginal() {
  try {
    const dataModif    = collecterDonnees();
    // Utiliser la version originale stockée lors de l'ouverture du lien relecture
    const dataOriginal = window._donneesOriginalesParentA || null;

    const payload = { modif: dataModif, original: dataOriginal };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return `${window.location.origin}${window.location.pathname}?retour=${encoded}`;
  } catch(e) {
    console.error("Erreur génération lien retour", e);
    return null;
  }
}

function copierLienRelecture() {
  const input = document.getElementById("relecture-url");
  navigator.clipboard.writeText(input.value).then(() => {
    // Sauvegarder la version originale de Parent A pour comparaison future
    const savedRaw = localStorage.getItem(SAVE_KEY);
    if (savedRaw) localStorage.setItem(SAVE_KEY_ORIGINAL, savedRaw);

    const confirm = document.getElementById("copie-confirmation");
    confirm.style.display = "block";
    setTimeout(() => { confirm.style.display = "none"; }, 2500);
  });
}

// Vérifier si on arrive depuis un lien de relecture
// Remplir le formulaire depuis un objet data
function remplirFormulaire(data) {
  classSelect.value = data.classe;
  document.getElementById("input-term").value = data.trimestre;
  document.getElementById("input-date").value = data.date;
  document.getElementById("input-class-display").value = data.classe;
  document.getElementById("input-term-display").value  = data.trimestre;
  document.getElementById("input-date-display").value  = formatDate(data.date);
  setPreview("preview-title", `Conseil de classe ${data.classe}`);
  setPreview("preview-term",  data.trimestre);
  setPreview("header-date",   formatDate(data.date));
  applyClassSubjects(data.presences || []);
  const champs = [
    ["input-parents", data.parents], ["input-students", data.students],
    ["input-others", data.others], ["input-fel", data.fel],
    ["input-comp", data.comp], ["input-enc", data.enc],
    ["input-avc", data.avc], ["input-avt", data.avt], ["input-ava", data.ava],
    ["input-obs-principal", data.obsPrincipal], ["input-obs-pp", data.obsPP],
    ["input-obs-eleves", data.obsEleves], ["input-obs-parents", data.obsParents],
  ];
  champs.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) { el.value = val || ""; el.dispatchEvent(new Event("input")); }
  });
  setTimeout(() => {
    const principalEl = document.getElementById("input-principal");
    if (principalEl) { principalEl.value = data.principal || ""; principalEl.dispatchEvent(new Event("change")); }
  }, 500);
}

// Afficher les différences en rouge entre version originale et version retour
// Diff au niveau du MOT entre deux chaînes
function diffMots(origStr, newStr) {
  if (origStr === newStr) return origStr;

  const origMots = (origStr || "").split(/(\s+)/);
  const newMots  = (newStr  || "").split(/(\s+)/);

  // Algorithme LCS (Longest Common Subsequence) sur les mots
  const m = origMots.length;
  const n = newMots.length;
  const dp = Array.from({length: m + 1}, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origMots[i-1] === newMots[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }

  // Reconstruire le diff
  let html = "";
  let i = m, j = n;
  const parts = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origMots[i-1] === newMots[j-1]) {
      parts.unshift({ type: "same", val: origMots[i-1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      parts.unshift({ type: "add", val: newMots[j-1] });
      j--;
    } else {
      parts.unshift({ type: "del", val: origMots[i-1] });
      i--;
    }
  }

  parts.forEach(p => {
    if (p.type === "same") html += p.val;
    else if (p.type === "add") html += `<span class="diff-add">${p.val}</span>`;
    else html += `<span class="diff-del">${p.val}</span>`;
  });

  return html;
}

// Diff ligne par ligne, puis mot par mot dans chaque ligne
function diffTexte(origStr, newStr) {
  if (origStr === newStr) return null;

  const origLines = (origStr || "").split("\n");
  const newLines  = (newStr  || "").split("\n");
  const maxLen    = Math.max(origLines.length, newLines.length);
  let html = "";

  for (let i = 0; i < maxLen; i++) {
    const lo = origLines[i] !== undefined ? origLines[i] : null;
    const ln = newLines[i]  !== undefined ? newLines[i]  : null;

    if (lo === null) {
      // Ligne ajoutée
      html += `<span class="diff-add">${ln}</span>\n`;
    } else if (ln === null) {
      // Ligne supprimée
      html += `<span class="diff-del">${lo}</span>\n`;
    } else if (lo === ln) {
      // Ligne identique
      html += lo + "\n";
    } else {
      // Ligne modifiée → diff au niveau du mot
      html += diffMots(lo, ln) + "\n";
    }
  }

  return html.trim();
}

function afficherDifferences(original, retour) {
  // Champs texte multilignes
  const champsTexte = [
    ["input-parents", "parents"], ["input-students", "students"],
    ["input-others", "others"], ["input-obs-principal", "obsPrincipal"],
    ["input-obs-pp", "obsPP"], ["input-obs-eleves", "obsEleves"],
    ["input-obs-parents", "obsParents"],
  ];

  // Champs chiffres
  const champsChiffres = [
    ["input-fel", "fel"], ["input-comp", "comp"], ["input-enc", "enc"],
    ["input-avc", "avc"], ["input-avt", "avt"], ["input-ava", "ava"],
  ];

  // Champs select (principal)
  const champsSelect = [["input-principal", "principal"]];

  let nbDiffs = 0;

  // Traitement des textareas — afficher le diff inline
  champsTexte.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const valOrig   = (original[key] || "").trim();
    const valRetour = (retour[key]   || "").trim();
    if (valOrig === valRetour) return;

    nbDiffs++;

    // Remplacer le textarea par un div avec le diff
    const diffHtml = diffTexte(valOrig, valRetour);
    const diffDiv  = document.createElement("div");
    diffDiv.className = "diff-display no-print";
    diffDiv.innerHTML = diffHtml.replace(/\n/g, "<br>");
    diffDiv.style.cssText = "border:1px solid #d6dde5;border-radius:10px;padding:8px 10px;font-size:14px;font-family:inherit;background:#fffdf0;white-space:pre-wrap;min-height:40px;";
    el.style.display = "none";
    el.parentNode.insertBefore(diffDiv, el.nextSibling);
  });

  // Traitement des chiffres — afficher barré → nouveau
  champsChiffres.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const valOrig   = (original[key] || "").trim();
    const valRetour = (retour[key]   || "").trim();
    if (valOrig === valRetour) return;

    nbDiffs++;
    const diffDiv = document.createElement("div");
    diffDiv.className = "diff-display no-print";
    diffDiv.innerHTML = `<span class="diff-del">${valOrig || "0"}</span> → <span class="diff-add">${valRetour || "0"}</span>`;
    diffDiv.style.cssText = "font-size:14px;font-weight:700;margin-top:4px;";
    el.style.opacity = "0.3";
    el.parentNode.insertBefore(diffDiv, el.nextSibling);
  });

  // Traitement des selects
  champsSelect.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const valOrig   = (original[key] || "").trim();
    const valRetour = (retour[key]   || "").trim();
    if (valOrig === valRetour) return;

    nbDiffs++;
    const diffDiv = document.createElement("div");
    diffDiv.className = "diff-display no-print";
    diffDiv.innerHTML = `<span class="diff-del">${valOrig || "—"}</span> → <span class="diff-add">${valRetour || "—"}</span>`;
    diffDiv.style.cssText = "font-size:13px;margin-top:4px;";
    el.parentNode.insertBefore(diffDiv, el.nextSibling);
  });

  // Comparer présences + matières + profs
  const rows = document.querySelectorAll("#subjects-form .row:not(.header)");
  (retour.presences || []).forEach((p, i) => {
    const orig = (original.presences || [])[i];
    if (!orig || !rows[i]) return;
    const inputs = rows[i].querySelectorAll("input");

    // Diff matière
    if (orig.matiere !== p.matiere && inputs[0]) {
      const diffDiv = document.createElement("div");
      diffDiv.className = "diff-display no-print";
      diffDiv.innerHTML = diffMots(orig.matiere, p.matiere);
      diffDiv.style.cssText = "font-size:12px;margin-top:2px;background:#fffdf0;padding:2px 4px;border-radius:4px;";
      inputs[0].style.opacity = "0.4";
      inputs[0].parentNode.insertBefore(diffDiv, inputs[0].nextSibling);
      nbDiffs++;
    }

    // Diff prof
    if (orig.prof !== p.prof && inputs[1]) {
      const diffDiv = document.createElement("div");
      diffDiv.className = "diff-display no-print";
      diffDiv.innerHTML = diffMots(orig.prof, p.prof);
      diffDiv.style.cssText = "font-size:12px;margin-top:2px;background:#fffdf0;padding:2px 4px;border-radius:4px;";
      inputs[1].style.opacity = "0.4";
      inputs[1].parentNode.insertBefore(diffDiv, inputs[1].nextSibling);
      nbDiffs++;
    }

    // Diff présence
    if (orig.present !== p.present) {
      const btn = rows[i].querySelector(".presence-btn");
      if (btn) {
        const diffSpan = document.createElement("span");
        diffSpan.className = "diff-display no-print";
        diffSpan.innerHTML = `<span class="diff-del">${orig.present}</span>→<span class="diff-add">${p.present}</span>`;
        diffSpan.style.cssText = "font-size:11px;display:block;text-align:center;margin-top:2px;";
        btn.parentNode.appendChild(diffSpan);
      }
      nbDiffs++;
    }
  });

  return nbDiffs;
}

function verifierLienRelecture() {
  const params  = new URLSearchParams(window.location.search);
  const encodedRelecture = params.get("relecture");
  const encodedRetour    = params.get("retour");

  // ---- MODE RELECTURE (Parent B) ----
  if (encodedRelecture) {
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(encodedRelecture))));
      if (!data.classe) return false;

      // Stocker la version originale dans une variable globale
      // pour l'embarquer dans le lien retour
      window._donneesOriginalesParentA = data;

      document.getElementById("screen-accueil").style.display = "none";
      document.getElementById("screen-app").style.display     = "block";
      remplirFormulaire(data);

      // Activer la sauvegarde auto pour Parent B (pour capturer ses modifs)
      activerSauvegardeAuto();

      // Afficher bannière relecture sur le formulaire
      const banniereB = document.createElement("div");
      banniereB.style.cssText = "background:#fff3cd;border:1px solid #f2a541;border-radius:10px;padding:12px 16px;margin-bottom:14px;font-size:13px;font-weight:600;color:#856404;display:flex;align-items:center;gap:10px;";
      banniereB.innerHTML = `<span style="font-size:20px">👁️</span><span><strong>Mode relecture</strong> — Vérifiez et modifiez si besoin. Quand vous avez terminé, cliquez sur "📄 Générer PDF" pour envoyer vos modifications au parent rédacteur.</span>`;
      document.querySelector(".app").insertBefore(banniereB, document.querySelector(".grid"));

      // Modifier le bouton PDF pour qu'en mode relecture il génère un lien ?retour=
      document.getElementById("print").removeEventListener("click", ouvrirApercu);
      document.getElementById("print").onclick = () => {
        // Fermer la modale d'aperçu si elle est ouverte
        fermerApercu();

        // Générer le lien retour avec les données ACTUELLES + version originale pour comparaison
        const lienRetour = genererLienRetourAvecOriginal();
        if (!lienRetour) return;

        // Afficher une mini modale de partage
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:30000;display:flex;align-items:center;justify-content:center;padding:16px;";
        overlay.innerHTML = `
          <div style="background:#fff;border-radius:16px;padding:24px;max-width:480px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.25);">
            <div style="font-size:16px;font-weight:800;margin-bottom:12px;">📤 Envoyer au parent rédacteur</div>
            <p style="font-size:13px;color:#5d6b7b;margin-bottom:12px;">Copiez ce lien et envoyez-le au 1er parent. Il verra vos modifications surlignées en rouge.</p>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
              <input id="retour-url-final" type="text" readonly value="${lienRetour}" style="flex:1;border:1px solid #d6dde5;border-radius:8px;padding:8px 10px;font-size:11px;background:#f4f6f8;"/>
              <button id="btn-copier-retour" style="background:#e74c3c;color:#fff;border:none;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer;white-space:nowrap;">📋 Copier</button>
            </div>
            <div id="retour-copie-ok" style="display:none;color:#27ae60;font-size:12px;font-weight:600;margin-bottom:8px;">✅ Lien copié ! Vous pouvez fermer cette fenêtre.</div>
            <button onclick="this.closest('div[style]').remove()" style="width:100%;padding:11px;background:#f4f6f8;color:#5d6b7b;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:4px;">✖ Fermer</button>
          </div>
        `;
        document.body.appendChild(overlay);

        // Bouton copier
        document.getElementById("btn-copier-retour").onclick = () => {
          navigator.clipboard.writeText(lienRetour).then(() => {
            effacerSauvegarde(); // Effacer le storage de Parent B
            document.getElementById("retour-copie-ok").style.display = "block";
          });
        };
      };

      return true;
    } catch(e) {
      console.error("Erreur relecture", e);
      return false;
    }
  }

  // ---- MODE RETOUR (Parent A reçoit les modifications) ----
  if (encodedRetour) {
    try {
      const payload = JSON.parse(decodeURIComponent(escape(atob(encodedRetour))));

      // Supporter les deux formats : {modif, original} ou directement les données
      const dataRetour = payload.modif || payload;
      const original   = payload.original || null;

      if (!dataRetour.classe) return false;

      document.getElementById("screen-accueil").style.display = "none";
      document.getElementById("screen-app").style.display     = "block";

      // Désactiver la sauvegarde auto pendant le remplissage
      window._sauvegardeDesactivee = true;

      // Remplir avec la version retour
      remplirFormulaire(dataRetour);

      // Réactiver la sauvegarde auto après le remplissage
      setTimeout(() => {
        window._sauvegardeDesactivee = false;
        activerSauvegardeAuto();
      }, 1000);

      // Afficher les différences après rendu
      setTimeout(() => {
        const nbDiffs = original ? afficherDifferences(original, dataRetour) : 0;

        // Bannière
        const banniere = document.createElement("div");
        banniere.style.cssText = "border-radius:10px;padding:12px 16px;margin-bottom:14px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:10px;";
        if (nbDiffs > 0) {
          banniere.style.background = "#fdecea";
          banniere.style.border     = "1px solid #e74c3c";
          banniere.style.color      = "#c0392b";
          banniere.innerHTML = `<span style="font-size:20px">✏️</span><span><strong>${nbDiffs} modification(s)</strong> apportée(s) par le 2ème parent sont surlignées en rouge. Vérifiez et générez le PDF quand vous êtes prêt.</span>`;
        } else {
          banniere.style.background = "#d4edda";
          banniere.style.border     = "1px solid #27ae60";
          banniere.style.color      = "#155724";
          banniere.innerHTML = `<span style="font-size:20px">✅</span><span><strong>Aucune modification</strong> — Le 2ème parent a validé le compte rendu tel quel. Vous pouvez générer le PDF.`;
        }
        document.querySelector(".app").insertBefore(banniere, document.querySelector(".grid"));
      }, 900);

      return true;
    } catch(e) {
      console.error("Erreur retour", e);
      return false;
    }
  }

  return false;
}

function copierLienRetour() {
  const input = document.getElementById("retour-url");
  if (!input) return;
  navigator.clipboard.writeText(input.value).then(() => {
    // Effacer le storage de Parent B
    effacerSauvegarde();
    const confirm = document.getElementById("copie-retour-confirm");
    if (confirm) { confirm.style.display = "block"; setTimeout(() => { confirm.style.display = "none"; }, 2500); }
  });
}

async function imageToBase64(url) {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function generatePDF(apercuSeulement = false) {
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

  function drawTableHeader(cols, y, heights = 6, centered = false) {
    doc.setFillColor(...colorHeader);
    doc.setDrawColor(...colorLine);
    doc.rect(margin, y, colW, heights, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...colorMuted);
    let x = margin;
    cols.forEach(([label, w]) => {
      if (centered) {
        doc.text(label.toUpperCase(), x + w / 2, y + 4.5, { align: "center" });
      } else {
        doc.text(label.toUpperCase(), x + 2, y + 4.5);
      }
      x += w;
    });
    return y + heights;
  }

  function drawTableRow(cells, y, rowH = 7, bg = null) {
    if (bg) { doc.setFillColor(...bg); doc.rect(margin, y, colW, rowH, "F"); }
    doc.setDrawColor(...colorLine);
    doc.rect(margin, y, colW, rowH);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colorInk);
    let x = margin;
    cells.forEach(([text, w, align]) => {
      const lines = doc.splitTextToSize(text || "-", w - 2);
      if (align === "center") {
        doc.text(lines[0], x + w / 2, y + rowH / 2 + 1, { align: "center" });
      } else {
        doc.text(lines[0], x + 2, y + rowH / 2 + 1);
      }
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

  // Chargement des deux logos PNG
  let logoAcad = null;
  let logoParents = null;
  try {
    logoAcad    = await imageToBase64("assets/logo-academie.png");
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
  const col1x = margin + 2;
  const col2x = margin + 62 + 2;
  const col3x = margin + 124 + 2;
  doc.text(doc.splitTextToSize(parents, 58), col1x, y + 4);
  doc.text(doc.splitTextToSize(students, 58), col2x, y + 4);
  doc.text(doc.splitTextToSize(others, 58), col3x, y + 4);
  y += partH + 4;

  // ============ PAGE 2 ============
  doc.addPage();
  y = margin;
  y = drawHeader(y, logoAcad, logoParents);
  y += 4;

  // Synthese
  y = drawSectionTitle("Synthese", y);
  const colsSynth = [["Felicitations", 31], ["Compliments", 31], ["Encouragements", 31], ["Av. comportement", 31], ["Av. travail", 31], ["Av. assiduite", 31]];
  y = drawTableHeader(colsSynth, y, 6, true);
  y = drawTableRow([
    [fel, 31, "center"], [comp, 31, "center"], [enc, 31, "center"],
    [avc, 31, "center"], [avt, 31, "center"], [ava, 31, "center"]
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

  if (apercuSeulement) {
    // Retourner un Blob pour l'afficher dans l'iframe
    return doc.output("blob");
  } else {
    // Télécharger le PDF
    doc.save(`${nomFichier}.pdf`);
    effacerSauvegarde();
  }
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
//  SAUVEGARDE AUTOMATIQUE (localStorage)
// ============================================================

const SAVE_KEY          = "appconseils_sauvegarde";
const SAVE_KEY_ORIGINAL = "appconseils_sauvegarde_originale";

function sauvegarder() {
  if (window._sauvegardeDesactivee) return; // Désactivée pendant restauration
  const classe = classSelect.value;
  if (!classe) return; // Rien à sauvegarder si pas de classe

  const data = {
    classe:       classe,
    trimestre:    document.getElementById("input-term").value,
    date:         document.getElementById("input-date").value,
    principal:    document.getElementById("input-principal").value,
    parents:      document.getElementById("input-parents").value,
    students:     document.getElementById("input-students").value,
    others:       document.getElementById("input-others").value,
    fel:          document.getElementById("input-fel").value,
    comp:         document.getElementById("input-comp").value,
    enc:          document.getElementById("input-enc").value,
    avc:          document.getElementById("input-avc").value,
    avt:          document.getElementById("input-avt").value,
    ava:          document.getElementById("input-ava").value,
    obsPrincipal: document.getElementById("input-obs-principal").value,
    obsPP:        document.getElementById("input-obs-pp").value,
    obsEleves:    document.getElementById("input-obs-eleves").value,
    obsParents:   document.getElementById("input-obs-parents").value,
    // Présences des profs
    presences:    Array.from(document.querySelectorAll("#subjects-form .row:not(.header)")).map(row => ({
      matiere:  row.querySelectorAll("input")[0]?.value || "",
      prof:     row.querySelectorAll("input")[1]?.value || "",
      present:  row._getPresence ? row._getPresence() : "Oui"
    })),
    savedAt: new Date().toISOString()
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function effacerSauvegarde() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(SAVE_KEY_ORIGINAL);
}

function restaurerSauvegarde(data) {
  // Remplir les champs cachés
  classSelect.value = data.classe;
  document.getElementById("input-term").value    = data.trimestre;
  document.getElementById("input-date").value    = data.date;

  // Remplir les champs affichage lecture seule
  document.getElementById("input-class-display").value = data.classe;
  document.getElementById("input-term-display").value  = data.trimestre;
  document.getElementById("input-date-display").value  = formatDate(data.date);

  // Forcer l'aperçu header
  setPreview("preview-title", `Conseil de classe ${data.classe}`);
  setPreview("preview-term",  data.trimestre);
  setPreview("header-date",   formatDate(data.date));

  // Restaurer les matières avec les présences
  applyClassSubjects(data.presences.map(p => ({
    matiere: p.matiere,
    prof:    p.prof,
    present: p.present
  })));

  // Remplir les autres champs
  const champs = [
    ["input-parents",       data.parents],
    ["input-students",      data.students],
    ["input-others",        data.others],
    ["input-fel",           data.fel],
    ["input-comp",          data.comp],
    ["input-enc",           data.enc],
    ["input-avc",           data.avc],
    ["input-avt",           data.avt],
    ["input-ava",           data.ava],
    ["input-obs-principal", data.obsPrincipal],
    ["input-obs-pp",        data.obsPP],
    ["input-obs-eleves",    data.obsEleves],
    ["input-obs-parents",   data.obsParents],
  ];
  champs.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = val || "";
      el.dispatchEvent(new Event("input")); // Mettre à jour l'aperçu
    }
  });

  // Restaurer le principal après un court délai (le select doit être chargé)
  setTimeout(() => {
    const principalEl = document.getElementById("input-principal");
    if (principalEl) {
      principalEl.value = data.principal || "";
      principalEl.dispatchEvent(new Event("change"));
    }
  }, 500);
}

function verifierSauvegarde() {
  const saved = localStorage.getItem(SAVE_KEY);
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    if (!data.classe) return;

    const date = data.date ? ` du ${formatDate(data.date)}` : "";
    const msg  = `💾 Une saisie non terminée a été trouvée :

Classe ${data.classe} · ${data.trimestre}${date}

Voulez-vous la reprendre ?`;

    if (confirm(msg)) {
      // Afficher l'écran app directement
      document.getElementById("screen-accueil").style.display = "none";
      document.getElementById("screen-app").style.display     = "block";
      restaurerSauvegarde(data);
    } else {
      effacerSauvegarde();
    }
  } catch(e) {
    console.error("Erreur restauration sauvegarde", e);
    effacerSauvegarde();
  }
}

// Sauvegarde automatique sur chaque champ texte/number/select
function activerSauvegardeAuto() {
  const ids = [
    "input-parents", "input-students", "input-others",
    "input-fel", "input-comp", "input-enc",
    "input-avc", "input-avt", "input-ava",
    "input-obs-principal", "input-obs-pp", "input-obs-eleves", "input-obs-parents",
    "input-principal", "input-term", "input-date"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input",  () => sauvegarder());
      el.addEventListener("change", () => sauvegarder());
    }
  });
}

// Effacer la sauvegarde après génération du PDF
const _origGeneratePDF = generatePDF;
// (on appellera effacerSauvegarde() à la fin de generatePDF)

// ============================================================
//  DÉMARRAGE
// ============================================================
setupBindings();
loadConfig().then(() => {
  // Vérifier d'abord si on arrive depuis un lien de relecture
  if (!verifierLienRelecture()) {
    // Sinon vérifier s'il y a une sauvegarde
    setTimeout(verifierSauvegarde, 1500);
  }
});
