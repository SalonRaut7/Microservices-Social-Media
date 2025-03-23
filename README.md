# Social Media Microservices

This project implements a **Social Media** platform built with a microservices architecture. It leverages **Node.js**, **Express**, **MongoDB**, **Redis**, **RabbitMQ**, and other tools for scalability, performance, and modularity. The system includes services for handling posts, search functionality, user authentication, and more.


## Overview

This project is a **Social Media Microservices** platform that enables users to perform various social media actions such as creating posts, searching posts, creating users, and more. It uses a microservice architecture to ensure each service can scale independently, promoting high availability and maintainability.

## Technologies

- **Node.js**: Backend framework for building RESTful APIs and microservices.
- **Express**: Web framework for handling routes, middleware, and HTTP requests.
- **MongoDB**: NoSQL database to store data such as user profiles, posts, and search results.
- **Redis**: Caching layer to store and retrieve search results for performance optimization.
- **RabbitMQ**: Message broker for event-driven communication between microservices.
- **ioredis**: Redis client for Node.js, used for caching and rate limiting.
- **rate-limiter-flexible**: Library for implementing Redis-based rate limiting.
- **dotenv**: Loads environment variables from a `.env` file.
- **helmet**: Adds security headers to HTTP responses.
- **cors**: Enables Cross-Origin Resource Sharing for API accessibility across different domains.
- **winston**: Logging tool for tracking events and errors.


## Services

### 1. **API Gateway**
- The **API Gateway** serves as the **entry point** for all client requests.
- It implements **reverse proxy** to route incoming requests to the appropriate services (identity-service, media-service, post-service, search-service).
- It acts as a **gateway** for interacting with all other microservices in the system.

### 2. **Identity Service**
- Handles **authentication and authorization** for users.
- Supports **JWT-based authentication** for secure login and user registration.
- Responsible for user login, signup, profile management, and email verification.

### 3. **Media Service**
- Allows users to **upload media** such as images and videos.
- Uses **Cloudinary** for media storage.
  
### 4. **Post Service**
- Enables users to **create and manage posts**.
- Integrates with the identity-service for user authentication and media-service for media uploads.
  
### 5. **Search Service**
- Provides **search functionality** for posts using text search.
- Implements **caching** to improve search performance and reduce database load.

## Communication Between Services

- **RabbitMQ** is used for communication between services. 
- Events such as `post.created` and `post.deleted` trigger updates in the search index and invalidate caches.
  
## Caching
- Caching is implemented across various services to optimize performance.
- **Redis** is used for caching post searches and other frequently accessed data.

