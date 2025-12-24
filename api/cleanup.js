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
    const batch = db.batch();
    let totalRemovido = 0;

    // 1. Limpeza do Ranking de Jogos (gameRanks)
    const gameRanksRef = db.collection(`artifacts/${appId}/public/data/gameRanks`);
    const gameRanksSnap = await gameRanksRef.get();
    gameRanksSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
      totalRemovido++;
    });

    // 2. Limpeza dos Usuários (users)
    // Nota: Esta coleção contém subcoleções. O código abaixo deleta os documentos dos usuários.
    const usersRef = db.collection(`artifacts/${appId}/users`);
    const usersSnap = await usersRef.get();
    usersSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
      totalRemovido++;
    });

    if (totalRemovido === 0) {
      return res.status(200).json({ mensagem: "Nada para limpar. As coleções já estão vazias." });
    }

    await batch.commit();

    return res.status(200).json({ 
      mensagem: `Sucesso! Foram removidos ${totalRemovido} registros (Jogos e Usuários).` 
    });

  } catch (error) {
    console.error("Erro na limpeza:", error);
    return res.status(500).json({ erro: error.message });
  }
}
