import { db } from "../firebase/firebase";
import collections from "../firebase/collections";

const createNotificaction = async (userId, title, text, type) => {
    if (userId && title && text && type) {
        const dbNotificationRef = db.collection(collections.user).doc(userId).collection(collections.notificaction);
        await dbNotificationRef.add({
            title: title,
            text: text,
            type: type,
            createdAt: Date.now(),
        });
        return true;
    } else {
        return false;
    }
}

export default createNotificaction;