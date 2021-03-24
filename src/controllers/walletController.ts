import axios, { AxiosRequestConfig } from 'axios';
import {
  updateFirebase,
  getRateOfChangeAsMap,
  getRateOfChangeAsList,
  getEmailUidMap,
  getTokenToTypeMap,
  getEmailAddressMap,
  getMarketPrice,
} from '../functions/functions';
import collections from '../firebase/collections';
import { db } from '../firebase/firebase';
import coinBalance from '../blockchain/coinBalance.js';
import express from 'express';
import cron from 'node-cron';
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

const giveAwayTokens = async (userAddress, coinsEquivVal) => {
  const blockchainRes = await coinBalance.getTokenListByType('CRYPTO', apiKey);
  const registeredCryptoTokens: string[] = blockchainRes.output ?? [];
  const rateOfChange: any = await getRateOfChangeAsMap(); // get rate of tokens
  for (let i = 0; i < registeredCryptoTokens.length; i++) {
    const token = registeredCryptoTokens[i];
    const rate = rateOfChange[token] ?? 1;
    const amount = coinsEquivVal / rate;
    const blockchainRes2 = await coinBalance.mint('TestTokens', '', userAddress, amount, token, apiKey);
    if (blockchainRes2.success) {
      updateFirebase(blockchainRes2)
    } else {
      console.log(`user ${userAddress} dindt get ${token}, ${blockchainRes2.message}`);
    }
  }
  return true;
}
module.exports.giveAwayTokens = giveAwayTokens;

module.exports.giveTokensExistingUsers = async (req: express.Request, res: express.Response) => {
  try {
    const addressList: string[] = [];
    const userSnap = await db.collection(collections.user).get();
    userSnap.forEach((doc) => {
      const data: any = doc.data();
      if (data.address) {
        addressList.push(data.address);
      }
    });
    for (let i = 0; i < addressList.length; i++) {
      const address = addressList[i];
      await giveAwayTokens(address, 100);
    }
    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/walletController -> giveTokensExistingUsers()', err);
    res.send({ success: false });
  }
};

const collectionList = [
  collections.badges,
  collections.community,
  collections.growthPredictions,
  collections.liquidityPools,
  collections.podsFT,
  collections.podsNFT,
  collections.priviCredits,
  collections.socialPools,
  collections.user,
  collections.voter,
  collections.voting,
]
module.exports.saveCollectionDataInJSON = async (req: express.Request, res: express.Response) => {
  try {
    collectionList.forEach((collectionName) => {
      const data: any = {};
      db.collection(collectionName).get().then((snap) => {
        snap.forEach((doc) => {
          data[doc.id] = doc.data();
        });
        const dataInStr = JSON.stringify(data, null, 4);
        fs.writeFile('./JSON/' + collectionName + '.json', dataInStr, (err) => {
          if (err) {
            throw err;
          }
          console.log(collectionName + '.json', " is saved.");
        });
      });
    });
    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/collabController -> saveCollectionDataInJSON()', err);
    res.send({ success: false });
  }
};
// -----------------------------------------------------------------

module.exports.transfer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const userId = body.UserId;
    const from = body.From; //  passed as address from frontend
    const to = body.To; // passed as address from frontend
    const amount = body.Amount;
    const token = body.Token;
    const type = body.Type;
    const hash = body.Hash;
    const signature = body.Signature;
    if (!req.body.priviUser.id || req.body.priviUser.id != userId) {
      console.log('error: jwt user is not the same as fromUid');
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

module.exports.giveTip = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const from = body.From; // passed as uid from FE
    const to = body.To; // passed as uid from FE
    const amount = body.Amount;
    const token = body.Token;
    const type = body.Type;
    const hash = body.Hash;
    const signature = body.Signature;
    // check that fromUid is same as user in jwt
    if (!req.body.priviUser.id || req.body.priviUser.id != from) {
      console.log('error: jwt user is not the same as fromUid ban?');
      res.send({ success: false, message: 'jwt user is not the same as fromUid' });
      return;
    }
    // get address of from and to users from DB
    const fromUserSnap = await db.collection(collections.user).doc(from).get();
    const toUserSnap = await db.collection(collections.user).doc(to).get();
    const fromUserData: any = fromUserSnap.data();
    const toUserData: any = toUserSnap.data();

    const fromAddress = fromUserData && fromUserData.address ? fromUserData.address : undefined;
    const toAddress = toUserData && toUserData.address ? toUserData.address : undefined;
    if (!fromAddress || !toAddress) {
      console.log('error: from user or to user couldnt be found at BD');
      res.send({ success: false, message: 'from user or to user couldnt be found at BD' });
      return;
    }
    const blockchainRes = await coinBalance.transfer(fromAddress, toAddress, amount, token, type, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);

      const fromName = fromUserData && fromUserData.firstName ? fromUserData.firstName : 'Unknown';
      await notificationsController.addNotification({
        userId: to,
        notification: {
          type: 93,
          typeItemId: 'user',
          itemId: from,
          follower: fromName,
          pod: '',
          comment: '',
          token: token,
          amount: amount,
          onlyInformation: true,
          otherItemId: '',
        },
      });

      // update awards field (awardsReceived)
      const awards = toUserData.awards ?? [];
      awards.push({
        From: from,
        Amount: amount,
        Token: token,
        Date: Date.now()
      });
      toUserSnap.ref.update({
        awards: awards
      });
      // update awardsGiven field
      const awardsGiven = fromUserData.awardsGiven ?? [];
      awards.push({
        To: to,
        Amount: amount,
        Token: token,
        Date: Date.now()
      });
      fromUserSnap.ref.update({
        awardsGiven: awardsGiven
      });

      res.send({ success: true });
    } else {
      console.log('Error in controllers/walletController -> giveTip(), blockchain returned false', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/walletController -> giveTip()', err);
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

    const blockchainRes = await coinBalance.mint(type, from, to, amount, token, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
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

async function getImageURLFromCoinGeco(symbol: string): Promise<any> {
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

async function checkRoll(tokenSymbol: string): Promise<any> {
  console.log('--------------------------------calling checkRoll-----------------------------')
  const config: AxiosRequestConfig = {
    method: 'get',
    // headers: { 'x-amberdata-blockchain-id': 'ethereum-mainnet', 'x-api-key': AMBERDATA_API_KEY },
    url: 'https://app.tryroll.com/token/' + tokenSymbol
  }

  /**
   *  for the momento we didn't find a official api for rarible,
   *  so we implent this quick dirty hack :(  
   *  we check via this url if the token exist on rarible
   *  if exit the ok we say it exist 
   *  if fail we say it does not exist
   *  that is it.
   * 
   * */
  try {
    await axios(config);
    console.log('--------------------------------checkRoll try pass', tokenSymbol)
    return { exist: true, url: 'https://app.tryroll.com/token/' + tokenSymbol };
  } catch (error) {
    console.log('---------------------------------checkRoll try fail', error);
    return { exist: false, url: null };
  }

}

async function checkOpenSea(contractAddress: string): Promise<any> {
  console.log('--------------------------------calling open Sea-----------------------------')
  const config: AxiosRequestConfig = {
    method: 'get',
    // headers: { 'x-amberdata-blockchain-id': 'ethereum-mainnet', 'x-api-key': AMBERDATA_API_KEY },
    url: 'https://api.opensea.io/api/v1/asset_contract/' + contractAddress
  }

  let openSeaRes = await axios(config);
  // console.log('--------------------------------checkOpenSea', openSeaRes.data)
  if (openSeaRes && openSeaRes.data) {
    return {
      openSeaPage: 'https://opensea.io/assets/' + openSeaRes.data.collection.slug,
      openSeaImageUrl: openSeaRes.data.image_url
    };
  } else {
    return null;
  }
}

async function getTokenListFromAmberData(address: string): Promise<any> {
  console.log('----------------------------------getTokenListFromAmberData called')
  const config: AxiosRequestConfig = {
    method: 'get',
    headers: { 'x-amberdata-blockchain-id': 'ethereum-mainnet', 'x-api-key': AMBERDATA_API_KEY },
    url: 'https://web3api.io/api/v2/addresses/' + address + '/token-balances/latest?page=0&size=2'
  }

  let amberdataRes = await axios(config);
  if (amberdataRes.data.payload && parseFloat(amberdataRes.data.payload.totalRecords) > 0) {
    // console.log('registerUserEthAccount records', amberdataRes.data.payload.records)
    console.log('----------------------------------getTokenListFromAmberData has amber')
    const records = amberdataRes.data.payload.records;
    const preparedTokenListPromise = Promise.all(records.map(async (element) => {
      const imageUrlObj = await getImageURLFromCoinGeco(element.symbol);
      const roll = element.isERC721 ? await checkRoll(element.symbol) : null;
      const openSea = element.isERC721 ? await checkOpenSea(element.address) : null; // test erc721 contract 0xf766b3e7073f5a6483e27de20ea6f59b30b28f87
      return {
        tokenContractAddress: element.address,
        tokenName: element.name,
        tokenSymbol: element.symbol,
        tokenDecimal: element.decimals,
        tokenType: element.isERC20 ? 'CRYPTO' : element.isERC721 ? 'NFT' : element.isERC721 && roll && roll.exist ? 'SOCIAL' : 'UNKNOWN',
        balance: element.amount,
        images: imageUrlObj ? imageUrlObj : 'NO_IMAGE_FOUND',
        isOpenSea: element.isERC721 && openSea,
        openSeaImage: element.isERC721 && openSea ? openSea.openSeaImageUrl : 'NO_OPENSEA',
        openSeaPage: element.isERC721 && openSea ? openSea.openSeaPage : 'NO_OPENSEA',
        isRoll: roll && roll.exist ? roll.exist : false,
        rollPage: roll && roll.exist ? roll.url : 'NO_RARIBLE'
      }
    })
    );
    const preparedTokenList = await preparedTokenListPromise;
    return preparedTokenList;
  }
  return null;
}

module.exports.getUserRegisteredEthAccounts = async (req: express.Request, res: express.Response) => {
  const userId: any = req.body.priviUser.id;

  if (!userId) return res.status(400).json({ success: false });

  try {
    const docsSnaps = (await db.collection(collections.wallet)
      .doc(userId)
      .collection(collections.registeredEthAddress)
      .get()).docs;

    const data = docsSnaps.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false });
  }
}

module.exports.registerUserEthAccount = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const address = body.address;
    const userId = body.userId;
    console.log('registerUserEthAccount address/userId', address, userId)

    // get user address registered collection
    const walletRegisteredEthAddrSnap = await db.collection(collections.wallet)
      .doc(userId)
      .collection(collections.registeredEthAddress)
      .doc(address)
      .get();

    // check if address is already registered
    if (walletRegisteredEthAddrSnap.exists) {
      console.log('registerUserEthAccount: already exist, address', address, 'user', userId)
      const doc: any = walletRegisteredEthAddrSnap.data();
      // console.log('existing doc', doc, (Date.now() - doc.lastUpdate), MIN_TIME_FOR_ETH_ADDRESS_TOKEN_UPDTAE)
      if (doc.lastUpdate && ((Date.now() - doc.lastUpdate) > MIN_TIME_FOR_ETH_ADDRESS_TOKEN_UPDTAE)) {
        const preparedTokenList = await getTokenListFromAmberData(address);
        await db.collection(collections.wallet)
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
      await db.collection(collections.wallet)
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

module.exports.getUserTokenTypeBalanceHistory = async (req: express.Request, res: express.Response) => {
  try {
    let { userId } = req.query;
    userId = userId!.toString();
    const cryptoHistory: any[] = [];
    const socialHistory: any[] = [];
    const ftHistory: any[] = [];
    const nftHistory: any[] = [];
    const cryptoList: any[] = [];
    const socialList: any[] = [];
    const ftList: any[] = [];
    const nftList: any[] = [];

    const cryptoHistorySnap = await db.collection(collections.user).doc(userId).collection(collections.historyCrypto).orderBy('date', 'asc').get();
    const socialHistorySnap = await db.collection(collections.user).doc(userId).collection(collections.historySocial).orderBy('date', 'asc').get();
    const ftHistorySnap = await db.collection(collections.user).doc(userId).collection(collections.historyFT).orderBy('date', 'asc').get();
    const nftHistorySnap = await db.collection(collections.user).doc(userId).collection(collections.historyNFT).orderBy('date', 'asc').get();

    cryptoHistorySnap.forEach((doc) => cryptoHistory.push(doc.data()));
    socialHistorySnap.forEach((doc) => socialHistory.push(doc.data()));
    ftHistorySnap.forEach((doc) => ftHistory.push(doc.data()));
    nftHistorySnap.forEach((doc) => nftHistory.push(doc.data()));
    const retData = {
      cryptoHistory: cryptoHistory,
      socialHistory: socialHistory,
      ftHistory: ftHistory,
      nftHistory: nftHistory,
      cryptoList: cryptoList,
      socialList: socialList,
      ftList: ftList,
      nftList: nftList
    };
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/walletController -> getUserTokenTypeBalanceHistory()', err);
    res.send({ success: false });
  }
};

module.exports.getUserTokenListByType = async (req: express.Request, res: express.Response) => {
  try {
    let { address } = req.query;
    address = address!.toString();
    let typeToTokenListMap: any = {};
    // const cryptoList: any[] = [];
    const communityList: any[] = [];
    const socialList: any[] = [];
    const ftList: any[] = [];
    // const nftList: any[] = [];
    let blockchainRes = await coinBalance.getTokensOfAddress(address);
    if (blockchainRes && blockchainRes.success) {
      typeToTokenListMap = blockchainRes.output;
    }
    const communitySnaps = typeToTokenListMap.COMMUNITY ? await db.collection(collections.community).where('TokenSymbol', 'in', typeToTokenListMap.COMMUNITY).get() : [];
    const socialSnaps = typeToTokenListMap.SOCIAL ? await db.collection(collections.socialPools).where('TokenSymbol', 'in', typeToTokenListMap.SOCIAL).get() : [];
    const ftSnaps = typeToTokenListMap.FTPOD ? await db.collection(collections.podsFT).where('TokenSymbol', 'in', typeToTokenListMap.FTPOD).get() : [];
    communitySnaps.forEach((doc) => {
      const data: any = doc.data();
      const price = getMarketPrice(data.AMM, data.SupplyReleased, data.InitialSupply, data.TargetPrice, data.TargetSupply);
      communityList.push({
        Token: data.TokenSymbol,
        Name: data.TokenName,
        Type: 'COMMUNITY',
        Price: price,
        ChangeRate: 0
      })
    });
    socialSnaps.forEach((doc) => {
      const data: any = doc.data();
      const price = getMarketPrice(data.AMM, data.SupplyReleased, data.InitialSupply, data.TargetPrice, data.TargetSupply);
      socialList.push({
        Token: data.TokenSymbol,
        Name: data.TokenName,
        Type: 'SOCIAL',
        Price: price,
        ChangeRate: 0
      })
    });
    ftSnaps.forEach((doc) => {
      const data: any = doc.data();
      const price = getMarketPrice(data.AMM, data.SupplyReleased);
      ftList.push({
        Token: data.TokenSymbol,
        Name: data.TokenName,
        Type: 'FTPOD',
        Price: price,
        ChangeRate: 0
      })
    });
    const retData = {
      // cryptoList: cryptoList,
      socialList: socialList.concat(communityList),
      ftList: ftList,
      // nftList: nftList
    };
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/walletController -> getUserTokenListByType()', err);
    res.send({ success: false });
  }
};

module.exports.getUserOwnedTokens = async (req: express.Request, res: express.Response) => {
  try {
    let { userId } = req.query;
    userId = userId!.toString();

    const walletRegisteredEthAddrSnap = userId !== '' ? await db.collection(collections.wallet)
      .doc(userId)
      .collection(collections.registeredEthAddress).get() : null;

    if (walletRegisteredEthAddrSnap && !walletRegisteredEthAddrSnap.empty) {
      const docs = walletRegisteredEthAddrSnap.docs;
      let responsePromise: Promise<{ address: string; tokens: any; }[]> = Promise.all(docs.map(async (doc) => {
        const docObject: any = await (await doc.ref.get()).data();
        // console.log('---------------------- data', {address: doc.id, tokens: docObject.tokenList});
        return { address: doc.id, tokens: docObject.tokenList }
      })
      );
      const response = await responsePromise;
      res.send({ success: true, data: response });
    } else {
      res.send({ success: true, data: [] });
    }
  } catch (err) {
    console.log('Error in controllers/walletController -> getUserOwnedTokens()', err);
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


module.exports.getCryptosRateAsList = async (req: express.Request, res: express.Response) => {
  const data = await getRateOfChangeAsList();
  res.send({ success: true, data: data });
};

module.exports.getCryptosRateAsMap = async (req: express.Request, res: express.Response) => {
  const data = await getRateOfChangeAsMap();
  res.send({ success: true, data: data });
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

module.exports.getTransactions = async (req: express.Request, res: express.Response) => {
  try {
    const userAddress: any = req.query.userAddress;
    const retData: any[] = [];
    const historySnap = await db
      .collection(collections.transactions)
      .doc(userAddress)
      .collection(collections.history)
      .orderBy('Date', 'desc')
      .get();
    historySnap.forEach((doc) => {
      retData.push(doc.data());
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
// /**
//  * cron job scheduled every day at 00:00, daily saves the users balace sum for each type of tokens (crypto, ft...)
//  */
// exports.saveUserBalanceSum = cron.schedule('0 0 * * *', async () => {
//   try {
//     console.log('********* Wallet saveUserBalanceSum() cron job started *********');
//     const rateOfChange = await getRateOfChangeAsMap(); // rates of all except nft
//     const walletSnap = await db.collection(collections.wallet).get();
//     walletSnap.forEach(async (userWallet) => {
//       // crypto
//       let cryptoSum = 0; // in usd
//       const cryptoWallet = await userWallet.ref.collection(collections.cryptoToken).get();
//       cryptoWallet.forEach((doc) => {
//         if (rateOfChange[doc.id]) cryptoSum += rateOfChange[doc.id] * doc.data().Amount;
//         else cryptoSum += doc.data().Amount;
//       });
//       userWallet.ref.collection(collections.cryptoHistory).add({
//         date: Date.now(),
//         balance: cryptoSum,
//       });

//       // ft
//       let ftSum = 0; // in usd
//       const ftWallet = await userWallet.ref.collection(collections.ftToken).get();
//       ftWallet.forEach((doc) => {
//         if (rateOfChange[doc.id]) ftSum += rateOfChange[doc.id] * doc.data().Amount;
//         else ftSum += doc.data().Amount;
//       });
//       userWallet.ref.collection(collections.ftHistory).add({
//         date: Date.now(),
//         balance: ftSum,
//       });

//       // nft
//       let nftSum = 0; // in usd
//       const nftWallet = await userWallet.ref.collection(collections.nftToken).get();
//       nftWallet.forEach(async (doc) => {
//         const fundingToken = doc.data().FundingToken;
//         const nftPodSnap = await db
//           .collection(collections.podsNFT)
//           .doc(doc.id)
//           .collection(collections.priceHistory)
//           .orderBy('date', 'desc')
//           .limit(1)
//           .get();
//         let latestFundingTokenPrice = 1; // price of fundingToken per NF Token
//         if (nftPodSnap.docs[0].data().price) latestFundingTokenPrice = nftPodSnap.docs[0].data().price;
//         if (rateOfChange[fundingToken])
//           nftSum += rateOfChange[fundingToken] * latestFundingTokenPrice * doc.data().Amount;
//       });
//       userWallet.ref.collection(collections.nftHistory).add({
//         date: Date.now(),
//         balance: nftSum,
//       });

//       // social
//       let socialSum = 0; // in usd
//       const socialWallet = await userWallet.ref.collection(collections.socialToken).get();
//       socialWallet.forEach((doc) => {
//         if (rateOfChange[doc.id]) socialSum += rateOfChange[doc.id] * doc.data().Amount;
//         else socialSum += doc.data().Amount;
//       });
//       userWallet.ref.collection(collections.socialHistory).add({
//         date: Date.now(),
//         balance: socialSum,
//       });
//     });
//   } catch (err) {
//     console.log('Error in controllers/walletController -> saveUserBalanceSum()', err);
//   }
// });

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
