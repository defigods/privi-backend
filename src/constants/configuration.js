
const JWT_SECRET_STRING = "2312321sdfsdcxadas2323131";
const FORGOT_PASSWORD_EXPIRY_DAYS = 1;
const LOGIN_EXPIRY_DAYS = 2;

// need a bulk email account TODO
const MAIL_SERVICE = "gmail";

/*
const MAIL_USER = "noreply@priviprotocol.io";
const MAIl_PASS = "Y4*3auChPRIVI";
*/

const MAIL_USER = "away45846";
const MAIL_PASS = "QSidiNX3infbiHs";

const ETH_SWAP_MANAGER_ADDRESS = '0x9d79a08EbCd8d4F2764794C1ab371b3AE8E05558';
const ETH_PRIVI_ADDRESS = '0x9353395A21C4eFe442d1C5B41f3808766AA62cC9';
const ETH_PRIVI_KEY = 'fa32c34f16b54be767b94aad4f86797bb3966c325c3e0c300b1ea3f4f8d333b6';
const ETH_INFURA_KEY = 'eda1216d6a374b3b861bf65556944cdb';

const CALLER_KEY = "PRIVI"; // secret key used to identify that blockchain function caller is Privi

module.exports = {
	JWT_SECRET_STRING,
	FORGOT_PASSWORD_EXPIRY_DAYS,
	LOGIN_EXPIRY_DAYS,
	
	MAIL_SERVICE,
	MAIL_USER,
	MAIL_PASS,

	CALLER_KEY,

	ETH_SWAP_MANAGER_ADDRESS,
	ETH_PRIVI_ADDRESS,
	ETH_PRIVI_KEY,
	ETH_INFURA_KEY
}
