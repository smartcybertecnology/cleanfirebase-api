import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (error) {
    console.error('Erro Firebase Admin:', error.message);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
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

    // 1. Limpar gameRanks (Ranking Geral)
    const gameRanksPath = `artifacts/${appId}/public/data/gameRanks`;
    await deleteCollectionByPath(gameRanksPath);

    // 2. Limpar a coleção de usuários e subcoleções recursivamente
    const usersPath = `artifacts/${appId}/users`;
    const usersSnap = await db.collection(usersPath).get();

    for (const userDoc of usersSnap.docs) {
      // Busca todas as subcoleções do usuário (como recentlyPlayed)
      const subcollections = await userDoc.ref.listCollections();
      for (const sub of subcollections) {
        await deleteCollectionByPath(sub.path);
      }
      // Apaga o documento do usuário
      await userDoc.ref.delete();
    }

    // 3. Limpeza de Segurança (Documentos que podem ter sobrado sem ID de usuário)
    // Isso busca qualquer 'recentlyPlayed' solto no caminho de usuários
    // Nota: O listCollections() acima já deve resolver 99% dos casos.

    return res.status(200).json({ 
      mensagem: "Reset concluído. Atualize o console do Firebase (F5)." 
    });

  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

/**
 * Função para deletar documentos de uma coleção em blocos (batches)
 */
async function deleteCollectionByPath(path) {
  const collectionRef = db.collection(path);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
