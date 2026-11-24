import express from 'express';
import { z } from 'zod';
import { requireAuth, signToken } from './auth';

export const app = express();
app.use(express.json());

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Demo login: any username, password must be "password123"
app.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  if (parsed.data.password !== 'password123') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  return res.status(200).json({ token: signToken(parsed.data.username) });
});

// Protected route
app.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ userId: (req as any).userId });
});
