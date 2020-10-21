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

        res.send({signIn: true})
    } catch (err) {
        console.log('Error in controllers/user.ts -> signIn(): ', err);
    }
};

// MY WALL FUNCTIONS

const getFollowPodsInfo = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getFollowUserInfo = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getFollowMyInfo = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

// CONNECTIONS FUNCTIONS

const getFollowers = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getFollowing = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const followUser = async (req: express.Request, res: express.Response) => {


};

const unFollowUser = async (req: express.Request, res: express.Response) => {


};

// INVESTMENTS

const getMyPods = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getPodsInvestments = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getPodsFollowed = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getReceivables = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getLiabilities = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};


const editUser = async (req: express.Request, res: express.Response) => {


};


const changeUserProfilePhoto = async (req: express.Request, res: express.Response) => {
    if(req.file) {
        console.log(req.file);
        let newImage = {
            filename:  req.file.filename,
            originalName: req.file.originalname
            // url: req.protocol + '://' + req.get('host') + '/images/' + image._id
        };
        newImage.filename = req.file.filename;
        newImage.originalName = req.file.originalname;

    } else {
        res.status(400).json({error: 'No file'});
    }
};


module.exports = {
    signIn,
    getFollowPodsInfo,
    getFollowUserInfo,
    getFollowMyInfo,
    getFollowers,
    getFollowing,
    followUser,
    unFollowUser,
    getMyPods,
    getPodsInvestments,
    getPodsFollowed,
    getReceivables,
    getLiabilities,
    editUser,
    changeUserProfilePhoto
};
