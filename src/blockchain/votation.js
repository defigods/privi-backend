const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createVotation = async (data) => {
    let blockchainRes = await axios.post(api.blockchainVotationAPI + "/createVotation", data);
    return blockchainRes.data;
};

module.exports.makeVote = async (data) => {
    let blockchainRes = await axios.post(api.blockchainVotationAPI + "/votingStake", data);
    return blockchainRes.data;
}

module.exports.endVotation = async (data) => {
    let blockchainRes = await axios.post(api.blockchainVotationAPI + "/endVotation", data);
    return blockchainRes.data;
}

