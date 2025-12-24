// api/cleanup.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";

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
    // Proteção para que apenas o seu admin ou o Cron da Vercel execute isso
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ erro: "Não autorizado" });
    }

    try {
        const umAnoAtras = new Date();
        umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

        // 1. Procurar documentos antigos em 'stats'
        const q = query(collection(db, "stats"), where("lastUpdate", "<", umAnoAtras));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return res.status(200).json({ mensagem: "Nenhum dado antigo para limpar." });
        }

        // 2. Usar Batch para apagar até 500 documentos de uma vez (limite do Firebase)
        const batch = writeBatch(db);
        snapshot.forEach((d) => {
            batch.delete(d.ref);
        });

        await batch.commit();

        res.status(200).json({ 
            mensagem: `Limpeza concluída! ${snapshot.size} registos removidos.` 
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
}