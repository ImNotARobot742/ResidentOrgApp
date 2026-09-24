import express, { Request, Response } from 'express';
import { getAsync, allAsync, runAsync } from './db.js';

const router = express.Router();

// ============= USERS =============

router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await allAsync('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    const result = await runAsync('INSERT INTO users (name, color) VALUES (?, ?)', [name, color]);
    res.json({ id: result.lastID, name, color });
  } catch (err: any) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: "Ce nom d'utilisateur existe déjà" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ============= PRESENCE (TIMETABLE) =============

router.get('/presence', async (req: Request, res: Response) => {
  try {
    const { userId, date } = req.query;
    let query = 'SELECT p.*, u.name, u.color FROM presence p JOIN users u ON p.userId = u.id';
    const params: any[] = [];

    if (userId) {
      query += ' WHERE p.userId = ?';
      params.push(userId);
    }
    if (date) {
      query += params.length ? ' AND p.date = ?' : ' WHERE p.date = ?';
      params.push(date);
    }

    const rows = await allAsync(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.post('/presence', async (req: Request, res: Response) => {
  try {
    const { userId, date, status, activity = null, note = null } = req.body;
    await runAsync(
      'INSERT OR REPLACE INTO presence (userId, date, status, activity, note) VALUES (?, ?, ?, ?, ?)',
      [userId, date, status, activity, note]
    );
    res.json({ userId, date, status, activity, note });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.delete('/presence/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM presence WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// ============= ATTENDANCE (CLOCKING) =============

router.get('/attendance', async (req: Request, res: Response) => {
  try {
    const { userId, month } = req.query;
    let query = 'SELECT a.*, u.name, u.color FROM attendance a JOIN users u ON a.userId = u.id';
    const params: any[] = [];

    if (userId) {
      query += ' WHERE a.userId = ?';
      params.push(userId);
    }
    if (month) {
      // month format: YYYY-MM
      const monthFilter = `${month}%`;
      query += params.length ? ' AND a.date LIKE ?' : ' WHERE a.date LIKE ?';
      params.push(monthFilter);
    }

    query += ' ORDER BY a.date DESC';
    const rows = await allAsync(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.post('/attendance', async (req: Request, res: Response) => {
  try {
    const { userId, date, present } = req.body;
    await runAsync(
      'INSERT OR REPLACE INTO attendance (userId, date, present) VALUES (?, ?, ?)',
      [userId, date, present ? 1 : 0]
    );
    res.json({ userId, date, present });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.get('/attendance/export/:month', async (req: Request, res: Response) => {
  try {
    const { month } = req.params; // YYYY-MM
    const monthFilter = `${month}%`;

    const query = `
      SELECT 
        u.name,
        COUNT(CASE WHEN a.present = 1 THEN 1 END) as daysPresentCount,
        GROUP_CONCAT(CASE WHEN a.present = 1 THEN a.date END) as presentDates
      FROM users u
      LEFT JOIN attendance a ON u.id = a.userId AND a.date LIKE ?
      GROUP BY u.id, u.name
      ORDER BY u.name
    `;

    const rows = await allAsync(query, [monthFilter]);
    
    // Format CSV
    let csv = 'Name,Days Present,Dates\n';
    rows.forEach((row: any) => {
      const dates = row.presentDates ? row.presentDates.split(',').join('; ') : '';
      csv += `"${row.name}",${row.daysPresentCount},"${dates}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${month}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// ============= TOOLS =============

router.get('/tools', async (req: Request, res: Response) => {
  try {
    const tools = await allAsync('SELECT * FROM tools ORDER BY name');
    res.json(tools);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.post('/tools', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const result = await runAsync('INSERT INTO tools (name, available) VALUES (?, 1)', [name]);
    res.json({ id: result.lastID, name, available: true });
  } catch (err: any) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'Cet outil existe déjà' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ============= TOOL BORROWS =============

router.get('/tool-borrows', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        tb.*, 
        t.name as toolName,
        u.name as userName,
        u.color
      FROM tool_borrows tb
      JOIN tools t ON tb.toolId = t.id
      JOIN users u ON tb.userId = u.id
      WHERE tb.returnDate IS NULL
      ORDER BY tb.borrowDate DESC
    `;
    const rows = await allAsync(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.post('/tool-borrows', async (req: Request, res: Response) => {
  try {
    const { toolId, userId } = req.body;
    const now = new Date().toISOString();
    const result = await runAsync(
      'INSERT INTO tool_borrows (toolId, userId, borrowDate, returnDate) VALUES (?, ?, ?, NULL)',
      [toolId, userId, now]
    );
    res.json({ id: result.lastID, toolId, userId, borrowDate: now, returnDate: null });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.put('/tool-borrows/:id/return', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();
    await runAsync('UPDATE tool_borrows SET returnDate = ? WHERE id = ?', [now, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.delete('/tools/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM tools WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

export default router;
