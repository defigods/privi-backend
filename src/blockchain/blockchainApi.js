const FabricAppServerIP = "207.154.215.199";
const port = 4000;
const blockchainApi = "http://" + FabricAppServerIP + ":" + port + "/api/fabric";

const blockchainCoinBalanceAPI = "http://" + FabricAppServerIP + ":" + port + "/api/CoinBalance";
const blockchainDataProtocolAPI = "http://" + FabricAppServerIP + ":" + port + "/api/DataProtocol";
const blockchainTraditionalLendingAPI = "http://" + FabricAppServerIP + ":" + port + "/api/TraditionalLending";
const blockchainPriviLendingAPI = "http://" + FabricAppServerIP + ":" + port + "/api/PRIVIcredit";
const blockchainPodAPI = "http://" + FabricAppServerIP + ":" + port + "/api/PodSwapping";

module.exports = {
	blockchainApi: blockchainApi,
	blockchainCoinBalanceAPI : blockchainCoinBalanceAPI,
	blockchainDataProtocolAPI: blockchainDataProtocolAPI,
	blockchainTraditionalLendingAPI: blockchainTraditionalLendingAPI,
	blockchainPriviLendingAPI: blockchainPriviLendingAPI,
	blockchainPodAPI: blockchainPodAPI,
};
