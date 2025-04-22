// server/session.js
import { SignJWT, jwtVerify } from 'jose';
import { serialize } from 'cookie';
import dotenv from 'dotenv'
dotenv.config();

const secretKey = process.env.SESSION_SECRET || 'your-secret-key';
const encodedKey = new TextEncoder().encode(secretKey);

export async function encrypt(payload, expiresIn = '7d') {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(encodedKey);
}

export async function decrypt(token) {
    try {
        const { payload } = await jwtVerify(token, encodedKey, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (err) {
        console.error('Failed to verify session:', err.message);
        return null;
    }
}

export async function createSession(res, payload, expiresIn = '7d') {
    const token = await encrypt(payload, expiresIn);

    res.setHeader('Set-Cookie', serialize('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Secure only in production
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
    }));
}

export function deleteSession(res) {
    res.setHeader('Set-Cookie', serialize('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    }));
}

export async function decryptSession(req) {
    const token = req.cookies.session;
    if (!token) return null;
    return await decrypt(token);
}
