# Deployment Instructions for Render

## Backend Deployment (Python Flask)

1. Go to https://render.com and sign up
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Fill in:
   - **Name:** `find-my-space-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python app.py`

5. Add Environment Variables:
   - `RAZORPAY_KEY` = your_live_razorpay_key
   - `RAZORPAY_SECRET` = your_live_razorpay_secret
   - `SERVICE_ACCOUNT_PATH` = ./serviceAccountKey.json
   - `RAZORPAY_PAYOUTS_ENABLED` = 1 (optional)

6. Click **Create Web Service** and wait for deployment
7. **Copy the backend URL** (e.g., https://find-my-space-backend.onrender.com)

---

## Frontend Deployment (React Vite)

1. Update `.env.production` with your backend URL:
   ```
   VITE_BACKEND_URL=https://find-my-space-backend.onrender.com
   ```
   (Replace with your actual backend URL from step 7 above)

2. Push changes to GitHub:
   ```powershell
   git add .env.production
   git commit -m "Add production backend URL"
   git push origin main
   ```

3. Go to https://render.com
4. Click **New +** → **Static Site**
5. Connect your GitHub repository
6. Fill in:
   - **Name:** `find-my-space`
   - **Root Directory:** `find_my_space_parking`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

7. Click **Create Static Site** and wait for deployment
8. Get your frontend URL (e.g., https://find-my-space.onrender.com)

---

## Firebase Firestore Rules Deployment

1. From project root:
   ```powershell
   firebase login
   firebase deploy --only firestore:rules
   ```

---

## Testing After Deployment

1. Open your frontend URL in browser
2. Test:
   - ✓ User login/signup
   - ✓ Browse parking spots
   - ✓ Book a spot (cash)
   - ✓ Book a spot (online payment)
   - ✓ View bookings
   - ✓ Cancel booking
   - ✓ Delete cancelled booking
   - ✓ Vacate space

---

## Important Notes

- Backend and Frontend are separate services
- They communicate via the `VITE_BACKEND_URL` in `.env.production`
- No existing features were modified
- All changes are only for deployment configuration
