import express from 'express';
import { db } from '../firebase/firebase';
import { ethMedia } from '../firebase/collections';

const getEthMedia = async (req: express.Request, res: express.Response) => {
  try {
    const docsSnap = (await db.collection(ethMedia).get()).docs;
    const data = docsSnap.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    return res.status(200).send({ success: true, data });
  } catch (e) {
    return res.status(500).send({ success: false, message: 'Unable to retrieve Eth media' });
  }
}

const getEthMediaItem = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    const docRef = db.collection(ethMedia).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).send({ success: false, message: 'Invalid document id' });

    const data = { id: doc.id, ...doc.data() };

    return res.status(200).send({ success: true, data });
  } catch (e) {
    return res.status(500).send({ success: false, message: 'Unable to retrieve Eth media item' });
  }
}

export {
  getEthMedia,
  getEthMediaItem
}