import {db} from "../firebase/firebase";
import collections from '../firebase/collections';
import { io, sockets } from "./serverController";

interface Notification {
    id: number,
    type: number,
    typeItemId: string,
    itemId: string,
    follower: string,
    pod: string,
    comment: string,
    token: string,
    amount: number,
    onlyInformation: boolean,
    date: number
}

const addNotification = async (object: any) => {
    console.log(object);
    try {
        const userRef = db.collection(collections.user)
            .doc(object.userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        let notification : Notification = {
            id: user.notifications.length + 1,
            type: object.notification.type,
            typeItemId: object.notification.typeItemId,
            itemId: object.notification.itemId,
            follower: object.notification.follower,
            pod: object.notification.pod,
            comment: object.notification.comment,
            token: object.notification.token,
            amount: object.notification.amount,
            onlyInformation: object.notification.onlyInformation,
            date: Date.now()
        }

        if(user.socketId) {
            sendNotificationSocket(object.userId, user.socketId, notification)
        }

        if(user.notifications && user.notifications.length > 0) {
            user.notifications.push(notification);
            await userRef.update({
                notifications: user.notifications
            });
        } else {
            await userRef.update({
                notifications: [notification]
            });
        }
    } catch (e) {
        return('Error adding notification: ' + e)
    }
}

const removeNotification = async (object: any) => {
    try {
        const userRef = db.collection(collections.user)
            .doc(object.id);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        let notificationIndex = user.notifications.findIndex(item => item.id === object.notification.id)
        user.notifications.splice(notificationIndex, 1)

        await userRef.update({
            notifications: user.notifications
        });
    } catch (e) {
        return('Error adding notification: ' + e)
    }
}

const sendNotificationSocket = (userId, socketId, notification) => {
    if (sockets[userId]) {
        sockets[userId].emit('sendNotification', notification);
    }
}

module.exports = {
    addNotification,
    removeNotification
}