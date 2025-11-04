import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEV_MODE = process.env.DEV_MODE === 'true' || !process.env.DATABASE_URL;

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, mfaToken } = body;

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
        requiresMfa: false,
      });
    }

    // Production mode: database auth
    const path = require('path');
    const { query } = require(path.join(process.cwd(), 'database', 'connection'));
    
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = userResult.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json({ 
        error: 'Account is locked. Please try again later.' 
      }, { status: 423 });
    }

    // Verify password
    if (!user.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      // Increment failed login attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      let lockedUntil = null;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (failedAttempts >= 5) {
        lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + 30);
      }

      await query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
        [failedAttempts, lockedUntil, user.id]
      );

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if MFA is enabled
    if (user.mfa_enabled && user.mfa_secret) {
      // If MFA token not provided, request it
      if (!mfaToken) {
        return NextResponse.json({ 
          requiresMfa: true,
          message: 'MFA code required' 
        }, { status: 200 });
      }

      // Verify MFA token
      const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'ascii',
        token: mfaToken,
        window: 2, // Allow 2 time steps (60 seconds) variance
      });

      if (!verified) {
        return NextResponse.json({ 
          error: 'Invalid MFA code' 
        }, { status: 401 });
      }
    }

    // Reset failed login attempts and unlock account
    await query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Check if email is verified
    if (!user.email_verified) {
      return NextResponse.json({ 
        error: 'Please verify your email address before logging in',
        requiresVerification: true 
      }, { status: 403 });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    
    // Create session
    await query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, token]
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      requiresMfa: false,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
