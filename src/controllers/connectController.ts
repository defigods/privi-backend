import Web3 from 'web3';
import axios from 'axios';
import express from 'express';
import { Transaction } from 'ethereumjs-tx';
import api from '../blockchain/blockchainApi';

const getFabricBalance = async (req: express.Request, res: express.Response) => {
    const args = req.query;
    console.log('args: ', args.publicId);
    const blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/registerWallet", {
		PublicId: args.publicId,
	});
	return blockchainRes.data;
}




module.exports = {
    getFabricBalance,
};


/*
//Ethereum withdraw function
const transferEthWithdraw = async (req: express.Request, res: express.Response) => {
    const body = req.body;
    const fromAccount = body.fromAccount;
    const amount = body.amount;
    const chainId = body.chainId;
    const toAccount = body.toAccount;
    let web3js: any;
    web3js = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/v3/eda1216d6a374b3b861bf65556944cdb"));
    // TODO: [SECURITY] Retrieve PK in a secure way
    let privateKey1 = 'fa32c34f16b54be767b94aad4f86797bb3966c325c3e0c300b1ea3f4f8d333b6';
    let senderPrivate = Buffer.from(privateKey1, 'hex');
    web3js.eth.getTransactionCount(fromAccount, async (err, txCount) => {

        let estimates_gas = await web3js.eth.estimateGas({ from: fromAccount, to: toAccount, amount: web3js.utils.toWei(amount, 'ether') })

        let gasPrice_bal = await web3js.eth.getGasPrice();
        let gasPrice = web3js.utils.toHex(gasPrice_bal * 2);

        console.log("gasPrice", gasPrice);
        let gasLimit = web3js.utils.toHex(estimates_gas * 2);

        let transactionFee_wei = gasPrice * gasLimit;
        let transactionFee = web3js.utils.fromWei(web3js.utils.toBN(transactionFee_wei), 'ether');

        let nonce = web3js.utils.toHex(txCount)
        let nonceHex = web3js.utils.toHex(nonce);
        console.log(gasPrice, "------------", gasLimit)
        const txObject = {
            nonce: nonceHex,
            to: toAccount,
            value: web3js.utils.toHex(web3js.utils.toWei(amount, 'ether')),
            gasLimit: gasLimit,
            gasPrice: gasPrice
        };
        console.log('tx obj ', txObject)

        const tx = new Transaction(txObject, { chain: 3, hardfork: 'petersburg' });
        //const tx = new Tx(txObject,{chain:'ropsten', hardfork: 'petersburg'}).Transaction;
        //const tx = new Tx(txObject, { chain: 'mainnet', hardfork: 'petersburg' });
        //const tx = new Tx.Transaction(txObject, { chain: 'mainnet', hardfork: 'petersburg' });

        tx.sign(senderPrivate)
        //tx.sign('fa32c34f16b54be767b94aad4f86797bb3966c325c3e0c300b1ea3f4f8d333b6')

        const serializedTx = tx.serialize();
        const raw = '0x' + serializedTx.toString('hex');

        serializedTx.toString('hex')

        // Broadcast the transaction
        web3js.eth.sendSignedTransaction(raw, (err, txHash) => {

            if (err) {
                console.log("err", err);
                // let valid_pass = { success: 0, msg: "Transaction error" };
                // let valid_trans = JSON.stringify(valid_pass);
                // console.log(valid_trans);
                res.send({
                    tx_hash: "errer occurred!"
                })
            }
            else {
                console.log('txHash:', txHash, 'transfess', transactionFee);
                // let valid_pass = { success: 1, msg: 'Your transaction is done successfully.', txHash: txHash, transactionFee: transactionFee };
                // let valid_trans = JSON.stringify(valid_pass);
                // console.log(valid_trans);
                res.send({
                    tx_hash: txHash
                })
            }
            // Now go check etherscan to see the transaction!
        })
    })

};
*/
/*
exports.balanceToken = async (req: express.Request, res: express.Response) => {
    const body = req.body;
    const userId = body.fromAccount;
    let web3js: any;
    web3js = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/v3/eda1216d6a374b3b861bf65556944cdb"));
    let tokenContractABI= [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"donation","type":"address"}],"name":"Donation","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"mintToken","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokens","type":"uint256"},{"internalType":"address[]","name":"donation","type":"address[]"},{"internalType":"address","name":"admin","type":"address"}],"name":"transferAndDonateTo","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]
    console.log('Function check');

    let tokenContract = new web3js.eth.Contract(tokenContractABI,"0x1e90FCa11Ad4E257F201fab991Ce306eF47663A4");

    await tokenContract.methods.balanceOf(userId).call().then(function    (result) {

      let count_balance = parseInt(result);
      let rown_bal=count_balance/Math.pow(10,10);
      // res.json({status:1,msg:"success",data:{ref_code,wallet_details,usdValue,etherValue,btcValue,   import_wallet_id,rown_bal}});
      // res.render('front/dashboard',{err_msg,success_msg,ref_code,wallet_details,usdValue,etherValue,btcValue,    import_wallet_id,balance,rown_bal,layout: false,session: req.session,crypto});
      console.log('Balance ----',rown_bal);
      res.send({
          'balanceToken': rown_bal
        })
    });
};
*/

/*
const getEthBalance = async (req: express.Request, res: express.Response) => {
    try {

    } catch (err) {
        console.log('Error in controllers/lendingController -> repayFunds(): ', err);
        res.send({ success: false });
    }
};
*/

/*
//Ethereum Token withdraw function
exports.transferTokenWithdraw = async (req: express.Request, res: express.Response) => {
    const body = req.body;
    const fromAccount = body.fromAccount;
    const amount = body.amount;
    const chainId = body.chainId
    const toAccount = body.toAccount;

    let web3js: any;
    web3js = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/v3/eda1216d6a374b3b861bf65556944cdb"));

    let tokenContractABI= [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"donation","type":"address"}],"name":"Donation","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"mintToken","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokens","type":"uint256"},{"internalType":"address[]","name":"donation","type":"address[]"},{"internalType":"address","name":"admin","type":"address"}],"name":"transferAndDonateTo","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]
    let user1= tokenContractABI;
    let tokenContract = new web3js.eth.Contract(user1,"0x1e90FCa11Ad4E257F201fab991Ce306eF47663A4");

    // TODO: [SECURITY] Retrieve PK in a secure way
    let privateKey1 = 'fa32c34f16b54be767b94aad4f86797bb3966c325c3e0c300b1ea3f4f8d333b6';
    let senderPrivate = Buffer.from(privateKey1, 'hex');
    let count;

    await tokenContract.methods.balanceOf(fromAccount).call().then(function (result) {

        let weiAmout = amount * 1e10;

    web3js.eth.getTransactionCount(fromAccount, async (err, txCount) => {

        // let gasLimitNew = web3js.eth.getBlock("latest").gasLimit;
        // console.log("gasLimit: " , gasLimitNew);


        let nonce = web3js.utils.toHex(txCount)

        const txObject = {
            "from": fromAccount,
            "gasPrice": web3js.utils.toHex(2 * 1e9),
            "gasLimit": web3js.utils.toHex(210000),
            "to": '0x1e90FCa11Ad4E257F201fab991Ce306eF47663A4',
            "value": "0x0",
            "data": tokenContract.methods.transfer(toAccount, amount).encodeABI(),
            "nonce": nonce
        };
        console.log('tx obj ',txObject)

        const tx = new Transaction(txObject,{chain: 3, hardfork: 'petersburg'});
        //const tx = new Tx(txObject,{chain:'ropsten', hardfork: 'petersburg'}).Transaction;
        //const tx = new Tx(txObject, { chain: 'mainnet', hardfork: 'petersburg' });
        //const tx = new Tx.Transaction(txObject, { chain: 'mainnet', hardfork: 'petersburg' });

        tx.sign(senderPrivate)
        //    tx.sign('fa32c34f16b54be767b94aad4f86797bb3966c325c3e0c300b1ea3f4f8d333b6')

        const serializedTx = tx.serialize();
        const raw = '0x' + serializedTx.toString('hex');
        serializedTx.toString('hex')

        // Broadcast the transaction
        web3js.eth.sendSignedTransaction(raw, (err, txHash) => {
            if (err) {
                console.log("err", err);
                res.send({
                    tx_hash: "errer occurred!"
                })
            }
            else {
                console.log('txHash:', txHash );
                res.send({
                    tx_hash: txHash
                })
            }
            // Now go check etherscan to see the transaction!
        })
    })

    });
};
*/