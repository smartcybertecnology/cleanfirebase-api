import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    // Ajuste crucial: Corrige as quebras de linha da chave privada que a Vercel pode formatar mal
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
  if (req.method !== 'POST') return res.status(405).json({ erro: "Método não permitido" });

  const authHeader = req.headers.authorization;
  // A variável CRON_SECRET na Vercel deve ser: N#W_s3cr3t
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return res.status(401).json({ erro: "Token Inválido ou Ausente" });
  }

  try {
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

    // O Admin SDK ignora as regras de segurança do Firestore
   const statsRef = db.collection("stats");
const snapshot = await statsRef.get(); // Busca TODOS os documentos sem filtro

    if (snapshot.empty) {
      return res.status(200).json({ mensagem: "Nada para limpar." });
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return res.status(200).json({ mensagem: `Sucesso: ${snapshot.size} itens removidos.` });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}
