const XLSX = require("xlsx");
const path = require("path");

const input = path.join(__dirname, "..", "docs", "data_articles", "Articles.xls");
const outDir = path.join(__dirname, "..", "docs", "data_articles");

const wb = XLSX.readFile(input);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws);

const familyNames = [...new Set(rows.map((r) => (r.Famille || "").toString().trim()).filter(Boolean))].sort((a, b) =>
  a.localeCompare(b, "fr")
);
const familyIdByName = new Map();
familyNames.forEach((name, idx) => familyIdByName.set(name, idx + 1));

const familyRows = familyNames.map((name, idx) => ({
  article_families_id: idx + 1,
  article_families_name: name,
}));

const familyWb = XLSX.utils.book_new();
const familyWs = XLSX.utils.json_to_sheet(familyRows, {
  header: ["article_families_id", "article_families_name"],
});
XLSX.utils.book_append_sheet(familyWb, familyWs, "Familles");
XLSX.writeFile(familyWb, path.join(outDir, "Familles_Articles.xlsx"));
XLSX.writeFile(familyWb, path.join(outDir, "Familles_Articles.xls"), { bookType: "xls" });

const articleRows = [];
let skipped = 0;
for (const r of rows) {
  const family = (r.Famille || "").toString().trim();
  if (!family || !familyIdByName.has(family)) {
    skipped++;
    continue;
  }
  const unite = (r.Unite || "").toString().trim();
  const article_unit = unite === "Bouteille" ? "bouteille" : "piece";
  const barcode = (r.CodeBarre || r.GenCode || "").toString().trim();
  articleRows.push({
    article_name: (r.Designation || "").toString().trim(),
    article_unit,
    article_families_id: familyIdByName.get(family),
    article_barcode: barcode || null,
    article_tva_rate: r.TauxTVA ?? 0,
    article_purchase_price_ht: r.PUAchatHT ?? 0,
    article_purchase_price_ttc: r.PUAchatTTC ?? 0,
    article_margin: r.Marge ?? 0,
    article_sale_price_ht: r.PrixDeVenteHT ?? 0,
    article_sale_price_ttc: r.PrixDeVenteTTC ?? 0,
    article_theoretical_stock: r.QteEnStock ?? 0,
    article_reserved_qty: r.QuantitéReservée ?? r.QuantiteReservee ?? 0,
    article_available_qty: r.QuantitéDisponible ?? r.QuantiteDisponible ?? 0,
    article_location: (r.Emplacement || "").toString().trim() || null,
    is_publish: r.PlusAuCatalogue !== 1,
  });
}

const articleWb = XLSX.utils.book_new();
const articleWs = XLSX.utils.json_to_sheet(articleRows, {
  header: [
    "article_name",
    "article_unit",
    "article_families_id",
    "article_barcode",
    "article_tva_rate",
    "article_purchase_price_ht",
    "article_purchase_price_ttc",
    "article_margin",
    "article_sale_price_ht",
    "article_sale_price_ttc",
    "article_theoretical_stock",
    "article_reserved_qty",
    "article_available_qty",
    "article_location",
    "is_publish",
  ],
});
XLSX.utils.book_append_sheet(articleWb, articleWs, "Articles");
XLSX.writeFile(articleWb, path.join(outDir, "Articles_Ajuste.xlsx"));
XLSX.writeFile(articleWb, path.join(outDir, "Articles_Ajuste.xls"), { bookType: "xls" });

console.log("Familles:", familyRows.length);
console.log("Articles exportes:", articleRows.length);
console.log("Lignes exclues (sans famille):", skipped);
