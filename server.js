import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import cookieParser from 'cookie-parser';
import { getInstallURL, getToken, getDeeplink } from './zoom-api.js';
import { createSession, decryptSession, deleteSession} from './session.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());


// Check if app is inside Zoom
app.get('/api/zoom/is-zoom', (req, res) => {
  const isZoom = !!req.headers['x-zoom-app-device-type'];
  res.json({ isZoom });
});



// Route to initiate the OAuth flow (Zoom app install)
app.get('/auth/install', async (req, res) => {
  const { url, state, verifier } = getInstallURL();

  // Create session with state and verifier to validate later
  await createSession(res, { state, verifier });

  // Redirect to Zoom OAuth page
  res.redirect(url.toString());
});



// Callback route after Zoom OAuth
app.get('/auth/callback', async (req, res) => {
  const isZoom = !!req.headers['x-zoom-app-device-type'];
  console.log(isZoom)
  // if (!isZoom) {
  //   return res.status(403).send('Error 122: Launch this app from the Zoom client');
  // }

  const { code, state } = req.query;
  console.log("code")
  console.log("state")
  if (!code) {
    return res.status(400).json({ error: 'Invalid code parameter' });
  }

  const session = await decryptSession(req);
  if (!session) {
    return res.status(500).json({ error: 'Invalid session' });
  }

  if (!state || state !== session.state) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  try {
    const { verifier } = session;

    // Exchange code for access token
    const { access_token } = await getToken(code, verifier);

    // Fetch deeplink from Zoom
    const deeplink = await getDeeplink(access_token);

    // Optional: delete session cookie
    deleteSession(res);

    // Redirect user to Zoom App via deeplink
    return res.redirect(deeplink);
  } catch (error) {
    console.error('Callback error:', error);
    return res.status(500).json({ error: 'Failed to complete Zoom OAuth flow' });
  }
});

// Logout route
app.post('/api/logout', (req, res) => {
  deleteSession(res);
  res.json({ success: true });
});






app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
 