// const fabricAppServerIP = "207.154.215.199";
// const fabricAppServerIP = "127.0.0.1"; // for testing local
const testnetAppServerIP = "167.99.245.246"; // test
const testnetPort = 4000;
const testnetEndpoint = "http://" + testnetAppServerIP + ":" + testnetPort + "/api/";

const fabricAppServerIP = "64.225.22.17"; // main
const fabricPort = 4000;
const fabricEndpoint = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/";


const blockchainCoinBalanceAPI = testnetEndpoint + "CoinBalance";	// changed
const blockchainDataProtocolAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/DataProtocol";
const blockchainTraditionalLendingAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/TraditionalLending";
const blockchainPriviLendingAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/PRIVIcredit";
const blockchainPodAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/PodFT";
const blockchainPodNFTPodAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/PodNFT";
const blockchainPodMediaAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/PodMedia";
const blockchainFractionaliseMediaAPI = testnetEndpoint + "fractionaliseMedia";	// changed
const blockchainMediaAPI = testnetEndpoint + "Media";	// changed
const blockchainInsuranceFTAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/InsuranceFT";
const blockchainInsuranceNFTAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/InsuranceNFT"
const blockchainPriviGovernanceAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/PriviGovernance";
const blockchainCommunityAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/Communities";
const blockchainBadgesAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/Badges";
const blockchainVotationAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/Votation";
const blockchainLiquidityPoolAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/PriviLiquidityPools";
const blockchainSocialAPI = "http://" + fabricAppServerIP + ":" + fabricPort + "/api/SocialToken";
const blockchainAuctionsAPI = testnetEndpoint + "Auction";	// changed

module.exports = {
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
	blockchainPodMediaAPI: blockchainPodMediaAPI,
	blockchainMediaAPI: blockchainMediaAPI,
	blockchainFractionaliseMediaAPI: blockchainFractionaliseMediaAPI,
	blockchainAuctionsAPI: blockchainAuctionsAPI,
};
