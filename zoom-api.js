// server/zoom-api.js
import axios from 'axios';
import { URL } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv'
dotenv.config();

const ZOOM_HOST = process.env.ZOOM_HOST || 'https://zoom.us';
const ZOOM_API_HOST = process.env.ZOOM_API_HOST || 'https://api.zoom.us';

function base64URL(str) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function rand(fmt, depth = 32) {
    return crypto.randomBytes(depth).toString(fmt);
}

function tokenRequest(params, id = '', secret = '') {
    const username = id || process.env.ZOOM_CLIENT_ID;
    const password = secret || process.env.ZOOM_CLIENT_SECRET;

    return axios({
        data: new URLSearchParams(params).toString(),
        baseURL: ZOOM_HOST,
        url: '/oauth/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
            username,
            password,
        },
    }).then(({ data }) => Promise.resolve(data));
}

function apiRequest(method, endpoint, token, data = null) {
    return axios({
        data,
        method,
        baseURL: ZOOM_API_HOST,
        url: `/v2${endpoint}`,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    }).then(({ data }) => Promise.resolve(data));
}

export function getInstallURL() {
    const state = rand('base64');
    const verifier = rand('ascii');

    const digest = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64')
        .toString();

    const challenge = base64URL(digest);

    const url = new URL('/oauth/authorize', ZOOM_HOST);

    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', process.env.ZOOM_CLIENT_ID);
    url.searchParams.set('redirect_uri', process.env.ZOOM_REDIRECT_URL);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', state);

    return { url, state, verifier };
}

export async function getToken(code, verifier) {
    return tokenRequest({
        code,
        code_verifier: verifier,
        redirect_uri: process.env.ZOOM_REDIRECT_URL,
        grant_type: 'authorization_code',
    });
}

export async function refreshToken(token) {
    return tokenRequest({
        refresh_token: token,
        grant_type: 'refresh_token',
    });
}

export function getZoomUser(uid, token) {
    return apiRequest('GET', `/users/${uid}`, token);
}

export function getDeeplink(token) {
    return apiRequest('POST', '/zoomapp/deeplink', token, {})
        .then((data) => Promise.resolve(data.deeplink));
}
    