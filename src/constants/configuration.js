const JWT_SECRET_STRING = '2312321sdfsdcxadas2323131';
const FORGOT_PASSWORD_EXPIRY_DAYS = 1;
const LOGIN_EXPIRY_DAYS = 2;

// need a bulk email account TODO
const MAIL_SERVICE = 'gmail';

const MAIL_USER = 'noreply@priviprotocol.io';
const MAIL_PASS = '7>HZBPuP';

const AMBERDATA_API_KEY = 'UAK7167bd48927c302ba29118834499b408';
const MILISECOND = 1000;
const MIN_TIME_FOR_ETH_ADDRESS_TOKEN_UPDTAE = 1 * MILISECOND; // 1 hour = 3600 // ideal to be daily such as 86400 seconds
// const ETH_SWAP_MANAGER_ADDRESS = '0x42DD57153D3ed96fAa384A80d8141E7C500804A4'; // old (sergi) '0x37145a7b892fe1116D1B7AF6CB68D205dc09D49F';
const ETH_CONTRACTS_ABI_VERSION = 'ABI_V6';
const ETH_PRIVI_ADDRESS = '0xD7D4587b5524b32e24F1eE7581D543C775df27B5';
const ETH_PRIVI_KEY = '6ead55f982125523018af8f18cad729df7046566400a2c447ff3ed869db7ec0b';
const ETH_INFURA_KEY = '2d7e77efb83e46d8a8b91cf77245f6bb';

const PRIVI_WALLET_PATH = `m/44'/60'/0'/0/0`;
const MIN_ETH_CONFIRMATION = 1; // > 12 to be fully secure
const MIN_BTC_CONFIRMATION = 6;  // > 6 to be fully secure
const SHOULD_HANDLE_SWAP = true;

module.exports = {
  JWT_SECRET_STRING,
  FORGOT_PASSWORD_EXPIRY_DAYS,
  LOGIN_EXPIRY_DAYS,

  MAIL_SERVICE,
  MAIL_USER,
  MAIL_PASS,

  AMBERDATA_API_KEY,
  MIN_TIME_FOR_ETH_ADDRESS_TOKEN_UPDTAE,
  // ETH_SWAP_MANAGER_ADDRESS,
  ETH_CONTRACTS_ABI_VERSION,
  ETH_PRIVI_ADDRESS,
  ETH_PRIVI_KEY,
  ETH_INFURA_KEY,

  PRIVI_WALLET_PATH,
  MIN_ETH_CONFIRMATION,
  MIN_BTC_CONFIRMATION,
  SHOULD_HANDLE_SWAP,
};
