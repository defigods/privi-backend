import express from 'express';
import { db } from '../firebase/firebase';
import collections, { tokens } from '../firebase/collections';
import fractionaliseMedia from '../blockchain/fractionaliseMedia';
import { updateFirebase } from '../functions/functions';

const notificationsController = require('./notificationsController');
const apiKey = 'PRIVI'; //process.env.API_KEY;

export const fractionalise = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const tokenSymbol = body.TokenSymbol;
        const ownerAddress = body.OwnerAddress;
        const fraction = body.Fraction;
        const buyBackPrice = body.BuyBackPrice;
        const initialPrice = body.InitialPrice;
        const fundingToken = body.FundingToken;
        const interestRate = body.InterestRate;

        const hash = body.Hash;
        const signature = body.Signature;

        const blockchainRes = await fractionaliseMedia.fractionalise(tokenSymbol, ownerAddress, fraction, buyBackPrice,
            initialPrice, fundingToken, interestRate, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ sucess: true });
        }
        else {
            console.log('Error in controllers/fractionalisedMedia -> fractionalise()', blockchainRes.message);
            res.send({
                success: false,
                error: blockchainRes.message
            })
        }
    } catch (err) {
        console.log('Error in controllers/fractionalisedMedia -> fractionalise()', err);
        res.send({ success: false });
    }
};

export const newBuyOrder = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const orderId = body.OrderId;
        const amount = body.Amount;
        const price = body.Price;
        const token = body.Token;
        const tokenSymbol = body.TokenSymbol;
        const bAddress = body.BAddress;

        const hash = body.Hash;
        const signature = body.Signature;

        const blockchainRes = await fractionaliseMedia.newBuyOrder(orderId, amount, price, token, tokenSymbol, bAddress, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ sucess: true });
        }
        else {
            console.log('Error in controllers/fractionalisedMedia -> newBuyOrder()', blockchainRes.message);
            res.send({
                success: false,
                error: blockchainRes.message
            })
        }
    } catch (err) {
        console.log('Error in controllers/fractionalisedMedia -> newBuyOrder()', err);
        res.send({ success: false });
    }
};

export const newSellOrder = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const orderId = body.OrderId;
        const amount = body.Amount;
        const price = body.Price;
        const token = body.Token;
        const tokenSymbol = body.TokenSymbol;
        const sAddress = body.SAddress;

        const hash = body.Hash;
        const signature = body.Signature;

        const blockchainRes = await fractionaliseMedia.newSellOrder(orderId, amount, price, token, tokenSymbol, sAddress, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ sucess: true });
        }
        else {
            console.log('Error in controllers/fractionalisedMedia -> newSellOrder()', blockchainRes.message);
            res.send({
                success: false,
                error: blockchainRes.message
            })
        }
    } catch (err) {
        console.log('Error in controllers/fractionalisedMedia -> newSellOrder()', err);
        res.send({ success: false });
    }
};

export const deleteBuyOrder = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const orderId = body.OrderId;
        const requesterAddress = body.RequesterAddress;
        const tokenSymbol = body.TokenSymbol;

        const hash = body.Hash;
        const signature = body.Signature;

        const blockchainRes = await fractionaliseMedia.deleteBuyOrder(orderId, requesterAddress, tokenSymbol, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ sucess: true });
        }
        else {
            console.log('Error in controllers/fractionalisedMedia -> deleteBuyOrder()', blockchainRes.message);
            res.send({
                success: false,
                error: blockchainRes.message
            })
        }
    } catch (err) {
        console.log('Error in controllers/fractionalisedMedia -> deleteBuyOrder()', err);
        res.send({ success: false });
    }
};

export const deleteSellOrder = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const orderId = body.OrderId;
        const requesterAddress = body.RequesterAddress;
        const tokenSymbol = body.TokenSymbol;

        const hash = body.Hash;
        const signature = body.Signature;

        const blockchainRes = await fractionaliseMedia.deleteSellOrder(orderId, requesterAddress, tokenSymbol, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ sucess: true });
        }
        else {
            console.log('Error in controllers/fractionalisedMedia -> deleteSellOrder()', blockchainRes.message);
            res.send({
                success: false,
                error: blockchainRes.message
            })
        }
    } catch (err) {
        console.log('Error in controllers/fractionalisedMedia -> deleteSellOrder()', err);
        res.send({ success: false });
    }
};

export const buyFraction = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const tokenSymbol = body.TokenSymbol;
        const sAddress = body.SAddress;
        const orderId = body.OrderId;
        const amount = body.Amount;
        const buyerAddress = body.BuyerAddress;

        const hash = body.Hash;
        const signature = body.Signature;

        const blockchainRes = await fractionaliseMedia.buyFraction(tokenSymbol, sAddress, orderId, amount, buyerAddress, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ sucess: true });
        }
        else {
            console.log('Error in controllers/fractionalisedMedia -> buyFraction()', blockchainRes.message);
            res.send({
                success: false,
                error: blockchainRes.message
            })
        }
    } catch (err) {
        console.log('Error in controllers/fractionalisedMedia -> buyFraction()', err);
        res.send({ success: false });
    }
};

export const sellFraction = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const tokenSymbol = body.TokenSymbol;
        const bAddress = body.BAddress;
        const orderId = body.OrderId;
        const amount = body.Amount;
        const sellerAddress = body.SellerAddress;

        const hash = body.Hash;
        const signature = body.Signature;

        const blockchainRes = await fractionaliseMedia.sellFraction(tokenSymbol, bAddress, orderId, amount, sellerAddress, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ sucess: true });
        }
        else {
            console.log('Error in controllers/fractionalisedMedia -> sellFraction()', blockchainRes.message);
            res.send({
                success: false,
                error: blockchainRes.message
            })
        }
    } catch (err) {
        console.log('Error in controllers/fractionalisedMedia -> sellFraction()', err);
        res.send({ success: false });
    }
};