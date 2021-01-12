const bip39 = require('bip39');
const { hdkey } = require('ethereumjs-wallet');
const { PRIVI_WALLET_PATH } = require('../constants/configuration');

async function main(){
    const mnemonic = bip39.generateMnemonic();
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const path = PRIVI_WALLET_PATH
    const hdwallet = hdkey.fromMasterSeed(seed)
    const wallet = hdwallet.derivePath(path).getWallet()
    const address = `0x${wallet.getAddress().toString('hex')}`
    const privateKey = wallet.getPrivateKey().toString('hex')

    console.log('mnemonic:', mnemonic)
    console.log('address:', address)
    console.log('privateKey:', privateKey)
}

main();