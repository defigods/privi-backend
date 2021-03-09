const axios = require("axios");
const api = require("./blockchainApi");

module.exports.getStreaming = async (streamingId, caller) => {
	const config = {
		method: 'get',
		headers: { 'Content-Type': 'application/json' },
		url: api.blockchainPodMediaAPI + "/getStreaming",
		data: JSON.stringify({
			StreamingId: streamingId,
			Caller: caller,
		})
	}
	let blockchainRes = await axios(config);
	return blockchainRes.data;
};


module.exports.createStreaming = async (sender, receiver, amountPeriod, token,
	startDate, endDate, hash, signature, caller) => {
	let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/createStreaming", {
		SenderAddress: sender,
		ReceiverAddress: receiver,
		Frequency: 1.,
		AmountPerPeriod: amountPeriod,
		StreamingToken: token,
		StartingDate: startDate,
		EndingDate: endDate,
		Hash: hash,
		Signature: signature,
		Caller: caller,
	});
	return blockchainRes.data;
}

module.exports.initiateMediaLiveStreaming = async (listener, podAddress, mediaSymbol, hash, signature, caller) => {
	let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/initiateMediaLiveStreaming", {
		Listener: listener,
		PodAddress: podAddress,
		MediaSymbol: mediaSymbol,
		Hash: hash,
		Signature: signature,
		Caller: caller,
	});
	return blockchainRes.data;
}

module.exports.removeStreaming = async (streamingId, caller) => {
	let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/removeStreaming", {
		StreamingId: streamingId,
		Caller: caller,
	});
	return blockchainRes.data;
}