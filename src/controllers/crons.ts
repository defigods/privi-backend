const priviCreditController = require('./priviCreditController');
const lendingController = require('./lendingController');

const managePRIVIcredits = priviCreditController.managePRIVIcredits;
const payInterest = lendingController.payInterest;
const checkLiquidation = lendingController.checkLiquidation;


// all cron jobs goes here, server.ts will import all these functions and start them
module.exports = {
    managePRIVIcredits,
    // payInterest,
    // checkLiquidation,
}