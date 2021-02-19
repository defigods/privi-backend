import axios, { AxiosRequestConfig } from 'axios';
import {
  updateFirebase,
  getRateOfChangeAsMap,
  getRateOfChangeAsList,
  getEmailUidMap,
  getTokenToTypeMap,
  getEmailAddressMap,
} from '../functions/functions';
import notificationTypes from '../constants/notificationType';
import collections from '../firebase/collections';
import { db } from '../firebase/firebase';
import coinBalance, { balanceOf } from '../blockchain/coinBalance.js';
import express from 'express';
const currencySymbol = require('currency-symbol');
import { countDecimals } from '../functions/utilities';
import { identifyTypeOfToken } from '../functions/functions';
import cron from 'node-cron';
import { user } from 'firebase-functions/lib/providers/auth';
import { Address } from 'ethereumjs-util';
import path from 'path';
import fs from 'fs';
import { AMBERDATA_API_KEY, MIN_TIME_FOR_ETH_ADDRESS_TOKEN_UPDTAE } from '../constants/configuration';

require('dotenv').config();
//const apiKey = process.env.API_KEY;
const apiKey = 'PRIVI'; // just for now
const notificationsController = require('./notificationsController');
const CoinGecko = require('coingecko-api');

// ---------------------- CALLED FROM POSTMAN -------------------------------

// Should be called each time the blockchain restarts (or we resert firestore) to register all the crypto tokens to the system
// as well as adding this tokens info (type, supply..etc) to firestore
module.exports.registerTokens = async (req: express.Request, res: express.Response) => {
  try {
    const type = 'CRYPTO';
    const addressId = '0x7b559b648bc133d5f471436b4d3ff69f0d5a6640'; // any registered user address works
    const tokens = [
      { Name: 'PRIVI Coin', Symbol: 'PRIVI', Supply: 0 },
      { Name: 'Balancer', Symbol: 'BAL', Supply: 0 },
      { Name: 'Basic Attention Token', Symbol: 'BAT', Supply: 0 },
      { Name: 'Compound', Symbol: 'COMP', Supply: 0 },
      { Name: 'Dai Stablecoin', Symbol: 'DAI', Supply: 0 },
      { Name: 'Ethereum', Symbol: 'ETH', Supply: 0 },
      { Name: 'Chainlink', Symbol: 'LINK', Supply: 0 },
      { Name: 'MakerDAO', Symbol: 'MKR', Supply: 0 },
      { Name: 'Uniswap', Symbol: 'UNI', Supply: 0 },
      { Name: 'Tether', Symbol: 'USDT', Supply: 0 },
      { Name: 'Wrapped Bitcoin', Symbol: 'WBTC', Supply: 0 },
      { Name: 'Yearn Finance', Symbol: 'YFI', Supply: 0 },
      { Name: 'Wrap Ethereum', Symbol: 'WETH', Supply: 0 },
    ];
    tokens.forEach(async (token) => {
      const blockchainRes = await coinBalance.registerToken(
        token.Name,
        type,
        token.Symbol,
        token.Supply,
        addressId,
        apiKey
      );
      if (blockchainRes.success) {
        updateFirebase(blockchainRes);
      } else {
        console.log('blockchain success = false', blockchainRes);
      }
    });
    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/walletController -> registerTokens()', err);
    res.send({ success: false });
  }
};

module.exports.updateTokensCollection = async (req: express.Request, res: express.Response) => {
  try {
    const type = 'CRYPTO';
    const tokens = [
      { Name: 'PRIVI Coin', Symbol: 'PRIVI', Supply: 0 },
      { Name: 'Balancer', Symbol: 'BAL', Supply: 0 },
      { Name: 'Basic Attention Token', Symbol: 'BAT', Supply: 0 },
      { Name: 'Compound', Symbol: 'COMP', Supply: 0 },
      { Name: 'Dai Stablecoin', Symbol: 'DAI', Supply: 0 },
      { Name: 'Ethereum', Symbol: 'ETH', Supply: 0 },
      { Name: 'Chainlink', Symbol: 'LINK', Supply: 0 },
      { Name: 'MakerDAO', Symbol: 'MKR', Supply: 0 },
      { Name: 'Uniswap', Symbol: 'UNI', Supply: 0 },
      { Name: 'Tether', Symbol: 'USDT', Supply: 0 },
      { Name: 'Wrapped Bitcoin', Symbol: 'WBTC', Supply: 0 },
      { Name: 'Yearn Finance', Symbol: 'YFI', Supply: 0 },
      { Name: 'Wrap Ethereum', Symbol: 'WETH', Supply: 0 },
    ];
    tokens.forEach((token) => {
      db.collection(collections.tokens)
        .doc(token.Symbol)
        .set({
          LockUpDate: 0,
          ...token,
          TokenType: type,
        });
    });
    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/walletController -> updateTokensCollection()', err);
    res.send({ success: false });
  }
};
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
    // check that fromUid is same as user in jwt
    if (!req.body.priviUser.id || req.body.priviUser.id != userId) {
      console.log('error: jwt user is not the same as fromUid ban?');
      res.send({ success: false, message: 'jwt user is not the same as fromUid' });
      return;
    }
    const blockchainRes = await coinBalance.transfer(from, to, amount, token, type, hash, signature, apiKey);
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
      //                     otherItemId: ''
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
      //                     otherItemId: ''
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
};

module.exports.burn = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const type = body.type;
    const from = body.from;
    const to = body.to;
    const amount = body.amount;
    const token = body.token;

    // check that publicId is same as user in jwt
    if (!req.body.priviUser.id || req.body.priviUser.id != from) {
      console.log('error: jwt user is not the same as publicId ban?');
      res.send({ success: false, message: 'jwt user is not the same as publicId' });
      return;
    }

    const blockchainRes = await coinBalance.burn(type, from, to, amount, token, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      /*createNotification(from, "Withdraw - Complete",
                `You have succesfully swapped ${amount} ${token} from your PRIVI Wallet. ${amount} ${token} has been added to your Ethereum wallet!`,
                notificationTypes.withdraw
            );*/
      /*await notificationsController.addNotification({
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
                    otherItemId: ''
                }
            });*/
      res.send({ success: true });
    } else {
      console.log('Error in controllers/walletController -> withdraw()');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/walletController -> withdraw()', err);
    res.send({ success: false });
  }
};

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
      /*createNotification(to, "Swap - Complete",
                `You have succesfully swapped ${amount} ${token} from your Ethereum Wallet. ${amount} ${token} has been added to your PRIVI wallet!`,
                notificationTypes.swap
            );*/
      /*await notificationsController.addNotification({
                userId: from,
                notification: {
                    type: 0,
                    typeItemId: 'token',
                    itemId: token,
                    follower: '',
                    pod: '',
                    comment: '',
                    token: token,
                    amount: amount,
                    onlyInformation: false,
                    otherItemId: ''
                }
            });*/
      res.send({ success: true });
    } else {
      console.log('Error in controllers/walletController -> mint()', blockchainRes);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/walletController -> mint()', err);
    res.send({ success: false });
  }
};

async function getImageURLFromCoinGeco(symbol: string) : Promise<any> {
  // get all coingeco tokens list
  const CoinGeckoClient = new CoinGecko();
  const coingecoCoinListRes = await CoinGeckoClient.coins.list();
  // console.log('getImageURLFromCoinGeco', coingecoCoinListRes.data)
  const coinList: any[] = coingecoCoinListRes.data;
  const foundCoin = coinList.find(e => e.symbol === symbol.toLowerCase())
  // console.log('getImageURLFromCoinGeco found coin', foundCoin, 'for', symbol);
  if (foundCoin) {
    const coingecoCoinObjectRes = await CoinGeckoClient.coins.fetch(foundCoin.id);
    if (coingecoCoinObjectRes && coingecoCoinObjectRes.data) {
      // console.log('getImageURLFromCoinGeco get coin by id', foundCoin.id, coingecoCoinObjectRes.data.image);
      const imageObj = coingecoCoinObjectRes.data.image;
      return imageObj;
    } else {
      console.log('could not get coin with id', foundCoin.id, 'symbol', symbol);
    }
    return undefined;
  } else {
    console.log('no coin found on coingeco for symbol:', symbol);
  }
  return undefined;
}

async function getTokenListFromAmberData(address: string) : Promise<any> {
  const config: AxiosRequestConfig = {
    method: 'get',
    headers: {'x-amberdata-blockchain-id': 'ethereum-mainnet', 'x-api-key': AMBERDATA_API_KEY},
    url: 'https://web3api.io/api/v2/addresses/' + address + '/token-balances/latest?page=0&size=2'
  }

  let amberdataRes = await axios(config);
  if (amberdataRes.data.payload && parseFloat(amberdataRes.data.payload.totalRecords) > 0) {
    // console.log('registerUserEthAccount records', amberdataRes.data.payload.records)
    const records = amberdataRes.data.payload.records;
    const preparedTokenListPromise = Promise.all(records.map(async (element) => {
      const imageUrlObj = await getImageURLFromCoinGeco(element.symbol);
      return {
          tokenContractAddress: element.address,
          tokenName: element.name,
          tokenSymbol: element.symbol,
          tokenDecimal: element.decimals,
          tokenType: element.isERC20 ? 'ERC20' : element.isERC721 ? 'ERC721' : 'UNKNOWN',
          balance: element.amount,
          images: imageUrlObj ? imageUrlObj : 'NO_IMAGE_FOUND'
        }
      })
    );
    const preparedTokenList = await preparedTokenListPromise;
    return preparedTokenList;
  }
  return null;
}

module.exports.registerUserEthAccount = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const address = body.address;
    const userId = body.userId;
    console.log('registerUserEthAccount address/userId', address, userId)
      
    // get user address registered collection
    const walletRegisteredEthAddrSnap = await  db.collection(collections.wallet)
    .doc(userId)
    .collection(collections.registeredEthAddress)
    .doc(address)
    .get();

    // check if address is already registered
    if (walletRegisteredEthAddrSnap.exists) {
      console.log('registerUserEthAccount: already exist, address', address, 'user', userId)
      const doc: any = walletRegisteredEthAddrSnap.data();
      console.log('existing doc', doc, (Date.now() - doc.lastUpdate), MIN_TIME_FOR_ETH_ADDRESS_TOKEN_UPDTAE)
      if (doc.lastUpdate && ((Date.now() - doc.lastUpdate) > MIN_TIME_FOR_ETH_ADDRESS_TOKEN_UPDTAE)) {
        const preparedTokenList = await getTokenListFromAmberData(address);
        await  db.collection(collections.wallet)
        .doc(userId)
        .collection(collections.registeredEthAddress)
        .doc(address)
        .set({
          tokenList: preparedTokenList,
          lastUpdate: Date.now()
        });
        res.send({ success: true });
      } else {
        console.log('No eth owned token update needed only', (Date.now() - doc.lastUpdate), 'second passed', 'min is', MIN_TIME_FOR_ETH_ADDRESS_TOKEN_UPDTAE)
        res.send({ success: true });
      }
    } else {
      console.log('registerUserEthAccount: address does not exist', address, 'user', userId)
      // setting address to collection
      const preparedTokenList = await getTokenListFromAmberData(address);
      await  db.collection(collections.wallet)
      .doc(userId)
      .collection(collections.registeredEthAddress)
      .doc(address)
      .set({
        tokenList: preparedTokenList,
        lastUpdate: Date.now()
      });
      res.send({ success: true });
    }
  } catch (err) {
    console.log('Error in controllers/walletController -> registerUserEthAccount()', err);
    res.send({ success: false });
  }
};

///////////////////////////// gets //////////////////////////////

module.exports.getUserOwnedTokens = async (req: express.Request, res: express.Response) => {
  try {
    let { userId } = req.query;
    userId = userId!.toString();
    console.log('getUserOwnedTokens query', req.query, 'userId', userId)

    const walletRegisteredEthAddrSnap = userId !== '' ? await db.collection(collections.wallet)
    .doc(userId)
    .collection(collections.registeredEthAddress).get() : null;

    if (walletRegisteredEthAddrSnap && !walletRegisteredEthAddrSnap.empty) {
      console.log('---------------------- getUserOwnedTokens', walletRegisteredEthAddrSnap.docs.length)
      const docs = walletRegisteredEthAddrSnap.docs;
      let responsePromise: Promise<{ address: string; tokens: any; }[]> = Promise.all( docs.map( async (doc) => {
        const docObject: any = await (await doc.ref.get()).data();
        // console.log('---------------------- data', {address: doc.id, tokens: docObject.tokenList});
        return {address: doc.id, tokens: docObject.tokenList}
        })
      );
      const response = await responsePromise;
      console.log('---------------------- data array', response)
      res.send({ success: true, data: response });
    } else {
      console.log('---------------------- getUserOwnedTokens is empity');
      res.send({ success: true, data: [] });
    }
  } catch (err) {
    console.log('Error in controllers/walletController -> getUserOwnedTokens()', err);
    res.send({ success: false });
  }
};

module.exports.getBalanceData = async (req: express.Request, res: express.Response) => {
  try {
    const t1 = Date.now();
    let { userAddress } = req.query;
    const tokensBalance: any[] = [];
    const tokens: any = {};

    // get tokens
    // // --- methode 1 ---
    // const tokenTypes = ["CRYPTO", "FTPOD", "NFTPOD", "COMMUNITY", "SOCIAL"];
    // const tokenPromises: any = [];
    // tokenTypes.forEach((tokenType) => {
    //     tokenPromises.push(coinBalance.getTokenListByType(tokenType, apiKey));
    // });
    // const tokenResponces = await Promise.all(tokenPromises);
    // tokenResponces.forEach((responce: any) => {
    //     if (responce && responce.success) {
    //         const output = responce.output;
    //         const tokenType = responce.tokenType;
    //         output.forEach((token) => tokens[token] = tokenType);
    //     }
    // });
    // --- methode 2 ---
    const tokenTypeMap = await getTokenToTypeMap();
    const tokenResponse = await coinBalance.getTokensOfAddress(userAddress, apiKey);
    if (tokenResponse && tokenResponse.success) {
      const output = tokenResponse.output;
      for (const token of output) {
        const type = tokenTypeMap[token];
        if (type) tokens[token] = type;
      }
    }

    // get balances
    const balancePromises: any = [];
    Object.keys(tokens).forEach((token) => {
      balancePromises.push(coinBalance.balanceOf(userAddress, token));
    });
    const balanceResponces = await Promise.all(balancePromises);
    balanceResponces.forEach((responce: any) => {
      if (responce && responce.success) {
        const output = responce.output;
        if (output && output.Amount) {
          tokensBalance.push({
            ...output,
            Type: tokens[output.Token],
          });
        }
      }
    });
    console.log(Date.now() - t1, 'ms');
    res.send({
      success: true,
      data: tokensBalance,
    });
  } catch (err) {
    console.log('Error in controllers/walletController -> getBalanceData()', err);
    res.send({ success: false });
  }
};

module.exports.getBalancesByType = async (req: express.Request, res: express.Response) => {
  try {
    let { userAddress, type } = req.query;

    const blockchainRes = await coinBalance.getBalancesByType(userAddress, type, apiKey);
    if (blockchainRes && blockchainRes.success) {
      const output = blockchainRes.output;
      res.send({ success: true, data: output });
    } else {
      console.log('cant getBalancesByType for', userAddress, blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/walletController -> getBalancesByType()', err);
    res.send({ success: false });
  }
};

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
};

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
        data[token] = { ...balanceObj, Type: type, Name: token };
      });
      res.send({ success: true, data: data });
    } else {
      console.log(
        'Error in controllers/walletController -> getAllTokenBalances() blockchainRes = false',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/walletController -> getAllTokenBalances()', err);
    res.send({ success: false });
  }
};

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
    const cryptoSnap = await db
      .collection(collections.wallet)
      .doc(userId)
      .collection(collections.cryptoHistory)
      .orderBy('date', 'asc')
      .get();
    cryptoSnap.forEach((doc) => {
      const data = doc.data();
      if (data) {
        crytoHistory.push({
          x: new Date(data.date).toString(),
          y: data.balance,
        });
      }
    });
    retData['crypto'] = crytoHistory;
    // ft
    const ftHistory: any[] = [];
    const ftSnap = await db
      .collection(collections.wallet)
      .doc(userId)
      .collection(collections.ftHistory)
      .orderBy('date', 'asc')
      .get();
    ftSnap.forEach((doc) => {
      const data = doc.data();
      if (data) {
        ftHistory.push({
          x: new Date(data.date).toString(),
          y: data.balance,
        });
      }
    });
    retData['ft'] = ftHistory;
    // nft
    const nftHistory: any[] = [];
    const nftSnap = await db
      .collection(collections.wallet)
      .doc(userId)
      .collection(collections.nftHistory)
      .orderBy('date', 'asc')
      .get();
    cryptoSnap.forEach((doc) => {
      const data = doc.data();
      if (data) {
        nftHistory.push({
          x: new Date(data.date).toString(),
          y: data.balance,
        });
      }
    });
    retData['nft'] = nftHistory;
    // social
    const socialHistory: any[] = [];
    const socialSnap = await db
      .collection(collections.wallet)
      .doc(userId)
      .collection(collections.socialHistory)
      .orderBy('date', 'asc')
      .get();
    socialSnap.forEach((doc) => {
      const data = doc.data();
      if (data) {
        socialHistory.push({
          x: new Date(data.date).toString(),
          y: data.balance,
        });
      }
    });
    retData['social'] = socialHistory;
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/userController -> getBalanceHistoryInTokenTypes()', err);
    res.send({ success: false });
  }
};

module.exports.getCryptosRateAsList = async (req: express.Request, res: express.Response) => {
  const data = await getRateOfChangeAsList();
  res.send({ success: true, data: data });
};

module.exports.getCryptosRateAsMap = async (req: express.Request, res: express.Response) => {
  const data = await getRateOfChangeAsMap();
  res.send({ success: true, data: data });
};

module.exports.getTotalBalance_v2 = async (req: express.Request, res: express.Response) => {
  try {
    let { userId, userAddress } = req.query;
    userId = userId!.toString();
    userAddress = userAddress!.toString();
    const rateOfChange = await getRateOfChangeAsMap();
    // get user currency in usd
    let sum = 0; // in user currency
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
      console.error('blockchain call failed', collections.cryptoToken, blockchainCryptoRes);
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
      console.error('blockchain call failed', collections.ftToken, blockchainFtRes);
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
      console.error('blockchain call failed', collections.nftToken, blockchainNftRes);
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
      console.error('blockchain call failed', collections.socialToken, blockchainSocialRes);
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

    // ----------- convert to PRIVI (only testnet) ----------
    let amountInUserCurrency = sum;
    if (rateOfChange['PRIVI']) amountInUserCurrency /= rateOfChange['PRIVI'];

    const data = {
      amount: amountInUserCurrency, // total balance in users currency
      tokens: rateOfChange['PC'] ? sum / rateOfChange['PC'] : 0, // total balance in PC
      // currency: currency,
      // currency_symbol: currencySymbol.symbol(currency),
      debt: 0,
      daily_return: 0,
      weekly_return: 0,
      monthly_return: 0,
    };
    res.send({ success: true, data: data });
  } catch (err) {
    console.log('Error in controllers/walletController -> getTotalBalance_v2()', err);
    res.send({ success: false });
  }
};

module.exports.getTokenBalances_v2 = async (req: express.Request, res: express.Response) => {
  try {
    let { userAddress } = req.query;
    if (!userAddress) userAddress = req.params.address;
    const retData: {}[] = [];
    const blockchainRes = await coinBalance.getBalancesOfAddress(userAddress, apiKey);
    if (blockchainRes && blockchainRes.success) {
      const output = blockchainRes.output;
      for (let balance of output) {
        retData.push({ token: balance.Token, value: balance.Amount });
      }
      res.send({ success: true, data: retData });
    } else {
      console.log('cant getTokenBalances_v2 for', userAddress);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/walletController -> getTokenBalances_v2()', err);
    res.send({ success: false });
  }
};

module.exports.getTransfers = async (req: express.Request, res: express.Response) => {
  const rateData = await getRateOfChangeAsList();
  try {
    let { userId } = req.query;
    userId = userId!.toString();
    const retData: {}[] = [];
    const historySnap = await db
      .collection(collections.history)
      .doc(collections.history)
      .collection(userId)
      .where('Type', 'in', [notificationTypes.transferSend, notificationTypes.transferReceive])
      .orderBy('Date', 'desc')
      .get();
    historySnap.forEach((doc) => {
      let date = new Date(doc.data().Date);

      let tokenRate = 1;
      let realValueCurrency = 0.0;
      let realValue = doc.data().Amount;

      let value = ''; // fixed decimals
      let valueCurrency = ''; // fixed decimals
      let toFixed = 2;

      rateData.forEach((r) => {
        if (r['token'] == doc.data().Token) {
          tokenRate = r['rate'];
          realValueCurrency = realValue * tokenRate; // do we need to convert to user currency?

          toFixed = Math.max(2, tokenRate.toString().length); // minimum 2
          value = realValue.toString();
          if (countDecimals(value) > toFixed) {
            value = realValue.toFixed(toFixed);
          }
          valueCurrency = realValueCurrency.toString();
          if (countDecimals(valueCurrency) > toFixed) {
            valueCurrency = realValueCurrency.toFixed(toFixed);
          }
        }
      });

      const data = {
        id: doc.data().Id,
        token: doc.data().Token,
        tokenRate: tokenRate,
        value: value,
        valueCurrency: valueCurrency,
        realValue: realValue,
        realValueCurrency: realValueCurrency,
        type: doc.data().Type,
        date: date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear(),
      };
      retData.push(data);
    });
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/walletController -> getTransfers()', err);
    res.send({ success: false });
  }
};

module.exports.getTransactions = async (req: express.Request, res: express.Response) => {
  const rateData = await getRateOfChangeAsList();
  try {
    let { userId } = req.query;
    userId = userId!.toString();

    const retData: {}[] = [];
    const historySnap = await db
      .collection(collections.history)
      .doc(collections.history)
      .collection(userId)
      .orderBy('Date', 'desc')
      .get();
    historySnap.forEach((doc) => {
      let date = new Date(doc.data().Date);

      let tokenRate = 1;
      let realValueCurrency = 0.0;
      let realValue = doc.data().Amount;

      let value = ''; // fixed decimals
      let valueCurrency = ''; // fixed decimals
      let toFixed = 2;

      rateData.forEach((r) => {
        if (r['token'] == doc.data().Token) {
          tokenRate = r['rate'];
          realValueCurrency = realValue * tokenRate; // do we need to convert to user currency?

          toFixed = Math.max(2, tokenRate.toString().length - 1); // minimum 2
          value = realValue.toString();
          if (countDecimals(realValue) > toFixed) {
            value = realValue.toFixed(toFixed);
          }
          valueCurrency = realValueCurrency.toString();
          if (countDecimals(realValueCurrency) > toFixed) {
            valueCurrency = realValueCurrency.toFixed(toFixed);
          }
        }
      });

      const data = {
        id: doc.data().Id,
        token: doc.data().Token,
        tokenRate: tokenRate,
        value: value,
        valueCurrency: valueCurrency,
        realValue: realValue,
        realValueCurrency: realValueCurrency,
        type: doc.data().Type,
        date: date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear(),
      };
      retData.push(data);
    });
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/walletController -> getTransactions()', err);
    res.send({ success: false });
  }
};

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
  if (blockchainRes && blockchainRes.success) {
    const balance = blockchainRes.output.Amount;
    res.send({ success: true, data: balance });
  } else res.send({ success: false });
};

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
          payments: [],
        });
      }
    });
    // ft
    const ftSnap = await db.collection(collections.podsFT).get();
    ftSnap.forEach((doc) => {
      console.log(doc.id);
      const data: any = doc.data();
      const token = data.TokenSymbol;
      const payments: any[] = [];
      payments.push({
        token: data.FundingToken,
        address: data.PodAddress,
      });
      retData.push({
        token: token,
        type: collections.ftToken,
        payments: payments,
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
      const offers: any = {}; // to record the lowest price offer in each token
      sellingOffers.forEach((offerDoc) => {
        const offerData: any = offerDoc.data();
        const payingToken = offerData.Token;
        const offerPrice = offerData.Price;
        if (!offers[payingToken] || offerPrice < offers[payingToken].price) {
          offers[payingToken] = {
            price: offerPrice,
            offerId: offerData.OrderId,
            seller: offerData.SAddress,
          };
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
          offerId: offerObj.offerId,
        });
      }
      retData.push({
        token: token,
        type: collections.nftToken,
        payments: payments,
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
        payments: payments,
      });
    });

    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/walletController -> getAllTokensWithBuyingPrice()', err);
    res.send({ success: false });
  }
};

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
};

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
};

///////////////////////////// CRON JOBS //////////////////////////////
/**
 * cron job scheduled every day at 00:00, daily saves the users balace sum for each type of tokens (crypto, ft...)
 */
exports.saveUserBalanceSum = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('********* Wallet saveUserBalanceSum() cron job started *********');
    const rateOfChange = await getRateOfChangeAsMap(); // rates of all except nft
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
        balance: cryptoSum,
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
        balance: ftSum,
      });

      // nft
      let nftSum = 0; // in usd
      const nftWallet = await userWallet.ref.collection(collections.nftToken).get();
      nftWallet.forEach(async (doc) => {
        const fundingToken = doc.data().FundingToken;
        const nftPodSnap = await db
          .collection(collections.podsNFT)
          .doc(doc.id)
          .collection(collections.priceHistory)
          .orderBy('date', 'desc')
          .limit(1)
          .get();
        let latestFundingTokenPrice = 1; // price of fundingToken per NF Token
        if (nftPodSnap.docs[0].data().price) latestFundingTokenPrice = nftPodSnap.docs[0].data().price;
        if (rateOfChange[fundingToken])
          nftSum += rateOfChange[fundingToken] * latestFundingTokenPrice * doc.data().Amount;
      });
      userWallet.ref.collection(collections.nftHistory).add({
        date: Date.now(),
        balance: nftSum,
      });

      // social
      let socialSum = 0; // in usd
      const socialWallet = await userWallet.ref.collection(collections.socialToken).get();
      socialWallet.forEach((doc) => {
        if (rateOfChange[doc.id]) socialSum += rateOfChange[doc.id] * doc.data().Amount;
        else socialSum += doc.data().Amount;
      });
      userWallet.ref.collection(collections.socialHistory).add({
        date: Date.now(),
        balance: socialSum,
      });
    });
  } catch (err) {
    console.log('Error in controllers/walletController -> saveUserBalanceSum()', err);
  }
});

// daily saves the last rate of each token
exports.saveLastRateOfTheDay = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('********* Wallet saveLastRateOfTheDay() cron job started *********');
    const ratesSnap = await db.collection(collections.rates).get();
    ratesSnap.forEach((doc) => {
      const data: any = doc.data();
      doc.ref.update({
        lastRate: data.rate ?? 1,
      });
    });
  } catch (err) {
    console.log('Error in controllers/walletController -> saveUserBalanceSum()', err);
  }
});

//TOKEN photos
//change photo
exports.changeTokenPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      res.send({ success: true });
    } else {
      console.log('Error in controllers/walletController -> changeTokenPhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/walletController -> changeTokenPhoto()', err);
    res.send({ success: false });
  }
};

//get community photo
exports.getTokenPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let tokenSymbol = req.params.tokenSymbol;
    console.log(tokenSymbol);
    if (tokenSymbol) {
      const directoryPath = path.join('uploads', 'tokens');
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader('Content-Type', 'image');
      let raw = fs.createReadStream(path.join('uploads', 'tokens', tokenSymbol + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/walletController -> getTokenPhotoById()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/walletController -> getTokenPhotoById()', err);
    res.send({ success: false });
  }
};
