import { updateFirebase, createNotification, getRateOfChangeAsMap, getCurrencyRatesUsdBase, getUidFromEmail } from "../functions/functions";
import { formatDate } from "../functions/utilities";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from 'express';
import path from 'path';
import fs from "fs";

const notificationsController = require('./notificationsController');

const categoryListHelper = async () => {
	const data: {}[] = [];

	try {
		const categoriesSnap = await db.collection(collections.forumCategory).get();
		for (const doc of categoriesSnap.docs) {
			const name = doc.data().name;
			const id = doc.id;
			const description = doc.data().description;

			if (name) data.push({ categoryId: id, name: name, description: description });
		}

	} catch (err) {
		console.log('Error in controllers/forumController -> categoryListHelper()', err);
	}

	return data;

} // categoryListHelper

// Export the function
module.exports = categoryListHelper;

module.exports.categoryList = async (req: express.Request, res: express.Response) => {
	const data = await categoryListHelper();

	res.send({ success: true, data: data });

} // categoryList

module.exports.postCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    const subject = body.subject;
    const content = body.content;
    let linkId = (body.linkId && (body.linkId != "null"))? body.linkId : null;
    const postType = body.postType;
    let categoryId = body.categoryId? body.categoryId : null;

    let notificationType : number = 0;
		let creator: string = '';
    // hard coded post category id
    if (postType == "cp") { // Credit Pools
        categoryId = 5;
				notificationType = 41;
				const priviCreditsRef = db.collection(collections.priviCredits).doc(linkId);
				const priviCreditsGet = await priviCreditsRef.get();
				const priviCredits: any = priviCreditsGet.data();
				creator = priviCredits.Creator;
    } else if (postType == "lp") { // Loan Pools
        categoryId = 6;

    } else if (postType == "ft") { // FT
        categoryId = 7;
				notificationType = 30;
				const podSnap = await db.collection(collections.podsFT).doc(linkId).get();
				const podData : any = podSnap.data();
				creator = podData.Creator;
    } else if (postType == "pnft") { // Physical NFT
        categoryId = 8;

    } else if (postType == "dnft") { // Digital NFT
        categoryId = 9;

    } else if (postType == "pei") { // Privi Ecosystem Issues
        categoryId = 10;

    } else if (postType == "ped") { // Privi Ecosystem Discussions
        categoryId = 11;

    } else if (postType == "pep") { // Privi Ecosystem Proposals
        categoryId = 12;

    }

    let forumPostGet = await db.collection(collections.forumPost).get();
    let newId = forumPostGet.size + 1;

    if (subject && content) {
/*
[
  {
    fieldname: 'image',
    originalname: '1.png',
    encoding: '7bit',
    mimetype: 'image/png',
    destination: 'uploads/forum',
    filename: '1.png',
    path: 'uploads/forum/1.png',
    size: 267394
  },
  {
    fieldname: 'document',
    originalname: '1.png',
    encoding: '7bit',
    mimetype: 'image/png',
    destination: 'uploads/forum',
    filename: '1.png',
    path: 'uploads/forum/1.png',
    size: 267394
  }
]
*/
        let documentFile = "";
        let imageFile = "";
        for (let i = 0; i < req.files.length; i++) {
            let f = req.files[i];
						// console.log("f", f);
            if (f.fieldname == "image") {
                imageFile = f.filename;
            } else if (f.fieldname == "document") {
                documentFile = f.filename;
            }
        }

      await db.runTransaction(async (transaction) => {
        transaction.set(db.collection(collections.forumPost).doc('' + newId), {
          subject: subject,
          content: content,

          categoryId: categoryId,
          postType: postType,
          linkId: linkId,

          imageFile: imageFile,
          documentFile: documentFile,

          createdBy: req.body.priviUser.id,
          countComments: 0,
          lastComment: Date.now(),
          createdAt: Date.now(),
          updatedAt: null,
        });
      });

			if(notificationType !== 0) {
				const userRef = db.collection(collections.user)
					.doc(req.body.priviUser.id);
				const userGet = await userRef.get();
				const user: any = userGet.data();

				await notificationsController.addNotification({
					userId: creator,
					notification: {
						type: notificationType,
						typeItemId: 'user',
						itemId: req.body.priviUser.id,
						follower: user.firstName,
						pod: linkId,
						comment: '',
						token: '',
						amount: 0,
						onlyInformation: false,
						otherItemId: linkId
					}
				});
			}

      res.send({
        success: true, data: {
          id: newId,
          subject: subject,
          content: content,

          categoryId: categoryId,
          postType: postType,
          linkId: linkId,

          imageFile: imageFile,
          documentFile: documentFile,

          createdBy: req.body.priviUser.id,
          countComments: 0,
          lastComment: Date.now(),
          createdAt: Date.now(),
          updatedAt: null,
        }
      });

    } else {
      console.log('parameters required');
      res.send({ success: false, message: "parameters required" });
    }

  } catch (err) {
    console.log('Error in controllers/postController -> postCreate()', err);
    res.send({ success: false });
  }

} // postCreate

module.exports.postListByLink = async (req: express.Request, res: express.Response) => {
    const body = req.body;

    const linkId = body.linkId? body.linkId : null;
    const postType = body.postType;

	// const postType = req.params.postType;
	// const linkId = req.params.linkId? req.params.linkId : null;

	const data: {}[] = [];

	const cats: {}[] = await categoryListHelper();
	let catsMap = {};
	for (const c of cats) {
		catsMap[c["categoryId"]] = c["name"];
	}
	let userIdNameMap = {};
	let userIdHasPhotoMap = {};

	try {
		const postsSnap = await db.collection(collections.forumPost)
			.where("linkId", "==", linkId)
			.where("postType", "==", postType)
			.orderBy("lastComment", "desc")
			.get();

		for (const doc of postsSnap.docs) {
			let categoryName = catsMap[doc.data().categoryId] ? catsMap[doc.data().categoryId] : "";
			let name = "";
			let createdByHasPhoto = false;
			if (!userIdNameMap[doc.data().createdBy]) { // not in array cache
				const userSnap = await db.collection(collections.user).doc(doc.data().createdBy).get();
				const userData = userSnap.data();
				if (userData) {
					name = (userData.firstName ? userData.firstName : "") + (userData.lastName ? " " + userData.lastName : "");
					createdByHasPhoto = userData.HasPhoto;

					userIdNameMap[doc.data().createdBy] = name;
					userIdHasPhotoMap[doc.data().createdBy] = createdByHasPhoto;
				}
			} else {
				name = userIdNameMap[doc.data().createdBy];
				createdByHasPhoto = userIdHasPhotoMap[doc.data().createdBy];
			}

			data.push({ id: doc.id, categoryId: doc.data().categoryId, categoryName: categoryName, linkId: linkId, postType: postType, content: doc.data().content, subject: doc.data().subject, createdBy: doc.data().createdBy, createdByName: name, createdByHasPhoto: createdByHasPhoto, createdAt: doc.data().createdAt, createdAtFormat: formatDate(new Date(doc.data().createdAt)), lastComment: doc.data().lastComment, lastCommentFormat: formatDate(new Date(doc.data().lastComment)), countComments: doc.data().countComments, imageFile: doc.data().imageFile, documentFile: doc.data().documentFile});
		}

		res.send({ success: true, data: data });

	} catch (err) {
		console.log('Error in controllers/forumController -> postListByLink()', err);
		res.send({ success: false });
	}

} // postListByLink

module.exports.postView = async (req: express.Request, res: express.Response) => {
	const postId = req.params.postId;
	const data = {};

	const cats: {}[] = await categoryListHelper();
	let catsMap = {};
	for (const c of cats) {
		catsMap[c["categoryId"]] = c["name"];
	}
	let userIdNameMap = {};
	let userIdHasPhotoMap = {};

	if (postId) {
		try {
			const postSnap = await db.collection(collections.forumPost).doc(postId).get();
			const postData = postSnap.data();

			if (postData) {
				let categoryName = catsMap[postData.categoryId] ? catsMap[postData.categoryId] : "";
				let name = "";
				let createdByHasPhoto = false;
				if (!userIdNameMap[postData.createdBy]) { // not in array cache
					const userSnap = await db.collection(collections.user).doc(postData.createdBy).get();
					const userData = userSnap.data();
					if (userData) {
						name = (userData.firstName ? userData.firstName : "") + (userData.lastName ? " " + userData.lastName : "");
						createdByHasPhoto = userData.HasPhoto;

						userIdNameMap[postData.createdBy] = name;
						userIdHasPhotoMap[postData.createdBy] = createdByHasPhoto;
					}
				} else {
					name = userIdNameMap[postData.createdBy];
					createdByHasPhoto = userIdHasPhotoMap[postData.createdBy];
				}

				data["post"] = { id: postId, categoryId: postData.categoryId, categoryName: categoryName, linkId: postData.linkId, postType: postData.postType, content: postData.content, subject: postData.subject, createdBy: postData.createdBy, createdByName: name, createdByHasPhoto: createdByHasPhoto, createdAt: postData.createdAt, createdAtFormat: formatDate(new Date(postData.createdAt)), lastComment: postData.lastComment, lastCommentFormat: formatDate(new Date(postData.lastComment)), countComments: postData.countComments, imageFile: postData.imageFile, documentFile: postData.documentFile };

				// comments
				const comments: {}[] = [];
				const commentsSnap = await db.collection(collections.forumComment)
					.where("postId", "==", postId)
					.orderBy("createdAt", "asc")
					.get();

				for (const doc of commentsSnap.docs) {
					let name = "";
					let createdByHasPhoto = false;
					if (!userIdNameMap[doc.data().createdBy]) { // not in array cache
						const userSnap = await db.collection(collections.user).doc(doc.data().createdBy).get();
						const userData = userSnap.data();
						if (userData) {
							name = (userData.firstName ? userData.firstName : "") + (userData.lastName ? " " + userData.lastName : "");
							createdByHasPhoto = userData.HasPhoto;

							userIdNameMap[doc.data().createdBy] = name;
							userIdHasPhotoMap[doc.data().createdBy] = createdByHasPhoto;
						}
					} else {
						name = userIdNameMap[doc.data().createdBy];
						createdByHasPhoto = userIdHasPhotoMap[doc.data().createdBy];
					}

					comments.push({ id: doc.id, postId: postId, content: doc.data().content, createdBy: doc.data().createdBy, createdByName: name, createdByHasPhoto: createdByHasPhoto, createdAt: doc.data().createdAt, createdAtFormat: formatDate(new Date(doc.data().createdAt)), });
				}

				data["comments"] = comments;

				res.send({ success: true, data: data });

			} else {
				console.log('post not found');
				res.status(404);
				res.send({ success: false, message: "post not found" });
			}

		} catch (err) {
			console.log('Error in controllers/forumController -> postView()', err);
			res.send({ success: false });
		}

	} else {
		console.log('postId required');
		res.send({ success: false, message: "postId required" });
	}

} // postView

module.exports.commentCreate = async (req: express.Request, res: express.Response) => {
	try {
		const body = req.body;

		const postId = body.postId;
		const content = body.content;

		let forumCommentGet = await db.collection(collections.forumComment).get();
		let newId = forumCommentGet.size + 1;

		if (postId && content) {
			const postSnap = await db.collection(collections.forumPost).doc(postId).get();
			const postData = postSnap.data();

			if (postData) {
				await db.runTransaction(async (transaction) => {

					// no check if firestore insert works? TODO
					transaction.set(db.collection(collections.forumComment).doc('' + newId), {
						postId: postId,
						content: content,
						createdBy: req.body.priviUser.id,
						createdAt: Date.now(),
						updatedAt: null,
					});
				});

				// update post
				postData.lastComment = Date.now();
				postData.countComments = postData.countComments + 1;

				db.collection(collections.forumPost).doc(postId).update(postData);

				res.send({
					success: true,
					data: {
						postId: postId,
						content: content,
						createdBy: req.body.priviUser.id,
						id: newId
					}
				});

			} else {
				console.log('post not found');
				res.status(404);
				res.send({ success: false, message: "post not found" });
			}

		} else {
			console.log('parameters required');
			res.send({ success: false, message: "parameters required" });
		}

	} catch (err) {
		console.log('Error in controllers/postController -> commentCreate()', err);
		res.send({ success: false });
	}

} // commentCreate

module.exports.postImageView = async (req: express.Request, res: express.Response) => {
	const postId = req.params.postId;
	const data = {};

	const cats: {}[] = await categoryListHelper();
	let catsMap = {};
	for (const c of cats) {
		catsMap[c["categoryId"]] = c["name"];
	}
	let userIdNameMap = {};
	let userIdHasPhotoMap = {};

	if (postId) {
		try {
			const postSnap = await db.collection(collections.forumPost).doc(postId).get();
			const postData = postSnap.data();

			if (postData) {
				let imageFile = postData.imageFile;

				if (imageFile) {
					// based on getPhotoid codes
					const directoryPath = path.join('uploads', 'forum');
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
					let raw = fs.createReadStream(path.join('uploads', 'forum', imageFile));
					raw.on('error', function (err) {
							console.log(err)
							res.sendStatus(400);
					});
					raw.pipe(res);

				} else {
					console.log('post has no image');
					res.status(404);
					res.send({ success: false, message: "post has no image" });
				}

			} else {
				console.log('post not found');
				res.status(404);
				res.send({ success: false, message: "post not found" });
			}

		} catch (err) {
			console.log('Error in controllers/forumController -> postImageView()', err);
			res.send({ success: false });
		}

	} else {
		console.log('postId required');
		res.send({ success: false, message: "postId required" });
	}

} // postImageView

module.exports.postDocumentView = async (req: express.Request, res: express.Response) => {
	const postId = req.params.postId;
	const data = {};

	if (postId) {
		try {
			const postSnap = await db.collection(collections.forumPost).doc(postId).get();
			const postData = postSnap.data();

			if (postData) {
				let documentFile = postData.documentFile;

				if (documentFile) {
					// based on getPhotoid codes
					const directoryPath = path.join('uploads', 'forum');
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

					// stream the document back by loading the file
					res.setHeader('Content-Type', 'document');
					let raw = fs.createReadStream(path.join('uploads', 'forum', documentFile));
					raw.on('error', function (err) {
							console.log(err)
							res.sendStatus(400);
					});
					raw.pipe(res);

				} else {
					console.log('post has no document');
					res.status(404);
					res.send({ success: false, message: "post has no document" });
				}

			} else {
				console.log('post not found');
				res.status(404);
				res.send({ success: false, message: "post not found" });
			}

		} catch (err) {
			console.log('Error in controllers/forumController -> postDocumentView()', err);
			res.send({ success: false });
		}

	} else {
		console.log('postId required');
		res.send({ success: false, message: "postId required" });
	}

} // postDocumentView
