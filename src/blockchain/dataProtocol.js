const axios = require("axios");
const api = require("./blockchainApi");

// register new user or business to blockchain
module.exports.registerUser = async (orgName, publicId, role, caller) => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/registerUser", {
		orgName: orgName,
		PublicId: publicId,
		Role: role,
		Caller: caller
	});
	return blockchainRes.data;
};

// attach new user wallet address
module.exports.attachAddress = async (publicId, publicAddress, caller) => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/attachAddress", {
		PublicId: publicId,
		PublicAddress: publicAddress,
		Caller: caller
	});
	return blockchainRes.data;
};

// get privacy list of user
module.exports.getPrivacy = async (publicId) => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/getPrivacy", {
		PublicId: publicId,
	});
	return blockchainRes.data;
};

// get list of all user PID
module.exports.getUserList = async () => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/getUserList", {
	});
	return blockchainRes.data;
};

// get list of all business PID
module.exports.getBusinessList = async () => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/getBusinessList", {
	});
	return blockchainRes.data;
};

// user toggle privacy of a company
module.exports.modifyPrivacy = async (userId, businessId, enabled) => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/modifyPrivacy", {
		PublicId: userId,
		BusinessId: businessId,
		Enabled: enabled
	});
	return blockchainRes.data;
};

// given PID get DID
module.exports.encryptData = async (publicId) => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/encryptData", {
		PublicId: publicId,
	});
	return blockchainRes.data;
};

// given DID get PID
module.exports.decryptData = async (privateId) => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/decryptData", {
		Encryption_DID: privateId,
	});
	return blockchainRes.data;
};


// get the info of a user or company {privacy, role, targetId}
module.exports.getUser = async (publicId) => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/getUser", {
		PublicId: publicId,
	});
	return blockchainRes.data;
};

// get the list of all active TID
module.exports.getTIDList = async () => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/getTIDList", {
	});
	return blockchainRes.data;
};

// given 2 filtered list (by query conditions): listDID and listPID, and a company. The blockchain returns the intersection of the two list 
// while eliminating the users that have privacy turned off for the given company
module.exports.insightDiscovery = async (listDID, listPID, companyId) => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/insightDiscovery", {
		DID_list: listDID,
		ID_list: listPID,
		Business_Id: companyId
	});
	return blockchainRes.data;
};

// given the list of user (DID) to buy and the price, the company pays price amount that will be distributed between users and Cache
module.exports.insightPurchase = async (listDID, price, companyId, insightDistribution) => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/insightPurchase", {
		DID_list: listDID,
		Price: price,
		Business_Id: companyId,
		InsightDistribution: insightDistribution
	});
	return blockchainRes.data;
};

// the company redeems the previous bought users (listTID) 
module.exports.insightTarget = async (listTID, companyId) => {
	let blockchainRes = await axios.post(api.blockchainDataProtocolAPI + "/insightTarget", {
		TID_list: listTID,
		Business_Id: companyId,
	});
	return blockchainRes.data;
};