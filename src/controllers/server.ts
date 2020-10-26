//import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
const logger = require('morgan');
const cors = require('cors')
const https = require('https')
const fs = require('fs');
const os = require('os');

const userRoutes = require('../routes/userRoutes');
const podRoutes = require('../routes/podRoutes');
const stakeRoutes = require('../routes/stakeRoutes');
const lendingRoutes = require('../routes/lendingRoutes');
const walletRoutes = require('../routes/walletRoutes');
const profileRoutes = require('../routes/profileRoutes');
const priviScanRoutes = require('../routes/priviScanRoutes');
const priviCreditRoutes = require('../routes/priviCreditRoutes');

type Env = 'dev' | 'prod' | 'devssl';

export const startServer = (env: Env) => {
  // initialize configuration
  //dotenv.config();

  const port = 3000;
  const app = express();

  // Show API calls in console
  app.use(logger('dev'));

  // CORS policy 
  // *** TODO: filter by priviweb.tech origin if Env='prod' ***
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
  app.use('/priviCredit', priviCreditRoutes);

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
  };


  // Show IP address in console
  const ifaces = os.networkInterfaces();
  const IPs = [];
  Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;
    ifaces[ifname].forEach(function (iface: any) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }
      if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        console.log(ifname + ':' + alias, iface.address);
      } else {
        // this interface has only one ipv4 adress
        console.log(ifname, iface.address);
      };
      ++alias;
    });
  });

  // Start Express server on https
  // app.get('/', function (req, res) {
  //   console.log('Hello!!!')
  // });

  // https.createServer({
  //   key: fs.readFileSync('server.key'),
  //   cert: fs.readFileSync('server.cert')
  // }, app)
  //   .listen(3000, function () {
  //     console.log(`server started at http://localhost:${port}`)
  //   });

  // start the express server
  // app.listen(port, () => {
  //     // tslint:disable-next-line:no-console
  //     console.log(`server started at http://localhost:${port}`);
  // });

};


