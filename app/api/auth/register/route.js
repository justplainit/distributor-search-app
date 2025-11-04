import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEV_MODE = process.env.DEV_MODE === 'true' || !process.env.DATABASE_URL;
const ALLOWED_DOMAIN = 'justplainit.co.za';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate email domain
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (emailDomain !== ALLOWED_DOMAIN) {
      return NextResponse.json({ 
        error: `Only @${ALLOWED_DOMAIN} email addresses are allowed` 
      }, { status: 403 });
    }

    // Validate password strength
    if (!password || password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 });
    }

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ 
        error: 'Name must be at least 2 characters long' 
      }, { status: 400 });
    }

    // Dev mode: create user in memory (for testing)
    if (DEV_MODE) {
      return NextResponse.json({
        message: 'Registration successful (dev mode)',
        user: {
          email,
          name,
          email_verified: true, // Auto-verify in dev mode
        },
      });
    }

    // Production mode: database registration
    const path = require('path');
    const { query } = require(path.join(process.cwd(), 'database', 'connection'));

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24); // 24 hours

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, name, verification_token, verification_token_expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, email_verified, created_at`,
      [email, passwordHash, name.trim(), verificationToken, verificationTokenExpires]
    );

    const user = result.rows[0];

    // TODO: Send verification email (using nodemailer)
    // For now, we'll auto-verify in dev mode

    return NextResponse.json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.email_verified,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}

