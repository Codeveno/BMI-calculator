// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the MySQL database:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL Database!');
});

const app = express();
app.use(cors());
app.use(express.json());

// User model methods
const User = {
    create: (username, password, callback) => {
        const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.query(query, [username, password], (err, results) => {
            callback(err, results);
        });
    },

    findByUsername: (username, callback) => {
        const query = 'SELECT * FROM users WHERE username = ?';
        db.query(query, [username], (err, results) => {
            callback(err, results[0]);
        });
    },
};

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        User.findByUsername(username, (err, existingUser) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }

            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) return res.status(500).json({ message: 'Server error' });
                User.create(username, hashedPassword, (err) => {
                    if (err) return res.status(500).json({ message: 'Server error' });
                    res.status(201).json({ message: 'User registered successfully' });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    User.findByUsername(username, (err, user) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
                expiresIn: '1h',
            });

            res.json({ token });
        });
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
