#!/usr/bin/env node
import 'dotenv/config'
/**
 * Script d'import DVF (valeurs foncières) dans Supabase
 *
 * Usage:
 *   node scripts/import-dvf.js <chemin-vers-fichier.txt|.zip>
 *
 * Options:
 *   --departements=01,69,75  Limiter aux départements (test rapide)
 *   --dry-run               Afficher sans insérer
 *
 * Variables d'environnement:
 *   SUPABASE_URL             (requis)
 *   SUPABASE_SERVICE_ROLE_KEY (requis)
 *
 * Format DVF Etalab : CSV séparé par |, encodage UTF-8
 * Colonnes attendues : id_mutation, date_mutation, valeur_fonciere, type_local,
 *   surface_reelle_bati, code_postal, code_commune, code_departement, etc.
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';
import { mkdtemp, rm, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { createClient } from '@supabase/supabase-js';

const BATCH_SIZE = 5000;
const VALID_TYPES = ['Maison', 'Appartement'];

// Mapping des colonnes DVF (plusieurs variantes possibles selon la source)
const COLUMN_ALIASES = {
  id_mutation: ['id_mutation', 'idmutation'],
  date_mutation: ['date_mutation', 'datemut'],
  valeur_fonciere: ['valeur_fonciere', 'valeurfonc', 'valeurfonciere'],
  type_local: ['type_local', 'typelocal', 'libtypbien'],
  surface_reelle_bati: ['surface_reelle_bati', 'surfacereellebati', 'sbati', 'sbatapt', 'sbatmai'],
  surface_terrain: ['surface_terrain', 'surfaceterrain', 'sterr'],
  nombre_pieces_principales: ['nombre_pieces_principales', 'nombrepiecesprincipales', 'ffnbloch'],
  code_postal: ['code_postal', 'codepostal', 'code_postal'],
  code_commune: ['code_commune', 'codecommune', 'l_codinsee'],
  code_departement: ['code_departement', 'codedepartement'],
  adresse_nom_voie: ['adresse_nom_voie', 'adressenomvoie', 'voie'],
  longitude: ['longitude', 'geompar_x'],
  latitude: ['latitude', 'geompar_y'],
};

function findColumnIndex(headers, aliases) {
  const normalized = headers.map((h) => String(h).toLowerCase().trim());
  for (const alias of aliases) {
    const idx = normalized.findIndex((h) => h === alias.toLowerCase() || h?.includes(alias.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseDate(val) {
  if (!val || val === '') return null;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return null;
}

function parseNum(val) {
  if (val === '' || val == null) return null;
  const n = parseFloat(String(val).replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

function parseIntSafe(val) {
  if (val === '' || val == null) return null;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? null : n;
}

async function extractZip(zipPath) {
  try {
    const unzipper = await import('unzipper');
    const fs = await import('fs');
    const tempDir = await mkdtemp(join(tmpdir(), 'dvf-'));
    await new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: tempDir }))
        .on('close', resolve)
        .on('error', reject);
    });
    const entries = await readdir(tempDir, { recursive: true });
    const txtFile = entries.find((e) => e.toLowerCase().endsWith('.txt'));
    if (!txtFile) {
      await rm(tempDir, { recursive: true });
      throw new Error('Aucun fichier .txt trouvé dans l\'archive');
    }
    const fullPath = join(tempDir, txtFile);
    return { fullPath, tempDir };
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' || e.message?.includes('unzipper')) {
      throw new Error(
        'Pour importer un .zip, installez : npm install unzipper\n' +
          'Ou extrayez l\'archive manuellement et pointez vers le fichier .txt'
      );
    }
    throw e;
  }
}

function normalizeDep(d) {
  const s = d.trim();
  return s.startsWith('97') ? s : s.padStart(2, '0');
}

async function runImport(filePath, options = {}) {
  const { departementsFilter, dryRun } = options;
  const deps = departementsFilter
    ? new Set(departementsFilter.split(',').map(normalizeDep))
    : null;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let txtPath = filePath;
  let tempDir = null;
  if (filePath.toLowerCase().endsWith('.zip')) {
    const { fullPath, tempDir: td } = await extractZip(filePath);
    txtPath = fullPath;
    tempDir = td;
  }

  const rl = createInterface({
    input: createReadStream(txtPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let headers = [];
  const colMap = {};
  let batch = [];
  let totalInserted = 0;
  let totalSkipped = 0;
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    const parts = line.split('|').map((p) => p.trim());

    if (lineNum === 1) {
      headers = parts;
      for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
        colMap[key] = findColumnIndex(headers, aliases);
      }
      const required = ['valeur_fonciere', 'type_local', 'surface_reelle_bati'];
      const missing = required.filter((k) => colMap[k] < 0);
      if (missing.length) {
        console.log('En-têtes détectés:', headers.slice(0, 20).join(' | '));
        throw new Error(`Colonnes manquantes: ${missing.join(', ')}`);
      }
      console.log('Mapping colonnes:', colMap);
      continue;
    }

    const get = (key) => {
      const idx = colMap[key];
      return idx >= 0 ? parts[idx] : undefined;
    };

    const typeLocal = get('type_local')?.trim();
    if (!VALID_TYPES.includes(typeLocal)) {
      totalSkipped++;
      continue;
    }

    const valeurFonciere = parseNum(get('valeur_fonciere'));
    const surfaceBati = parseNum(get('surface_reelle_bati'));
    if (!valeurFonciere || valeurFonciere <= 0 || !surfaceBati || surfaceBati <= 0) {
      totalSkipped++;
      continue;
    }

    const codePostal = get('code_postal')?.trim() || null;
    let codeDept = get('code_departement')?.trim();
    if (!codeDept && codePostal) {
      codeDept = codePostal.startsWith('97') ? codePostal.substring(0, 3) : codePostal.substring(0, 2);
    }
    codeDept = codeDept || null;
    if (deps && codeDept && !deps.has(codeDept.padStart(2, '0'))) {
      totalSkipped++;
      continue;
    }

    const row = {
      id_mutation: get('id_mutation') || null,
      date_mutation: parseDate(get('date_mutation')),
      valeur_fonciere: valeurFonciere,
      type_local: typeLocal,
      surface_reelle_bati: surfaceBati,
      surface_terrain: parseNum(get('surface_terrain')),
      nombre_pieces_principales: parseIntSafe(get('nombre_pieces_principales')),
      code_postal: codePostal,
      code_commune: get('code_commune')?.trim() || null,
      code_departement: codeDept,
      adresse_nom_voie: get('adresse_nom_voie')?.trim() || null,
      longitude: parseNum(get('longitude')),
      latitude: parseNum(get('latitude')),
    };

    batch.push(row);

    if (batch.length >= BATCH_SIZE) {
      if (!dryRun) {
        const { error } = await supabase.from('dvf_transactions').insert(batch);
        if (error) throw error;
      }
      totalInserted += batch.length;
      console.log(`  ${totalInserted} lignes importées...`);
      batch = [];
    }
  }

  if (batch.length > 0 && !dryRun) {
    const { error } = await supabase.from('dvf_transactions').insert(batch);
    if (error) throw error;
    totalInserted += batch.length;
  } else if (batch.length > 0 && dryRun) {
    totalInserted += batch.length;
  }

  if (tempDir) {
    await rm(tempDir, { recursive: true });
  }

  return { totalInserted, totalSkipped };
}

// Script principal
const args = process.argv.slice(2);
const fileArg = args.find((a) => !a.startsWith('--'));
const departements = args.find((a) => a.startsWith('--departements='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

if (!fileArg) {
  console.error(`
Usage: node scripts/import-dvf.js <fichier.txt|fichier.zip> [options]

Options:
  --departements=01,69,75   Limiter aux départements (ex: test avec 01, 69, 75)
  --dry-run                Simuler sans insérer

Exemple (test rapide 1 département):
  node scripts/import-dvf.js valeursfoncieres-2025-s1.txt --departements=69

Variables d'environnement requises:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
  process.exit(1);
}

runImport(fileArg, { departementsFilter: departements, dryRun })
  .then(({ totalInserted, totalSkipped }) => {
    console.log(`\nTerminé. Importées: ${totalInserted}, ignorées: ${totalSkipped}`);
    if (dryRun) console.log('(mode dry-run, aucune donnée insérée)');
  })
  .catch((err) => {
    console.error('Erreur:', err.message);
    process.exit(1);
  });
