import app from './app.js';

// create a .env file and add your environment variables
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
    
