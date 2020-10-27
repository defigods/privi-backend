import express from 'express';
import { db } from "../firebase/firebase";

const getTransactions = async (req: express.Request, res: express.Response) => {
    const snapshot = await db.collection('AllTransaction').get();
    let arrayTx: any[] = [];
    snapshot.docs.map((doc, i) => {
        arrayTx.push(doc.data());
        if (snapshot.docs.length === i + 1) {
            res.send(arrayTx);
        }
    });
};

module.exports = {
    getTransactions
};
