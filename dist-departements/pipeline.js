import './env.js';
import { generateAllDepartementSvgs } from './generateAllSvgs.js';
import { uploadAllDepartementSvgs } from './uploadToSupabase.js';
import { seedDepartementsTable } from './seedDepartementsTable.js';
import { isMainModule } from './isMain.js';
export async function runDepartementsPipeline() {
    const gen = await generateAllDepartementSvgs();
    const upload = await uploadAllDepartementSvgs();
    const seed = await seedDepartementsTable();
    const base = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
    const examples = {
        '75': `${base}/storage/v1/object/public/france-departements-maps/svg/75.svg`,
        '69': `${base}/storage/v1/object/public/france-departements-maps/svg/69.svg`,
        '2A': `${base}/storage/v1/object/public/france-departements-maps/svg/2A.svg`
    };
    console.log('--- Departements Pipeline Summary ---');
    console.log(`Generated SVGs: ${gen.generated}`);
    console.log(`Uploaded SVGs: ${upload.uploaded}`);
    console.log(`Departements upserted: ${seed.upserted}`);
    console.log(`Preview: out/departements/preview.html`);
    console.log(`Example URLs:`);
    console.log(`- 75: ${examples['75']}`);
    console.log(`- 69: ${examples['69']}`);
    console.log(`- 2A: ${examples['2A']}`);
}
if (isMainModule(import.meta.url)) {
    await runDepartementsPipeline();
}
