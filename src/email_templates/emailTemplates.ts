const nodemailer = require("nodemailer");
import configuration from "../constants/configuration";
import URL from "../functions/getBackendURL";

export async function sendForgotPasswordEmail(userData, tempPassword) {
	const email = userData.email;

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
	service: configuration.MAIL_SERVICE,
    auth: {
      user: configuration.MAIL_USER,
      pass: configuration.MAIL_PASS,
    },
  });

  let htmlEmail = `
<p>
Hi ${userData.firstName},<br />
<br />
You have recently requested a new password. (If this is a mistake then it should be safe to ignore this email.) <br />
<br />
Your new password: ${tempPassword} <br />
<br />
Thanks! <br />
PRIVI Protocol <br />
<br />
** PLEASE DO NOT REPLY TO THIS EMAIL as this is automatically generated and you will not receive a response.  **
</p>
  `;
  let textEmail = `
Hi ${userData.firstName},

You have recently requested a new password. (If this is a mistake then it should be safe to ignore this email.)

Your new password: ${tempPassword}

Thanks!
PRIVI Protocol

** PLEASE DO NOT REPLY TO THIS EMAIL as this is automatically generated and you will not receive a response.  **
  `;

	let success = false;
	try {
	  // send mail with defined transport object
	  let info = await transporter.sendMail({
		from: '"PRIVI Protocol" <noreply@priviprotocol.io>', // sender address
		to: email, // list of receivers
		subject: "Temporary Password - PRIVI Protocol", // Subject line
		text: textEmail, // plain text body
		html: htmlEmail, // html body
	  });

	  console.log("Message sent: %s", info.messageId);
	  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
		success = (info.messageId != "");

	} catch (err) {
		console.log('Error in controllers/userController.ts -> sendForgotPasswordEmail(): ', err);
	}

  return success;

} // sendForgotPasswordEmail

export async function sendEmailValidation(userData) {
	const email = userData.email;
	const validationLink = URL() + "/user/email_validation/" + Buffer.from(userData.id + "_" + userData.validationSecret).toString('base64');

	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
		service: configuration.MAIL_SERVICE,
		auth: {
		  user: configuration.MAIL_USER,
		  pass: configuration.MAIL_PASS,
		},
	});

  let htmlEmail = `
<p>
Hi ${userData.firstName},<br />
<br />
Thank you very much for your registration! <br />
<br />
Please click the following link to validate your account. <br />
<a href="${validationLink}">${validationLink}</a> <br />
<br />
Thanks! <br />
PRIVI Protocol <br />
<br />
** PLEASE DO NOT REPLY TO THIS EMAIL as this is automatically generated and you will not receive a response.  **
</p>
  `;
  let textEmail = `
Hi ${userData.firstName},

Thank you very much for your registration!

Please click the following link to validate your account.
${validationLink}

Thanks!
PRIVI Protocol

** PLEASE DO NOT REPLY TO THIS EMAIL as this is automatically generated and you will not receive a response.  **
  `;

	let success = false;
	try {
	  // send mail with defined transport object
	  let info = await transporter.sendMail({
		from: '"PRIVI Protocol" <noreply@priviprotocol.io>', // sender address
		to: email, // list of receivers
		subject: "Validate your email - PRIVI Protocol", // Subject line
		text: textEmail, // plain text body
		html: htmlEmail, // html body
	  });

	  console.log("Message sent: %s", info.messageId);
	  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
		success = (info.messageId != "");

	} catch (err) {
		console.log('Error in controllers/userController.ts -> sendForgotPasswordEmail(): ', err);
	}

	return success;

} // sendEmailValidation
