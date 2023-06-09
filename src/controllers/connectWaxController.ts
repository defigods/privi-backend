// /* eslint-disable no-console */
// import express from 'express';
// import cron from 'node-cron';
// import { db } from '../firebase/firebase';
// import collections from '../firebase/collections';
// import { mint as mintOnHLF, burn as burnOnHLF } from '../blockchain/coinBalance.js';
// import { updateFirebase, updateFirebase as updateFireBaseBalance } from '../functions/functions';
// import coinBalance from '../blockchain/coinBalance.js';

// const { Api, JsonRpc } = require('eosjs');
// const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
// const fetch = require('node-fetch');
// const { TextEncoder, TextDecoder } = require('util');

// const rpc = new JsonRpc(process.env.WAX_NODE_URL, { fetch });
// const signatureProvider = new JsSignatureProvider([process.env.PRIVI_WAX_PRIVATE_KEY]);
// const api = new Api({
//   rpc,
//   signatureProvider,
//   textDecoder: new TextDecoder(),
//   textEncoder: new TextEncoder(),
// });

// const CRON_ACTION_LISTENING_FREQUENCY = 15;
// const Action = {
//   SWAP_WAX: 'SWAP_WAX',
//   WITHDRAW_WAX: 'WITHDRAW_WAX',
// };

// interface CommonActionData {
//   waxUserAccount: string,
//   priviUserAddress: string,
//   waxNetId: number,
//   action: string,
//   amount: number,
//   tokenName: string,
//   lastUpdateTimestamp: number,
// }

// interface InsertActionData extends CommonActionData {
//   priviTx: string,
//   waxTx: string,
//   random: number,
//   assetId: string,
//   priviUserPublicId: string,
//   description: string,
//   status: string,
// }

// interface SwapActionData extends CommonActionData {
//   actionFirebaseId: string,
//   priviUserPublicId: string,
//   waxTx: string,
//   random: number,
// }

// interface WithdrawActionData extends CommonActionData {
//   actionFirebaseId: string,
//   assetId: string,
// }

// /**
//  * @notice Stores a transaction in the database
//  */
// const insertAction = async (data: InsertActionData) => {
//   try {
//     await db
//       .collection(collections.waxActions)
//       .add(data);
//   } catch (err) {
//     throw new Error(err.message);
//   }
// };

// /**
//  * @notice Receives a transaction from the front-end
//  * and call function to store TX in the database (to be processed by a chron afterwards)
//  */
// const handleAction = async (req: express.Request, res: express.Response): Promise<void> => {
//   const { body } = req;

//   if (typeof body.action !== 'string') {
//     res.status(400).send();
//     return;
//   }

//   try {
//     await insertAction(body);
//     res.status(201).send();
//   } catch (err) {
//     res.status(500).send(err);
//   }
// };

// const updateActionStatus = async (actionFirebaseId, status) => {
//   await db.runTransaction(async (transaction) => {
//     transaction.update(db.collection(collections.waxActions).doc(actionFirebaseId), { status });
//   });
// };

// const updateActionPriviTx = async (actionFirebaseId, priviTx) => {
//   await db.runTransaction(async (transaction) => {
//     transaction.update(db.collection(
//       collections.waxActions,
//     ).doc(actionFirebaseId),
//     { priviTx });
//   });
// };

// const updateActionWaxTx = async (actionFirebaseId, waxTx) => {
//   await db.runTransaction(async (transaction) => {
//     transaction.update(db.collection(
//       collections.waxActions,
//     ).doc(actionFirebaseId),
//     { txHash: waxTx });
//   });
// };

// /**
//  * @notice Swap NFT from WAX to Fabric's User account
//  */
// const swap = async ({
//   actionFirebaseId,
//   priviUserAddress,
//   waxUserAccount,
//   amount,
//   tokenName,
//   action,
// }: SwapActionData) => {
//   // console.log('--> Swap: TX confirmed on WAX', actionFirebaseId, tokenName, amount, 'action', action);

//   let hlfResponse;
//   try {
//     hlfResponse = await mintOnHLF(
//       action,
//       waxUserAccount,
//       priviUserAddress,
//       amount,
//       tokenName,
//       'PRIVI',
//     );
//   } catch (err) {
//     // throw new Error(err.message);
//   }

//   if (!hlfResponse.success) {
//     // console.log(
//     //   'Error in connectWaxController -> swap(): Mint call in Fabric not successful',
//     //   hlfResponse.message,
//     // );
//     return;
//   }

//   console.log('--> Swap: TX confirmed on HLF: ', hlfResponse);

//   try {
//     await updateFireBaseBalance(hlfResponse);
//     await updateActionPriviTx(actionFirebaseId, hlfResponse.hash);
//     await updateActionStatus(actionFirebaseId, 'confirmed');
//   } catch (err) {
//     throw new Error(err.message);
//   }
// };

// const sendNft = async (waxUserAccount, assetId) => {
//   try {
//     return await api.transact({
//       actions: [{
//         account: 'simpleassets',
//         name: 'transfer',
//         authorization: [{
//           actor: process.env.PRIVI_WAX_ACCOUNT,
//           permission: 'active',
//         }],
//         data: {
//           from: process.env.PRIVI_WAX_ACCOUNT,
//           to: waxUserAccount,
//           assetids: [assetId],
//           memo: 'Privi Withdrawal',
//         },
//       }],
//     }, {
//       blocksBehind: 3,
//       expireSeconds: 30,
//     });
//   } catch (err) {
//     throw new Error(err.message);
//   }
// };

// /**
//  * @notice Withdraw NFT from Fabric to Wax User account
//  */
// const withdraw = async ({
//   actionFirebaseId,
//   priviUserAddress,
//   waxUserAccount,
//   amount,
//   action,
//   tokenName,
//   assetId,
//   lastUpdateTimestamp,
//   waxNetId,
// }: WithdrawActionData) => {
//   console.log('--> Withdraw: called with', actionFirebaseId, priviUserAddress, waxUserAccount, amount, action, tokenName, lastUpdateTimestamp, waxNetId);

//   try {
//     updateActionStatus(actionFirebaseId, 'inProgress');
//   } catch (err) {
//     throw new Error(err.message);
//   }

//   let hlfResponse;
//   try {
//     hlfResponse = await burnOnHLF(
//       action,
//       priviUserAddress,
//       waxUserAccount,
//       1,
//       tokenName,
//       'PRIVI',
//     );
//   } catch (err) {
//     throw new Error(err.message);
//   }

//   if (!hlfResponse.success) {
//     // set back swap doc to pending, so it can be tried later
//     try {
//       updateActionStatus(actionFirebaseId, 'pending');
//     } catch (err) {
//       throw new Error(err.message);
//     }
//     console.log(
//       'Error in connectWaxController -> withdraw(): Burn call in Fabric not successful',
//       hlfResponse.message,
//     );
//     return;
//   }

//   console.log('--> Withdraw: TX confirmed on HLF: ', hlfResponse);

//   try {
//     await updateFireBaseBalance(hlfResponse);
//     await updateActionPriviTx(actionFirebaseId, hlfResponse.hash);
//   } catch (err) {
//     throw new Error(err.message);
//   }

//   console.log('Perform withdraw:', 'token', tokenName, 'waxUserAccount', waxUserAccount, 'amount', amount);

//   let waxTxReceipt;
//   try {
//     waxTxReceipt = await sendNft(waxUserAccount, assetId);

//     console.log('--> Withdraw: TX confirmed on WAX', waxTxReceipt);
//     const waxTxId = waxTxReceipt.transaction_id;
//     try {
//       await updateActionStatus(actionFirebaseId, 'confirmed');
//       await updateActionWaxTx(actionFirebaseId, waxTxId);
//     } catch (err) {
//       throw new Error(err.message);
//     }
//   } catch (err) {
//     console.warn('--> Withdraw: TX failed on WAX', 'error', err.message);

//     // if send fail, then mint back fabric coin, and set status of swap to failed
//     try {
//       await updateActionStatus(actionFirebaseId, 'failed');
//     } catch (err2) {
//       throw new Error(err2.message);
//     }

//     let mintBackTransaction;
//     try {
//       mintBackTransaction = await mintOnHLF(
//         Action.SWAP_WAX,
//         waxUserAccount,
//         priviUserAddress,
//         1,
//         tokenName,
//         'PRIVI',
//       );
//     } catch (err2) {
//       throw new Error(err2.message);
//     }

//     console.warn('--> Withdraw: TX failed on WAX, mintback result:', mintBackTransaction);

//     if (!mintBackTransaction.success) {
//       updateActionStatus(actionFirebaseId, 'failed without return');
//       return;
//     }

//     try {
//       updateActionStatus(actionFirebaseId, 'failed with return');
//       updateFireBaseBalance(mintBackTransaction);
//       updateActionPriviTx(actionFirebaseId, mintBackTransaction.hash);
//     } catch (err2) {
//       throw new Error(err2.message);
//     }
//   }
// };

// /**
//  * @notice Cron that checks every X seconds if there is any transaction stored in the
//  * database to be processed. The field 'action' determines whether executing swap or withdraw
//  */
// cron.schedule(`*/${CRON_ACTION_LISTENING_FREQUENCY} * * * * *`, async () => {
//   //console.log('********* WAX <--> PRIVI Atomic Swaps cron job - STARTED - *********');

//   let snapshot;
//   try {
//     snapshot = await db
//       .collection(collections.waxActions)
//       .where('status', '==', 'pending')
//       .get();
//   } catch (err) {
//     throw new Error(err.message);
//   }

//   // if (snapshot.empty) {
//   //   return console.log('No pending action');
//   // }

//   const { docs } = snapshot;
//   const docsValues: any[] = Object.values(docs);
//   docsValues.forEach(async (doc: any) => {
//     const actionFirebaseId = doc.id;
//     const actionData = doc.data();

//     const {
//       waxTx,
//       waxUserAccount,
//       random,
//       priviUserPublicId,
//       priviUserAddress,
//       waxNetId,
//       action,
//       amount,
//       tokenName,
//       assetId,
//       lastUpdateTimestamp,
//     } = actionData;

//     switch (action) {
//       case Action.SWAP_WAX:
//         try {
//           await swap({
//             actionFirebaseId,
//             priviUserPublicId,
//             priviUserAddress,
//             waxUserAccount,
//             amount,
//             tokenName,
//             waxTx,
//             random,
//             action,
//             lastUpdateTimestamp,
//             waxNetId,
//           });
//         } catch (err) {
//           console.log(err.message);
//         }
//         break;
//       case Action.WITHDRAW_WAX:
//         try {
//           await withdraw({
//             actionFirebaseId,
//             priviUserAddress,
//             waxUserAccount,
//             amount,
//             action,
//             tokenName,
//             assetId,
//             lastUpdateTimestamp,
//             waxNetId,
//           });
//         } catch (err) {
//           console.log(err.message);
//         }
//         break;
//       default:
//         console.log('Unvalid action type');
//         break;
//     }

//     //console.log('********* WAX <--> PRIVI Atomic Swaps cron job - ENDED - *********');
//   });
// });

// interface RegisterNFTDto {
//   name: string;
//   category: string;
//   assetId: string;
// }

// const registerNFT = async (req: express.Request, res: express.Response): Promise<void> => {
//   const param: RegisterNFTDto = req.body;

//   if (!param.assetId) {
//     res.status(400).send({
//       message: 'assetId cannot be empty',
//       success: false,
//     });
//   }

//   try {
//     const blockChainRes = await coinBalance.registerToken(
//       param.name,
//       'NFT',
//       param.category,
//       0,
//       param.assetId,
//       'PRIVI',
//     );

//     if (blockChainRes && blockChainRes.success) {
//       updateFirebase(blockChainRes);
//     } else {
//       console.log('blockChainRes success = false', blockChainRes);
//     }
//   } catch (e) {
//     console.log('Error in controllers/connectWaxController -> registerNFT()', e);

//     res.send({
//       success: false,
//       message: e.message,
//     });
//   }
// };

// export default {
//   handleAction,
//   registerNFT,
// };
