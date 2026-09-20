export default function handler(_request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');

  return response.status(404).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,follow" />
  <title>Page Not Found | Wahab Mobiles</title>
</head>
<body>
  <main>
    <h1>Page not found</h1>
    <p>The page you requested could not be found.</p>
    <p><a href="/">Return to Wahab Mobiles</a></p>
  </main>
</body>
</html>`);
}