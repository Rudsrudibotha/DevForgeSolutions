# DevForgeSolutions
School Management SaaS

## 🚀 Live Demo
Visit: `https://yourusername.github.io/DevForgeSolutions`

## 📱 Platforms
- **Web**: React + Vite + Tailwind CSS
- **Mobile**: Flutter (iOS/Android)
- **Backend**: PostgreSQL with RLS

## 🛠️ Quick Start

### Web Development
```bash
cd FrontEnd/web
npm install
npm run dev
```

### Mobile Development
```bash
cd FrontEnd
flutter pub get
flutter run
```

### Database Setup
```bash
psql -U postgres -f BackEnd/schema.sql
```

## 🌟 Features
- Multi-tenant architecture
- Student management
- Attendance tracking
- Staff & payroll
- Invoice & payments
- Digital contracts
- Real-time updates

## 🔧 Tech Stack
- **Frontend**: React, Flutter, Tailwind CSS
- **Backend**: PostgreSQL, Row Level Security
- **Deployment**: GitHub Pages, GitHub Actions
- **State Management**: Zustand, BLoC

## 📦 Project Structure
```
├── FrontEnd/
│   ├── web/          # React + Vite + Tailwind
│   └── flutter/      # Flutter mobile app
├── BackEnd/
│   └── schema.sql    # PostgreSQL database
└── .github/
    └── workflows/    # CI/CD automation
```