# Backend API for Creator Digital Shop

This backend provides API endpoints for storing and retrieving posts/services for your digital shop using SQLite.

## How to Run

1. Open a terminal and navigate to the `backend` folder:
   ```sh
   cd backend
   ```
2. Install dependencies (already done if you followed setup):
   ```sh
   npm install
   ```
3. Start the server:
   ```sh
   node index.js
   ```

The server will run at [http://localhost:3000](http://localhost:3000).

## Endpoints

- `POST   /posts`                — Create a new post/service
- `GET    /posts/:influencerName` — Get all posts for an influencer
- `GET    /post-by-code/:code`    — Get a post by its code
- `PUT    /posts/:id`             — Update a post
- `DELETE /posts/:id`             — Delete a post
- `GET    /signup-count/:code`    — Get signup count for a post (dummy table for now)

All post data (including images as base64) is stored in SQLite (`database.sqlite`). 