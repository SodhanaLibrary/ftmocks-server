// src/App.js
import React, { useState } from 'react';
import AppBarWithMenu from './AppBarWithMenu';
import Teachers from './components/Teachers';
import Students from './components/Students';
import Subjects from './components/Subjects';
import { Container } from '@mui/material';

const App = () => {
    const [currentView, setCurrentView] = useState('teachers');

    const onMenuClick = (view) => {
        setCurrentView(view);
    };

    return (
        <div>
            <AppBarWithMenu onMenuClick={onMenuClick} />
            <Container>
                {currentView === 'teachers' && <Teachers />}
                {currentView === 'students' && <Students />}
                {currentView === 'subjects' && <Subjects />}
            </Container>
        </div>
    );
};

export default App;
