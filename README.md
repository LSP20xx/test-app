# Healing_Blends_Test

Healing_Blends_Test is an application designed to take photos of tests and recognize the results using facial recognition with Face ID and Azure Computer Vision. It also includes user authentication features and the ability to handle parental consent for underage users.

## Overview

This project leverages several technologies and frameworks to deliver a comprehensive solution:

- **Node.js**: Server-side runtime environment.
- **Express.js**: Web application framework for Node.js.
- **MongoDB**: Database for storing user information and test results.
- **Mongoose**: Object Data Modeling (ODM) library for MongoDB and Node.js.
- **Azure Computer Vision**: Service to analyze test photos.
- **EJS**: Templating engine for rendering HTML views.
- **Multer**: Middleware for handling `multipart/form-data` for file uploads.

The project structure is as follows:

```
Healing_Blends_Test/
├── .env
├── .env.example
├── package.json
├── server.js
├── models/
├── public/
├── routes/
├── utils/
└── views/
```

## Features

- User Registration and Login
- Biometric Data Submission (Facial and Fingerprint Scans)
- Identification Document Upload
- Parental Consent Handling
- Test Photo Upload and Analysis
- Information Resource Management

## Getting started

### Requirements

Ensure you have the following installed on your machine:

- Node.js (v14 or later)
- MongoDB

### Quickstart

1. Clone the repository and navigate into the project directory:

```bash
$ git clone https://github.com/your-repo/Healing_Blends_Test.git
$ cd Healing_Blends_Test
```

2. Copy `.env.example` to `.env` and fill in the required values:

```bash
$ cp .env.example .env
```

3. Install the dependencies:

```bash
$ npm install
```

4. Start the MongoDB server.

5. Run the application:

```bash
$ npm start
```

6. Open your browser and navigate to `http://localhost:6000`

### License

The project is proprietary. Copyright (c) 2024.