// const FabricAppServerIP = "207.154.215.199";
// const FabricAppServerIP = "127.0.0.1"; // for testing local
const FabricAppServerIP = "64.225.22.17"; // main
const FabricAppServerIP2 = "104.131.23.221"; // second node, only for balanceOf calls
// const FabricAppServerIP = "167.99.245.246"; // for testing
const port = 4000;
const blockchainApi = "http://" + FabricAppServerIP + ":" + port + "/api/fabric";

const blockchainCoinBalanceAPI2 = "http://" + FabricAppServerIP2 + ":" + port + "/api/CoinBalance";

const blockchainCoinBalanceAPI = "http://" + FabricAppServerIP + ":" + port + "/api/CoinBalance";
const blockchainDataProtocolAPI = "http://" + FabricAppServerIP + ":" + port + "/api/DataProtocol";
const blockchainTraditionalLendingAPI = "http://" + FabricAppServerIP + ":" + port + "/api/TraditionalLending";
const blockchainPriviLendingAPI = "http://" + FabricAppServerIP + ":" + port + "/api/PRIVIcredit";
const blockchainPodAPI = "http://" + FabricAppServerIP + ":" + port + "/api/PodFT";
const blockchainPodNFTPodAPI = "http://" + FabricAppServerIP + ":" + port + "/api/PodNFT";
const blockchainInsuranceFTAPI = "http://" + FabricAppServerIP + ":" + port + "/api/InsuranceFT";
const blockchainInsuranceNFTAPI = "http://" + FabricAppServerIP + ":" + port + "/api/InsuranceNFT"
const blockchainPriviGovernanceAPI = "http://" + FabricAppServerIP + ":" + port + "/api/PriviGovernance";
const blockchainCommunityAPI = "http://" + FabricAppServerIP + ":" + port + "/api/Communities";
const blockchainBadgesAPI = "http://" + FabricAppServerIP + ":" + port + "/api/Badges";
const blockchainVotationAPI = "http://" + FabricAppServerIP + ":" + port + "/api/Votation";
const blockchainLiquidityPoolAPI = "http://" + FabricAppServerIP + ":" + port + "/api/PriviLiquidityPools";
const blockchainSocialAPI = "http://" + FabricAppServerIP + ":" + port + "/api/SocialToken";

module.exports = {
	blockchainApi: blockchainApi,
	blockchainCoinBalanceAPI: blockchainCoinBalanceAPI,
	blockchainDataProtocolAPI: blockchainDataProtocolAPI,
	blockchainTraditionalLendingAPI: blockchainTraditionalLendingAPI,
	blockchainPriviLendingAPI: blockchainPriviLendingAPI,
	blockchainPodAPI: blockchainPodAPI,
	blockchainPodNFTPodAPI: blockchainPodNFTPodAPI,
	blockchainInsuranceFTAPI: blockchainInsuranceFTAPI,
	blockchainInsuranceNFTAPI: blockchainInsuranceNFTAPI,
	blockchainPriviGovernanceAPI: blockchainPriviGovernanceAPI,
	blockchainCommunityAPI: blockchainCommunityAPI,
	blockchainBadgesAPI: blockchainBadgesAPI,
	blockchainVotationAPI: blockchainVotationAPI,
	blockchainLiquidityPoolAPI: blockchainLiquidityPoolAPI,
	blockchainSocialAPI: blockchainSocialAPI,
	blockchainCoinBalanceAPI2: blockchainCoinBalanceAPI2
};
