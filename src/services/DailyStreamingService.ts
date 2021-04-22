import axios, { AxiosInstance } from 'axios';

const DAILY_API_URL = 'https://api.daily.co/v1';
// TODO: Provide key via env variable
const DAILY_API_KEY = 'e93f4b9d62e8f5428297778f56bf8a9417b6a5343d0d4a961e0451c893ea8cba';

export class DailyStreamingService {
  private axiosIntance: AxiosInstance;

  constructor() {
    this.axiosIntance = axios.create({
      baseURL: DAILY_API_URL,
    });

    this.axiosIntance.defaults.headers.common['Authorization'] = `Bearer ${DAILY_API_KEY}`;
    this.axiosIntance.defaults.headers.common['Content-Type'] = 'application/json';
  }

  public async createRoom({ roomName, enableRecording }: CreateRoomParams): Promise<CreateRoomResult> {
    const params = {
      ...(roomName ? { name: roomName } : {}), // empty name tell Daily.co to generate random name
      // ref: https://www.daily.co/blog/intro-to-room-access-control/
      privacy: 'private',
      owner_only_broadcast: true,
      properties: {
        ...(enableRecording ? { enable_recording: 'cloud' } : {}),
      },
    };

    const response = await this.axiosIntance.post<{
      id: string;
      name: string;
      url: string;
    }>('/rooms', params);

    return {
      roomUrl: response.data.url,
      roomName: response.data.name,
    };
  }

  public async deleteRoom({ roomName }: DeleteRoomParams): Promise<void> {
    await this.axiosIntance.delete(`/rooms/${roomName}`);
  }

  public async createMeetingToken({
    roomName,
    userId,
    isOwner,
  }: CreateMeetingTokenParams): Promise<CreateMeetingTokenResult> {
    // ref: https://docs.daily.co/reference#create-meeting-token
    const params = {
      properties: {
        room_name: roomName,
        user_id: userId, // this param allows to match Daily.co session ID with Privi user ID easily
        is_owner: isOwner,
      },
    };

    const response = await this.axiosIntance.post<{ token: string }>('/meeting-tokens', params);

    return {
      token: response.data.token,
      isOwner: isOwner,
    };
  }
}

export const dailySteamingService = new DailyStreamingService();

type CreateRoomParams = {
  roomName?: string;
  enableRecording: boolean;
};

type CreateRoomResult = {
  roomUrl: string;
  roomName: string;
};

type DeleteRoomParams = {
  roomName: string;
};

type CreateMeetingTokenParams = {
  roomName: string;
  userId: string;
  isOwner: boolean;
};

type CreateMeetingTokenResult = {
  token: string;
  isOwner: boolean;
};
