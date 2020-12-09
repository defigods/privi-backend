import express, { response } from 'express';
import insurance from "../blockchain/insurance";
import { updateFirebase, getRateOfChange, createNotification, getUidNameMap, getEmailUidMap, generateUniqueId } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections, { insurancePools } from "../firebase/collections";
import { db } from "../firebase/firebase";
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

require('dotenv').config();
//const apiKey = process.env.API_KEY;
const apiKey = "PRIVI"; // just for now


/////////////////////////// COMMON //////////////////////////////



/////////////////////////// FT //////////////////////////////
exports.initiateInsurancePool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const guarantorAddress = body.guarantorAddress;
        const podAddress = body.podAddress;
        const insuranceAddress = body.insuranceAddress;
        const frequency = body.frequency;
        const feeInscription = body.feeInscription;
        const feeMembership = body.feeMembership;
        const minCoverage = body.minCoverage;
        const initialDeposit = body.initialDeposit;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await insurance.initiateInsurancePool(guarantorAddress, podAddress, insuranceAddress, frequency, feeInscription, feeMembership, minCoverage, initialDeposit, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/insuranceController -> initiateInsurancePool(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> initiateInsurancePool(): ', err);
        res.send({ success: false });
    }
};

exports.investInsurancePool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const investorAddress = body.investorAddress;
        const insuranceAddress = body.insuranceAddress;
        const amount = body.amount;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await insurance.investInsurancePool(investorAddress, insuranceAddress, amount, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/insuranceController -> investInsurancePool(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> investInsurancePool(): ', err);
        res.send({ success: false });
    }
};

exports.subscribeInsurancePool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const clientAddress = body.clientAddress;
        const insuranceAddress = body.insuranceAddress;
        const amount = body.amount;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await insurance.subscribeInsurancePool(clientAddress, insuranceAddress, amount, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/insuranceController -> subscribeInsurancePool(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> subscribeInsurancePool(): ', err);
        res.send({ success: false });
    }
};

exports.unsubscribeInsurancePool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const clientAddress = body.clientAddress;
        const insuranceAddress = body.insuranceAddress;
        const amount = body.amount;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await insurance.unsubscribeInsurancePool(clientAddress, insuranceAddress, amount, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/insuranceController -> unsubscribeInsurancePool(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> unsubscribeInsurancePool(): ', err);
        res.send({ success: false });
    }
};


/**
 * returns all pools, highlighting the trending ones (top 10 with most followers) 
 */
exports.getAllInsurancePools = async (req: express.Request, res: express.Response) => {
    try {
        const allInsurancePools: any[] = [];
        const insurancesSnap = await db.collection(collections.insurancePools).get();
        insurancesSnap.forEach((doc) => {
            allInsurancePools.push(doc.data());
        });

        const trendingInsurances = filterTrending(allInsurancePools);

        res.send({ success: true, data: { allInsurances: allInsurancePools, trendingInsurances: trendingInsurances } })
    } catch (err) {
        console.log('Error in controllers/lendingController -> unsubscribeInsurancePool(): ', err);
        res.send({ success: false });
    }
};

// filtering the top 10 insurnaces with most followers
const filterTrending = (allInsurnaces) => {
    let lastWeek = new Date();
    let pastDate = lastWeek.getDate() - 7;
    lastWeek.setDate(pastDate);

    allInsurnaces.forEach((item, i) => {
        if (item.Followers && item.Followers.length > 0) {
            let lastWeekFollowers = item.Followers.filter(follower => follower.date._seconds > lastWeek.getTime() / 1000);
            item.lastWeekFollowers = lastWeekFollowers.length;
        } else {
            item.lastWeekFollowers = 0;
        }
        if (allInsurnaces.length === i + 1) {
            let sortedArray = allInsurnaces.sort((a, b) => (a.lastWeekFollowers > b.lastWeekFollowers) ? 1 : ((b.lastWeekFollowers > a.lastWeekFollowers) ? -1 : 0));
            let trendingArray = sortedArray.slice(0, 10);
            return trendingArray;
        }
    })
};

/////////////////////////// NFT //////////////////////////////