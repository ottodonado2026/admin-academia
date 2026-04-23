import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export const getLeads = async () => {
  const snapshot = await getDocs(collection(db, "leads"));

  return snapshot.docs.map(doc => ({
    id: doc.id, // 🔥 CLAVE: ID REAL DE FIREBASE
    ...doc.data()
  }));
};