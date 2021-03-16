const axios = require("axios");
const api = require("./blockchainApi");

module.exports.initiatePod = async (podInfo, medias, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/initiatePod", {
        PodInfo: podInfo,
        Medias: medias,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.registerMedia = async (requester, podAddress, mediaSymbol, type, paymentType, copies, royalty, fundingToken,
                                      releaseDate, pricePerSecond, price, isRecord, recordToken, recordPaymentType,
                                      recordPrice, recordPricePerSecond, recordCopies, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/registerMedia", {
        Requester: requester,
        PodAddress: podAddress,
        MediaSymbol: mediaSymbol,
        Type: type,
        PaymentType: paymentType,
        Copies: copies,
        Royalty: royalty,
        FundingToken: fundingToken,
        ReleaseDate: releaseDate,
        PricePerSecond: pricePerSecond,
        Price: price,
        IsRecord: isRecord,
        RecordToken: recordToken,
        RecordPaymentType: recordPaymentType,
        RecordPrice: recordPrice,
        RecordPricePerSecond: recordPricePerSecond,
        RecordCopies: recordCopies,
        RecordRoyalty: royalty,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.uploadMedia = async (mediaSymbol, podAddress, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/initiatePod", {
        MediaSymbol: mediaSymbol,
        PodAddress: podAddress,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};


module.exports.investPod = async (investor, podAddress, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/investPod", {
        Investor: investor,
        PodAddress: podAddress,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.buyMediaToken = async (buyer, podAddress, mediaSymbol, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/initiatePod", {
        Buyer: buyer,
        PodAddress: podAddress,
        MediaSymbol: mediaSymbol,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.buyPodTokens = async (trader, podAddress, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/buyPodTokens", {
        Trader: trader,
        PodAddress: podAddress,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.sellPodTokens = async (trader, podAddress, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/sellPodTokens", {
        Trader: trader,
        PodAddress: podAddress,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.updateCollabs = async (podAddress, mediaSymbol, collabs, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/updateCollabs", {
        PodAddress: podAddress,
        MediaSymbol: mediaSymbol,
        Collabs: collabs,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};





// ------------------- STREAMING -----------------------

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

module.exports.initiateMediaLiveStreaming = async (podAddress, mediaSymbol, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/initiateMediaLiveStreaming", {
        PodAddress: podAddress,
        MediaSymbol: mediaSymbol,
        Hash: hash,
        Signature: signature,
        Caller: caller,
    });
    return blockchainRes.data;
}

module.exports.enterMediaLiveStreaming = async (listener, podAddress, mediaSymbol, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/enterMediaLiveStreaming", {
        Listener: listener,
        PodAddress: podAddress,
        MediaSymbol: mediaSymbol,
        Hash: hash,
        Signature: signature,
        Caller: caller,
    });
    return blockchainRes.data;
}

module.exports.exitMediaLiveStreaming = async (listener, podAddress, mediaSymbol, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodMediaAPI + "/exitMediaLiveStreaming", {
        Listener: listener,
        PodAddress: podAddress,
        MediaSymbol: mediaSymbol,
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