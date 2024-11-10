// src/App.js
import React, { useState, useEffect } from 'react';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../api';
import StudentList from './StudentList';
import StudentForm from './StudentForm';
import { Container, Typography } from '@mui/material';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const data = await getStudents();
            setStudents(data);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const handleCreateOrUpdateStudent = async (student) => {
        if (selectedStudent) {
            await updateStudent(selectedStudent.id, student);
        } else {
            await createStudent(student);
        }
        fetchStudents();
        setSelectedStudent(null);
    };

    const handleEditStudent = (student) => {
        setSelectedStudent(student);
    };

    const handleDeleteStudent = async (id) => {
        await deleteStudent(id);
        fetchStudents();
    };

    return (
        <>
            <Typography variant="h4" align="center" gutterBottom>
                Student Management
            </Typography>
            <StudentForm onSubmit={handleCreateOrUpdateStudent} selectedStudent={selectedStudent} />
            <StudentList students={students} onEdit={handleEditStudent} onDelete={handleDeleteStudent} />
        </>
    );
};

export default Students;
