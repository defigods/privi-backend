import { db } from '../firebase/firebase';
import collections from '../firebase/collections';

const MEETING_TOKENS_SUBCOLLECTION_NAME = 'MeetingTokens';

export class StreamingFirebaseRepository {
  private collection = db.collection(collections.streaming);

  public async get(id: string): Promise<StreamingResource | undefined> {
    const result = await this.collection.doc(id).get();

    if (!result.exists) {
      return undefined;
    }

    return {
      id: result.id,
      ...result.data(),
    } as StreamingResource;
  }

  public async getOrThrow(id: string): Promise<StreamingResource> {
    const result = await this.get(id);

    if (!result) {
      throw new Error('Streaming with given ID does not exist');
    }

    return result;
  }

  public async update(id: string, resource: Partial<Omit<StreamingResource, 'id'>>) {
    await this.collection.doc(id).update(resource);
  }

  public async getMeetingToken({
    streamingId,
    userId,
  }: {
    streamingId: string;
    userId: string;
  }): Promise<MeetingToken | undefined> {
    const result = await this.collection
      .doc(streamingId)
      .collection(MEETING_TOKENS_SUBCOLLECTION_NAME)
      .doc(userId)
      .get();

    if (!result.exists) {
      return undefined;
    }

    return result.data() as MeetingToken;
  }

  public async saveMeetingToken(
    { streamingId, userId }: { streamingId: string; userId: string },
    resource: MeetingToken
  ) {
    await this.collection.doc(streamingId).collection(MEETING_TOKENS_SUBCOLLECTION_NAME).doc(userId).set(resource);
  }
}

export const streamingFirebaseRepository = new StreamingFirebaseRepository();

export enum PricingMethod {
  Fixed = 'Fixed',
  Streaming = 'Streaming',
}

export enum RoomState {
  Scheduled = 'SCHEDULED',
  Going = 'GOING',
  Completed = 'COMPLETED',
}

export enum MediaType {
  Video = 'VIDEO_TYPE',
  LiveVideo = 'LIVE_VIDEO_TYPE',
  Audio = 'AUDIO_TYPE',
  LiveAudio = 'LIVE_AUDIO_TYPE',
  Blog = 'BLOG_TYPE',
  BlogSnap = 'BLOG_SNAP_TYPE',
  DigitalArt = 'DIGITAL_ART_TYPE',
}

type UserID = string;

export type StreamingResource = {
  id: string;
  CountStreamers: number;
  CountWatchers: number;
  CreatorAddress: string;
  CreatorId: UserID;
  EndedTime?: firebase.firestore.Timestamp;
  EndingTime: number;
  ExpectedDuration: number;
  HasPhoto: boolean;
  Hashtags: string[];
  LimitedEdition: UserID[];
  MainStreamer: UserID;
  MediaDescription: string;
  MediaName: string;
  MediaSymbol: string;
  Moderators: UserID[];
  NftConditions: {
    Copies: number;
    NftToken: unknown;
    Price: number;
    Royalty: number;
  };
  OnlineModerators: UserID[];
  OnlineStreamers: UserID[];
  Price: number;
  PriceType: string;
  PricingMethod: PricingMethod;
  Rewards: string;
  RoomName?: string;
  RoomState: RoomState;
  SessionId?: Record<UserID, string>;
  SharingPct: number;
  StartedTime?: firebase.firestore.Timestamp;
  StartingTime: number;
  Streamers: UserID[];
  StreamingToken: string;
  StreamingUrl?: string;
  TotalWatchers: number;
  Type: MediaType;
  Video: boolean;
  ViewConditions: {
    IsRecord: boolean;
    IsStreamingLive: boolean;
    Price: number;
    StreamingProportions: unknown;
    ViewingToken: unknown;
    ViewingType: string;
  };
  Watchers: UserID[];

  comment?: Array<{
    user: {
      id: string;
      name: string;
      date: unknown; // ISO date?
    };
  }>;
};

export type MeetingToken = {
  isOwner: boolean;
  token: string;
};
