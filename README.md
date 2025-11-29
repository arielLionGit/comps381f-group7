# Blog Platform - COMP S381F Group 7

## 1. Project Info

**Project Name:** Blog Platform

**Group Info:**
- Group No.: Group 7
- Course Code: COMP S381F


## Students' Names & SID: 

- LIU Chun Nok (SID: 13513144)  
- WONG Sung Chi (SID: 13514177)  
- CHAU Tsz Ho (SID: 13664550)  
- LIANG Fung Yuen Tony (SID: 13464723)  
- Lam Tai Cheung (SID: 13519900)  

## 2. Project File Introduction

### server.js
Main server file that provides the following functionalities:
- Express.js server configuration
- MongoDB database connection
- Cookie-session authentication mechanism
- Route configuration (authentication, posts, comments, search, admin, API)
- Error handling middleware
- Static file serving

### package.json
Project dependency list:
- **express**: ^5.1.0 - Web framework
- **mongoose**: ^8.19.3 - MongoDB ODM
- **ejs**: ^3.1.10 - Template engine
- **cookie-session**: ^2.1.1 - Session management
- **bcryptjs**: ^3.0.3 - Password encryption
- **express-validator**: ^7.3.0 - Data validation
- **body-parser**: ^2.2.1 - Request body parsing
- **method-override**: ^3.0.0 - HTTP method override
- **multer**: ^2.0.2 - File upload handling
- **dotenv**: ^17.2.3 - Environment variable management

### public (folder)
Static resource files:
- **css/style.css**: Website stylesheet with responsive design and modern UI styles

### views (folder)
EJS template files:
- **index.ejs**: Homepage displaying all posts list (paginated)
- **login.ejs**: Login page
- **register.ejs**: Registration page
- **post-create.ejs**: Create post page
- **post-detail.ejs**: Post detail page (includes comment functionality)
- **post-edit.ejs**: Edit post page
- **search.ejs**: Search page (supports multiple query conditions)
- **tag.ejs**: Tag browsing page
- **error.ejs**: Error page
- **partials/header.ejs**: Header template (includes navigation bar and logout button)
- **partials/footer.ejs**: Footer template
- **admin/**: Admin-related pages (dashboard, users, posts, comments, user-detail)

### models (folder)
MongoDB data model files and route handlers:
- **User.js**: User model (username, email, password, isBanned, loginCount, lastLogin)
- **Post.js**: Post model (title, content, author, images, tags, viewCount)
- **Comment.js**: Comment model (content, author, post)
- **auth.js**: Authentication routes (login, register, logout)
- **postRoutes.js**: Post routes (CRUD operations)
- **commentRoutes.js**: Comment routes (create, delete)
- **search.js**: Search routes (multi-condition search)
- **admin.js**: Admin routes (user management, post management, comment management)
- **api.js**: RESTful API routes (provides JSON-format CRUD services)


## 3. Cloud-based Server URL

**Cloud Test Server URL:** https://comps381f-group7.onrender.com/

**Local Test Server URL:** http://localhost:3000

## 4. Operation Guides

### 4.1 Login/Logout Pages

#### Valid Login Information:
- **Admin Account:**
  - Username: `admin`
  - Password: `123456`
  - After login, admin will be redirected to `/admin/dashboard`
  - Admin has access to all CRUD functions plus additional management features

- **Regular Users:**
  - Can create new accounts through the registration page (`/register`)
  - Or use existing registered accounts to log in

#### Login Steps:
1. Visit the homepage or directly visit `/login`
2. Enter username and password
3. Click the "Login" button
4. After successful login, you will be automatically redirected to the homepage

#### Logout Steps:
1. Click the "Logout" button in the top-right corner of the navigation bar
2. Or directly visit `/logout`
3. After logout, you will be automatically redirected to the login page

### 4.2 CRUD Web Pages

#### Create Function:
- **Location:** "Create Post" button in the navigation bar (visible only to logged-in users)
- **Path:** `/create`
- **Features:**
  - Fill in post title (required, max 200 characters)
  - Fill in post content (required)
  - Upload images (optional, max 5 images, 5MB per image)
  - Add tags (optional, comma-separated)
  - Click "Publish" button to publish the post

#### Read Function:
- **Homepage Browsing:**
  - Path: `/`
  - Display all posts list (paginated, 10 posts per page)
  - Click post title to view details

- **Post Details:**
  - Path: `/post/:id`
  - Display complete post content, author, publish time, view count, tags
  - Display all comments

- **Search Function:**
  - Path: `/search`
  - Supports multiple query conditions:
    - **Keyword Search:** Search in title or content (case-sensitive option available)
    - **Date Range:** Specify start date and end date
    - **Tag Search:** Enter tags (comma-separated)
  - Can combine multiple conditions for search

- **Tag Browsing:**
  - Path: `/tag/:tag`
  - Click tags in posts to browse all posts under that tag

#### Update Function:
- **Location:** "Edit Post" button on post detail page (visible only to author or admin)
- **Path:** `/post/:id/edit`
- **Features:**
  - Modify post title and content
  - Delete existing images (check "Remove")
  - Add new images
  - Modify tags
  - Click "Update Post" button to save changes

#### Delete Function:
- **Location:** "Delete Post" button on post detail page (visible only to author or admin)
- **Path:** `/post/:id/delete` (POST)
- **Features:**
  - Click "Delete Post" button
  - After confirmation, the post and all its comments will be permanently deleted
  - Automatically redirect to homepage after deletion

**Note:** All CRUD pages include a logout button (located in the top-right corner of the navigation bar).

#### Admin Dashboard (Admin Only):
- **Location:** "Admin Dashboard" button in the navigation bar (visible only to admin users)
- **Path:** `/admin/dashboard`
- **Access:** Only accessible after logging in with admin account
- **Features:**
  - **Statistics Overview:** Display total users, total posts, total comments, and banned users count
  - **User Management:** Access to `/admin/users` for managing all users
    - View all users with pagination
    - View user details (`/admin/users/:id`)
    - Ban/unban users
    - View user's posts and comments
  - **Post Management:** Access to `/admin/posts` for managing all posts
    - View all posts with pagination
    - Admin can edit or delete any post
  - **Comment Management:** Access to `/admin/comments` for managing all comments
    - View all comments with pagination
    - Admin can delete any comment
  - **Recent Activity:** Display recently registered users, most active users, and recent posts

### 4.3 RESTful CRUD Services

All API endpoints are located under the `/api` path and return JSON-format responses.

#### Read APIs (GET)

1. **Get All Posts**
   - **Path:** `GET /api/posts`
   - **Query Parameters:**
     - `page` (optional): Page number, default is 1
     - `limit` (optional): Items per page, default is 10
   - **CURL Test Command (CMD):**
   ```cmd
   curl -X GET "https://comps381f-group7.onrender.com/api/posts?page=1&limit=10"
   ```
   - **Local Test (optional):**
   ```cmd
   curl -X GET "http://localhost:3000/api/posts?page=1&limit=10"
   ```

2. **Get Single Post**
   - **Path:** `GET /api/posts/:id`
   - **CURL Test Command (CMD):**
   ```cmd
   curl -X GET "https://comps381f-group7.onrender.com/api/posts/POST_ID"
   ```
   - **Local Test (optional):**
   ```cmd
   curl -X GET "http://localhost:3000/api/posts/POST_ID"
   ```

3. **Get Post Comments**
   - **Path:** `GET /api/posts/:postId/comments`
   - **CURL Test Command (CMD):**
   ```cmd
   curl -X GET "https://comps381f-group7.onrender.com/api/posts/POST_ID/comments"
   ```
   - **Local Test (optional):**
   ```cmd
   curl -X GET "http://localhost:3000/api/posts/POST_ID/comments"
   ```

4. **Search Posts**
   - **Path:** `GET /api/search`
   - **Query Parameters:**
     - `q` (optional): Keyword (search in title or content)
     - `tags` (optional): Tags (comma-separated)
     - `startDate` (optional): Start date (YYYY-MM-DD)
     - `endDate` (optional): End date (YYYY-MM-DD)
   - **CURL Test Command (CMD):**
   ```cmd
   curl -X GET "https://comps381f-group7.onrender.com/api/search?q=API&tags=api&startDate=2025-11-27&endDate=2025-11-29"
   ```
   - **Local Test (optional):**
   ```cmd
   curl -X GET "http://localhost:3000/api/search?q=API&tags=api&startDate=2025-11-27&endDate=2025-11-29"
   ```

5. **Get All Users**
   - **Path:** `GET /api/users`
   - **CURL Test Command (CMD):**
   ```cmd
   curl -X GET "https://comps381f-group7.onrender.com/api/users"
   ```
   - **Local Test (optional):**
   ```cmd
   curl -X GET "http://localhost:3000/api/users"
   ```

6. **Get Single User Information**
   - **Path:** `GET /api/users/:id`
   - **CURL Test Command (CMD):**
   ```cmd
   curl -X GET "https://comps381f-group7.onrender.com/api/users/USER_ID"
   ```
   - **Local Test (optional):**
   ```cmd
   curl -X GET "http://localhost:3000/api/users/USER_ID"
   ```

#### Create APIs (POST)

1. **Create Post**
   - **Path:** `POST /api/posts`
   - **Request Body (JSON):**
   ```json
   {
     "title": "Post Title",
     "content": "Post Content",
     "tags": ["tag1", "tag2"]
   }
   ```
   - **CURL Test Command (CMD):**
   ```cmd
   curl -X POST "https://comps381f-group7.onrender.com/api/posts" -H "Content-Type: application/json" -d "{\"title\":\"Test Post\",\"content\":\"This is a test post\",\"tags\":[\"test\",\"demo\"]}"
   ```
   - **Local Test (optional):**
   ```cmd
   curl -X POST "http://localhost:3000/api/posts" -H "Content-Type: application/json" -d "{\"title\":\"Test Post\",\"content\":\"This is a test post\",\"tags\":[\"test\",\"demo\"]}"
   ```

2. **Create Comment**
   - **Path:** `POST /api/posts/:postId/comments`
   - **Request Body (JSON):**
   ```json
   {
     "content": "Comment Content"
   }
   ```
   - **CURL Test Command (CMD):**
   ```cmd
   curl -X POST "https://comps381f-group7.onrender.com/api/posts/POST_ID/comments" -H "Content-Type: application/json" -d "{\"content\":\"This is a test comment\"}"
   ```
   - **Local Test (optional):**
   ```cmd
   curl -X POST "http://localhost:3000/api/posts/POST_ID/comments" -H "Content-Type: application/json" -d "{\"content\":\"This is a test comment\"}"
   ```

#### Update APIs (PUT)

1. **Update Post**
   - **Path:** `PUT /api/posts/:id`
   - **Request Body (JSON, all fields optional):**
   ```json
   {
     "title": "Updated Title",
     "content": "Updated Content",
     "tags": ["updated", "tags"]
   }
   ```
   - **CURL Test Command (CMD):**
   ```cmd
   curl -X PUT "https://comps381f-group7.onrender.com/api/posts/POST_ID" -H "Content-Type: application/json" -d "{\"title\":\"Updated Title\",\"content\":\"Updated Content\",\"tags\":[\"updated\"]}"
   ```
   - **Local Test (optional):**
   ```cmd
   curl -X PUT "http://localhost:3000/api/posts/POST_ID" -H "Content-Type: application/json" -d "{\"title\":\"Updated Title\",\"content\":\"Updated Content\",\"tags\":[\"updated\"]}"
   ```

#### Delete APIs (DELETE)

1. **Delete Comment**
   - **Path:** `DELETE /api/comments/:id`
   - **CURL Test Command (CMD):**
   ```cmd
   curl -X DELETE "https://comps381f-group7.onrender.com/api/comments/COMMENT_ID"
   ```
   - **Local Test (optional):**
   ```cmd
   curl -X DELETE "http://localhost:3000/api/comments/COMMENT_ID"
   ```

2. **Delete Post**
   - **Path:** `DELETE /api/posts/:id`
   - **CURL Test Command (CMD):**
   ```cmd
   curl -X DELETE "https://comps381f-group7.onrender.com/api/posts/POST_ID"
   ```
   - **Local Test (optional):**
   ```cmd
   curl -X DELETE "http://localhost:3000/api/posts/POST_ID"
   ```

**Note:** All RESTful APIs do not require authentication (as per requirements), but some APIs will check permissions (e.g., checking if user is author or admin when updating/deleting).

### 4.4 Other Features

- **Admin Features:** After logging in with admin account, you can access `/admin/dashboard` for user management, post management, and comment management
- **Comment Feature:** Logged-in users can post comments on post detail pages
- **Image Upload:** Supports uploading images to posts (stored as Base64 encoding)
- **Tag System:** Posts can have multiple tags, supports browsing by tags
- **Pagination Feature:** Homepage post list supports pagination

