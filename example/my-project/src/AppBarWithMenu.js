// src/components/AppBarWithMenu.js
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';

const AppBarWithMenu = ({ onMenuClick }) => {
    return (
        <Container sx={{mb: 5}}>
        <AppBar position="static">
            <Toolbar>
                <Typography id="header-title" variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    School Portal
                </Typography>
                <Box>
                    <Button id="header-menu-teachers" color="inherit" onClick={() => onMenuClick('teachers')}>
                        Teachers
                    </Button>
                    <Button id="header-menu-students" color="inherit" onClick={() => onMenuClick('students')}>
                        Students
                    </Button>
                    <Button id="header-menu-subjects" color="inherit" onClick={() => onMenuClick('subjects')}>
                        Subjects
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
        </Container>
    );
};

export default AppBarWithMenu;
