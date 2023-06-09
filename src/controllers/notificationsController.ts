import { db } from '../firebase/firebase';
import collections from '../firebase/collections';
import { io, sockets } from './serverController';
import { filterTrending, getRateOfChangeAsMap } from '../functions/functions';
//import { uploadToFirestoreBucket } from '../functions/firestore'
import cron from 'node-cron';

interface Notification {
  id: number;
  type: number;
  typeItemId: string;
  itemId: string;
  follower: string;
  pod: string;
  comment: string;
  token: string;
  amount: number;
  onlyInformation: boolean;
  otherItemId: string;
  date: number;
}

const addNotification = async (object: any) => {
  console.log(object);
  try {
    const userRef = db.collection(collections.user).doc(object.userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    let notification: Notification = {
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
      otherItemId: object.notification.otherItemId,
      date: Date.now(),
    };

    sendNotificationSocket(object.userId, notification);

    if (user.notifications && user.notifications.length > 0) {
      user.notifications.push(notification);
      await userRef.update({
        notifications: user.notifications,
      });
    } else {
      await userRef.update({
        notifications: [notification],
      });
    }
  } catch (e) {
    return 'Error adding notification: ' + e;
  }
};

const removeNotification = async (object: any) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = db.collection(collections.user).doc(object.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      let notifications: any[] = [...user.notifications];
      let notificationIndex = user.notifications.findIndex((item) => item.id === object.notificationId);

      console.log('Remove notification - ID: ' + object.notificationId + ' , INDEX: ' + notificationIndex);

      notifications.splice(notificationIndex, 1);

      await userRef.update({
        notifications: notifications,
      });
      resolve(true);
    } catch (e) {
      console.log('Error removing notification: ' + e);
      resolve('Error removing notification: ' + e);
    }
  });
};

const sendNotificationSocket = (userId, notification) => {
  if (sockets[userId] && sockets[userId].length > 0) {
    sockets[userId].forEach((socket) => {
      socket.emit('sendNotification', notification);
    });
  }
};

const removeOldNotifications = cron.schedule('0 0 * * *', async () => {
  try {
    const userSnap = await db.collection(collections.user).get();
    const docs = userSnap.docs;
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const data: any = doc.data();
      const id: any = doc.id;

      let notifications = data.notifications;
      if (notifications && notifications.length > 0) {
        for (let [i, notification] of notifications.entries()) {
          let date = new Date();
          let pastDate = date.getDate() - 7;
          date.setDate(pastDate);

          if (date.getTime() > notification.date) {
            notifications.splice(i, 1);
          }
          if (notifications.length === i + 1) {
            data.notifications = notifications;
            await db.collection(collections.user).doc(id).update(data);
          }
        }
      }
    }
  } catch (err) {
    console.log('Error in controllers/communityController -> removeOldNotifications()', err);
  }
});

module.exports = {
  addNotification,
  removeNotification,
  removeOldNotifications,
};
