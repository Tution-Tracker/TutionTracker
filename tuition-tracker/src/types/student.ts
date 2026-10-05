export type BillingStatus = 'none' | 'free';

export type Student = {
  id: string;
  name: string;
  email: string;
  nic: string;
  phone: string;
  parent: string;
  school: string;
  grade: string;
  classIds: string[];
  enrollDate: string;
  notes: string;
  billingStatus: BillingStatus;
};

// A student that hasn't been saved yet has no id.
// Firestore creates the id for us when we save.
export type NewStudent = Omit<Student, 'id'>;