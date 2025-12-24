import admin from 'firebase-admin';

// Inicialização segura para Vercel
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Erro de inicialização:', error.message);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://playjogosgratis.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Validação do Token (Deve ser Bearer N#W_s3cr3t)
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return res.status(401).json({ erro: "Acesso negado" });
  }

  try {
    const appId = "1:612906190622:web:40c509484218f71e516b0f";
    const batch = db.batch();
    let count = 0;

    // 1. Coletar documentos de gameRanks (Image_8136a7.png)
    const gameRanksRef = db.collection(`artifacts/${appId}/public/data/gameRanks`);
    const gameRanksSnap = await gameRanksRef.get();
    gameRanksSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });

    // 2. Coletar documentos de usuários (Image_814a05.png)
    const usersRef = db.collection(`artifacts/${appId}/users`);
    const usersSnap = await usersRef.get();
    usersSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });

    if (count === 0) {
      return res.status(200).json({ mensagem: "Nada para apagar. As coleções estão vazias." });
    }

    // Executa a limpeza total
    await batch.commit();

    return res.status(200).json({ 
      mensagem: `Sucesso! Foram removidos ${count} documentos no total.` 
    });

  } catch (error) {
    console.error("Erro no processamento:", error);
    return res.status(500).json({ erro: error.message });
  }
}
