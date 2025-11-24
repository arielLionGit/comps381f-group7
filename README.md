Group members

- LIU Chun Nok (SID: 13513144)  
- WONG Sung Chi (SID: 13514177)  
- CHAU Tsz Ho (SID: 13664550)  
- LIANG Fung Yuen Tony (SID: 13464723)  
- Lam Tai Cheung (SID: 13519900)  

# Project Name: Blog Platform

## Project Information

- **Project Type:** Web-based blog content management system  
- **Main Purpose:**  
  Provide a modern blog platform where registered users can create, read, update, and delete posts, interact through comments, and search articles by various conditions. An admin dashboard is included for managing users and content.

## Project File Introduction

- **`server.js`**  
  Sets up the Express.js server and connects to MongoDB.  
  - Configures view engine (EJS), static files, body parsing, cookie-based session, and method override.  
  - Mounts route modules for authentication, posts, comments, search, admin dashboard, and REST APIs.  
  - Handles 404 and general error pages.

- **`package.json`**  
  Lists the main dependencies for this project:
  - `express` – web framework  
  - `mongoose` – MongoDB ODM  
  - `ejs` – template engine for server‑side rendering  
  - `cookie-session` – session management  
  - `body-parser` – request body parsing  
  - `bcryptjs` – password hashing  
  - `multer` – image upload handling  
  - `express-validator` – request validation

- **`config/` folder**  
  - `database.js` – MongoDB connection configuration using Mongoose.  
  - `upload.js` – Multer configuration for handling image uploads.

- **`models/` folder**  
  Contains Mongoose models that define the MongoDB schema:
  - `User.js` – user account, hashed password, login info, admin flag, and banned status.  
  - `Post.js` – blog posts, including title, content, author reference, tags, view count, and embedded image data.  
  - `Comment.js` – comments linked to posts and users.

- **`routes/` folder**  
  - `auth.js` – login, logout, registration, and session handling.  
  - `posts.js` – HTML CRUD pages for creating, listing, viewing, editing, and deleting blog posts.  
  - `comments.js` – comment creation and deletion.  
  - `search.js` – advanced search by keyword, date range, and tags.  
  - `admin.js` – admin dashboard, user management, and content moderation.  
  - `api.js` – RESTful JSON APIs (CRUD for posts, comments, and search).

- **`middleware/auth.js`**  
  Contains authentication middleware such as:
  - `requireAuth` – ensures that a user is logged in.  
  - `requireGuest` – ensures that a route is only reachable by non‑logged‑in users.  
  - Admin checks used in the admin routes.

- **`views/` folder**  
  Contains EJS templates for the web UI:
  - `login.ejs`, `register.ejs` – authentication pages.  
  - `index.ejs` – home page with post listing and pagination.  
  - `post-create.ejs`, `post-edit.ejs`, `post-detail.ejs` – post CRUD pages.  
  - `search.ejs`, `tag.ejs` – search results and tag listing.  
  - `admin/*.ejs` – admin dashboard views for users, posts, and comments.  
  - `partials/header.ejs`, `partials/footer.ejs` – shared layout components.  
  - `error.ejs` – error display page.

- **`public/` folder**  
  - `css/style.css` – global styles, card layout, responsive design, and image styling.  

- **Documentation Files**  
  - `README.md` – main Chinese README.  
  - `README copy 2.md` – this English README (for submission).  
  - `API_DOCUMENTATION.md` – detailed API documentation for all REST endpoints.  
  - `API_TEST_COMMANDS.md` – cURL examples for manual testing.  
  - `CONFIGURATION.md`, `QUICK_START.md` – setup and configuration guides.

---

## Technology Stack

- **Backend framework:** Express.js  
- **Database:** MongoDB with Mongoose  
- **View engine:** EJS templates (server‑side rendering)  
- **Authentication:** `bcryptjs` + `cookie-session`  
- **File upload:** Multer (images stored as Base64 in MongoDB)  
- **Validation:** `express-validator`  
- **CSS:** Custom responsive layout in `public/css/style.css`

---

## User Flow

### Login / Logout Pages

- Visit `/login` to log in with username and password.  
- Visit `/register` to create a new account (unique email check).  
- Click the **Logout** button or go to `/logout` to end the session.  
- After login, a cookie‑session is created so the user can access protected CRUD pages.

### Basic Blog Operations (CRUD Web Pages)

1. **Register**
   - Route: `/register`  
   - Fill in username, email, password, and confirmation.  
   - On success, the user is logged in automatically.

2. **Login**
   - Route: `/login`  
   - Enter username and password.  
   - On success, the user is redirected to the home page.

3. **Create Post**
   - Route: `/posts/create` (requires login).  
   - Fill in title and content.  
   - Optionally upload up to 5 images and add tags separated by commas.  
   - On success, the user is redirected to the new post detail page.

4. **Read Post**
   - Home page (`/`) lists recent posts with excerpt, tags, and view count.  
   - Clicking a title opens `/post/:id`, showing full content, images, tags, views, and comments.

5. **Update Post**
   - On the post detail page, the author (or admin) can click **Edit**.  
   - Route: `/posts/:id/edit` (requires login and permission).  
   - Users may modify title, content, tags, and images.  

6. **Delete Post**
   - On the post detail or admin list, the author or admin can delete a post via a form submission to `/posts/:id/delete`.  
   - After deletion, the user is redirected to the home page.

### Comments

- Logged‑in users can add comments under each post.  
- Comment authors and admins can delete comments.  
- Comments are displayed with author name and timestamp.

### Search

- Route: `/search`  
- Users can search posts by:
  - Keyword (title and content)  
  - Date range  
  - One or more tags  
- Multiple filters can be combined in one search.

### Admin Operations

1. **Admin Login**
   - Admin uses predefined credentials (see configuration) on the same `/login` page.  
   - On successful admin login, the user is redirected to `/admin/dashboard`.

2. **Admin Dashboard**
   - Route: `/admin/dashboard`  
   - Displays statistics such as total users, posts, and comments.

3. **User Management**
   - View list of all users.  
   - Ban or unban users.  
   - View detailed information and activity records.

4. **Content Management**
   - Manage all posts and comments.  
   - Remove inappropriate content.  

---

## RESTful CRUD Services

All REST APIs live under the `/api` prefix and return JSON responses.  
Authenticated endpoints require the user to be logged in (session cookie).

### Authentication

- Before calling protected endpoints, log in via the web UI or the cURL examples below to obtain a session cookie.  
- The cookie is then sent with subsequent `curl` requests using `-b cookies.txt`.

### Post APIs

**Get all posts**

```bash
GET /api/posts?page=1&limit=10
```

**Get a single post**

```bash
GET /api/posts/:id
```

**Create a post** (requires login)

```bash
POST /api/posts
Content-Type: application/json

{
  "title": "Post title",
  "content": "Post content",
  "tags": ["tag1", "tag2"]
}
```

**Update a post** (requires login; author or admin only)

```bash
PUT /api/posts/:id
Content-Type: application/json

{
  "title": "Updated title",
  "content": "Updated content"
}
```

**Delete a post** (requires login; author or admin only)

```bash
DELETE /api/posts/:id
```

### Comment APIs

**Get all comments of a post**

```bash
GET /api/posts/:postId/comments
```

**Create a comment** (requires login)

```bash
POST /api/posts/:postId/comments
Content-Type: application/json

{
  "content": "Comment content"
}
```

**Delete a comment** (requires login; comment author or admin)

```bash
DELETE /api/comments/:id
```

### Search API

**Search posts**

```bash
GET /api/search?q=keyword&tags=tag1,tag2&startDate=2024-01-01&endDate=2024-12-31
```

---

## cURL Test Examples

### Register User

```bash
curl -X POST  https://comps381f-group7.onrender.com/register 
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&email=test@example.com&password=123456&confirmPassword=123456" -L
```

### Login

```bash
curl -X POST https://comps381f-group7.onrender.com/login
  -H "Content-Type: application/x-www-form-urlencoded" 
  -d "username=testuser&password=123456"
  -c cookies.txt -L
```

### Create Post via API

```bash
curl -X POST https://comps381f-group7.onrender.com/api/posts
  -H "Content-Type: application/json"
  -b cookies.txt 
  -d "{"title":"API測試文章","content":"這是一篇通過API建立的文章","tags":["API","測試"]}"
```

### Get Post List via API

```bash
curl -X GET "https://comps381f-group7.onrender.com/api/posts?page=1&limit=2" -b cookies.txt
```

---

### Update post via API
```bash
curl -X PUT https://comps381f-group7.onrender.com/api/posts/69242794fbeb083086975988
  -H "Content-Type: application/json"
  -b cookies.txt
  -d "{"title":"已更新的標題","content":"已更新的內容"}"
```
### Delete post via API
```bash
curl -X DELETE https://comps381f-group7.onrender.com/api/posts/69242794fbeb083086975988
  -b cookies.txt
```

## Admin Configuration

Default admin credentials (for local testing) can be found in the configuration or `.env` file, for example:

- **username:** `admin`  
- **password:** `123456`  

These values should be changed before deploying to a production environment.
#
