import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import crypto from 'node:crypto';
import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { join } from 'node:path';
import { computeAdversaryImpact, type RedModel, type TheaterState } from './app/core/sim/red-adversary';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const angularApp = new AngularNodeAppEngine();

// ── Static files ──────────────────────────────────────────────────────────────

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

if (!process.env['APP_LOCK_PASSWORD']) {
  console.warn('[SECURITY] APP_LOCK_PASSWORD not set — using insecure dev fallback');
}
const LOCK_PASSWORD = process.env['APP_LOCK_PASSWORD'] ?? 'dev-only-unlock';
const LOCK_TOKEN_TTL_SECONDS = Number(process.env['APP_LOCK_TOKEN_TTL_SECONDS'] ?? 60 * 60);
const LOCK_COOKIE_NAME = 'steel_access';
const FASTAPI_BASE_URL = process.env['FASTAPI_BASE_URL'] ?? 'http://127.0.0.1:8000';
const FASTAPI_WS_URL = (() => {
  const url = new URL(FASTAPI_BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url;
})();
const PROXIED_API_PATHS = [
  /^\/api\/twins\/campaign$/,
  /^\/api\/twins\/bases$/,
  /^\/api\/twins\/threats$/,
  /^\/api\/twins\/policy$/,
  /^\/api\/twins\/engage$/,
  /^\/api\/twins\/readiness\/projection$/,
  /^\/api\/twins\/reset$/,
  /^\/api\/twins\/inject-tracks$/,
  /^\/api\/twins\/decision-fabric$/,
  /^\/api\/coa\/solve$/,
  /^\/api\/lab\/run$/,
  /^\/api\/ml\/predict$/,
  /^\/api\/ml\/deep-sim$/,
  /^\/api\/rationale\/coa$/,
  /^\/api\/rationale\/lab-result$/,
];

// ── Mock theater state ────────────────────────────────────────────────────────

interface Geometry { x: number; y: number; heading: number; velocity: number; }
interface MissileInv { interceptorShort: number; interceptorMid: number; interceptorLong: number; }
interface IntentDist { probe: number; feint: number; strike: number; saturation: number; decoy: number; }

interface MockBase {
  id: string; name: string; role: string; readiness: number;
  sortieCapacity: number; runwayStatus: string; airframesAvailable: number;
  crewsAvailable: number; crewFatigue: number; fuelStock: number; depletionRate: number;
  missileInventory: MissileInv; recoveryTime: string; threatExposure: number; isReserved: boolean;
}

interface MockThreat {
  id: string; class: string; intent: string; confidence: number;
  timeToTarget: number; targetId: string; geometry: Geometry;
  status: 'IDENTIFIED' | 'TRACKING' | 'ENGAGED' | 'NEUTRALIZED' | 'LEAKED';
  uncertaintySource?: string; intentDistribution: IntentDist;
  classificationConfidence: number; sensorQuality: number; jammingProbability: number;
}

interface MockCOA {
  id: string; name: string; type: string; rationale: string;
  projectedOutcome: {
    intercepts: number; leakage: number; cost: number;
    readinessDeltaByBase: Record<string, number>;
    asymmetryRatio: number; robustnessScore: number; confidence: number;
  };
  assignments: { threatId: string; baseId: string; effectorType: string; pk: number; }[];
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/health' ||
    pathname === '/unlock' ||
    pathname === '/logout' ||
    pathname === '/showcase' ||
    pathname.startsWith('/showcase/')
  );
}

function shouldProxyApiPath(pathname: string): boolean {
  return PROXIED_API_PATHS.some(pattern => pattern.test(pathname));
}

async function proxyApiRequest(req: express.Request, res: express.Response): Promise<void> {
  const targetUrl = new URL(req.originalUrl, FASTAPI_BASE_URL);
  const requestHeaders = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) requestHeaders.append(key, item);
      continue;
    }
    requestHeaders.set(key, value);
  }

  requestHeaders.set('host', targetUrl.host);

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody && req.body !== undefined
    ? JSON.stringify(req.body)
    : undefined;
  if (body && !requestHeaders.has('content-type')) {
    requestHeaders.set('content-type', 'application/json');
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: requestHeaders,
      body,
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    const payload = Buffer.from(await upstream.arrayBuffer());
    res.send(payload);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown upstream error';
    res.status(502).json({
      error: 'FastAPI upstream unavailable',
      detail,
      upstream: FASTAPI_BASE_URL,
    });
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName) return cookies;
    cookies[decodeURIComponent(rawName)] = decodeURIComponent(rawValue.join('=') ?? '');
    return cookies;
  }, {});
}

function lockSecret(): string {
  return LOCK_PASSWORD;
}

function signToken(expiresAt: number): string {
  const payload = String(expiresAt);
  const signature = crypto
    .createHmac('sha256', lockSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expiresAtText, signature] = token.split('.');
  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt) || !signature) return false;
  if (Date.now() > expiresAt) return false;

  const expected = crypto
    .createHmac('sha256', lockSecret())
    .update(expiresAtText)
    .digest('base64url');
  const actualBuffer = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function isAuthenticated(req: express.Request): boolean {
  const cookies = parseCookies(req.headers.cookie);
  return verifyToken(cookies[LOCK_COOKIE_NAME]);
}

function secureCookieFlag(req: express.Request): string {
  const forwardedProto = String(req.headers['x-forwarded-proto'] ?? '').toLowerCase();
  const isHttps = forwardedProto === 'https' || req.secure || process.env['NODE_ENV'] === 'production';
  return isHttps ? '; Secure' : '';
}

function authCookieHeader(req: express.Request, expiresAt: number): string {
  return [
    `${LOCK_COOKIE_NAME}=${signToken(expiresAt)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secureCookieFlag(req),
    `Max-Age=${LOCK_TOKEN_TTL_SECONDS}`,
  ].join('; ');
}

function clearAuthCookieHeader(req: express.Request): string {
  return [
    `${LOCK_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secureCookieFlag(req),
    'Max-Age=0',
  ].join('; ');
}

function renderLockPage(message = ''): string {
  const notice = message
    ? `<div class="notice">${escapeHtml(message)}</div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Steel Access</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <style>

    :root {
      color-scheme: dark;
      --bg: #050b12;
      --panel: rgba(7, 14, 23, 0.78);
      --panel-border: rgba(148, 189, 255, 0.18);
      --text: #edf5ff;
      --muted: #9ab0c8;
      --accent: #5ca7ff;
      --accent-2: #7ce0be;
      --accent-3: #9b8cff;
      --danger: #ff8181;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at 20% 20%, rgba(92, 167, 255, 0.18), transparent 24%),
        radial-gradient(circle at 80% 18%, rgba(124, 224, 190, 0.12), transparent 22%),
        radial-gradient(circle at 70% 80%, rgba(155, 140, 255, 0.12), transparent 26%),
        linear-gradient(180deg, #03070c 0%, var(--bg) 100%);
      padding: 28px;
      overflow: hidden;
    }
    body::before,
    body::after {
      content: "";
      position: fixed;
      inset: auto;
      width: 42rem;
      height: 42rem;
      border-radius: 50%;
      pointer-events: none;
      filter: blur(30px);
      opacity: 0.28;
      z-index: 0;
    }
    body::before {
      top: -12rem;
      left: -10rem;
      background: radial-gradient(circle, rgba(92, 167, 255, 0.3) 0%, rgba(92, 167, 255, 0) 70%);
    }
    body::after {
      bottom: -14rem;
      right: -10rem;
      background: radial-gradient(circle, rgba(124, 224, 190, 0.24) 0%, rgba(124, 224, 190, 0) 70%);
    }
    .card {
      position: relative;
      z-index: 1;
      width: min(100%, 920px);
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      overflow: hidden;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)),
        var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: 28px;
      box-shadow:
        0 24px 80px rgba(0, 0, 0, 0.55),
        inset 0 1px 0 rgba(255,255,255,0.05);
      backdrop-filter: blur(24px);
    }
    .hero {
      padding: 34px;
      border-right: 1px solid rgba(148, 189, 255, 0.12);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100%;
    }
    .form-panel {
      padding: 34px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 100%;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-transform: uppercase;
      letter-spacing: 0.24em;
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 14px;
    }
    .eyebrow::before {
      content: "";
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      box-shadow: 0 0 18px rgba(92, 167, 255, 0.8);
    }
    .title {
      margin: 0;
      font-size: clamp(34px, 5vw, 56px);
      line-height: 0.96;
      letter-spacing: -0.04em;
      max-width: 10ch;
    }
    .subtitle {
      margin: 16px 0 0;
      max-width: 34rem;
      font-size: 16px;
      line-height: 1.65;
      color: var(--muted);
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 24px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 32px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid rgba(148, 189, 255, 0.16);
      background: rgba(255,255,255,0.04);
      font-size: 12px;
      color: var(--text);
    }
    .chip b {
      font-weight: 700;
      color: var(--accent-2);
    }
    .status {
      margin-top: 28px;
      padding: 18px;
      border-radius: 20px;
      border: 1px solid rgba(148, 189, 255, 0.14);
      background: rgba(255,255,255,0.03);
    }
    .status-label {
      display: block;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 10px;
      color: var(--muted);
      margin-bottom: 10px;
    }
    .status p {
      margin: 0;
      line-height: 1.6;
      color: rgba(237, 245, 255, 0.92);
    }
    form {
      display: grid;
      gap: 14px;
      margin-top: 8px;
    }
    input, button {
      font: inherit;
      border-radius: 14px;
      min-height: 52px;
    }
    input {
      width: 100%;
      border: 1px solid rgba(148, 189, 255, 0.18);
      background: rgba(255,255,255,0.03);
      color: var(--text);
      padding: 0 14px;
      outline: none;
    }
    input:focus {
      border-color: rgba(92, 167, 255, 0.8);
      box-shadow: 0 0 0 4px rgba(92, 167, 255, 0.14);
    }
    button {
      border: 0;
      background:
        linear-gradient(135deg, var(--accent), var(--accent-2) 52%, var(--accent-3));
      color: #02101a;
      font-weight: 800;
      cursor: pointer;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      box-shadow: 0 18px 36px rgba(92, 167, 255, 0.18);
    }
    .hint {
      margin-top: 14px;
      font-size: 13px;
      color: var(--muted);
      line-height: 1.5;
    }
    .notice {
      margin-bottom: 14px;
      border: 1px solid rgba(255, 122, 122, 0.25);
      background: rgba(255, 122, 122, 0.08);
      color: var(--danger);
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 14px;
    }
    .footer {
      margin-top: 26px;
      font-size: 12px;
      color: rgba(156, 176, 199, 0.72);
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .lock-mark {
      width: 60px;
      height: 60px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      margin-bottom: 20px;
      border: 1px solid rgba(148, 189, 255, 0.16);
      background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
      font-size: 26px;
    }
    .tiny {
      font-size: 12px;
      color: rgba(156, 176, 199, 0.88);
      line-height: 1.5;
      max-width: 28rem;
      margin-top: 18px;
    }
    @media (max-width: 860px) {
      .card {
        grid-template-columns: 1fr;
      }
      .hero {
        border-right: 0;
        border-bottom: 1px solid rgba(148, 189, 255, 0.12);
      }
    }
    @media (prefers-reduced-motion: no-preference) {
      .card {
        animation: floatIn 420ms ease-out both;
      }
      @keyframes floatIn {
        from { opacity: 0; transform: translateY(14px) scale(0.985); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    }
  </style>
</head>
<body>
  <section class="card">
    <div class="hero">
      <div>
        <div class="lock-mark">◌</div>
        <div class="eyebrow">Team Steel // Hackathon</div>
        <h1 class="title">Smart Stridsledning</h1>
        <p class="subtitle">Boreal Decision Twin Command Support Fabric. Secure operational interface.</p>
        <div class="meta-row">
          <span class="chip"><b>1h</b> token</span>
          <span class="chip"><b>Production</b> build</span>
          <span class="chip"><b>Audit</b> enabled</span>
        </div>
      </div>
      <div class="status">
        <span class="status-label">Access Protocol</span>
        <p>Operational access is restricted. All authentication attempts and session activities are recorded.</p>
      </div>
    </div>
    <div class="form-panel">
      <div class="eyebrow">Authenticate Console</div>
      ${notice}
      <form method="post" action="/unlock">
        <input type="password" name="password" placeholder="ENTER ACCESS KEY" autocomplete="current-password" autofocus />
        <button type="submit">INITIALIZE SESSION</button>
      </form>
      <a href="/showcase" style="display:block;text-align:center;margin-top:12px;padding:12px 20px;border:1px solid rgba(148,189,255,0.2);border-radius:14px;color:rgba(156,176,199,0.8);font-size:13px;text-decoration:none;letter-spacing:0.04em;transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(92,167,255,0.5)';this.style.color='#edf5ff'" onmouseout="this.style.borderColor='rgba(148,189,255,0.2)';this.style.color='rgba(156,176,199,0.8)'">Visa presentation →</a>
      <div class="hint">The command fabric is locked pending authentication.</div>
      <div class="tiny">Access token applies to SSR, API, and WebSocket channels.</div>
      <div class="footer">
        <span>Steel | Saab Hackathon</span>
        <span>BDT Engine 2.0.0</span>
      </div>
    </div>
  </section>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// ── Seed bases ────────────────────────────────────────────────────────────────

const BASES: MockBase[] = [
  {
    id: 'BASE-1', name: 'Northern Vanguard', role: 'PRIMARY',
    readiness: 0.82, sortieCapacity: 8, runwayStatus: 'OPERATIONAL',
    airframesAvailable: 6, crewsAvailable: 5, crewFatigue: 0.22, fuelStock: 0.75, depletionRate: 0.04,
    missileInventory: { interceptorShort: 12, interceptorMid: 8, interceptorLong: 4 },
    recoveryTime: '4h', threatExposure: 0.38, isReserved: false,
  },
  {
    id: 'BASE-2', name: 'Boreal Watch', role: 'FORWARD',
    readiness: 0.91, sortieCapacity: 6, runwayStatus: 'OPERATIONAL',
    airframesAvailable: 5, crewsAvailable: 4, crewFatigue: 0.15, fuelStock: 0.88, depletionRate: 0.02,
    missileInventory: { interceptorShort: 18, interceptorMid: 12, interceptorLong: 6 },
    recoveryTime: '2h', threatExposure: 0.61, isReserved: false,
  },
  {
    id: 'BASE-3', name: 'Eastern Sentinel', role: 'RESERVE',
    readiness: 0.64, sortieCapacity: 4, runwayStatus: 'DEGRADED',
    airframesAvailable: 3, crewsAvailable: 3, crewFatigue: 0.41, fuelStock: 0.52, depletionRate: 0.06,
    missileInventory: { interceptorShort: 6, interceptorMid: 4, interceptorLong: 2 },
    recoveryTime: '8h', threatExposure: 0.22, isReserved: true,
  },
  {
    id: 'BASE-4', name: 'Southern Anchor', role: 'SUPPORT',
    readiness: 0.77, sortieCapacity: 5, runwayStatus: 'OPERATIONAL',
    airframesAvailable: 4, crewsAvailable: 4, crewFatigue: 0.28, fuelStock: 0.71, depletionRate: 0.03,
    missileInventory: { interceptorShort: 10, interceptorMid: 7, interceptorLong: 3 },
    recoveryTime: '5h', threatExposure: 0.44, isReserved: false,
  },
  {
    id: 'BASE-5', name: 'Deep Reserve Alpha', role: 'STRATEGIC',
    readiness: 0.95, sortieCapacity: 10, runwayStatus: 'OPERATIONAL',
    airframesAvailable: 8, crewsAvailable: 7, crewFatigue: 0.08, fuelStock: 0.96, depletionRate: 0.01,
    missileInventory: { interceptorShort: 24, interceptorMid: 16, interceptorLong: 8 },
    recoveryTime: '1h', threatExposure: 0.11, isReserved: true,
  },
];

// ── Seed threats ──────────────────────────────────────────────────────────────

const SEED_THREATS: MockThreat[] = [
  {
    id: 'TRK-001', class: 'MISSILE', intent: 'STRIKE', confidence: 0.89,
    timeToTarget: 240, targetId: 'BASE-2',
    geometry: { x: 920, y: 120, heading: 185, velocity: 480 },
    status: 'TRACKING',
    intentDistribution: { probe: 0.02, feint: 0.03, strike: 0.89, saturation: 0.04, decoy: 0.02 },
    classificationConfidence: 0.91, sensorQuality: 0.88, jammingProbability: 0.05,
  },
  {
    id: 'TRK-002', class: 'DRONE', intent: 'FEINT', confidence: 0.54,
    timeToTarget: 380, targetId: 'BASE-1',
    geometry: { x: 750, y: 80, heading: 200, velocity: 95 },
    status: 'IDENTIFIED', uncertaintySource: 'Electronic Jamming',
    intentDistribution: { probe: 0.18, feint: 0.54, strike: 0.08, saturation: 0.12, decoy: 0.08 },
    classificationConfidence: 0.56, sensorQuality: 0.71, jammingProbability: 0.38,
  },
  {
    id: 'TRK-003', class: 'AIRCRAFT', intent: 'SATURATION', confidence: 0.76,
    timeToTarget: 175, targetId: 'BASE-4',
    geometry: { x: 1050, y: 150, heading: 195, velocity: 320 },
    status: 'TRACKING',
    intentDistribution: { probe: 0.04, feint: 0.09, strike: 0.11, saturation: 0.76, decoy: 0.00 },
    classificationConfidence: 0.78, sensorQuality: 0.83, jammingProbability: 0.12,
  },
  {
    id: 'TRK-004', class: 'MISSILE', intent: 'STRIKE', confidence: 0.94,
    timeToTarget: 120, targetId: 'BASE-2',
    geometry: { x: 1100, y: 95, heading: 175, velocity: 550 },
    status: 'ENGAGED',
    intentDistribution: { probe: 0.01, feint: 0.01, strike: 0.94, saturation: 0.03, decoy: 0.01 },
    classificationConfidence: 0.95, sensorQuality: 0.93, jammingProbability: 0.02,
  },
  {
    id: 'TRK-005', class: 'DRONE', intent: 'PROBE', confidence: 0.48,
    timeToTarget: 520, targetId: 'BASE-3',
    geometry: { x: 600, y: 60, heading: 210, velocity: 75 },
    status: 'IDENTIFIED', uncertaintySource: 'Sensor Entropy',
    intentDistribution: { probe: 0.48, feint: 0.24, strike: 0.05, saturation: 0.15, decoy: 0.08 },
    classificationConfidence: 0.50, sensorQuality: 0.62, jammingProbability: 0.25,
  },
];

// ── Seed COAs ─────────────────────────────────────────────────────────────────

const SEED_COAS: MockCOA[] = [
  {
    id: 'COA-MAX', name: 'Max Protection', type: 'MAX_PROTECTION',
    rationale: 'Prioritizes zero-leakage outcome. Commits Base-2 and Base-1 full effector depth against all inbound strikes.',
    projectedOutcome: {
      intercepts: 5, leakage: 0, cost: 1350000,
      readinessDeltaByBase: { 'BASE-1': -0.08, 'BASE-2': -0.12, 'BASE-3': -0.02, 'BASE-4': -0.04, 'BASE-5': 0.00 },
      asymmetryRatio: 1.1, robustnessScore: 0.68, confidence: 0.91,
    },
    assignments: [
      { threatId: 'TRK-001', baseId: 'BASE-2', effectorType: 'Long Range Interceptor', pk: 0.92 },
      { threatId: 'TRK-003', baseId: 'BASE-1', effectorType: 'Mid Range Interceptor', pk: 0.85 },
      { threatId: 'TRK-004', baseId: 'BASE-2', effectorType: 'Long Range Interceptor', pk: 0.94 },
    ],
  },
  {
    id: 'COA-BAL', name: 'Balanced Approach', type: 'BALANCED',
    rationale: 'Balanced tradeoff between intercept probability and interceptor preservation. Staggers effector assignments.',
    projectedOutcome: {
      intercepts: 4, leakage: 1, cost: 720000,
      readinessDeltaByBase: { 'BASE-1': -0.05, 'BASE-2': -0.07, 'BASE-3': -0.01, 'BASE-4': -0.02, 'BASE-5': 0.00 },
      asymmetryRatio: 3.6, robustnessScore: 0.82, confidence: 0.87,
    },
    assignments: [
      { threatId: 'TRK-001', baseId: 'BASE-2', effectorType: 'Mid Range Interceptor', pk: 0.84 },
      { threatId: 'TRK-004', baseId: 'BASE-1', effectorType: 'Long Range Interceptor', pk: 0.91 },
      { threatId: 'TRK-003', baseId: 'BASE-4', effectorType: 'Short Range Interceptor', pk: 0.72 },
    ],
  },
  {
    id: 'COA-DST', name: 'Deep Sustainability', type: 'DEEP_SUSTAINABILITY',
    rationale: 'Minimizes expenditure for follow-on wave resilience. Accepts up to 2 leakage events.',
    projectedOutcome: {
      intercepts: 3, leakage: 2, cost: 280000,
      readinessDeltaByBase: { 'BASE-1': -0.02, 'BASE-2': -0.03, 'BASE-3': 0.00, 'BASE-4': -0.01, 'BASE-5': 0.00 },
      asymmetryRatio: 9.2, robustnessScore: 0.91, confidence: 0.83,
    },
    assignments: [
      { threatId: 'TRK-004', baseId: 'BASE-2', effectorType: 'Long Range Interceptor', pk: 0.94 },
      { threatId: 'TRK-001', baseId: 'BASE-4', effectorType: 'Short Range Interceptor', pk: 0.68 },
    ],
  },
];

// ── Mutable theater state ─────────────────────────────────────────────────────

let simTime = 0;
let phase = 'phase-2';
let threats: MockThreat[] = SEED_THREATS.map(t => ({ ...t }));
let coas: MockCOA[] = [...SEED_COAS];
let policyWeights = { safety: 0.7, sustainability: 0.5, resilience: 0.6 };

// ── COA solve helper ──────────────────────────────────────────────────────────

function solveCOAsFromWeights(weights: Partial<typeof policyWeights>): typeof coas {
  const s = weights.safety ?? policyWeights.safety;
  const u = weights.sustainability ?? policyWeights.sustainability;
  const r = weights.resilience ?? policyWeights.resilience;
  return SEED_COAS.map(coa => ({
    ...coa,
    projectedOutcome: {
      ...coa.projectedOutcome,
      confidence: +((coa.projectedOutcome.confidence * (0.85 + s * 0.15 + r * 0.05)).toFixed(3)),
      robustnessScore: +((coa.projectedOutcome.robustnessScore * (0.9 + r * 0.1)).toFixed(3)),
      asymmetryRatio: +((coa.projectedOutcome.asymmetryRatio * (1.0 + u * 0.2)).toFixed(2)),
    },
  }));
}

// ── WebSocket clients ─────────────────────────────────────────────────────────

const wsClients = new Set<WebSocket>();

function buildSnapshot(type: 'FULL_SNAPSHOT' | 'DELTA') {
  return {
    type,
    simTime,
    threats: threats.filter(t => t.status !== 'NEUTRALIZED' && t.status !== 'LEAKED'),
    bases: BASES,
    phase,
  };
}

function broadcastToClients(payload: object) {
  const json = JSON.stringify(payload);
  for (const ws of wsClients) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(json); } catch { wsClients.delete(ws); }
    }
  }
}

function tick() {
  simTime += 2;
  threats = threats.map(t => {
    if (t.status === 'NEUTRALIZED' || t.status === 'LEAKED') return t;
    const tti = Math.max(0, t.timeToTarget - 2);
    const rad = t.geometry.heading * (Math.PI / 180);
    return {
      ...t,
      timeToTarget: tti,
      geometry: {
        ...t.geometry,
        x: +(t.geometry.x + Math.cos(rad) * (t.geometry.velocity / 50)).toFixed(1),
        y: +(t.geometry.y + Math.sin(rad) * (t.geometry.velocity / 50)).toFixed(1),
      },
      status: (tti === 0 && t.status === 'TRACKING' ? 'LEAKED' : t.status) as MockThreat['status'],
    };
  });
  if (wsClients.size > 0) broadcastToClients(buildSnapshot('DELTA'));
}

function resetState() {
  simTime = 0;
  phase = 'phase-2';
  threats = SEED_THREATS.map(t => ({ ...t }));
  coas = [...SEED_COAS];
  policyWeights = { safety: 0.7, sustainability: 0.5, resilience: 0.6 };
}

function injectTracks(count: number, type: 'FEINT' | 'KINETIC' | 'MIXED' | 'DRONE'): MockThreat[] {
  const newTracks: MockThreat[] = [];
  for (let i = 0; i < count; i++) {
    const id = `INJ-${Math.floor(Math.random() * 8999) + 1000}`;
    const isKinetic = type === 'KINETIC';
    const isDrone = type === 'DRONE';
    const isFeint = type === 'FEINT';
    const cls = isDrone ? 'DRONE' : (isKinetic ? 'MISSILE' : (Math.random() > 0.5 ? 'MISSILE' : 'AIRCRAFT'));
    const intent = isFeint ? 'FEINT' : (isKinetic ? 'STRIKE' : 'SATURATION');
    const conf = isFeint ? 0.35 + Math.random() * 0.2 : 0.72 + Math.random() * 0.2;
    newTracks.push({
      id, class: cls, intent, confidence: conf,
      timeToTarget: Math.floor(Math.random() * 300) + 100,
      targetId: `BASE-${Math.ceil(Math.random() * 5)}`,
      geometry: {
        x: 700 + (Math.random() - 0.5) * 500,
        y: 50 + Math.random() * 120,
        heading: 170 + (Math.random() - 0.5) * 30,
        velocity: isKinetic ? 450 + Math.random() * 100 : 80 + Math.random() * 80,
      },
      status: 'TRACKING',
      intentDistribution: isFeint
        ? { probe: 0.10, feint: conf, strike: 0.05, saturation: 0.10, decoy: Math.max(0, 1 - conf - 0.25) }
        : { probe: 0.02, feint: 0.03, strike: conf, saturation: Math.max(0, 1 - conf - 0.05), decoy: 0.02 },
      classificationConfidence: conf + 0.02,
      sensorQuality: 0.7 + Math.random() * 0.25,
      jammingProbability: isFeint ? 0.3 + Math.random() * 0.2 : Math.random() * 0.1,
    });
  }
  threats.push(...newTracks);
  return newTracks;
}

// ── REST API endpoints ────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'steel-lock',
    auth: 'optional',
    tokenTtlSeconds: LOCK_TOKEN_TTL_SECONDS,
  });
});

app.post('/unlock', (req, res) => {
  const password = String(req.body?.password ?? '');
  if (password !== LOCK_PASSWORD) {
    res.status(401).send(renderLockPage('Incorrect password.'));
    return;
  }

  const expiresAt = Date.now() + LOCK_TOKEN_TTL_SECONDS * 1000;
  res.setHeader('Set-Cookie', authCookieHeader(req, expiresAt));
  res.redirect(303, '/');
});

app.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', clearAuthCookieHeader(req));
  res.redirect(303, '/');
});

app.use((req, res, next) => {
  const pathname = req.path;
  if (isPublicPath(pathname)) {
    next();
    return;
  }

  if (isAuthenticated(req)) {
    next();
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    res.status(200).send(renderLockPage());
    return;
  }

  res.status(401).json({ error: 'Authentication required' });
});

app.use('/api', (req, res, next) => {
  const pathname = new URL(req.originalUrl, 'http://steel.local').pathname;
  if (!shouldProxyApiPath(pathname)) {
    next();
    return;
  }

  void proxyApiRequest(req, res);
});

app.get('/api/twins/campaign', (_req, res) => {
  res.json({
    bases: BASES,
    threats: threats.filter(t => t.status !== 'NEUTRALIZED' && t.status !== 'LEAKED'),
    policy: {
      id: 'POL-01', name: 'Standard Defence Posture',
      weights: policyWeights,
      readinessFloors: { 'BASE-1': 0.60, 'BASE-2': 0.80, 'BASE-3': 0.50, 'BASE-4': 0.65, 'BASE-5': 0.70 },
      guardrails: {
        civilianProtected: true, reserveInterceptorFloor: 12,
        minReadinessThreshold: 0.65, criticalAssetPriority: 0.75,
        engagementAuthority: 'SEMI',
      },
    },
    coas,
    simTime,
    phase,
  });
});

app.get('/api/twins/bases', (_req, res) => res.json(BASES));

app.get('/api/twins/threats', (_req, res) => {
  res.json(threats.filter(t => t.status !== 'NEUTRALIZED' && t.status !== 'LEAKED'));
});

app.get('/api/twins/readiness/projection', (_req, res) => {
  const projections = BASES.map(b => ({
    baseId: b.id,
    baseName: b.name,
    readinessNow: b.readiness,
    readiness6h:  +(Math.max(0.05, b.readiness - b.depletionRate * 6 * 0.5).toFixed(3)),
    readiness12h: +(Math.max(0.05, b.readiness - b.depletionRate * 12 * 0.5).toFixed(3)),
    readiness24h: +(Math.max(0.05, b.readiness - b.depletionRate * 24 * 0.5).toFixed(3)),
    lifeExpectancyHours: +(b.depletionRate > 0 ? ((b.readiness - 0.30) / (b.depletionRate * 0.5)).toFixed(1) : 999),
  }));
  res.json(projections);
});

app.post('/api/twins/policy', (req, res) => {
  const w = req.body?.policyWeights;
  if (w) {
    policyWeights = {
      safety:         w.safety         ?? policyWeights.safety,
      sustainability: w.sustainability ?? policyWeights.sustainability,
      resilience:     w.resilience     ?? policyWeights.resilience,
    };
  }
  res.json({ ok: true, weights: policyWeights });
});

app.post('/api/twins/engage', (req, res) => {
  const { trackId, baseId, effectorType } = req.body ?? {};
  const threat = threats.find(t => t.id === trackId);
  const base   = BASES.find(b => b.id === baseId);
  if (!threat || !base) {
    res.status(404).json({ error: 'Track or base not found' });
    return;
  }
  threat.status = 'ENGAGED';
  // Resolve engagement after 3 seconds with p(kill) ~0.87
  setTimeout(() => {
    if (Math.random() < 0.87) {
      threat.status = 'NEUTRALIZED';
    } else {
      threat.status = 'LEAKED';
    }
    broadcastToClients(buildSnapshot('DELTA'));
  }, 3000);
  res.json({ success: true, trackId, newStatus: 'ENGAGED', effectorType });
});

app.post('/api/twins/inject-tracks', (req, res) => {
  const { count = 3, type = 'MIXED' } = req.body ?? {};
  const injected = injectTracks(Number(count), type);
  broadcastToClients(buildSnapshot('DELTA'));
  res.json({ injected: injected.length, ids: injected.map(t => t.id) });
});

app.post('/api/twins/reset', (_req, res) => {
  resetState();
  broadcastToClients(buildSnapshot('FULL_SNAPSHOT'));
  res.json({ status: 'reset', simTime, bases: BASES.length, threats: threats.length });
});

app.post('/api/coa/solve', (req, res) => {
  const weights = req.body?.policyWeights ?? {};
  const start = Date.now();
  coas = solveCOAsFromWeights(weights);
  res.json({
    coas,
    paretoFrontierSize: coas.length,
    solveTimeMs: Date.now() - start,
    threatCount: threats.filter(t => t.status !== 'NEUTRALIZED' && t.status !== 'LEAKED').length,
    reachableAssignments: coas.reduce((n, c) => n + c.assignments.length, 0),
  });
});

app.post('/api/lab/run', (req, res) => {
  const {
    coaId, redModel = 'DECEPTIVE',
    jammerSeverity = 2, trackDegradation = 1, nRuns = 500,
  } = req.body ?? {};

  const coa = coas.find(c => c.id === coaId) ?? coas[0];
  if (!coa) { res.status(404).json({ error: 'No COA available — run /api/coa/solve first' }); return; }

  const start = Date.now();
  const j = Number(jammerSeverity);     // 1-3
  const d = Number(trackDegradation);   // 1-3

  // Build TheaterState for adversary policy evaluation
  const theaterState: TheaterState = {
    tracks: threats
      .filter(t => t.status !== 'NEUTRALIZED' && t.status !== 'LEAKED')
      .map(t => ({
        id: t.id,
        class: t.class,
        intent: t.intent,
        confidence: t.confidence,
        timeToTarget: t.timeToTarget,
        velocity: t.geometry.velocity,
        jammingProbability: t.jammingProbability,
        status: t.status,
      })),
    baseReadiness: Object.fromEntries(BASES.map(b => [b.id, b.readiness])),
    interceptorCounts: Object.fromEntries(BASES.map(b => [b.id,
      b.missileInventory.interceptorShort + b.missileInventory.interceptorMid + b.missileInventory.interceptorLong,
    ])),
    jammerSeverity: j,
    trackDegradation: d,
  };

  const jamFactor  = 1 - (j - 1) * 0.15;
  const degradeF   = 1 - (d - 1) * 0.12;
  const baseScore  = +(coa.projectedOutcome.robustnessScore * jamFactor * degradeF).toFixed(3);

  // Policy-derived robustness via red adversary heuristics
  const adversary = computeAdversaryImpact(redModel as RedModel, theaterState, baseScore);
  const robustness  = adversary.robustness;
  const legacyScore = +(robustness * 0.55).toFixed(3);
  const failureProb = +(1 - robustness).toFixed(3);
  const r6h = +(0.72 - (j - 1) * 0.06 - (d - 1) * 0.04).toFixed(3);

  // Build a 12×12 failure heatmap (row = swarm density, col = jammer amplitude)
  const heatmap: number[][] = Array.from({ length: 12 }, (_, r) =>
    Array.from({ length: 12 }, (_, c) =>
      +(Math.min(0.95, Math.max(0.02,
        failureProb * ((r + 1) / 12) * ((c + 1) / 12) * (1.5 + Math.sin(r * 0.4 + c * 0.3) * 0.3)
      )).toFixed(3))
    )
  );

  const dist = (mean: number, std: number) => ({
    mean: +mean.toFixed(3),
    std:  +std.toFixed(3),
    p10:  +(mean - std * 1.28).toFixed(3),
    p90:  +(mean + std * 1.28).toFixed(3),
  });

  res.json({
    robustnessScore:          robustness,
    legacyComparisonScore:    legacyScore,
    fragilityPoint:           adversary.primaryThreat,
    failureProbability:       failureProb,
    failureHeatmap:           heatmap,
    moeDistributions: {
      interceptFraction: dist(robustness,       0.08),
      readiness6h:       dist(r6h,              0.06),
      blueExpenditure:   dist(coa.projectedOutcome.cost / 2_000_000, 0.05),
      asymmetryRatio:    dist(coa.projectedOutcome.asymmetryRatio, 0.4),
    },
    runsCompleted:            Math.min(Number(nRuns), 500),
    runTimeMs:                Date.now() - start,
    correctionRecommendation: adversary.correctionRecommendation,
  });
});

// ── DESIGN LOCK: Mistral Large via OpenRouter ────────────────────────────────
// DESIGN REQUIREMENT: This platform is strictly built for Mistral Large. 
// DO NOT CHANGE this to Gemini, GPT, or other models.
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MISTRAL_MODEL  = 'mistralai/mistral-large-2411';
// ──────────────────────────────────────────────────────────────────────────────

async function callMistral(system: string, user: string, maxTokens = 280): Promise<string | null> {
  const apiKey = process.env['OPENROUTER_API_KEY'];
  if (!apiKey) return null;
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://steel.boreal.demo',
        'X-Title':       'Steel - Smart Stridsledning',
      },
      body: JSON.stringify({
        model:       MISTRAL_MODEL,
        temperature: 0.2,
        max_tokens:  maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: user   },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { choices: { message: { content: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

// ── Rationale endpoints ───────────────────────────────────────────────────────

app.post('/api/rationale/coa', async (req, res) => {
  const { coaId } = req.body ?? {};
  const coa = coas.find(c => c.id === coaId) ?? coas[0];
  const coaName = coa?.name ?? 'BALANCED';
  const po = coa?.projectedOutcome ?? {} as Record<string, number>;

  const fallback =
    `${coaName} was selected based on current policy weights and theater conditions. ` +
    `Projected ${po['intercepts'] ?? 0} intercepts at sustainability cost ` +
    `${((po['cost'] ?? 0) / 1_000_000).toFixed(1)}M, robustness ` +
    `${((po['robustnessScore'] ?? 0) * 100).toFixed(0)}%. ` +
    `This allocation preserves interceptor depth for follow-on wave scenarios where legacy systems would be depleted.`;

  const system =
    'You are the AI tactical advisor for Steel - Smart Stridsledning, a NATO-standard air defence ' +
    'command support system for the Nordic theater. Respond in exactly 3 sentences of precise ' +
    'military analysis. No bullet points. Active voice, present tense.';

  const user =
    `Course of action: ${coa?.type ?? coaName}. ` +
    `Projected intercepts: ${po['intercepts'] ?? 0}, leakage: ${po['leakage'] ?? 0}. ` +
    `Expenditure: ${((po['cost'] ?? 0) / 1_000_000).toFixed(1)}M. ` +
    `Robustness score: ${((po['robustnessScore'] ?? 0) * 100).toFixed(0)}%. ` +
    `Asymmetry ratio: ${(po['asymmetryRatio'] ?? 1.0).toFixed(1)}\u00d7. ` +
    'Explain why this COA is superior to legacy rule-based fire control that engages threats in order of detection. ' +
    'Emphasize the dual-wave sustainability advantage and what readiness floor is preserved for Wave 2.';

  const llm = await callMistral(system, user, 280);
  res.json({
    rationaleText: llm ?? fallback,
    model:         llm ? MISTRAL_MODEL : 'FALLBACK',
    generatedAt:   new Date().toISOString(),
  });
});

app.post('/api/rationale/lab-result', async (req, res) => {
  const r     = req.body?.runResult ?? req.body ?? {};
  const score = r.robustnessScore ?? 0;
  const fp    = r.fragilityPoint ?? 'unknown vector';
  const rec   = r.correctionRecommendation ?? 'Review policy posture.';
  const failP = r.failureProbability ?? 0;
  const redM  = r.selectedRedModel ?? 'adversary';

  const fallback =
    `Monte Carlo analysis converged at ${(score * 100).toFixed(0)}% robustness against ${redM} pattern. ` +
    `Primary fragility identified at: ${fp}. Recommended adjustment: ${rec}`;

  const system =
    'You are an operations research analyst briefing a Nordic air defence commander. ' +
    'Respond in exactly 2 sentences. Direct, actionable, military style. No hedging.';

  const user =
    `Monte Carlo stress test: ${(score * 100).toFixed(0)}% robustness score against ${redM} adversary. ` +
    `Failure probability: ${(failP * 100).toFixed(0)}%. Primary fragility: ${fp}. ` +
    `Recommended correction: ${rec}. ` +
    'State what the commander must know and what single action to take immediately.';

  const llm = await callMistral(system, user, 160);
  res.json({
    rationaleText: llm ?? fallback,
    model:         llm ? MISTRAL_MODEL : 'FALLBACK',
    generatedAt:   new Date().toISOString(),
  });
});

// ── Logistics API ─────────────────────────────────────────────────────────────

// Lazy-import seed data (avoids bundling Angular client code into server bundle)
let _logisticsSeed: typeof import('./app/shared/domain/logistics-ontology') | null = null;

async function getLogisticsSeed() {
  if (!_logisticsSeed) {
    _logisticsSeed = await import('./app/shared/domain/logistics-ontology');
  }
  return _logisticsSeed;
}

app.get('/api/logistics', async (_req, res) => {
  try {
    const { SEED_SUPPLY_NODES, SEED_CORRIDORS, SEED_REINFORCEMENTS } = await getLogisticsSeed();
    res.json({
      supplyNodes:    SEED_SUPPLY_NODES,
      corridors:      SEED_CORRIDORS,
      reinforcements: SEED_REINFORCEMENTS,
      generatedAt:    new Date().toISOString(),
    });
  } catch {
    res.status(500).json({ error: 'Logistics seed unavailable' });
  }
});

app.post('/api/rationale/logistics', async (req, res) => {
  const ctx       = req.body ?? {};
  const health    = ((ctx.supplyHealth ?? 0) * 100).toFixed(0);
  const corridors = ctx.openCorridors  ?? 0;
  const enRoute   = ctx.enRoute        ?? 0;
  const degraded: string[] = ctx.degradedNodes ?? [];

  const fallback =
    `Supply health at ${health}% with ${corridors} open corridor(s) and ${enRoute} reinforcement group(s) en route. ` +
    (degraded.length
      ? `Degraded nodes: ${degraded.join(', ')} — prioritize resupply via open corridors before next engagement wave.`
      : 'All nodes operational — maintain current resupply tempo and pre-position for follow-on wave.');

  const system =
    'You are a theater logistics AI for a Nordic air defence operation. ' +
    'Respond in exactly 2 sentences. Military style. Be specific about risk and timing.';

  const user =
    `Theater logistics status: supply health ${health}%, ${corridors} open corridor(s), ` +
    `${enRoute} reinforcement group(s) en route. ` +
    (degraded.length ? `Degraded nodes: ${degraded.join(', ')}. ` : 'All nodes operational. ') +
    'Provide a tactical advisory focused on next-wave interceptor readiness and corridor risk.';

  const llm = await callMistral(system, user, 160);
  res.json({
    rationaleText: llm ?? fallback,
    model:         llm ? MISTRAL_MODEL : 'FALLBACK',
    generatedAt:   new Date().toISOString(),
  });
});

// ── Angular SSR catch-all ─────────────────────────────────────────────────────

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then(response =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

// ── Server startup with WebSocket ─────────────────────────────────────────────

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT'] || 4000);

  const httpServer = createServer(app);

  // WebSocket server — no built-in HTTP server; we handle the upgrade manually
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url ?? '/', `http://${request.headers.host}`);
    if (pathname === '/ws/theater' && verifyToken(parseCookies(request.headers.cookie)[LOCK_COOKIE_NAME])) {
      wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (clientWs: WebSocket) => {
    const upstreamUrl = new URL('/ws/theater', FASTAPI_WS_URL);
    const upstreamWs = new WebSocket(upstreamUrl, {
      headers: {
        'x-forwarded-host': FASTAPI_WS_URL.host,
      },
    });

    const closeBoth = (code?: number, reason?: string) => {
      if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
        clientWs.close(code, reason);
      }
      if (upstreamWs.readyState === WebSocket.OPEN || upstreamWs.readyState === WebSocket.CONNECTING) {
        upstreamWs.close(code, reason);
      }
    };

    upstreamWs.on('message', data => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    });

    clientWs.on('message', data => {
      if (upstreamWs.readyState === WebSocket.OPEN) {
        upstreamWs.send(data);
      }
    });

    upstreamWs.on('close', (code, reason) => closeBoth(code, reason.toString()));
    clientWs.on('close', (code, reason) => closeBoth(code, reason.toString()));

    upstreamWs.on('error', () => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'DELTA',
          simTime: 0,
          threats: [],
          bases: [],
          phase: 'upstream-unavailable',
        }));
      }
      closeBoth(1011, 'FastAPI theater feed unavailable');
    });
    clientWs.on('error', () => closeBoth(1011, 'Client websocket error'));
  });

  // Local mock theater remains available only for legacy local handlers.
  setInterval(tick, 2000);

  httpServer.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
    console.log(`WebSocket theater feed at ws://localhost:${port}/ws/theater`);
  });
}

/**
 * Request handler used by the Angular CLI (dev-server and build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
