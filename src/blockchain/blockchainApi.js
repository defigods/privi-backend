// const FabricAppServerIP = "207.154.215.199";
const FabricAppServerIP = "167.99.245.246";	// for testing
const port = 4000;
const blockchainApi = "http://" + FabricAppServerIP + ":" + port + "/api/fabric";

const blockchainCoinBalanceAPI = "http://" + FabricAppServerIP + ":" + port + "/api/CoinBalance";
const blockchainDataProtocolAPI = "http://" + FabricAppServerIP + ":" + port + "/api/DataProtocol";
const blockchainTraditionalLendingAPI = "http://" + FabricAppServerIP + ":" + port + "/api/TraditionalLending";
const blockchainPriviLendingAPI = "http://" + FabricAppServerIP + ":" + port + "/api/PRIVIcredit";
const blockchainPodAPI = "http://" + FabricAppServerIP + ":" + port + "/api/PodFT";
const blockchainPodNFTPodAPI = "http://" + FabricAppServerIP + ":" + port + "/api/PodNFT";
const blockchainInsuranceFTAPI = "http://" + FabricAppServerIP + ":" + port + "/api/InsuranceFT";
const blockchainPriviGovernanceAPI = "http://" + FabricAppServerIP + ":" + port + "/api/PriviGovernance";
const blockchainCommunityAPI = "http://" + FabricAppServerIP + ":" + port + "/api/Communities";
const blockchainBadgesAPI = "http://" + FabricAppServerIP + ":" + port + "/api/Badges";

module.exports = {
	blockchainApi: blockchainApi,
	blockchainCoinBalanceAPI: blockchainCoinBalanceAPI,
	blockchainDataProtocolAPI: blockchainDataProtocolAPI,
	blockchainTraditionalLendingAPI: blockchainTraditionalLendingAPI,
	blockchainPriviLendingAPI: blockchainPriviLendingAPI,
	blockchainPodAPI: blockchainPodAPI,
	blockchainPodNFTPodAPI: blockchainPodNFTPodAPI,
	blockchainInsuranceFTAPI: blockchainInsuranceFTAPI,
	blockchainPriviGovernanceAPI: blockchainPriviGovernanceAPI,
	blockchainCommunityAPI: blockchainCommunityAPI,
	blockchainBadgesAPI: blockchainBadgesAPI,
};
