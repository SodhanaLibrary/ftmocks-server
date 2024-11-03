// src/components/SubjectList.js
import React from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const SubjectList = ({ subjects, onEdit, onDelete }) => (
    <TableContainer component={Paper}>
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Credits</TableCell>
                    <TableCell>Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                        <TableCell>{subject.name}</TableCell>
                        <TableCell>{subject.credits}</TableCell>
                        <TableCell>
                            <Button variant="contained" color="primary" onClick={() => onEdit(subject)}>
                                Edit
                            </Button>
                            <Button variant="contained" color="secondary" onClick={() => onDelete(subject.id)} style={{ marginLeft: 8 }}>
                                Delete
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
);

export default SubjectList;
