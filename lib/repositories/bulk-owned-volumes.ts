import "server-only";
import { withTransaction } from "@/lib/db";
import { parseVolumeSelection } from "@/lib/inventory/volume-selection";

export async function addOwnedVolumes(profileId: string, workId: string, editionId: string, selection: string) {
  const numbers = parseVolumeSelection(selection);
  return withTransaction(async (client) => {
    const edition = await client.query<{ id: string }>(
      `select e.id from editions e
       join works w on w.id=e.work_id
       join library_entries le on le.work_id=w.id and le.profile_id=$1
       where e.id=$2 and w.id=$3 and w.media_type='MANGA'
       and (coalesce(e.source_provider,'') not in ('USER','MANUAL')
         or exists(select 1 from ownership o where o.edition_id=e.id and o.profile_id=$1))
       for update of le`, [profileId, editionId, workId]);
    if (!edition.rows.length) throw new Error("Aggiungi prima la serie alla tua raccolta e scegli un’edizione disponibile.");
    const units = await client.query<{ id: string; unit_number: string | number }>(
      `select id,unit_number from content_units where edition_id=$1 and work_id=$2
       and unit_type='VOLUME' and unit_number=any($3::numeric[])`, [editionId, workId, numbers]);
    const found = new Set(units.rows.map((u) => Number(u.unit_number)));
    if (numbers.some((n) => !found.has(n))) throw new Error("Alcuni numeri non sono disponibili in questa edizione. Nessun volume aggiunto: verifica l’edizione o inserisci il volume speciale dalla scheda.");
    const format = await client.query<{ ownership_format: string }>("select ownership_format from ownership where profile_id=$1 and edition_id=$2", [profileId, editionId]);
    if (format.rows[0] && format.rows[0].ownership_format !== "PHYSICAL") throw new Error("Questa edizione è già registrata in un altro formato. Gestiscila dalla scheda.");
    await client.query(`insert into ownership(profile_id,edition_id,ownership_format,updated_at)
      values($1,$2,'PHYSICAL',now()) on conflict(profile_id,edition_id) do nothing`, [profileId, editionId]);
    const inserted = await client.query<{ unit_id: string }>(`insert into owned_units(profile_id,edition_id,unit_id)
      select $1,$2,unnest($3::uuid[]) on conflict(profile_id,edition_id,unit_id) do nothing returning unit_id`, [profileId, editionId, units.rows.map((u) => u.id)]);
    return { added: inserted.rows.length, alreadyOwned: units.rows.length - inserted.rows.length };
  });
}
