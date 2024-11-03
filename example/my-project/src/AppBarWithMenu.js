// src/components/AppBarWithMenu.js
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';

const AppBarWithMenu = ({ onMenuClick }) => {
    return (
        <Container sx={{mb: 5}}>
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    School Portal
                </Typography>
                <Box>
                    <Button color="inherit" onClick={() => onMenuClick('teachers')}>
                        Teachers
                    </Button>
                    <Button color="inherit" onClick={() => onMenuClick('students')}>
                        Students
                    </Button>
                    <Button color="inherit" onClick={() => onMenuClick('subjects')}>
                        Subjects
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
        </Container>
    );
};

export default AppBarWithMenu;
