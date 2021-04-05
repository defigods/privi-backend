import express, { response } from 'express';
import insurance from "../blockchain/insurance";
import { updateFirebase, getRateOfChangeAsMap, createNotification, getUidNameMap, getEmailUidMap, generateUniqueId, filterTrending } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections, { insurancePools } from "../firebase/collections";
import { uploadToFirestoreBucket } from '../functions/firestore'
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

        const hash = body.hash;
        const signature = body.signature;
        const blockchainRes = await insurance.initiateInsurancePool(guarantorAddress, podAddress, insuranceAddress, frequency, feeInscription, feeMembership, minCoverage, initialDeposit, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({success: true});
        } else {
            console.log('Error in controllers/insuranceController -> initiateInsurancePool(): success = false');
            res.send({success: false});
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

        const hash = body.hash;
        const signature = body.signature;

        const blockchainRes = await insurance.investInsurancePool(investorAddress, insuranceAddress, amount, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({success: true});
        } else {
            console.log('Error in controllers/insuranceController -> investInsurancePool(): success = false');
            res.send({success: false});
        }
    } catch (err) {
        console.log('Error in controllers/insuranceController -> investInsurancePool(): ', err);
        res.send({success: false});
    }
};

exports.subscribeInsurancePool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const clientAddress = body.clientAddress;
        const insuranceAddress = body.insuranceAddress;
        const amount = body.amount;

        const hash = body.hash;
        const signature = body.signature;

        const blockchainRes = await insurance.subscribeInsurancePool(clientAddress, insuranceAddress, amount, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({success: true});
        } else {
            console.log('Error in controllers/insuranceController -> subscribeInsurancePool(): success = false');
            res.send({success: false});
        }
    } catch (err) {
        console.log('Error in controllers/insuranceController -> subscribeInsurancePool(): ', err);
        res.send({success: false});
    }
};

exports.unsubscribeInsurancePool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const clientAddress = body.clientAddress;
        const insuranceAddress = body.insuranceAddress;
        const amount = body.amount;

        const hash = body.hash;
        const signature = body.signature;
        const blockchainRes = await insurance.unsubscribeInsurancePool(clientAddress, insuranceAddress, amount, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({success: true});
        } else {
            console.log('Error in controllers/insuranceController -> unsubscribeInsurancePool(): success = false');
            res.send({success: false});
        }
    } catch (err) {
        console.log('Error in controllers/insuranceController -> unsubscribeInsurancePool(): ', err);
        res.send({success: false});
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

        res.send({success: true, data: {allInsurances: allInsurancePools, trendingInsurances: trendingInsurances}})
    } catch (err) {
        console.log('Error in controllers/lendingController -> unsubscribeInsurancePool(): ', err);
        res.send({success: false});
    }
};

/////////////////////////// NFT //////////////////////////////
exports.initiateInsurancePoolNFT = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const data = {
            GuarantorAddress: body.guarantorAddress,
            InsuranceAddress: body.insuranceAddress,
            PodAddress: body.podAddress,
            PoolToken: body.poolToken,
            Frequency: body.frequency,
            FeeInscription: body.feeInscription,
            FeeMembership: body.feeMembership,
            MinCoverage: body.minCoverage,
            PrincipalValuation: body.principalValuation,
            DateExpiration: body.dateExpiration,
            InitialDeposit: body.initialDeposit,
            Hash: body.hash,
            Signature: body.signature,
            Caller: apiKey,
        }

        const blockchainRes = await insurance.initiateInsurancePoolNFT(data);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({success: true});
        } else {
            console.log('Error in controllers/insuranceController -> initiateInsurancePoolNFT(): success = false');
            res.send({success: false});
        }
    } catch (e) {
        console.log('Error in controllers/insuranceController -> initiateInsurancePoolNFT(): ', e);
        res.send({success: false});
    }
}

exports.subscribeInsurancePoolNFT = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const data = {
            ClientAddress: body.clientAddress,
            InsuranceAddress: body.insuranceAddress,
            AmountPodTokens: body.amount,
            Hash: body.hash,
            Signature: body.signature,
            Caller: apiKey
        }
        const blockchainRes = await insurance.subscribeInsurancePoolNFT(data);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({success: true});
        } else {
            console.log('Error in controllers/insuranceController -> subscribeInsurancePoolNFT(): success = false');
            res.send({success: false});
        }
    } catch (err) {
        console.log('Error in controllers/insuranceController -> subscribeInsurancePoolNFT(): ', err);
        res.send({success: false});
    }
};

exports.unsubscribeInsurancePoolNFT = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const data = {
            ClientAddress: body.clientAddress,
            InsuranceAddress: body.insuranceAddress,
            Amount: body.amount,
            Hash: body.hash,
            Signature: body.signature,
            Caller: apiKey
        }
        const blockchainRes = await insurance.unsubscribeInsurancePool(data);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({success: true});
        } else {
            console.log('Error in controllers/insuranceController -> unsubscribeInsurancePoolNFT(): success = false');
            res.send({success: false});
        }
    } catch (err) {
        console.log('Error in controllers/insuranceController -> unsubscribeInsurancePoolNFT(): ', err);
        res.send({success: false});
    }
}

exports.investInsurancePoolNFT = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const data = {
            InvestorAddress: body.inverstorAddress,
            InsuranceAddress: body.insuranceAddress,
            AmountPodTokens: body.amount,
            Hash: body.hash,
            Signature: body.signature,
            Caller: apiKey
        }

        const blockchainRes = await insurance.investInsurancePoolNFT(data);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({success: true});
        } else {
            console.log('Error in controllers/insuranceController -> investInsurancePoolNFT(): success = false');
            res.send({success: false});
        }
    } catch (err) {
        console.log('Error in controllers/insuranceController -> investInsurancePoolNFT(): ', err);
        res.send({success: false});
    }
}

exports.withdrawInsurancePoolNFT = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const data = {
            InvestorAddress: body.inverstorAddress,
            InsuranceAddress: body.insuranceAddress,
            Amount: body.amount,
            Hash: body.hash,
            Signature: body.signature,
            Caller: apiKey
        }

        const blockchainRes = await insurance.withdrawInsurancePoolNFT(data);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({success: true});
        } else {
            console.log('Error in controllers/insuranceController -> withdrawInsurancePoolNFT(): success = false');
            res.send({success: false});
        }
    } catch (err) {
        console.log('Error in controllers/insuranceController -> withdrawInsurancePoolNFT(): ', err);
        res.send({success: false});
    }
}