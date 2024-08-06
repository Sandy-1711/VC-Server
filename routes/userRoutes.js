const User = require('../models/User');
const bcrypt = require('bcryptjs');
const router = require('express').Router();
const jwt = require('jsonwebtoken');
// Signup
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        const hashedPassword = await bcrypt.hashSync(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        user.save();
        return res.json({ success: true, message: 'User created successfully' });
    }
    catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'User with name or email already exists' });
        }
        res.status(500).json({ success: false, error: err.message, message: 'Server error' });
    }
})

// Login
router.post('/login', async (req, res) => {
    const { email, name, password } = req.body;
    try {
        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required' });
        }
        let query = {};

        if (email) {
            query = { email };
        }
        if (name) {
            query = { name };
        }
        const user = await User.findOne(query);
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
        return res.json({ success: true, message: 'User logged in successfully', token });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message, message: 'Server error' });
    }
})

// get user

router.get('/user', async (req, res) => {
    const { token } = req.user;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(400).json({ success: false, message: 'Invalid token' });
        }
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }
        return res.json({ success: true, user });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message, message: 'Server error' });
    }
})

//  call a user
router.post('/call/:from/:to', async (req, res) => {
    const { from, to } = req.params;
    try {
        const fromUser = await User.findById(from);
        const toUser = await User.findById(to);
        if (!fromUser || !toUser) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }
        return res.json({ success: true, fromUser, toUser });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
})
module.exports = router;