const hostname = process.env.HOSTNAME;
const port = process.env.PORT;

if (!hostname || !port) {
  process.exit(1);
}

try {
  const response = await fetch(`http://${hostname}:${port}/api/health`);

  if (!response.ok) {
    process.exit(1);
  }
} catch {
  process.exit(1);
}
