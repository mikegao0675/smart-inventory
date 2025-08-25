import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { parse } from 'csv-parse';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'text/csv', limit: '25mb' }));

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jstapp',
  connectionLimit: 10
});

app.get('/api/health', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: rows?.[0]?.ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/items?q=keyword
app.get('/api/items', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const sql = `
    SELECT
      p.id AS product_id,
      p.code AS product_code,
      p.name AS product_name,
      p.image_url,
      s.id AS sku_id,
      s.size,
      s.stock_qty,
      s.available_qty
    FROM products p
    JOIN skus s ON s.product_id = p.id
    ${q ? 'WHERE p.code LIKE ? OR p.name LIKE ? OR s.size LIKE ?' : ''}
    ORDER BY p.code, s.size
    LIMIT 500
  `;
  const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
  try {
    const [rows] = await pool.query(sql, params);
    res.json({ items: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/items/import  (CSV in body)
// columns: code/款式编码, name/商品名, image/图片, size/尺码, available/可用库存, stock/总库
app.post('/api/items/import', async (req, res) => {
  const csvText = typeof req.body === 'string' ? req.body : '';
  if (!csvText) return res.status(400).json({ ok: false, error: 'Empty CSV' });

  const records = [];
  try {
    await new Promise((resolve, reject) => {
      parse(csvText, { columns: true, trim: true }, (err, rows) => {
        if (err) return reject(err);
        rows.forEach(r => records.push(r));
        resolve();
      });
    });
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'CSV parse error: ' + e.message });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const r of records) {
      const code = r.code || r['款式编码'] || r['商品编码'] || '';
      if (!code) continue;
      const name = r.name || r['商品名'] || r['商品名称'] || '';
      const image = r.image || r['图片'] || r['商品图片'] || '';
      const size = r.size || r['尺码'] || '-';
      const available = Number(r.available || r['可用库存'] || r['可用库存数'] || 0);
      const stock = Number(r.stock || r['总库'] || r['库存数量'] || 0);

      await conn.query(
        'INSERT INTO products (code, name, image_url) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), image_url=VALUES(image_url)',
        [code, name, image]
      );
      const [rows] = await conn.query('SELECT id FROM products WHERE code = ?', [code]);
      const productId = rows[0].id;

      await conn.query(
        `INSERT INTO skus (product_id, size, stock_qty, available_qty)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE stock_qty=VALUES(stock_qty), available_qty=VALUES(available_qty)`,
        [productId, size, stock, available]
      );
    }
    await conn.commit();
    res.json({ ok: true, imported: records.length });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    conn.release();
  }
});

// JST config test placeholder
app.post('/api/jst/test', async (_req, res) => {
  const ok = !!(process.env.JST_APP_KEY && process.env.JST_APP_SECRET && process.env.JST_ACCESS_TOKEN);
  res.json({ configured: ok });
});

app.listen(PORT, () => console.log('API listening :' + PORT));
