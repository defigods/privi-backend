import configuration from "../constants/configuration";
const jwt = require('jsonwebtoken');

// thanks https://github.com/jkasun/stack-abuse-express-jwt
export const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, configuration.JWT_SECRET_STRING, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }

            if (!req.body) {
				req.body = {};
            }
            req.body.priviUser = user
            
            next();
        });
    } else {
        res.sendStatus(401);
    }
};
