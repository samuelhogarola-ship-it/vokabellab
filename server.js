import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.get("/api/vocabulario", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vocabulario")
      .select('*')
      .limit(5);

    if (error) {
      console.error("Error Supabase:", error);
      return res.status(500).json({
        error: error.message,
        details: error.details,
        hint: error.hint
      });
    }

    res.json({ ok: true, data });
  } catch (error) {
    console.error("Error servidor:", error);
    res.status(500).json({ error: String(error) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
