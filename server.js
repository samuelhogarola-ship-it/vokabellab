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

app.get("/api/health", (req, res) => {
  const configError = getConfigError();

  res.status(configError ? 500 : 200).json({
    ok: !configError,
    supabaseConfigured: !configError,
    usingServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    error: configError
  });
});

app.get("/api/vocabulario", async (req, res) => {
  try {
    const configError = getConfigError();
    if (configError) {
      return res.status(500).json({ error: configError });
    }

    const { data, error } = await supabase
      .from("vocabulario")
      .select("id,de,es,artikel,type,thema,thema_id")
      .eq("is_active", true)
      .order("thema_id", { ascending: true, nullsFirst: false })
      .order("thema", { ascending: true, nullsFirst: false })
      .order("de", { ascending: true });

    if (error) {
      console.error("Error Supabase:", error);
      return res.status(500).json({
        error: "Error al obtener vocabulario",
        details: error.message
      });
    }

    const palabras = (data || []).map((item) => ({
      id: item.id,
      de: buildDisplayWord(item),
      es: item.es || "",
      type: normalizeType(item.type),
      thema: Number(item.thema_id ?? item.thema) || 0,
      lvl: ""
    }));

    res.json({ palabras });
  } catch (error) {
    console.error("Error servidor:", error);
    res.status(500).json({ error: "Error interno" });
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
