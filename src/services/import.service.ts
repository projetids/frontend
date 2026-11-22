import { apiRequest } from "@/lib/api-client"

export type ImportResult = {
  imported: number
  errors: { row: number; field: string; message: string }[]
  entity: string
}

/** POST /import/:entity — import général depuis un fichier Excel. */
export async function importEntity(
  entity: string,
  file: File,
  point_of_sale_id?: string
) {
  const formData = new FormData()
  formData.append("file", file)
  const query = point_of_sale_id ? { point_of_sale_id } : undefined
  const envelope = await apiRequest<ImportResult>(`/import/${entity}`, {
    method: "POST",
    body: formData,
    query,
  })
  return {
    envelope,
    imported: envelope.data.imported,
    errors: envelope.data.errors,
  }
}