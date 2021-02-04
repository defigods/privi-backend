import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from "express";

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
        let task = { Id: doc.id, Completed: false } as any;
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