import express from 'express';
import tradinionalLending from "../blockchain/traditionalLending";
import coinBalance from "../blockchain/coinBalance";
import { updateFirebase, getRateOfChange, getLendingInterest, getStakingInterest, createNotificaction } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import cron from 'node-cron';
import { restart } from 'pm2';

exports.borrowFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const collaterals = body.collaterals;
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await tradinionalLending.borrowFunds(publicId, token, amount, collaterals, rateOfChange);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "Loans 1.0 - Funds Borrowed",
                ` `,
                notificationTypes.priviCreditCreated
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> borrowFunds(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> borrowFunds(): ', err);
        res.send({ success: false });
    }
};

exports.depositCollateral = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const token = body.token;
        const collaterals = body.collaterals;
        const blockchainRes = await tradinionalLending.depositCollateral(publicId, token, collaterals)
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "Loans 1.0 - Deposit Collateral",
                ` `,
                notificationTypes.traditionalDepositCollateral
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> depositCollateral(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> depositCollateral(): ', err);
        res.send({ success: false });
    }
};

exports.withdrawCollateral = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const token = body.token;
        const collaterals = body.collaterals;
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await tradinionalLending.withdrawCollateral(publicId, token, collaterals, rateOfChange)
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "Loans 1.0 - Withdraw Collateral",
                ` `,
                notificationTypes.traditionalWithdrawCollateral
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> withdrawCollateral(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> withdrawCollateral(): ', err);
        res.send({ success: false });
    }
};

exports.repayFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const blockchainRes = await tradinionalLending.repayFunds(publicId, token, amount)
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "Loans 1.0 - Funds Repaid",
                ` `,
                notificationTypes.traditionalRepay
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> repayFunds(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> repayFunds(): ', err);
        res.send({ success: false });
    }
};

// get the staked reserve pool of each token from blockchain, adding the annualRate and dailyRate info stored in manualConstants
exports.getTokenReserves = async (req: express.Request, res: express.Response) => {
    try {
        const blockchainRes = await tradinionalLending.getReserves();
        if (blockchainRes && blockchainRes.success) {
            const retData = {};
            const reserves = blockchainRes.output; // object {token: reserves}
            delete reserves.PDT // PDT already deleted from system, don't need it
            const constants = await db.collection(collections.constants).doc(collections.reserveConstants).get();
            const data = constants.data();
            if (data) {
                let token = "";
                let reserve: any = null;
                for ([token, reserve] of Object.entries(reserves)) {
                    let annualRate = data.annualRates[token];   // annual rate stored in manualConstants
                    let dailyRate = annualRate / 365;   // daily rate
                    retData[token] = {
                        annaulRate: annualRate,
                        dailyRate: dailyRate,
                        reserve: reserve
                    }
                }
                res.send({ success: true, data: retData });
            }
            else {
                console.log('Error in controllers/lendingController -> getTokenReserves(): error getting reserveConstants data in firestore');
                res.send({ success: false });
            }
        }
        else {
            console.log('Error in controllers/lendingController -> getTokenReserves(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> getTokenReserves(): ', err);
        res.send({ success: false });
    }
};

// helper function: calculate if deposited collateral is below required ccr level
function isCollateralBellowLiquidation(amount: number, token: string, requiredLevel: number, collaterals: { [key: string]: number }, ratesOfChange: { [key: string]: number }) {
    if (!requiredLevel || !collaterals || !ratesOfChange) return false;
    let sum: number = 0; // collateral sum in USD
    amount = amount * ratesOfChange[token];   // amount in USD
    for (const [token, colValue] of Object.entries(collaterals)) {
        let conversionRate = ratesOfChange[token];
        if (!conversionRate) conversionRate = 1;
        sum += colValue * conversionRate;
    }
    return (sum / amount < requiredLevel);
}

// helper function: get object of tokens whice values are list of uids of users that have loan with ccr lower than required level
async function getTokenUserList() {
    const res: { [key: string]: string[] } = {};
    const rateOfChange = await getRateOfChange();
    const constantsSnap = await db.collection(collections.constants).doc(collections.traditionalLendingConstants).get();
    const constantsData = constantsSnap.data();
    if (constantsData) {
        const minLiquidation: number = constantsData.liquidationCCR;
        const walletSnap = await db.collection(collections.wallet).get();
        walletSnap.forEach(async (tokenDoc) => {
            const token = tokenDoc.id;
            const uidList: string[] = [];
            const tokenUserSnap = await tokenDoc.ref.collection(collections.user).get();
            tokenUserSnap.forEach((userWallet) => {
                const amount: number = userWallet.data().Amount;
                const collaterals: { [key: string]: number } = userWallet.data().Collaterals;
                if (!isCollateralBellowLiquidation(amount, token, minLiquidation, collaterals, rateOfChange)) {
                    uidList.push(userWallet.id);
                }
            });
            res[token] = uidList;
        });
    }
    return res;
}

// scheduled every 5 min
exports.checkLiquidation = cron.schedule('*/5 * * * *', async () => {
    try {
        console.log("********* Traditional lending checkLiquidation() cron job started *********");
        const rateOfChange = await getRateOfChange();
        const candidates = await getTokenUserList();
        for (const [token, uidList] of Object.entries(candidates)) {
            uidList.forEach(async (uid) => {
                const blockchainRes = await tradinionalLending.checkLiquidation(uid, token, rateOfChange);
                if (blockchainRes && blockchainRes.success && blockchainRes.output.Liquidated == "YES") {
                    updateFirebase(blockchainRes);
                    createNotificaction(uid, "Loans 1.0 - Loan Liquidated",
                        ` `,
                        notificationTypes.traditionalLiquidation
                    );
                } else {
                    console.log('Error in controllers/lendingController -> checkLiquidation().', uid, token, blockchainRes.message);
                }
            });
        }
        console.log("--------- Traditional lending checkLiquidation() finished ---------");
    } catch (err) {
        console.log('Error in controllers/lendingController -> checkLiquidation()', err);
    }
});

// scheduled every day 00:00
exports.payInterest = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("********* Traditional lending payInterest() cron job started *********");
        // get interest rates
        const lendingInterest = await getLendingInterest();
        const stakingInterest = await getStakingInterest();
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await tradinionalLending.payInterests(lendingInterest, stakingInterest, rateOfChange);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            const updateWallets = blockchainRes.output.UpdateWallets;
            let uid: string = "";
            let walletObj: any = null;
            for ([uid, walletObj] of Object.entries(updateWallets)) {
                if (walletObj["Transaction"].length > 0) {
                    createNotificaction(uid, "Loans 1.0 - Interest Payment",
                        ` `,
                        notificationTypes.traditionalInterest
                    );
                }
            }
            console.log("--------- Traditional lending payInterest() finished ---------");
        }
        else {
            console.log('Error in controllers/lendingController -> payInterest(): success = false');
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> payInterest()', err);
    }
});
