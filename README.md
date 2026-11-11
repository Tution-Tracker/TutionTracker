# Tuition Tracker

Tuition Tracker is a modern tuition management system built with Next.js and Firebase. It helps tutors manage classes, students, attendance, fees, exams, and communication from a single dashboard, while also giving students a dedicated portal to view attendance, fees, and notifications.

## Project Description

This project is designed for individual tutors or small tuition centers that want a simple, organized way to manage day-to-day academic operations. Instead of using spreadsheets or disconnected tools, the platform centralizes all core data in one application.

Tutors can:
- Manage class schedules and group information
- Add and track students and enrollment details
- Mark attendance for classes
- Record exam results and view performance trends
- Generate and track fees and payments
- Send and monitor notifications and reminders
- View reports and summary metrics

Students can:
- Log in securely using their email and NIC
- View their attendance history
- Check fee status and payment records
- Receive class and fee reminders

## Features

- Tutor dashboard with overview metrics
- Student management and class enrollment
- Attendance tracking with calendar-aware scheduling
- Exam marks management and performance summaries
- Fee tracking and payment management
- Notifications and reminder automation
- Student portal with separate authentication flow
- Firebase Firestore-powered database and security rules
- Responsive UI built with Next.js and Tailwind CSS

## Tech Stack

- Next.js
- Firebase Authentication
- Firestore Database
- Tailwind CSS
- TypeScript

## Folder Structure

```bash
src/
  app/
    dashboard/         # Tutor dashboard pages
    student/            # Student portal pages
  components/           # Reusable UI components
  context/              # Auth and app context providers
  lib/                  # Firebase and app logic helpers
```

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create your Firebase project and enable the required services.

3. Set up environment variables by copying the example file:

```bash
cp .env.local.example .env.local
```

Then update the variables with your Firebase configuration and app settings.

4. Start the development server:

```bash
npm run dev
```

5. Open the app in your browser:

```bash
http://localhost:3000
```

## Environment Variables

The app uses Firebase configuration and service credentials for authentication, database access, and notifications. Make sure to add the necessary values in `.env.local` before running the app.

## Deployment

The project is set up for deployment with Firebase and Vercel-friendly configuration, including secure Firestore rules.

## License

This project is licensed under the MIT License.
