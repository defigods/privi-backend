import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from "express";
import { BADGES_MAP } from '../constants/badges';
import badge from "../blockchain/badge";
import { updateFirebase } from "../functions/functions";

const levelsController = require("./userLevelsController");
const notificationsController = require("./notificationsController");
const apiKey = "PRIVI";
/**
 * Function to get user tasks
 */
exports.getTasks = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    const userRef = await db.collection(collections.user).doc(userId).get();
    const user: any = userRef.data();

    const allTasks = await db.collection(collections.tasks).get();

    let userTasks = user.UserTasks || ([] as any);
    let userTasksToDisplay = [] as any;

    allTasks.docs.map(async (doc, i) => {
      //load tasks if user has the level task or higher &&
      //user has no tasks OR user doesn't already have this task
      if (
        doc.data().Level <= user.level &&
        (user.UserTasks === undefined ||
          (user.UserTasks &&
            !user.UserTasks.some((task) => task.Id === doc.id)))
      ) {
        let task = { Id: doc.id, Completed: false, Level: doc.data().Level } as any;
        if (doc.data().Timed) {
          task.Timed = doc.data().Timed;
          //TODO: set timing rules ??
          //.EndDate and .StartDate
        }
        userTasks.push(task);
      }

      //add user to task
      if (
        doc.data().Users &&
        !doc.data().Users.some((user) => user === userId)
      ) {
        const usersCopy = doc.data().Users || [];
        usersCopy.push(userId);

        await db.collection(collections.tasks).doc(doc.id).update({
          Users: usersCopy,
        });
      }

      //and add info to the list to be returned
      if (
        userTasks.some((task) => task.Id === doc.id) &&
        doc.data().Level !== 0
      ) {
        let taskTodisplay = { ...doc.data() };

        taskTodisplay.Completed =
          userTasks[
            userTasks.findIndex((task) => task.Id === doc.id)
          ].Completed;

        userTasksToDisplay.push(taskTodisplay);
      }
    });

    //and update db
    await db.collection(collections.user).doc(userId).update({
      UserTasks: userTasks,
    });

    if (userTasksToDisplay.length > 0) {
      res.send({ success: true, data: userTasksToDisplay });
    } else res.send({ success: false });
  } catch (err) {
    console.log("Error in controllers/tasks -> getTasks()", err);
    res.send({ success: false });
  }
};

// Function to update user tasks and levels
exports.updateTaskExternally = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body
    // console.log(JSON.stringify(body))
    let userId = body.userId;
    let taskTitle = body.taskTitle;
    const userRef = await db.collection(collections.user).doc(userId).get();
    const levelRef = await db.collection(collections.levels).doc(userId).get();
    const taskQuery = await db.collection(collections.tasks).where("Title", "==", taskTitle).get();
    const user: any = userRef.data();
    const level: any = levelRef.data();
    let userTasks = user.UserTasks || ([] as any);

    if (!taskQuery.empty) {
      for (const doc of taskQuery.docs) {
        let task = doc.data();
        const userPoints: any = user.Points || 0;
        const usrLevel = level ? level.level : 0;
        const rewardPointsTask: any = task.RewardPoints;

        // update user task in db
        let userTasksArray = [...userTasks]
        userTasksArray.forEach(task => {
          if (task.Id === doc.id) {
            task.Completed = true;
          }
        })

        await db.collection(collections.user).doc(userId).update({
          UserTasks: userTasksArray,
        });

        // update user levels in db
        let userLevelNew = await levelsController.sumPoints(userId, rewardPointsTask, taskTitle);

        // update user points in db
        await db.collection(collections.user).doc(userId).update({
          Points: userPoints + rewardPointsTask,
        });

        // update isLevelUp in db
        let isLevelUp = false;
        const usrLevelNew = await levelsController.checkLevel(userId);
        if (usrLevel !== usrLevelNew) {
          isLevelUp = true;
          await db.collection(collections.user).doc(userId).update({
            isLevelUp: isLevelUp
          });
        }
        if (user.isLevelUp && !isLevelUp) {
          await db.collection(collections.user).doc(userId).update({
            isLevelUp: isLevelUp
          })
          await notificationsController.addNotification({
            userId: userId,
            notification: {
              type: 91,
              typeItemId: "user",
              itemId: body.userId,
              follower: "",
              pod: "",
              comment: usrLevelNew,
              token: "",
              amount: 0,
              onlyInformation: false,
              otherItemId: "",
            },
          });
        }

        // Reward badges if applicable
        let badgeRes;
        let badgeSymbol = BADGES_MAP.get(taskTitle);
        if (badgeSymbol) {
          let badges: any[] = user.badges;
          let isFind = badges.find(b => b.badgeId == badgeSymbol)
          if (!isFind) {
            const blockchainRes = await badge.rewardBadge({
              UserId: userId,
              Symbol: badgeSymbol,
              Caller: apiKey
            });
            if (blockchainRes && blockchainRes.success) {
              await updateFirebase(blockchainRes);
              badgeRes = {
                isNew: true,
                badgeId: badgeSymbol
              }

              let badges: any[] = user.badges;
              if (!badges) {
                badges = [];
              }
              badges.push(badgeRes);
              await db.collection(collections.user).doc(userId).update({
                badges: badges
              })

              badgeRes.userId = userId;
              await db.collection(collections.badgesHistory).add(badgeRes);

              await notificationsController.addNotification({
                userId: userId,
                notification: {
                  type: 77,
                  typeItemId: "taskBadge",
                  itemId: body.userId,
                  follower: "",
                  pod: "",
                  comment: "",
                  token: badgeRes.badgeId,
                  amount: 0,
                  onlyInformation: false,
                  otherItemId: "",
                },
              });
            }
          }
        }

        res.send({ success: true, userId: userId, isLevelUp: isLevelUp, taskId: task.Title, userLevelNew })
      }
    }
  } catch (error) {
    res.send({ success: false, message: error })

    console.log(error);
  }
}

exports.updateTask = (userId, title) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = await db.collection(collections.user).doc(userId).get();
      const levelRef = await db.collection(collections.levels).doc(userId).get();
      const taskQuery = await db.collection(collections.tasks).where("Title", "==", title).get();
      const user: any = userRef.data();
      const level: any = levelRef.data();
      if (!taskQuery.empty) {
        for (const doc of taskQuery.docs) {
          let task = doc.data();
          const userPoints: any = user.Points;
          const usrLevel = level.level;
          const rewardPointsTask: any = task.RewardPoints;
          // update user task in db
          // await db.collection(collections.user).doc(userId).update({
          //   UserTasks: rewardPointsTask,
          // });
          // update user levels in db
          let userLevelNew = await levelsController.sumPoints(userId, rewardPointsTask, title);
          // update user points in db
          await db.collection(collections.user).doc(userId).update({
            Points: userPoints + rewardPointsTask,
          });
          let isLevelUp = false;
          const usrLevelNew = await levelsController.checkLevel(userId);
          if (usrLevel !== usrLevelNew) {
            isLevelUp = true;
            await db.collection(collections.user).doc(userId).update({
              isLevelUp: isLevelUp
            });
          }
          if (user.isLevelUp && !isLevelUp) {
            await db.collection(collections.user).doc(userId).update({
              isLevelUp: isLevelUp
            })
            await notificationsController.addNotification({
              userId: userId,
              notification: {
                type: 91,
                typeItemId: "levelUp",
                itemId: userId,
                follower: "",
                pod: "",
                comment: usrLevelNew,
                token: "",
                amount: 0,
                onlyInformation: false,
                otherItemId: "",
              },
            });
          }
          let badgeRes: any;
          let badgeSymbol = BADGES_MAP.get(title);
          if (badgeSymbol) {
            let badges = user.badges;
            let isFind = badges.find(b => b.badgeId == badgeSymbol)
            if (!isFind) {
              const blockchainRes = await badge.rewardBadge({
                UserId: userId,
                Symbol: badgeSymbol,
                Caller: apiKey
              });
              if (blockchainRes && blockchainRes.success) {
                await updateFirebase(blockchainRes);
                badgeRes = {
                  isNew: true,
                  badgeId: badgeSymbol,
                  date: new Date()
                }

                badges = badges.push(badgeRes);
                await db.collection(collections.user).doc(userId).update({
                  badges: badges
                });

                badgeRes.userId = userId;
                await db.collection(collections.badgesHistory).add(badgeRes);

                await notificationsController.addNotification({
                  userId: userId,
                  notification: {
                    type: 92,
                    typeItemId: "user",
                    itemId: userId,
                    follower: "",
                    pod: "",
                    comment: badgeSymbol,
                    token: "",
                    amount: 0,
                    onlyInformation: false,
                    otherItemId: badgeRes.badgeId,
                  },
                });
              }
            }
          }

          resolve({ success: true, userId: userId, isLevelUp: isLevelUp, taskId: task.Title, userLevelNew, badgeRes });
        }
      }
    } catch (e) {
      console.log("Error in controllers/tasks -> updateTask()", e);
      reject(e)
    }
  })
}