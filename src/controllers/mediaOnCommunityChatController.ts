import express from 'express';
import { db, firebase } from '../firebase/firebase';
import path from 'path';
import fs from 'fs';
import collections, { buyingOffers, sellingOffers, tokens, user } from '../firebase/collections';
import { updateFirebase, getRateOfChangeAsMap, generateUniqueId } from '../functions/functions';

exports.getChat = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if(body.chatId) {
      const mediaOnCommunityChatRef = db.collection(collections.mediaOnCommunityChat).doc(body.chatId);
      const mediaOnCommunityChatGet = await mediaOnCommunityChatRef.get();
      const mediaOnCommunityChat : any = mediaOnCommunityChatGet.data();

      mediaOnCommunityChat.id = mediaOnCommunityChatGet.id;

      res.send({
        success: true,
        data: mediaOnCommunityChat
      });
    } else {
      //TODO: error no chat id
    }
  } catch (e) {
    console.log('Error in controllers/mediaOnCommunityChatController -> getChat() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.createChat = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if(body.userId && body.userName) {
      const chatCreation : any = await mediaOnCommunityChatCreation(body.adminId, body.adminName);

      res.send({
        success: true,
        data: chatCreation
      });
    } else {
      // TODO: error
    }

  } catch (e) {
    console.log('Error in controllers/mediaOnCommunityChatController -> discordGetChat()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/mediaOnCommunityChatController -> discordGetChat()' + e,
    });
  }
};

const mediaOnCommunityChatCreation = (exports.mediaOnCommunityChatCreation = async (adminId, adminName) => {
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
        transaction.set(db.collection(collections.mediaOnCommunityChat).doc(uid), {
          users: users,
          admin: {
            id: adminId,
            name: adminName,
          },
          created: Date.now(),
        });
      });

      let dir = 'uploads/mediaOnCommunity/' + uid;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      resolve({
        id: uid,
        users: users,
        created: Date.now(),
      });
    } catch (e) {
      reject('Error in controllers/mediaOnCommunityChatController -> createDiscordChat()' + e);
    }
  });
});

/*const checkIfUserIsAdmin = (chatId, adminId): Promise<boolean> => {
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
};*/

exports.addUserToRoom = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let checkIsAdmin: boolean = true;
    /*if (body.adminRequired) {
      checkIsAdmin = await checkIfUserIsAdmin(body.discordChatId, body.adminId);
    } else {
      checkIsAdmin = true;
    }*/

    if (checkIsAdmin && body.chatId && body.userId) {
      let chatRoom = await addUserToRoomFunction(body.chatId, body.userId);

      res.send({
        success: true,
        data: chatRoom,
      });
    } else {
      res.send({
        success: false,
        error: 'Non permissions',
      });
    }
  } catch (e) {
    console.log('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController() ' + e);
    res.send({
      success: false,
      error: e,
    });
  }
};

const addUserToRoomFunction = (exports.addUserToRoomFunction = (chatId, userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(chatId, userId);

      const mediaOnCommunityChatRef = db
        .collection(collections.mediaOnCommunityChat)
        .doc(chatId);
      const mediaOnCommunityChatGet = await mediaOnCommunityChatRef.get();
      const mediaOnCommunityChat: any = mediaOnCommunityChatGet.data();

      let users = [...mediaOnCommunityChat.users];

      let findIndexUser = users.findIndex((usr) => usr.userId === userId);
      if (findIndexUser === -1) {
        const userSnap = await db.collection(collections.user).doc(userId).get();
        let data: any = userSnap.data();

        users.push({
          userId: userId,
          userName: data.firstName,
          userConnected: false,
          lastView: Date.now(),
        });

        await mediaOnCommunityChatRef.update({
          users: users
        });

        mediaOnCommunityChat.users = users;
      }

      resolve(mediaOnCommunityChat);
    } catch (e) {
      reject('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController()' + e);
    }
  });
});

const removeUserToRoom = (exports.removeUserToRoom = (chatId, userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const mediaOnCommunityChatRef = db
        .collection(collections.mediaOnCommunityChat)
        .doc(chatId);
      const mediaOnCommunityChatGet = await mediaOnCommunityChatRef.get();
      const mediaOnCommunityChat: any = mediaOnCommunityChatGet.data();


      let users = [...mediaOnCommunityChat.users];

      let findIndexUser = users.findIndex((usr) => usr.userId === userId);
      if (findIndexUser !== -1) {
        if (users[findIndexUser].type !== 'Admin') {
          users.splice(findIndexUser, 1);
        }

        await mediaOnCommunityChatRef.update({
          users: users
        });

        mediaOnCommunityChat.users = users;
      }
      resolve(mediaOnCommunityChat);
    } catch (e) {
      reject('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController()' + e);
    }
  });
});

exports.getMessages = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if(body.chatId) {
      const mediaOnCommunityChatRef = db
        .collection(collections.mediaOnCommunityChat)
        .doc(body.chatId);
      const mediaOnCommunityChatGet = await mediaOnCommunityChatRef.get();
      const mediaOnCommunityChat: any = mediaOnCommunityChatGet.data();

      let messages: any[] = [];
      if (mediaOnCommunityChat.messages && mediaOnCommunityChat.messages.length > 0) {
        for (let i = 0; i < mediaOnCommunityChat.messages.length; i++) {
          const messageGet = await db.collection(collections.mediaOnCommunityMessage).doc(mediaOnCommunityChat.messages[i]).get();

          let mediaOnCommunityMessage : any = messageGet.data();

          const userRef = db.collection(collections.user).doc(mediaOnCommunityMessage.from);
          const userGet = await userRef.get();
          const user: any = userGet.data();

          mediaOnCommunityMessage.id = messageGet.id;
          messages.push(mediaOnCommunityMessage);

          if (i === mediaOnCommunityChat.messages.length - 1) {
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
    } else {
      //TODO: ERROR
    }
  } catch (e) {
    console.log('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController()' + e);
    res.status(200).send({
      success: false,
      error: 'Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController():' + e,
    });
  }
};


exports.lastView = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body.userId && body.chatId && body.room && body.lastView) {
      const mediaOnCommunityChatRef = db
        .collection(collections.mediaOnCommunityChat)
        .doc(body.chatId);
      const mediaOnCommunityChatGet = await mediaOnCommunityChatRef.get();
      const mediaOnCommunityChat: any = mediaOnCommunityChatGet.data();
      if (mediaOnCommunityChat) {
        let users = [...mediaOnCommunityChat.users];
        let userIndex = users.findIndex((usr, i) => usr.userId === body.userId);
        users[userIndex].lastView = body.lastView;
        await mediaOnCommunityChatRef.update({
          users: users
        });
      }
      const messageQuery = await db.collection(collections.mediaOnCommunityMessage).where('room', '==', body.room).get();
      if (!messageQuery.empty) {
        for (const doc of messageQuery.docs) {
          let data = doc.data();
          if (!data.seen.includes(body.userId)) {
            let usersSeen = [...data.seen];
            usersSeen.push(body.userId);
            await db.collection(collections.mediaOnCommunityMessage).doc(doc.id).update({
              seen: usersSeen
            });
          }
        }
      }
      res.status(200).send({ success: true });
    } else {
      res.status(200).send({
        success: false,
        error: 'Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController(): Non UserId or Room Provided',
      });
    }
  } catch (e) {
    res.status(200).send({
      success: false,
      error: 'Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController()' + e
    });
  }
};


// FILES

exports.uploadPhotoMessage = async (req: express.Request, res: express.Response) => {
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
    console.log('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.uploadAudioMessage = async (req: express.Request, res: express.Response) => {
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
    console.log('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.uploadVideoMessage = async (req: express.Request, res: express.Response) => {
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
    console.log('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController() ' + e);
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

exports.getPhotoMessage = async (req: express.Request, res: express.Response) => {
  try {
    let discordChatId = req.params.discordChatId;
    let discordRoomId = req.params.discordRoomId;
    let discordMessageId = req.params.discordMessageId;
    console.log(req.params, discordChatId && discordRoomId && discordMessageId);

    if (discordChatId && discordRoomId && discordMessageId) {
      await discordGetMediaMessage(discordChatId, discordRoomId, discordMessageId, '.png', 'image', res);
    } else {
      console.log('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.getAudioMessage = async (req: express.Request, res: express.Response) => {
  try {
    let discordChatId = req.params.discordChatId;
    let discordRoomId = req.params.discordRoomId;
    let discordMessageId = req.params.discordMessageId;

    if (discordChatId && discordRoomId && discordMessageId) {
      await discordGetMediaMessage(discordChatId, discordRoomId, discordMessageId, '.mp3', 'audio', res);
    } else {
      console.log('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController() ' + e);
    res.send({ success: false, error: e });
  }
};

exports.getVideoMessage = async (req: express.Request, res: express.Response) => {
  try {
    let discordChatId = req.params.discordChatId;
    let discordRoomId = req.params.discordRoomId;
    let discordMessageId = req.params.discordMessageId;

    if (discordChatId && discordRoomId && discordMessageId) {
      await discordGetMediaMessage(discordChatId, discordRoomId, discordMessageId, '.mp4', 'video', res);
    } else {
      console.log('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/mediaOnCommunityChatController -> mediaOnCommunityChatController() ' + e);
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
