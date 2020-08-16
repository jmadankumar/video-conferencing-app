import { Dispatch } from 'redux';
import {
    START,
    StartAction,
    JOIN,
    JoinAction,
    LeaveAction,
    LEAVE,
    EndAction,
    END,
    JOINED,
    JoinedAction,
    NewConnectionAction,
    NEW_CONNECTION,
    UserLeftAction,
    USER_LEFT,
    MEETING_ENDED,
    MeetingAction,
    AudioToggleAction,
    VideoToggleAction,
    VIDEO_TOGGLE,
    AUDIO_TOGGLE,
    ConnectionSettingChangeAction,
    CONNECTION_SETTING_CHANGE,
} from './types';
import { MeetingDetail } from '../../types';
import Meeting, { Connection } from '../../lib/meeting';
import { RootState } from '../reducer';

interface StartParam {
    name: string;
    meetingId: string;
}
export const start = ({ name, meetingId }: StartParam) => async (
    dispatch: Dispatch<StartAction>,
) => {
    dispatch({
        type: START,
        payload: { name, meetingId },
    });
    localStorage.setItem('name', name);
    localStorage.setItem('meetingId', meetingId);
};

export const join = (meetingDetail: MeetingDetail) => async (
    dispatch: Dispatch<JoinAction | any>,
) => {
    try {
        const name = localStorage.getItem('name') || '';
        const userId = localStorage.getItem('userId') || '';
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const meeting = new Meeting({ meetingId: meetingDetail.id, stream, name, userId });
        meeting.on('connection', (connection: Connection) => {
            dispatch(newConnection(connection));
        });
        dispatch({
            type: JOIN,
            payload: { meetingDetail, meeting, stream },
        });
    } catch (error) {
        console.log(error);
    }
};
export const newConnection = (connection: Connection) => async (
    dispatch: Dispatch<NewConnectionAction>,
) => {
    dispatch({
        type: NEW_CONNECTION,
        payload: {
            connection,
        },
    });
};

export const joined = () => (dispatch: Dispatch<JoinedAction>) => {
    dispatch({
        type: JOINED,
        payload: {},
    });
};
export const leave = () => (dispatch: Dispatch<LeaveAction>) => {
    dispatch({
        type: LEAVE,
    });
};

export const userLeft = (connection: Connection) => (
    dispatch: Dispatch<UserLeftAction>,
    getState: () => RootState,
) => {
    const { connections } = getState().meeting;
    const index = connections.findIndex((conn) => conn.userId === connection.userId);
    connections.splice(index, 1);
    dispatch({
        type: USER_LEFT,
        payload: {
            connections: [...connections],
        },
    });
};

export const end = () => (dispatch: Dispatch<EndAction>) => {
    dispatch({
        type: END,
    });
};

export const meetingEnded = () => (dispatch: Dispatch<MeetingAction>) => {
    dispatch({
        type: MEETING_ENDED,
    });
};

export const toggleVideo = () => (
    dispatch: Dispatch<VideoToggleAction>,
    getState: () => RootState,
) => {
    const { meeting } = getState().meeting;
    const videoEnabled = !!meeting?.toggleVideo();
    dispatch({
        type: VIDEO_TOGGLE,
        payload: {
            videoEnabled,
        },
    });
};
export const toggleAudio = () => (
    dispatch: Dispatch<AudioToggleAction>,
    getState: () => RootState,
) => {
    const { meeting } = getState().meeting;
    const audioEnabled = !!meeting?.toggleAudio();

    dispatch({
        type: AUDIO_TOGGLE,
        payload: {
            audioEnabled,
        },
    });
};

export const connectionSettingChange = () => (
    dispatch: Dispatch<ConnectionSettingChangeAction>,
) => {
    dispatch({
        type: CONNECTION_SETTING_CHANGE,
    });
};
