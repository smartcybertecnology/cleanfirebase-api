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
  res.setHeader('Access-Control-Allow-Origin', 'https://playjogosgratis.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return res.status(401).json({ erro: "Token Inválido" });
  }

  try {
    const appId = "1:612906190622:web:40c509484218f71e516b0f";
    
    // 1. Limpar gameRanks (Ranking Geral)
    const gameRanksRef = db.collection(`artifacts/${appId}/public/data/gameRanks`);
    await deleteCollection(gameRanksRef);

    // 2. Limpar a coleção de usuários e suas subcoleções (Limpeza Profunda)
    const usersRef = db.collection(`artifacts/${appId}/users`);
    const usersSnap = await usersRef.get();

    for (const userDoc of usersSnap.docs) {
      // Para cada usuário, apagamos a subcoleção 'recentlyPlayed'
      const recentlyPlayedRef = userDoc.ref.collection('recentlyPlayed');
      await deleteCollection(recentlyPlayedRef);
      
      // Se houver outras subcoleções conhecidas, adicione-as aqui seguindo o mesmo padrão
      
      // Por fim, apaga o documento do usuário em si
      await userDoc.ref.delete();
    }

    return res.status(200).json({ 
      mensagem: "Sucesso! O banco de dados foi completamente resetado (Jogos, Usuários e Históricos)." 
    });

  } catch (error) {
    console.error("Erro na limpeza profunda:", error);
    return res.status(500).json({ erro: error.message });
  }
}

/**
 * Função auxiliar para deletar todos os documentos de uma coleção/subcoleção
 */
async function deleteCollection(collectionRef) {
  const snapshot = await collectionRef.get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}
