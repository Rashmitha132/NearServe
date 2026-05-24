# NearServe

NearServe is a full-stack local service booking web application that connects customers with nearby workers for home and daily services. The platform provides separate flows for customers and workers, making it easy for customers to book services and for verified workers to manage service requests.

## Project Overview

NearServe helps users find and book trusted local workers such as electricians, carpenters, plumbers, cleaners, and other service providers. The main aim of this project is to make local service booking simple, fast, and reliable through an online platform.

The project has two main sides:

- Customer side
- Worker side

## Customer Side Features

- Customer signup and login
- View available services
- Book local workers
- Manage customer profile
- View booking details
- Contact/support option
- Simple and user-friendly interface

## Worker Side Features

- Worker signup and login
- Worker profile creation
- Worker verification process
- Upload required details/documents
- View booking requests
- Accept or reject service bookings
- Manage service status
- Communicate with customers

## Admin / Verification Flow

NearServe includes a worker verification idea where workers cannot directly get full access without verification. This helps improve trust and safety in the platform.

The worker flow includes:

- Worker registration
- Profile completion
- Verification/probation stage
- Approval before full access

## Tech Stack

### Frontend
- HTML
- CSS
- JavaScript
- Firebase Hosting

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Vercel Deployment

### Other Tools
- GitHub
- Firebase
- Vercel
- MongoDB Atlas

## Folder Structure

```text
NearServe/
│
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── js/
│   ├── index.html
│   └── other frontend pages
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   ├── server.js
│   └── package.json
│
├── .gitignore
├── README.md
└── LICENSE
