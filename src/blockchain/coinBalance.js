const axios = require("axios");
const api = require("./blockchainApi");

module.exports.registerWallet = async (publicId) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/registerWallet", {
		PublicId: publicId,
	});
	return blockchainRes.data;
};


module.exports.blockchainTransfer = async (from, to, amount, coin, type) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/transfer", {
		Token: coin,
		From: from,
		To: to,
		Amount: amount,
		Type: type
	});
	return blockchainRes.data;
};

module.exports.blockchainBalance = async (publicId) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/balanceOf", {
		PublicId: publicId
	});
	return blockchainRes.data;
};

module.exports.blockchainHistory = async (publicId, timestamp) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/getHistory", {
		PublicId: publicId,
		Timestamp: timestamp
	});
	return blockchainRes.data;
};

module.exports.swap = async (publicId, amount, coin) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/swap", {
		PublicId: publicId,
		Token: coin,
		Amount: amount
	});
	return blockchainRes.data;
}

module.exports.withdraw = async (publicId, amount, coin) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/withdraw", {
		PublicId: publicId,
		Token: coin,
		Amount: amount
	});
	return blockchainRes.data;
}

module.exports.spendFunds = async (publicId, amount, coin, providerId) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/spendFunds", {
		PublicId: publicId,
		ProviderId: providerId,
		Token: coin,
		Amount: amount
	});
	return blockchainRes.data;
}

module.exports.getTokenList = async () => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/getTokenList", {
	});
	return blockchainRes.data;
}



