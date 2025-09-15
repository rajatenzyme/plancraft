import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import authRouter from './src/routes/auth.js';
import todosRouter from './src/routes/todos.js';

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/plancraft';
console.log('MongoDB URI', mongoUri);
mongoose
	.connect(mongoUri)
	.then(() => console.log('MongoDB connected', mongoUri))
	.catch((err) => {
		console.error('MongoDB connection error', err);
		process.exit(1);
	});

app.use('/api/auth', authRouter);
app.use('/api/todos', todosRouter);

app.use(express.static(__dirname));
app.get(['/', '/index.html'], (_req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((req, res) => {
	res.status(404).json({ message: 'Not Found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
	console.error(err);
	res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});
