import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
const jwt = require("jsonwebtoken");
//const Cons = require('../shared/Config');
//const { query } = require('../shared/query');

const signIn = async (req: express.Request, res: express.Response) => {
    try {
        /*
        const args = req.query;

        // check user & pwd in DB
        const q = fs.readFileSync(path.join(__dirname, `/../queries/select/select_user.sql`), 'utf8');
        const resDB = await query(q, 'select', [args.login, args.password]);

        // Create session token
        const token = jwt.sign({ id: args.login }, Cons.SEED.secret, {
            expiresIn: 86400 // 24 hours
            //expiresIn: 1
        });

        // Add session token to User data
        if (resDB.length > 0) resDB[0].token = token;

        // send query result
        (resDB.length > 0) ? res.status(200).json(resDB) : res.status(204).json('KO');
        */
       console.log('signIn');
    } catch (err) {
        console.log('Error in controllers/user.ts -> signIn(): ', err);
    }
};

module.exports = {
    signIn,
};
