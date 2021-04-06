import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from "express";
import { BADGES_MAP } from '../constants/badges';
import badge from "../blockchain/badge";
import { updateFirebase } from "../functions/functions";
//import { uploadToFirestoreBucket } from '../functions/firestore'
import cron from 'node-cron';

const levelsController = require("./userLevelsController");
const notificationsController = require("./notificationsController");
const apiKey = "PRIVI";
/**
 * Function to get user tasks
 */
exports.getTasks = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    const retData: any[] = [];
    const userSnap = await db.collection(collections.user).doc(userId).get();
    const userData: any = userSnap.data();

    const allTasksSnap = await db.collection(collections.tasks).get();
    const taskIdToTaskDataMap = {};
    allTasksSnap.forEach((doc) => {
      const data = doc.data();
      if (data.Level) taskIdToTaskDataMap[doc.id] = doc.data();
    });

    const userTasks = userData.UserTasks ?? [];
    userTasks.forEach((userTask) => {
      if (taskIdToTaskDataMap[userTask.Id ?? '']) retData.push({ ...taskIdToTaskDataMap[userTask.Id], ...userTask });
    });
    res.send({ success: true, data: retData });
    // OLD CODE
    // let userTasks = userData.UserTasks ?? [];
    // let userTasksToDisplay = [] as any;

    // allTasksSnap.forEach(async (doc) => {
    //   //load tasks if user has the level task or higher &&
    //   //user has no tasks OR user doesn't already have this task
    //   const taskData = doc.data();
    //   if (
    //     taskData.Level <= userData.level &&
    //     (userData.UserTasks === undefined ||
    //       (userData.UserTasks &&
    //         !userData.UserTasks.some((task) => task.Id === doc.id)))
    //   ) {
    //     let task = { Id: doc.id, Completed: false, Level: taskData.Level } as any;
    //     if (taskData.Timed) {
    //       task.Timed = taskData.Timed;
    //       //TODO: set timing rules ??
    //       //.EndDate and .StartDate
    //     }
    //     userTasks.push(task);
    //   }

    //   //add user to task
    //   if (
    //     taskData.Users &&
    //     !taskData.Users.some((user) => user === userId)
    //   ) {
    //     const usersCopy = taskData.Users || [];
    //     usersCopy.push(userId);

    //     await db.collection(collections.tasks).doc(doc.id).update({
    //       Users: usersCopy,
    //     });
    //   }

    //   //and add info to the list to be returned
    //   if (
    //     userTasks.some((task) => task.Id === doc.id) &&
    //     taskData.Level !== 0
    //   ) {
    //     let taskTodisplay = { ...taskData };

    //     taskTodisplay.Completed =
    //       userTasks[
    //         userTasks.findIndex((task) => task.Id === doc.id)
    //       ].Completed;

    //     userTasksToDisplay.push(taskTodisplay);
    //   }
    // });

    // //and update db
    // await db.collection(collections.user).doc(userId).update({
    //   UserTasks: userTasks,
    // });

    // if (userTasksToDisplay.length > 0) {
    //   res.send({ success: true, data: userTasksToDisplay });
    // } else res.send({ success: false });
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

// daily check and add new created tasks to users
exports.addTaskToUsers = cron.schedule('0 0 * * *', async () => {
  try {
    console.log("********* Task Controller addTaskToUsers() cron job started *********");
    const userSnap = await db.collection(collections.user).get();
    const allTasks = await db.collection(collections.tasks).get();
    userSnap.forEach((userDoc) => {
      const userData = userDoc.data();
      const userTasks = userData.UserTasks;
      const userLevel = userData.level ?? 0;
      allTasks.forEach((taskDoc) => {
        const taskData = taskDoc.data();
        const taskLevel = taskData.Level ?? 0;
        // user meets level requirement and dont have this task yet
        if (userLevel >= taskLevel && !userTasks.find((task) => task.Id == taskDoc.id)) {
          // possible improvement: check if user meets condition to complete this task and set correct boolean instead of 'false'
          userTasks.push({
            Completed: false,
            Id: taskDoc.id,
            AddedAt: Date.now()
          });
        }
      });
      userDoc.ref.update({
        UserTasks: userTasks
      });
    });
    console.log("--------- Task Controller addTaskToUsers() finished ---------");
  } catch (err) {
    console.log('Error in controllers/taskController -> addTaskToUsers()', err);
  }
});