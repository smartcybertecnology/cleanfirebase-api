import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAwEJ5pj_Z8kg5nOIwWwXM1-h-rZX3BHno",
    authDomain: "portal-de-jogos-gratis.firebaseapp.com",
    projectId: "portal-de-jogos-gratis",
    storageBucket: "portal-de-jogos-gratis.firebasestorage.app",
    messagingSenderId: "612906190622",
    appId: "1:612906190622:web:40c509484218f71e516b0f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
    // Cabeçalhos de fallback no código
    res.setHeader('Access-Control-Allow-Origin', 'https://playjogosgratis.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    // Resposta imediata para a verificação do navegador (Preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verificação do Token (Certifique-se que CRON_SECRET está na Vercel)
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.error("Tentativa de acesso com token inválido");
        return res.status(401).json({ erro: "Não autorizado" });
    }

    try {
        const umAnoAtras = new Date();
        umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

        const q = query(collection(db, "stats"), where("lastUpdate", "<", umAnoAtras));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return res.status(200).json({ mensagem: "Nada para limpar." });
        }

        const batch = writeBatch(db);
        snapshot.forEach((d) => batch.delete(d.ref));
        await batch.commit();

        return res.status(200).json({ mensagem: `Sucesso: ${snapshot.size} itens removidos.` });
    } catch (error) {
        return res.status(500).json({ erro: error.message });
    }
}
