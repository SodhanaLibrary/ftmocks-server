// src/components/SubjectForm.js
import React, { useState, useEffect } from 'react';
import { TextField, Button, Box } from '@mui/material';

const SubjectForm = ({ onSubmit, selectedSubject }) => {
  const [subject, setSubject] = useState({ name: '', credits: '' });

  useEffect(() => {
    if (selectedSubject) setSubject(selectedSubject);
  }, [selectedSubject]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSubject((prevSubject) => ({ ...prevSubject, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(subject);
    setSubject({ name: '', credits: '' });
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 3 }}>
      <TextField
        id="subject-form-name"
        label="Name"
        name="name"
        value={subject.name}
        onChange={handleChange}
        required
      />
      <TextField
        id="subject-form-credits"
        label="Credits"
        name="credits"
        type="number"
        value={subject.credits}
        onChange={handleChange}
        required
      />
      <Button
        id="subject-form-submit"
        onClick={handleSubmit}
        variant="contained"
        color="primary"
      >
        {selectedSubject ? 'Update' : 'Create'}
      </Button>
    </Box>
  );
};

export default SubjectForm;
