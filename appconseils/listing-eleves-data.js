/**
 * Fichier : listing-eleves-data.js
 * Version : Édition interactive (Observations éditables, Nom/Prénom verrouillés)
 */

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const className = params.get('classe');
    const trimestre = params.get('trimestre') || "Non spécifié";
    const dateVal = params.get('date');
    const autoPrint = params.get('print') === 'true';

    if (!className || className === "null" || className === "-") {
        alert("Erreur : Aucune classe sélectionnée.");
        return;
    }

    // Mise à jour des titres
    if(document.getElementById('display-classe')) document.getElementById('display-classe').textContent = className;
    if(document.getElementById('display-trimestre')) document.getElementById('display-trimestre').textContent = trimestre;
    if(document.getElementById('display-date')) {
        document.getElementById('display-date').textContent = dateVal ? new Date(dateVal).toLocaleDateString('fr-FR') : "____/____/202__";
    }

    const tbody = document.getElementById('listing-body');
    if(!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="9">Chargement des élèves...</td></tr>';

    try {
        const configResp = await fetch('data/config.json');
        const config = await configResp.json();
        const { apiKey, spreadsheetId } = config.googleSheets;

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(className)}!A:Z?key=${apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.values && data.values.length > 0) {
            tbody.innerHTML = ""; 

            const headers = data.values[0].map(h => h.toLowerCase().trim());
            const nomIdx = headers.findIndex(h => h.includes('nom'));
            const prenomIdx = headers.findIndex(h => h.includes('prenom') || h.includes('prénom'));

            const colNom = nomIdx !== -1 ? nomIdx : 0;
            const colPrenom = prenomIdx !== -1 ? prenomIdx : 1;

            const listeEleves = data.values.slice(1);
            
            listeEleves.forEach((row, index) => {
                const nom = (row[colNom] || "").trim();
                const prenom = (row[colPrenom] || "").trim();
                
                if (nom || prenom) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="col-nom">${nom.toUpperCase()}</td>
                        <td class="col-prenoms">${prenom}</td>
                        <td class="col-observations" contenteditable="true" style="background-color: #fffdf0; cursor: text;"></td>
                        <td class="col-f" onclick="toggleCell(this)"></td>
                        <td class="col-c" onclick="toggleCell(this)"></td>
                        <td class="col-e" onclick="toggleCell(this)"></td>
                        <td class="col-at" onclick="toggleCell(this)"></td>
                        <td class="col-ac" onclick="toggleCell(this)"></td>
                        <td class="col-aa" onclick="toggleCell(this)"></td>
                    `;
                    tbody.appendChild(tr);
                }
            });

            // Lancer l'impression seulement si demandé par le bouton "Vierge"
            if (autoPrint) {
                setTimeout(() => { window.print(); }, 1000);
            }

        } else {
            tbody.innerHTML = `<tr><td colspan="9">L'onglet "${className}" est vide.</td></tr>`;
        }

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="9">Erreur de connexion aux données.</td></tr>`;
    }
});

/**
 * Fonction pour cocher/décocher une case au clic
 */
function toggleCell(cell) {
    if (cell.textContent === "X") {
        cell.textContent = "";
        cell.style.backgroundColor = "";
    } else {
        cell.textContent = "X";
        cell.style.fontWeight = "bold";
        cell.style.textAlign = "center";
    }
}