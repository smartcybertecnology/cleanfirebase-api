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
    let totalDeletado = 0;

    // 1. LIMPAR GAMERANKS (Ranking de Jogos)
    const gameRanksPath = `artifacts/${appId}/public/data/gameRanks`;
    const gameRanksDocs = await db.collection(gameRanksPath).listDocuments();
    for (const doc of gameRanksDocs) {
      await doc.delete();
      totalDeletado++;
    }

    // 2. LIMPAR USERS (Utilizadores e Subcoleções)
    const usersPath = `artifacts/${appId}/users`;
    const userDocs = await db.collection(usersPath).listDocuments();
    
    for (const userDoc of userDocs) {
      // Apaga subcoleções (como recentlyPlayed) antes de apagar o utilizador
      const subcollections = await userDoc.listCollections();
      for (const sub of subcollections) {
        const subDocs = await sub.listDocuments();
        for (const sDoc of subDocs) {
          await sDoc.delete();
          totalDeletado++;
        }
      }
      await userDoc.delete();
      totalDeletado++;
    }

    return res.status(200).json({ 
      mensagem: `Sucesso! Foram removidos ${totalDeletado} registros entre rankings e usuários.` 
    });

  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}
