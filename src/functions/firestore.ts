
import { firestore } from '../firebase/firebase';
const uuid = require('uuid');

export async function uploadToFirestoreBucket(file:any, localPath: string, bucketPath: string) {
  try {
    const bucketTokenId = uuid.v4()
    const bucketStorage = await firestore;
    const tempPath = localPath + "/" + file.originalname + '.png'
    const destinationPath = bucketPath + "/" + file.originalname + '.png'

    // upload image to Firestore bucket
    bucketStorage.upload(tempPath, {
      destination: destinationPath,
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: bucketTokenId,
        }
      },
    })
  } catch (err) {
    console.error('Error when uploading Badge image to Bucket, error:', err);
  };
}