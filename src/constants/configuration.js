
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


const CALLER_KEY = "PRIVI"; // secret key used to identify that blockchain function caller is Privi
      
module.exports = {
	JWT_SECRET_STRING,
	FORGOT_PASSWORD_EXPIRY_DAYS,
	LOGIN_EXPIRY_DAYS,
	
	MAIL_SERVICE,
	MAIL_USER,
	MAIL_PASS,

	CALLER_KEY
}
