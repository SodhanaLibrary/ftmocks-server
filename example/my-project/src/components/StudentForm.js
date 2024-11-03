// src/components/StudentForm.js
import React, { useState, useEffect } from 'react';
import { TextField, Button, Box } from '@mui/material';

const StudentForm = ({ onSubmit, selectedStudent }) => {
    const [student, setStudent] = useState({ name: '', age: '', grade: '' });

    useEffect(() => {
        if (selectedStudent) setStudent(selectedStudent);
    }, [selectedStudent]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setStudent((prevStudent) => ({ ...prevStudent, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(student);
        setStudent({ name: '', age: '', grade: '' });
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, mb: 2, mt: 3 }}>
            <TextField
                label="Name"
                name="name"
                value={student.name}
                onChange={handleChange}
                required
            />
            <TextField
                label="Age"
                name="age"
                type="number"
                value={student.age}
                onChange={handleChange}
                required
            />
            <TextField
                label="Grade"
                name="grade"
                value={student.grade}
                onChange={handleChange}
                required
            />
            <Button type="submit" variant="contained" color="primary">
                {selectedStudent ? "Update" : "Create"}
            </Button>
        </Box>
    );
};

export default StudentForm;
