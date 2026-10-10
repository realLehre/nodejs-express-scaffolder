import express from 'express';
    import cors from 'cors';
import 'dotenv/config';
import morgan from 'morgan';
    
    const app = express();
    
    app.use(express.json());
    app.use(cors());
app.use(morgan('dev'));
    
    app.get('/', (_req, res) => {
      res.json({
        message: 'Express server is running!'
      });
    });
    
    export default app;