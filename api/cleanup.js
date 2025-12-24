import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (error) {
    console.error('Erro:', error.message);
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
    const usersPath = `artifacts/${appId}/users`;
    
    // Lista todos os documentos (incluindo os vazios que só têm subcoleções)
    const usersRef = db.collection(usersPath);
    const allUsers = await usersRef.listDocuments();

    if (allUsers.length === 0) {
      return res.status(200).json({ mensagem: "Caminho totalmente limpo." });
    }

    for (const userDoc of allUsers) {
      // 1. Descobrir e apagar TODAS as subcoleções (como recentlyPlayed)
      const subcollections = await userDoc.listCollections();
      for (const sub of subcollections) {
        const subDocs = await sub.listDocuments();
        const batch = db.batch();
        subDocs.forEach(d => batch.delete(d));
        await batch.commit();
      }
      // 2. Apagar o documento do usuário
      await userDoc.delete();
    }

    return res.status(200).json({ 
      mensagem: `Limpeza profunda concluída em ${allUsers.length} registros.` 
    });

  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}
