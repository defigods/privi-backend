import express from "express";
import { db } from "../firebase/firebase";
import collections from '../firebase/collections';
import { generateUniqueId } from "../functions/functions";

const userController = require('./userController');

exports.getChats = async (req: express.Request, res: express.Response) => {
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

        if (body.users && body.users.userFrom && body.users.userTo) {
            let userFrom = body.users.userFrom;
            let userTo = body.users.userTo;

            if (userFrom.userName.toLowerCase() < userTo.userName.toLowerCase()) {
                room = "" + userFrom.userId + "" + userTo.userId;
            } else {
                room = "" + userTo.userId + "" + userFrom.userId;
            }

            const chatQuery = await db.collection(collections.chat).where("room", "==", room).get();
            if (!chatQuery.empty) {
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

        if (body.userId) {
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

        if (body.userId && body.room) {
            const chatUserToQuery = await db.collection(collections.chat)
                .where("room", "==", body.room)
                .where("users.userTo.userId", "==", body.userId).get();
            if (!chatUserToQuery.empty) {
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
            if (!chatUserFromQuery.empty) {
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
            if (!messageQuery.empty) {
                for (const doc of messageQuery.docs) {
                    let data = doc.data();

                    db.collection(collections.message).doc(doc.id).update({
                        "seen": true
                    });
                }
            }
            res.status(200).send({ success: true });
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

        if (body.room) {
            const chatQuery = await db.collection(collections.chat)
                .where("room", "==", body.room).get();
            let messages: any[] = [];

            if (!chatQuery.empty) {
                for (const doc of chatQuery.docs) {
                    let data = doc.data();
                    if (data && data.messages) {
                        for (let i = 0; i < data.messages.length; i++) {
                            const messageGet = await db.collection(collections.message)
                                .doc(data.messages[i]).get();
                            messages.push(messageGet.data())

                            if (i === data.messages.length - 1) {
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
        console.log('Error in controllers/chatRoutes -> getChatRoomById()' + e)
        res.status(200).send({
            success: false,
            error: 'Error in controllers/chatRoutes -> getMessages():' + e
        });
    }
};

exports.getChatRoomById = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        if (body.room) {
            const chatQuery = await db.collection(collections.chat)
                .where("room", "==", body.room).get();
            if (!chatQuery.empty) {
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

        let discordChat: any = {};
        let discordRooms: any[] = [];
        const discordChatRef = db.collection(collections.discordChat).doc(body.discordChat);
        const discordChatGet = await discordChatRef.get();
        const discordChatData: any = discordChatGet.data();

        const discordRoomGet = await discordChatRef.collection(collections.discordRoom).get();
        discordRoomGet.forEach((doc) => {
            let data = { ...doc.data() }
            data.room = doc.id;
            discordRooms.push(data)
        });
        discordChat = { ...discordChatData };
        discordChat.id = discordChatGet.id;
        discordChat.discordRooms = [...discordRooms];
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

        const discordChatCreation: any = await createDiscordChat(body.adminId, body.adminName);
        const discordRoomCreation: any = await createDiscordRoom(discordChatCreation.chatId, 'Discussions', body.adminId, body.adminName, body.roomName, false, []);

        res.send({
            success: true,
            data: discordChatCreation
        });
    } catch (e) {
        return ('Error in controllers/chatRoutes -> discordGetChat()' + e)
    }
}

const createDiscordChat = exports.createDiscordChat = async (adminId, adminName) => {
    return new Promise(async (resolve, reject) => {
        try {
            const uid = generateUniqueId();
            let users: any[] = [{
                id: adminId,
                name: adminName
            }]

            await db.runTransaction(async (transaction) => {

                // userData - no check if firestore insert works? TODO
                transaction.set(db.collection(collections.discordChat).doc(uid), {
                    users: users,
                    admin: {
                        id: adminId,
                        name: adminName
                    },
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

const createDiscordRoom = exports.createDiscordRoom = async (chatId, type, adminId, adminName, roomName, privacy, users) => {
    return new Promise(async (resolve, reject) => {
        try {
            const uid = generateUniqueId();
            let usrs: any[] = [{
                type: 'Admin',
                userId: adminId,
                userName: adminName,
                userConnected: false,
                lastView: Date.now()
            }, ...users];
            let obj: any = {
                type: type,
                name: roomName,
                private: privacy,
                users: usrs,
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
            reject('Error in controllers/chatRoutes -> createDiscordRoom()' + e)
        }
    })
};

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

                    for (const user of investors) {
                        let i = investors.indexOf(user);
                        const userSnap = await db.collection(collections.user).doc(user).get();
                        let data: any = userSnap.data();

                        users.push({
                            type: 'Members',
                            userId: user,
                            userName: data.firstName,
                            userConnected: false,
                            lastView: Date.now()
                        })
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
                            lastView: Date.now()
                        })
                    }
                } else if (body.type === 'Credit-Pool') {
                    const creditPoolBorrowersSnap = await db.collection(collections.community).doc(body.id)
                        .collection(collections.priviCreditsBorrowing).get();
                    const creditPoolLendersSnap = await db.collection(collections.community).doc(body.id)
                        .collection(collections.priviCreditsLending).get();

                    if (!creditPoolBorrowersSnap.empty) {
                        for (const doc of creditPoolBorrowersSnap.docs) {
                            const userRef = db.collection(collections.user).doc(doc.id);
                            const userGet = await userRef.get();
                            const user: any = userGet.data();

                            users.push({
                                type: 'Members',
                                userId: doc.id,
                                userName: user.firstName
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
                                    userName: user.firstName
                                });
                            }
                        }
                    }
                } else if (body.type === 'Insurance') {

                }
            }

            const discordRoomCreation: any = await createDiscordRoom(body.chatId, body.roomType, body.adminId, body.adminName, body.roomName, body.private, users);

            res.send({
                success: true,
                data: discordRoomCreation
            });
        } else {
            res.send({
                success: false,
                error: 'Non permissions'
            });
        }
    } catch (e) {
        console.log('Error in controllers/chatRoutes -> discordCreateRoom() ' + e);
        res.send({
            success: false,
            error: e
        });
    }
}

const checkIfUserIsAdmin = (chatId, adminId): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const discordChatRef = db.collection(collections.discordChat)
            .doc(chatId);
        const discordChatGet = await discordChatRef.get();
        const discordChat: any = discordChatGet.data();

        if (discordChat && discordChat.admin && discordChat.admin.id && discordChat.admin.id === adminId) {
            resolve(true);
        } else {
            resolve(false);
        }
    })
}

exports.discordAddUserToRoom = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        let checkIsAdmin: boolean;
        if (body.adminRequired) {
            checkIsAdmin = await checkIfUserIsAdmin(body.discordChatId, body.adminId);
        } else {
            checkIsAdmin = true
        }

        if (checkIsAdmin) {
            let discordRoom = await addUserToRoom(body.discordChatId, body.discordRoomId, body.userId);

            res.send({
                success: true,
                data: discordRoom
            });
        } else {
            res.send({
                success: false,
                error: 'Non permissions'
            });
        }
    } catch (e) {
        console.log('Error in controllers/chatRoutes -> discordAddUserToRoom() ' + e)
        res.send({
            success: false,
            error: e
        });
    }
}

const addUserToRoom = exports.addUserToRoom = (discordChatId, discordRoomId, userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(discordChatId, discordRoomId, userId);

            const discordRoomRef = db.collection(collections.discordChat)
                .doc(discordChatId).collection(collections.discordRoom)
                .doc(discordRoomId);
            const discordRoomGet = await discordRoomRef.get();
            const discordRoom: any = discordRoomGet.data();

            let users = [...discordRoom.users];

            let findIndexUser = users.findIndex(usr => usr.userId === userId);
            if (findIndexUser === -1) {
                const userSnap = await db.collection(collections.user).doc(userId).get();
                let data: any = userSnap.data();

                users.push({
                    type: 'Members',
                    userId: userId,
                    userName: data.firstName,
                    userConnected: false,
                    lastView: Date.now()
                })

                await discordRoomRef.update({
                    users: users
                });

                discordRoom.users = users;
            }

            resolve(discordRoom)
        } catch (e) {
            reject('Error in controllers/chatRoutes -> addUserToRoom()' + e)
        }
    })
}
const removeUserToRoom = exports.removeUserToRoom = (discordChatId, discordRoomId, userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const discordRoomRef = db.collection(collections.discordChat)
                .doc(discordChatId).collection(collections.discordRoom)
                .doc(discordRoomId);
            const discordRoomGet = await discordRoomRef.get();
            const discordRoom: any = discordRoomGet.data();

            let users = [...discordRoom.users];

            let findIndexUser = users.findIndex(usr => usr.userId === userId);
            if (findIndexUser !== -1) {
                if (users[findIndexUser].type !== 'Admin') {
                    users.splice(findIndexUser, 1);
                }

                await discordRoomRef.update({
                    users: users
                });

                discordRoom.users = users;
            }
            resolve(discordRoom)
        } catch (e) {
            reject('Error in controllers/chatRoutes -> addUserToRoom()' + e)
        }
    })
}

exports.discordGetMessages = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const discordRoomRef = db.collection(collections.discordChat)
            .doc(body.discordChatId).collection(collections.discordRoom)
            .doc(body.discordRoom);
        const discordRoomGet = await discordRoomRef.get();
        const discordRoom: any = discordRoomGet.data();

        let messages: any[] = [];
        if (discordRoom.messages && discordRoom.messages.length > 0) {
            for (let i = 0; i < discordRoom.messages.length; i++) {
                const messageGet = await db.collection(collections.discordMessage)
                    .doc(discordRoom.messages[i]).get();

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
                }
                discordMsg.id = messageGet.id;
                messages.push(discordMsg)

                if (i === discordRoom.messages.length - 1) {
                    messages.sort((a, b) => {
                        return a.created - b.created;
                    });
                    res.status(200).send({
                        success: true,
                        data: messages
                    });
                }
            }
        } else {
            res.status(200).send({
                success: true,
                data: []
            });
        }
    } catch (e) {
        console.log('Error in controllers/chatRoutes -> discordGetMessages()' + e)
        res.status(200).send({
            success: false,
            error: 'Error in controllers/chatRoutes -> discordGetMessages():' + e
        });
    }
}

exports.discordGetReplies = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;
        console.log(body);
        const discordMessageRepliesRef = db.collection(collections.discordMessage)
            .doc(body.discordMessageId).collection(collections.discordMessageReplies);
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
                }
                data.id = doc.id;
                messages.push(data);
            }
            messages.sort((a, b) => {
                return a.created - b.created;
            });
            res.status(200).send({
                success: true,
                data: messages
            });
        } else {
            res.status(200).send({
                success: true,
                data: []
            });
        }
    } catch (e) {
        console.log('Error in controllers/chatRoutes -> discordGetReplies()' + e);
        res.status(200).send({
            success: false,
            error: 'Error in controllers/chatRoutes -> discordGetReplies()' + e
        });
    }
}

exports.discordLastView = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        if (body.userId && body.discordChat && body.discordRoom) {
            const discordRoomRef = db.collection(collections.discordChat)
                .doc(body.discordChat).collection(collections.discordRoom)
                .doc(body.discordRoom);
            const discordRoomGet = await discordRoomRef.get();
            const discordRoom: any = discordRoomGet.data();
            if (discordRoom) {
                let users = [...discordRoom.users];
                let userIndex = users.findIndex((usr, i) => usr.userId === body.userId);
                users[userIndex].lastView = body.lastView;
                await discordRoomRef.update({
                    users: users
                })
            }
            const messageQuery = await db.collection(collections.discordMessage)
                .where("room", "==", body.room).get();
            if (!messageQuery.empty) {
                for (const doc of messageQuery.docs) {
                    let data = doc.data();
                    if (!data.seen.includes(body.userId)) {
                        let usersSeen = [...data.seen];
                        usersSeen.push(body.userId);
                        await db.collection(collections.discordMessage).doc(doc.id).update({
                            seen: usersSeen
                        });
                    }
                }
            }
            res.status(200).send({ success: true });
        } else {
            res.status(200).send({
                success: false,
                error: 'Error in controllers/chatRoutes -> discordLastView(): Non UserId or Room Provided'
            });
        }

    } catch (e) {
        return ('Error in controllers/chatRoutes -> lastView()' + e)
    }
};

exports.discordModifyAccess = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const discordRoomRef = db.collection(collections.discordChat)
            .doc(body.discordChatId).collection(collections.discordRoom)
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
                lastView: Date.now()
            });
        } else {
            users[findUserIndex] = {
                type: body.type,
                userId: users[findUserIndex].userId,
                userName: users[findUserIndex].userName,
                userConnected: users[findUserIndex].userConnected,
                lastView: users[findUserIndex].lastView
            }
        }

        await discordRoomRef.update({
            users: users
        });

        discordRoom.users = users;
        discordRoom.id = discordRoomGet.id;

        res.send({
            success: true,
            data: discordRoom
        });
    } catch (e) {
        console.log('Error in controllers/chatRoutes -> discordModifyAccess() ' + e)
        res.send({
            success: false,
            error: e
        });
    }
}

exports.discordRemoveAccess = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const checkIsAdmin: boolean = await checkIfUserIsAdmin(body.discordChatId, body.adminId);

        if (checkIsAdmin) {
            const discordRoomRef = db.collection(collections.discordChat)
                .doc(body.discordChatId).collection(collections.discordRoom)
                .doc(body.discordRoomId);
            const discordRoomGet = await discordRoomRef.get();
            const discordRoom: any = discordRoomGet.data();

            let users: any[] = [...discordRoom.users];

            let findUserIndex = users.findIndex((user, i) => body.userId === user.userId);

            if (findUserIndex === -1) {
                res.send({
                    success: false,
                    data: 'User not found'
                });
            } else {
                users.splice(findUserIndex, 1);
                await discordRoomRef.update({
                    users: users
                });

                discordRoom.users = users;

                res.send({
                    success: true,
                    data: discordRoom
                });
            }
        } else {
            res.send({
                success: false,
                error: 'Non permissions'
            });
        }
    } catch (e) {
        console.log('Error in controllers/chatRoutes -> discordRemoveAccess() ' + e)
        res.send({
            success: false,
            error: e
        });
    }
}

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
                        userName: data.firstName
                    })
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
                        lastView: Date.now()
                    })
                }
            } else if (body.type === 'Credit-Pool') {
                const creditPoolBorrowersSnap = await db.collection(collections.community).doc(body.id)
                    .collection(collections.priviCreditsBorrowing).get();
                const creditPoolLendersSnap = await db.collection(collections.community).doc(body.id)
                    .collection(collections.priviCreditsLending).get();

                if (!creditPoolBorrowersSnap.empty) {
                    for (const doc of creditPoolBorrowersSnap.docs) {
                        const userRef = db.collection(collections.user).doc(doc.id);
                        const userGet = await userRef.get();
                        const user: any = userGet.data();

                        users.push({
                            type: 'Members',
                            userId: doc.id,
                            userName: user.firstName
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
                                userName: user.firstName
                            });
                        }
                    }
                }
            } else {
                res.send({
                    success: false,
                    error: 'No type provided'
                });
            }

            res.send({
                success: true,
                data: users
            });
        } else {
            res.send({
                success: false,
                error: 'Non permissions'
            });
        }
    } catch (e) {
        console.log('Error in controllers/chatRoutes -> discordGetPossibleUsers() ' + e)
        res.send({
            success: false,
            error: e
        });
    }
};

exports.discordLikeMessage = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const discordMessageRef = db.collection(collections.discordMessage)
            .doc(body.discordMessageId);
        const discordMessageGet = await discordMessageRef.get();
        const discordMessage: any = discordMessageGet.data();

        let likes = [...discordMessage.likes];
        let dislikes = [...discordMessage.dislikes];
        let numLikes = discordMessage.numLikes + 1;
        let numDislikes = discordMessage.numDislikes;
        likes.push(body.userId);

        let dislikeIndex = dislikes.findIndex(user => user === body.userId);

        if (dislikeIndex !== -1) {
            dislikes.splice(dislikeIndex, 1);
            numDislikes = numDislikes - 1;
        }

        await discordMessageRef.update({
            likes: likes,
            dislikes: dislikes,
            numLikes: numLikes,
            numDislikes: numDislikes
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

        res.send({
            success: true,
            data: message
        });
    } catch (e) {
        console.log('Error in controllers/chatRoutes -> discordLikeMessage() ' + e)
        res.send({
            success: false,
            error: e
        });
    }
}

exports.discordDislikeMessage = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const discordMessageRef = db.collection(collections.discordMessage)
            .doc(body.discordMessageId);
        const discordMessageGet = await discordMessageRef.get();
        const discordMessage: any = discordMessageGet.data();

        let dislikes = [...discordMessage.dislikes];
        let likes = [...discordMessage.likes];
        let numLikes = discordMessage.numLikes;
        let numDislikes = discordMessage.numDislikes + 1;
        dislikes.push(body.userId);

        let likeIndex = likes.findIndex(user => user === body.userId);
        if (likeIndex !== -1) {
            likes.splice(likeIndex, 1);
            numLikes = numLikes - 1;
        }

        await discordMessageRef.update({
            likes: likes,
            dislikes: dislikes,
            numLikes: numLikes,
            numDislikes: numDislikes
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

        res.send({
            success: true,
            data: message
        });
    } catch (e) {
        console.log('Error in controllers/chatRoutes -> discordDislikeMessage() ' + e)
        res.send({
            success: false,
            error: e
        });
    }
}
exports.discordReplyLikeMessage = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const discordMessageReplyRef = db.collection(collections.discordMessage)
            .doc(body.discordMessageId).collection(collections.discordMessageReplies)
            .doc(body.discordMessageReplyId);
        const discordMessageReplyGet = await discordMessageReplyRef.get();
        const discordMessageReply: any = discordMessageReplyGet.data();

        let likes = [...discordMessageReply.likes];
        let dislikes = [...discordMessageReply.dislikes];
        let numLikes = discordMessageReply.numLikes + 1;
        let numDislikes = discordMessageReply.numDislikes;
        likes.push(body.userId);

        let dislikeIndex = dislikes.findIndex(user => user === body.userId);

        if (dislikeIndex !== -1) {
            dislikes.splice(dislikeIndex, 1);
            numDislikes = numDislikes - 1;
        }

        await discordMessageReplyRef.update({
            likes: likes,
            dislikes: dislikes,
            numLikes: numLikes,
            numDislikes: numDislikes
        });

        let message = { ...discordMessageReply };
        message.id = discordMessageReplyGet.id;
        message.likes = likes;
        message.dislikes = dislikes;
        message.numLikes = numLikes;
        message.numDislikes = numDislikes;

        await userController.updateUserCred(discordMessageReply.from, true);

        res.send({
            success: true,
            data: message
        });
    } catch (e) {
        console.log('Error in controllers/chatRoutes -> discordReplyLikeMessage() ' + e)
        res.send({
            success: false,
            error: e
        });
    }
}

exports.discordReplyDislikeMessage = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const discordMessageReplyRef = db.collection(collections.discordMessage)
            .doc(body.discordMessageId).collection(collections.discordMessageReplies)
            .doc(body.discordMessageReplyId);
        const discordMessageReplyGet = await discordMessageReplyRef.get();
        const discordMessageReply: any = discordMessageReplyGet.data();

        let dislikes = [...discordMessageReply.dislikes];
        let likes = [...discordMessageReply.likes];
        let numLikes = discordMessageReply.numLikes;
        let numDislikes = discordMessageReply.numDislikes + 1;
        dislikes.push(body.userId);

        let likeIndex = likes.findIndex(user => user === body.userId);

        if (likeIndex !== -1) {
            likes.splice(likeIndex, 1);
            numLikes = numLikes - 1;
        }

        await discordMessageReplyRef.update({
            likes: likes,
            dislikes: dislikes,
            numLikes: numLikes,
            numDislikes: numDislikes
        });

        let message = { ...discordMessageReply };
        message.id = discordMessageReplyGet.id;
        message.likes = likes;
        message.dislikes = dislikes;
        message.numLikes = numLikes;
        message.numDislikes = numDislikes;

        await userController.updateUserCred(discordMessageReply.from, false);

        res.send({
            success: true,
            data: message
        });
    } catch (e) {
        console.log('Error in controllers/chatRoutes -> discordReplyDislikeMessage() ' + e)
        res.send({
            success: false,
            error: e
        });
    }
}