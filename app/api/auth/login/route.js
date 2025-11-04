import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mark as dynamic route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dev mode: auto-login
const DEV_MODE = process.env.DEV_MODE === 'true' || !process.env.DATABASE_URL;

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Dev mode: auto-login
    if (DEV_MODE) {
      const token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
      return NextResponse.json({
        token,
        user: {
          id: 1,
          email: 'dev@test.com',
          name: 'Dev User',
          role: 'admin',
        },
      });
    }

    // Production mode: database auth
    const path = require('path');
    const { query } = require(path.join(process.cwd(), 'database', 'connection'));
    const user = await query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (user.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Create session
    await query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.rows[0].id, token]
    );

    return NextResponse.json({
      token,
      user: {
        id: user.rows[0].id,
        email: user.rows[0].email,
        name: user.rows[0].name,
        role: user.rows[0].role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

