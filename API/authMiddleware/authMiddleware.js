import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const authMiddleware = (req, res, next) => {
    // Busca o token nos cookies
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ erro: "Acesso negado. Token não fornecido." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Salva os dados do usuário na requisição
        next();
    } catch (err) {
        res.status(401).json({ erro: "Token inválido ou expirado." });
    }
};

export default authMiddleware;
