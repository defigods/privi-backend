//import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import {db} from "../firebase/firebase";
import collections from '../firebase/collections';
import {generateUniqueId} from "../functions/functions";

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
const priviScanRoutes = require('../routes/priviScanRoutes');
const priviCreditRoutes = require('../routes/priviCreditRoutes');
const priviDataRoutes = require('../routes/priviDataRoutes');
const poolRoutes = require('../routes/poolRoutes');
const ethereumRoutes = require('../routes/ethereumRoutes');
const insuranceRoutes = require('../routes/insuranceRoutes');
const forumRoutes = require('../routes/forumRoutes');
const communityRoutes = require('../routes/communityRoutes');
const chatRoutes = require('../routes/chatRoutes');
const blogRoutes = require('../routes/blogRoutes');

const crons = require('../controllers/crons');

type Env = 'dev' | 'prod' | 'devssl';

export let myServer;
export let io;
export let sockets = {};

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
  app.use('/privi-scan', priviScanRoutes);
  app.use('/priviCredit', priviCreditRoutes);
  app.use('/liquidityPool', poolRoutes);
  app.use('/ethereum', ethereumRoutes);
  app.use('/privi-data', priviDataRoutes);
  app.use('/forum', forumRoutes);
  app.use('/insurance', insuranceRoutes);
  app.use('/community', communityRoutes);
  app.use('/chat', chatRoutes);
  app.use('/blog', blogRoutes);

  // start all cron jobs
  let name: string;
  let cronJob: any;
  for ([name, cronJob] of Object.entries(crons)) {
    cronJob.start()
  }


  // Start server
  switch (env) {
    // Run in local (development) environment without SSL
    case 'dev':
      myServer = require('http').createServer(app);
      if (myServer) {
        myServer!.listen(port, () => {
          console.log(`Back-end DEV (Non-SSL) running on port ${port}`);
        });
      }
      break;
    // Run in local (development) environment with SSL
    case 'devssl':
      const credentials = {
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.cert'),
      };
      const httpsServer = https.createServer(credentials, app);
      myServer = httpsServer;
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
        myServer = httpsServer;
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

export const startSocket = (env: Env) => {
    // socket io
    io = require('socket.io')(myServer, {
        cors: {
            origin: "*",
            // methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
      console.log('socket.io connection successful')

      // when the client emits 'add user', this listens and executes
      socket.on('add user', async (userId) => {
        console.log('add user', userId, socket.id);

        socket.userId = userId;

        sockets[socket.userId] = socket; // save reference
        socket.join(userId); // subscribe to own room

        const userRef = db.collection(collections.user)
            .doc(userId);
        // const userGet = await userRef.get();
        // const user: any = userGet.data();
        await userRef.update({
          connected: true,
          socketId: socket.id
        });
      });

      // when the user disconnects.. perform this
      socket.on('disconnect', async () => {
        console.log('disconnect', socket.id);

        let usersRef = db.collection(collections.user);
        let userRef = await usersRef.where('socketId', '==', socket.id);
        const userGet = await userRef.get();
        userGet.forEach(async (user) => {
          console.log(user.id);
          if (user.id) {
            const userRef = db.collection(collections.user)
                .doc(user.id);

            sockets[user.id] = null;
            await userRef.update({
              connected: false,
              socketId: null
            });
          } else {
            console.log('disconnect');
          }
        });
      });

      // when the client emits 'new message', this listens and executes
      socket.on('new message', (data) => {
        console.log('new message');
      });


      // when the client emits 'typing'
      socket.on('typing', () => {
        console.log('typing');
      });

      // when the client emits 'stop typing'
      socket.on('stop typing', () => {
        console.log('stop typing');
      });

      socket.on('subscribe', async function(users) {
        let room;
        if(users && users.userFrom && users.userTo){
          if(users.userFrom.userName && users.userTo.userName) {
            if (users.userFrom.userName.toLowerCase() < users.userTo.userName.toLowerCase()) {
              room = "" + users.userFrom.userId + "" + users.userTo.userId;
            } else {
              room = "" + users.userTo.userId + "" + users.userFrom.userId;
            }
          }
          const chatQuery = await db.collection(collections.chat)
              .where("room", "==", room).get();
          if(!chatQuery.empty) {
            for (const doc of chatQuery.docs) {
              let data = doc.data()
              if(users.userFrom.userId === data.users.userFrom.userId) {
                db.collection(collections.chat).doc(doc.id).update({
                  "users.userFrom.lastView": Date.now()
                });
              } else if(users.userFrom.userId === data.users.userTo.userId) {
                db.collection(collections.chat).doc(doc.id).update({
                  "users.userTo.lastView": Date.now()
                });
              }
              console.log('joining room', room);
              socket.join(room);
            }
          } else {
            await db.runTransaction(async (transaction) => {
              const uid = generateUniqueId();

              // userData - no check if firestore insert works? TODO
              transaction.set(db.collection(collections.chat).doc(uid), {
                users: users,
                created: Date.now(),
                room: room,
                lastMessage: null,
                lastMessageDate: null,
                messages: []
              });
            });

            console.log('joining room', room);
            socket.join(room);
          }
        }
      });

      socket.on('subscribeToYou', async (user) => {
        socket.join(user._id);
      });

      socket.on('numberMessages', async (id) => {
        const messageQuery = await db.collection(collections.message)
            .where("to", "==", id)
            .where("seen", "==", false).get();
        if (!messageQuery.empty) {
          socket.to(id).emit('numberMessages', { number: messageQuery.docs.length });
        }
      });

      socket.on('add-message', async (message) => {
        console.log('message', message);

        const uid = generateUniqueId();
        await db.runTransaction(async (transaction) => {

          // userData - no check if firestore insert works? TODO
          transaction.set(db.collection(collections.message).doc(uid), {
            room: message.room,
            message: message.message,
            from: message.from,
            to: message.to,
            created: Date.now(),
            seen: false
          });
        });
        const chatQuery = await db.collection(collections.chat)
            .where("room", "==", message.room).get();
        if(!chatQuery.empty) {
          for (const doc of chatQuery.docs) {
            let data = doc.data();
            let messages : any = data.messages;
            messages.push(uid)

            db.collection(collections.chat).doc(doc.id).update({
              messages: messages,
              lastMessage: message.message,
              lastMessageDate: message.created
            });
          }
        }

        const messageQuery = await db.collection(collections.message)
            .where("to", "==", message.to)
            .where("seen", "==", false).get();
        if (!messageQuery.empty) {
          socket.to(message.to).emit('numberMessages', { number: messageQuery.docs.length });
        }

        console.log('sending room post', message);
        socket.to(message.room).emit('message', {
          room: message.room,
          message: message.message,
          from: message.from,
          to: message.to,
          created: Date.now(),
          seen: false,
          id: uid
        });
      });

      socket.on('subscribe-discord', async function(chatInfo) {
        if(chatInfo.discordChatId && chatInfo.discordRoomId){
          const discordRoomRef = db.collection(collections.discordChat)
              .doc(chatInfo.discordChatId).collection(collections.discordRoom)
              .doc(chatInfo.discordRoomId);
          const discordRoomGet = await discordRoomRef.get();
          const discordRoom : any = discordRoomGet.data();

          let users : any[] = [...discordRoom.users]
          let findUserIndex = users.findIndex((user, i) => chatInfo.userId === user.userId);
          if(findUserIndex !== -1) {
            users[findUserIndex].lastView = Date.now();
            users[findUserIndex].userConnected = true;
          }

          console.log('joining room', chatInfo.discordRoomId);
          socket.join(chatInfo.discordRoomId);
        } else {
          console.log('Error subscribe-discord socket: No Room provided')
        }
      });

      socket.on('numberMessages-discord', async function(room) {
        // Not need it now, think how to implement it
      });

      socket.on('add-message-discord', async function(message) {
        console.log('message', message);

        const uid = generateUniqueId();
        await db.runTransaction(async (transaction) => {

          // userData - no check if firestore insert works? TODO
          transaction.set(db.collection(collections.discordMessage).doc(uid), {
            discordRoom: message.discordRoom,
            message: message.message,
            from: message.from,
            created: Date.now(),
            seen: [],
            likes: 0,
            dislikes: 0
          });
        });
        const discordRoomRef = db.collection(collections.discordChat)
            .doc(message.discordChatId).collection(collections.discordRoom)
            .doc(message.discordRoom);
        const discordRoomGet = await discordRoomRef.get();
        const discordRoom : any = discordRoomGet.data();

        let messages : any = discordRoom.messages;
        messages.push(uid);

        await discordRoomRef.update({
          messages: messages,
          lastMessage: message.message,
          lastMessageDate: Date.now()
        });

        /*const messageQuery = await db.collection(collections.message)
            .where("to", "==", message.to)
            .where("seen", "==", false).get();
        if (!messageQuery.empty) {
          socket.to(message.to).emit('numberMessages', { number: messageQuery.docs.length });
        }*/
        const userRef = db.collection(collections.user).doc(message.from);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        console.log('sending room post', message);
        socket.to(message.discordRoom).emit('message-discord', {
          discordRoom: message.discordRoom,
          message: message.message,
          from: message.from,
          user: {
            name: user.firstName,
            level: user.level || 1,
            cred: user.cred || 0,
            salutes: user.salutes || 0,
          },
          created: Date.now(),
          seen: [],
          likes: 0,
          dislikes: 0,
          id: uid
        });
      });
    });
};
