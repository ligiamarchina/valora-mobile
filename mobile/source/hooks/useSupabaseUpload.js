// mobile/source/hooks/useSupabaseUpload.js
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

const supabase = createClient(
  "https://tclzzzfwtgkdnlctwfed.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbHp6emZ3dGdrZG5sY3R3ZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDg2MjgsImV4cCI6MjA5MDQ4NDYyOH0.YPw23E-dMo9-sEL1t10T0EeztEB27bEajcNCiTpr-_4",
);

export function useSupabaseUpload() {
  const [uploading, setUploading] = useState(false);

  async function upload(arquivo) {
    setUploading(true);
    try {
      // Usa a API legacy do expo-file-system (compatível com SDK 54)
      const base64 = await FileSystem.readAsStringAsync(arquivo.uri, {
        encoding: "base64",
      });

      const ext =
        arquivo.tipo === "pdf"
          ? "pdf"
          : (arquivo.uri.split(".").pop() ?? "jpg");
      const nomeArquivo = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("notas-fiscais")
        .upload(nomeArquivo, decode(base64), {
          contentType: arquivo.mimeType,
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("notas-fiscais")
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Erro no upload:", err);
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading };
}
