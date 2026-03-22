# URL Shortener Frontend

Modern, fast, and beautiful frontend for URL shortener built with Next.js 15, TypeScript, and Tailwind CSS.

## 🎨 Theme Colors

- **Primary Blue**: `#3b82f6` (blue-600)
- **White**: `#ffffff`
- **Gray Shades**: `#f9fafb` to `#111827`

## 🚀 Features

- ✅ URL Shortening with custom aliases
- ✅ Password protection & expiry dates
- ✅ Real-time analytics with charts
- ✅ QR code generation & download
- ✅ User authentication (JWT)
- ✅ Dashboard with URL management
- ✅ Responsive design (mobile-first)
- ✅ Fast & optimized (Next.js 15)

## 📦 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **QR Codes**: qrcode.react
- **HTTP Client**: Axios
- **Notifications**: react-hot-toast
- **Icons**: Lucide React

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local

# Run development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## 📁 Project Structure

```
url-shortener-frontend/
├── app/
│   ├── layout.tsx           # Root layout with auth provider
│   ├── page.tsx             # Home page with URL shortener
│   ├── login/page.tsx       # Login page
│   ├── register/page.tsx    # Register page
│   ├── dashboard/page.tsx   # Dashboard with URL list
│   └── analytics/[code]/page.tsx  # Analytics page
├── components/
│   ├── Navbar.tsx           # Navigation bar
│   └── URLShortener.tsx     # URL shortener form
├── lib/
│   ├── api.ts               # API client & endpoints
│   └── auth-context.tsx     # Auth context provider
└── .env.local               # Environment variables
```

## 🔗 API Integration

Backend API URL is configured in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

All API calls are handled through `lib/api.ts` with automatic JWT token attachment.

## 🎯 Pages

### Home (`/`)
- Hero section with features
- URL shortener form
- Advanced options (alias, password, expiry)
- QR code display

### Dashboard (`/dashboard`)
- List of all shortened URLs
- Click count & status
- Quick actions (copy, toggle, delete, analytics)
- Pagination

### Analytics (`/analytics/[code]`)
- Total clicks & unique visitors
- Clicks over time (line chart)
- Device breakdown (pie chart)
- Top countries (bar chart)

### Auth Pages
- `/login` - User login
- `/register` - User registration

## 🎨 UI Components

All components follow the white-gray-blue theme:
- **Primary**: Blue (`#3b82f6`)
- **Background**: White & light gray
- **Text**: Dark gray (`#111827`)
- **Borders**: Light gray (`#e5e7eb`)

## 🚀 Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3000` |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License
