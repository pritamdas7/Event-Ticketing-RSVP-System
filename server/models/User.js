const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long']
    },
    email: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['attendee', 'organizer'],
        default: 'attendee'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Automatically encrypt the password before saving a new user
userSchema.pre('save', async function () {
    const user = this;
    // Only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return;

    try {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
    } catch (error) {
        throw error; // Throwing errors inside async pre-hooks rejects the save operation safely
    }
});

// Securely evaluate submitted password attempts during login
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);