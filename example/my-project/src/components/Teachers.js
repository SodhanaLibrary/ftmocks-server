// src/App.js
import React, { useState, useEffect } from 'react';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from '../api';
import TeacherList from './TeacherList';
import TeacherForm from './TeacherForm';
import { Container, Typography } from '@mui/material';

const Teachers = () => {
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            const { data } = await getTeachers();
            setTeachers(data);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        }
    };

    const handleCreateOrUpdateTeacher = async (teacher) => {
        if (selectedTeacher) {
            await updateTeacher(selectedTeacher.id, teacher);
        } else {
            await createTeacher(teacher);
        }
        fetchTeachers();
        setSelectedTeacher(null);
    };

    const handleEditTeacher = (teacher) => {
        setSelectedTeacher(teacher);
    };

    const handleDeleteTeacher = async (id) => {
        await deleteTeacher(id);
        fetchTeachers();
    };

    return (
        <>
            <Typography variant="h4" align="center" gutterBottom>
                Teacher Management
            </Typography>
            <TeacherForm onSubmit={handleCreateOrUpdateTeacher} selectedTeacher={selectedTeacher} />
            <TeacherList teachers={teachers} onEdit={handleEditTeacher} onDelete={handleDeleteTeacher} />
        </>
    );
};

export default Teachers;
