const bip39 = require('bip39');
const hdkey = require("hdkey");
const { privateToPublic, publicToAddress, toChecksumAddress, bufferToHex } = require("ethereumjs-util");
const { PRIVI_WALLET_PATH } = require('../constants/configuration');

async function main(){
    const mnemonic = bip39.generateMnemonic();
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const path = PRIVI_WALLET_PATH;
    const hdwallet = await hdkey.fromMasterSeed(seed);
    const wallet = hdwallet.derive(path);
    const privateKey = '0x' + wallet._privateKey.toString('hex');
    const pubKey =  await privateToPublic(wallet._privateKey);   
    const publicKey = pubKey.toString("hex");
    const address = '0x' + await publicToAddress(pubKey).toString('hex');
    const addressCheckSum = await toChecksumAddress(address);

    console.log('mnemonic:', mnemonic)
    // console.log('wallet:', wallet)
    console.log('privateKey:', privateKey)
    console.log('publicKey:', publicKey)
    console.log('address:', address)
    console.log('addressCheckSum', addressCheckSum)
}

main();