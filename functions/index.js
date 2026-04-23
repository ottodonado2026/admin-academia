const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.actualizarEmailAsesor = functions.https.onCall(async (data, context) => {
  const { authUid, nuevoEmail } = data;


// 🔒 Validar que el usuario esté autenticado (admin panel)
if (!context.auth) {
  throw new functions.https.HttpsError(
    "unauthenticated",
    "Usuario no autenticado"
  );
}

  if (!authUid || !nuevoEmail) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Faltan datos"
    );
  }

  try {
    // 🔐 1. Actualizar en Firebase Auth
    await admin.auth().updateUser(authUid, {
      email: nuevoEmail,
    });

    // 🔥 2. Actualizar en Firestore
    const snapshot = await admin
      .firestore()
      .collection("asesores")
      .where("authUid", "==", authUid)
      .get();

    snapshot.forEach((doc) => {
      doc.ref.update({ email: nuevoEmail });
    });

    return { success: true };

  } catch (error) {
    console.error(error);
    throw new functions.https.HttpsError(
      "internal",
      error.message
    );
  }
});