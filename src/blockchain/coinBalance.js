const axios = require("axios");
const api = require("./blockchainApi");

// module.exports.registerWallet = async (publicId) => {
// 	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/registerWallet", {
// 		PublicId: publicId,
// 	});
// 	return blockchainRes.data;
// };


module.exports.transfer = async (from, to, amount, coin, id, date, type, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/transfer", {
		Token: coin,
		From: from,
		To: to,
		Amount: amount,
		Id: id,
		Date: date,
		Type: type,
		Caller: caller
	});
	return blockchainRes.data;
};

module.exports.balanceOf = async (publicId, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/balanceOf", {
		PublicId: publicId,
		Caller: caller
	});
	return blockchainRes.data;
};

module.exports.getHistory = async (publicId, timestamp, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/getHistory", {
		PublicId: publicId,
		Timestamp: timestamp,
		Caller: caller
	});
	return blockchainRes.data;
};

module.exports.swap = async (publicId, amount, coin, date, txnId, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/swap", {
		PublicId: publicId,
		Token: coin,
		Amount: amount,
		Date: date,
		TxnId: txnId,
		Caller: caller
	});
	return blockchainRes.data;
}

module.exports.withdraw = async (publicId, amount, coin, date, txnId, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/withdraw", {
		PublicId: publicId,
		Token: coin,
		Amount: amount,
		Date: date,
		TxnId: txnId,
		Caller: caller
	});
	return blockchainRes.data;
}

module.exports.spendFunds = async (publicId, amount, coin, providerId, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/spendFunds", {
		PublicId: publicId,
		ProviderId: providerId,
		Token: coin,
		Amount: amount,
		Caller: caller,
	});
	return blockchainRes.data;
}

module.exports.getTokenList = async () => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/getTokenList", {
	});
	return blockchainRes.data;
}

module.exports.multitransfer = async (arrayObj, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/multitransfer", {
		Multitransfer: arrayObj,
		Caller: caller,
	});
	return blockchainRes.data;
}

