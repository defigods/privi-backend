import {
  updateFirebase,
  createNotification,
  getRateOfChangeAsMap,
  getCurrencyRatesUsdBase,
  getUidFromEmail,
  generateUniqueId,
} from "../functions/functions";
import { formatDate } from "../functions/utilities";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from "express";
import path from "path";
import fs from "fs";
import cron from "node-cron";

const userController = require("./userController");
const tasks = require("./tasksController");
const notificationsController = require("./notificationsController");
const communityWallController = require("./communityWallController");

exports.blogCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    console.log(body);

    let isCreator = await checkIfUserIsCreator(body.author, body.communityId);

    if (body && body.communityId && isCreator) {
      let ret = await createPost(body, "blogPost", body.priviUser.id);
      res.send({ success: true, data: ret });
    } else if (!isCreator) {
      console.log(
        "Error in controllers/blogController -> blogCreate()",
        "You can't create a post"
      );
      res.send({ success: false, error: "You can't create a post" });
    } else {
      console.log(
        "Error in controllers/blogController -> blogCreate()",
        "Missing Community Id"
      );
      res.send({ success: false, error: "Missing Community Id" });
    }
  } catch (err) {
    console.log("Error in controllers/blogController -> blogCreate()", err);
    res.send({ success: false });
  }
};

exports.blogDelete = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    let isCreator = await checkIfUserIsCreator(body.userId, body.communityId);

    if (body && body.communityId && isCreator) {
      const communityRef = db
        .collection(collections.community)
        .doc(body.communityId);
      const communityGet = await communityRef.get();
      const community: any = communityGet.data();

      let ret = await deletePost(communityRef, communityGet, community, body.postId, collections.blogPost);

      if (ret) {
        res.send({ success: true });
      } else {
        console.log(
          "Error in controllers/communityWallController -> postDelete()",
          "Post Delete Error"
        );
        res.send({
          success: false,
          error: "Post Delete Error",
        });
      }
    } else if (!isCreator) {
      console.log(
        "Error in controllers/communityWallController -> postDelete()",
        "You can't create a post"
      );
      res.send({ success: false, error: "You can't delete a post" });
    } else {
      console.log(
        "Error in controllers/communityWallController -> postDelete()",
        "Missing Community Id"
      );
      res.send({ success: false, error: "Missing Community Id" });
    }
  } catch (err) {
    console.log(
      "Error in controllers/communityWallController -> postCreate()",
      err
    );
    res.send({ success: false, error: err });
  }
};

exports.changePostPhoto = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    if (req.file) {
      const blogPostRef = db
        .collection(collections.blogPost)
        .doc(req.file.originalname);
      const blogPostGet = await blogPostRef.get();
      const blogPost: any = blogPostGet.data();
      if (blogPost.hasPhoto) {
        await blogPostRef.update({
          hasPhoto: true,
        });
      }

      let dir = "uploads/blogPost/" + "photos-" + req.file.originalname;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      res.send({ success: true });
    } else {
      console.log(
        "Error in controllers/blogController -> changePostPhoto()",
        "There's no file..."
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/blogController -> changePostPhoto()",
      err
    );
    res.send({ success: false });
  }
};

exports.changePostDescriptionPhotos = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    let blogPostId = req.params.blogPostId;
    let files: any[] = [];
    let fileKeys: any[] = Object.keys(req.files);

    fileKeys.forEach(function (key) {
      files.push(req.files[key]);
    });

    if (files) {
      let filesName: string[] = [];
      const blogPostRef = db.collection(collections.blogPost).doc(blogPostId);
      const blogPostGet = await blogPostRef.get();
      const blogPost: any = blogPostGet.data();

      for (let i = 0; i < files.length; i++) {
        filesName.push("/" + blogPostId + "/" + files[i].originalname);
      }
      console.log(req.params.blogPostId, filesName);
      await blogPostRef.update({
        descriptionImages: filesName,
      });
      res.send({ success: true });
    } else {
      console.log(
        "Error in controllers/blogController -> changePostDescriptionPhotos()",
        "There's no file..."
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/blogController -> changePostDescriptionPhotos()",
      err
    );
    res.send({ success: false });
  }
};

exports.getBlogPost = async (req: express.Request, res: express.Response) => {
  try {
    let params: any = req.params;
    let posts: any[] = [];

    const blogPostQuery = await db
      .collection(collections.blogPost)
      .where("communityId", "==", params.communityId)
      .get();
    if (!blogPostQuery.empty) {
      for (const doc of blogPostQuery.docs) {
        let data = doc.data();
        data.id = doc.id;
        posts.push(data);
      }
      res.status(200).send({
        success: true,
        data: posts,
      });
    } else {
      res.status(200).send({
        success: true,
        data: [],
      });
    }
  } catch (err) {
    console.log("Error in controllers/blogController -> getBlogPost()", err);
    res.send({ success: false });
  }
};

exports.getBlogPostById = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    let params: any = req.params;

    const blogPostSnap = await db
      .collection(collections.blogPost)
      .doc(params.postId)
      .get();
    const blogPost: any = blogPostSnap.data();
    blogPost.id = blogPostSnap.id;

    res.status(200).send({
      success: true,
      data: blogPost,
    });
  } catch (err) {
    console.log(
      "Error in controllers/blogController -> getBlogPostById()",
      err
    );
    res.send({ success: false, error: err });
  }
};

exports.getBlogPostPhotoById = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    let postId = req.params.blogPostId;
    if (postId) {
      const directoryPath = path.join("uploads", "blogPost");
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log("Unable to scan directory: " + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader("Content-Type", "image");
      let raw = fs.createReadStream(
        path.join("uploads", "blogPost", postId + ".png")
      );
      raw.on("error", function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log(
        "Error in controllers/blogController -> getBlogPostPhotoById()",
        "There's no post id..."
      );
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log(
      "Error in controllers/blogController -> getBlogPostPhotoById()",
      err
    );
    res.send({ success: false, error: err });
  }
};

exports.getBlogPostDescriptionPhotoById = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    let postId = req.params.blogPostId;
    let photoId = req.params.photoId;
    console.log("postId", postId, photoId);
    if (postId && photoId) {
      const directoryPath = path.join(
        "uploads",
        "blogPost",
        "photos-" + postId
      );
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log("Unable to scan directory: " + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader("Content-Type", "image");
      let raw = fs.createReadStream(
        path.join("uploads", "blogPost", "photos-" + postId, photoId + ".png")
      );
      raw.on("error", function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log(
        "Error in controllers/blogController -> getBlogPostPhotoById()",
        "There's no post id..."
      );
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log(
      "Error in controllers/blogController -> getBlogPostPhotoById()",
      err
    );
    res.send({ success: false, error: err });
  }
};

exports.makeResponseBlogPost = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    let body = req.body;
    console.log("body", body);
    if (
      body &&
      body.blogPostId &&
      body.response &&
      body.userId &&
      body.userName
    ) {
      const blogPostRef = db
        .collection(collections.blogPost)
        .doc(body.blogPostId);
      const blogPostGet = await blogPostRef.get();
      const blogPost: any = blogPostGet.data();

      let responses: any[] = [...blogPost.responses];
      responses.push({
        userId: body.userId,
        userName: body.userName,
        response: body.response,
        date: Date.now(),
      });
      await blogPostRef.update({
        responses: responses,
      });

      if (responses.length == 1) {
        let task = await tasks.updateTask(body.userId, "Make your first comment");
        res.send({success: true, data: responses, task});
      }
      res.send({success: true, data: responses});
    } else {
      console.log(
        "Error in controllers/blogController -> makeResponseBlogPost()",
        "Missing data provided"
      );
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log(
      "Error in controllers/blogController -> makeResponseBlogPost()",
      err
    );
    res.send({ success: false, error: err });
  }
};

exports.likePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.itemPostId && body.userId) {
      const blogPostRef = db
        .collection(collections.blogPost)
        .doc(body.itemPostId);
      const blogPostGet = await blogPostRef.get();
      const blogPost: any = blogPostGet.data();

      let post = await likeItemPost(
        blogPostRef,
        blogPostGet,
        blogPost,
        body.userId,
        blogPost.createdBy
      );

      await notificationsController.addNotification({
        userId: blogPost.createdBy,
        notification: {
          type: 77,
          typeItemId: "community",
          itemId: body.userId,
          follower: body.userName,
          pod: "",
          comment: blogPost.name,
          token: "",
          amount: 0,
          onlyInformation: false,
          otherItemId: blogPostGet.id,
        },
      });

      res.send({ success: true, data: post });
    } else {
      console.log(
        "Error in controllers/blogController -> likePost()",
        "Missing data provided"
      );
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log("Error in controllers/blogController -> likePost()", err);
    res.send({ success: false, error: err });
  }
};

exports.dislikePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.itemPostId && body.userId) {
      const blogPostRef = db
        .collection(collections.blogPost)
        .doc(body.itemPostId);
      const blogPostGet = await blogPostRef.get();
      const blogPost: any = blogPostGet.data();

      let post = await dislikeItemPost(
        blogPostRef,
        blogPostGet,
        blogPost,
        body.userId,
        blogPost.createdBy
      );

      await notificationsController.addNotification({
        userId: blogPost.createdBy,
        notification: {
          type: 78,
          typeItemId: "user",
          itemId: body.userId,
          follower: body.userName,
          pod: "",
          comment: blogPost.name,
          token: "",
          amount: 0,
          onlyInformation: false,
          otherItemId: blogPostGet.id,
        },
      });

      res.send({ success: true, data: post });
    } else {
      console.log(
        "Error in controllers/blogController -> likePost()",
        "Missing data provided"
      );
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log("Error in controllers/blogController -> likePost()", err);
    res.send({ success: false });
  }
};

exports.pinPost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let isCreator = await checkIfUserIsCreator(body.userId, body.communityId);

    if (body && body.wallPostId && isCreator) {
      const blogPostRef = db
        .collection(collections.communityWallPost)
        .doc(body.wallPostId);
      const blogPostGet = await blogPostRef.get();
      const blogPost: any = blogPostGet.data();

      let podPost = await pinItemPost(
        blogPostRef,
        blogPostGet,
        blogPost,
        body.pinned
      );

      res.send({ success: true, data: podPost });
    } else if (!isCreator) {
      console.log(
        "Error in controllers/blogController -> pinPost()",
        "You can't pin a post"
      );
      res.send({ success: false, error: "You can't pin a post" });
    } else {
      console.log(
        "Error in controllers/blogController -> pinPost()",
        "Info not provided"
      );
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log("Error in controllers/blogController -> pinPost()", err);
    res.send({ success: false, error: err });
  }
};


exports.discussionsCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    console.log(body);

    if(body && body.userId && body.communityId) {
      const userSnap = await db.collection(collections.user).doc(body.userId).get();
      const userData : any = userSnap.data();

      let isCreator = await checkIfUserIsCreator(body.author, body.communityId);
      let checkIsAdminModerator = await communityWallController.checkUserRole(body.userId, userData.email, body.communityId, true, false, ['Moderator']);

      if (isCreator && checkIsAdminModerator.checked) {
        let ret = await createPost(body, "communityDiscussion", body.userId);
        res.send({ success: true, data: ret });
      } else {
        console.log(
          "Error in controllers/blogController -> discussionsCreate()",
          "You can't create a discussion"
        );
        res.send({ success: false, error: "You can't create a discussion" });
      }
    } else {
      console.log(
        "Error in controllers/blogController -> discussionsCreate()",
        "Missing User Id or Community Id"
      );
      res.send({ success: false, error: "Missing User Id or Community Id" });
    }


  } catch (err) {
    console.log("Error in controllers/blogController -> blogCreate()", err);
    res.send({ success: false });
  }
};

exports.discussionsDelete = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    if(body && body.userId && body.communityId) {
      const userSnap = await db.collection(collections.user).doc(body.userId).get();
      const userData: any = userSnap.data();

      let isCreator = await checkIfUserIsCreator(body.author, body.communityId);
      let checkIsAdminModerator = await communityWallController.checkUserRole(body.userId, userData.email, body.communityId, true, false, ['Moderator']);

      if (isCreator && checkIsAdminModerator.checked) {
        const communityRef = db.collection(collections.community).doc(body.communityId);
        const communityGet = await communityRef.get();
        const community: any = communityGet.data();

        let ret = await deletePost(communityRef, communityGet, community, body.postId, collections.communityDiscussion);

        if (ret) {
          res.send({ success: true });
        } else {
          console.log(
            "Error in controllers/communityWallController -> discussionsDelete()",
            "Post Delete Error"
          );
          res.send({
            success: false,
            error: "Post Delete Error",
          });
        }
      } else {
        console.log(
          "Error in controllers/communityWallController -> discussionsDelete()",
          "You can't delete a discussion"
        );
        res.send({ success: false, error: "You can't delete a discussion" });
      }
    } else {
      console.log(
        "Error in controllers/communityWallController -> discussionsDelete()",
        "Missing User Id or Community Id"
      );
      res.send({ success: false, error: "Missing User Id or Community Id" });
    }
  } catch (err) {
    console.log(
      "Error in controllers/communityWallController -> discussionsDelete()",
      err
    );
    res.send({ success: false, error: err });
  }
};

exports.changeDiscussionsPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const communityDiscussionRef = db.collection(collections.communityDiscussion).doc(req.file.originalname);
      const communityDiscussionGet = await communityDiscussionRef.get();
      const communityDiscussion: any = communityDiscussionGet.data();
      if (communityDiscussion.hasPhoto) {
        await communityDiscussionRef.update({
          hasPhoto: true
        });
      }

      let dir = "uploads/communityDiscussion/" + "photos-" + req.file.originalname;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      res.send({ success: true });
    } else {
      console.log(
        "Error in controllers/blogController -> changeDiscussionsPhoto()",
        "There's no file..."
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/blogController -> changeDiscussionsPhoto()",
      err
    );
    res.send({ success: false });
  }
};

exports.changeDiscussionsDescriptionPhotos = async (req: express.Request, res: express.Response) => {
  try {
    let discussionId = req.params.discussionId;
    let files: any[] = [];
    let fileKeys: any[] = Object.keys(req.files);

    fileKeys.forEach(function (key) {
      files.push(req.files[key]);
    });

    if (files) {
      let filesName: string[] = [];
      const communityDiscussionRef = db.collection(collections.communityDiscussion).doc(discussionId);
      const communityDiscussionGet = await communityDiscussionRef.get();
      const communityDiscussion: any = communityDiscussionGet.data();

      for (let i = 0; i < files.length; i++) {
        filesName.push("/" + discussionId + "/" + files[i].originalname);
      }
      console.log(req.params.discussionId, filesName);
      await communityDiscussionRef.update({
        descriptionImages: filesName,
      });
      res.send({ success: true });
    } else {
      console.log(
        "Error in controllers/blogController -> changeDiscussionsDescriptionPhotos()",
        "There's no file..."
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/blogController -> changeDiscussionsDescriptionPhotos()",
      err
    );
    res.send({ success: false });
  }
};

exports.getDiscussionsPost = async (req: express.Request, res: express.Response) => {
  try {
    let params: any = req.params;
    let posts: any[] = [];

    const communityDiscussionQuery = await db
      .collection(collections.communityDiscussion)
      .where("communityId", "==", params.communityId)
      .get();
    if (!communityDiscussionQuery.empty) {
      for (const doc of communityDiscussionQuery.docs) {
        let data = doc.data();
        data.id = doc.id;
        posts.push(data);
      }
      res.status(200).send({
        success: true,
        data: posts,
      });
    } else {
      res.status(200).send({
        success: true,
        data: [],
      });
    }
  } catch (err) {
    console.log("Error in controllers/blogController -> getDiscussionsPost()", err);
    res.send({ success: false });
  }
};

exports.getDiscussionsPostById = async (req: express.Request, res: express.Response) => {
  try {
    let params: any = req.params;

    const communityDiscussionSnap = await db
      .collection(collections.communityDiscussion)
      .doc(params.discussionId)
      .get();
    const communityDiscussion: any = communityDiscussionSnap.data();
    communityDiscussion.id = communityDiscussionSnap.id;

    res.status(200).send({
      success: true,
      data: communityDiscussion,
    });
  } catch (err) {
    console.log(
      "Error in controllers/blogController -> getDiscussionsPostById()",
      err
    );
    res.send({ success: false, error: err });
  }
};

exports.getDiscussionsPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let discussionId = req.params.discussionId;
    if (discussionId) {
      const directoryPath = path.join("uploads", "communityDiscussion");
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log("Unable to scan directory: " + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader("Content-Type", "image");
      let raw = fs.createReadStream(
        path.join("uploads", "communityDiscussion", discussionId + ".png")
      );
      raw.on("error", function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log(
        "Error in controllers/blogController -> getDiscussionsPhotoById()",
        "There's no discussion id..."
      );
      res.send({ success: false, error: "There's no discussion id..." });
    }
  } catch (err) {
    console.log(
      "Error in controllers/blogController -> getDiscussionsPhotoById()",
      err
    );
    res.send({ success: false, error: err });
  }
};

exports.getDiscussionsDescriptionPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let discussionId = req.params.discussionId;
    let photoId = req.params.photoId;
    console.log("postId", discussionId, photoId);
    if (discussionId && photoId) {
      const directoryPath = path.join(
        "uploads",
        "communityDiscussion",
        "photos-" + discussionId
      );
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log("Unable to scan directory: " + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader("Content-Type", "image");
      let raw = fs.createReadStream(
        path.join("uploads", "communityDiscussion", "photos-" + discussionId, photoId + ".png")
      );
      raw.on("error", function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log(
        "Error in controllers/blogController -> getDiscussionsDescriptionPhotoById()",
        "There's no discussion id..."
      );
      res.send({ success: false, error: "There's no discussion id..." });
    }
  } catch (err) {
    console.log(
      "Error in controllers/blogController -> getDiscussionsDescriptionPhotoById()",
      err
    );
    res.send({ success: false, error: err });
  }
};

exports.makeResponseDiscussions = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.discussionId && body.response && body.userId && body.userName) {
      const communityDiscussionRef = db.collection(collections.communityDiscussion).doc(body.discussionId);
      const communityDiscussionGet = await communityDiscussionRef.get();
      const communityDiscussion: any = communityDiscussionGet.data();

      let responses: any[] = [...communityDiscussion.responses];
      responses.push({
        userId: body.userId,
        userName: body.userName,
        response: body.response,
        date: Date.now(),
      });
      await communityDiscussionRef.update({
        responses: responses,
      });

      if (responses.length == 1) {
        let task = await tasks.updateTask(body.userId, "Make your first comment");
        res.send({success: true, data: responses, task});
      }
      res.send({success: true, data: responses});
    } else {
      console.log(
        "Error in controllers/blogController -> makeResponseDiscussions()",
        "Missing data provided"
      );
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log(
      "Error in controllers/blogController -> makeResponseDiscussions()",
      err
    );
    res.send({ success: false, error: err });
  }
};

exports.likePostDiscussions = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.itemDiscussionId && body.userId) {
      const communityDiscussionRef = db.collection(collections.communityDiscussion).doc(body.itemDiscussionId);
      const communityDiscussionGet = await communityDiscussionRef.get();
      const communityDiscussion: any = communityDiscussionGet.data();

      let post = await likeItemPost(communityDiscussionRef, communityDiscussionGet, communityDiscussion, body.userId, communityDiscussion.createdBy);

      await notificationsController.addNotification({
        userId: communityDiscussion.createdBy,
        notification: {
          type: 77,
          typeItemId: "community",
          itemId: body.userId,
          follower: body.userName,
          pod: "",
          comment: communityDiscussion.name,
          token: "",
          amount: 0,
          onlyInformation: false,
          otherItemId: communityDiscussionGet.id,
        },
      });

      res.send({ success: true, data: post });
    } else {
      console.log(
        "Error in controllers/blogController -> likePostDiscussions()",
        "Missing data provided"
      );
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log("Error in controllers/blogController -> likePostDiscussions()", err);
    res.send({ success: false, error: err });
  }
};

exports.dislikePostDiscussions = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.itemDiscussionId && body.userId) {
      const communityDiscussionRef = db.collection(collections.communityDiscussion).doc(body.itemDiscussionId);
      const communityDiscussionGet = await communityDiscussionRef.get();
      const communityDiscussion: any = communityDiscussionGet.data();

      let post = await dislikeItemPost(communityDiscussionRef, communityDiscussionGet, communityDiscussion, body.userId, communityDiscussion.createdBy);

      await notificationsController.addNotification({
        userId: communityDiscussion.createdBy,
        notification: {
          type: 78,
          typeItemId: "user",
          itemId: body.userId,
          follower: body.userName,
          pod: "",
          comment: communityDiscussion.name,
          token: "",
          amount: 0,
          onlyInformation: false,
          otherItemId: communityDiscussionGet.id,
        },
      });

      res.send({ success: true, data: post });
    } else {
      console.log(
        "Error in controllers/blogController -> dislikePostDiscussions()",
        "Missing data provided"
      );
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log("Error in controllers/blogController -> dislikePostDiscussions()", err);
    res.send({ success: false });
  }
};

/*exports.adCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    //const comments = body.comments || false; // allow comments?
    const name = body.name;
    const type = body.type;
    const textShort = body.textShort;
    const schedulePost = body.schedulePost || Date.now();
    const mainHashtag = body.mainHashtag;
    const hashtags = body.hashtags;
    const communityId = body.communityId || '';
    const creditPoolId = body.creditPoolId || '';
    // const selectedFormat = body.selectedFormat; // 0 story 1 wall post
    const description = body.description;
    const descriptionArray = body.descriptionArray;

    const uid = generateUniqueId();

    if (name && textShort) {
      let data : any = {
        //comments: comments,
        name: name,
        textShort: textShort,
        schedulePost: schedulePost,
        mainHashtag: mainHashtag,
        hashtags: hashtags,
        communityId: communityId,
        creditPoolId: creditPoolId,
        description: description,
        descriptionArray: descriptionArray,
        descriptionImages: [],
        //responses: [],
        hasPhoto: false,
        createdBy: req.body.priviUser.id,
        createdAt: Date.now(),
        updatedAt: null,
      };

      await db.runTransaction(async (transaction) => {
        transaction.set(db.collection(collections.ad).doc('' + uid), data);
      });

      let ret = {id: uid, ...data};

      const commRef = db.collection(collections.community).doc(communityId);
      const commGet = await commRef.get();
      const community: any = commGet.data();

      let obj : any = {};
      obj[type] = uid;
      await commRef.update(obj)

      res.send({success: true, data: ret});
    } else {
      console.log('parameters required');
      res.send({ success: false, message: "Error in controllers/blogController -> adCreate(): parameters required" });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> adCreate()', err);
    res.send({ success: false });
  }
}

exports.changeAdPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const adRef = db.collection(collections.ad)
        .doc(req.file.originalname);
      const adGet = await adRef.get();
      const adPost: any = adGet.data();
      if (adPost.HasPhoto) {
        await adRef.update({
          HasPhoto: true
        });
      }

      let dir = 'uploads/ad/' + 'photos-' + req.file.originalname;

      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/blogController -> changeAdPhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> changeAdPhoto()', err);
    res.send({ success: false });
  }
}

exports.changeAdDescriptionPhotos = async (req: express.Request, res: express.Response) => {
  try {
    let adId = req.params.adId;
    let files : any[] = [];
    let fileKeys : any[] = Object.keys(req.files);

    fileKeys.forEach(function(key) {
      files.push(req.files[key]);
    });

    if (files) {
      let filesName : string[] = [];
      const adRef = db.collection(collections.ad)
        .doc(adId);
      const adGet = await adRef.get();
      const adPost: any = adGet.data();

      for(let i = 0; i < files.length; i++) {
        filesName.push('/' + adId + '/' + files[i].originalname)
      }
      console.log(req.params.blogPostId, filesName)
      await adRef.update({
        descriptionImages: filesName
      });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/blogController -> changeAdDescriptionPhotos()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> changeAdDescriptionPhotos()', err);
    res.send({ success: false });
  }
}


exports.getAdPostPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let adId = req.params.adId;
    if (adId) {
      const directoryPath = path.join('uploads', 'ad');
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
      let raw = fs.createReadStream(path.join('uploads', 'ad', adId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/blogController -> getAdPostPhotoById()', "There's no post id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> getAdPostPhotoById()', err);
    res.send({ success: false });
  }
};
exports.getAdPostDescriptionPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let adId = req.params.adId;
    let photoId = req.params.photoId;
    console.log('adId', adId, photoId);
    if (adId && photoId) {
      const directoryPath = path.join('uploads', 'ad', 'photos-' + adId);
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
      let raw = fs.createReadStream(path.join('uploads', 'ad', 'photos-' + adId, photoId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/blogController -> getAdPostDescriptionPhotoById()', "There's no post id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> getAdPostDescriptionPhotoById()', err);
    res.send({ success: false });
  }
};*/

const createPost = (exports.createPost = (body, collection, userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const comments = body.comments || false; // allow comments?
      const name = body.name;
      const textShort = body.textShort;
      const schedulePost = body.schedulePost || Date.now();
      const mainHashtag = body.mainHashtag;
      const hashtags = body.hashtags;
      const selectedFormat = body.selectedFormat; // 0 story 1 wall post
      const description = body.description;
      const descriptionArray = body.descriptionArray;
      const hasPhoto = body.hasPhoto || false;

      /*let blogPostGet = await db.collection(collections.blogPost).get();
      let newId = blogPostGet.size + 1;*/

      const uid = generateUniqueId();

      if (name && textShort) {
        let data: any = {
          comments: comments,
          name: name,
          textShort: textShort,
          schedulePost: schedulePost,
          mainHashtag: mainHashtag,
          hashtags: hashtags,
          selectedFormat: selectedFormat,
          description: description,
          descriptionArray: descriptionArray,
          descriptionImages: [],
          responses: [],
          pinned: false,
          hasPhoto: hasPhoto,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: null,
          got10creds: false,
          likes: [],
          dislikes: [],
          numLikes: 0,
          numDislikes: 0,
        };

        if (collection === "blogPost") {
          data.communityId = body.communityId;
          await db.runTransaction(async (transaction) => {
            transaction.set(
              db.collection(collections.blogPost).doc("" + uid),
              data
            );
          });
        } else if (collection === "podWallPost") {
          data.podId = body.podId;
          await db.runTransaction(async (transaction) => {
            transaction.set(
              db.collection(collections.podWallPost).doc("" + uid),
              data
            );
          });
        } else if (collection === "podNFTWallPost") {
          data.podId = body.podId;
          await db.runTransaction(async (transaction) => {
            transaction.set(
              db.collection(collections.podNFTWallPost).doc("" + uid),
              data
            );
          });
        } else if (collection === "creditWallPost") {
          data.creditPoolId = body.creditPoolId;
          await db.runTransaction(async (transaction) => {
            transaction.set(
              db.collection(collections.creditWallPost).doc("" + uid),
              data
            );
          });
        } else if (collection === "insuranceWallPost") {
          data.insuranceId = body.insuranceId;
          await db.runTransaction(async (transaction) => {
            transaction.set(
              db.collection(collections.insuranceWallPost).doc("" + uid),
              data
            );
          });
        } else if (collection === "communityWallPost") {
          data.communityId = body.communityId;
          await db.runTransaction(async (transaction) => {
            transaction.set(
              db.collection(collections.communityWallPost).doc("" + uid),
              data
            );
          });
        } else if (collection === "userWallPost") {
          data.userId = body.userId;
          await db.runTransaction(async (transaction) => {
            transaction.set(
              db.collection(collections.userWallPost).doc("" + uid),
              data
            );
          });
        } else if (collection === "communityDiscussion") {
          data.communityId = body.communityId;
          await db.runTransaction(async (transaction) => {
            transaction.set(
              db.collection(collections.communityDiscussion).doc("" + uid),
              data
            );
          });
        } else {
          console.log("parameters required missing");
          reject("Error in createPost: " + "Not a valid collection");
        }

        let ret = { id: uid, ...data };

        resolve(ret);
      } else {
        console.log("parameters required missing");
        reject("Error in createPost: " + "parameters required missing");
      }
    } catch (e) {
      reject("Error in createPost: " + e);
    }
  });
});

const deletePost = (exports.deletePost = (itemRef, itemGet, item, id, postCollection) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (postCollection !== "BlogPost") {
        let posts = [...item.Posts];
        let indexFound = posts.findIndex((post) => post === id);

        posts.splice(indexFound, 1);
        await itemRef.update({
          Posts: posts,
        });
      }

      await db.collection(postCollection).doc(id).delete();

      resolve(true);
    } catch (e) {
      reject("Error in deletePost: " + e);
    }
  });
});

const likeItemPost = (exports.likeItemPost = (
  dbRef,
  dbGet,
  dbItem,
  userId,
  creator
) => {
  return new Promise(async (resolve, reject) => {
    try {
      let likes: any[] = [];
      if (dbItem.likes && dbItem.likes.length > 0) {
        likes = [...dbItem.likes];
      }
      let dislikes: any[] = [];
      if (dbItem.dislikes && dbItem.dislikes.length > 0) {
        dislikes = [...dbItem.dislikes];
      }
      let numLikes: number = dbItem.numLikes || 0;
      let numDislikes: number = dbItem.numDislikes || 0;

      let likeIndex = likes.findIndex((user) => user === userId);
      if (likeIndex === -1) {
        likes.push(userId);
        numLikes = dbItem.numLikes + 1;
      }

      let dislikeIndex = dislikes.findIndex((user) => user === userId);
      if (dislikeIndex !== -1) {
        dislikes.splice(dislikeIndex, 1);
        numDislikes = numDislikes - 1;
      }

      await dbRef.update({
        likes: likes,
        dislikes: dislikes,
        numLikes: numLikes,
        numDislikes: numDislikes,
      });

      dbItem.likes = likes;
      dbItem.dislikes = dislikes;
      dbItem.numLikes = numLikes;
      dbItem.numDislikes = numDislikes;

      if (creator !== userId) {
        await userController.updateUserCred(creator, true);
      }

      if (!dbItem.got10creds && (numDislikes + numLikes) >= 10) {
        let res = await tasks.updateTask(dbItem.createdBy, "Create 1 Blog Post that receives 10 creds");
        await dbRef.update({got10creds: true});
        dbItem.task = res;
        resolve(dbItem);
      }

      resolve(dbItem);
    } catch (e) {
      console.log("Error in controllers/blogController -> likeItemPost()", e);
      reject("Error in controllers/blogController -> likeItemPost()" + e);
    }
  });
});

const dislikeItemPost = (exports.dislikeItemPost = (
  dbRef,
  dbGet,
  dbItem,
  userId,
  creator
) => {
  return new Promise(async (resolve, reject) => {
    try {
      let likes: any[] = [];
      if (dbItem.likes && dbItem.likes.length > 0) {
        likes = [...dbItem.likes];
      }
      let dislikes: any[] = [];
      if (dbItem.dislikes && dbItem.dislikes.length > 0) {
        dislikes = [...dbItem.dislikes];
      }
      let numLikes = dbItem.numLikes;
      let numDislikes = dbItem.numDislikes;

      let likeIndex = likes.findIndex((user) => user === userId);
      if (likeIndex !== -1) {
        likes.splice(likeIndex, 1);
        numLikes = numLikes - 1;
      }

      let dislikeIndex = dislikes.findIndex((user) => user === userId);
      if (dislikeIndex === -1) {
        dislikes.push(userId);
        numDislikes = dbItem.numDislikes + 1;
      }

      await dbRef.update({
        likes: likes,
        dislikes: dislikes,
        numLikes: numLikes,
        numDislikes: numDislikes,
      });

      dbItem.likes = likes;
      dbItem.dislikes = dislikes;
      dbItem.numLikes = numLikes;
      dbItem.numDislikes = numDislikes;

      if (creator !== userId) {
        await userController.updateUserCred(creator, true);
      }

      if (!dbItem.got10creds && (numDislikes + numLikes) >= 10) {
        let res = tasks.updateTask(dbItem.createdBy, "Create 1 Blog Post that receives 10 creds");
        await dbRef.update({got10creds: true});
        dbItem.task = res;
        resolve(dbItem);
      }

      resolve(dbItem);
    } catch (e) {
      console.log(
        "Error in controllers/blogController -> dislikeItemPost()",
        e
      );
      reject("Error in controllers/blogController -> dislikeItemPost()" + e);
    }
  });
});

const pinItemPost = (exports.pinItemPost = (dbRef, dbGet, dbItem, pinned) => {
  return new Promise(async (resolve, reject) => {
    try {
      await dbRef.update({
        pinned: pinned,
      });

      dbItem.pinned = pinned;
      resolve(dbItem);
    } catch (e) {
      console.log("Error in controllers/blogController -> pinItemPost()", e);
      reject("Error in controllers/blogController -> pinItemPost()" + e);
    }
  });
});

exports.removeStories = cron.schedule("* * */1 * *", async () => {
  // TODO at some point we should add here request with limit and offset to avoid performance issue
  try {
    console.log("********* Stories removeStories() cron job started *********");

    // Communities
    await elementWallPost(
      collections.communityWallPost,
      collections.community,
      "communityId"
    );

    // Pod
    await elementWallPost(collections.podWallPost, collections.podsFT, "podId");

    // Credit
    await elementWallPost(
      collections.creditWallPost,
      collections.priviCredits,
      "creditPoolId"
    );

    // Insurance
    await elementWallPost(
      collections.insuranceWallPost,
      collections.insurance,
      "insuranceId"
    );
  } catch (err) {
    console.log("Error in controllers/blogController -> removeStories()", err);
  }
});

const elementWallPost = async (postCollection, itemCollection, itemIdLabel) => {
  let timeStampYesterday = Math.round(new Date().getTime() / 1000) - 24 * 3600;
  let yesterdayDateTimestamp = new Date(timeStampYesterday * 1000).getTime();

  const postQuery = await db
    .collection(postCollection)
    .where("createdAt", "<", yesterdayDateTimestamp)
    .get();

  if (!postQuery.empty) {
    for (const doc of postQuery.docs) {
      let data = doc.data();
      let id = doc.id;

      const itemRef = db.collection(itemCollection).doc(data[itemIdLabel]);
      const itemGet = await itemRef.get();
      const item: any = itemGet.data();

      if (item && item.Posts) {
        let posts = [...item.Posts];
        let indexFound = posts.findIndex((post) => post === id);

        posts.splice(indexFound, 1);
        await itemRef.update({
          Posts: posts,
        });

        await db.collection(postCollection).doc(id).delete();
      }
    }
  }
};

const checkIfUserIsCreator = (userId, communityId) => {
  return new Promise(async (resolve, reject) => {
    const communityRef = db.collection(collections.community).doc(communityId);
    const communityGet = await communityRef.get();
    const community: any = communityGet.data();

    console.log(userId, community, community.Creator);

    if (community && community.Creator && community.Creator === userId) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
};
