import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path'; // <-- ADICIONE ESTA LINHA
import { fileURLToPath } from 'url'; // <-- ADICIONE ESTA LINHA

const app = express();
app.use(cors());
// Libera a pasta uploads para que o frontend consiga carregar as fotos automaticamente
app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: '10mb' }));

let db;

async function iniciarBanco() {
    db = await open({
        filename: './banco.db',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS empresas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT);
        
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            empresa_id INTEGER, 
            unidade_id INTEGER, 
            nome TEXT, 
            email TEXT UNIQUE, 
            senha TEXT, 
            cargo TEXT
        );

        CREATE TABLE IF NOT EXISTS checklists_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            empresa_id INTEGER, 
            titulo TEXT
        );

        CREATE TABLE IF NOT EXISTS questoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            template_id INTEGER, 
            label TEXT, 
            tipo TEXT, 
            opcoes TEXT
        );

        CREATE TABLE IF NOT EXISTS respostas_executadas (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            empresa_id INTEGER, 
            template_id INTEGER, 
            usuario_email TEXT, 
            data_finalizada DATE DEFAULT CURRENT_DATE,
            conteudo_respostas TEXT
        );
    `);

    const temEmpresa = await db.get('SELECT id FROM empresas LIMIT 1');
    if (!temEmpresa) {
        await db.run('INSERT INTO empresas (nome) VALUES (?)', ["DMS Operacional"]);
        await db.run(`INSERT INTO usuarios (empresa_id, nome, email, senha, cargo) 
                      VALUES (1, "Daniel Santos", "admin@dms.com", "123", "ADMIN")`);
        console.log("🌱 Banco inicializado: Use admin@dms.com / 123");
    }

    console.log("✅ Banco DMS pronto!");
}

// --- ROTA DE LOGIN ---
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.get('SELECT * FROM usuarios WHERE email = ? AND senha = ?', [email, password]);
    if (user) res.json({ success: true, ...user });
    else res.status(401).json({ success: false, message: "E-mail ou Senha Incorreta" });
});

// --- GESTÃO DE EQUIPE (FILTRADO POR EMPRESA) ---
app.delete('/api/relatorio/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.run('DELETE FROM respostas_executadas WHERE id = ?', [id]);
        res.json({ success: true, message: "Relatório excluído com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao excluir relatório: " + err.message });
    }
});

app.get('/api/gerenciar-usuarios/:empresa_id', async (req, res) => {
    const { empresa_id } = req.params;
    try {
        const rows = await db.all('SELECT * FROM usuarios WHERE empresa_id = ?', [empresa_id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/usuarios/atualizar/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, email, senha, cargo } = req.body;
    try {
        await db.run(
            'UPDATE usuarios SET nome = ?, email = ?, senha = ?, cargo = ? WHERE id = ?',
            [nome, email, senha, cargo, id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.run('DELETE FROM usuarios WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/usuarios', async (req, res) => {
    const { empresa_id, unidade_id, nome, email, senha, cargo } = req.body;
    try {
        await db.run(`INSERT INTO usuarios (empresa_id, unidade_id, nome, email, senha, cargo) VALUES (?, ?, ?, ?, ?, ?)`,
            [empresa_id, unidade_id || 1, nome, email, senha, cargo]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ROTAS DE CHECKLISTS E MODELOS ---

// NOVA ROTA ADICIONADA: Busca o título do template para aparecer na execução
app.get('/api/checklists/template/:id', async (req, res) => {
    try {
        const row = await db.get('SELECT * FROM checklists_templates WHERE id = ?', [req.params.id]);
        if (row) res.json(row);
        else res.status(404).json({ error: "Checklist não encontrado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/checklists-completo', async (req, res) => {
    const { empresa_id, titulo, questoes } = req.body;
    try {
        const result = await db.run('INSERT INTO checklists_templates (empresa_id, titulo) VALUES (?, ?)', [empresa_id || 1, titulo]);
        const templateId = result.lastID;
        for (let q of questoes) {
            await db.run('INSERT INTO questoes (template_id, label, tipo, opcoes) VALUES (?, ?, ?, ?)', [templateId, q.label, q.tipo, q.opcoes || '']);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Erro ao salvar checklist." }); }
});

app.get('/api/checklists/:empresa_id', async (req, res) => {
    const rows = await db.all('SELECT * FROM checklists_templates WHERE empresa_id = ?', [req.params.empresa_id]);
    res.json(rows);
});

app.get('/api/checklists/questoes/:id', async (req, res) => {
    const rows = await db.all('SELECT * FROM questoes WHERE template_id = ?', [req.params.id]);
    res.json(rows);
});

app.delete('/api/checklists/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM questoes WHERE template_id = ?', [req.params.id]);
        await db.run('DELETE FROM checklists_templates WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Erro ao excluir." }); }
});

// --- EXECUÇÃO E HISTÓRICO ---
app.post('/api/finalizar-checklist', async (req, res) => {
    const { empresa_id, template_id, usuario_email, respostas } = req.body;
    try {
        await db.run(
            'INSERT INTO respostas_executadas (empresa_id, template_id, usuario_email, conteudo_respostas) VALUES (?, ?, ?, ?)',
            [empresa_id || 1, template_id, usuario_email, JSON.stringify(respostas)]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/historico/:empresa_id/:email/:cargo', async (req, res) => {
    const { empresa_id, email, cargo } = req.params;
    try {
        let query = `
            SELECT r.*, t.titulo, u.nome as responsavel
            FROM respostas_executadas r 
            JOIN checklists_templates t ON r.template_id = t.id 
            LEFT JOIN usuarios u ON r.usuario_email = u.email
            WHERE r.empresa_id = ?
        `;
        let params = [empresa_id];
        if (cargo !== 'ADMIN') {
            query += " AND r.usuario_email = ?";
            params.push(email);
        }
        query += " ORDER BY r.id DESC";
        const rows = await db.all(query, params);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/relatorio-detalhado/:id', async (req, res) => {
    try {
        const row = await db.get(`
            SELECT r.*, t.titulo, u.nome as responsavel FROM respostas_executadas r 
            JOIN checklists_templates t ON r.template_id = t.id 
            LEFT JOIN usuarios u ON r.usuario_email = u.email
            WHERE r.id = ?`, [req.params.id]);
        if (row) {
            const respostasRaw = JSON.parse(row.conteudo_respostas);
            const questoes = await db.all('SELECT id, label FROM questoes WHERE template_id = ?', [row.template_id]);
            const respostasFormatadas = questoes.map(q => ({
                pergunta: q.label,
                resposta: respostasRaw[q.id] || "Não respondido"
            }));
            res.json({ ...row, conteudo_respostas: respostasFormatadas });
        } else { res.status(404).json({ error: "Relatório não encontrado" }); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats/:empresa_id', async (req, res) => {
    const { empresa_id } = req.params;
    try {
        const stats = await db.get(`
            SELECT 
                (SELECT COUNT(*) FROM checklists_templates WHERE empresa_id = ?) as total_templates,
                (SELECT COUNT(*) FROM respostas_executadas WHERE empresa_id = ? AND data_finalizada = CURRENT_DATE) as concluidos_hoje,
                (SELECT COUNT(*) FROM usuarios WHERE empresa_id = ?) as total_usuarios,
                (SELECT COUNT(*) FROM respostas_executadas WHERE empresa_id = ?) as total_historico
        `, [empresa_id, empresa_id, empresa_id, empresa_id]);
        res.json(stats);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

iniciarBanco().then(() => app.listen(3001, () => console.log("🚀 Servidor DMS Online na porta 3001")));