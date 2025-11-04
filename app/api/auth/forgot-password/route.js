import { NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEV_MODE = process.env.DEV_MODE === 'true' || !process.env.DATABASE_URL;

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Dev mode: return success (for testing)
    if (DEV_MODE) {
      return NextResponse.json({
        message: 'Password reset email sent (dev mode)',
      });
    }

    // Production mode: database lookup
    const path = require('path');
    const { query } = require(path.join(process.cwd(), 'database', 'connection'));

    const userResult = await query('SELECT id, email, name FROM users WHERE email = $1', [email]);
    
    // Don't reveal if user exists or not (security best practice)
    if (userResult.rows.length === 0) {
      return NextResponse.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour expiry

    // Save reset token to database
    await query(
      'UPDATE users SET verification_token = $1, verification_token_expires_at = $2 WHERE id = $3',
      [resetToken, resetTokenExpires, user.id]
    );

    // TODO: Send password reset email using nodemailer
    // For now, we'll return the token in dev mode only
    // In production, you should send an email with a link like:
    // https://your-app.com/reset-password?token=RESET_TOKEN

    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

