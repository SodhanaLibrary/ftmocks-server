export interface Teacher {
  id?: string | number;
  name: string;
  subject: string;
  yearsOfExperience: string | number;
}

export interface Student {
  id?: string | number;
  name: string;
  age: string | number;
  grade: string;
}

export interface Subject {
  id?: string | number;
  name: string;
  credits: string | number;
}
