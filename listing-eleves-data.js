/**
 * Fichier : listing-eleves-data.js
 * Source : Dashboard GIPE / Supabase
 */

document.addEventListener('DOMContentLoaded', async () => {

    const params = new URLSearchParams(window.location.search);

    const className = params.get('classe');
    const code = params.get('code') || '';
    const trimestre = params.get('trimestre') || "Non spécifié";
    const dateVal = params.get('date');
    const autoPrint = params.get('print') === 'true';

    // ----------------------------------------------------------
    // Vérification minimale
    // ----------------------------------------------------------

    if (!className || className === "null" || className === "-") {
        alert("Erreur : Aucune classe sélectionnée.");
        return;
    }

    if (!code) {
        afficherErreur(
            "Accès refusé : aucun code de classe n'a été fourni."
        );
        return;
    }

    // ----------------------------------------------------------
    // Affichage des informations
    // ----------------------------------------------------------

    const classNameEl =
        document.getElementById('class-name');

    const termNameEl =
        document.getElementById('term-name');

    const dateInfoEl =
        document.getElementById('date-info');

    if (classNameEl) {
        classNameEl.textContent = className;
    }

    if (termNameEl) {
        termNameEl.textContent = trimestre;
    }

    if (dateInfoEl) {
        dateInfoEl.textContent =
            dateVal
                ? new Date(dateVal).toLocaleDateString('fr-FR')
                : "____/____/202__";
    }

    const tbody =
        document.getElementById('listing-body');

    if (!tbody) {
        return;
    }

    tbody.innerHTML =
        '<tr><td colspan="9">Vérification de l’accès...</td></tr>';

    // ----------------------------------------------------------
    // API Dashboard
    // ----------------------------------------------------------

    const DASHBOARD_API =
        "https://admin.gipevillemandeur.com/api/conseils/public";

    try {

        const url =
            `${DASHBOARD_API}` +
            `?classe=${encodeURIComponent(className)}` +
            `&code=${encodeURIComponent(code)}`;

        const resp =
            await fetch(url);

        const data =
            await resp.json();

        // ------------------------------------------------------
        // Erreur API
        // ------------------------------------------------------

        if (!resp.ok) {

            afficherErreur(
                data.error ||
                "Accès refusé."
            );

            return;
        }

        // ------------------------------------------------------
        // Élèves
        // ------------------------------------------------------

        const listeEleves =
            Array.isArray(data.students)
                ? data.students
                : [];

        tbody.innerHTML = "";

        if (listeEleves.length === 0) {

            tbody.innerHTML =
                `<tr>
                    <td colspan="9">
                        Aucun élève trouvé pour la classe ${className}.
                    </td>
                </tr>`;

            return;
        }

        // ------------------------------------------------------
        // Création des lignes
        // ------------------------------------------------------

        listeEleves.forEach((eleve) => {

            const nom =
                (eleve.last_name || "").trim();

            const prenom =
                (eleve.first_name || "").trim();

            if (!nom && !prenom) {
                return;
            }

            const tr =
                document.createElement('tr');

            tr.innerHTML = `
                <td class="col-nom">
                    ${escapeHtml(nom.toUpperCase())}
                </td>

                <td class="col-prenoms">
                    ${escapeHtml(prenom)}
                </td>

                <td
                    class="col-observations"
                    contenteditable="true"
                    style="background-color:#fffdf0;cursor:text;"
                ></td>

                <td
                    class="col-f"
                    onclick="toggleCell(this)"
                ></td>

                <td
                    class="col-c"
                    onclick="toggleCell(this)"
                ></td>

                <td
                    class="col-e"
                    onclick="toggleCell(this)"
                ></td>

                <td
                    class="col-at"
                    onclick="toggleCell(this)"
                ></td>

                <td
                    class="col-ac"
                    onclick="toggleCell(this)"
                ></td>

                <td
                    class="col-aa"
                    onclick="toggleCell(this)"
                ></td>
            `;

            tbody.appendChild(tr);
        });

        // ------------------------------------------------------
        // Impression automatique
        // ------------------------------------------------------

        if (autoPrint) {

            setTimeout(() => {
                window.print();
            }, 1000);
        }

    } catch (err) {

        console.error(
            "Erreur chargement listing Dashboard :",
            err
        );

        afficherErreur(
            "Erreur de connexion au Dashboard."
        );
    }
});


// ============================================================
//  AFFICHER UNE ERREUR
// ============================================================

function afficherErreur(message) {

    const tbody =
        document.getElementById('listing-body');

    if (!tbody) return;

    tbody.innerHTML =
        `<tr>
            <td colspan="9">
                ${escapeHtml(message)}
            </td>
        </tr>`;
}


// ============================================================
//  PROTECTION HTML
// ============================================================

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
//  COCHER / DÉCOCHER UNE CASE
// ============================================================

function toggleCell(cell) {

    if (cell.textContent === "X") {

        cell.textContent = "";
        cell.style.backgroundColor = "";
        cell.style.fontWeight = "";
        cell.style.textAlign = "";

    } else {

        cell.textContent = "X";
        cell.style.fontWeight = "bold";
        cell.style.textAlign = "center";
    }
}
