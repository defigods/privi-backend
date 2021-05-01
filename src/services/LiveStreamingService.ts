import firebase from 'firebase';
import { dailySteamingService } from './DailyStreamingService';
import {
  MediaType,
  MeetingToken,
  RoomState,
  streamingFirebaseRepository,
  StreamingResource,
} from './StreamingFirebaseRepository';

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
        participantMode:
          streaming.Type === MediaType.LiveVideo ? ParticipantMode.Video : ParticipantMode.Audio,
      };
    }

    if (streaming.RoomState === RoomState.Scheduled) {
      throw new Error('Cannot join streaming that is not started yet');
    }

    if (streaming.RoomState === RoomState.Completed) {
      throw new Error('Cannot join streaming that is was already ended');
    }

    const roomUrl = streaming.StreamingUrl ?? ''; // url is ensured to be defined for RoomState.Going

    const { token, participantMode } = [
      ParticipantType.MainStreamer,
      ParticipantType.SecondaryStreamer,
    ].includes(participantType)
      ? await this.joinStreamingAsStreamer(userId, streaming)
      : await this.joinStreamingAsAudience(userId, streaming);

    return {
      roomUrl,
      meetingToken: token,
      participantMode,
    };
  }

  public async endStreamingAsMainStreamer({ streamingId, userId }: EndStreamingParams): Promise<void> {
    const streaming = await streamingFirebaseRepository.getOrThrow(streamingId);
    const participantType = this.getParticipantType(userId, streaming);

    if (participantType !== ParticipantType.MainStreamer) {
      throw new Error('Only main streamer is allowed to end a stream');
    }

    await streamingFirebaseRepository.update(streaming.id, {
      RoomState: RoomState.Completed,
      EndedTime: Date.now(),
    });

    if (streaming.RoomState === RoomState.Going) {
      await dailySteamingService.deleteRoom({
        roomName: streaming.RoomName ?? '',
      });
    }
  }

  private async startStreamingAsMainStreamer(userId: string, streaming: StreamingResource) {
    const participantType = this.getParticipantType(userId, streaming);

    if (participantType !== ParticipantType.MainStreamer) {
      throw new Error('Only main streamer is allowed to start a stream');
    }

    const { roomName, roomUrl } = await dailySteamingService.createRoom({
      enableRecording: streaming.Video,
    });

    await streamingFirebaseRepository.update(streaming.id, {
      RoomName: roomName,
      StreamingUrl: roomUrl,
      RoomState: RoomState.Going,
      StartedTime: Date.now(),
    });

    return {
      roomUrl,
      roomName,
    };
  }

  private async joinStreamingAsStreamer(userId: string, streaming: StreamingResource) {
    return {
      ...(await this.createOrGetMeetingToken({ userId, streaming, isOwner: true })),
      participantMode: streaming.Type === MediaType.LiveVideo ? ParticipantMode.Video : ParticipantMode.Audio,
    };
  }

  private async joinStreamingAsAudience(userId: string, streaming: StreamingResource) {
    return {
      ...(await this.createOrGetMeetingToken({ userId, streaming, isOwner: false })),
      participantMode: ParticipantMode.Observer,
    };
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
      roomName: streaming.RoomName ?? '',
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

export enum ParticipantMode {
  Video = 'video',
  Audio = 'audio',
  Observer = 'observer',
}

type JoinStreamingParams = {
  streamingId: string;
  userId: string;
};

type JoinStreamingResult = {
  roomUrl: string;
  meetingToken: string;
  participantMode: ParticipantMode;
};

type EndStreamingParams = {
  streamingId: string;
  userId: string;
};
