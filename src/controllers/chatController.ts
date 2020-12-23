import express from "express";
import {db} from "../firebase/firebase";
import collections from '../firebase/collections';
import {generateUniqueId} from "../functions/functions";

exports.getChats =  async (req: express.Request, res: express.Response) => {
    try {
        const allChats: any[] = [];
        const chatSnap = await db.collection(collections.chat).get();
        chatSnap.forEach((doc) => {
            allChats.push(doc.data())
        });
        res.send({
            success: true,
            data: allChats
        });
    } catch (e) {
        return ('Error in controllers/chatRoutes -> getChats()' + e)
    }
};

exports.createChat = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;
        let room;
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
                res.status(200).send(doc);
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
                    lastMessageDate: null
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
    } catch (e) {
        return ('Error in controllers/chatRoutes -> createChat()' + e)
    }
};

exports.getMessagesNotSeen = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const messageQuery = await db.collection(collections.message)
            .where("to", "==", body.userId)
            .where("seen", "==", false).get();
        if(!messageQuery.empty) {
            res.status(200).send({
                success: true,
                data: messageQuery.docs.length
            });
        }
    } catch (e) {
        return ('Error in controllers/chatRoutes -> getMessagesNotSeen()' + e)
    }
};

exports.lastView = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

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
    } catch (e) {
        return ('Error in controllers/chatRoutes -> lastView()' + e)
    }
};

exports.getMessages = async (req: express.Request, res: express.Response) => {
    /*let body = req.body;
    let msgs = await Chat.findOne({ room: body.room }, { messages: 1 });

    let messages = [];

    if(msgs && msgs.messages) {
        for(let i = 0 ; i < msgs.messages.length; i++){
            let message = await Message.findOne({ _id: msgs.messages[i] });
            messages.push(message);
            if(i === msgs.messages.length -1) {
                res.status(200).send({messages: messages});
            }
        }
    } else {
        res.status(200).send({messages: messages});
    }*/
};

exports.getChatRoomById = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

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
        let chats : any[] = [];

        const chatQuery = await db.collection(collections.chat).get();
        if(!chatQuery.empty) {
            for (const doc of chatQuery.docs) {
                chats.push(doc.data());
            }
            res.status(200).send({
                success: true,
                data: chats
            });
        }
    } catch (e) {
        return ('Error in controllers/chatRoutes -> getUsers()' + e)
    }
};