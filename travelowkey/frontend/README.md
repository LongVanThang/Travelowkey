# TravelowKey Frontend

A modern, responsive travel booking application built with Next.js, TypeScript, and TailwindCSS.

## Features

- **Responsive Design**: Mobile-first design that works on all devices
- **JWT Authentication**: Secure user authentication with token-based sessions
- **Real-time Search**: Fast and responsive search functionality
- **Booking Flow**: Complete booking process for flights, hotels, and car rentals
- **Payment Integration**: Secure payment processing
- **Admin Dashboard**: Comprehensive admin interface
- **SEO Optimization**: Built-in SEO features for better search engine visibility

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: Headless UI, Heroicons
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast
- **Date Handling**: Date-fns
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (for containerized deployment)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd travelowkey/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
```bash
cp .env.example .env.local
```

4. Update the environment variables:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NODE_ENV=development
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Authentication pages
│   │   ├── flights/           # Flight booking pages
│   │   ├── hotels/            # Hotel booking pages
│   │   ├── cars/              # Car rental pages
│   │   ├── bookings/          # User bookings pages
│   │   └── admin/             # Admin dashboard pages
│   ├── components/            # Reusable UI components
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # Utility functions
│   ├── types/                 # TypeScript type definitions
│   └── styles/                # Global styles
├── public/                    # Static assets
├── k8s/                      # Kubernetes manifests
├── Dockerfile                 # Docker configuration
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Key Components

### Authentication
- JWT-based authentication
- Protected routes
- User session management
- Social login integration (Google, GitHub)

### Search & Booking
- Real-time flight search
- Hotel availability checking
- Car rental booking
- Advanced filtering and sorting

### User Dashboard
- Booking history
- Profile management
- Preferences settings
- Payment methods

### Admin Features
- User management
- Booking analytics
- Content management
- System monitoring

## API Integration

The frontend communicates with the backend services through a centralized API client:

```typescript
// Example API usage
import { flightApi, hotelApi, bookingApi } from '@/utils/api';

// Search flights
const flights = await flightApi.search({
  from: 'NYC',
  to: 'LAX',
  date: '2024-01-15',
  passengers: 2
});

// Create booking
const booking = await bookingApi.create({
  type: 'flight',
  items: [flightData],
  totalAmount: 599
});
```

## Styling

The application uses TailwindCSS for styling with a custom design system:

- **Colors**: Blue primary theme with gray accents
- **Typography**: Inter font family
- **Spacing**: Consistent spacing scale
- **Components**: Reusable component library

## State Management

- **Authentication**: React Context with localStorage persistence
- **Form State**: React Hook Form with Zod validation
- **UI State**: Local component state with React hooks
- **API State**: Custom hooks for data fetching

## Performance Optimization

- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js Image component with WebP/AVIF support
- **Bundle Analysis**: Built-in bundle analyzer
- **Caching**: Static generation and ISR for better performance
- **Lazy Loading**: Component and image lazy loading

## Security Features

- **CSP Headers**: Content Security Policy implementation
- **XSS Protection**: Built-in XSS protection
- **CSRF Protection**: Cross-Site Request Forgery protection
- **Input Validation**: Client and server-side validation
- **Secure Headers**: Security headers configuration

## Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Deployment

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t travelowkey/frontend:latest .
```

2. Run the container:
```bash
docker run -p 3000:3000 travelowkey/frontend:latest
```

### Kubernetes Deployment

1. Apply the Kubernetes manifests:
```bash
kubectl apply -f k8s/
```

2. Check deployment status:
```bash
kubectl get pods -l app=travelowkey-frontend
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8080` |
| `NODE_ENV` | Environment mode | `development` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## Roadmap

- [ ] PWA support
- [ ] Offline functionality
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] Voice search
- [ ] AI-powered recommendations
