<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Listing élèves - Conseil de classe</title>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "Source Sans 3", "Segoe UI", Arial, sans-serif;
        padding: 20px;
      }

      .header {
        text-align: center;
        margin-bottom: 20px;
      }

      .header h1 {
        margin: 0;
        font-size: 18px;
        text-transform: uppercase;
      }

      .header p {
        margin: 5px 0 0 0;
        font-size: 14px;
        color: #666;
      }

      .listing-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        table-layout: fixed;
      }

      .listing-table th,
      .listing-table td {
        border: 1px solid #333;
        padding: 6px 4px;
        text-align: center;
      }

      .listing-table th {
        background: #f0f0f0;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 10px;
      }

      .listing-table td {
        height: 60px;
      }

      .listing-table .col-nom {
        width: 3cm;
        min-width: 3cm;
        max-width: 3cm;
        text-align: left;
      }

      .listing-table .col-prenoms {
        width: 3cm;
        min-width: 3cm;
        max-width: 3cm;
        text-align: left;
      }

      .listing-table .col-observations {
        width: auto;
        text-align: left;
      }

      .listing-table .col-f,
      .listing-table .col-c,
      .listing-table .col-e,
      .listing-table .col-at,
      .listing-table .col-ac,
      .listing-table .col-aa {
        width: 1.2cm !important;
        min-width: 1.2cm !important;
        max-width: 1.2cm !important;
        font-size: 8px !important;
        word-break: break-word;
        white-space: normal;
        overflow-wrap: break-word;
      }

      .avertissements-header {
        border-bottom: none !important;
        padding-bottom: 2px !important;
        font-size: 8px;
      }

      .no-print {
        margin-bottom: 20px;
        text-align: center;
      }

      .btn {
        padding: 10px 20px;
        background: #1f6f8b;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      }

      @media print {
        body {
          padding: 10px;
        }

        .no-print {
          display: none;
        }

        @page {
          size: landscape;
          margin: 15mm;
        }

        .listing-table {
          page-break-inside: auto;
        }

        .listing-table thead {
          display: table-header-group;
        }

        .listing-table tr {
          page-break-inside: avoid;
        }

        /* Force 9 lignes par page (1 header + 8 élèves) */
        .listing-table tbody tr:nth-child(8n+9) {
          page-break-after: always;
        }
      }
    </style>
  </head>
  <body>
    <div class="no-print">
      <button class="btn" onclick="window.print()">Imprimer</button>
    </div>

    <div class="header">
      <h1>Listing élèves - Conseil de classe</h1>
      <p id="class-info">Classe : <span id="class-name">-</span> | Trimestre : <span id="term-name">-</span> | Date : <span id="date-info">-</span></p>
    </div>

    <table class="listing-table">
      <thead>
        <tr>
          <th class="col-nom">Nom</th>
          <th class="col-prenoms">Prénom</th>
          <th class="col-observations">Observations</th>
          <th class="col-f">F</th>
          <th class="col-c">C</th>
          <th class="col-e">E</th>
          <th class="col-at">AT</th>
          <th class="col-ac">AC</th>
          <th class="col-aa">AA</th>
        </tr>
      </thead>
      <tbody id="listing-body">
        <!-- Les lignes seront générées par JavaScript -->
      </tbody>
    </table>

    <script>
      // Récupère les paramètres URL
      const params = new URLSearchParams(window.location.search);
      const className = params.get('classe') || '-';
      const term = params.get('trimestre') || '-';
      const date = params.get('date') || '-';

      document.getElementById('class-name').textContent = className;
      document.getElementById('term-name').textContent = term;
      document.getElementById('date-info').textContent = date;

      // Génère 32 lignes vierges (4 pages × 8 lignes)
      const tbody = document.getElementById('listing-body');
      for (let i = 0; i < 32; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="col-nom"></td>
          <td class="col-prenoms"></td>
          <td class="col-observations"></td>
          <td class="col-f"></td>
          <td class="col-c"></td>
          <td class="col-e"></td>
          <td class="col-at"></td>
          <td class="col-ac"></td>
          <td class="col-aa"></td>
        `;
        tbody.appendChild(row);
      }
    </script>
    <script src="listing-eleves-data.js"></script>
  </body>
</html>
