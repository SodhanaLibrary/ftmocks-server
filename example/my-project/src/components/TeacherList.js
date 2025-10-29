// src/components/TeacherList.js
import React from 'react';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';

const TeacherList = ({ teachers, onEdit, onDelete }) => (
  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Subject</TableCell>
          <TableCell>Years of Experience</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {teachers.map((teacher) => (
          <TableRow key={teacher.id}>
            <TableCell>{teacher.name}</TableCell>
            <TableCell>{teacher.subject}</TableCell>
            <TableCell>{teacher.yearsOfExperience}</TableCell>
            <TableCell>
              <Button
                id={`teacher-${teacher.id}-edit-btn`}
                variant="contained"
                color="primary"
                onClick={() => onEdit(teacher)}
              >
                Edit
              </Button>
              <Button
                id={`teacher-${teacher.id}-delete-btn`}
                variant="contained"
                color="secondary"
                onClick={() => onDelete(teacher.id)}
                style={{ marginLeft: 8 }}
              >
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

export default TeacherList;
