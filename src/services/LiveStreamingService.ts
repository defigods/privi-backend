import firebase from 'firebase';
import { dailySteamingService } from './DailyStreamingService';
import { MeetingToken, RoomState, streamingFirebaseRepository, StreamingResource } from './StreamingFirebaseRepository';

export class LiveStreamingService {
  public async joinStreaming({ streamingId, userId }: JoinStreamingParams): Promise<JoinStreamingResult> {
    const streaming = await streamingFirebaseRepository.getOrThrow(streamingId);
    const participantType = this.getParticipantType(userId, streaming);

    if (participantType === ParticipantType.MainStreamer && streaming.RoomState === RoomState.Scheduled) {
      const { roomUrl } = await this.startStreamingAsMainStreamer(userId, streaming);
      const { token } = await this.joinStreamingAsStreamer(userId, streaming);

      return {
        roomUrl,
        meetingToken: token,
      };
    }

    if (streaming.RoomState === RoomState.Scheduled) {
      throw new Error('Cannot join streaming that is not started yet');
    }

    if (streaming.RoomState === RoomState.Completed) {
      throw new Error('Cannot join streaming that is was already ended');
    }

    const roomUrl = streaming.StreamingUrl!; // url is ensured to be defined for RoomState.Going

    const { token } =
      participantType == ParticipantType.SecondaryStreamer
        ? await this.joinStreamingAsStreamer(userId, streaming)
        : await this.joinStreamingAsAudience(userId, streaming);

    return {
      roomUrl,
      meetingToken: token,
    };
  }

  public async endStreamingAsMainStreamer({ streamingId, userId }: JoinStreamingParams) {
    const streaming = await streamingFirebaseRepository.getOrThrow(streamingId);
    const participantType = this.getParticipantType(userId, streaming);

    if (participantType !== ParticipantType.MainStreamer) {
      throw new Error('Only main streamer is allowed to end a stream');
    }

    await streamingFirebaseRepository.update(streaming.id, {
      RoomState: RoomState.Completed,
      EndedTime: firebase.firestore.Timestamp.fromDate(new Date()),
    });

    if (streaming.RoomState === RoomState.Going) {
      await dailySteamingService.deleteRoom({
        roomName: streaming.RoomName!,
      });
    }
  }

  private async startStreamingAsMainStreamer(userId: string, streaming: StreamingResource) {
    const participantType = this.getParticipantType(userId, streaming);

    if (participantType !== ParticipantType.MainStreamer) {
      throw new Error('Only main streamer is allowed to start a stream');
    }

    const { roomUrl, roomName } = await dailySteamingService.createRoom({
      enableRecording: streaming.Video,
    });

    await streamingFirebaseRepository.update(streaming.id, {
      RoomName: roomName,
      StreamingUrl: roomUrl,
      RoomState: RoomState.Going,
      StartedTime: firebase.firestore.Timestamp.fromDate(new Date()),
    });

    return {
      roomUrl,
      roomName,
    };
  }

  private async joinStreamingAsStreamer(userId: string, streaming: StreamingResource) {
    return await this.createOrGetMeetingToken({ userId, streaming, isOwner: true });
  }

  private async joinStreamingAsAudience(userId: string, streaming: StreamingResource) {
    return await this.createOrGetMeetingToken({ userId, streaming, isOwner: false });
  }

  private async createOrGetMeetingToken({
    userId,
    streaming,
    isOwner,
  }: {
    userId: string;
    streaming: StreamingResource;
    isOwner: boolean;
  }): Promise<MeetingToken> {
    const exisitingMeetingToken = await streamingFirebaseRepository.getMeetingToken({
      streamingId: streaming.id,
      userId,
    });

    if (exisitingMeetingToken) {
      return exisitingMeetingToken;
    }

    const newMeetingToken = await dailySteamingService.createMeetingToken({
      userId,
      roomName: streaming.RoomName!,
      isOwner,
    });

    await streamingFirebaseRepository.saveMeetingToken(
      {
        streamingId: streaming.id,
        userId,
      },
      newMeetingToken
    );

    return newMeetingToken;
  }

  private getParticipantType(userId: string, streaming: StreamingResource): ParticipantType {
    if (streaming.MainStreamer === userId) {
      return ParticipantType.MainStreamer;
    }

    if (streaming.Streamers.includes(userId)) {
      return ParticipantType.SecondaryStreamer;
    }

    if (streaming.Moderators.includes(userId)) {
      return ParticipantType.Moderator;
    }

    return ParticipantType.Watcher;
  }
}

export const liveStreamingService = new LiveStreamingService();

export enum ParticipantType {
  MainStreamer,
  SecondaryStreamer,
  Moderator,
  Watcher,
}

type JoinStreamingParams = {
  streamingId: string;
  userId: string;
};

type JoinStreamingResult = {
  roomUrl: string;
  meetingToken: string;
};

type EndStreamingParams = {
  streamingId: string;
  userId: string;
};
