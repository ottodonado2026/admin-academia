import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

export const testFirebase = async () => {
  try {
    const docRef = await addDoc(collection(db, "leads"), {
      nombre: "prueba",
      estado: "lead",
      fecha: new Date().toISOString()
    });

    console.log("Documento creado:", docRef.id);
  } catch (error) {
    console.error("Error:", error);
  }
};