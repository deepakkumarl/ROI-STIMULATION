const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

const INTERNAL = {
  automated_cost_per_invoice: 0.20,
  error_rate_auto: 0.001, 
  time_saved_per_invoice_minutes: 8,
  min_roi_boost_factor: 1.1
};


const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'hello',
  database: process.env.DB_NAME || 'roi_simulator_',
};


let pool;
(async () => {
  try {
    pool = mysql.createPool(DB_CONFIG);
    const conn = await pool.getConnection();
    await conn.ping();

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS scenario (
        id INT AUTO_INCREMENT PRIMARY KEY,
        scenario_name VARCHAR(255) NOT NULL,
        monthly_invoice_volume INT NOT NULL,
        num_ap_staff INT NOT NULL,
        avg_hours_per_invoice FLOAT NOT NULL,
        hourly_wage FLOAT NOT NULL,
        error_rate_manual FLOAT NOT NULL,      
        error_cost FLOAT NOT NULL,
        time_horizon_months INT NOT NULL,
        one_time_implementation_cost FLOAT DEFAULT 0,
        monthly_savings FLOAT,
        payback_months FLOAT,
        roi_percentage FLOAT,
        cumulative_savings FLOAT,
        net_savings FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await conn.query(createTableSQL);

    conn.release();
    console.log('MySQL pool created, reachable, and table verified.');
  } catch (err) {
    console.error('MySQL connection failed:', err);
    process.exit(1);
  }
})();

function safeNumber(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function runCalculations(inputs) {
  const monthly_invoice_volume = safeNumber(inputs.monthly_invoice_volume, 0);
  const num_ap_staff = safeNumber(inputs.num_ap_staff, 0);
  const avg_hours_per_invoice = safeNumber(inputs.avg_hours_per_invoice, 0);
  const hourly_wage = safeNumber(inputs.hourly_wage, 0);
  const error_rate_manual_percent = safeNumber(inputs.error_rate_manual, 0);
  const error_cost = safeNumber(inputs.error_cost, 0);
  const time_horizon_months = Math.max(1, Math.floor(safeNumber(inputs.time_horizon_months, 36)));
  const one_time_implementation_cost = safeNumber(inputs.one_time_implementation_cost, 0);

  const automated_cost_per_invoice = INTERNAL.automated_cost_per_invoice;
  const error_rate_auto_decimal = INTERNAL.error_rate_auto;
  const min_roi_boost_factor = INTERNAL.min_roi_boost_factor;

  const labor_cost_manual = num_ap_staff * hourly_wage * avg_hours_per_invoice * monthly_invoice_volume;
  const auto_cost = monthly_invoice_volume * automated_cost_per_invoice;

  const error_rate_manual_decimal = error_rate_manual_percent / 100;
  const error_savings = Math.max(0, (error_rate_manual_decimal - error_rate_auto_decimal)) * monthly_invoice_volume * error_cost;

  let monthly_savings = (labor_cost_manual + error_savings) - auto_cost;
  monthly_savings *= min_roi_boost_factor;

  const monthly_savings_safe = monthly_savings <= 0 ? 0.01 : monthly_savings;

  const cumulative_savings = monthly_savings_safe * time_horizon_months;
  const net_savings = cumulative_savings - one_time_implementation_cost;
  const payback_months = monthly_savings_safe > 0 ? (one_time_implementation_cost / monthly_savings_safe) : Number.POSITIVE_INFINITY;
  const roi_percentage = one_time_implementation_cost > 0 ? ((net_savings / one_time_implementation_cost) * 100) : Infinity;

  return {
    monthly_savings: Number(monthly_savings_safe.toFixed(2)),
    cumulative_savings: Number(cumulative_savings.toFixed(2)),
    net_savings: Number(net_savings.toFixed(2)),
    payback_months: Number(payback_months.toFixed(2)),
    roi_percentage: Number(roi_percentage.toFixed(2))
  };
}

app.post('/simulate', (req, res) => {
  try {
    const results = runCalculations(req.body);
    return res.json(results);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Simulation error' });
  }
});

app.post('/scenarios', async (req, res) => {
  try {
    const data = req.body;
    const calc = runCalculations(data);

    const sql = `
      INSERT INTO scenario
      (scenario_name, monthly_invoice_volume, num_ap_staff, avg_hours_per_invoice, hourly_wage, error_rate_manual, error_cost, time_horizon_months, one_time_implementation_cost, monthly_savings, payback_months, roi_percentage, cumulative_savings, net_savings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.scenario_name || 'Untitled',
      safeNumber(data.monthly_invoice_volume, 0),
      safeNumber(data.num_ap_staff, 0),
      safeNumber(data.avg_hours_per_invoice, 0),
      safeNumber(data.hourly_wage, 0),
      safeNumber(data.error_rate_manual, 0),
      safeNumber(data.error_cost, 0),
      Math.max(1, Math.floor(safeNumber(data.time_horizon_months, 36))),
      safeNumber(data.one_time_implementation_cost, 0),
      calc.monthly_savings,
      calc.payback_months,
      calc.roi_percentage,
      calc.cumulative_savings,
      calc.net_savings
    ];

    const conn = await pool.getConnection();
    try { await conn.execute(sql, params); } finally { conn.release(); }

    return res.json({ message: 'Scenario saved successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Save scenario failed' });
  }
});

app.get('/scenarios', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT * FROM scenario ORDER BY id DESC');
      return res.json(rows);
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

app.get('/scenarios/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT * FROM scenario WHERE id = ?', [id]);
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(rows[0]);
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch scenario' });
  }
});

app.delete('/scenarios/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const conn = await pool.getConnection();
    try {
      await conn.query('DELETE FROM scenario WHERE id = ?', [id]);
      return res.json({ message: 'Deleted' });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Delete failed' });
  }
});

app.post('/report/generate', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const tmpFilename = `roi_report_${Date.now()}.pdf`;
    const tmpPath = path.join(__dirname, tmpFilename);
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(tmpPath);
    doc.pipe(stream);

    doc.fontSize(18).text('Invoicing ROI Simulation Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Email: ${email}`);
    doc.text(`Scenario: ${req.body.scenario_name || 'N/A'}`);
    doc.moveDown();

    const fields = [
      ['Monthly savings', req.body.monthly_savings],
      ['Payback (months)', req.body.payback_months],
      ['ROI (%)', req.body.roi_percentage],
      ['Cumulative savings', req.body.cumulative_savings],
      ['Net savings', req.body.net_savings]
    ];
    fields.forEach(([label, value]) => {
      const display = (value === undefined || value === null) ? 'N/A' : (typeof value === 'number' ? Number(value).toFixed(2) : value);
      doc.text(`${label}: ${display}`);
    });

    doc.moveDown();
    doc.text('Generated by Invoicing ROI Simulator');
    doc.end();

    stream.on('finish', () => {
      res.download(tmpPath, `${req.body.scenario_name || 'roi_report'}.pdf`, (err) => {
        try { fs.unlinkSync(tmpPath); } catch (e) {}
        if (err) console.error('Send error:', err);
      });
    });

    stream.on('error', (err) => {
      console.error('PDF write error:', err);
      return res.status(500).json({ error: 'Report generation failed' });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Report generation failed' });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
