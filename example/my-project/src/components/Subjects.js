// src/App.js
import React, { useState, useEffect } from 'react';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../api';
import SubjectList from './SubjectList';
import SubjectForm from './SubjectForm';
import { Container, Typography } from '@mui/material';

const Subjects = () => {
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const { data } = await getSubjects();
            setSubjects(data);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const handleCreateOrUpdateSubject = async (subject) => {
        if (selectedSubject) {
            await updateSubject(selectedSubject.id, subject);
        } else {
            await createSubject(subject);
        }
        fetchSubjects();
        setSelectedSubject(null);
    };

    const handleEditSubject = (subject) => {
        setSelectedSubject(subject);
    };

    const handleDeleteSubject = async (id) => {
        await deleteSubject(id);
        fetchSubjects();
    };

    return (
        <>
            <Typography variant="h4" align="center" gutterBottom>
                Subject Management
            </Typography>
            <SubjectForm onSubmit={handleCreateOrUpdateSubject} selectedSubject={selectedSubject} />
            <SubjectList subjects={subjects} onEdit={handleEditSubject} onDelete={handleDeleteSubject} />
        </>
    );
};

export default Subjects;
