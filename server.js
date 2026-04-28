import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const missingEnv = [];

if (!supabaseUrl) missingEnv.push("SUPABASE_URL");
if (!supabaseKey) missingEnv.push("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY");

const supabase = missingEnv.length === 0
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

const CACHE_TTL_MS = 5 * 60 * 1000;
const SUMMARY_TTL_MS = 60 * 60 * 1000;

const vocabCache = {
  rows: null,
  loadedAt: 0,
  promise: null
};

const summaryCache = {
  payload: null,
  loadedAt: 0,
  promise: null
};

function normalizeType(type) {
  const value = (type || "").trim().toLowerCase();

  if (!value) return "Vocabulario";
  if (value === "nomen" || value === "noun") return "Nomen";
  if (value === "verb") return "Verb";
  if (value === "ausdruck" || value === "expression") return "Ausdruck";
  if (
    value === "adjektiv/adverb" ||
    value === "adjektiv" ||
    value === "adverb" ||
    value === "adjective"
  ) {
    return "Adjektiv/Adverb";
  }

  return type;
}

function buildDisplayWord(item) {
  const de = (item.de || "").trim();
  const artikel = (item.artikel || "").trim();
  const normalizedType = normalizeType(item.type);

  if (!de) return "";
  if (!artikel || normalizedType !== "Nomen") return de;

  const lowered = de.toLowerCase();
  const articlePrefix = `${artikel.toLowerCase()} `;

  if (lowered.startsWith(articlePrefix)) {
    return de;
  }

  return `${artikel} ${de}`.trim();
}

function getConfigError() {
  if (missingEnv.length === 0) return null;
  return `Faltan variables de entorno: ${missingEnv.join(", ")}`;
}

async function fetchAllVocabulario() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from("vocabulario")
      .select("id,de,es,artikel,type,thema,thema_id")
      .eq("is_active", true)
      .order("thema_id", { ascending: true, nullsFirst: false })
      .order("thema", { ascending: true, nullsFirst: false })
      .order("de", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    rows.push(...(data || []));

    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

function buildSummaryFromRows(rows) {
  const totalWords = rows.length;
  const allThemas = new Set();
  const allTypes = new Set();

  for (const row of rows) {
    const thema = Number(row.thema_id ?? row.thema) || 0;
    const type = normalizeType(row.type);
    if (thema) allThemas.add(thema);
    if (type) allTypes.add(type);
  }

  return {
    totalWords,
    totalThemas: allThemas.size,
    totalTypes: allTypes.size,
    source: "rows"
  };
}

async function getCachedVocabulario(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && vocabCache.rows && now - vocabCache.loadedAt < CACHE_TTL_MS) {
    return vocabCache.rows;
  }

  if (!forceRefresh && vocabCache.promise) {
    return vocabCache.promise;
  }

  vocabCache.promise = (async () => {
    const rows = await fetchAllVocabulario();
    vocabCache.rows = rows;
    vocabCache.loadedAt = Date.now();

    summaryCache.payload = {
      ...buildSummaryFromRows(rows),
      lastUpdated: new Date().toISOString(),
      source: "rows"
    };
    summaryCache.loadedAt = vocabCache.loadedAt;

    return rows;
  })();

  try {
    return await vocabCache.promise;
  } finally {
    vocabCache.promise = null;
  }
}

async function getCachedSummary() {
  const now = Date.now();

  if (summaryCache.payload && now - summaryCache.loadedAt < SUMMARY_TTL_MS) {
    return summaryCache.payload;
  }

  if (summaryCache.promise) {
    return summaryCache.promise;
  }

  summaryCache.promise = (async () => {
    const { count, error } = await supabase
      .from("vocabulario")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    if (error) throw error;

    const payload = {
      totalWords: count || 0,
      totalThemas: 29,
      totalTypes: 4,
      lastUpdated: new Date().toISOString(),
      source: "count"
    };

    summaryCache.payload = payload;
    summaryCache.loadedAt = Date.now();
    return payload;
  })();

  try {
    return await summaryCache.promise;
  } finally {
    summaryCache.promise = null;
  }
}

app.get("/api/health", (req, res) => {
  const configError = getConfigError();

  res.status(configError ? 500 : 200).json({
    ok: !configError,
    supabaseConfigured: !configError,
    usingServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    error: configError
  });
});

app.get("/api/resumen", async (req, res) => {
  try {
    const configError = getConfigError();
    if (configError) {
      return res.status(500).json({ error: configError });
    }

    const summary = await getCachedSummary();
    res.json(summary);
  } catch (error) {
    console.error("Error resumen:", error);
    res.status(500).json({
      error: "Error al obtener el resumen",
      details: error?.message || "Unknown error"
    });
  }
});

app.get("/api/vocabulario", async (req, res) => {
  try {
    const configError = getConfigError();
    if (configError) {
      return res.status(500).json({ error: configError });
    }

    const data = await getCachedVocabulario();
    const palabras = data.map((item) => ({
      id: item.id,
      de: buildDisplayWord(item),
      es: item.es || "",
      type: normalizeType(item.type),
      thema: Number(item.thema_id ?? item.thema) || 0,
      lvl: ""
    }));

    res.json({
      palabras,
      cached: true,
      cachedAt: vocabCache.loadedAt ? new Date(vocabCache.loadedAt).toISOString() : null
    });
  } catch (error) {
    console.error("Error servidor:", error);
    res.status(500).json({
      error: "Error interno",
      details: error?.message || "Unknown error"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const configError = getConfigError();
  if (configError) {
    console.warn(`[config] ${configError}`);
  }
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
