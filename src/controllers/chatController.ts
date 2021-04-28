import express from 'express';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';
import { generateUniqueId } from '../functions/functions';
//import { uploadToFirestoreBucket } from '../functions/firestore'
import fs from 'fs';
import path from 'path';

const userController = require('./userController');
const notificationsController = require('./notificationsController');

exports.getChats = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const allChats: any[] = [];
    const chatUserFromSnap = await db
      .collection(collections.chat)
      .where('users.userFrom.userId', '==', body.userId)
      .get();
    chatUserFromSnap.forEach((doc) => {
      let data = doc.data();
      if (data && (!data.wipId || data.wipId === '')) {
        allChats.push(data);
      }
    });
    const chatUserToSnap = await db.collection(collections.chat).where('users.userTo.userId', '==', body.userId).get();
    chatUserToSnap.forEach((doc) => {
      let data = doc.data();
      if (data && (!data.wipId || data.wipId === '')) {
        allChats.push(data);
      }
    });
    let sortChats = allChats.sort((a, b) => (b.created > a.created ? 1 : a.created > b.created ? -1 : 0));

    res.send({
      success: true,
      data: sortChats,
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> getChats()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/chatRoutes -> getChats()' + e,
    });
  }
};

exports.createChat = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let room;

    if (body.users && body.users.userFrom && body.users.userTo) {
      let userFrom = body.users.userFrom;
      let userTo = body.users.userTo;

      if (userFrom.userName.toLowerCase() < userTo.userName.toLowerCase()) {
        room = '' + userFrom.userId + '' + userTo.userId;
      } else {
        room = '' + userTo.userId + '' + userFrom.userId;
      }

      let dir = 'uploads/chat/one-to-one/' + room;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      const chatQuery = await db.collection(collections.chat).where('room', '==', room).get();
      if (!chatQuery.empty) {
        for (const doc of chatQuery.docs) {
          let data = doc.data();
          data.id = doc.id;

          res.status(200).send({
            success: true,
            data: data,
          });
        }
      } else {
        await db.runTransaction(async (transaction) => {
          const uid = generateUniqueId();

          // userData - no check if firestore insert works? TODO
          transaction.set(db.collection(collections.chat).doc(uid), {
            users: {
              userFrom: userFrom,
              userTo: userTo,
            },
            created: Date.now(),
            room: room,
            lastMessage: null,
            lastMessageDate: null,
            messages: [],
          });
        });
        res.status(200).send({
          success: true,
          data: {
            users: {
              userFrom: userFrom,
              userTo: userTo,
            },
            created: Date.now(),
            room: room,
            lastMessage: null,
            lastMessageDate: null,
          },
        });
      }
    } else {
      res.status(200).send({
        success: false,
        error: 'Error in controllers/chatRoutes -> createChat(): Non Users Provided Correctly',
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> createChat()' + e);
    res.status(200).send({
      success: false,
      error: 'Error in controllers/chatRoutes -> createChat(): ' + e,
    });
  }
};

exports.getMessagesNotSeen = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body.userId) {
      const messageQuery = await db
        .collection(collections.message)
        .where('to', '==', body.userId)
        .where('seen', '==', false)
        .get();
      if (!messageQuery.empty) {
        res.status(200).send({
          success: true,
          data: messageQuery.docs.length,
        });
      }
    } else {
      res.status(200).send({
        success: false,
        error: 'Error in controllers/chatRoutes -> getMessagesNotSeen(): Non userId Provided',
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> getMessagesNotSeen()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/chatRoutes -> getMessagesNotSeen()' + e,
    });
  }
};

exports.lastView = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body.userId && body.room) {
      const chatUserToQuery = await db
        .collection(collections.chat)
        .where('room', '==', body.room)
        .where('users.userTo.userId', '==', body.userId)
        .get();
      if (!chatUserToQuery.empty) {
        for (const doc of chatUserToQuery.docs) {
          let data = doc.data();

          db.collection(collections.chat).doc(doc.id).update({
            'users.userTo.lastView': body.lastView,
          });
        }
      }
      const chatUserFromQuery = await db
        .collection(collections.chat)
        .where('room', '==', body.room)
        .where('users.userFrom.userId', '==', body.userId)
        .get();
      if (!chatUserFromQuery.empty) {
        for (const doc of chatUserFromQuery.docs) {
          let data = doc.data();

          db.collection(collections.chat).doc(doc.id).update({
            'users.userFrom.lastView': body.lastView,
          });
        }
      }
      const messageQuery = await db
        .collection(collections.message)
        .where('room', '==', body.room)
        .where('to', '==', body.userId)
        .where('seen', '==', false)
        .get();
      if (!messageQuery.empty) {
        for (const doc of messageQuery.docs) {
          let data = doc.data();

          db.collection(collections.message).doc(doc.id).update({
            seen: true,
          });
        }
      }
      res.status(200).send({ success: true });
    } else {
      res.status(200).send({
        success: false,
        error: 'Error in controllers/chatRoutes -> lastView(): Non UserId or Room Provided',
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> lastView()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/chatRoutes -> lastView()' + e,
    });
  }
};

exports.getMessages = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body.room) {
      const chatQuery = await db.collection(collections.chat).where('room', '==', body.room).get();
      let messages: any[] = [];

      if (!chatQuery.empty) {
        for (const doc of chatQuery.docs) {
          let data = doc.data();

          if (data && data.messages && data.messages.length > 0) {
            for (let i = 0; i < data.messages.length; i++) {
              const messageGet = await db.collection(collections.message).doc(data.messages[i]).get();
              let msg : any = messageGet.data();
              msg.id = messageGet.id;
              messages.push(msg);

              if (i === data.messages.length - 1) {
                res.status(200).send({
                  success: true,
                  data: messages,
                });
              }
            }
          } else {
            res.status(200).send({
              success: true,
              data: messages,
            });
          }
        }
      } else {
        res.status(200).send({
          success: false,
          error: 'Error in controllers/chatRoutes -> getMessages(): Wrong Chat Room Provided',
        });
      }
    } else {
      res.status(200).send({
        success: false,
        error: 'Error in controllers/chatRoutes -> getMessages(): Non Chat Room Provided',
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> getChatRoomById()' + e);
    res.status(200).send({
      success: false,
      error: 'Error in controllers/chatRoutes -> getMessages():' + e,
    });
  }
};

exports.getChatRoomById = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body.room) {
      const chatQuery = await db.collection(collections.chat).where('room', '==', body.room).get();
      if (!chatQuery.empty) {
        for (const doc of chatQuery.docs) {
          res.status(200).send({
            success: true,
            data: doc,
          });
        }
      }
    } else {
      res.status(200).send({
        success: false,
        error: 'Error in controllers/chatRoutes -> getChatRoomById(): Non Chat Room Provided',
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> getChatRoomById()' + e);
    res.status(200).send({
      success: false,
      error: 'Error in controllers/chatRoutes -> getChatRoomById(): Non Chat Room Provided',
    });
  }
};

exports.getChatRoom = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let room;
    if (body.userFrom.userName && body.userTo.userName) {
      if (body.userFrom.userName.toLowerCase() < body.userTo.userName.toLowerCase()) {
        room = '' + body.userFrom.userId + '' + body.userTo.userId;
      } else {
        room = '' + body.userTo.userId + '' + body.userFrom.userId;
      }
    }

    res.status(200).send({
      room: room,
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> getChatRoom()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/chatRoutes -> getChatRoom()' + e,
    });
  }
};

exports.getUsers = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let users: any[] = [];

    const userQuery = await db.collection(collections.user).get();
    if (!userQuery.empty) {
      for (const doc of userQuery.docs) {
        let data = doc.data();
        data.id = doc.id;
        users.push(data);
      }
      res.status(200).send({
        success: true,
        data: users,
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> getUsers()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/chatRoutes -> getUsers()' + e,
    });
  }
};

const PAGE_SIZE = 30;

exports.getAllArtists = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let isLastUser = body.isLastUser;
    const lastId = body.lastId;

    let updatedLastId = '';
    let updatedIsLastUser = true;
    let users: any[] = [];

    if (isLastUser) {
      let userSnap: any;
      do {
        let userQuery = db.collection(collections.user).orderBy('email', 'asc');
        if (updatedLastId != 'null' && updatedLastId.length > 0) {
          userQuery = userQuery.startAfter(updatedLastId);
        } else {
          if (lastId != 'null' && lastId.length > 0) {
            userQuery = userQuery.startAfter(lastId);
          }
        }
        userSnap = await userQuery.limit(30).get();
        if (!userSnap.empty) {
          for (const doc of userSnap.docs) {
            let data = doc.data();
            if (
              body.userName.length === 0 ||
              data.lastName?.toLowerCase().includes(body.userName.toLowerCase()) ||
              data.firtName?.toLowerCase().includes(body.userName.toLowerCase())
            ) {
              data.id = doc.id;
              users.push({
                ...data,
                isExternalUser: false,
              });

              updatedLastId = data.email;
              updatedIsLastUser = true;
              if (users.length === PAGE_SIZE) {
                break;
              }
            }
          }
        }
      } while (users.length < PAGE_SIZE && !userSnap.empty);
    }

    if (users.length !== PAGE_SIZE) {
      let artistSnap: any;
      do {
        let artistQuery = db.collection(collections.mediaUsers).orderBy('user', 'asc');
        if (updatedLastId != 'null' && updatedLastId.length > 0 && !updatedIsLastUser) {
          artistQuery = artistQuery.startAfter(updatedLastId);
        } else {
          if (lastId != 'null' && lastId.length > 0 && !isLastUser) {
            artistQuery = artistQuery.startAfter(lastId);
          }
        }
        artistSnap = await artistQuery.limit(PAGE_SIZE).get();
        if (!artistSnap.empty) {
          for (const doc of artistSnap.docs) {
            let data = doc.data();
            if (body.userName.length === 0 || data.tag?.toLowerCase().includes(body.userName.toLowerCase())) {
              data.id = doc.id;
              users.push({
                ...data,
                isExternalUser: true,
              });

              updatedLastId = data.user;
              updatedIsLastUser = false;
              if (users.length === PAGE_SIZE) {
                break;
              }
            }
          }
        }
      } while (users.length < PAGE_SIZE && !artistSnap.empty);
    }

    res.status(200).send({
      success: true,
      data: { users: users, hasMore: users.length === PAGE_SIZE, lastId: updatedLastId, isLastUser: updatedIsLastUser },
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> getAllArtists()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/chatRoutes -> getAllArtists()' + e,
    });
  }
};

exports.getFollowings = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    let users: any[] = [];

    const userRef = db.collection(collections.user).doc(userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    for (const usr of user.followings) {
      const userFollowingRef = db.collection(collections.user).doc(usr.user);
      const userFollowingGet = await userFollowingRef.get();
      const userFollowing: any = userFollowingGet.data();

      let newUser = {
        id: usr.user,
        firstName: userFollowing.firstName,
      };

      users.push(newUser);
    }
    res.status(200).send({
      success: true,
      data: users,
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> getFollowings()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/chatRoutes -> getFollowings()' + e,
    });
  }
};

exports.discordGetChat = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let discordChat: any = {};
    let discordRooms: any[] = [];
    const discordChatRef = db.collection(collections.discordChat).doc(body.discordChat);
    const discordChatGet = await discordChatRef.get();
    const discordChatData: any = discordChatGet.data();

    const discordRoomGet = await discordChatRef.collection(collections.discordRoom).get();
    discordRoomGet.forEach((doc) => {
      let data = { ...doc.data() };
      data.room = doc.id;
      discordRooms.push(data);
    });
    discordChat = { ...discordChatData };
    discordChat.id = discordChatGet.id;
    discordChat.discordRooms = [...discordRooms];
    res.send({
      success: true,
      data: discordChat,
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordGetChat() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.discordGetChatInfoMedia = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const discordRoomRef = db
      .collection(collections.discordChat)
      .doc(body.discordChatId)
      .collection(collections.discordRoom)
      .doc(body.discordRoom);
    const discordRoomGet = await discordRoomRef.get();
    const discordRoom: any = discordRoomGet.data();

    let audioMessages: any[] = [];
    let videoMessages: any[] = [];
    let photoMessages: any[] = [];

    if (discordRoom.messages && discordRoom.messages.length > 0) {
      for (let i = 0; i < discordRoom.messages.length; i++) {
        const messageGet = await db.collection(collections.discordMessage).doc(discordRoom.messages[i]).get();

        let discordMsg: any = messageGet.data();

        if (discordMsg && discordMsg.type && discordMsg.type === 'audio') {
          const userRef = db.collection(collections.user).doc(discordMsg.from);
          const userGet = await userRef.get();
          const user: any = userGet.data();

          discordMsg['user'] = {
            id: userGet.id,
            name: user.firstName,
            level: user.level || 1,
            cred: user.cred || 0,
            salutes: user.salutes || 0,
          };
          discordMsg.id = messageGet.id;
          audioMessages.push(discordMsg);
        } else if (discordMsg && discordMsg.type && discordMsg.type === 'photo') {
          const userRef = db.collection(collections.user).doc(discordMsg.from);
          const userGet = await userRef.get();
          const user: any = userGet.data();

          discordMsg['user'] = {
            id: userGet.id,
            name: user.firstName,
            level: user.level || 1,
            cred: user.cred || 0,
            salutes: user.salutes || 0,
          };
          discordMsg.id = messageGet.id;
          photoMessages.push(discordMsg);
        } else if (discordMsg && discordMsg.type && discordMsg.type === 'video') {
          const userRef = db.collection(collections.user).doc(discordMsg.from);
          const userGet = await userRef.get();
          const user: any = userGet.data();

          discordMsg['user'] = {
            id: userGet.id,
            name: user.firstName,
            level: user.level || 1,
            cred: user.cred || 0,
            salutes: user.salutes || 0,
          };
          discordMsg.id = messageGet.id;
          videoMessages.push(discordMsg);
        }

        if (photoMessages.length >= 6 && videoMessages.length >= 6 && audioMessages.length >= 6) {
          res.status(200).send({
            success: true,
            data: {
              photos: photoMessages,
              videos: videoMessages,
              audios: audioMessages,
            },
          });
          return;
        }

        if (i === discordRoom.messages.length - 1) {
          res.status(200).send({
            success: true,
            data: {
              photos: photoMessages,
              videos: videoMessages,
              audios: audioMessages,
            },
          });
        }
      }
    } else {
      res.status(200).send({
        success: true,
        data: {
          photos: [],
          videos: [],
          audios: [],
        },
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordGetChatInfoMedia() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.discordCreateChat = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const discordChatCreation: any = await createDiscordChat(body.adminId, body.adminName);
    const discordRoomCreation: any = await createDiscordRoom(
      discordChatCreation.chatId,
      'Discussions',
      body.adminId,
      body.adminName,
      body.roomName,
      false,
      []
    );

    res.send({
      success: true,
      data: discordChatCreation,
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordGetChat()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/chatRoutes -> discordGetChat()' + e,
    });
  }
};

const createDiscordChat = (exports.createDiscordChat = async (adminId, adminName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const uid = generateUniqueId();
      let users: any[] = [
        {
          id: adminId,
          name: adminName,
        },
      ];

      await db.runTransaction(async (transaction) => {
        // userData - no check if firestore insert works? TODO
        transaction.set(db.collection(collections.discordChat).doc(uid), {
          users: users,
          admin: {
            id: adminId,
            name: adminName,
          },
          created: Date.now(),
        });
      });

      let dir = 'uploads/chat/' + uid;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      resolve({
        id: uid,
        users: users,
        created: Date.now(),
      });
    } catch (e) {
      reject('Error in controllers/chatRoutes -> createDiscordChat()' + e);
    }
  });
});

const createDiscordRoom = (exports.createDiscordRoom = async (
  chatId,
  type,
  adminId,
  adminName,
  roomName,
  privacy,
  users
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const uid = generateUniqueId();
      let usrs: any[] = [
        {
          type: 'Admin',
          userId: adminId,
          userName: adminName,
          userConnected: false,
          lastView: Date.now(),
        },
        ...users,
      ];
      let obj: any = {
        type: type,
        name: roomName,
        private: privacy,
        users: usrs,
        created: Date.now(),
        lastMessage: null,
        lastMessageDate: null,
        messages: [],
      };
      await db.collection(collections.discordChat).doc(chatId).collection(collections.discordRoom).doc(uid).set(obj);

      let dir = 'uploads/chat/' + chatId + '/' + uid;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      obj.id = uid;
      resolve(obj);
    } catch (e) {
      reject('Error in controllers/chatRoutes -> createDiscordRoom()' + e);
    }
  });
});

exports.discordCreateRoom = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const checkIsAdmin: boolean = await checkIfUserIsAdmin(body.chatId, body.adminId);

    if (checkIsAdmin) {
      let users: any[] = [];
      if (!body.private) {
        if (body.type === 'Pod') {
          const podSnap = await db.collection(collections.podsFT).doc(body.id).get();
          const podData: any = podSnap.data();

          const investors = Object.keys(podData.Investors);

          if (investors && investors.length > 0) {
            for (const user of investors) {
              let i = investors.indexOf(user);
              const userSnap = await db.collection(collections.user).doc(user).get();
              let data: any = userSnap.data();

              users.push({
                type: 'Members',
                userId: user,
                userName: data.firstName,
                userConnected: false,
                lastView: Date.now(),
              });
            }
          }
        } else if (body.type === 'Community-Discussion' || body.type === 'Community-Jar') {
          const communitySnap = await db.collection(collections.community).doc(body.id).get();
          const communityData: any = communitySnap.data();

          if (communityData && communityData.Members && communityData.Members.length > 0) {
            for (const user of communityData.Members) {
              const userSnap = await db.collection(collections.user).doc(user.id).get();
              let data: any = userSnap.data();

              users.push({
                type: 'Members',
                userId: user.id,
                userName: data.firstName,
                userConnected: false,
                lastView: Date.now(),
              });
            }
          }
        } else if (body.type === 'Credit-Pool') {
          const creditPoolBorrowersSnap = await db
            .collection(collections.community)
            .doc(body.id)
            .collection(collections.priviCreditsBorrowing)
            .get();
          const creditPoolLendersSnap = await db
            .collection(collections.community)
            .doc(body.id)
            .collection(collections.priviCreditsLending)
            .get();

          if (!creditPoolBorrowersSnap.empty) {
            for (const doc of creditPoolBorrowersSnap.docs) {
              const userRef = db.collection(collections.user).doc(doc.id);
              const userGet = await userRef.get();
              const user: any = userGet.data();

              users.push({
                type: 'Members',
                userId: doc.id,
                userName: user.firstName,
              });
            }
          }

          if (!creditPoolLendersSnap.empty) {
            for (const doc of creditPoolLendersSnap.docs) {
              for (const doc of creditPoolBorrowersSnap.docs) {
                const userRef = db.collection(collections.user).doc(doc.id);
                const userGet = await userRef.get();
                const user: any = userGet.data();

                users.push({
                  type: 'Members',
                  userId: doc.id,
                  userName: user.firstName,
                });
              }
            }
          }
        } else if (body.type === 'Insurance') {
        }
      }

      const discordRoomCreation: any = await createDiscordRoom(
        body.chatId,
        body.roomType,
        body.adminId,
        body.adminName,
        body.roomName,
        body.private,
        users
      );

      res.send({
        success: true,
        data: discordRoomCreation,
      });
    } else {
      res.send({
        success: false,
        error: 'Non permissions',
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordCreateRoom() ' + e);
    res.send({
      success: false,
      error: e,
    });
  }
};

const checkIfUserIsAdmin = (chatId, adminId): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    const discordChatRef = db.collection(collections.discordChat).doc(chatId);
    const discordChatGet = await discordChatRef.get();
    const discordChat: any = discordChatGet.data();

    if (discordChat && discordChat.admin && discordChat.admin.id && discordChat.admin.id === adminId) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
};

exports.discordAddUserToRoom = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let checkIsAdmin: boolean;
    if (body.adminRequired) {
      checkIsAdmin = await checkIfUserIsAdmin(body.discordChatId, body.adminId);
    } else {
      checkIsAdmin = true;
    }

    if (checkIsAdmin) {
      let discordRoom = await addUserToRoom(body.discordChatId, body.discordRoomId, body.userId, 'Member');

      res.send({
        success: true,
        data: discordRoom,
      });
    } else {
      res.send({
        success: false,
        error: 'Non permissions',
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordAddUserToRoom() ' + e);
    res.send({
      success: false,
      error: e,
    });
  }
};

const addUserToRoom = (exports.addUserToRoom = (discordChatId, discordRoomId, userId, typeUser) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(discordChatId, discordRoomId, userId);

      const discordRoomRef = db
        .collection(collections.discordChat)
        .doc(discordChatId)
        .collection(collections.discordRoom)
        .doc(discordRoomId);
      const discordRoomGet = await discordRoomRef.get();
      const discordRoom: any = discordRoomGet.data();

      let users = [...discordRoom.users];

      let findIndexUser = users.findIndex((usr) => usr.userId === userId);
      if (findIndexUser === -1) {
        const userSnap = await db.collection(collections.user).doc(userId).get();
        let data: any = userSnap.data();

        users.push({
          type: typeUser,
          userId: userId,
          userName: data.firstName,
          userConnected: false,
          lastView: Date.now(),
        });

        await discordRoomRef.update({
          users: users,
        });

        discordRoom.users = users;
      }

      resolve(discordRoom);
    } catch (e) {
      reject('Error in controllers/chatRoutes -> addUserToRoom()' + e);
    }
  });
});
const removeUserToRoom = (exports.removeUserToRoom = (discordChatId, discordRoomId, userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const discordRoomRef = db
        .collection(collections.discordChat)
        .doc(discordChatId)
        .collection(collections.discordRoom)
        .doc(discordRoomId);
      const discordRoomGet = await discordRoomRef.get();
      const discordRoom: any = discordRoomGet.data();

      let users = [...discordRoom.users];

      let findIndexUser = users.findIndex((usr) => usr.userId === userId);
      if (findIndexUser !== -1) {
        if (users[findIndexUser].type !== 'Admin') {
          users.splice(findIndexUser, 1);
        }

        await discordRoomRef.update({
          users: users,
        });

        discordRoom.users = users;
      }
      resolve(discordRoom);
    } catch (e) {
      reject('Error in controllers/chatRoutes -> removeUserToRoom()' + e);
    }
  });
});

exports.discordGetMessages = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const discordRoomRef = db
      .collection(collections.discordChat)
      .doc(body.discordChatId)
      .collection(collections.discordRoom)
      .doc(body.discordRoom);
    const discordRoomGet = await discordRoomRef.get();
    const discordRoom: any = discordRoomGet.data();

    let messages: any[] = [];
    if (discordRoom.messages && discordRoom.messages.length > 0) {
      for (let i = 0; i < discordRoom.messages.length; i++) {
        const messageGet = await db.collection(collections.discordMessage).doc(discordRoom.messages[i]).get();

        let discordMsg: any = messageGet.data();

        const userRef = db.collection(collections.user).doc(discordMsg.from);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        discordMsg['user'] = {
          id: userGet.id,
          name: user.firstName,
          level: user.level || 1,
          cred: user.cred || 0,
          salutes: user.salutes || 0,
        };
        discordMsg.id = messageGet.id;
        messages.push(discordMsg);

        if (i === discordRoom.messages.length - 1) {
          messages.sort((a, b) => {
            return a.created - b.created;
          });
          res.status(200).send({
            success: true,
            data: messages,
          });
        }
      }
    } else {
      res.status(200).send({
        success: true,
        data: [],
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordGetMessages()' + e);
    res.status(200).send({
      success: false,
      error: 'Error in controllers/chatRoutes -> discordGetMessages():' + e,
    });
  }
};

exports.discordGetReplies = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    console.log(body);
    const discordMessageRepliesRef = db
      .collection(collections.discordMessage)
      .doc(body.discordMessageId)
      .collection(collections.discordMessageReplies);
    const discordMessageRepliesGet = await discordMessageRepliesRef.get();

    let messages: any[] = [];
    if (!discordMessageRepliesGet.empty) {
      for (const doc of discordMessageRepliesGet.docs) {
        let data = doc.data();

        const userRef = db.collection(collections.user).doc(body.priviUser.id);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        data['user'] = {
          name: user.firstName,
          level: user.level || 1,
          cred: user.cred || 0,
          salutes: user.salutes || 0,
        };
        data.id = doc.id;
        messages.push(data);
      }
      messages.sort((a, b) => {
        return a.created - b.created;
      });
      res.status(200).send({
        success: true,
        data: messages,
      });
    } else {
      res.status(200).send({
        success: true,
        data: [],
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordGetReplies()' + e);
    res.status(200).send({
      success: false,
      error: 'Error in controllers/chatRoutes -> discordGetReplies()' + e,
    });
  }
};

exports.discordLastView = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body.userId && body.discordChat && body.discordRoom) {
      const discordRoomRef = db
        .collection(collections.discordChat)
        .doc(body.discordChat)
        .collection(collections.discordRoom)
        .doc(body.discordRoom);
      const discordRoomGet = await discordRoomRef.get();
      const discordRoom: any = discordRoomGet.data();
      if (discordRoom) {
        let users = [...discordRoom.users];
        let userIndex = users.findIndex((usr, i) => usr.userId === body.userId);
        users[userIndex].lastView = body.lastView;
        await discordRoomRef.update({
          users: users,
        });
      }
      const messageQuery = await db.collection(collections.discordMessage).where('room', '==', body.room).get();
      if (!messageQuery.empty) {
        for (const doc of messageQuery.docs) {
          let data = doc.data();
          if (!data.seen.includes(body.userId)) {
            let usersSeen = [...data.seen];
            usersSeen.push(body.userId);
            await db.collection(collections.discordMessage).doc(doc.id).update({
              seen: usersSeen,
            });
          }
        }
      }
      res.status(200).send({ success: true });
    } else {
      res.status(200).send({
        success: false,
        error: 'Error in controllers/chatRoutes -> discordLastView(): Non UserId or Room Provided',
      });
    }
  } catch (e) {
    return 'Error in controllers/chatRoutes -> lastView()' + e;
  }
};

exports.discordModifyAccess = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const discordRoomRef = db
      .collection(collections.discordChat)
      .doc(body.discordChatId)
      .collection(collections.discordRoom)
      .doc(body.discordRoomId);
    const discordRoomGet = await discordRoomRef.get();
    const discordRoom: any = discordRoomGet.data();

    let users: any[] = [...discordRoom.users];

    let findUserIndex = users.findIndex((user, i) => body.userId === user.userId);

    if (findUserIndex === -1) {
      users.push({
        type: body.type,
        userId: body.userId,
        userName: body.userName,
        userConnected: false,
        lastView: Date.now(),
      });
    } else {
      users[findUserIndex] = {
        type: body.type,
        userId: users[findUserIndex].userId,
        userName: users[findUserIndex].userName,
        userConnected: users[findUserIndex].userConnected,
        lastView: users[findUserIndex].lastView,
      };
    }

    await discordRoomRef.update({
      users: users,
    });

    discordRoom.users = users;
    discordRoom.id = discordRoomGet.id;

    res.send({
      success: true,
      data: discordRoom,
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordModifyAccess() ' + e);
    res.send({
      success: false,
      error: e,
    });
  }
};

exports.discordRemoveAccess = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const checkIsAdmin: boolean = await checkIfUserIsAdmin(body.discordChatId, body.adminId);

    if (checkIsAdmin) {
      const discordRoomRef = db
        .collection(collections.discordChat)
        .doc(body.discordChatId)
        .collection(collections.discordRoom)
        .doc(body.discordRoomId);
      const discordRoomGet = await discordRoomRef.get();
      const discordRoom: any = discordRoomGet.data();

      let users: any[] = [...discordRoom.users];

      let findUserIndex = users.findIndex((user, i) => body.userId === user.userId);

      if (findUserIndex === -1) {
        res.send({
          success: false,
          data: 'User not found',
        });
      } else {
        users.splice(findUserIndex, 1);
        await discordRoomRef.update({
          users: users,
        });

        discordRoom.users = users;

        res.send({
          success: true,
          data: discordRoom,
        });
      }
    } else {
      res.send({
        success: false,
        error: 'Non permissions',
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordRemoveAccess() ' + e);
    res.send({
      success: false,
      error: e,
    });
  }
};

exports.discordGetPossibleUsers = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const checkIsAdmin: boolean = await checkIfUserIsAdmin(body.chatId, body.adminId);

    if (checkIsAdmin) {
      let users: any[] = [];

      if (body.type === 'Pod') {
        console.log(body.id);
        const podSnap = await db.collection(collections.podsFT).doc(body.id).get();

        const podData: any = podSnap.data();

        const investors = Object.keys(podData.Investors);

        for (const user of investors) {
          let i = investors.indexOf(user);
          const userSnap = await db.collection(collections.user).doc(user).get();
          let data: any = userSnap.data();

          users.push({
            type: 'Members',
            userId: user,
            userName: data.firstName,
          });
        }
      } else if (body.type === 'Community-Discussion' || body.type === 'Community-Jar') {
        const communitySnap = await db.collection(collections.community).doc(body.id).get();
        const communityData: any = communitySnap.data();

        for (const user of communityData.Members) {
          const userSnap = await db.collection(collections.user).doc(user.id).get();
          let data: any = userSnap.data();

          users.push({
            type: 'Members',
            userId: user.id,
            userName: data.firstName,
            userConnected: false,
            lastView: Date.now(),
          });
        }
      } else if (body.type === 'Credit-Pool') {
        const creditPoolBorrowersSnap = await db
          .collection(collections.priviCredits)
          .doc(body.id)
          .collection(collections.priviCreditsBorrowing)
          .get();
        const creditPoolLendersSnap = await db
          .collection(collections.priviCredits)
          .doc(body.id)
          .collection(collections.priviCreditsLending)
          .get();

        if (!creditPoolBorrowersSnap.empty) {
          for (const doc of creditPoolBorrowersSnap.docs) {
            const userRef = db.collection(collections.user).doc(doc.id);
            const userGet = await userRef.get();
            const user: any = userGet.data();

            users.push({
              type: 'Members',
              userId: doc.id,
              userName: user.firstName,
            });
          }
        }

        if (!creditPoolLendersSnap.empty) {
          for (const doc of creditPoolLendersSnap.docs) {
            for (const doc of creditPoolBorrowersSnap.docs) {
              const userRef = db.collection(collections.user).doc(doc.id);
              const userGet = await userRef.get();
              const user: any = userGet.data();

              users.push({
                type: 'Members',
                userId: doc.id,
                userName: user.firstName,
              });
            }
          }
        }
      } else {
        res.send({
          success: false,
          error: 'No type provided',
        });
      }

      res.send({
        success: true,
        data: users,
      });
    } else {
      res.send({
        success: false,
        error: 'Non permissions',
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordGetPossibleUsers() ' + e);
    res.send({
      success: false,
      error: e,
    });
  }
};

exports.discordLikeMessage = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const discordMessageRef = db.collection(collections.discordMessage).doc(body.discordMessageId);
    const discordMessageGet = await discordMessageRef.get();
    const discordMessage: any = discordMessageGet.data();

    let likes = [...discordMessage.likes];
    let dislikes = [...discordMessage.dislikes];
    let numLikes = discordMessage.numLikes + 1;
    let numDislikes = discordMessage.numDislikes;
    likes.push(body.userId);

    let dislikeIndex = dislikes.findIndex((user) => user === body.userId);

    if (dislikeIndex !== -1) {
      dislikes.splice(dislikeIndex, 1);
      numDislikes = numDislikes - 1;
    }

    await discordMessageRef.update({
      likes: likes,
      dislikes: dislikes,
      numLikes: numLikes,
      numDislikes: numDislikes,
    });

    let message = { ...discordMessage };
    message.id = discordMessageGet.id;
    message.likes = likes;
    message.dislikes = dislikes;
    message.numLikes = numLikes;
    message.numDislikes = numDislikes;

    if (discordMessage.from !== body.userId) {
      await userController.updateUserCred(discordMessage.from, true);
    }

    const userRef = db.collection(collections.user).doc(body.userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    await notificationsController.addNotification({
      userId: discordMessage.from,
      notification: {
        type: 79,
        typeItemId: 'user',
        itemId: body.userId,
        follower: user.firstName,
        pod: '',
        comment: discordMessage.message,
        token: '',
        amount: 0,
        onlyInformation: false,
        otherItemId: discordMessageGet.id,
      },
    });

    res.send({
      success: true,
      data: message,
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordLikeMessage() ' + e);
    res.send({
      success: false,
      error: e,
    });
  }
};

exports.discordDislikeMessage = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const discordMessageRef = db.collection(collections.discordMessage).doc(body.discordMessageId);
    const discordMessageGet = await discordMessageRef.get();
    const discordMessage: any = discordMessageGet.data();

    let dislikes = [...discordMessage.dislikes];
    let likes = [...discordMessage.likes];
    let numLikes = discordMessage.numLikes;
    let numDislikes = discordMessage.numDislikes + 1;
    dislikes.push(body.userId);

    let likeIndex = likes.findIndex((user) => user === body.userId);
    if (likeIndex !== -1) {
      likes.splice(likeIndex, 1);
      numLikes = numLikes - 1;
    }

    await discordMessageRef.update({
      likes: likes,
      dislikes: dislikes,
      numLikes: numLikes,
      numDislikes: numDislikes,
    });

    let message = { ...discordMessage };
    message.id = discordMessageGet.id;
    message.likes = likes;
    message.dislikes = dislikes;
    message.numLikes = numLikes;
    message.numDislikes = numDislikes;

    if (discordMessage.from !== body.userId) {
      await userController.updateUserCred(discordMessage.from, false);
    }

    const userRef = db.collection(collections.user).doc(body.userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    await notificationsController.addNotification({
      userId: discordMessage.from,
      notification: {
        type: 80,
        typeItemId: 'user',
        itemId: body.userId,
        follower: user.firstName,
        pod: '',
        comment: discordMessage.message,
        token: '',
        amount: 0,
        onlyInformation: false,
        otherItemId: discordMessageGet.id,
      },
    });

    res.send({
      success: true,
      data: message,
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordDislikeMessage() ' + e);
    res.send({
      success: false,
      error: e,
    });
  }
};
exports.discordReplyLikeMessage = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const discordMessageReplyRef = db
      .collection(collections.discordMessage)
      .doc(body.discordMessageId)
      .collection(collections.discordMessageReplies)
      .doc(body.discordMessageReplyId);
    const discordMessageReplyGet = await discordMessageReplyRef.get();
    const discordMessageReply: any = discordMessageReplyGet.data();

    let likes = [...discordMessageReply.likes];
    let dislikes = [...discordMessageReply.dislikes];
    let numLikes = discordMessageReply.numLikes + 1;
    let numDislikes = discordMessageReply.numDislikes;
    likes.push(body.userId);

    let dislikeIndex = dislikes.findIndex((user) => user === body.userId);

    if (dislikeIndex !== -1) {
      dislikes.splice(dislikeIndex, 1);
      numDislikes = numDislikes - 1;
    }

    await discordMessageReplyRef.update({
      likes: likes,
      dislikes: dislikes,
      numLikes: numLikes,
      numDislikes: numDislikes,
    });

    let message = { ...discordMessageReply };
    message.id = discordMessageReplyGet.id;
    message.likes = likes;
    message.dislikes = dislikes;
    message.numLikes = numLikes;
    message.numDislikes = numDislikes;

    await userController.updateUserCred(discordMessageReply.from, true);

    const userRef = db.collection(collections.user).doc(body.userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    await notificationsController.addNotification({
      userId: discordMessageReply.from,
      notification: {
        type: 79,
        typeItemId: 'user',
        itemId: body.userId,
        follower: user.firstName,
        pod: '',
        comment: discordMessageReply.message,
        token: '',
        amount: 0,
        onlyInformation: false,
        otherItemId: discordMessageReplyGet.id,
      },
    });

    res.send({
      success: true,
      data: message,
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordReplyLikeMessage() ' + e);
    res.send({
      success: false,
      error: e,
    });
  }
};

exports.discordReplyDislikeMessage = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const discordMessageReplyRef = db
      .collection(collections.discordMessage)
      .doc(body.discordMessageId)
      .collection(collections.discordMessageReplies)
      .doc(body.discordMessageReplyId);
    const discordMessageReplyGet = await discordMessageReplyRef.get();
    const discordMessageReply: any = discordMessageReplyGet.data();

    let dislikes = [...discordMessageReply.dislikes];
    let likes = [...discordMessageReply.likes];
    let numLikes = discordMessageReply.numLikes;
    let numDislikes = discordMessageReply.numDislikes + 1;
    dislikes.push(body.userId);

    let likeIndex = likes.findIndex((user) => user === body.userId);

    if (likeIndex !== -1) {
      likes.splice(likeIndex, 1);
      numLikes = numLikes - 1;
    }

    await discordMessageReplyRef.update({
      likes: likes,
      dislikes: dislikes,
      numLikes: numLikes,
      numDislikes: numDislikes,
    });

    let message = { ...discordMessageReply };
    message.id = discordMessageReplyGet.id;
    message.likes = likes;
    message.dislikes = dislikes;
    message.numLikes = numLikes;
    message.numDislikes = numDislikes;

    await userController.updateUserCred(discordMessageReply.from, false);

    const userRef = db.collection(collections.user).doc(body.userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    await notificationsController.addNotification({
      userId: discordMessageReply.from,
      notification: {
        type: 80,
        typeItemId: 'user',
        itemId: body.userId,
        follower: user.firstName,
        pod: '',
        comment: discordMessageReply.message,
        token: '',
        amount: 0,
        onlyInformation: false,
        otherItemId: discordMessageReplyGet.id,
      },
    });

    res.send({
      success: true,
      data: message,
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordReplyDislikeMessage() ' + e);
    res.send({
      success: false,
      error: e,
    });
  }
};

exports.discordUploadPhotoMessage = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.discordRoomId && req.params.fromUserId) {
      let message: any = await addMediaMessageDiscord(
        req.params.discordChatId,
        req.params.discordRoomId,
        req.params.fromUserId,
        'photo',
        req.file,
        '.png'
      );

      res.send({
        success: true,
        data: message,
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordUploadPhotoMessage() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.discordUploadAudioMessage = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.discordRoomId && req.params.fromUserId) {
      let message: any = await addMediaMessageDiscord(
        req.params.discordChatId,
        req.params.discordRoomId,
        req.params.fromUserId,
        'audio',
        req.file,
        '.mp3'
      );

      res.send({
        success: true,
        data: message,
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordUploadAudioMessage() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.discordUploadVideoMessage = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.discordRoomId && req.params.fromUserId) {
      let message: any = await addMediaMessageDiscord(
        req.params.discordChatId,
        req.params.discordRoomId,
        req.params.fromUserId,
        'video',
        req.file,
        '.mp4'
      );

      res.send({
        success: true,
        data: message,
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordUploadVideoMessage() ' + e);
    res.send({ success: false, error: e });
  }
};

const addMediaMessageDiscord = (
  discordChatId: string,
  discordRoomId: string,
  fromUserId: string,
  type: string,
  file: any,
  extension: string
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const uid = generateUniqueId();

      const userSnap = await db.collection(collections.user).doc(fromUserId).get();
      const user: any = userSnap.data();

      await db.runTransaction(async (transaction) => {
        // userData - no check if firestore insert works? TODO
        transaction.set(db.collection(collections.discordMessage).doc(uid), {
          discordRoom: discordRoomId,
          message: '',
          from: fromUserId,
          created: Date.now(),
          seen: [],
          likes: [],
          dislikes: [],
          numLikes: 0,
          numDislikes: 0,
          numReplies: 0,
          type: type,
        });
      });

      const discordRoomRef = db
        .collection(collections.discordChat)
        .doc(discordChatId)
        .collection(collections.discordRoom)
        .doc(discordRoomId);
      const discordRoomGet = await discordRoomRef.get();
      const discordRoom: any = discordRoomGet.data();

      let messages: any = discordRoom.messages;
      messages.push(uid);

      await discordRoomRef.update({
        messages: messages,
        lastMessage: 'photo',
        lastMessageDate: Date.now(),
      });

      let dir = 'uploads/chat/' + discordChatId + '/' + discordRoomId;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      } else {
        fs.rename(file.path, dir + '/' + uid + extension, function (err) {
          if (err) console.log('ERROR: ' + err);
        });
      }

      resolve({
        discordRoom: discordRoomId,
        message: '',
        user: {
          name: user.firstName,
          level: user.level || 1,
          cred: user.cred || 0,
          salutes: user.salutes || 0,
        },
        from: fromUserId,
        created: Date.now(),
        seen: [],
        likes: [],
        dislikes: [],
        numLikes: 0,
        numDislikes: 0,
        numReplies: 0,
        type: type,
        id: uid,
      });
    } catch (e) {
      console.log(e);
      reject(e);
    }
  });
};

exports.discordGetPhotoMessage = async (req: express.Request, res: express.Response) => {
  try {
    let discordChatId = req.params.discordChatId;
    let discordRoomId = req.params.discordRoomId;
    let discordMessageId = req.params.discordMessageId;
    console.log(req.params, discordChatId && discordRoomId && discordMessageId);

    if (discordChatId && discordRoomId && discordMessageId) {
      await discordGetMediaMessage(discordChatId, discordRoomId, discordMessageId, '.png', 'image', res);
    } else {
      console.log('Error in controllers/chatRoutes -> discordGetPhotoMessage()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordGetPhotoMessage() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.discordGetAudioMessage = async (req: express.Request, res: express.Response) => {
  try {
    let discordChatId = req.params.discordChatId;
    let discordRoomId = req.params.discordRoomId;
    let discordMessageId = req.params.discordMessageId;

    if (discordChatId && discordRoomId && discordMessageId) {
      await discordGetMediaMessage(discordChatId, discordRoomId, discordMessageId, '.mp3', 'audio', res);
    } else {
      console.log('Error in controllers/chatRoutes -> discordGetAudioMessage()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordGetAudioMessage() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.discordGetVideoMessage = async (req: express.Request, res: express.Response) => {
  try {
    let discordChatId = req.params.discordChatId;
    let discordRoomId = req.params.discordRoomId;
    let discordMessageId = req.params.discordMessageId;

    if (discordChatId && discordRoomId && discordMessageId) {
      await discordGetMediaMessage(discordChatId, discordRoomId, discordMessageId, '.mp4', 'video', res);
    } else {
      console.log('Error in controllers/chatRoutes -> discordGetVideoMessage()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> discordGetVideoMessage() ' + e);
    res.send({ success: false, error: e });
  }
};

const discordGetMediaMessage = (
  discordChatId: string,
  discordRoomId: string,
  discordMessageId: string,
  extension: string,
  type: string,
  res: express.Response
) => {
  return new Promise((resolve, reject) => {
    try {
      const directoryPath = path.join('uploads', 'chat', discordChatId, discordRoomId);
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          //console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader('Content-Type', type);
      let raw = fs.createReadStream(
        path.join('uploads', 'chat', discordChatId, discordRoomId, discordMessageId + extension)
      );
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } catch (e) {
      reject(e);
    }
  });
};

//MEDIA CHAT 1-to-1

exports.chatUploadPhotoMessage = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.room && req.params.from && req.params.to) {
      let message: any = await addMediaMessageChat(
        req.params.room,
        req.params.from,
        req.params.to,
        'photo',
        req.file,
        '.png'
      );

      res.send({
        success: true,
        data: message,
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> chatUploadPhotoMessage() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.chatUploadAudioMessage = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.room && req.params.from && req.params.to) {
      let message: any = await addMediaMessageChat(
        req.params.room,
        req.params.from,
        req.params.to,
        'audio',
        req.file,
        '.mp3'
      );

      res.send({
        success: true,
        data: message,
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> chatUploadAudioMessage() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.chatUploadVideoMessage = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.room && req.params.from && req.params.to) {
      let message: any = await addMediaMessageChat(
        req.params.room,
        req.params.from,
        req.params.to,
        'video',
        req.file,
        '.mp4'
      );

      res.send({
        success: true,
        data: message,
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> chatUploadVideoMessage() ' + e);
    res.send({ success: false, error: e });
  }
};

const addMediaMessageChat = (
  room: string,
  from: string,
  to: string,
  type: string,
  file: any,
  extension: string
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const uid = generateUniqueId();

      const userSnap = await db.collection(collections.user).doc(from).get();
      const user: any = userSnap.data();

      await db.runTransaction(async (transaction) => {
        // userData - no check if firestore insert works? TODO
        transaction.set(db.collection(collections.message).doc(uid), {
          room: room,
          message: '',
          from: from,
          to: to,
          created: Date.now(),
          seen: false,
          type: type
        });
      });

      const chatQuery = await db.collection(collections.chat).where('room', '==', room).get();
      if (!chatQuery.empty) {
        for (const doc of chatQuery.docs) {
          let data = doc.data();
          let messages: any = data.messages;
          messages.push(uid);

          db.collection(collections.chat).doc(doc.id).update({
            messages: messages,
            lastMessage: type,
            lastMessageDate: Date.now(),
          });
        }
      }

      let dir = 'uploads/chat/one-to-one/' + room;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      } else {
        fs.rename(file.path, dir + '/' + uid + extension, function (err) {
          if (err) console.log('ERROR: ' + err);
        });
      }

      resolve({
        id: uid,
        room: room,
        message: '',
        from: from,
        to: to,
        created: Date.now(),
        seen: false,
        type: type,
      });
    } catch (e) {
      console.log(e);
      reject(e);
    }
  });
};

exports.chatGetPhotoMessage = async (req: express.Request, res: express.Response) => {
  try {
    let room = req.params.room;
    let from = req.params.from;
    let messageId = req.params.messageId;
    console.log(req.params, room && from && messageId);

    if (room && from && messageId) {
      await chatGetMediaMessage(room, from, messageId, '.png', 'image', res);
    } else {
      console.log('Error in controllers/chatRoutes -> chatGetPhotoMessage()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> chatGetPhotoMessage() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.chatGetAudioMessage = async (req: express.Request, res: express.Response) => {
  try {
    let room = req.params.room;
    let from = req.params.from;
    let messageId = req.params.messageId;

    if (room && from && messageId) {
      await chatGetMediaMessage(room, from, messageId, '.mp3', 'audio', res);
    } else {
      console.log('Error in controllers/chatRoutes -> chatGetAudioMessage()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> chatGetAudioMessage() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.chatGetVideoMessage = async (req: express.Request, res: express.Response) => {
  try {
    let room = req.params.room;
    let from = req.params.from;
    let messageId = req.params.messageId;

    if (room && from && messageId) {
      await chatGetMediaMessage(room, from, messageId, '.mp4', 'video', res);
    } else {
      console.log('Error in controllers/chatRoutes -> chatGetVideoMessage()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> chatGetVideoMessage() ' + e);
    res.send({ success: false, error: e });
  }
};

const chatGetMediaMessage = (
  room: string,
  from: string,
  messageId: string,
  extension: string,
  type: string,
  res: express.Response
) => {
  return new Promise((resolve, reject) => {
    try {
      const directoryPath = path.join('uploads', 'chat', 'one-to-one', room);
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          //console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader('Content-Type', type);
      let raw = fs.createReadStream(
        path.join('uploads', 'chat', 'one-to-one', room, messageId + extension)
      );
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } catch (e) {
      reject(e);
    }
  });
};


exports.checkChatFoldersExists = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // COMMUNITIES
      const communitySnap = await db.collection(collections.community).get();
      for (let community of communitySnap.docs) {
        let communityData = community.data();

        if (communityData && communityData.JarrId) {
          chatFoldersCheck(communityData.JarrId);
        }
      }

      // FTPODS
      const podsSnap = await db.collection(collections.podsFT).get();
      for (let pod of podsSnap.docs) {
        let podData = pod.data();

        if (podData && podData.DiscordId) {
          chatFoldersCheck(podData.DiscordId);
        }
      }

      // PRIVICREDITS
      const priviCreditsSnap = await db.collection(collections.priviCredits).get();
      for (let priviCredit of priviCreditsSnap.docs) {
        let priviCreditData = priviCredit.data();

        if (priviCreditData && priviCreditData.JarrId) {
          chatFoldersCheck(priviCreditData.JarrId);
        }
      }
    } catch (e) {
      console.log(e);
      reject(e);
    }
  });
};

const chatFoldersCheck = async (id) => {
  try {
    const discordChatSnap = await db.collection(collections.discordChat).doc(id).get();

    let dir = 'uploads/chat/' + discordChatSnap.id;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
      console.log(true, dir);
    }

    const discordRoomSnap = await db
      .collection(collections.discordChat)
      .doc(discordChatSnap.id)
      .collection(collections.discordRoom)
      .get();
    if (!discordRoomSnap.empty) {
      for (const doc of discordRoomSnap.docs) {
        let dir = 'uploads/chat/' + discordChatSnap.id + '/' + doc.id;

        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
          console.log(true, dir);
        }
      }
    }
  } catch (e) {
    return e;
  }
};

exports.createChatWIP = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (
      body.wipId &&
      body.users &&
      body.users.userFrom &&
      body.users.userFrom.userId &&
      body.users.userTo &&
      body.users.userTo.userId
    ) {
      const userFromSnap = await db.collection(collections.user).doc(body.users.userFrom.userId).get();
      const userFrom: any = userFromSnap.data();

      const userToSnap = await db.collection(collections.user).doc(body.users.userTo.userId).get();
      const userTo: any = userToSnap.data();

      let chat = await createChatWIPFromUsers(
        body.wipId,
        body.users.userFrom.userId,
        body.users.userTo.userId,
        userFrom.firstName,
        userTo.firstName
      );

      res.send({
        success: true,
        data: chat,
      });
    } else {
      console.log('Error in controllers/chatRoutes -> createChatWIP(): Missing info');
      res.send({
        success: false,
        error: 'Error in controllers/chatRoutes -> createChatWIP(): Missing info',
      });
    }
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> createChatWIP() ' + e);
    res.send({
      success: false,
      error: 'Error in controllers/chatRoutes -> createChatWIP() ' + e,
    });
  }
};

const createChatWIPFromUsers = (exports.createChatWIPFromUsers = (wipId, fromId, toId, fromName, toName) => {
  return new Promise(async (resolve, reject) => {
    try {
      let room: string = '';
      if (fromName.toLowerCase() < toName.toLowerCase()) {
        room = '' + wipId + '' + fromId + '' + toId;
      } else {
        room = '' + wipId + '' + toId + '' + fromId;
      }

      const chatQuery = await db.collection(collections.chat).where('room', '==', room).get();
      if (!chatQuery.empty) {
        for (const doc of chatQuery.docs) {
          let data = doc.data();
          data.id = doc.id;
          resolve(data);
        }
      } else {
        const uid = generateUniqueId();

        await db.runTransaction(async (transaction) => {
          // userData - no check if firestore insert works? TODO
          transaction.set(db.collection(collections.chat).doc(uid), {
            users: {
              userFrom: {
                lastView: null,
                userConnected: false,
                userFoto: '',
                userId: fromId,
                userName: fromName,
              },
              userTo: {
                lastView: null,
                userConnected: false,
                userFoto: '',
                userId: toId,
                userName: toName,
              },
            },
            created: Date.now(),
            room: room,
            lastMessage: null,
            lastMessageDate: null,
            messages: [],
            wipId: wipId,
          });
        });
        resolve({
          users: {
            userFrom: {
              lastView: null,
              userConnected: false,
              userFoto: '',
              userId: fromId,
              userName: fromName,
            },
            userTo: {
              lastView: null,
              userConnected: false,
              userFoto: '',
              userId: toId,
              userName: toName,
            },
          },
          created: Date.now(),
          room: room,
          lastMessage: null,
          lastMessageDate: null,
          messages: [],
          wipId: wipId,
          id: uid,
        });
      }
    } catch (e) {
      console.log(e);
      reject(e);
    }
  });
});

exports.getChatsWIP = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const allChats: any[] = [];
    const chatUserFromSnap = await db
      .collection(collections.chat)
      .where('wipId', '==', body.wipId)
      .where('users.userFrom.userId', '==', body.userId)
      .get();
    chatUserFromSnap.forEach((doc) => {
      allChats.push(doc.data());
    });
    const chatUserToSnap = await db
      .collection(collections.chat)
      .where('wipId', '==', body.wipId)
      .where('users.userTo.userId', '==', body.userId)
      .get();
    chatUserToSnap.forEach((doc) => {
      allChats.push(doc.data());
    });
    let sortChats = allChats.sort((a, b) => (b.created > a.created ? 1 : a.created > b.created ? -1 : 0));

    res.send({
      success: true,
      data: sortChats,
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> getChatsWIP()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/chatRoutes -> getChatsWIP()' + e,
    });
  }
};

exports.getChatsPvP = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    console.log('body', body);

    const allChats: any[] = [];
    const chatUserFromSnap = await db
      .collection(collections.chat)
      .where('users.userTo.userId', '==', body.userId)
      .where('users.userFrom.userId', '==', body.targetId)
      .get();

    chatUserFromSnap.forEach((doc) => {
      console.log('chatUserFromSnap', doc.data());
      allChats.push(doc.data());
    });
    const chatUserToSnap = await db
      .collection(collections.chat)
      .where('users.userTo.userId', '==', body.targetId)
      .where('users.userFrom.userId', '==', body.userId)
      .get();
    chatUserToSnap.forEach((doc) => {
      allChats.push(doc.data());
    });
    console.log('allChats:', allChats);
    let sortChats = allChats.sort((a, b) => (b.created > a.created ? 1 : a.created > b.created ? -1 : 0));

    res.send({
      success: true,
      data: sortChats,
    });
  } catch (e) {
    console.log('Error in controllers/chatRoutes -> getChatsWIP()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/chatRoutes -> getChatsWIP()' + e,
    });
  }
};
