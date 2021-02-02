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

    let userTasks = [] as any;
    let userTasksToDisplay = [] as any;
    //1. check if user has tasks

    //if user has already tasks
    if (user.UserTasks && user.UserTasks.length > 0) {
      //load them
      allTasks.docs.map((doc, i) => {
        if (
          doc.data().Level <= user.level &&
          !user.UserTasks.some((task) => task.Id === doc.id)
        ) {
          let task = { Id: doc.id, Completed: false } as any;
          if (doc.data().Timed) {
            task.Timed = doc.data().Timed;
            //TODO: set timing rules ??
            //.EndDate and .StartDate
          }
          userTasks.push(task);
        }
        if (userTasks.some((task) => task.Id === doc.id)) {
          let taskTodisplay = { ...doc.data() };

          taskTodisplay.Completed = userTasks.findIndex(
            (task) => task.Id === doc.id
          ).Completed;
          userTasksToDisplay.push(taskTodisplay);
        }
      });

      //and update db
      await db.collection(collections.tasks).doc(userId).update({
        UserTasks: userTasks,
      });
    } else {
      //if user has no tasks registered, load all tasks and create the collection
      //push tasks
      allTasks.docs.map((doc, i) => {
        if (doc.data().Level <= user.level) {
          let task = { Id: doc.id, Completed: false } as any;
          if (doc.data().Timed) {
            task.Timed = doc.data().Timed;
            //TODO: set timing rules ??
            //.EndDate and .StartDate
          }
          userTasks.push(task);

          if (userTasks.some((task) => task.Id === doc.id)) {
            let taskTodisplay = { ...doc.data() };
            taskTodisplay.Completed =
              userTasks[
                userTasks.findIndex((task) => task.Id === doc.id)
              ].Completed;
            userTasksToDisplay.push(taskTodisplay);
          }
        }
      });
      //and update db
      await db.collection(collections.user).doc(userId).update({
        UserTasks: userTasks,
      });
    }

    if (userTasksToDisplay.length > 0) {
      res.send({ success: true, data: userTasksToDisplay });
    } else res.send({ success: false });
  } catch (err) {
    console.log("Error in controllers/tasks -> getTasks()", err);
    res.send({ success: false });
  }
};
