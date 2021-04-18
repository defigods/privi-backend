const axios = require("axios");
const api = require("./blockchainApi");

// TODO: add hash (calculated from FE)

module.exports.createMedia = async (creatorAddress, mediaName, mediaSymbol, viewingType, viewingToken, viewPrice, isStreamingLive, isRecord,
    copies, royalty, nftPrice, nftToken, type, releaseDate, sharingPct, caller) => {
    let blockchainRes = await axios.post(api.blockchainMediaAPI + "/createMedia", {
        Data: {
            CreatorAddress: creatorAddress,
            MediaName: mediaName,
            MediaSymbol: mediaSymbol,
            ViewConditions: {
                ViewingType: viewingType,
                ViewingToken: viewingToken,
                Price: viewPrice,
                IsStreamingLive: isStreamingLive,
                IsRecord: isRecord,
            },
            NftConditions: {
                Copies: copies,
                Royalty: royalty,
                Price: nftPrice,
                NftToken: nftToken
            },
            Type: type,
            ReleaseDate: releaseDate,
            SharingPct: sharingPct
        },
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.buyMediaNFT = async (mediaSymbol, address, caller) => {
    let blockchainRes = await axios.post(api.blockchainMediaAPI + "/buyMediaNFT", {
        Data: {
            MediaSymbol: mediaSymbol,
            Address: address,
        },
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.openNFT = async (mediaSymbol, address, sharingId, caller) => {
    let blockchainRes = await axios.post(api.blockchainMediaAPI + "/openNFT", {
        Data: {
            MediaSymbol: mediaSymbol,
            Address: address,
            SharingId: sharingId
        },
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.closeNFT = async (mediaSymbol, address, caller) => {
    let blockchainRes = await axios.post(api.blockchainMediaAPI + "/closeNFT", {
        Data: {
            MediaSymbol: mediaSymbol,
            Address: address,
        },
        Caller: caller
    });
    return blockchainRes.data;
};




