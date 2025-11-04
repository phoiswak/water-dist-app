import dotenv from 'dotenv';
import app from './app';

dotenv.config();
// Set the port from the environment variable, or default to 4000
const PORT = process.env.PORT || 4000;
// Start the server and log a message once it is running
app.listen(PORT, () => {
  console.log(`🚀 Backend listening on port ${PORT}`);
});
