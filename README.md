# FarmConnect

FarmConnect is a modern agricultural marketplace built to help farmers list fresh produce directly for buyers, while giving businesses a quick, transparent way to discover, compare, and contact sellers through WhatsApp.

The platform is designed for local farm-to-business trade, especially in regions where farmers need a simple way to reach bulk buyers without an intermediary. It combines a marketplace experience, farmer authentication, and review/rating functionality in a lightweight, static web app powered by Firebase.

## Project Overview

FarmConnect enables:

- Farmers to list produce with price, quantity, location, and contact details
- Buyers to browse available harvests by category and location
- Search and sorting to quickly find relevant products
- Direct WhatsApp communication with sellers
- Farmer reviews and customer rating summaries
- Authentication via phone or email
- A clean, mobile-friendly interface with light/dark mode support

## Why This Project Exists

Smallholder farmers often struggle to access buyers directly and are forced to rely on informal channels that can be slow, inconsistent, and difficult to scale. FarmConnect brings together demand and supply in a marketplace that is simple enough for farmers to use and helpful enough for buyers to trust the quality and reliability of sellers.

## Key Features

### Buyer Experience
- Browse the latest produce listings from across local farming communities
- Filter by category: Vegetables, Fruits, Grains, and Tubers
- Search by product name, quantity, or location
- Sort by newest listings or cheapest to most expensive
- View each farmer’s rating and recent reviews
- Open a WhatsApp message to contact a seller immediately

### Farmer Experience
- Secure sign-in through phone number or email
- Upload produce details with title, category, quantity, location, and price
- Add a product image URL or use a default farm image
- List harvests straight from the browser
- Build a reputation through customer reviews and ratings

### Trust and Engagement
- Rating system with star reviews
- Buyer review moderation through a review modal
- User profile support with profile names and contact information
- Live chat support integration via Tawk.to
- Theme toggle for dark mode

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Authentication: Firebase Authentication
- Database: Firebase Firestore
- Hosting: Static web hosting compatible (GitHub Pages, Netlify, Firebase Hosting, etc.)
- Messaging: WhatsApp deep links for contact actions

## Project Structure

```text
farmconnect11/
├── auth.html            # Sign-in / sign-up page for email and phone auth
├── auth.js              # Authentication logic and profile setup
├── common.js            # Shared Firebase config and auth navigation logic
├── farmer.html          # Farmer portal to list new produce
├── farmer.js            # Generate produce listings and listing submission logic
├── index.html           # Marketplace homepage with search and product grid
├── script.js            # Marketplace rendering, sorting, filtering, and review logic
├── style.css            # Design system, layout, components, theming
├── README.md            # Project documentation
└── .git/                # Git metadata
```

## Firebase Setup

This project uses Firebase for authentication and Firestore data storage.

### 1. Create a Firebase Project
- Go to the Firebase Console
- Create a new project
- Enable the following services:
  - Authentication
  - Firestore Database

### 2. Enable Sign-in Methods
In Firebase Authentication, enable:
- Email/Password
- Phone Number

### 3. Update Firebase Configuration
The project includes a Firebase config object in:
- `common.js`
- `auth.js`
- `farmer.js`

Replace the existing configuration with your own Firebase project settings:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Firestore Structure
The app expects the following collections:

#### `users`
```json
{
  "name": "Ada Farmer",
  "phone": "+2348012345678",
  "email": "ada@example.com",
  "createdAt": "server timestamp"
}
```

#### `produce`
```json
{
  "title": "Fresh Red Onions",
  "category": "Vegetables",
  "price": "50000",
  "quantity": "50kg Bag",
  "farmer": "Ada Farmer",
  "location": "Epe",
  "phone": "2348012345678",
  "image": "https://farmconnect11.netlify.app/assets/farm.jpg",
  "farmerUid": "USER_UID",
  "createdAt": "server timestamp"
}
```

#### `reviews`
```json
{
  "farmerId": "2348012345678",
  "farmerName": "Ada Farmer",
  "rating": 5,
  "buyerName": "Buyer One",
  "buyerUid": "USER_UID",
  "comment": "Great quality produce.",
  "createdAt": "server timestamp"
}
```

## Local Development

### Option 1: Simple Static Server
From the project root:

```bash
python3 -m http.server 8000
```

Then open:

```text
https://farmconnect11.netlify.app
```

### Option 2: VS Code Live Server
If you use VS Code with a live preview extension, you can open the project in a browser directly from the editor.

## Running the App

### Home Marketplace
Open `index.html` or visit the root page of your local server to see the marketplace dashboard.

### Farmer Listing Form
Navigate to:

```text
https://farmconnect11.netlify.app/farmer.html
```

This page lets farmers add produce listings.

### Authentication Pages
Navigate to:

```text
https://farmconnect11.netlify.app/auth.html
```

This page supports both email and phone-based login flows.

## Deployment

This project works as a static frontend and can be deployed on any static hosting service.

### Recommended options
- Firebase Hosting
- Netlify
- GitHub Pages
- Vercel (static site support)

When deploying, make sure your Firebase config is updated to match the target project and that your hosting setup serves the static files correctly.

## Security Notes

- Public web configuration is safe for Firebase client apps
- Keep your production Firebase credentials and project rules properly configured
- For production use, review Firestore security rules to restrict unauthorized write access

## Potential Improvements

This project already includes a strong foundation, and future enhancements could include:

- Admin dashboard for moderation
- Search by state or city
- Advanced filtering by price and harvest season
- SMS or email alerts for new listings
- Farmer verification badges
- Bulk ordering and checkout flows
- Analytics for buyer demand and farmer performance

## License

This project is currently distributed without a formal license. If you plan to reuse or distribute it publicly, add an appropriate open-source license such as MIT.

## Contributing

Contributions are welcome. You can:

1. Fork the repository
2. Create a feature branch
3. Make changes and test locally
4. Submit a pull request with a clear description

## Summary

FarmConnect is a practical digital marketplace that connects farmers and buyers in a way that is simple, reliable, and based on trust. It turns basic web technologies and Firebase into a valuable agricultural commerce tool that can be scaled for real-world farm supply networks.

If you want to turn this prototype into a production-ready platform, the next critical steps would be robust authentication rules, stronger moderation, and a more complete order management workflow.
