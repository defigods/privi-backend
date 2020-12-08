import { updateFirebase, createNotification, getRateOfChange, getCurrencyRatesUsdBase, getUidFromEmail } from "../functions/functions";
import { formatDate } from "../functions/utilities";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from 'express';
// const currencySymbol = require("currency-symbol");
// import { countDecimals } from "../functions/utilities";

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

/*
module.exports.commentCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    const postId = req.params.postId;
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
					updatedAt: Date.now(),
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

module.exports.commentDelete = async (req: express.Request, res: express.Response) => {
	const commentId = req.params.commentId;

	if (commentId) {
		try {
			const commentSnap = await db.collection(collections.forumComment).doc(commentId).get();
			const commentData = commentSnap.data();

			if (commentData) {
				db.collection(collections.forumComment).doc(commentId).delete();
				
				res.send({ success: true });	
			
			} else {
				console.log('comment not found');
				res.status(404);
				res.send({ success: false, message: "comment not found" });
			}
		
		} catch (err) {
			console.log('Error in controllers/forumController -> commentDelete()', err);
			res.send({ success: false });
		}

	} else {
		console.log('commentId required');
		res.send({ success: false, message: "commentId required" });
	}

} // commentDelete



module.exports.postDelete = async (req: express.Request, res: express.Response) => {
	const postId = req.params.postId;

	if (postId) {
		try {
			const postSnap = await db.collection(collections.forumPost).doc(postId).get();
			const postData = postSnap.data();

			if (postData) {
				db.collection(collections.forumPost).doc(postId).delete();
				
				// delete also comments
				const commentsSnap = await db.collection(collections.forumComment)
					.where("postId", "==", postId)
					.orderBy("createdAt", "asc")
					.get();
				
				for (const doc of commentsSnap.docs) {
					doc.ref.delete();
				}
				
				res.send({ success: true });	
			
			} else {
				console.log('post not found');
				res.status(404);
				res.send({ success: false, message: "post not found" });
			}
		
		} catch (err) {
			console.log('Error in controllers/forumController -> postDelete()', err);
			res.send({ success: false });
		}

	} else {
		console.log('postId required');
		res.send({ success: false, message: "postId required" });
	}

} // postDelete

module.exports.postList = async (req: express.Request, res: express.Response) => {
  const data: {}[] = [];

  const cats: {}[] = await categoryListHelper();
  let catsMap = {};
  for (const c of cats) {
    catsMap[c["categoryId"]] = c["name"];
  }
  let userIdNameMap = {};

  try {
    const postsSnap = await db.collection(collections.forumPost)
      .orderBy("lastComment", "desc")
      .get();

    for (const doc of postsSnap.docs) {
      let categoryName = catsMap[doc.data().categoryId]? catsMap[doc.data().categoryId] : "";
      let name = "";
      if (userIdNameMap[doc.data().createdBy]) {
        name = userIdNameMap[doc.data().createdBy];
      } else {
        const userSnap = await db.collection(collections.user).doc(doc.data().createdBy).get();
        const userData = userSnap.data();
        if (userData) {
          name = (userData.firstName? userData.firstName : "") + (userData.lastName? " " + userData.lastName : "");
        }
      }

      data.push({ id: doc.id, categoryId: doc.data().categoryId, categoryName:categoryName, content: doc.data().content, subject: doc.data().subject, createdBy: doc.data().createdBy, createdByName: name, createdAt: doc.data().createdAt, createdAtFormat:formatDate(new Date(doc.data().createdAt)), lastComment: doc.data().lastComment, lastCommentFormat:formatDate(new Date(doc.data().lastComment)), countComments:doc.data().countComments});
    }

	res.send({ success: true, data: data });

  } catch (err) {
    console.log('Error in controllers/forumController -> postList()', err);
	res.send({ success: false });
  }

} // postList

module.exports.postView = async (req: express.Request, res: express.Response) => {
	const postId = req.params.postId;
	const data = {};

	const cats: {}[] = await categoryListHelper();
	let catsMap = {};
	for (const c of cats) {
		catsMap[c["categoryId"]] = c["name"];
	}
	let userIdNameMap = {};
  
	if (postId) {
		try {
			const postSnap = await db.collection(collections.forumPost).doc(postId).get();
			const postData = postSnap.data();

			if (postData) {
				let categoryName = catsMap[postData.categoryId]? catsMap[postData.categoryId] : "";
				let name = "";
				if (userIdNameMap[postData.createdBy]) {
					name = userIdNameMap[postData.createdBy];
				} else {
					const userSnap = await db.collection(collections.user).doc(postData.createdBy).get();
					const userData = userSnap.data();
					if (userData) {
						name = (userData.firstName? userData.firstName : "") + (userData.lastName? " " + userData.lastName : "");
					}
				}

				data["post"] = { id: postId, categoryId: postData.categoryId, categoryName:categoryName, content: postData.content, subject: postData.subject, createdBy: postData.createdBy, createdByName: name, createdAt: postData.createdAt, createdAtFormat:formatDate(new Date(postData.createdAt)), lastComment: postData.lastComment, lastCommentFormat:formatDate(new Date(postData.lastComment)), countComments:postData.countComments};

				// comments
				const comments: {}[] = [];
				const commentsSnap = await db.collection(collections.forumComment)
					.where("postId", "==", postId)
					.orderBy("createdAt", "asc")
					.get();
				
				for (const doc of commentsSnap.docs) {
					let name = "";
					if (userIdNameMap[doc.data().createdBy]) {
						name = userIdNameMap[doc.data().createdBy];
					} else {
						const userSnap = await db.collection(collections.user).doc(doc.data().createdBy).get();
						const userData = userSnap.data();
						if (userData) {
							name = (userData.firstName? userData.firstName : "") + (userData.lastName? " " + userData.lastName : "");
						}					
					}
					
					comments.push({ commentId: doc.id, postId: postId, content: doc.data().content, createdBy: doc.data().createdBy, createdByName: name, createdAt: doc.data().createdAt, createdAtFormat:formatDate(new Date(doc.data().createdAt)), });
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



module.exports.postComments = async (req: express.Request, res: express.Response) => {
	const postId = req.params.postId;
	const postType = req.params.postType;

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
			// comments
			const comments: {}[] = [];
			const commentsSnap = await db.collection(collections.forumComment)
				.where("postId", "==", postId)
				.where("postType", "==", postType)
				.orderBy("createdAt", "asc")
				.get();
			
			for (const doc of commentsSnap.docs) {
				let name = "";
                let createdByHasPhoto = false;
				if (!userIdNameMap[doc.data().createdBy]) { // not in array cache
					const userSnap = await db.collection(collections.user).doc(doc.data().createdBy).get();
					const userData = userSnap.data();
					if (userData) {
						name = (userData.firstName? userData.firstName : "") + (userData.lastName? " " + userData.lastName : "");
                        createdByHasPhoto = userData.HasPhoto;

                        userIdNameMap[doc.data().createdBy] = name;
                        userIdHasPhotoMap[doc.data().createdBy] = createdByHasPhoto;
					}
				} else {
				    name = userIdNameMap[doc.data().createdBy];
				    createdByHasPhoto = userIdHasPhotoMap[doc.data().createdBy];
				}

				comments.push({ commentId: doc.id, postId: postId, postType: postType, content: doc.data().content, createdBy: doc.data().createdBy, createdByName: name, createdByHasPhoto: createdByHasPhoto, createdAt: doc.data().createdAt, createdAtFormat:formatDate(new Date(doc.data().createdAt)), });
			}
			
			data["comments"] = comments;
			
			res.send({ success: true, data: data });
		
		} catch (err) {
			console.log('Error in controllers/forumController -> postComments()', err);
			res.send({ success: false });
		}

	} else {
		console.log('postId required');
		res.send({ success: false, message: "postId required" });
	}

} // postComments

module.exports.commentCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    const content = body.content;
    const postId = body.postId;
    const postType = body.postType;

    let forumCommentGet = await db.collection(collections.forumComment).get();
    let newId = forumCommentGet.size + 1;

    if (content && postId && postType) {
		await db.runTransaction(async (transaction) => {

			transaction.set(db.collection(collections.forumComment).doc('' + newId), {
				postId: postId,
				postType: postType,
				content: content,
				createdBy: req.body.priviUser.id,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			});
		});

		res.send({
			success: true, 
			data: {
				postId: postId,
				postType: postType,
				content: content,
				createdBy: req.body.priviUser.id,
				id: newId
			}
		});

    } else {
      console.log('parameters required');
      res.send({ success: false, message: "parameters required" });
    }

  } catch (err) {
    console.log('Error in controllers/postController -> commentCreate()', err);
    res.send({ success: false });
  }

} // commentCreate
*/












































module.exports.postCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    const subject = body.subject;
    const content = body.content;
    const linkId = body.linkId;
    const postType = body.postType;
    let categoryId = body.categoryId? body.categoryId : null;

    if (postType == "cp") { // hard coded post category id
        categoryId = 5; // credit pool
    }

    let forumPostGet = await db.collection(collections.forumPost).get();
    let newId = forumPostGet.size + 1;

    if (subject && content) {

      await db.runTransaction(async (transaction) => {
        transaction.set(db.collection(collections.forumPost).doc('' + newId), {
          subject: subject,
          content: content,

          categoryId: categoryId,
          postType: postType,
          linkId: linkId,

          createdBy: req.body.priviUser.id,
          countComments: 0,
          lastComment: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
      res.send({
        success: true, data: {
          id: newId,
          subject: subject,
          content: content,

          categoryId: categoryId,
          postType: postType,
          linkId: linkId,

          createdBy: req.body.priviUser.id,
          countComments: 0,
          lastComment: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
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
    const linkId = req.params.linkId;
    const postType = req.params.postType;

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
      let categoryName = catsMap[doc.data().categoryId]? catsMap[doc.data().categoryId] : "";
      let name = "";
		let createdByHasPhoto = false;
		if (!userIdNameMap[doc.data().createdBy]) { // not in array cache
			const userSnap = await db.collection(collections.user).doc(doc.data().createdBy).get();
			const userData = userSnap.data();
			if (userData) {
				name = (userData.firstName? userData.firstName : "") + (userData.lastName? " " + userData.lastName : "");
				createdByHasPhoto = userData.HasPhoto;

				userIdNameMap[doc.data().createdBy] = name;
				userIdHasPhotoMap[doc.data().createdBy] = createdByHasPhoto;
			}
		} else {
			name = userIdNameMap[doc.data().createdBy];
			createdByHasPhoto = userIdHasPhotoMap[doc.data().createdBy];
		}

      data.push({ id: doc.id, categoryId: doc.data().categoryId, categoryName:categoryName, linkId:linkId, postType:postType, content: doc.data().content, subject: doc.data().subject, createdBy: doc.data().createdBy, createdByName: name, createdByHasPhoto:createdByHasPhoto, createdAt: doc.data().createdAt, createdAtFormat:formatDate(new Date(doc.data().createdAt)), lastComment: doc.data().lastComment, lastCommentFormat:formatDate(new Date(doc.data().lastComment)), countComments:doc.data().countComments});
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
				let categoryName = catsMap[postData.categoryId]? catsMap[postData.categoryId] : "";
                let name = "";
		        let createdByHasPhoto = false;
		        if (!userIdNameMap[postData.createdBy]) { // not in array cache
			        const userSnap = await db.collection(collections.user).doc(postData.createdBy).get();
			        const userData = userSnap.data();
			        if (userData) {
				        name = (userData.firstName? userData.firstName : "") + (userData.lastName? " " + userData.lastName : "");
				        createdByHasPhoto = userData.HasPhoto;

				        userIdNameMap[postData.createdBy] = name;
				        userIdHasPhotoMap[postData.createdBy] = createdByHasPhoto;
			        }
		        } else {
			        name = userIdNameMap[postData.createdBy];
			        createdByHasPhoto = userIdHasPhotoMap[postData.createdBy];
		        }

				data["post"] = { id: postId, categoryId: postData.categoryId, categoryName:categoryName, linkId:postData.linkId, postType:postData.postType, content: postData.content, subject: postData.subject, createdBy: postData.createdBy, createdByName: name, createdByHasPhoto:createdByHasPhoto, createdAt: postData.createdAt, createdAtFormat:formatDate(new Date(postData.createdAt)), lastComment: postData.lastComment, lastCommentFormat:formatDate(new Date(postData.lastComment)), countComments:postData.countComments};

				// comments
				const comments: {}[] = [];
				const commentsSnap = await db.collection(collections.forumComment)
					.where("postId", "==", postId)
					.orderBy("createdAt", "asc")
					.get();
				
				for (const doc of commentsSnap.docs) {
					let name = "";
		            let createdByHasPhoto = false;
		            if (!userIdNameMap[postData.createdBy]) { // not in array cache
			            const userSnap = await db.collection(collections.user).doc(postData.createdBy).get();
			            const userData = userSnap.data();
			            if (userData) {
				            name = (userData.firstName? userData.firstName : "") + (userData.lastName? " " + userData.lastName : "");
				            createdByHasPhoto = userData.HasPhoto;

				            userIdNameMap[postData.createdBy] = name;
				            userIdHasPhotoMap[postData.createdBy] = createdByHasPhoto;
			            }
		            } else {
			            name = userIdNameMap[postData.createdBy];
			            createdByHasPhoto = userIdHasPhotoMap[postData.createdBy];
		            }

					comments.push({ id: doc.id, postId: postId, content: doc.data().content, createdBy: doc.data().createdBy, createdByName: name, createdByHasPhoto:createdByHasPhoto, createdAt: doc.data().createdAt, createdAtFormat:formatDate(new Date(doc.data().createdAt)), });
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
					updatedAt: Date.now(),
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

