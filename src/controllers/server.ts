//import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
const cors = require('cors')
const https = require('https')
const fs = require('fs')

const userRoutes = require('../routes/userRoutes.ts');
const podRoutes = require('../routes/podRoutes.ts');
const stakeRoutes = require('../routes/stakeRoutes.ts');
const lendingRoutes = require('../routes/lendingRoutes.ts');
const walletRoutes = require('../routes/walletRoutes.ts');
const profileRoutes = require('../routes/profileRoutes.ts');
const priviScanRoutes = require('../routes/priviScanRoutes');
type Env = 'dev' | 'prod' | 'devssl';

export const startServer = (env: Env) => {
  // initialize configuration
  //dotenv.config();

  const port = 3000;
  const app = express();

  app.use(cors());
  // Set HTTP headers for security
  app.use(helmet());

  // Configure Express to parse incoming JSON data
  app.use(express.json());

  // Configure Express to use EJS
  app.set("views", path.join(__dirname, "views"));

  // Routes definition
  app.use('/user', userRoutes);
  app.use('/pod', podRoutes);
  app.use('/stake', stakeRoutes);
  app.use('/lendings', lendingRoutes);
  app.use('/wallet', walletRoutes);
  app.use('/profile', profileRoutes);
  app.use('/privi-scan', priviScanRoutes);

  // cron job for generating 


  // Start server
  switch (env) {
    // Run in local (development) environment without SSL
    case 'dev':
      app.listen(port);
      console.log(`Back-end DEV (Non-SSL) running on port ${port}`);
      break;
    // Run in local (development) environment with SSL
    case 'devssl':
      const credentials = {
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.cert'),
      };
      const httpsServer = https.createServer(credentials, app);
      httpsServer.listen(port, () => {
        console.log(`Back-end DEV (SSL) running on port ${port}`);
      });
      break;
    // Run in production environment with SSL
    case 'prod':
      try {
        const privateKey = fs.readFileSync('/etc/letsencrypt/live/priviweb.tech/privkey.pem', 'utf8');
        const certificate = fs.readFileSync('/etc/letsencrypt/live/priviweb.tech/cert.pem', 'utf8');
        const ca = fs.readFileSync('/etc/letsencrypt/live/priviweb.tech/chain.pem', 'utf8');
        const credentials = {
          key: privateKey,
          cert: certificate,
          ca: ca
        };
        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(port, () => {
          console.log(`Back-end PROD (SSL) running on port ${port}`);
        });
      } catch (err) {
        console.log('Certificate not found!', err);
      }
      break;

    default:
      console.log(`Invalid environment ('dev' or 'prod' not found)`);
      break;
  }

  /*
  https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
  }, app)
    .listen(3000, function () {
      console.log(`server started at http://localhost:${port}`)
    });
*/

  // start the express server
  /*app.listen(port, () => {
      // tslint:disable-next-line:no-console
      console.log(`server started at http://localhost:${port}`);
  });*/
};


