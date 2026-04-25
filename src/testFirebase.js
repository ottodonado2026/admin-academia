import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import { supabase } from "./services/supabaseClient";

export const testFirebase = async () => {
  try {

    const data = {
      nombre: "prueba",
      estado: "lead",
      fecha: new Date().toISOString()
    };

    // 🔥 Firebase (lo que ya tienes)
    const docRef = await addDoc(collection(db, "leads"), data);

    console.log("Documento creado en Firebase:", docRef.id);

    // 🔥 Supabase (nuevo)
   await supabase
  .from("leads")
  .insert([
    {
      id: crypto.randomUUID(),
      nombre: data.nombre,
      estado: data.estado,
      created_at: new Date().toISOString()
    }
  ]);

    if (error) {
      console.error("Error Supabase:", error);
    } else {
      console.log("Guardado en Supabase ✅");
    }

  } catch (error) {
    console.error("Error general:", error);
  }
};