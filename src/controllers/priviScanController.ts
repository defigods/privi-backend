import express from 'express';
const firebase = require("../firebase/firebase");
const db = firebase.getDb();
const collections = require("../firebase/collections");
const coinBalance = require("../blockchain/coinBalance");

const getTransactions = async (req: express.Request, res: express.Response) => {
    const snapshot = await db.collection('AllTransaction').get();
    let arrayTx : any[] = [];
    snapshot.docs.map((doc, i) => {
        arrayTx.push(doc.data());
        if(snapshot.docs.length === i + 1) {
            res.send(arrayTx);
        }
    });
};

module.exports = {
    getTransactions
};
