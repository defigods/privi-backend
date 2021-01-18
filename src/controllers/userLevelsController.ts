import express from "express";
import collections from "../firebase/collections";
import {db} from "../firebase/firebase";
import {LEVELS, ONE_DAY} from '../constants/userLevels'

exports.getLevelsInfo = async (req: express.Request, res: express.Response) => {
    try {
        const userId = req.params.userId;

        const userLevelRef = db.collection(collections.levels).doc(userId);
        const userLevelGet = await userLevelRef.get();
        const userLevel: any = userLevelGet.data();

        res.send({
            success: true,
            data: userLevel
        });
    } catch (e) {
        console.log('Error in controllers/userLevelsController -> getLevelsInfo()', e);
        res.send({
            success: false,
            message: e
        });
    }
}

exports.sumPoints = async (req: express.Request, res: express.Response) => {
    try {
        const userId = req.body.userId;
        const numberOfPoints = req.body.numberOfPoints;
        const reason = req.body.reason;

        const userLevelRef = db.collection(collections.levels).doc(userId);
        const userLevelGet = await userLevelRef.get();
        const userLevel: any = userLevelGet.data();

        const historyPoint = {
            points: numberOfPoints,
            date: Date.now(),
            reason: reason
        }
        if (userLevel) {
            userLevel.points += numberOfPoints;
            let updatedULHistoryPointsArray: any[] = [];
            if (userLevel.historyPoints) {
                let ulHistoryPoints = [...userLevel.historyPoints];
                ulHistoryPoints.push(historyPoint);
                updatedULHistoryPointsArray = ulHistoryPoints;
            } else {
                updatedULHistoryPointsArray.push(historyPoint);
            }
            userLevel.historyPoints = updatedULHistoryPointsArray;

            let curLevel = LEVELS.length;
            for (let i = 0; i < LEVELS.length; i++) {
                if (userLevel.points < LEVELS[i]) {
                    curLevel = i + 1;
                    break;
                }
            }

            await userLevelRef.update({
                level: curLevel,
                points: userLevel.points,
                historyPoints: updatedULHistoryPointsArray
            });

            res.send({
                success: true, data: userLevel
            })
        } else {
            let curLevel = LEVELS.length;
            for (let i = 0; i < LEVELS.length; i++) {
                if (numberOfPoints < LEVELS[i]) {
                    curLevel = i + 1;
                    break;
                }
            }

            let userLevelNew = {
                userId: userId,
                level: curLevel,
                points: numberOfPoints,
                historyPoints: [historyPoint]
            };

            await db.runTransaction(async (transaction) => {
                transaction.set(db.collection(collections.levels).doc('' + userId), userLevelNew)
            })

            res.send({
                success: true, data: userLevelNew
            })
        }
    } catch (e) {
        console.log('Error in controllers/userLevelsController -> sumPoints()', e);
        res.send({
            success: false,
            message: e
        });
    }
}

exports.checkLevel = async (req: express.Request, res: express.Response) => {
    try {
        const userId = req.body.userId;

        const userLevelRef = db.collection(collections.levels).doc(userId);
        const userLevelGet = await userLevelRef.get();
        const userLevel: any = userLevelGet.data();

        let curLevel = LEVELS.length;
        let pointsRemainingToLevelUp = 0;
        for (let i = 0; i < LEVELS.length; i++) {
            if (userLevel.points < LEVELS[i]) {
                curLevel = i + 1;
                pointsRemainingToLevelUp = LEVELS[i] - userLevel.points;
                break;
            }
        }
        if (curLevel !== userLevel.level) {
            await userLevelRef.update({
                level: curLevel
            })
        }

        res.send({
            success: true,
            data: {
                level: curLevel,
                points: userLevel.points,
                pointsRemainingToLevelUp: pointsRemainingToLevelUp
            }
        })
    } catch (e) {
        console.log('Error in controllers/userLevelsController -> checkLevel()', e);
        res.send({
            success: false,
            message: e
        });
    }
}

exports.pointsWonToday = async (req: express.Request, res: express.Response) => {
    try {
        const userId = req.body.userId;

        const userLevelRef = db.collection(collections.levels).doc(userId);
        const userLevelGet = await userLevelRef.get();
        const userLevel: any = userLevelGet.data();
        const oneDay = Date.now() + ONE_DAY;
        const pointsSum = userLevel.historyPoints
            .filter(hp => hp.date < oneDay)
            .map(hp => hp.points)
            .reduce((acc, points) => acc + points, 0);

        res.send({
            success: true,
            data: {
                pointsWon: pointsSum
            }
        })
    } catch (e) {
        console.log('Error in controllers/userLevelsController -> pointsWonToday()', e);
        res.send({
            success: false,
            message: e
        });
    }
}

exports.getUserRank = async (req: express.Request, res: express.Response) => {
    try {
        const userId = req.params.userId;

        const userLevelRef = db.collection(collections.levels).doc(userId);
        const userLevelGet = await userLevelRef.get();
        const userLevel: any = userLevelGet.data();

        let points = userLevel.points;
        const usersLevelRef = await db.collection(collections.levels)
            .where("points", ">", points).get();
        const userLevelRank = usersLevelRef.docs.length + 1;

        res.send({
            success: true,
            data: {rank: userLevelRank}
        });
    } catch (e) {
        console.log('Error in controllers/userLevelsController -> getUserRank()', e);
        res.send({
            success: false,
            message: e
        });
    }
}

exports.getNumberOfUsersPerLevel = async (req: express.Request, res: express.Response) => {
    try {
        const amountOfLevels = LEVELS.length;
        let usersPerLevels: number[] = []
        for (let i = 1; i <= amountOfLevels; i++) {
            const usersLevelRef = await db.collection(collections.levels)
                .where("level", "==", i).get();
            usersPerLevels.push(usersLevelRef.docs.length)
        }

        res.send({
            success: true,
            data: {usersPerLevels: usersPerLevels}
        })
    } catch (e) {
        console.log('Error in controllers/userLevelsController -> getNumberOfUsersPerLevel()', e);
        res.send({
            success: false,
            message: e
        });
    }
}