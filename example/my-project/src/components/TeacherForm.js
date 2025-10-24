// src/components/TeacherForm.js
import React, { useState, useEffect } from 'react';
import { TextField, Button, Box } from '@mui/material';

const TeacherForm = ({ onSubmit, selectedTeacher }) => {
  const [teacher, setTeacher] = useState({
    name: '',
    subject: '',
    yearsOfExperience: '',
  });

  useEffect(() => {
    if (selectedTeacher) setTeacher(selectedTeacher);
  }, [selectedTeacher]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTeacher((prevTeacher) => ({ ...prevTeacher, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    console.log('🎯 TeacherForm: handleSubmit called with:', teacher);
    onSubmit(teacher);
    setTeacher({ name: '', subject: '', yearsOfExperience: '' });
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 3 }}>
      <TextField
        id="teacher-form-name"
        label="Name"
        name="name"
        value={teacher.name}
        onChange={handleChange}
        required
      />
      <TextField
        id="teacher-form-subject"
        label="Subject"
        name="subject"
        value={teacher.subject}
        onChange={handleChange}
        required
      />
      <TextField
        id="teacher-form-experience"
        label="Years of Experience"
        name="yearsOfExperience"
        type="number"
        value={teacher.yearsOfExperience}
        onChange={handleChange}
        required
      />
      <Button
        onClick={handleSubmit}
        id="teacher-form-submit"
        variant="contained"
        color="primary"
      >
        {selectedTeacher ? 'Update' : 'Create'}
      </Button>
    </Box>
  );
};

export default TeacherForm;
