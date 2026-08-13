# SchrammScape Lawncare Website

A modern, responsive website built with Next.js and Tailwind CSS showcasing lawn care services with a photo gallery and client inquiry form.

## Features

- 📸 **Photo Carousel** - Display before/after transformations and service photos with category labels
- 📋 **Tabbed Menu** - Contact information, company history, and inquiry form
- 📱 **Responsive Design** - Desktop (side-by-side layout) and mobile (stacked layout) optimized
- 🎯 **Floating CTA** - Always-visible button to request information
- ✨ **Modern UI** - Built with Tailwind CSS with earth-tone color scheme

## Tech Stack

- [Next.js 14](https://nextjs.org/)
- [React 18](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Netlify](https://netlify.com/) for hosting

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
schrammscape.com/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page component
│   └── globals.css         # Global styles
├── components/
│   ├── PhotoCarousel.tsx   # Photo carousel with before/after slider
│   ├── TabMenu.tsx         # Tabbed menu component
│   └── FloatingCTA.tsx     # Floating CTA button
├── public/                 # Static assets
└── package.json
```

## Customization

### Update Contact Information

Edit `app/page.tsx` and update the `CONTACT_INFO` object:

```typescript
const CONTACT_INFO = {
  phone: '(555) 123-4567',
  email: 'contact@schrammscape.com',
  location: 'Serving the local community',
  socials: [
    { name: 'Facebook', url: 'https://facebook.com' },
    { name: 'Instagram', url: 'https://instagram.com' },
  ],
}
```

### Update Company History

Edit the `HISTORY_CONTENT` string in `app/page.tsx`

### Add Photos

Add photos to the `PLACEHOLDER_PHOTOS` array in `app/page.tsx`:

```typescript
{
  id: 'unique-id',
  src: '/path/to/image.jpg',
  alt: 'Description',
  category: 'Category Name',
  isBeforeAfter: true, // Optional
  afterSrc: '/path/to/after-image.jpg', // Only if isBeforeAfter is true
}
```

### Upload Logo

Replace the placeholder logo in the header by updating the Image component in `app/page.tsx`

## Deployment

This site is configured to deploy to Netlify:

1. Push to GitHub
2. Connect repository to Netlify
3. Configure build command: `npm run build`
4. Configure publish directory: `.next`

## Building

```bash
npm run build
npm start
```

## License

Copyright © 2024 SchrammScape Lawncare
