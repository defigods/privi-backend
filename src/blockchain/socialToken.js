const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createSocialToken = async (data) => {
    let blockchainRes = await axios.post(api.blockchainSocialTokenAPI + "/createSocialToken", data);
    return blockchainRes.data;
}

module.exports.sellSocialToken = async (data) => {
    let blockchainRes = await axios.post(api.blockchainSocialTokenAPI + "/sellSocialToken", data);
    return blockchainRes.data;
}

module.exports.buySocialToken = async (data) => {
    let blockchainRes = await axios.post(api.blockchainSocialTokenAPI + "/buySocialToken", data);
    return blockchainRes.data;
}