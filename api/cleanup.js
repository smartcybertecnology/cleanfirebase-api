import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error.message);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://playjogosgratis.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ erro: "Token Inválido" });
  }

  try {
    const appId = "1:612906190622:web:40c509484218f71e516b0f";
    const usersPath = `artifacts/${appId}/users`;
    
    // 1. Obter todos os documentos de utilizadores
    const usersSnap = await db.collection(usersPath).get();

    if (usersSnap.empty) {
      return res.status(200).json({ mensagem: "A pasta de utilizadores já está vazia." });
    }

    // 2. Loop para entrar em cada utilizador e apagar subcoleções
    for (const userDoc of usersSnap.docs) {
      // Procurar todas as subcoleções deste utilizador (ex: recentlyPlayed)
      const subcollections = await userDoc.ref.listCollections();
      
      for (const sub of subcollections) {
        // Apagar todos os documentos dentro da subcoleção
        const subSnap = await sub.get();
        const batch = db.batch();
        subSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      // 3. Finalmente, apagar o documento do utilizador em si
      await userDoc.ref.delete();
    }

    // Opcional: Limpar também o gameRanks se desejar reset total
    const gameRanksRef = db.collection(`artifacts/${appId}/public/data/gameRanks`);
    const grSnap = await gameRanksRef.get();
    const grBatch = db.batch();
    grSnap.docs.forEach(d => grBatch.delete(d.ref));
    await grBatch.commit();

    return res.status(200).json({ 
      mensagem: "Sucesso! Todos os utilizadores, subcoleções e rankings foram apagados." 
    });

  } catch (error) {
    console.error("Erro na limpeza profunda:", error);
    return res.status(500).json({ erro: error.message });
  }
}
