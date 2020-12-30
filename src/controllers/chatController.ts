import express from "express";
import {db} from "../firebase/firebase";
import collections from '../firebase/collections';
import {generateUniqueId} from "../functions/functions";
import {user} from "firebase-functions/lib/providers/auth";

exports.getChats =  async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const allChats: any[] = [];
        const chatUserFromSnap = await db.collection(collections.chat)
            .where("users.userFrom.userId", "==", body.userId).get();
        chatUserFromSnap.forEach((doc) => {
            allChats.push(doc.data())
        });
        const chatUserToSnap = await db.collection(collections.chat)
            .where("users.userTo.userId", "==", body.userId).get();
        chatUserToSnap.forEach((doc) => {
            allChats.push(doc.data())
        });
        let sortChats = allChats.sort((a, b) => (b.created > a.created) ? 1 : ((a.created > b.created) ? -1 : 0));

        res.send({
            success: true,
            data: sortChats
        });
    } catch (e) {
        return ('Error in controllers/chatRoutes -> getChats()' + e)
    }
};

exports.createChat = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;
        let room;

        if(body.users && body.users.userFrom && body.users.userTo) {
            let userFrom = body.users.userFrom;
            let userTo = body.users.userTo;

            if (userFrom.userName.toLowerCase() < userTo.userName.toLowerCase()) {
                room = "" + userFrom.userId + "" + userTo.userId;
            } else {
                room = "" + userTo.userId + "" + userFrom.userId;
            }

            const chatQuery = await db.collection(collections.chat).where("room", "==", room).get();
            if(!chatQuery.empty) {
                for (const doc of chatQuery.docs) {
                    let data = doc.data();
                    data.id = doc.id;
                    res.status(200).send({
                        success: true,
                        data: data
                    });
                }
            } else {
                await db.runTransaction(async (transaction) => {
                    const uid = generateUniqueId();

                    // userData - no check if firestore insert works? TODO
                    transaction.set(db.collection(collections.chat).doc(uid), {
                        users: {
                            userFrom: userFrom,
                            userTo: userTo
                        },
                        created: Date.now(),
                        room: room,
                        lastMessage: null,
                        lastMessageDate: null,
                        messages: []
                    });
                });
                res.status(200).send({
                    success: true,
                    data: {
                        users: {
                            userFrom: userFrom,
                            userTo: userTo
                        },
                        created: Date.now(),
                        room: room,
                        lastMessage: null,
                        lastMessageDate: null
                    }
                });
            }
        } else {
            res.status(200).send({
                success: false,
                error: 'Error in controllers/chatRoutes -> createChat(): Non Users Provided Correctly'
            });
        }

    } catch (e) {
        return ('Error in controllers/chatRoutes -> createChat()' + e)
    }
};

exports.getMessagesNotSeen = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        if(body.userId) {
            const messageQuery = await db.collection(collections.message)
                .where("to", "==", body.userId)
                .where("seen", "==", false).get();
            if (!messageQuery.empty) {
                res.status(200).send({
                    success: true,
                    data: messageQuery.docs.length
                });
            }
        } else {
            res.status(200).send({
                success: false,
                error: 'Error in controllers/chatRoutes -> getMessagesNotSeen(): Non userId Provided'
            });
        }
    } catch (e) {
        return ('Error in controllers/chatRoutes -> getMessagesNotSeen()' + e)
    }
};

exports.lastView = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        if(body.userId && body.room) {
            const chatUserToQuery = await db.collection(collections.chat)
                .where("room", "==", body.room)
                .where("users.userTo.userId", "==", body.userId).get();
            if(!chatUserToQuery.empty) {
                for (const doc of chatUserToQuery.docs) {
                    let data = doc.data();

                    db.collection(collections.chat).doc(doc.id).update({
                        "users.userTo.lastView": body.lastView
                    });
                }
            }
            const chatUserFromQuery = await db.collection(collections.chat)
                .where("room", "==", body.room)
                .where("users.userFrom.userId", "==", body.userId).get();
            if(!chatUserFromQuery.empty) {
                for (const doc of chatUserFromQuery.docs) {
                    let data = doc.data();

                    db.collection(collections.chat).doc(doc.id).update({
                        "users.userFrom.lastView": body.lastView
                    });
                }
            }
            const messageQuery = await db.collection(collections.message)
                .where("room", "==", body.room)
                .where("to", "==", body.userId)
                .where("seen", "==", false).get();
            if(!messageQuery.empty) {
                for (const doc of messageQuery.docs) {
                    let data = doc.data();

                    db.collection(collections.message).doc(doc.id).update({
                        "seen": true
                    });
                }
            }
            res.status(200).send({success: true});
        } else {
            res.status(200).send({
                success: false,
                error: 'Error in controllers/chatRoutes -> lastView(): Non UserId or Room Provided'
            });
        }

    } catch (e) {
        return ('Error in controllers/chatRoutes -> lastView()' + e)
    }
};

exports.getMessages = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        if(body.room) {
            const chatQuery = await db.collection(collections.chat)
                .where("room", "==", body.room).get();
            let messages : any[] = [];

            if(!chatQuery.empty) {
                for (const doc of chatQuery.docs) {
                    let data = doc.data();
                    if(data && data.messages) {
                        for(let i = 0 ; i < data.messages.length; i++){
                            const messageGet = await db.collection(collections.message)
                                .doc(data.messages[i]).get();
                            messages.push(messageGet.data())

                            if(i === data.messages.length - 1) {
                                res.status(200).send({
                                    success: true,
                                    data: messages
                                });
                            }
                        }
                    } else {
                        res.status(200).send({
                            success: true,
                            data: messages
                        });
                    }
                }
            } else {
                res.status(200).send({
                    success: false,
                    error: 'Error in controllers/chatRoutes -> getMessages(): Wrong Chat Room Provided'
                });
            }
        } else {
            res.status(200).send({
                success: false,
                error: 'Error in controllers/chatRoutes -> getMessages(): Non Chat Room Provided'
            });
        }
    } catch (e) {
        return ('Error in controllers/chatRoutes -> getChatRoomById()' + e)
    }
};

exports.getChatRoomById = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        if(body.room) {
            const chatQuery = await db.collection(collections.chat)
                .where("room", "==", body.room).get();
            if(!chatQuery.empty) {
                for (const doc of chatQuery.docs) {
                    res.status(200).send({
                        success: true,
                        data: doc
                    });
                }
            }
        } else {
            res.status(200).send({
                success: false,
                error: 'Error in controllers/chatRoutes -> getChatRoomById(): Non Chat Room Provided'
            });
        }
    } catch (e) {
        return ('Error in controllers/chatRoutes -> getChatRoomById()' + e)
    }
};

exports.getChatRoom = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;
        let room;
        if (body.userFrom.userName && body.userTo.userName) {
            if (body.userFrom.userName.toLowerCase() < body.userTo.userName.toLowerCase()) {
                room = "" + body.userFrom.userId + "" + body.userTo.userId;
            } else {
                room = "" + body.userTo.userId + "" + body.userFrom.userId;
            }
        }

        res.status(200).send({
            room: room
        });
    } catch (e) {
        return ('Error in controllers/chatRoutes -> getChatRoom()' + e)
    }
};

exports.getUsers = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        let users : any[] = [];

        const userQuery = await db.collection(collections.user).get();
        if(!userQuery.empty) {
            for (const doc of userQuery.docs) {
                let data = doc.data();
                data.id = doc.id;
                users.push(data);
            }
            res.status(200).send({
                success: true,
                data: users
            });
        }
    } catch (e) {
        return ('Error in controllers/chatRoutes -> getUsers()' + e)
    }
};

exports.discordGetChat = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        let discordChat: any;
        let discordRooms : any[] = [];
        const discordChatRef = db.collection(collections.discordChat).doc(body.discordChat);
        const discordChatGet = await discordChatRef.get();
        const discordChatData : any = discordChatGet.data();

        const discordRoomGet = await discordChatRef.collection(collections.discordRoom).get();
        discordRoomGet.forEach((doc) => {
            let data = {...doc.data()}
            data.room = doc.id;
            discordRooms.push(doc.data())
        });
        discordChat = {...discordChatData};
        discordChat.id = discordChatGet.id;
        discordChat.discordRooms = [...discordRooms]
        res.send({
            success: true,
            data: discordChat
        });
    } catch (e) {
        return ('Error in controllers/chatRoutes -> discordGetChat()' + e)
    }
}

exports.discordCreateChat = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const discordChatCreation : any = await createDiscordChat(body.adminId, body.adminName);
        const discordRoomCreation : any = await createDiscordRoom(discordChatCreation.chatId, 'Discussions', body.adminId, body.adminName, body.roomName);

        res.send({
            success: true,
            data: discordChatCreation
        });
    } catch (e) {
        return ('Error in controllers/chatRoutes -> discordGetChat()' + e)
    }
}

const createDiscordChat = async (adminId, adminName) => {
    return new Promise(async (resolve, reject) => {
        try {
            const uid = generateUniqueId();
            let users : any[] = [{
                id: adminId,
                name: adminName
            }]

            await db.runTransaction(async (transaction) => {

                // userData - no check if firestore insert works? TODO
                transaction.set(db.collection(collections.discordChat).doc(uid), {
                    users: users,
                    created: Date.now()
                });
            });

            resolve({
                id: uid,
                users: users,
                created: Date.now()
            })
        } catch (e) {
            reject('Error in controllers/chatRoutes -> createDiscordChat()' + e)
        }
    })
};

const createDiscordRoom = async (chatId, type, adminId, adminName, roomName) => {
    return new Promise(async (resolve, reject) => {
        try {
            const uid = generateUniqueId();
            let users : any[] = [{
                type: 'admin',
                userId: adminId,
                userName: adminName,
                userConnected: false,
                lastView: Date.now()
            }];
            let obj : any = {
                type: type,
                name: roomName,
                users: users,
                created: Date.now(),
                lastMessage: null,
                lastMessageDate: null,
                messages: []
            }
            await db.collection(collections.discordChat).doc(chatId)
                .collection(collections.discordRoom).doc(uid).set(obj);

            obj.id = uid;
            resolve(obj);
        } catch (e) {
            reject('Error in controllers/chatRoutes -> createDiscordChat()' + e)
        }
    })
};

exports.discordCreateRoom = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const discordRoomCreation : any = await createDiscordRoom(body.chatId, body.roomType, body.adminId, body.adminName, body.roomName);

        res.send({
            success: true,
            data: discordRoomCreation
        });
    } catch (e) {
        return ('Error in controllers/chatRoutes -> discordGetChat()' + e)
    }
}

exports.discordGetMessages = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const discordRoomRef = db.collection(collections.discordChat)
            .doc(body.discordChatId).collection(collections.discordRoom)
            .doc(body.discordRoom);
        const discordRoomGet = await discordRoomRef.get();
        const discordRoom : any = discordRoomGet.data();

        let messages : any[] = [];
        for(let i = 0 ; i < discordRoom.messages.length; i++){
            const messageGet = await db.collection(collections.discordMessage)
                .doc(discordRoom.messages[i]).get();

            let discordMsg : any = messageGet.data();

            const userRef = db.collection(collections.user).doc(discordMsg.from);
            const userGet = await userRef.get();
            const user: any = userGet.data();

            discordMsg['user'] = {
                name: user.firstName,
                level: user.level || 1,
                cred: user.cred || 0,
                salutes: user.salutes || 0,
            }
            messages.push(discordMsg)

            if(i === discordRoom.messages.length - 1) {
                res.status(200).send({
                    success: true,
                    data: messages
                });
            }
        }
    } catch (e) {
        return ('Error in controllers/chatRoutes -> discordModifyAccess()' + e)
    }
}

exports.discordModifyAccess = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const discordRoomRef = db.collection(collections.discordChat)
            .doc(body.discordChatId).collection(collections.discordRoom)
            .doc(body.discordRoomId);
        const discordRoomGet = await discordRoomRef.get();
        const discordRoom : any = discordRoomGet.data();

        let users : any[] = [...discordRoom.users];

        let findUserIndex = users.findIndex((user, i) => body.userId === user.userId);

        if(findUserIndex === -1) {
            users.push({
                type: body.type,
                userId: body.userId,
                userName: body.userName,
                userConnected: false,
                lastView: Date.now()
            });
        } else {
            users[findUserIndex] = {
                type: body.type
            }
        }

        await discordRoomRef.update({
            users: users
        });

        discordRoom.users = users;

        res.send({
            success: true,
            data: discordRoom
        });
    } catch (e) {
        return ('Error in controllers/chatRoutes -> discordModifyAccess()' + e)
    }
}

exports.discordRemoveAccess = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const discordRoomRef = db.collection(collections.discordChat)
            .doc(body.discordChatId).collection(collections.discordRoom)
            .doc(body.discordRoomId);
        const discordRoomGet = await discordRoomRef.get();
        const discordRoom : any = discordRoomGet.data();

        let users : any[] = [...discordRoom.users];

        let findUserIndex = users.findIndex((user, i) => body.userId === user.userId);

        if(findUserIndex === -1) {
            res.send({
                success: false,
                data: 'User not found'
            });
        } else {
            users.splice(findUserIndex, 1);
        }

        await discordRoomRef.update({
            users: users
        });

        discordRoom.users = users;

        res.send({
            success: true,
            data: discordRoom
        });
    } catch (e) {
        return ('Error in controllers/chatRoutes -> discordRemoveAccess()' + e)
    }
}