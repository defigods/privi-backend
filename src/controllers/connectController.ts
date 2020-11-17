import Web3 from 'web3';
import express from 'express';
import { withdraw as withdrawFab } from '../blockchain/coinBalance';
import { updateFirebase } from '../functions/functions';
import { ETH_PRIVI_ADDRESS, ETH_PRIVI_KEY, ETH_INFURA_KEY, ETH_SWAP_MANAGER_ADDRESS } from '../constants/configuration';
import { CONTRACT } from '../constants/ethContracts';
import SwapManagerContract from '../contracts/SwapManager.json'
let web3: any;
web3 = new Web3(new Web3.providers.HttpProvider(`https://ropsten.infura.io/v3/${ETH_INFURA_KEY}`));

type PromiseResponse = {
    success: boolean,
    error: string,
    data: any
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * @dev The minimum ABI to get ERC20 Token balance
 */
const miniABI = [
    // balanceOf
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "type": "function"
    },
    // decimals
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "type": "function"
    }
];

/**
 * @dev Generic function to execute Ethereum transactions with signature
 * @return @result: true if transaction was executed successfuly, or false otherwise
 * @return @error: error description if transaction failed
 * @return @res: transaction response  
 * @param params.fromAddress        From account
 * @param params.fromAddressKey     From private key   
 * @param params.encodedABI         Contract data 
 * @param params.contractAddress    Contract address
 */
const executeTX = (params: any) => {
    return new Promise<PromiseResponse>(async (resolve) => {

        // Prepare transaction
        const nonce = await web3.eth.getTransactionCount(params.fromAddress);
        const tx = {
            gas: 1500000,
            gasPrice: '30000000000',
            from: params.fromAddress,
            data: params.encodedABI,
            chainId: params.chainId,
            to: params.toAddress,
            nonce: nonce,
        };

        // Sign transaction
        web3.eth.accounts.signTransaction(tx, params.fromAddressKey)
            .then((signed: any) => {
                // Send transaction
                web3.eth.sendSignedTransaction(signed.rawTransaction)
                    .then(async (res: any) => {
                        console.log('Response: ', res)
                        resolve({ success: true, error: '', data: res });
                    })
                    .catch((err: string) => {
                        console.log('Error in ethUtils.js (A) -> executeTX(): ', err);
                        resolve({ success: false, error: err, data: null });
                    });
            })
            .catch((err: string) => {
                console.log('Error in ethUtils.js (B) -> executeTX(): ', err);
                resolve({ success: false, error: err, data: null });
            });
    });
};

const callBalance = (contractAddress: string, fromAddress: any) => {
    return new Promise<number>(async (resolve) => {
        if (contractAddress !== ZERO_ADDRESS) {
            let contract = new web3.eth.Contract(miniABI, contractAddress);
            await contract.methods.balanceOf(fromAddress).call()
                .then(result => {
                    resolve(web3.utils.fromWei((result), 'ether'));
                })
                .catch(err => {
                    console.log('Error in connectController.ts -> getERC20Balance(): [call]', err);
                    resolve(0);
                })
        } else {
            resolve(0);
        };
    });
};

/**
 * @dev Retrieves the balance of an ERC20 token contract for a given User
 * @returns {success: boolean, balance: number}
 *          success: 'true' if balance was found / 'false' otherwise
 *          balance: balance amount
 * @param token Target ERC20 token (e.g.: DAI, UNI, BAT)
 * @param fromAddress User account to retrieve the balance
 */
const getERC20Balance = async (req: express.Request, res: express.Response) => {
    const { fromAddress, chainId } = req.query;

    if (chainId === '3') {
        const amountDAI = await callBalance(CONTRACT.Ropsten.DAI, fromAddress);
        const amountUNI = await callBalance(CONTRACT.Ropsten.UNI, fromAddress);
        const amountWETH = await callBalance(CONTRACT.Ropsten.WETH, fromAddress);
        const result = {
            DAI: amountDAI,
            UNI: amountUNI,
            WETH: amountWETH,
        };
        res.send({
            success: true,
            amount: result,
        });
    } else {
        const result = {
            DAI: 0,
            UNI: 0,
            WETH: 0,
        };
        res.send({
            success: true,
            amount: result,
        });
    }

};

/**
 * @dev Withdraw ETH or ERC20 tokens from Fabric to Ethereum's User account
 * @return  status of the withdrwaw process:
 *          0: Fabric Failed / 1: Ethereum failed / 2: Fabric & Ethereum succeded
 * @param mode
 * @param chainId
 * @param publicId
 * @param amount
 * @param token
 * @param to 
 */
const withdraw = async (req: express.Request, res: express.Response) => {
    const body = req.body;
    const { action, chainId, publicId, amount, token, to } = req.body;
    let statusCode = '0';

    console.log('eeoo publicId: ', publicId, ' amount: ', amount, ' token: ', token,
        ' to: ', to, 'action: ', action);

    // Step 1: Withdraw from Fabric
    const response = await withdrawFab(publicId, amount, token);
    if (response && response.success) {
        await updateFirebase(response);
        statusCode = '1';

    } else {
        console.log('Error in connectController.ts -> withdraw(): Withdraw call in Fabric not successful');
    }

    // Step 2: Withdraw from Ethereum
    if (response && response.success) {
        const amountWei = web3.utils.toWei(String(amount));
        const contract = new web3.eth.Contract(SwapManagerContract.abi, ETH_SWAP_MANAGER_ADDRESS);
        const method = (action === 'WITHDRAW_ETH')
            ? contract.methods.withdrawEther(to, amountWei).encodeABI()
            : contract.methods.withdrawERC20Token(token, to, amountWei).encodeABI();
        const params = {
            chainId: chainId,
            fromAddress: ETH_PRIVI_ADDRESS,
            fromAddressKey: ETH_PRIVI_KEY,
            encodedABI: method,
            toAddress: ETH_SWAP_MANAGER_ADDRESS,
        };

        const { success } = await executeTX(params);
        (success) ? statusCode = '2' : null;
    };

    console.log('status: ', statusCode)
    res.send(statusCode);
};


module.exports = {
    getERC20Balance,
    withdraw,
};


// /**
//  * @dev Withdraw amount from Fabric to Ethereum's User account
//  * @returns c
//  *          e: f
//  * @param token Target ERC20 token (e.g.: DAI, UNI, BAT)
//  * @param fromAddress User account to retrieve the balance
//  */
// const withdrawERC20 = async (req: express.Request, res: express.Response) => {
//     const body = req.body;
//     const { chainId, publicId, amount, token, to } = req.body;
//     console.log('eeoo publicId: ', publicId, ' amount: ', amount, ' token: ', token, ' to: ', to);

//     const Contract = new web3.eth.Contract(SwapManagerContract.abi, ETH_SWAP_MANAGER_ADDRESS);
//     const amountWei = web3.utils.toWei(String(amount));

//     const params = {
//         chainId: chainId,
//         fromAddress: ETH_PRIVI_ADDRESS,
//         fromAddressKey: ETH_PRIVI_KEY,
//         encodedABI: Contract.methods.withdrawEther(to, amountWei).encodeABI(),
//         toAddress: ETH_SWAP_MANAGER_ADDRESS,
//     };

//     const { success, error, data } = await executeTX(params);
//     console.log('Result tx - success:', success, ' error: ', error, ' data: ', data);

//     (success)
//         ? res.send('Yeah!!')
//         : res.send('Shit!');
// };