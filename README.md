# SecondBrain Monorepo
Project Proposal
1. Project Title
SecondBrain – A Collaborative Q&A Learning Platform
 
2. Problem Statement
Learners often struggle to save, organize, and share useful educational resources efficiently.
SecondBrain offers a secure platform to store, manage, and share learning content with others through unique shareable links.
It promotes personal organization and collaborative knowledge sharing in a simple, user-friendly interface. 
3. System Architecture
Architecture: Frontend → Backend (API) → Database
•	Frontend: React.js, HTML, TailwindCSS, Axios
•	Backend: Node.js, Express.js
•	Database: MongoDB Atlas
•	Authentication: JWT (role-based: user/admin)
•	Hosting: Frontend on Vercel, Backend on Render, Database on MongoDB Atlas
Additional Functional Modules:
•	Searching, Sorting, Filtering, and Pagination integrated across data endpoints.
•	Dynamic data fetching implemented on most pages for real-time content updates.
 
4. Key Features
Category	Features
Authentication & Roles	Secure login/signup using JWT authentication and admin moderation
CRUD Operations	Create, view, edit, and delete questions and answers
Search, Sort & Filter	Search by keywords, filter by tags or popularity, and sort by date or votes
Pagination	Paginated data display for better performance and scalability
Dynamic Data Fetching	Real-time updates for questions and answers using API calls
Routing	Structured pages for Home, Login, Ask Question, Answer, and Profile
Hosting	Fully deployed using Vercel (Frontend) and Render (Backend)
 
5. Tech Stack
Layer	Technologies Used
Frontend	React.js, HTML, TailwindCSS, Axios
Backend	Node.js, Express.js
Database	MongoDB Atlas
Authentication	JWT, bcrypt.js
Hosting	Vercel (Frontend), Render (Backend)
Programming Language	JavaScript (ES6+)
 
6. API Overview
•  /api/v1/signup — POST — Register new user
•  /api/v1/signin — POST — User login
•  /api/v1/content — POST — Add new content
•  /api/v1/content — GET — Fetch user’s content
•  /api/v1/content — DELETE — Delete content
•  /api/v1/brain/share — POST — Enable or disable content sharing
•  /api/v1/brain/:shareLink — GET — Fetch publicly shared content

 
7. Additional Notes
•	Most pages dynamically fetch data using Axios and React Hooks for an interactive user experience.
•	Pagination and sorting enhance scalability and performance.
•	The project uses a unified JavaScript stack for streamlined development.
•	The system architecture ensures efficient data flow and modular design for maintainability and deployment readiness.
<img width="468" height="638" alt="image" src="https://github.com/user-attachments/assets/84844651-625d-48a5-8493-88847fa80a2b" />
