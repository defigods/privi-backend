import express from "express";
import { db } from "../firebase/firebase";
import collections from '../firebase/collections';
//import { uploadToFirestoreBucket } from '../functions/firestore'
import { TwitterClient } from 'twitter-api-client';

///////////////////////////// POST ///////////////////////////////
module.exports.createCollab = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creator = body.Creator;
        const collaborators = body.Collaborators;
        const idea = body.Idea;
        const platform = body.Platform;
        db.collection(collections.collabs).add({
            Creator: creator,
            Collaborators: collaborators,
            Idea: idea,
            Platform: platform,
            CreatedAt: Date.now()
        });
        res.send({ success: true });
    } catch (err) {
        console.log('Error in controllers/collabController -> createCollab()', err);
        res.send({ success: false });
    }
};

module.exports.upvote = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const user = body.User;
        const collabId = body.CollabId;
        const collabSnap = await db.collection(collections.collabs).doc(collabId).get();
        const data: any = collabSnap.data();
        const newUpvotes = data.Upvotes ?? {};
        newUpvotes[user] = "";
        collabSnap.ref.update({ Upvotes: newUpvotes });
        res.send({ success: true });
    } catch (err) {
        console.log('Error in controllers/collabController -> upvote()', err);
        res.send({ success: false });
    }
};

module.exports.react = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const user = body.User;
        const collabId = body.CollabId;
        const collabSnap = await db.collection(collections.collabs).doc(collabId).get();
        const data: any = collabSnap.data();
        const newReacts = data.Reacts ?? {};
        newReacts[user] = "";
        collabSnap.ref.update({ Reacts: newReacts });
        res.send({ success: true });
    } catch (err) {
        console.log('Error in controllers/collabController -> react()', err);
        res.send({ success: false });
    }
};

module.exports.like = async (req: express.Request, res: express.Response) => {
	try {
		const body = req.body;
		const collabAddress = body.collabAddress;
		const userAddress = body.userAddress;
		const userSnap = await db.collection(collections.user).doc(userAddress).get();
		const collabSnap = await db.collection(collections.collabs).doc(collabAddress).get();
		const userData: any = userSnap.data();
		const collabData: any = collabSnap.data();

		let userLikes = userData.Likes ?? [];
		let collabLikes = collabData.Likes ?? [];

		if (collabLikes.length && collabLikes.findIndex(item => item.userId === userAddress) > -1) {
			userLikes = userLikes.filter(item => item.id !== collabAddress);
			collabLikes = collabLikes.filter(item => item.userId !== userAddress);
		} else {
			userLikes.push({
				date: Date.now(),
				type: "collab",
				id: collabAddress
			})
			collabLikes.push({
				date: Date.now(),
				userId: userAddress
			})
		}

		userSnap.ref.update({
			Likes: userLikes
		});
		collabSnap.ref.update({
			Likes: collabLikes
		});

		res.send({
			success: true,
			collabLikes,
		});
	} catch (err) {
		console.log('Error in controllers/collabController -> like(): ', err);
		res.send({ success: false });
	}
};

///////////////////////////// GET ///////////////////////////////
// return the collabs according to the filter and sort options
module.exports.getCollabs = async (req: express.Request, res: express.Response) => {
    try {
        const params = req.query;
        const allCollabs: any[] = [];
        const trendingCollabs: any[] = [];
        const collabSnap = await db.collection(collections.collabs).get();
        const upvoteList: number[] = [];
        collabSnap.forEach((doc) => {
            const data = doc.data();
            const numUpvotes = Object.keys(data.Upvotes ?? {}).length;
            allCollabs.push({
                CollabId: doc.id,
                ...data
            });
            upvoteList.push(numUpvotes);
        });
        const mean = upvoteList.length > 0 ? upvoteList.reduce((a, b) => a + b) / upvoteList.length : 0;
        allCollabs.forEach((obj) => {
            const numUpvotes = Object.keys(obj.Upvotes ?? {}).length;
            if (numUpvotes >= mean) trendingCollabs.push(obj);
        });
        const filteredCollabs = filterCollabs(allCollabs, params);
        res.send({
            success: true, data: {
                allCollabs: filteredCollabs,
                trendingCollabs: trendingCollabs
            }
        });
    } catch (err) {
        console.log('Error in controllers/collabController -> getCollabs()', err);
        res.send({ success: false });
    }
};

const displayOptions = ["All Collabs", "My Collabs"];
const sortByOptions = ["Most Liked", "Recent"];
const filterCollabs = (allCollabs, params) => {
	const userId = params.userId;
	let filteredCollabs: any[] = [];
	// 1. filter by display option
	const displaySelection = params.displaySelection;
	if (displaySelection) {
		switch (displaySelection) {
			case displayOptions[0]:
				filteredCollabs = [...allCollabs];
				break;
			case displayOptions[1]:
				allCollabs.forEach((collab) => {
					// creator or collaborator
					if (
							collab.Creator == userId ||
									(collab.Collaborators && collab.Collaborators.find((collabObj) => collabObj.id == userId))
					)   {
							filteredCollabs.push(collab);
					}
				});
				break;
			default:
				filteredCollabs = [...allCollabs];
				break;
		}
	} else {
		filteredCollabs = [...allCollabs];
	}

	//2. filter by user input
	const searchValue = params.searchValue;
	if (searchValue) {
		let aux = [...filteredCollabs];
		filteredCollabs = [];
		aux.forEach((collab: any) => {
			if (
				(collab.Idea &&
						collab.Idea.toLowerCase().includes(searchValue.toLowerCase())) ||
				(collab.Platform &&
						collab.Platform.name &&
						collab.Platform.name
								.toLowerCase()
								.includes(searchValue.toLowerCase()))
			)
				filteredCollabs.push(collab);
		});
	}

	//3. sort
	const sortSelection = params.sortSelection;
	if (sortSelection) {
		switch (sortSelection) {
			case sortByOptions[0]:
				filteredCollabs.sort((a, b) => {
					const aLikes = a.Likes ?? 0;
					const bLikes = b.Likes ?? 0;
					return bLikes.length - aLikes.length;
				});
				break;
			case sortByOptions[1]:
				filteredCollabs.sort((a, b) => {
					const aDate = a.CreatedAt ?? 0;
					const bDate = b.CreatedAt ?? 0;
					return bDate - aDate;
				});
				break;
		}
	}
	return filteredCollabs;
}


const config2 = {
    apiKey: '7zIOdV7fG0hPNRU3McZuAqp3w',
    apiSecret: 'Ti17IYmlHMZLfQtBJ17AIa2ea0LkZ6Q6Ve5cgqXlYKBahnytLq',
    accessToken: '1152134295013777409-zRyzXdGumjG5Qf5H9EmeleDx7DJ8gE',
    accessTokenSecret: '4wrqJVhQuERIMVaAqUmV94lPT5HBtd9O7pbfoFjg8z4UC',
}

const twitterClient = new TwitterClient(config2);

module.exports.getTwitterUsers = async (req: express.Request, res: express.Response) => {
    try {
        const retData: any[] = [];
        const query = req.query;
        const q: any = query.q;
        const data = await twitterClient.accountsAndUsers.usersSearch({ q: q });
        data.forEach((user) => {
            retData.push({
                name: user.name,
                username: user.screen_name,
                avatar: user.profile_image_url_https
            })
        });
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/collabController -> getTwitterUsers()', err);
        res.send({ success: false });
    }
};