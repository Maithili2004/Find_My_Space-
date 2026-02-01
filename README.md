# 🅿️ Find My Space - Parking Management System

A comprehensive parking management platform built with React and Vite that connects parking providers with users looking for convenient parking solutions.

## 🚀 Live Demo

**[View Live Application →](https://find-my-space.onrender.com)**

🌐 **URL:** https://find-my-space.onrender.com

---

## ✨ Features

### 👥 For Users
- **🔍 Browse Available Spots** - View all parking locations with real-time availability
- **📅 Easy Booking** - Book parking spots with flexible time selection (AM/PM)
- **💳 Multiple Payment Options** - Regular and advance payment support
- **📱 Booking Management** - View, track, and cancel your reservations
- **🎉 Event Parking** - Special parking for events and occasions
- **⏰ Real-time Updates** - Live availability and booking status

### 🏪 For Providers
- **➕ Add Parking Spots** - List your parking spaces with custom pricing
- **📊 Analytics Dashboard** - Track earnings, bookings, and performance
- **🔔 Booking Notifications** - Receive and manage booking requests
- **✅ Request Management** - Accept or reject booking requests
- **💰 Profit Tracking** - Monitor your revenue and business growth
- **🎯 Flexible Pricing** - Set custom hourly rates for your spots

### 🔐 Authentication System
- **👤 User Registration & Login** - Secure account management
- **🏢 Provider Registration** - Special accounts for parking providers
- **🔒 Role-based Access** - Different interfaces for users and providers

## 🚀 Tech Stack

- **Frontend:** React 18 + Vite
- **Styling:** Custom CSS-in-JS with modern gradients
- **Routing:** React Router DOM
- **State Management:** React Hooks + Local Storage
- **Icons & Emojis:** Unicode emojis for modern UI
- **Build Tool:** Vite for fast development and builds

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/find-my-space.git
   cd find-my-space
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

## 🎨 Project Structure

```
find-my-space/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ParkingCard.jsx   # Individual parking spot display
│   │   ├── EventList.jsx     # List of parking spots
│   │   ├── Navbar.jsx        # Main navigation
│   │   └── ProviderNavbar.jsx # Provider dashboard navigation
│   ├── pages/               # Main application pages
│   │   ├── Dashboard.jsx     # User dashboard
│   │   ├── Login.jsx         # Authentication page
│   │   ├── Register.jsx      # User registration
│   │   ├── BookParking.jsx   # Booking management
│   │   └── ProviderDashboard.jsx # Provider interface
│   ├── Data/                # Data management
│   │   └── SeedData.jsx     # Local storage utilities
│   ├── App.jsx              # Main app component
│   └── main.jsx             # Application entry point
├── public/                  # Static assets
├── package.json            # Dependencies and scripts
└── README.md              # Project documentation
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint checks

## 📱 Key Components

### ParkingCard Component
- Displays individual parking spots with pricing and availability
- Integrated booking form with time selection
- Real-time cost calculation
- Provider vs public spot differentiation

### Provider Dashboard
- Comprehensive business management interface
- Add/manage parking spots with custom slot counts
- View booking requests and notifications
- Analytics and profit tracking

### Booking System
- Smart availability management
- Time-based pricing calculation
- Status tracking (pending, confirmed, cancelled)
- Provider approval workflow

## 💾 Data Management

The application uses browser localStorage for data persistence:
- User authentication and profiles
- Parking spot listings and availability
- Booking records and history
- Provider notifications and analytics
- Real-time data synchronization across components

## 🎯 User Flows

### Booking a Parking Spot
1. Browse available parking spots on dashboard
2. Click "Book Now" on desired spot
3. Fill booking form with personal details
4. Select date and time (AM/PM format)
5. Review cost and confirm booking
6. Receive confirmation (immediate for public spots, pending for provider spots)

### Provider Workflow
1. Register as parking provider
2. Add parking spots with location, pricing, and slot count
3. Receive booking notifications from users
4. Accept or reject booking requests
5. Track earnings and manage business

## 🔮 Future Enhancements

- **🗺️ Map Integration** - OpenStreetMap for location visualization
- **📍 GPS Navigation** - Directions to parking spots
- **💳 Payment Gateway** - Online payment processing
- **📧 Email Notifications** - Automated booking confirmations
- **⭐ Rating System** - User reviews for parking spots
- **🌙 Dark Mode** - Theme customization
- **📊 Advanced Analytics** - Detailed business insights

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React and Vite teams for excellent development tools
- Unicode Consortium for emoji support
- Open source community for inspiration and resources

---

**Made with ❤️ by Maithili**

For support or questions, please open an issue on GitHub.