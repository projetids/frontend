import * as XLSX from "xlsx"

export type SplitResult = {
  familiesCount: number
  articlesCount: number
  excludedCount: number
  familyNames: string[]
}

function normalize(v: unknown): string {
  if (v == null) return ""
  return String(v).trim()
}

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim())
  return Number.isFinite(n) ? n : 0
}

function unitMap(v: unknown): "piece" | "bouteille" {
  return String(v ?? "").trim().toLowerCase() === "bouteille" ? "bouteille" : "piece"
}

/** Lit un fichier Articles.xls et génère les deux fichiers (familles + articles). */
export async function splitArticlesFile(file: File): Promise<SplitResult> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: "array" })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error("Aucune feuille trouvée dans le fichier.")
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })

  // 1. Familles distinctes
  const familySet = new Set<string>()
  for (const r of rows) {
    const fam = normalize(r["Famille"])
    if (fam) familySet.add(fam)
  }
  const familyNames = [...familySet].sort((a, b) => a.localeCompare(b))
  const familyIdByName = new Map<string, number>()
  familyNames.forEach((name, idx) => familyIdByName.set(name, idx + 1))

  // 2. Workbook familles
  const familiesData = familyNames.map((name, idx) => ({
    article_families_id: idx + 1,
    article_families_name: name,
  }))
  const familiesWb = XLSX.utils.book_new()
  const familiesWs = XLSX.utils.json_to_sheet(familiesData)
  XLSX.utils.book_append_sheet(familiesWb, familiesWs, "Familles")
  XLSX.writeFile(familiesWb, "Familles_Articles.xlsx")

  // 3. Articles
  let excludedCount = 0
  const articlesData: Record<string, unknown>[] = []
  for (const r of rows) {
    const fam = normalize(r["Famille"])
    if (!fam) {
      excludedCount += 1
      continue
    }
    const familyId = familyIdByName.get(fam)
    if (!familyId) {
      excludedCount += 1
      continue
    }
    const barcode = normalize(r["CodeBarre"]) || normalize(r["GenCode"]) || ""
    const plusCatalogue = r["PlusAuCatalogue"]
    const isPublish = plusCatalogue == null ? true : Number(plusCatalogue) !== 1

    articlesData.push({
      article_name: normalize(r["Designation"]),
      article_unit: unitMap(r["Unite"]),
      article_families_id: familyId,
      article_barcode: barcode || null,
      article_tva_rate: toNumber(r["TauxTVA"]),
      article_purchase_price_ht: toNumber(r["PUAchatHT"]),
      article_purchase_price_ttc: toNumber(r["PUAchatTTC"]),
      article_margin: toNumber(r["Marge"]),
      article_sale_price_ht: toNumber(r["PrixDeVenteHT"]),
      article_sale_price_ttc: toNumber(r["PrixDeVenteTTC"]),
      article_theoretical_stock: toNumber(r["QteEnStock"]),
      article_reserved_qty: toNumber(r["QuantitéReservée"]),
      article_available_qty: toNumber(r["QuantitéDisponible"]),
      article_location: normalize(r["Emplacement"]) || null,
      is_publish: isPublish,
    })
  }

  const articlesWb = XLSX.utils.book_new()
  const articlesWs = XLSX.utils.json_to_sheet(articlesData)
  XLSX.utils.book_append_sheet(articlesWb, articlesWs, "Articles")
  XLSX.writeFile(articlesWb, "Articles_Ajuste.xlsx")

  return {
    familiesCount: familyNames.length,
    articlesCount: articlesData.length,
    excludedCount,
    familyNames,
  }
}