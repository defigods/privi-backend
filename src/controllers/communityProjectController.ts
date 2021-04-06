import {
  generateUniqueId,
} from "../functions/functions";
import collections from "../firebase/collections";
//import { uploadToFirestoreBucket } from '../functions/firestore'
import { db } from "../firebase/firebase";
import express from "express";
import fs from "fs";
import path from 'path';

exports.changeProjectPhoto = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    if (req.file) {
      const projectRef = db
        .collection(collections.project)
        .doc(req.file.originalname);
      const projectGet = await projectRef.get();
      const project: any = projectGet.data();
      if (project.hasPhoto) {
        await projectRef.update({
          HasPhoto: true,
        });
      }

      let dir = "uploads/communityProject/" + "photos-" + req.file.originalname;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      res.send({ success: true });
    } else {
      console.log(
        "Error in controllers/projectController -> changeProjectPhoto()",
        "There's no file..."
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/projectController -> changeProjectPhoto()",
      err
    );
    res.send({ success: false });
  }
};

exports.getProjects = async (req: express.Request, res: express.Response) => {
  try {
    let params: any = req.params;
    let projects: any[] = [];

    const projectsQuery = await db
      .collection(collections.project)
      .where("CommunityId", "==", params.communityId)
      .get();
     
    if (!projectsQuery.empty) {
      for (const doc of projectsQuery.docs) {
        let data = doc.data();
        data.id = doc.id;
        projects.push(data);
      }
      res.status(200).send({
        success: true,
        data: projects,
      });
    } else {
      res.status(200).send({
        success: true,
        data: [],
      });
    }
  } catch (err) {
    console.log("Error in controllers/projectController -> getProjects()", err);
    res.send({ success: false });
  }
};

//get project photo
exports.getProjectPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let projectId = req.params.projectId;

    if (projectId) {
      const directoryPath = path.join('uploads', 'communityProject');
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader('Content-Type', 'image');
      let raw = fs.createReadStream(path.join('uploads', 'communityProject', projectId + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/projectController -> getProjectPhotoById()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/projectController -> getProjectPhotoById()', err);
    res.send({ success: false });
  }
};

exports.createProject = async (req: express.Request, res: express.Response) => {

    try {
      const uid = generateUniqueId();
      const body = req.body;

      const data: any = {
        Creator: body.Creator,
        CommunityId: body.CommunityId,
        Name: body.Name,
        Description: body.Description,
        Private: body.Private,
        HasPhoto: false,
        TwitterID: body.TwitterID,
        Budget: body.Budget,
        Token: body.Token,
        GithubRepo: body.GithubRepo,
        CreationDate: body.CreationDate,
        DateDue: body.DateDue,
        Positions: body.Positions
      };

      await db.runTransaction(async (transaction) => {
        transaction.set(
          db.collection(collections.project).doc("" + uid),
            data
        );
      });
 
      let ret = { id: uid, ...data };
      res.send({success: true, data: ret}); 
      
    } catch (err) {
      console.log('Error in controllers/projectController -> createProject()', err);
      res.send({ success: false, error: err});
    }
  
};

