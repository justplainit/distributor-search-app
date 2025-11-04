import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEV_MODE = process.env.DEV_MODE === 'true' || !process.env.DATABASE_URL;

export async function POST(request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 });
    }

    // Dev mode: return success
    if (DEV_MODE) {
      return NextResponse.json({
        message: 'Password reset successful (dev mode)',
      });
    }

    // Production mode: verify token and reset password
    const path = require('path');
    const { query } = require(path.join(process.cwd(), 'database', 'connection'));

    // Find user with valid reset token
    const userResult = await query(
      `SELECT id, email FROM users 
       WHERE verification_token = $1 
       AND verification_token_expires_at > NOW()`,
      [token]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid or expired reset token' 
      }, { status: 400 });
    }

    const user = userResult.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await query(
      `UPDATE users 
       SET password_hash = $1, 
           verification_token = NULL, 
           verification_token_expires_at = NULL,
           failed_login_attempts = 0,
           locked_until = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    return NextResponse.json({
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}

