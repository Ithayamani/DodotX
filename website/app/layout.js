import './globals.css';

export const metadata = {
  title: 'DodotX — Make Everyday Things a Game',
  description: 'DodotX is a family task management app with gamification. Turn daily chores into fun adventures for kids with points, trophies, and rewards.',
  keywords: 'family tasks, kids chores, gamification, parenting app, rewards, trophies',
  openGraph: {
    title: 'DodotX — Make Everyday Things a Game',
    description: 'Turn daily chores into fun adventures for kids.',
    url: 'https://dodotx.net',
    siteName: 'DodotX',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/images/icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
