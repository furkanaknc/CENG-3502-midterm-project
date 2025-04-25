# Landmark Tracker

A web application for tracking and planning visits to landmarks around the world. This application allows users to mark locations on a map, add details about landmarks, track visited locations, and create visiting plans.

## Features

- **User Authentication**: Register and login to access your personal landmark data
- **Interactive Map**: Click on the map to add landmarks
- **Landmark Management**: Add details like name, category, description, and notes to landmarks
- **Visit Tracking**: Mark landmarks as visited and add visit details
- **Visit History**: View history of visits for each landmark
- **Visit Planning**: Create plans with multiple landmarks for future visits
- **Search & Filter**: Find landmarks by name, category, or visit status

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript, Leaflet.js for maps
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JSON Web Tokens (JWT)

## Packages Used

- **Express**: Web application framework for creating API endpoints and handling HTTP requests
- **MongoDB/Mongoose**: MongoDB object modeling for Node.js, used for database interactions
- **bcryptjs**: Library for hashing and verifying passwords securely
- **jsonwebtoken**: Implementation of JSON Web Tokens for secure user authentication
- **cors**: Middleware for enabling Cross-Origin Resource Sharing
- **dotenv**: Loading environment variables from a .env file
- **body-parser**: Middleware for parsing incoming request bodies
- **nodemon**: Utility for monitoring changes and automatically restarting the server (dev dependency)
- **Leaflet**: JavaScript library for interactive maps

## Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v12 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (local installation or MongoDB Atlas account)

## Setup Instructions

1. **Clone the repository**

   ```
   git clone <repository-url>
   cd landmark-tracker
   ```

2. **Install dependencies**

   ```
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory with the following variables:

   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/landmark-tracker
   JWT_SECRET=your_jwt_secret_key
   API_BASE_URL=localhost
   ```

   Notes:

   - For production, use a strong random string as JWT_SECRET
   - Change MONGODB_URI if using MongoDB Atlas or a different database name
   - API_BASE_URL should match your server's hostname

4. **Start the application**

   Development mode:

   ```
   npm run dev
   ```

   Production mode:

   ```
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to:
   ```
   http://localhost:5000 || https://landmark-tracker-f1e80f85d1cc.herokuapp.com/
   ```

## Usage

1. **Register/Login**: Create an account or login to access your landmarks
2. **Add Landmarks**: Click on the map to add new landmarks
3. **Add Details**: Select a landmark and add information like name, category, description
4. **Mark as Visited**: Track which landmarks you've visited
5. **Create Visit Plans**: Select multiple landmarks to create a visit itinerary
6. **Filter and Search**: Use the search functionality to find specific landmarks

## Database Models

- **User**: Stores user account information
- **Landmark**: Stores landmark information including location, description, and category
- **VisitedLandmark**: Records when a user has visited a landmark
- **VisitPlan**: Stores plans for future landmark visits

## API Endpoints

The application provides the following API endpoints:

- **Authentication**

  - POST /api/auth/register - Register a new user
  - POST /api/auth/login - Authenticate a user

- **Landmarks**

  - GET /api/landmarks - Get all landmarks for the current user
  - GET /api/landmarks/:id - Get a specific landmark
  - POST /api/landmarks - Create a new landmark
  - PUT /api/landmarks/:id - Update a landmark
  - DELETE /api/landmarks/:id - Delete a landmark

- **Visited Landmarks**

  - GET /api/visited - Get all visited landmarks
  - GET /api/visited/:id - Get visit records for a specific landmark
  - POST /api/visited - Mark a landmark as visited
  - PUT /api/visited/:id - Update a visit record
  - DELETE /api/visited/:id - Delete a visit record

- **Visit Plans**
  - GET /api/visitplans - Get all visit plans
  - GET /api/visitplans/:id - Get a specific visit plan
  - POST /api/visitplans - Create a new visit plan
  - DELETE /api/visitplans/:id - Delete a visit plan
