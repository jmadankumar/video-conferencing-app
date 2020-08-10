import Websocket, { Data } from 'ws';
import { Server, IncomingMessage } from 'http';
import { v4 as uuidV4 } from 'uuid';

const meetingMap = new Map<string, Array<MeetingUser>>();

interface MeetingUser {
    socket: Websocket;
    userId: string;
    joined: boolean;
}

interface MessagePayload {
    type:
        | 'join-meeting'
        | 'joined-meeting'
        | 'user-joined'
        | 'connection-request'
        | 'incoming-connection-request'
        | 'offer-sdp'
        | 'answer-sdp'
        | 'leave-meeting'
        | 'end-meeting'
        | 'user-left'
        | 'meeting-ended'
        | 'unknown';
    data?: any;
}

function parseMessage(message: string): MessagePayload {
    try {
        const payload = JSON.parse(message);
        return payload;
    } catch (error) {
        return { type: 'unknown' };
    }
}

function sendMessage(socket: Websocket, payload: MessagePayload) {
    socket.send(JSON.stringify(payload));
}

function getMeetingId(request: IncomingMessage) {
    const {
        url,
        headers: { host },
    } = request;
    const urlObj = new URL(url, `http://${host}`);
    return urlObj.searchParams.get('id');
}

function getMeetingUser(meetingId: string, userId: string): MeetingUser | null {
    const meetingUsers = meetingMap.get(meetingId) || [];
    return meetingUsers.find((meetingUser) => meetingUser.userId === userId);
}

function addSocketToMeeting(meetingId: string, userId: string, socket: Websocket): void {
    let meetingUsers = meetingMap.get(meetingId);
    if (!meetingUsers) {
        meetingUsers = [];
    }
    meetingUsers.push({ socket, userId, joined: true });
    meetingMap.set(meetingId, meetingUsers);
}

function broadcastUsers(meetingId: string, socket: Websocket, payload: MessagePayload) {
    const meetingUsers = meetingMap.get(meetingId) || [];
    for (let i = 0; i < meetingUsers.length; i++) {
        const meetingUser = meetingUsers[i];
        if (meetingUser.socket !== socket) {
            sendMessage(meetingUser.socket, payload);
        }
    }
}
function terminateMeeting(meetingId: string) {
    const meetingUsers = meetingMap.get(meetingId) || [];
    for (let i = 0; i < meetingUsers.length; i++) {
        const meetingUser = meetingUsers[i];
        meetingUser.socket.terminate();
    }
    meetingMap.delete(meetingId);
}

function joinMeeting(meetingId: string, socket: Websocket, payload: MessagePayload) {
    const userId = uuidV4();
    console.log('User joined meeting', userId);

    addSocketToMeeting(meetingId, userId, socket);

    sendMessage(socket, {
        type: 'joined-meeting',
        data: {
            userId,
        },
    });

    // notifiy other users
    broadcastUsers(meetingId, socket, {
        type: 'user-joined',
        data: {
            userId: userId,
        },
    });
}
interface ConnectWithOtherUserPayloadData {
    userId: string;
    otherUserId: string;
}
function connectionRequest(meetingId: string, socket: Websocket, payload: MessagePayload) {
    const { userId, otherUserId } = payload.data as ConnectWithOtherUserPayloadData;
    const otherUser = getMeetingUser(meetingId, otherUserId);
    if (otherUser?.socket) {
        sendMessage(otherUser?.socket, {
            type: 'incoming-connection-request',
            data: {
                userId,
            },
        });
    }
}

interface OfferSdpPayload {
    userId: string;
    otherUserId: string;
    sdp: string;
}

function forwardOfferSdp(meetingId: string, socket: Websocket, payload: MessagePayload) {
    const { userId, otherUserId, sdp } = payload.data as OfferSdpPayload;
    const otherUser = getMeetingUser(meetingId, otherUserId);
    if (otherUser?.socket) {
        sendMessage(otherUser?.socket, {
            type: 'offer-sdp',
            data: {
                userId,
                sdp,
            },
        });
    }
}

interface AnswerSdpPayload {
    userId: string;
    otherUserId: string;
    sdp: string;
}

function forwardAnswerSdp(meetingId: string, socket: Websocket, payload: MessagePayload) {
    const { userId, otherUserId, sdp } = payload.data as AnswerSdpPayload;
    const otherUser = getMeetingUser(meetingId, otherUserId);
    if (otherUser?.socket) {
        sendMessage(otherUser?.socket, {
            type: 'answer-sdp',
            data: {
                userId,
                sdp,
            },
        });
    }
}

interface UserLeftPayload {
    userId: string;
}

function userLeft(meetingId: string, socket: Websocket, payload: MessagePayload) {
    const { userId } = payload.data as UserLeftPayload;
    // notifiy other users
    broadcastUsers(meetingId, socket, {
        type: 'user-left',
        data: {
            userId: userId,
        },
    });
}

interface MeetingEndedPayload {
    userId: string;
}

function endMeeting(meetingId: string, socket: Websocket, payload: MessagePayload) {
    const { userId } = payload.data as MeetingEndedPayload;
    // notifiy other users
    broadcastUsers(meetingId, socket, {
        type: 'meeting-ended',
        data: {
            userId: userId,
        },
    });
    terminateMeeting(meetingId);
}

function handleMessage(meetingId: string, socket: Websocket, message: Data) {
    if (typeof message === 'string') {
        const payload = parseMessage(message);
        switch (payload.type) {
            case 'join-meeting':
                joinMeeting(meetingId, socket, payload);
                break;
            case 'connection-request':
                connectionRequest(meetingId, socket, payload);
                break;
            case 'offer-sdp':
                forwardOfferSdp(meetingId, socket, payload);
                break;
            case 'answer-sdp':
                forwardAnswerSdp(meetingId, socket, payload);
                break;
            case 'leave-meeting':
                userLeft(meetingId, socket, payload);
                break;
            case 'end-meeting':
                endMeeting(meetingId, socket, payload);
                break;
            case 'unknown':
                break;
            default:
                break;
        }
    }
}

function listenMessage(meetingId: string, socket: Websocket): void {
    if (socket.readyState === Websocket.OPEN) {
        socket.on('message', (message) => handleMessage(meetingId, socket, message));
    }
}

export function initMeetingServer(server: Server): void {
    const meetingServer = new Websocket.Server({
        server,
        path: '/websocket/meeting',
    });

    meetingServer.on('connection', (socket, request) => {
        const meetingId = getMeetingId(request);
        listenMessage(meetingId, socket);
    });
}