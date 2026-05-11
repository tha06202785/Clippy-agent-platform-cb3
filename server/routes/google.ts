import { Request, Response } from 'express';
import https from 'https';
import fs from 'fs';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '/api/google/callback';
const TOKEN_FILE = '/var/www/clippy.com/google-tokens.json';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

function saveTokens(tokens: any) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

function loadTokens() {
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); }
  catch { return null; }
}

function httpPost(hostname: string, path: string, postData: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      }
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error(data)); } });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function httpGet(hostname: string, path: string, token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error(data)); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function getAccessToken(): Promise<string> {
  const tokens = loadTokens();
  if (!tokens) throw new Error('Calendar not connected');
  const result = await httpPost('oauth2.googleapis.com', '/token',
    new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      refresh_token: tokens.refresh_token, grant_type: 'refresh_token',
    }).toString()
  );
  if (!result.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(result));
  return result.access_token;
}

export function googleAuthRedirect(req: Request, res: Response) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  res.redirect(url.toString());
}

export async function googleAuthCallback(req: Request, res: Response) {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('No code');
  try {
    const tokens = await httpPost('oauth2.googleapis.com', '/token',
      new URLSearchParams({
        code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
      }).toString()
    );
    saveTokens(tokens);
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#f0fdf4">
      <div style="max-width:400px;margin:auto;background:white;padding:40px;border-radius:16px;box-shadow:0 2px 20px rgba(0,0,0,0.1)">
        <div style="font-size:60px">✅</div>
        <h1 style="color:#16a34a">Google Calendar Connected!</h1>
        <p style="color:#666">Your calendar is now linked to Clippy.<br>You can close this tab.</p>
      </div></body></html>`);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCalendarEvents(req: Request, res: Response) {
  try {
    const token = await getAccessToken();
    const { date } = req.query;
    let timeMin: Date, timeMax: Date;
    if (date) {
      timeMin = new Date(date as string); timeMin.setHours(0,0,0,0);
      timeMax = new Date(date as string); timeMax.setHours(23,59,59,999);
    } else {
      timeMin = new Date(); timeMin.setHours(0,0,0,0);
      timeMax = new Date(); timeMax.setHours(23,59,59,999);
    }
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(),
      singleEvents: 'true', orderBy: 'startTime',
    });
    const data = await httpGet('www.googleapis.com', `/calendar/v3/calendars/primary/events?${params}`, token);
    res.json({ events: data.items || [], count: (data.items || []).length });
  } catch (err: any) {
    res.status(err.message.includes('not connected') ? 401 : 500).json({ error: err.message });
  }
}

export async function createCalendarEvent(req: Request, res: Response) {
  try {
    const token = await getAccessToken();
    const { title, start, end, description, location } = req.body;
    if (!title || !start || !end) return res.status(400).json({ error: 'title, start, end required' });
    const event = {
      summary: title, description, location,
      start: { dateTime: new Date(start).toISOString(), timeZone: 'Australia/Sydney' },
      end: { dateTime: new Date(end).toISOString(), timeZone: 'Australia/Sydney' },
    };
    const postData = JSON.stringify(event);
    const result = await new Promise<any>((resolve, reject) => {
      const req2 = https.request({
        hostname: 'www.googleapis.com', method: 'POST',
        path: '/calendar/v3/calendars/primary/events',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (r) => {
        let d = ''; r.on('data', c => d += c);
        r.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error(d)); } });
      });
      req2.on('error', reject); req2.write(postData); req2.end();
    });
    res.json({ success: true, event: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export function calendarStatus(req: Request, res: Response) {
  const tokens = loadTokens();
  res.json({ connected: !!tokens, hasRefreshToken: !!(tokens?.refresh_token) });
}
