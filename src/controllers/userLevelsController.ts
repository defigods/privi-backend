import express from "express";
import collections from "../firebase/collections";
import {db} from "../firebase/firebase";
import {LEVELS, ONE_DAY, ONE_HOUR} from '../constants/userLevels'

const getLevelsInfo = async (req: express.Request, res: express.Response) => {
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

const sumPoints = (userId, numberOfPoints, reason) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userLevelRef = db.collection(collections.levels).doc(userId);
            const userLevelGet = await userLevelRef.get();
            const userLevel: any = userLevelGet.data();

            const historyPoint: any = {
                points: numberOfPoints,
                date: Date.now(),
                reason: reason
            }
            if (userLevel) {
                if (!userLevel.points) {
                    userLevel.points = 0;
                }
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

                historyPoint.userId = userId;
                await db.collection(collections.points).add(historyPoint);

                resolve(userLevel);
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

                historyPoint.userId = userId;
                await db.collection(collections.points).add(historyPoint);

                resolve(userLevelNew);
            }
        } catch (e) {
            console.log('Error in controllers/userLevelsController -> sumPoints()', e);
            reject({success: false, message: e});
        }
    });
}

const checkLevel = (userId) => {
    return new Promise(async (resolve, reject) => {
        try {
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
            const res = {
                level: curLevel,
                points: userLevel.points,
                pointsRemainingToLevelUp: pointsRemainingToLevelUp
            };
            resolve(res);
        } catch (e) {
            console.log('Error in controllers/userLevelsController -> checkLevel()', e);
            reject({success: false, message: e})
        }
    });
}

const pointsWonTodayAndHour = (userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userLevelRef = db.collection(collections.levels).doc(userId);
            const userLevelGet = await userLevelRef.get();
            const userLevel: any = userLevelGet.data();
            const dateNow = Date.now();
            const yesterday = Date.now() - ONE_DAY;
            const oneHourBack = Date.now() - ONE_HOUR;
            let pointsSumDay = 0;
            let pointsSumHour = 0;

            if(userLevel){
            const pointsSumLastDay = userLevel.historyPoints
                .filter(hp => hp.date >= yesterday && hp.date < dateNow)
            pointsSumDay = pointsSumLastDay
                .map(hp => hp.points)
                .reduce((acc, points) => acc + points, 0);
            pointsSumHour = pointsSumLastDay
                .filter(hp => hp.date >= oneHourBack && hp.date < dateNow)
                .map(hp => hp.points)
                .reduce((acc, points) => acc + points, 0);
            }
            resolve({pointsSumDay: pointsSumDay, pointsSumHour: pointsSumHour});
        } catch (e) {
            console.log('Error in controllers/userLevelsController -> pointsWonToday()', e);
            reject({success: false, message: e})
        }
    });
}

const getUserRank = (userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userLevelRef = db.collection(collections.levels).doc(userId);
            const userLevelGet = await userLevelRef.get();
            const userLevel: any = userLevelGet.data();
            let userLevelRank = 0;
            if(userLevel) {
                let points = userLevel.points;
                const usersLevelRef = await db.collection(collections.levels)
                    .where("points", ">", points).get();
                userLevelRank = usersLevelRef.docs.length + 1;
            }

            resolve({rank: userLevelRank});
        } catch (e) {
            console.log('Error in controllers/userLevelsController -> getUserRank()', e);
            reject({success: false, message: e})
        }
    });
}

const getNumberOfUsersPerLevel = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const amountOfLevels = LEVELS.length;
            let usersPerLevels: number[] = []
            for (let i = 1; i <= amountOfLevels; i++) {
                const usersLevelRef = await db.collection(collections.levels)
                    .where("level", "==", i).get();
                usersPerLevels.push(usersLevelRef.docs.length)
            }
            resolve({usersPerLevels: usersPerLevels});
        } catch (e) {
            console.log('Error in controllers/userLevelsController -> getNumberOfUsersPerLevel()', e);
            reject({success: false, message: e})
        }
    });
}

module.exports = {
    getLevelsInfo,
    sumPoints,
    checkLevel,
    pointsWonTodayAndHour,
    getUserRank,
    getNumberOfUsersPerLevel
}