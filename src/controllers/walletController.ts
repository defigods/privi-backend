import {
    updateFirebase, createNotification, getRateOfChangeAsMap, getCurrencyRatesUsdBase, getBuyTokenAmount, getBuyTokenAmountPod, getRateOfChangeAsList, generateUniqueId,
    isEmail, getEmailUidMap, getTokenToTypeMap, getEmailAddressMap
} from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import coinBalance from "../blockchain/coinBalance.js";
import express from 'express';
const currencySymbol = require("currency-symbol");
import { countDecimals } from "../functions/utilities";
import { identifyTypeOfToken } from '../functions/functions';
import cron from 'node-cron';
import { user } from "firebase-functions/lib/providers/auth";

require('dotenv').config();
//const apiKey = process.env.API_KEY;
const apiKey = "PRIVI"; // just for now
const notificationsController = require('./notificationsController');


// ---------------------- CALLED FROM POSTMAN -------------------------------

// Should be called each time the blockchain restarts (or we resert firestore) to register all the crypto tokens to the system
// as well as adding this tokens info (type, supply..etc) to firestore
module.exports.registerTokens = async (req: express.Request, res: express.Response) => {
    try {
        const type = "CRYPTO";
        const addressId = "0x7b559b648bc133d5f471436b4d3ff69f0d5a6640"; // any registered user address works
        const tokens = [
            { "Name": "PRIVI Coin", "Symbol": "PRIVI", "Supply": 0 },
            // { "Name": "Base Coin", "Symbol": "BC", "Supply": 0 },
            // { "Name": "Data Coin", "Symbol": "DC", "Supply": 0 },
            // { "Name": "PRIVI Insurance Token", "Symbol": "PI", "Supply": 0 },
            { "Name": "Balancer", "Symbol": "BAL", "Supply": 0 },
            { "Name": "Basic Attention Token", "Symbol": "BAT", "Supply": 0 },
            { "Name": "Compound", "Symbol": "COMP", "Supply": 0 },
            { "Name": "Dai Stablecoin", "Symbol": "DAI", "Supply": 0 },
            { "Name": "Ethereum", "Symbol": "ETH", "Supply": 0 },
            { "Name": "Chainlink", "Symbol": "LINK", "Supply": 0 },
            { "Name": "MakerDAO", "Symbol": "MKR", "Supply": 0 },
            { "Name": "Uniswap", "Symbol": "UNI", "Supply": 0 },
            { "Name": "Tether", "Symbol": "USDT", "Supply": 0 },
            { "Name": "Wrapped Bitcoin", "Symbol": "WBTC", "Supply": 0 },
            { "Name": "Yearn Finance", "Symbol": "YFI", "Supply": 0 },
            { "Name": "Wrap Ethereum", "Symbol": "WETH", "Supply": 0 },
        ];
        tokens.forEach(async (token) => {
            const blockchainRes = await coinBalance.registerToken(token.Name, type, token.Symbol, token.Supply, addressId, apiKey);
            if (blockchainRes.success) {
                updateFirebase(blockchainRes);
            }
            else {
                console.log("blockchain success = false", blockchainRes);
            }
        });
        res.send({ success: true });
    } catch (err) {
        console.log('Error in controllers/walletController -> registerTokens()', err);
        res.send({ success: false });
    }
}

module.exports.updateTokens = async (req: express.Request, res: express.Response) => {
    try {
        const type = "CRYPTO";
        const tokens = [
            { "Name": "PRIVI Coin", "Symbol": "PRIVI", "Supply": 0 },
            // { "Name": "Base Coin", "Symbol": "BC", "Supply": 0 },
            // { "Name": "Data Coin", "Symbol": "DC", "Supply": 0 },
            // { "Name": "PRIVI Insurance Token", "Symbol": "PI", "Supply": 0 },
            { "Name": "Balancer", "Symbol": "BAL", "Supply": 0 },
            { "Name": "Basic Attention Token", "Symbol": "BAT", "Supply": 0 },
            { "Name": "Compound", "Symbol": "COMP", "Supply": 0 },
            { "Name": "Dai Stablecoin", "Symbol": "DAI", "Supply": 0 },
            { "Name": "Ethereum", "Symbol": "ETH", "Supply": 0 },
            { "Name": "Chainlink", "Symbol": "LINK", "Supply": 0 },
            { "Name": "MakerDAO", "Symbol": "MKR", "Supply": 0 },
            { "Name": "Uniswap", "Symbol": "UNI", "Supply": 0 },
            { "Name": "Tether", "Symbol": "USDT", "Supply": 0 },
            { "Name": "Wrapped Bitcoin", "Symbol": "WBTC", "Supply": 0 },
            { "Name": "Yearn Finance", "Symbol": "YFI", "Supply": 0 },
            { "Name": "Wrap Ethereum", "Symbol": "WETH", "Supply": 0 },
        ];
        tokens.forEach(async (token) => {
            const blockchainRes = await coinBalance.updateTokenInfo(token.Name, type, token.Symbol, apiKey);
            if (blockchainRes.success) {
                updateFirebase(blockchainRes);
            }
            else {
                console.log("blockchain success = false", blockchainRes);
            }
        });
        res.send({ success: true });
    } catch (err) {
        console.log('Error in controllers/walletController -> updateTokens()', err);
        res.send({ success: false });
    }
}
// -----------------------------------------------------------------


module.exports.transfer = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        const userId = body.userId;
        const from = body.From;
        const to = body.To; // could be email or uid
        const amount = body.Amount;
        const token = body.Token;
        const type = body.Type;
        const hash = body.Hash;
        const signature = body.Signature;

        console.log(body)
        // check that fromUid is same as user in jwt
        if (!req.body.priviUser.id || (req.body.priviUser.id != userId)) {
            console.log("error: jwt user is not the same as fromUid ban?");
            res.send({ success: false, message: "jwt user is not the same as fromUid" });
            return;
        }

        const blockchainRes = await coinBalance.transfer(from, to, amount, token, type, hash, signature, apiKey);
        console.log(blockchainRes)

        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // let senderName = fromUid;
            // let receiverName = toUid;
            // const senderSnap = await db.collection(collections.user).doc(userId).get();
            // const receiverSnap = await db.collection(collections.user).doc(toUid).get();
            // const senderData = senderSnap.data();
            // const receriverData = receiverSnap.data();
            // if (senderData !== undefined && receriverData !== undefined) {
            //     senderName = senderData.firstName;
            //     receiverName = receriverData.firstName;
            //     notification to sender
            //     await notificationsController.addNotification({
            //         userId: senderSnap.id,
            //         notification: {
            //             type: 8,
            //             typeItemId: 'user',
            //             itemId: receiverSnap.id,
            //             follower: receiverName,
            //             pod: '',
            //             comment: '',
            //             token: token,
            //             amount: amount,
            //             onlyInformation: false,
            //         }
            //     });

            //     await notificationsController.addNotification({
            //         userId: receiverSnap.id,
            //         notification: {
            //             type: 7,
            //             typeItemId: 'user',
            //             itemId: senderSnap.id,
            //             follower: senderName,
            //             pod: '',
            //             comment: '',
            //             token: token,
            //             amount: amount,
            //             onlyInformation: false,
            //         }
            //     });
            // }
            res.send({ success: true });
        } else {
            console.log('Error in controllers/walletController -> send(), blockchain returned false', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/walletController -> send()', err);
        res.send({ success: false });
    }

}

module.exports.burn = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const type = body.type;
        const from = body.from;
        const to = body.to;
        const amount = body.amount;
        const token = body.token;

        // check that publicId is same as user in jwt
        if (!req.body.priviUser.id || (req.body.priviUser.id != from)) {
            console.log("error: jwt user is not the same as publicId ban?");
            res.send({ success: false, message: "jwt user is not the same as publicId" });
            return;
        }

        const blockchainRes = await coinBalance.burn(type, from, to, amount, token, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(from, "Withdraw - Complete",
                `You have succesfully swapped ${amount} ${token} from your PRIVI Wallet. ${amount} ${token} has been added to your Ethereum wallet!`,
                notificationTypes.withdraw
            );
            await notificationsController.addNotification({
                userId: from,
                notification: {
                    type: 10,
                    typeItemId: 'token',
                    itemId: token,
                    follower: '',
                    pod: '',
                    comment: '',
                    token: token,
                    amount: amount,
                    onlyInformation: false,
                }
            });
            res.send({ success: true });
        } else {
            console.log('Error in controllers/walletController -> withdraw()');
            res.send({ success: false });
        }

    } catch (err) {
        console.log('Error in controllers/walletController -> withdraw()', err);
        res.send({ success: false });
    }

}

module.exports.mint = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const type = body.type;
        const from = body.from;
        const to = body.to;
        const amount = body.amount;
        const token = body.token;

        // // check that publicId is same as user in jwt
        // if (!req.body.priviUser.id || (req.body.priviUser.id != to)) {
        //     console.log("error: jwt user is not the same as publicId ban?");
        //     res.send({ success: false, message: "jwt user is not the same as publicId" });
        //     return;
        // }

        const blockchainRes = await coinBalance.mint(type, from, to, amount, token, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(to, "Swap - Complete",
                `You have succesfully swapped ${amount} ${token} from your Ethereum Wallet. ${amount} ${token} has been added to your PRIVI wallet!`,
                notificationTypes.swap
            );
            await notificationsController.addNotification({
                userId: from,
                notification: {
                    type: 9,
                    typeItemId: 'token',
                    itemId: token,
                    follower: '',
                    pod: '',
                    comment: '',
                    token: token,
                    amount: amount,
                    onlyInformation: false,
                }
            });
            res.send({ success: true });
        } else {
            console.log('Error in controllers/walletController -> mint()', blockchainRes);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/walletController -> mint()', err);
        res.send({ success: false });
    }

}


///////////////////////////// gets //////////////////////////////

module.exports.getBalancesOfAddress = async (req: express.Request, res: express.Response) => {
    try {
        console.log('getBalancesOfAddress req.query', req.query);
        let { userId, userAddress } = req.query;
        userId = userId!.toString();
        userAddress = userAddress!.toString();

        const blockchainRes = await coinBalance.getBalancesOfAddress(userAddress, apiKey);
        if (blockchainRes && blockchainRes.success) {
            let dataOutput = blockchainRes.output;
            // get balance by type:
            // crypto
            let cryptoArray = [];
            const cryptoTypeRes = await coinBalance.getTokenListByType('CRYPTO', apiKey);
            if (cryptoTypeRes && cryptoTypeRes.success) {
                cryptoArray = cryptoTypeRes.output !== null ? cryptoTypeRes.output : [];
            }
            // community
            let communityArray = [];
            const communityTypeRes = await coinBalance.getTokenListByType('COMMUNITY', apiKey);
            if (communityTypeRes && communityTypeRes.success) {
                communityArray = communityTypeRes.output !== null ? communityTypeRes.output : [];
            }
            // social
            let socialArray = [];
            const socialTypeRes = await coinBalance.getTokenListByType('SOCIAL', apiKey);
            if (socialTypeRes && socialTypeRes.success) {
                socialArray = socialTypeRes.output !== null ? socialTypeRes.output : [];
            }
            // ftpod
            let ftpodArray = [];
            const ftpodTypeRes = await coinBalance.getTokenListByType('FTPOD', apiKey);
            if (ftpodTypeRes && ftpodTypeRes.success) {
                ftpodArray = ftpodTypeRes.output !== null ? ftpodTypeRes.output : [];
            }
            // nftpod
            let nftpodArray = [];
            const nftpodTypeRes = await coinBalance.getTokenListByType('NFTPOD', apiKey);
            if (nftpodTypeRes && nftpodTypeRes.success) {
                nftpodArray = nftpodTypeRes.output !== null ? nftpodTypeRes.output : [];
            }
            dataOutput.forEach((element, index) => {
                cryptoArray.forEach(crypto => {
                    if (crypto === element.Token) {
                        dataOutput[index].Type = 'CRYPTO'
                    }
                });

                communityArray.forEach(comunity => {
                    if (comunity === element.Token) {
                        dataOutput[index].Type = 'COMMUNITY'
                    }
                });

                socialArray.forEach(social => {
                    if (social === element.Token) {
                        dataOutput[index].Type = 'SOCIAL'
                    }
                });

                ftpodArray.forEach(ftpod => {
                    if (ftpod === element.Token) {
                        dataOutput[index].Type = 'FTPOD'
                    }
                });

                nftpodArray.forEach(nftpod => {
                    if (nftpod === element.Token) {
                        dataOutput[index].Type = 'NFTPOD'
                    }
                });
            });
            // console.log('getBalancesOfAddress: data send to front', dataOutput)
            res.send({ success: true, data: dataOutput });
        } else {
            console.log("cant getBalancesOfAddress for", userAddress);
            res.send({ success: false, data: {} });
        }

    } catch (err) {
        console.log('Error in controllers/walletController -> getBalancesOfAddress()', err);
        res.send({ success: false });
    }
}

/**
 * Returns the balance of all tokens structured in this way {token: tokenObj}, this function is used in wallet page
 */
module.exports.getTokensRateChange = async (req: express.Request, res: express.Response) => {
    try {
        const retData = {};
        const ratesSnap = await db.collection(collections.rates).get();
        ratesSnap.forEach((doc) => {
            const data: any = doc.data();
            const currRate = data.rate ?? 1;
            const lastRate = data.lastRate ?? 1;
            retData[doc.id] = (currRate - lastRate) / lastRate;
        });
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTokensRateChange()', err);
        res.send({ success: false });
    }
}

/**
 * Returns the balance of all tokens structured in this way {token: tokenObj}, this function is used in wallet page
 */
module.exports.getAllTokenBalances = async (req: express.Request, res: express.Response) => {
    try {
        let address = req.params.address;
        const data = {};
        const tokenToTypeMap = await getTokenToTypeMap();
        const blockchainRes = await coinBalance.getBalancesOfAddress(address, apiKey);
        if (blockchainRes && blockchainRes.success) {
            let userBalances = blockchainRes.output;
            userBalances.forEach((balanceObj) => {
                let token = balanceObj.Token;
                let type = tokenToTypeMap[token] ?? collections.unknown;
                data[token] = { ...balanceObj, Type: type, Name: token }
            });
            res.send({ success: true, data: data });
        } else {
            console.log('Error in controllers/walletController -> getAllTokenBalances() blockchainRes = false', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/walletController -> getAllTokenBalances()', err);
        res.send({ success: false });
    }
}

/**
 * Used to get user's balance history in type of token (used to fill the graphs in frontend wallet page)
 */
module.exports.getBalanceHistoryInTokenTypes = async (req: express.Request, res: express.Response) => {
    try {
        const retData = {};
        let { userId } = req.query;
        userId = userId!.toString();
        if (!userId) {
            console.log('error: userId empty');
            res.send({ success: false });
            return;
        }
        // crypto
        const crytoHistory: any[] = [];
        const cryptoSnap = await db.collection(collections.wallet).doc(userId).collection(collections.cryptoHistory).orderBy("date", "asc").get();
        cryptoSnap.forEach((doc) => {
            const data = doc.data();
            if (data) {
                crytoHistory.push({
                    x: new Date(data.date).toString(),
                    y: data.balance
                });
            }
        });
        retData["crypto"] = crytoHistory;
        // ft
        const ftHistory: any[] = [];
        const ftSnap = await db.collection(collections.wallet).doc(userId).collection(collections.ftHistory).orderBy("date", "asc").get();
        ftSnap.forEach((doc) => {
            const data = doc.data();
            if (data) {
                ftHistory.push({
                    x: new Date(data.date).toString(),
                    y: data.balance
                });
            }
        });
        retData["ft"] = ftHistory;
        // nft
        const nftHistory: any[] = [];
        const nftSnap = await db.collection(collections.wallet).doc(userId).collection(collections.nftHistory).orderBy("date", "asc").get();
        cryptoSnap.forEach((doc) => {
            const data = doc.data();
            if (data) {
                nftHistory.push({
                    x: new Date(data.date).toString(),
                    y: data.balance
                });
            }
        });
        retData["nft"] = nftHistory;
        // social
        const socialHistory: any[] = [];
        const socialSnap = await db.collection(collections.wallet).doc(userId).collection(collections.socialHistory).orderBy("date", "asc").get();
        socialSnap.forEach((doc) => {
            const data = doc.data();
            if (data) {
                socialHistory.push({
                    x: new Date(data.date).toString(),
                    y: data.balance
                });
            }
        });
        retData["social"] = socialHistory;
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/userController -> getBalanceHistoryInTokenTypes()', err);
        res.send({ success: false });
    }
}


module.exports.getCryptosRateAsList = async (req: express.Request, res: express.Response) => {
    const data = await getRateOfChangeAsList();
    res.send({ success: true, data: data });
}

module.exports.getCryptosRateAsMap = async (req: express.Request, res: express.Response) => {
    const data = await getRateOfChangeAsMap();
    res.send({ success: true, data: data });
}

module.exports.getTotalBalance = async (req: express.Request, res: express.Response) => {
    console.log('getTotalBalancemust be depricated')
    // try {
    //     let { userId, userAddress } = req.query;
    //     userId = userId!.toString()
    //     userAddress = userAddress!.toString();
    //     if (!userId) {
    //         console.log('error: userId empty');
    //         res.send({ success: false });
    //         return;
    //     }
    //     const rateOfChange = await getRateOfChangeAsMap();
    //     // get user currency in usd
    //     let sum = 0;    // in user currency
    //     // crypto
    //     const userWalletRef = db.collection(collections.wallet).doc(userAddress);
    //     const cryptoWallet = await userWalletRef.collection(collections.cryptoToken).get();
    //     cryptoWallet.forEach((doc) => {
    //         // console.log('rateOfChange[doc.id]', rateOfChange[doc.id])
    //         // console.log('doc.data().Amount', doc.data().Amount)
    //         if (rateOfChange[doc.id]) sum += rateOfChange[doc.id] * doc.data().Amount;
    //         else sum += doc.data().Amount;
    //     });
    //     // ft
    //     const ftWallet = await userWalletRef.collection(collections.ftToken).get();
    //     ftWallet.forEach((doc) => {
    //         if (rateOfChange[doc.id]) sum += rateOfChange[doc.id] * doc.data().Amount;
    //         else sum += doc.data().Amount;
    //     });

    //     // nft
    //     const nftWallet = await userWalletRef.collection(collections.nftToken).get();
    //     nftWallet.forEach(async (doc) => {
    //         const fundingToken = doc.data().FundingToken;
    //         const nftPodSnap = await db.collection(collections.podsNFT).doc(doc.id).collection(collections.priceHistory).orderBy("date", "desc").limit(1).get();
    //         let latestFundingTokenPrice = 1;    // price of fundingToken per NF Token
    //         if (nftPodSnap.docs.length > 0 && nftPodSnap.docs[0].data().price) latestFundingTokenPrice = nftPodSnap.docs[0].data().price;
    //         if (rateOfChange[fundingToken]) sum += rateOfChange[fundingToken] * latestFundingTokenPrice * doc.data().Amount;
    //     });

    //     // social
    //     const socialWallet = await userWalletRef.collection(collections.socialToken).get();
    //     socialWallet.forEach((doc) => {
    //         if (rateOfChange[doc.id]) sum += rateOfChange[doc.id] * doc.data().Amount;
    //         else sum += doc.data().Amount;
    //     });

    //     // get user currency
    //     let amountInUserCurrency = sum;
    //     const userSnap = await db.collection(collections.user).doc(userId).get();
    //     const userData = userSnap.data();
    //     let currency = "Unknown";
    //     if (userData) {
    //         currency = userData.currency;
    //         const currencyRate = await getCurrencyRatesUsdBase()
    //         if (currency == "EUR" || currency == "GBP") amountInUserCurrency = amountInUserCurrency * currencyRate[currency];
    //     }

    //     const data = {
    //         amount: amountInUserCurrency,   // total balance in users currency
    //         tokens: rateOfChange["PC"] ? sum / rateOfChange["PC"] : 0,  // total balance in PC
    //         currency: currency,
    //         currency_symbol: currencySymbol.symbol(currency),
    //         debt: 0,
    //         daily_return: 0,
    //         weekly_return: 0,
    //         monthly_return: 0
    //     }
    //     res.send({ success: true, data: data });
    // } catch (err) {
    //     console.log('Error in controllers/walletController -> getTotalBalance()', err);
    //     res.send({ success: false });
    // }
    res.send({ success: false });
}

module.exports.getTotalBalance_v2 = async (req: express.Request, res: express.Response) => {

    try {
        let { userId, userAddress } = req.query;
        console.warn('getTotalBalance_v2, req.query: ', req.query);
        userId = userId!.toString()
        userAddress = userAddress!.toString();
        console.log('getTotalBalance_v2 is called', userAddress)
        const rateOfChange = await getRateOfChangeAsMap();
        // get user currency in usd
        let sum = 0;    // in user currency
        // crypto
        const blockchainCryptoRes = await coinBalance.getBalancesByType(userAddress, collections.cryptoToken, apiKey);
        if (blockchainCryptoRes.success) {
            const output = blockchainCryptoRes.output;
            // console.log('getTotalBalance_v2 blockchain output', output)
            for (let balance of Object.keys(output)) {
                if (rateOfChange[output[balance].Token]) sum += rateOfChange[output[balance].Token] * output[balance].Amount;
                else sum += output[balance].Amount;
            }
        } else {
            console.error('blockchain call failed', collections.cryptoToken, blockchainCryptoRes)
        }
        // ft
        const blockchainFtRes = await coinBalance.getBalancesByType(userAddress, collections.ftToken, apiKey);
        if (blockchainFtRes.success) {
            const output = blockchainFtRes.output;
            // console.log('getTotalBalance_v2 blockchain output', output)
            for (let balance of Object.keys(output)) {
                if (rateOfChange[output[balance].Token]) sum += rateOfChange[output[balance].Token] * output[balance].Amount;
                else sum += output[balance].Amount;
            }
        } else {
            console.error('blockchain call failed', collections.ftToken, blockchainFtRes)
        }
        // nft
        const blockchainNftRes = await coinBalance.getBalancesByType(userAddress, collections.nftToken, apiKey);
        if (blockchainNftRes.success) {
            const output = blockchainNftRes.output;
            // console.log('getTotalBalance_v2 blockchain output', output)
            for (let balance of Object.keys(output)) {
                if (rateOfChange[output[balance].Token]) sum += rateOfChange[output[balance].Token] * output[balance].Amount;
                else sum += output[balance].Amount;
            }
        } else {
            console.error('blockchain call failed', collections.nftToken, blockchainNftRes)
        }
        // social
        const blockchainSocialRes = await coinBalance.getBalancesByType(userAddress, collections.socialToken, apiKey);
        if (blockchainSocialRes.success) {
            const output = blockchainSocialRes.output;
            // console.log('getTotalBalance_v2 blockchain output', output)
            for (let balance of Object.keys(output)) {
                if (rateOfChange[output[balance].Token]) sum += rateOfChange[output[balance].Token] * output[balance].Amount;
                else sum += output[balance].Amount;
            }
        } else {
            console.error('blockchain call failed', collections.socialToken, blockchainSocialRes)
        }

        // // get user currency
        // let amountInUserCurrency = sum;
        // const userSnap = await db.collection(collections.user).doc(userId).get();
        // const userData = userSnap.data();
        // let currency = "Unknown";
        // if (userData) {
        //     currency = userData.currency;
        //     const currencyRate = await getCurrencyRatesUsdBase()
        //     if (currency == "EUR" || currency == "GBP") amountInUserCurrency = amountInUserCurrency * currencyRate[currency];
        // }

        // ----------- for testnet in PRIVI ----------
        let amountInUserCurrency = sum;
        if (rateOfChange['PRIVI']) amountInUserCurrency /= rateOfChange['PRIVI'];

        const data = {
            amount: amountInUserCurrency,   // total balance in users currency
            tokens: rateOfChange["PC"] ? sum / rateOfChange["PC"] : 0,  // total balance in PC
            // currency: currency,
            // currency_symbol: currencySymbol.symbol(currency),
            debt: 0,
            daily_return: 0,
            weekly_return: 0,
            monthly_return: 0
        }
        res.send({ success: true, data: data });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTotalBalance_v2()', err);
        res.send({ success: false });
    }
}

// get rateOfChange token balances as array
module.exports.getTokenBalances = async (req: express.Request, res: express.Response) => {
    console.log('getTokenBalances to be depricated')
    try {
        let { userId } = req.query;
        userId = userId!.toString();
        if (!userId) {
            console.log('error: userId empty');
            res.send({ success: false });
            return;
        }
        const retData: {}[] = [];
        const rateOfChange = await getRateOfChangeAsMap();
        for (const [token, _] of Object.entries(rateOfChange)) {
            const tokenType = await identifyTypeOfToken(token);
            const walletTokenSnap = await db.collection(collections.wallet).doc(userId).collection(tokenType).doc(token).get();
            //const walletTokenSnap = await db.collection(collections.wallet).doc(token).collection(collections.user).doc(userId).get();
            const data = walletTokenSnap.data();
            let amount = 0;
            if (data) amount = data.Amount;
            retData.push({ token: token, value: amount });
        }
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTokenBalances()', err);
        res.send({ success: false });
    }
}

module.exports.getTokenBalances_v2 = async (req: express.Request, res: express.Response) => {
    try {
        let { userId, userAddress } = req.query;
        if (!userAddress) userAddress = req.params.address;
        const retData: {}[] = [];
        const blockchainRes = await coinBalance.getBalancesOfAddress(userAddress, apiKey);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            // console.log('getTokenBalances_v2 blockchain output', output)
            for (let balance of output) {
                retData.push({ token: balance.Token, value: balance.Amount });
            }
            // console.log('getTokenBalances_v2 blockchain retData', retData)
            res.send({ success: true, data: retData });
        } else {
            console.log("cant getTokenBalances_v2 for", userAddress);
            res.send({ success: false, retData: {} });
        }
    } catch (err) {
        console.log('Error in controllers/walletController -> getTokenBalances_v2()', err);
        res.send({ success: false });
    }
}

module.exports.getTransfers = async (req: express.Request, res: express.Response) => {
    const rateData = await getRateOfChangeAsList();

    try {
        const body = req.body;

        let { userId } = req.query;
        userId = userId!.toString()

        const retData: {}[] = [];
        const historySnap = await db.collection(collections.history).doc(collections.history).collection(userId)
            .where("Type", "in", [notificationTypes.transferSend, notificationTypes.transferReceive])
            .orderBy("Date", "desc")
            .get();
        historySnap.forEach((doc) => {

            let date = new Date(doc.data().Date);

            let tokenRate = 1;
            let realValueCurrency = 0.0;
            let realValue = doc.data().Amount

            let value = ""; // fixed decimals
            let valueCurrency = ""; // fixed decimals
            let toFixed = 2;

            rateData.forEach(r => {
                if (r["token"] == doc.data().Token) {
                    tokenRate = r["rate"];
                    realValueCurrency = realValue * tokenRate; // do we need to convert to user currency?

                    toFixed = Math.max(2, tokenRate.toString().length); // minimum 2
                    value = realValue.toString()
                    if (countDecimals(value) > toFixed) {
                        value = realValue.toFixed(toFixed);
                    }
                    valueCurrency = realValueCurrency.toString();
                    if (countDecimals(valueCurrency) > toFixed) {
                        valueCurrency = realValueCurrency.toFixed(toFixed);
                    }
                }
            });

            const data = { id: doc.data().Id, token: doc.data().Token, tokenRate: tokenRate, value: value, valueCurrency: valueCurrency, realValue: realValue, realValueCurrency: realValueCurrency, type: doc.data().Type, date: (date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear()) };
            retData.push(data);
        })
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTransfers()', err);
        res.send({ success: false });
    }
}

module.exports.getTransactions = async (req: express.Request, res: express.Response) => {
    const rateData = await getRateOfChangeAsList();

    try {
        const body = req.body;

        let { userId } = req.query;
        userId = userId!.toString()

        const retData: {}[] = [];
        const historySnap = await db.collection(collections.history).doc(collections.history).collection(userId).orderBy("Date", "desc").get();
        historySnap.forEach((doc) => {

            let date = new Date(doc.data().Date);

            let tokenRate = 1;
            let realValueCurrency = 0.0;
            let realValue = doc.data().Amount

            let value = ""; // fixed decimals
            let valueCurrency = ""; // fixed decimals
            let toFixed = 2;

            rateData.forEach(r => {
                if (r["token"] == doc.data().Token) {
                    tokenRate = r["rate"];
                    realValueCurrency = realValue * tokenRate; // do we need to convert to user currency?

                    toFixed = Math.max(2, tokenRate.toString().length - 1); // minimum 2
                    value = realValue.toString()
                    if (countDecimals(realValue) > toFixed) {
                        value = realValue.toFixed(toFixed);
                    }
                    valueCurrency = realValueCurrency.toString();
                    if (countDecimals(realValueCurrency) > toFixed) {
                        valueCurrency = realValueCurrency.toFixed(toFixed);
                    }
                }
            });

            const data = { id: doc.data().Id, token: doc.data().Token, tokenRate: tokenRate, value: value, valueCurrency: valueCurrency, realValue: realValue, realValueCurrency: realValueCurrency, type: doc.data().Type, date: (date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear()) };
            retData.push(data);
        })
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTransactions()', err);
        res.send({ success: false });
    }
}


/**
 * Function used to get the user's ballance of a specific token
 * @param req {userId, token}. userId: id of the user to query the balance. token: the token to look at.
 * @param res {success, data}. success: boolean that indicates if the opreaction is performed. data: number indicating the balance of the user
 */
module.exports.getUserTokenBalance = async (req: express.Request, res: express.Response) => {
    const body = req.body;
    const userAddress = body.userAddress;
    const token = body.token;
    const blockchainRes = await coinBalance.balanceOf(userAddress, token);
    console.log(blockchainRes);
    if (blockchainRes && blockchainRes.success) {
        const balance = blockchainRes.output.Amount;
        res.send({ success: true, data: balance });
    }
    else res.send({ success: false });
}

/**
 * Function used for FE in the wallet buy tokens modal
 * @param req 
 * @param res {success, data}. success: boolean that indicates if the opreaction is performed. data: array of object {token, type, payments} being 'payments an array of {token, price, offerId}
 */
module.exports.getAllTokensWithBuyingPrice = async (req: express.Request, res: express.Response) => {
    try {
        const retData: any[] = [];
        // crypto
        const tokensSnap = await db.collection(collections.tokens).get();
        tokensSnap.forEach((doc) => {
            const data: any = doc.data();
            const type = data.TokenType;
            if (type && type == collections.cryptoToken) {
                retData.push({
                    token: doc.id,
                    type: type,
                    payments: []
                });
            }
        });
        // ft
        const ftSnap = await db.collection(collections.podsFT).get();
        ftSnap.forEach((doc) => {
            console.log(doc.id)
            const data: any = doc.data();
            const token = data.TokenSymbol;
            const payments: any[] = [];
            payments.push({
                token: data.FundingToken,
                address: data.PodAddress
            });
            retData.push({
                token: token,
                type: collections.ftToken,
                payments: payments
            });
        });
        // nft
        const nftSnap = await db.collection(collections.podsNFT).get();
        const nftDocs = nftSnap.docs;
        for (let i = 0; i < nftDocs.length; i++) {
            const doc = nftDocs[i];
            const data: any = doc.data();
            const payments: any[] = [];
            const token = data.TokenSymbol;
            const sellingOffers = await doc.ref.collection(collections.sellingOffers).get();
            const offers: any = {};  // to record the lowest price offer in each token
            sellingOffers.forEach((offerDoc) => {
                const offerData: any = offerDoc.data();
                const payingToken = offerData.Token;
                const offerPrice = offerData.Price;
                if (!offers[payingToken] || offerPrice < offers[payingToken].price) {
                    offers[payingToken] = {
                        price: offerPrice,
                        offerId: offerData.OrderId,
                        seller: offerData.SAddress,
                    }
                }
            });
            let offerToken = '';
            let offerObj: any = null;
            for ([offerToken, offerObj] of Object.entries(offers)) {
                payments.push({
                    token: offerToken,
                    address: data.PodAddress,
                    seller: offerObj.seller,
                    price: offerObj.price,
                    offerId: offerObj.offerId
                });
            }
            retData.push({
                token: token,
                type: collections.nftToken,
                payments: payments
            });
        }
        // social
        const socialSnap = await db.collection(collections.community).get();
        socialSnap.forEach((doc) => {
            const data: any = doc.data();
            const token = data.TokenSymbol;
            const payments: any[] = [];
            payments.push({
                token: data.FundingToken,
                address: data.CommunityAddress,
            });
            retData.push({
                token: token,
                type: collections.socialToken,
                payments: payments
            });
        });

        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/walletController -> getUserTokenBalance()', err);
        res.send({ success: false });
    }
}

/**
 * Function to get email-address map
 */
module.exports.getEmailToAddressMap = async (req: express.Request, res: express.Response) => {
    try {
        const data = await getEmailAddressMap();
        res.send({ success: true, data: data });
    } catch (err) {
        console.log('Error in controllers/walletController -> getEmailToAddressMap()', err);
        res.send({ success: false });
    }
}


/**
 * Function to get email-uid map
 */
module.exports.getEmailToUidMap = async (req: express.Request, res: express.Response) => {
    try {
        const data = await getEmailUidMap();
        res.send({ success: true, data: data });
    } catch (err) {
        console.log('Error in controllers/walletController -> getEmailUidMap()', err);
        res.send({ success: false });
    }
}


///////////////////////////// CRON JOBS //////////////////////////////
/**
 * cron job scheduled every day at 00:00, daily saves the users balace sum for each type of tokens (crypto, ft...)
 */
exports.saveUserBalanceSum = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("********* Wallet saveUserBalanceSum() cron job started *********");
        const rateOfChange = await getRateOfChangeAsMap();   // rates of all except nft
        const walletSnap = await db.collection(collections.wallet).get();
        walletSnap.forEach(async (userWallet) => {
            // crypto
            let cryptoSum = 0; // in usd
            const cryptoWallet = await userWallet.ref.collection(collections.cryptoToken).get();
            cryptoWallet.forEach((doc) => {
                if (rateOfChange[doc.id]) cryptoSum += rateOfChange[doc.id] * doc.data().Amount;
                else cryptoSum += doc.data().Amount;
            });
            userWallet.ref.collection(collections.cryptoHistory).add({
                date: Date.now(),
                balance: cryptoSum
            });

            // ft
            let ftSum = 0; // in usd
            const ftWallet = await userWallet.ref.collection(collections.ftToken).get();
            ftWallet.forEach((doc) => {
                if (rateOfChange[doc.id]) ftSum += rateOfChange[doc.id] * doc.data().Amount;
                else ftSum += doc.data().Amount;
            });
            userWallet.ref.collection(collections.ftHistory).add({
                date: Date.now(),
                balance: ftSum
            })

            // nft
            let nftSum = 0; // in usd
            const nftWallet = await userWallet.ref.collection(collections.nftToken).get();
            nftWallet.forEach(async (doc) => {
                const fundingToken = doc.data().FundingToken;
                const nftPodSnap = await db.collection(collections.podsNFT).doc(doc.id).collection(collections.priceHistory).orderBy("date", "desc").limit(1).get();
                let latestFundingTokenPrice = 1;    // price of fundingToken per NF Token
                if (nftPodSnap.docs[0].data().price) latestFundingTokenPrice = nftPodSnap.docs[0].data().price;
                if (rateOfChange[fundingToken]) nftSum += rateOfChange[fundingToken] * latestFundingTokenPrice * doc.data().Amount;
            });
            userWallet.ref.collection(collections.nftHistory).add({
                date: Date.now(),
                balance: nftSum
            })

            // social
            let socialSum = 0; // in usd
            const socialWallet = await userWallet.ref.collection(collections.socialToken).get();
            socialWallet.forEach((doc) => {
                if (rateOfChange[doc.id]) socialSum += rateOfChange[doc.id] * doc.data().Amount;
                else socialSum += doc.data().Amount;
            });
            userWallet.ref.collection(collections.socialHistory).add({
                date: Date.now(),
                balance: socialSum
            })


        });
    } catch (err) {
        console.log('Error in controllers/walletController -> saveUserBalanceSum()', err);
    }
});


// daily saves the last rate of each token
exports.saveLastRateOfTheDay = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("********* Wallet saveLastRateOfTheDay() cron job started *********");
        const ratesSnap = await db.collection(collections.rates).get();
        ratesSnap.forEach((doc) => {
            const data: any = doc.data();
            doc.ref.update({
                lastRate: data.rate ?? 1
            });
        });
    }
    catch (err) {
        console.log('Error in controllers/walletController -> saveUserBalanceSum()', err);
    }
});