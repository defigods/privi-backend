import express from 'express';
import cron from 'node-cron';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';
import { mint as mintOnHLF, burn as burnOnHLF } from '../blockchain/coinBalance.js';
import { updateFirebase as updateFireBaseBalance } from '../functions/functions';

const { Api, JsonRpc } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('util');

const rpc = new JsonRpc(process.env.WAX_NODE_URL, { fetch });
const signatureProvider = new JsSignatureProvider([process.env.PRIVI_WAX_PRIVATE_KEY]);
const api = new Api({
  rpc,
  signatureProvider,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder(),
});

const CRON_ACTION_LISTENING_FREQUENCY = 15;
const Action = {
  SWAP_WAX: 'SWAP_WAX',
  WITHDRAW_WAX: 'WITHDRAW_WAX',
};

interface CommonActionData {
  waxUserAddress: string,
  priviUserAddress: string,
  waxNetId: number,
  action: string,
  amount: number,
  tokenSymbol: string,
  lastUpdateTimestamp: number,
}

interface InsertActionData extends CommonActionData {
  priviTx: string,
  waxTx: string,
  random: number,
  assetId: string,
  priviUserPublicId: string,
  description: string,
  status: string,
}

interface SwapActionData extends CommonActionData {
  actionFirebaseId: string,
  priviUserPublicId: string,
  waxTx: string,
  random: number,
}

interface WithdrawActionData extends CommonActionData {
  actionFirebaseId: string,
  assetId: string,
}

/**
 * @notice Stores a transaction in the database
 */
const insertAction = async (data: InsertActionData) => {
  try {
    await db
      .collection(collections.waxActions)
      .add(data);
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * @notice Receives a transaction from the front-end
 * and call function to store TX in the database (to be processed by a chron afterwards)
 */
const handleAction = async (req: express.Request, res: express.Response): Promise<void> => {
  const { body } = req;

  if (typeof body.action !== 'string') {
    res.status(400).send();
    return;
  }

  try {
    await insertAction(body);
    res.status(201).send();
  } catch (err) {
    res.status(500).send(err);
  }
};

const updateActionStatus = async (actionFirebaseId, status) => {
  await db.runTransaction(async (transaction) => {
    transaction.update(db.collection(collections.waxActions).doc(actionFirebaseId), { status });
  });
};

const updateActionPriviTx = async (actionFirebaseId, priviTx) => {
  await db.runTransaction(async (transaction) => {
    transaction.update(db.collection(
      collections.waxActions,
    ).doc(actionFirebaseId),
    { priviTx });
  });
};

/**
 * @notice Swap NFT from WAX to Fabric's User account
 */
const swap = async ({
  actionFirebaseId,
  priviUserAddress,
  waxUserAddress,
  amount,
  tokenSymbol,
  action,
}: SwapActionData) => {
  console.log('--> Swap: TX confirmed on WAX', actionFirebaseId, tokenSymbol, amount, 'action', action);

  let hlfResponse;
  try {
    hlfResponse = await mintOnHLF(
      action,
      waxUserAddress,
      priviUserAddress,
      amount,
      tokenSymbol,
      'PRIVI',
    );
  } catch (err) {
    throw new Error(err.message);
  }

  if (!hlfResponse.success) {
    console.log(
      'Error in connectWaxController -> swap(): Mint call in Fabric not successful',
      hlfResponse.message,
    );
    return;
  }

  console.log('--> Swap: TX confirmed on HLF: ', hlfResponse);

  try {
    await updateFireBaseBalance(hlfResponse);
    await updateActionPriviTx(actionFirebaseId, hlfResponse.hash);
    await updateActionStatus(actionFirebaseId, 'confirmed');
  } catch (err) {
    throw new Error(err.message);
  }
};

const sendNft = async (waxUserAddress, assetId) => {
  try {
    await api.transact({
      actions: [{
        account: 'simpleassets',
        name: 'transfer',
        authorization: [{
          actor: process.env.PRIVI_WAX_ACCOUNT,
          permission: 'active',
        }],
        data: {
          from: process.env.PRIVI_WAX_ACCOUNT,
          to: waxUserAddress,
          assetid1: assetId,
          memo: '',
        },
      }],
    });
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * @notice Withdraw NFT from Fabric to Wax User account
 */
const withdraw = async ({
  actionFirebaseId,
  priviUserAddress,
  waxUserAddress,
  amount,
  action,
  tokenSymbol,
  assetId,
  lastUpdateTimestamp,
  waxNetId,
}: WithdrawActionData) => {
  console.log('--> Withdraw: called with', actionFirebaseId, priviUserAddress, waxUserAddress, amount, action, tokenSymbol, lastUpdateTimestamp, waxNetId);

  try {
    updateActionStatus(actionFirebaseId, 'inProgress');
  } catch (err) {
    throw new Error(err.message);
  }

  let hlfResponse;
  try {
    hlfResponse = await burnOnHLF(
      action,
      priviUserAddress,
      waxUserAddress,
      1,
      tokenSymbol,
      'PRIVI',
    );
  } catch (err) {
    throw new Error(err.message);
  }

  if (!hlfResponse.success) {
    // set back swap doc to pending, so it can be tried later
    try {
      updateActionStatus(actionFirebaseId, 'pending');
    } catch (err) {
      throw new Error(err.message);
    }
    console.log(
      'Error in connectWaxController -> withdraw(): Burn call in Fabric not successful',
      hlfResponse.message,
    );
    return;
  }

  console.log('--> Withdraw: TX confirmed on HLF: ', hlfResponse);

  try {
    await updateFireBaseBalance(hlfResponse);
    await updateActionPriviTx(actionFirebaseId, hlfResponse.hash);
  } catch (err) {
    throw new Error(err.message);
  }

  console.log('Perform withdraw:', 'token', tokenSymbol, 'waxUserAddress', waxUserAddress, 'amount', amount);

  try {
    await sendNft(waxUserAddress, assetId);
  } catch (err) {
    console.warn('--> Withdraw: TX failed on WAX', 'error', err.message);

    // if send fail, then mint back fabric coin, and set status of swap to failed
    try {
      await updateActionStatus(actionFirebaseId, 'failed');
    } catch (err2) {
      throw new Error(err2.message);
    }

    /** ********
     * TO ADAPT
     ******* */
    // const mintBack = await mintOnHLF(
    //   action === Action.WITHDRAW_ERC721 ? 'NFTPOD' : 'CRYPTO',
    //   '0x0000000000000000000000000000000000000000',
    //   fromFabricAddress,
    //   action === Action.WITHDRAW_ERC721 ? 1 : amount,
    //   token,
    //   'PRIVI',
    // );

    // if (mintBack.success) {
    //   console.warn('--> Withdraw: TX failed in Ethereum, mintback result:\n', mintBack);
    //   updateStatusOneToOneSwap(swapDocId, 'failed with return');
    //   updateFirebase(mintBack);
    //   updatePriviTxOneToOneSwap(swapDocId, mintBack.hash);
    // } else {
    //   console.warn('--> Withdraw: TX failed in Ethereum, mintback result:', mintBack.success);
    //   updateStatusOneToOneSwap(swapDocId, 'failed without return');
    // }
  }

  console.log('--> Withdraw: TX confirmed on WAX', dataFromTx);
  const waxTxHash = dataFromTx.transactionHash;
  try {
    await updateStatusOneToOneSwap(actionFirebaseId, 'confirmed');
    await updateTxOneToOneSwap(actionFirebaseId, waxTxHash);
  } catch (err) {
    throw new Error(err.message);
  }
};

/**
 * @notice Cron that checks every X seconds if there is any transaction stored in the
 * database to be processed. The field 'action' determines whether executing swap or withdraw
 */
cron.schedule(`*/${CRON_ACTION_LISTENING_FREQUENCY} * * * * *`, async () => {
  console.log('********* WAX <--> PRIVI Atomic Swaps cron job - STARTED - *********');

  let snapshot;
  try {
    snapshot = await db
      .collection(collections.waxActions)
      .where('status', '==', 'pending')
      .get();
  } catch (err) {
    throw new Error(err.message);
  }

  if (snapshot.empty) {
    return console.log('No pending action');
  }

  const { docs } = snapshot;
  const docsValues: any[] = Object.values(docs);
  docsValues.forEach(async (doc: any) => {
    const actionFirebaseId = doc.id;
    const actionData = doc.data();

    const {
      waxTx,
      waxUserAddress,
      random,
      priviUserPublicId,
      priviUserAddress,
      waxNetId,
      action,
      amount,
      tokenSymbol,
      assetId,
      lastUpdateTimestamp,
    } = actionData;

    switch (action) {
      case Action.SWAP_WAX:
        try {
          await swap({
            actionFirebaseId,
            priviUserPublicId,
            priviUserAddress,
            waxUserAddress,
            amount,
            tokenSymbol,
            waxTx,
            random,
            action,
            lastUpdateTimestamp,
            waxNetId,
          });
        } catch (err) {
          console.log(err.message);
        }
        break;
      case Action.WITHDRAW_WAX:
        try {
          await withdraw({
            actionFirebaseId,
            priviUserAddress,
            waxUserAddress,
            amount,
            action,
            tokenSymbol,
            assetId,
            lastUpdateTimestamp,
            waxNetId,
          });
        } catch (err) {
          console.log(err.message);
        }
        break;
      default:
        console.log('Unvalid action type');
        break;
    }

    console.log('********* WAX <--> PRIVI Atomic Swaps cron job - ENDED - *********');
  });
});

module.exports = {
  handleAction,
};
