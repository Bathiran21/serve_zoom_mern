// server/session.js
import { SignJWT, jwtVerify } from 'jose';
import { serialize } from 'cookie';
import dotenv from 'dotenv'
dotenv.config();

const secretKey = process.env.SESSION_SECRET || 'your-secret-key';
const encodedKey = new TextEncoder().encode(secretKey);

export async function encrypt(payload, expiresIn = '7d') {
    console.log("payload on encrypt", payload)
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

    console.log("token on createSession", token)

    res.cookie('session', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days!
    })
}

export function deleteSession(res) {
    res.cookie('session', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 0,
    });
}

export async function decryptSession(req) {
    const token = req.cookies.session;
    console.log("token on decryptSession", token)
    if (!token) return null;
    return await decrypt(token);
}
