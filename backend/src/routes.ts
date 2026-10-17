import express, { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { getAsync, allAsync, runAsync } from './db.js';
import { AuthUser, requireAuth, requireRole, clearSessionCookie, getSessionToken, setSessionCookie } from './auth.js';
import { hashPassword, hashSessionToken, verifyPassword } from './passwords.js';
import { sendAccountSetupEmail } from './email.js';

const router = express.Router();
const accountRoles = ['artisan', 'institut'] as const;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const accountFromBody = (body: any) => {
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role;
  const color = typeof body.color === 'string' && /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : '#64748B';
  const profilePicture = typeof body.profilePicture === 'string' && body.profilePicture.trim()
    ? body.profilePicture.trim()
    : null;
  return { firstName, lastName, email, role, color, profilePicture };
};

const validPicture = (value: string | null) => (
  value === null || value.length <= 500_000 && (
    /^https?:\/\//i.test(value) || /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value)
  )
);

const selectPublicAccount = `SELECT id, name, firstName, lastName, email, role, profilePicture, color FROM users`;

type PlanningPeriod = 'morning' | 'afternoon';
type PlanningSpace = 'wood' | 'metal';
type PlanningRegistration = {
  id: number;
  userId: number;
  userName: string;
  color: string;
  note: string | null;
  peopleCount: number;
};
type PlanningDay = {
  date: string;
  morning: { wood: PlanningRegistration[]; metal: PlanningRegistration[] };
  afternoon: { wood: PlanningRegistration[]; metal: PlanningRegistration[] };
};
type PlanningRegistrationRow = PlanningRegistration & {
  date: string;
  period: PlanningPeriod;
  space: PlanningSpace;
};

const validPlanningDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

// ============= AUTHENTICATION =============

router.post('/auth/login', async (req: Request, res: Response) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!emailPattern.test(email) || !password) {
    res.status(400).json({ error: 'Adresse courriel ou mot de passe invalide.' });
    return;
  }

  try {
    const account = await getAsync('SELECT * FROM users WHERE email = ? COLLATE NOCASE', [email]);
    if (!account || !await verifyPassword(password, account.passwordHash)) {
      res.status(401).json({ error: 'Adresse courriel ou mot de passe incorrect.' });
      return;
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await runAsync('INSERT INTO sessions (tokenHash, userId, expiresAt) VALUES (?, ?, ?)', [hashSessionToken(token), account.id, expiresAt]);
    setSessionCookie(res, token);
    const { passwordHash: _passwordHash, ...safeAccount } = account;
    res.json(safeAccount);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.post('/auth/logout', async (req: Request, res: Response) => {
  const token = getSessionToken(req);
  if (token) await runAsync('DELETE FROM sessions WHERE tokenHash = ?', [hashSessionToken(token)]).catch(() => undefined);
  clearSessionCookie(res);
  res.json({ success: true });
});

router.post('/auth/set-password', async (req: Request, res: Response) => {
  const token = typeof req.body.token === 'string' ? req.body.token : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const confirmPassword = typeof req.body.confirmPassword === 'string' ? req.body.confirmPassword : '';
  if (!/^[a-f0-9]{64}$/i.test(token) || password.length < 10 || password !== confirmPassword) {
    res.status(400).json({ error: 'Vérifiez le lien et saisissez deux fois le même mot de passe (10 caractères minimum).' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const tokenHash = hashSessionToken(token);
  const now = new Date().toISOString();
  try {
    await runAsync('BEGIN IMMEDIATE');
    const setupToken = await getAsync(
      'SELECT userId FROM password_setup_tokens WHERE tokenHash = ? AND usedAt IS NULL AND expiresAt > ?',
      [tokenHash, now]
    );
    if (!setupToken) {
      await runAsync('ROLLBACK');
      res.status(400).json({ error: 'Ce lien est invalide ou expiré.' });
      return;
    }

    await runAsync('UPDATE users SET passwordHash = ? WHERE id = ?', [passwordHash, setupToken.userId]);
    await runAsync('UPDATE password_setup_tokens SET usedAt = ? WHERE tokenHash = ?', [now, tokenHash]);
    await runAsync('DELETE FROM sessions WHERE userId = ?', [setupToken.userId]);
    await runAsync('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await runAsync('ROLLBACK').catch(() => undefined);
    res.status(500).json({ error: err });
  }
});

router.use(requireAuth);

router.get('/auth/me', (req: Request, res: Response) => {
  res.json(req.authUser);
});

router.patch('/auth/profile', async (req: Request, res: Response) => {
  const profilePicture = typeof req.body.profilePicture === 'string' && req.body.profilePicture.trim()
    ? req.body.profilePicture.trim()
    : null;
  if (!req.authUser || !validPicture(profilePicture)) {
    res.status(400).json({ error: 'Image de profil invalide.' });
    return;
  }

  try {
    await runAsync('UPDATE users SET profilePicture = ? WHERE id = ?', [profilePicture, req.authUser.id]);
    const updated = await getAsync(`${selectPublicAccount} WHERE id = ?`, [req.authUser.id]) as AuthUser;
    req.authUser = updated;
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// ============= ADMIN ACCOUNT MANAGEMENT =============

router.get('/admin/users', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    res.json(await allAsync(`${selectPublicAccount} ORDER BY lastName, firstName`));
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.post('/admin/users', requireRole('admin'), async (req: Request, res: Response) => {
  const account = accountFromBody(req.body);
  if (!account.firstName || !account.lastName || !emailPattern.test(account.email) ||
      !accountRoles.includes(account.role)) {
    res.status(400).json({ error: 'Informations de compte invalides. Seuls les comptes artisan et institut peuvent être créés.' });
    return;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM || !process.env.APP_BASE_URL) {
    res.status(503).json({ error: 'L’envoi de courriels n’est pas configuré sur le serveur.' });
    return;
  }

  let userId: number | undefined;
  try {
    const temporaryPassword = randomBytes(18).toString('base64url');
    const setupToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const result = await runAsync(
      `INSERT INTO users (name, firstName, lastName, email, passwordHash, role, profilePicture, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`${account.firstName} ${account.lastName}`, account.firstName, account.lastName,
        account.email, await hashPassword(temporaryPassword), account.role, null, account.color]
    );
    userId = result.lastID;
    await runAsync(
      'INSERT INTO password_setup_tokens (tokenHash, userId, expiresAt) VALUES (?, ?, ?)',
      [hashSessionToken(setupToken), userId, expiresAt]
    );
    const baseUrl = process.env.APP_BASE_URL!.replace(/\/$/, '');
    await sendAccountSetupEmail({
      email: account.email,
      name: `${account.firstName} ${account.lastName}`,
      temporaryPassword,
      setupUrl: `${baseUrl}/set-password?token=${setupToken}`,
    });
    res.status(201).json({ success: true, emailSent: true });
  } catch (err: any) {
    if (userId !== undefined) await runAsync('DELETE FROM users WHERE id = ?', [userId]).catch(() => undefined);
    const status = err.message?.includes('UNIQUE') ? 409 : 502;
    res.status(status).json({ error: status === 409 ? 'Cette adresse courriel est déjà utilisée.' : 'Le compte n’a pas été créé car le courriel n’a pas pu être envoyé.' });
  }
});

router.post('/admin/users/:id/regenerate-password', requireRole('admin'), async (req: Request, res: Response) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM || !process.env.APP_BASE_URL) {
    res.status(503).json({ error: 'L’envoi de courriels n’est pas configuré sur le serveur.' });
    return;
  }

  const target = await getAsync('SELECT id, name, email FROM users WHERE id = ?', [req.params.id]);
  if (!target) {
    res.status(404).json({ error: 'Compte introuvable.' });
    return;
  }

  const temporaryPassword = randomBytes(18).toString('base64url');
  const setupToken = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(setupToken);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  try {
    await runAsync('BEGIN IMMEDIATE');
    await runAsync('UPDATE users SET passwordHash = ? WHERE id = ?', [await hashPassword(temporaryPassword), target.id]);
    await runAsync('DELETE FROM password_setup_tokens WHERE userId = ?', [target.id]);
    await runAsync(
      'INSERT INTO password_setup_tokens (tokenHash, userId, expiresAt) VALUES (?, ?, ?)',
      [tokenHash, target.id, expiresAt]
    );
    const baseUrl = process.env.APP_BASE_URL!.replace(/\/$/, '');
    await sendAccountSetupEmail({
      email: target.email,
      name: target.name,
      temporaryPassword,
      setupUrl: `${baseUrl}/set-password?token=${setupToken}`,
    });
    await runAsync('DELETE FROM sessions WHERE userId = ?', [target.id]);
    await runAsync('COMMIT');
    res.json({ success: true, emailSent: true });
  } catch {
    await runAsync('ROLLBACK').catch(() => undefined);
    res.status(502).json({ error: 'Le mot de passe n’a pas été régénéré car le courriel n’a pas pu être envoyé.' });
  }
});

router.patch('/admin/users/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const account = accountFromBody(req.body);
    if (!account.firstName || !account.lastName || !emailPattern.test(account.email) ||
      ![...accountRoles, 'admin'].includes(account.role) || !validPicture(account.profilePicture)) {
    res.status(400).json({ error: 'Informations de compte invalides.' });
    return;
  }

  try {
    const target = await getAsync('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!target) {
      res.status(404).json({ error: 'Compte introuvable.' });
      return;
    }
    if (target.role === 'admin' && account.role !== 'admin') {
      res.status(409).json({ error: 'Le compte admin unique ne peut pas être rétrogradé.' });
      return;
    }
    if (target.role !== 'admin' && account.role === 'admin') {
      res.status(409).json({ error: 'Il existe déjà un compte admin. Un autre compte ne peut pas être promu admin.' });
      return;
    }
    await runAsync(
      `UPDATE users SET name = ?, firstName = ?, lastName = ?, email = ?, role = ?, profilePicture = ?, color = ?
       WHERE id = ?`,
      [`${account.firstName} ${account.lastName}`, account.firstName, account.lastName,
        account.email, account.role, account.profilePicture, account.color, req.params.id]
    );
    res.json(await getAsync(`${selectPublicAccount} WHERE id = ?`, [req.params.id]));
  } catch (err: any) {
    res.status(err.message?.includes('UNIQUE') ? 409 : 500).json({ error: err.message });
  }
});

router.delete('/admin/users/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const target = await getAsync('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!target) {
      res.status(404).json({ error: 'Compte introuvable.' });
      return;
    }
    if (target.role === 'admin') {
      const { count } = await getAsync("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
      if (count <= 1) {
        res.status(409).json({ error: 'Le dernier compte admin ne peut pas être supprimé.' });
        return;
      }
    }
    await runAsync('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// ============= DAILY PLANNING =============

router.get('/planning', async (req: Request, res: Response) => {
  const month = req.query.month;
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    res.status(400).json({ error: 'Le mois doit être au format AAAA-MM.' });
    return;
  }

  try {
    const rows = await allAsync(
      `SELECT pr.id, pr.userId, pr.date, pr.period, pr.space, pr.note, pr.peopleCount,
              u.name AS userName, u.color
       FROM planning_registrations pr
       JOIN users u ON u.id = pr.userId
       WHERE pr.date LIKE ?
       ORDER BY pr.date, pr.period, pr.space, u.name`,
      [`${month}%`]
    ) as PlanningRegistrationRow[];

    const days = new Map<string, PlanningDay>();
    const [year, monthNumber] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const date = `${month}-${String(dayNumber).padStart(2, '0')}`;
      days.set(date, {
        date,
        morning: { wood: [], metal: [] },
        afternoon: { wood: [], metal: [] },
      });
    }

    for (const row of rows) {
      const day = days.get(row.date);
      if (day) {
        day[row.period][row.space].push({
          id: row.id,
          userId: row.userId,
          userName: row.userName,
          color: row.color,
          note: row.note,
          peopleCount: row.peopleCount,
        });
      }
    }

    res.json([...days.values()]);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.post('/planning/registrations', async (req: Request, res: Response) => {
  const { date, period, space } = req.body;
  const userId = req.authUser?.id;
  const peopleCount = Number(req.body.peopleCount ?? 1);
  const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
  if (!userId || !validPlanningDate(date) || !Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 3 ||
      (req.authUser?.role === 'artisan' && peopleCount !== 1) ||
      !['morning', 'afternoon'].includes(period) || !['wood', 'metal'].includes(space) || note.length > 300) {
    res.status(400).json({ error: 'Inscription invalide.' });
    return;
  }

  try {
    await runAsync('BEGIN IMMEDIATE');
    const existing = await getAsync(
      'SELECT id FROM planning_registrations WHERE userId = ? AND date = ? AND period = ? AND space = ?',
      [userId, date, period, space]
    );
    if (existing) {
      await runAsync('ROLLBACK');
      res.status(409).json({ error: 'Vous êtes déjà inscrit à cet espace.' });
      return;
    }

    const { count } = await getAsync(
      'SELECT COALESCE(SUM(peopleCount), 0) AS count FROM planning_registrations WHERE date = ? AND period = ? AND space = ?',
      [date, period, space]
    );
    if (count + peopleCount > 3) {
      await runAsync('ROLLBACK');
      res.status(409).json({ error: 'Cet espace est déjà complet pour cette période.' });
      return;
    }

    const result = await runAsync(
      'INSERT INTO planning_registrations (userId, date, period, space, peopleCount, note) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, date, period, space, peopleCount, note || null]
    );
    await runAsync('COMMIT');
    res.status(201).json({ id: result.lastID, userId, date, period, space, peopleCount, note: note || null });
  } catch (err) {
    await runAsync('ROLLBACK').catch(() => undefined);
    res.status(500).json({ error: err });
  }
});

router.post('/planning/registrations/batch', async (req: Request, res: Response) => {
  const userId = req.authUser?.id;
  const { date, slots } = req.body;
  const peopleCount = Number(req.body.peopleCount ?? 1);
  const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
  const validSlots = Array.isArray(slots) && slots.length >= 1 && slots.length <= 4 &&
    slots.every((slot) => ['morning', 'afternoon'].includes(slot?.period) && ['wood', 'metal'].includes(slot?.space));
  const uniqueSlots = validSlots && new Set(slots.map((slot: any) => `${slot.period}-${slot.space}`)).size === slots.length;
  if (!userId || !validPlanningDate(date) || !validSlots || !uniqueSlots ||
      !Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 3 ||
      (req.authUser?.role === 'artisan' && peopleCount !== 1) || note.length > 300) {
    res.status(400).json({ error: 'Sélectionnez de 1 à 4 créneaux valides et vérifiez le nombre de personnes.' });
    return;
  }

  try {
    await runAsync('BEGIN IMMEDIATE');
    const registrations = [];
    for (const slot of slots) {
      const existing = await getAsync(
        'SELECT id, peopleCount FROM planning_registrations WHERE userId = ? AND date = ? AND period = ? AND space = ?',
        [userId, date, slot.period, slot.space]
      );
      const { count } = await getAsync(
        'SELECT COALESCE(SUM(peopleCount), 0) AS count FROM planning_registrations WHERE date = ? AND period = ? AND space = ?',
        [date, slot.period, slot.space]
      );
      const availableCount = count - (existing?.peopleCount ?? 0);
      if (availableCount + peopleCount > 3) {
        await runAsync('ROLLBACK');
        res.status(409).json({ error: `Il n’y a pas assez de places pour ${slot.period === 'morning' ? 'le matin' : 'l’après-midi'} en ${slot.space === 'wood' ? 'bois' : 'métal'}.` });
        return;
      }

      if (existing) {
        await runAsync(
          'UPDATE planning_registrations SET peopleCount = ?, note = ? WHERE id = ?',
          [peopleCount, note || null, existing.id]
        );
        registrations.push({ id: existing.id, ...slot, peopleCount, note: note || null });
      } else {
        const result = await runAsync(
          'INSERT INTO planning_registrations (userId, date, period, space, peopleCount, note) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, date, slot.period, slot.space, peopleCount, note || null]
        );
        registrations.push({ id: result.lastID, ...slot, peopleCount, note: note || null });
      }
    }
    await runAsync('COMMIT');
    res.status(201).json({ registrations });
  } catch (err) {
    await runAsync('ROLLBACK').catch(() => undefined);
    res.status(500).json({ error: err });
  }
});

router.put('/planning/registrations/:id', async (req: Request, res: Response) => {
  const user = req.authUser;
  const note = req.body.note;
  if (!user || typeof note !== 'string' || note.trim().length > 300) {
    res.status(400).json({ error: 'Note invalide.' });
    return;
  }

  try {
    const result = user.role === 'admin'
      ? await runAsync('UPDATE planning_registrations SET note = ? WHERE id = ?', [note.trim() || null, req.params.id])
      : await runAsync('UPDATE planning_registrations SET note = ? WHERE id = ? AND userId = ?', [note.trim() || null, req.params.id, user.id]);
    if (!result.changes) {
      res.status(404).json({ error: 'Inscription introuvable.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.delete('/planning/registrations/:id', async (req: Request, res: Response) => {
  const user = req.authUser!;
  try {
    const result = user.role === 'admin'
      ? await runAsync('DELETE FROM planning_registrations WHERE id = ?', [req.params.id])
      : await runAsync('DELETE FROM planning_registrations WHERE id = ? AND userId = ?', [req.params.id, user.id]);
    res.json({ success: result.changes > 0 });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// ============= ATTENDANCE (CLOCKING) =============

router.get('/attendance', requireRole('admin', 'artisan'), async (req: Request, res: Response) => {
  try {
    const month = req.query.month;
    const userId = req.authUser?.role === 'admin' ? req.query.userId : req.authUser?.id;
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

router.get('/admin/attendance', requireRole('admin'), async (req: Request, res: Response) => {
  const month = req.query.month;
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    res.status(400).json({ error: 'Le mois doit être au format AAAA-MM.' });
    return;
  }

  try {
    const rows = await allAsync(
      `SELECT u.id AS userId, u.firstName, u.lastName,
              COUNT(CASE WHEN a.present = 1 THEN 1 END) AS fullDaysSpent
       FROM users u
       LEFT JOIN attendance a ON a.userId = u.id AND a.date LIKE ?
       WHERE u.role = 'artisan'
       GROUP BY u.id, u.firstName, u.lastName
       ORDER BY u.lastName, u.firstName`,
      [`${month}%`]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.get('/admin/attendance/export/:month', requireRole('admin'), async (req: Request, res: Response) => {
  const { month } = req.params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    res.status(400).json({ error: 'Le mois doit être au format AAAA-MM.' });
    return;
  }

  try {
    const rows = await allAsync(
      `SELECT u.firstName, u.lastName,
              COUNT(CASE WHEN a.present = 1 THEN 1 END) AS fullDaysSpent
       FROM users u
       LEFT JOIN attendance a ON a.userId = u.id AND a.date LIKE ?
       WHERE u.role = 'artisan'
       GROUP BY u.id, u.firstName, u.lastName
       ORDER BY u.lastName, u.firstName`,
      [`${month}%`]
    );

    const csvRows = ['Name surname,Full days spent', ...rows.map((row: any) => {
      const name = `${row.firstName} ${row.lastName}`.replace(/"/g, '""');
      return `"${name}",${row.fullDaysSpent}`;
    })];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="artisan-attendance-${month}.csv"`);
    res.send(`\uFEFF${csvRows.join('\r\n')}\r\n`);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.post('/attendance', requireRole('admin', 'artisan'), async (req: Request, res: Response) => {
  try {
    const userId = req.authUser?.role === 'admin' ? Number(req.body.userId) : req.authUser!.id;
    const { date, present } = req.body;
    if (!Number.isInteger(userId) || !validPlanningDate(date) || typeof present !== 'boolean') {
      res.status(400).json({ error: 'Pointage invalide.' });
      return;
    }
    await runAsync(
      'INSERT OR REPLACE INTO attendance (userId, date, present) VALUES (?, ?, ?)',
      [userId, date, present ? 1 : 0]
    );
    res.json({ userId, date, present });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.get('/attendance/export/:month', requireRole('admin', 'artisan'), async (req: Request, res: Response) => {
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

    const scopedQuery = req.authUser?.role === 'admin'
      ? query
      : query.replace('FROM users u', 'FROM users u').replace('GROUP BY u.id, u.name', 'WHERE u.id = ? GROUP BY u.id, u.name');
    const rows = await allAsync(scopedQuery, req.authUser?.role === 'admin'
      ? [monthFilter]
      : [monthFilter, req.authUser!.id]);
    
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

router.get('/tools', requireRole('admin', 'artisan'), async (req: Request, res: Response) => {
  try {
    const tools = await allAsync('SELECT * FROM tools ORDER BY name');
    res.json(tools);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.post('/tools', requireRole('admin'), async (req: Request, res: Response) => {
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

router.get('/tool-borrows', requireRole('admin', 'artisan'), async (req: Request, res: Response) => {
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
      WHERE tb.returnDate IS NULL${req.authUser?.role === 'admin' ? '' : ' AND tb.userId = ?'}
      ORDER BY tb.borrowDate DESC
    `;
    const rows = await allAsync(query, req.authUser?.role === 'admin' ? [] : [req.authUser!.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.post('/tool-borrows', requireRole('admin', 'artisan'), async (req: Request, res: Response) => {
  try {
    const toolId = Number(req.body.toolId);
    const userId = req.authUser?.role === 'admin' ? Number(req.body.userId ?? req.authUser.id) : req.authUser!.id;
    if (!Number.isInteger(toolId) || !Number.isInteger(userId)) {
      res.status(400).json({ error: 'Emprunt invalide.' });
      return;
    }
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

router.put('/tool-borrows/:id/return', requireRole('admin', 'artisan'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();
    const result = req.authUser?.role === 'admin'
      ? await runAsync('UPDATE tool_borrows SET returnDate = ? WHERE id = ?', [now, id])
      : await runAsync('UPDATE tool_borrows SET returnDate = ? WHERE id = ? AND userId = ?', [now, id, req.authUser!.id]);
    res.json({ success: result.changes > 0 });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.delete('/tools/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM tools WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

export default router;
