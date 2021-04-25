import { db, firebase } from './firebase';
import collections from './collections';

export const addWalletAddresses = async () => {
  try {
    const userCollection = await db.collection(collections.user).get();
    userCollection.docs.forEach(async userDoc => {
      const user: any = userDoc.data();
      if (userDoc.ref.id === 'Pxc4c0f0a0-d3d1-4b34-89b1-01616c0c26d6') { // FIXEDME: filter for test
        if (user.wallets && !user.walletAddresses) {
          const walletAddresses = user.wallets.map((wallet: any) => wallet.address);
          await userDoc.ref.update({
            walletAddresses
          });
        }
      }
    });
    return true;
  } catch (error) {
    throw error;
  }
}