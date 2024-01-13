const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
// mongoose.connect('mongodb://127.0.0.1:27017/folder');
mongoose.connect(process.env.MONGODB_URL)

const express = require('express');
const app = express();
 

app.set('view engine', 'ejs'); // Set the view engine to EJS

app.use(express.static('public/users'));
app.use(express.static('public/admin'));

const userRoute = require('./routes/userRoute');
app.use('/', userRoute);

const adminRoute = require('./routes/adminRoute');
app.use('/admin', adminRoute);

// 404 Middleware: Handle undefined routes
app.use((req, res, next) => {
    res.status(404).render('404'); // Render the 404.ejs page
});

app.listen(3000, () => console.log("Server started running http://localhost:3000"));

