const axios = require("axios");
const api = require("./blockchainApi");

module.exports.getToken = async (token, caller) => {
	const config = {
		method: 'get',
		headers: { 'Content-Type': 'application/json' },
		url: api.blockchainCoinBalanceAPI + "/getToken",
		data: JSON.stringify({
			Token: token,
			Caller: caller,
		})
	}
	let blockchainRes = await axios(config);
	return blockchainRes.data;
};

module.exports.balanceOf = async (userAddress, token) => {
	const config = {
		method: 'get',
		headers: { 'Content-Type': 'application/json' },
		url: api.blockchainCoinBalanceAPI + "/balanceOf",
		params: {
			PublicId: userAddress,
			Token: token,
		}
	}
	let blockchainRes = await axios(config);
	return blockchainRes.data;
};

module.exports.getBalancesOfAddress = async (userAddress, caller) => {
	const config = {
		method: 'get',
		headers: { 'Content-Type': 'application/json' },
		url: api.blockchainCoinBalanceAPI + "/getBalancesOfAddress",
		data: JSON.stringify({
			Address: userAddress,
			Caller: caller
		})
	}
	let blockchainRes = await axios(config);
	return blockchainRes.data;
};

module.exports.getTokensOfAddress = async (userAddress) => {
	const config = {
		method: 'get',
		headers: { 'Content-Type': 'application/json' },
		url: api.blockchainCoinBalanceAPI + "/getTokensOfAddress",
		params: {
			Address: userAddress,
		}
	}
	let blockchainRes = await axios(config);
	return blockchainRes.data;
};

module.exports.getTokensOfAddressByType = async (userAddress, tokenType, caller) => {
	const config = {
		method: 'get',
		headers: { 'Content-Type': 'application/json' },
		url: api.blockchainCoinBalanceAPI + "/getTokensOfAddressByType",
		data: JSON.stringify({
			Address: userAddress,
			TokenType: tokenType,
			Caller: caller,
		})
	}
	let blockchainRes = await axios(config);
	return blockchainRes.data;
};

module.exports.getBalancesByType = async (userAddress, type, caller) => {
	const config = {
		method: 'get',
		headers: { 'Content-Type': 'application/json' },
		url: api.blockchainCoinBalanceAPI + "/getBalancesByType",
		data: JSON.stringify({
			PublicId: userAddress,
			Type: type,
			Caller: caller,
		})
	}
	let blockchainRes = await axios(config);
	return blockchainRes.data;
};

module.exports.getTokenListByType = async (tokenType, caller) => {
	const config = {
		method: 'get',
		headers: { 'Content-Type': 'application/json' },
		url: api.blockchainCoinBalanceAPI + "/getTokenListByType",
		data: JSON.stringify({
			TokenType: tokenType,
			Caller: caller,
		})
	}
	let blockchainRes = await axios(config);
	return blockchainRes.data;
};

module.exports.registerToken = async (name, type, symbol, supply, addressId, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/registerToken", {
		Name: name,
		Type: type,
		Symbol: symbol,
		Supply: supply,
		AddressId: addressId,
		Caller: caller,
	});
	return blockchainRes.data;
};

module.exports.updateTokenInfo = async (name, tokenType, symbol, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/updateTokenInfo", {
		Name: name,
		TokenType: tokenType,
		Symbol: symbol,
		Caller: caller,
	});
	return blockchainRes.data;
};

module.exports.transfer = async (from, to, amount, coin, type, hash, signature, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/transfer", {
		Token: coin,
		From: from,
		To: to,
		Amount: amount,
		Type: type,
		Hash: hash,
		Signature: signature,
		Caller: caller
	});
	return blockchainRes.data;
};


module.exports.mint = async (type, from, to, amount, coin, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/mint", {
		From: from,
		To: to,
		Type: type,
		Token: coin,
		Amount: amount,
		Caller: caller
	});
	return blockchainRes.data;
}

module.exports.burn = async (type, from, to, amount, coin, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/burn", {
		From: from,
		To: to,
		Type: type,
		Token: coin,
		Amount: amount,
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


module.exports.multitransfer = async (arrayObj, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/multitransfer", {
		Multitransfer: arrayObj,
		Caller: caller,
	});
	return blockchainRes.data;
}

module.exports.createStreaming = async (senderAddress, receiverAddress, frequency, amountPerPeriod, streamingToken, startingDate, endingDate, hash, signature, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/createStreaming", {
		SenderAddress: senderAddress,
		ReceiverAddress: receiverAddress,
		Frequency: frequency,
		AmountPerPeriod: amountPerPeriod,
		StreamingToken: streamingToken,
		StartingDate: startingDate,
		EndingDate: endingDate,
		Hash: hash,
		Signature: signature,
		Caller: caller,
	});
	return blockchainRes.data;
}

module.exports.getUserStreamings = async (userAddress, token, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/getUserStreamings", {
		UserAddress: userAddress,
		Token: token,
		Caller: caller,
	});
	return blockchainRes.data;
}

module.exports.getStreaming = async (streamingId, caller) => {
	let blockchainRes = await axios.post(api.blockchainCoinBalanceAPI + "/getStreaming", {
		StreamingId: streamingId,
		Caller: caller,
	});
	return blockchainRes.data;
}