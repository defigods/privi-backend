import express from 'express';
import tradinionalLending from "../blockchain/traditionalLending";
import coinBalance from "../blockchain/coinBalance";
import { updateFirebase, getRateOfChange, getLendingInterest, getStakingInterest, createNotificaction } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import cron from 'node-cron';
import { restart } from 'pm2';

module.exports.getUserLoans = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const userId = body.publicId;

        // Get Loan CCR Levels //
        const levels = await db.collection(collections.constants).doc(collections.traditionalLendingConstants).get();
        const CCR_levels = levels.data();

        // Get Interest Rates //
        const constants = await db.collection(collections.constants).doc(collections.reserveConstants).get();
        const interest_rate = constants.data();

        const retData: {}[] = [];
        const rateOfChange = await getRateOfChange();
        for (const [token, _] of Object.entries(rateOfChange)) {
            const walletTokenSnap = await db.collection(collections.wallet).doc(token).collection(collections.user).doc(userId).get();
            const data = walletTokenSnap.data();
            if (!data) { continue; }
            if (data.Borrowing_Amount == 0) { continue; }

            // It has a loan // 
            const CCR = computeCCR(data.Borrowing_Amount, token, data.Collaterals, rateOfChange);
            let state = "Overcollateralised"
            if (CCR_levels) {
                if (CCR < CCR_levels.requiredCCR) {
                    state = "Undercollateralised"
                }
                if (CCR < CCR_levels.withdrawalCCR) {
                    state = "Collateralised"
                }
            }

            let rate = 0.
            if (interest_rate) {
                rate = interest_rate.annualRates[token]
            }
            retData.push({
                principal_token: token, principal: data.Borrowing_Amount,
                collaterals: data.Collaterals, CCR: CCR, state: state,
                daily_interest: rate
            });
        }
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/walletController -> getUserLoans()', err);
        res.send({ success: false });
    }
}

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
            const retData: any = {};
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
                delete retData.MRK; // this line to be deleted when bug fixed.
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

// an user stakes in a token the given amount
exports.stakeToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const blockchainRes = await tradinionalLending.stakeToken(publicId, token, amount)
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // update staking deposit: check if field already exists, if not intialize to the given amount else sum this value
            let newTokenDepositVal = Number(amount);
            const docSnap = await db.collection(collections.stakingDeposit).doc(publicId).get();
            const data = docSnap.data();
            if (data) { // update if already has some staking
                if (data.deposited[token]) newTokenDepositVal += data.deposited[token];
            }
            const dotNotation = "deposited." + token; // firebase "dot notation" to not override whole map
            db.collection(collections.stakingDeposit).doc(publicId).update({ dotNotation: newTokenDepositVal });
            createNotificaction(publicId, "Staking - Token Staked",
                ` `,
                notificationTypes.staking
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> stakeToken(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> stakeToken(): ', err);
        res.send({ success: false });
    }
};

// an user unstakes in a token the given amount
exports.unstakeToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const blockchainRes = await tradinionalLending.unstakeToken(publicId, token, amount)
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // update staking deposit: check if field already exists, if not intialize to the given amount else sum this value
            let newTokenDepositVal = -Number(amount);
            const docSnap = await db.collection(collections.stakingDeposit).doc(publicId).get();
            const data = docSnap.data();
            if (data) { // update if already has some staking
                if (data.deposited[token]) newTokenDepositVal += data.deposited[token];
            }
            const dotNotation = "deposited." + token; // firebase "dot notation" to not override whole map
            db.collection(collections.stakingDeposit).doc(publicId).update({ dotNotation: newTokenDepositVal });
            createNotificaction(publicId, "Staking - Token Unstaked",
                ` `,
                notificationTypes.unstaking
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> unstakeToken(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> unstakeToken(): ', err);
        res.send({ success: false });
    }
};



// get the CCR levels info stored in manualConstants
exports.getCCRlevels = async (req: express.Request, res: express.Response) => {
    try {
        const constants = await db.collection(collections.constants).doc(collections.traditionalLendingConstants).get();
        const data = constants.data();
        if (data) {
            res.send({ success: true, data: data });
        }
        else {
            console.log('Error in controllers/lendingController -> getCCRlevels(): error getting getCCRlevels data in firestore');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> getCCRlevels(): ', err);
        res.send({ success: false });
    }
};

// helper function: calculate the CRR of a loan
function computeCCR(amount: number, token: string, collaterals: { [key: string]: number }, ratesOfChange: { [key: string]: number }) {
    if (!collaterals || !ratesOfChange) return false;
    let sum: number = 0; // collateral sum in USD
    amount = amount * ratesOfChange[token];   // amount in USD
    for (const [token, colValue] of Object.entries(collaterals)) {
        let conversionRate = ratesOfChange[token];
        if (!conversionRate) conversionRate = 1;
        sum += colValue * conversionRate;
    }
    return sum / amount;
}

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
