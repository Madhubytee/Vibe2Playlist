export const metadata = {
  title: 'Vibe2Playlist',
  description: 'Turn a video clip into a Spotify playlist!',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
