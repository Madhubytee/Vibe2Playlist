import './globals.css';

export const metadata = {
  title: 'Vibe2Playlist',
  description: 'Turn a video clip into a Spotify playlist!',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Righteous&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
