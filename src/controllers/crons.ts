const priviCreditController = require('./priviCreditController');
const lendingController = require('./lendingController');
const podController = require('./podController');
const connectController = require('./connectController');
const walletController = require('./walletController');

const priviCreditPayInterest = priviCreditController.payInterest;
const payInterest = lendingController.payInterest;
const checkLiquidation = lendingController.checkLiquidation;
// const podCheckLiquidation = podController.checkLiquidation;
// const podPayInterest = podController.payInterest;
const nftManagePriceHistory = podController.managePriceHistory;
const checkTx = connectController.checkTx;
const saveUserBalanceSum = walletController.saveUserBalanceSum;


// all cron jobs go here, server.ts will import all these functions and start them
module.exports = {
    priviCreditPayInterest,
    payInterest,
    checkLiquidation,
    // podCheckLiquidation,
    // podPayInterest,
    nftManagePriceHistory,
    checkTx,
    saveUserBalanceSum
}