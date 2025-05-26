# Books API Backend

A simple Node.js REST API for managing books with enhanced security features.

## Table of Contents

- [Setup](#setup)
- [API Endpoints](#api-endpoints)
- [Running the Application](#running-the-application)
- [Available Scripts](#available-scripts)

## Setup

1. Prerequisites:
   - Node.js (v14+)
   - npm or yarn
   - MongoDB

2. Installation:
   ```bash
   git clone https://github.com/yourusername/books-api.git
   cd books-api
   npm install
   ```

3. Environment:
   ```
   PORT=3000
   MONGO_URI=your_mongodb_uri
   API_KEY=api_key
   NODE_ENV=developement or production
   ```

## Security Features

- **JWT Authentication**: Secure token-based authentication system
- **Input Validation**: Request data validation using Joi/Express-validator
- **Data Sanitization**: Protection against NoSQL injection & XSS attacks
- **Rate Limiting**: Prevents brute force and DoS attacks
- **CSRF Protection**: Cross-Site Request Forgery prevention
- **Custom Logging**: Detailed logging for monitoring and debugging
- **IP Restrictions**: Whitelist specific IPs for sensitive operations
- **Helmet.js**: Sets security HTTP headers
- **Cookie Blacklisting**: Revokes compromised tokens by adding them to a blacklist

## API Flow & Endpoints

### Authentication Flow
1. Register a new user account
2. Login to receive JWT token in a secure HTTP-only cookie
3. All subsequent requests will automatically include the cookie
4. Access protected book management endpoints
5. Logout to clear the cookie

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login and set JWT token cookie
- `POST /api/users/logout` - Clear JWT cookie

### Books (Protected Routes)
- `GET /store/books` - Get all books (auth via cookie)
- `GET /store/books/:id` - Get book by ID (auth via cookie)
- `POST /store/books` - Create book (auth via cookie)
- `PUT /store/books/:id` - Update book (auth via cookie)
- `DELETE /store/books/:id` - Delete book (auth via cookie)

## Usage Example

1. Register a new user:
   ```bash
   curl -X POST http://localhost:3000/api/users/register \
     -H "Content-Type: application/json" \
     -d '{"username":"user1","password":"secure123"}'
   ```

2. Login to set JWT cookie:
   ```bash
   curl -X POST http://localhost:3000/api/users/login \
     -H "Content-Type: application/json" \
     -d '{"username":"user1","password":"secure123"}' \
     -c cookies.txt
   ```

3. Access protected routes (cookie sent automatically):
   ```bash
   curl -X GET http://localhost:3000/store/books \
     -b cookies.txt
   ```

4. Logout to clear cookie:
   ```bash
   curl -X POST http://localhost:3000/api/users/logout \
     -b cookies.txt
   ```

## Running the Application

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## Graceful Shutdown

The application implements graceful shutdown to handle process termination properly:

- Closes database connections cleanly
- Completes in-flight requests before exiting
- Releases system resources properly
- Logs shutdown sequence for debugging

This prevents data corruption and ensures proper cleanup when the application is stopped or when errors occur.

## Available Scripts

- `npm run dev`: Development server
- `npm start`: Production server
- `npm test`: Run tests

