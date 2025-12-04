1. Project Title

SecondBrain – A Collaborative Q&A Learning Platform

2. Problem Statement

Learners frequently struggle to organize educational resources, save important information, and share knowledge efficiently.
SecondBrain provides a structured platform that allows users to create, store, manage, and share learning content using secure shareable links.
The system encourages personal knowledge organization while enabling collaborative learning through a simple and intuitive interface.

3. System Architecture
Architecture:

Frontend → Backend (API) → Database

Components Used

Frontend: React.js, HTML, TailwindCSS, Axios

Backend: Node.js, Express.js

Database: MongoDB Atlas

Authentication: JWT-based login with user/admin roles

Hosting:

Frontend → Vercel

Backend → Render

Database → MongoDB Atlas

Additional Functional Modules

Searching, sorting, filtering, and pagination integrated across content endpoints

Dynamic data fetching using Axios for real-time updates

Public sharing system for content accessibility

Modular code separation for controllers, routes, and middleware

4. Key Features
Category	Features
Authentication & Roles	Secure login/signup using JWT, role-based access (user/admin)
CRUD Operations	Create, view, edit, and delete content items (notes/questions/entries)
Search, Sort & Filter	Search by keywords, sort by date or popularity, filter by tags
Pagination	Improves page performance by loading data in chunks
Dynamic Data Fetching	Real-time content updates using API calls from React
Routing	Organized pages for Home, Login, Dashboard, Create Content, View Content
Sharing System	Generate shareable public links for selected content
Hosting	Fully deployed using Vercel (FE) and Render (BE)
5. Tech Stack
Layer	Technologies Used
Frontend	React.js, HTML, TailwindCSS, Axios
Backend	Node.js, Express.js
Database	MongoDB Atlas
Authentication	JWT, bcrypt.js
Hosting	Vercel (Frontend), Render (Backend)
Programming Language	JavaScript (ES6+)
6. API Overview

POST /api/v1/signup — Register a new user

POST /api/v1/login — User login

POST /api/v1/content — Add new content

GET /api/v1/content — Fetch user’s content

DELETE /api/v1/content/:id — Delete a specific content item

POST /api/v1/brain/share — Enable or disable sharing for content

GET /api/v1/brain/:shareLink — Access publicly shared content

(Exact endpoints sourced from the repo’s backend folder & README.)

7. Additional Notes

React Hooks + Axios enable real-time data fetch and page updates.

Pagination and query-based filtering improve performance at scale.

The monorepo architecture keeps frontend & backend aligned for faster development.

Modular Express structure ensures maintainable routes, controllers, and middleware.

Public sharing via unique links enhances collaboration and usability.
