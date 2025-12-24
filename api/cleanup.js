import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Configuração para Node.js (Ambiente Vercel)
const firebaseConfig = {
    projectId: "portal-de-jogos-gratis",
    // Se estiver usando Service Account, coloque aqui. 
    // Caso contrário, o Firebase Admin tenta usar as credenciais padrão.
};

if (!getApps().length) {
    initializeApp(firebaseConfig);
}

const db = getFirestore();

export default async function handler(req, res) {
    // Cabeçalhos CORS para permitir o acesso do seu domínio
    res.setHeader('Access-Control-Allow-Origin', 'https://playjogosgratis.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Verificação do Token de Segurança
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ erro: "Não autorizado" });
    }

    try {
        const umAnoAtras = new Date();
        umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

        // Referência à coleção correta conforme seu banco
        const statsRef = db.collection("stats");
        const snapshot = await statsRef.where("lastUpdate", "<", umAnoAtras).get();

        if (snapshot.empty) {
            return res.status(200).json({ mensagem: "Nada para limpar." });
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        return res.status(200).json({ mensagem: `Sucesso: ${snapshot.size} itens removidos.` });
    } catch (error) {
        console.error("Erro na função:", error);
        return res.status(500).json({ erro: error.message });
    }
}
