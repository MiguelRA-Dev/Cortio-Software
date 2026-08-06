require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const connectDB = require('./src/config/db');
const apiRoutes = require('./src/routes');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');
const { runBillingJob } = require('./src/jobs/billingJob');
const { runDeletionJob } = require('./src/jobs/deletionJob');
const ApiError = require('./src/utils/ApiError');

const app = express();

// Azure App Service (and most PaaS hosts) sit behind a reverse proxy — without this,
// every request looks like it comes from the proxy's own IP, which breaks per-IP
// rate limiting (everyone would share one bucket).
app.set('trust proxy', 1);

// Only the app's own frontend should ever be allowed to call this API directly from
// a browser. APP_URL already points at that origin (also used to build email links),
// so it doubles as the CORS allowlist instead of a second env var to keep in sync.
// Requests with no Origin header (curl, server-to-server, the Wompi webhook) are
// always let through — they're not the browser-driven case CORS protects against.
const allowedOrigins = new Set(['http://localhost:5173', process.env.APP_URL].filter(Boolean));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new ApiError(403, 'No permitido por la política de CORS'));
      }
    }
  })
);

// Helmet's default CSP only allows same-origin scripts/frames — too strict for Google
// Identity Services, which injects its own <script> and renders the sign-in button
// inside a Google-hosted iframe.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", 'https://accounts.google.com'],
        'frame-src': ["'self'", 'https://accounts.google.com'],
        'connect-src': ["'self'", 'https://accounts.google.com'],
      },
    },
  })
);
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Helmet's default Cross-Origin-Resource-Policy (same-origin) would block the
// frontend (a different origin/port) from loading these images, so relax it
// just for this static route.
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  })
);

// Serves the built frontend when it's been copied into server/public/ as part of the
// deploy (see DEPLOY.md) — a single App Service hosting both the API and the SPA.
// In local dev this directory doesn't exist (the frontend runs separately via `vite
// dev`), so express.static and the fallback below both just no-op via next().
const clientBuildPath = path.join(__dirname, 'public');
app.use(express.static(clientBuildPath));

app.use('/api', apiRoutes);

// SPA fallback: any other GET request (a client-side route like /app/settings) gets
// index.html so React Router can take over — but never for /api or /uploads, and
// never if the build hasn't been copied in (local dev).
app.get('/*splat', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  const indexPath = path.join(clientBuildPath, 'index.html');
  if (!fs.existsSync(indexPath)) return next();
  res.sendFile(indexPath);
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Daily subscription renewal run — charges every barbershop whose paid period ended.
    cron.schedule('0 6 * * *', () => {
      runBillingJob().catch((err) => console.error('[billingJob] Unexpected failure:', err));
    });

    // Daily purge run — permanently deletes barbershops whose 15-day deletion grace
    // period has elapsed. Staggered an hour after billing so it never races a renewal.
    cron.schedule('0 7 * * *', () => {
      runDeletionJob().catch((err) => console.error('[deletionJob] Unexpected failure:', err));
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
