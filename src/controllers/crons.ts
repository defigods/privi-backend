const priviCreditController = require('./priviCreditController');
const lendingController = require('./lendingController');
const podController = require('./podController');
const connectController = require('./connectController');
const communityController = require('./communityController');
const walletController = require('./walletController');
const stakeController = require('./stakeController');
const votingController = require('./votingController');
const blogController = require('./blogController');
const priviDataController = require('./priviDataController');

// Credit
const priviCreditPayInterest = priviCreditController.payInterest;
const priviCreditManageHistory = priviCreditController.manageHistory;
// Lending
// const payInterest = lendingController.payInterest;
// const checkLiquidation = lendingController.checkLiquidation;
// Pods
// const podCheckLiquidation = podController.checkLiquidation;
// const podPayInterest = podController.payInterest;
const nftManagePriceHistory = podController.managePriceHistory;
// Connect
const checkTx = connectController.checkTx;
// Wallet
const saveUserBalanceSum = walletController.saveUserBalanceSum;
// Community
const trendingCommunities = communityController.setTrendingCommunities;
//const endVotations = communityController.endVotations;
// Staking
const manageStakedAmount = stakeController.manageStakedAmount;
const manageReturns = stakeController.manageReturns;
// Voting
const endVoting = votingController.endVoting;
// Blog
const removeStories = blogController.removeStories;
// Data
const campaignsDataNextMonth = priviDataController.campaignsDataNextMonth;
const campaignsDataNextDay = priviDataController.campaignsDataNextDay;

// all cron jobs go here, server.ts will import all these functions and start them
module.exports = {
    priviCreditPayInterest,
    priviCreditManageHistory,
    // payInterest,
    // checkLiquidation,
    // podCheckLiquidation,
    // podPayInterest,
    nftManagePriceHistory,
    checkTx,
    saveUserBalanceSum,
    //endVotations,
    manageStakedAmount,
    manageReturns,
    endVoting,
    removeStories,
    campaignsDataNextMonth,
    campaignsDataNextDay,
    trendingCommunities
}