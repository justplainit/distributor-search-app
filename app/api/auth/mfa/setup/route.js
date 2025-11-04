import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';

// QRCode needs to be required (CommonJS) for Node.js compatibility
const QRCode = require('qrcode');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEV_MODE = process.env.DEV_MODE === 'true' || !process.env.DATABASE_URL;

// Helper to get user from token
async function getUserFromToken(token) {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    if (DEV_MODE) {
      return { id: 1, email: 'dev@test.com', name: 'Dev User' };
    }

    const path = require('path');
    const { query } = require(path.join(process.cwd(), 'database', 'connection'));
    
    const result = await query('SELECT id, email, name, mfa_enabled, mfa_secret FROM users WHERE id = $1', [decoded.userId]);
    return result.rows[0] || null;
  } catch (error) {
    return null;
  }
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // If MFA already enabled, return existing secret (for re-display)
    if (user.mfa_enabled && user.mfa_secret) {
      const otpauthUrl = speakeasy.otpauthURL({
        secret: user.mfa_secret,
        label: `${user.email}`,
        issuer: 'Distributor Search',
        encoding: 'ascii',
      });

      let qrCodeDataUrl = '';
      if (QRCode) {
        qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      }

      return NextResponse.json({
        secret: user.mfa_secret,
        qrCode: qrCodeDataUrl,
        enabled: true,
      });
    }

    // Generate new MFA secret
    const secret = speakeasy.generateSecret({
      name: `${user.email}`,
      issuer: 'Distributor Search',
      length: 32,
    });

    // Generate QR code
    let qrCodeDataUrl = '';
    if (QRCode) {
      qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    } else {
      // Fallback: return secret without QR code
      qrCodeDataUrl = '';
    }

    // In dev mode, just return the secret
    if (DEV_MODE) {
      return NextResponse.json({
        secret: secret.base32,
        qrCode: qrCodeDataUrl,
        enabled: false,
      });
    }

    // Save secret to database (but don't enable MFA yet - user needs to verify first)
    const path = require('path');
    const { query } = require(path.join(process.cwd(), 'database', 'connection'));
    
    await query(
      'UPDATE users SET mfa_secret = $1 WHERE id = $2',
      [secret.base32, user.id]
    );

    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      enabled: false,
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    return NextResponse.json({ error: 'MFA setup failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { token: mfaToken } = body;

    const authHeader = request.headers.get('authorization');
    const userToken = authHeader?.replace('Bearer ', '');

    if (!userToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await getUserFromToken(userToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!user.mfa_secret) {
      return NextResponse.json({ error: 'MFA secret not found. Please set up MFA first.' }, { status: 400 });
    }

    // Verify the MFA token
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'ascii',
      token: mfaToken,
      window: 2,
    });

    if (!verified) {
      return NextResponse.json({ error: 'Invalid MFA code' }, { status: 400 });
    }

    // Enable MFA for the user
    if (DEV_MODE) {
      return NextResponse.json({ message: 'MFA enabled successfully (dev mode)' });
    }

    const path = require('path');
    const { query } = require(path.join(process.cwd(), 'database', 'connection'));
    
    await query(
      'UPDATE users SET mfa_enabled = TRUE WHERE id = $1',
      [user.id]
    );

    return NextResponse.json({ message: 'MFA enabled successfully' });
  } catch (error) {
    console.error('MFA enable error:', error);
    return NextResponse.json({ error: 'MFA enable failed' }, { status: 500 });
  }
}

