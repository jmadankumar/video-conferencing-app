import React, { useState, FormEvent } from 'react';
import Layout, { Header, Footer } from '../components/Layout';
import Content from '../components/Layout/Content';
import styled from 'styled-components';
import Input from '../components/commons/Input';
import GroupVideoImage from '../assets/images/group_video.svg';
import Button from '../components/commons/Button';
import { useDispatch } from 'react-redux';
import { start } from '../store/meeting/actions';
import * as MeetingAPi from '../lib/meeting-api';
import { useHistory } from 'react-router-dom';
import { getErrorMessage } from '../lib/error-handling';
import { useSnackbar } from 'react-simple-snackbar';

const Wrapper = styled.div`
    main {
        min-height: 300px;
    }
    .meeting-action-container {
        width: 100%;
    }
    @media screen and (min-width: 400px) {
        .meeting-action-container {
            width: 400px;
        }
    }
`;

const HomePage: React.FC = () => {
    const dispatch = useDispatch();
    const history = useHistory();
    const [meetingId, setMeetingId] = useState('');
    const [openSnackbar] = useSnackbar({
        position: 'top-center',
    });

    const startMeeting = async () => {
        try {
            const { meetingId } = await MeetingAPi.start('');
            dispatch(start({ name: '', meetingId }));
            history.push(`/meeting/${meetingId}`);
        } catch (error) {
            openSnackbar(getErrorMessage(error));
        }
    };

    const joinMeeting = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        history.push(`/meeting/${meetingId}`);
    };

    return (
        <Layout>
            <Header />
            <Wrapper>
                <Content>
                    <div className="flex justify-center">
                        <div className="w-1/2 hidden md:block">
                            <img src={GroupVideoImage} alt="Group video" />
                        </div>
                        <div className="flex flex-col items-center w-full md:w-1/2 p-4">
                            <div className="meeting-action-container">
                                <h1 className="text-3xl text-center font-bold  text-green-500 mt-20 mb-4">
                                    Welcome to Meet X
                                </h1>
                                <h4 className="text-lg text-gray-500 mb-4">
                                    Connect wih your family and friends with our group video calls
                                </h4>
                                <form onSubmit={joinMeeting}>
                                    <Input
                                        size="medium"
                                        placeholder="Enter meeting Id"
                                        className="name mb-4 w-full"
                                        onChange={(event) => setMeetingId(event.target.value)}
                                    />
                                    <Button
                                        type="submit"
                                        size="medium"
                                        disabled={!meetingId}
                                        className="w-full mb-4"
                                    >
                                        Join meeting
                                    </Button>
                                </form>
                                <Button size="medium" onClick={startMeeting} className="w-full">
                                    Start a new meeting
                                </Button>
                            </div>
                        </div>
                    </div>
                </Content>
            </Wrapper>
            <Footer />
        </Layout>
    );
};

export default HomePage;
