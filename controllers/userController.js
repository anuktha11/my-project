const users = require('../models/userModel')
const User = require('../models/userModel')
const address = require('../models/addressModel')
const Address = require('../models/addressModel')
const products = require('../models/productModel')
const orders = require('../models/orderModel')
const category = require('../models/categoryModel')
const banners = require('../models/bannerModel')
const walletTransaction = require('../models/walletTransactionModel')

const shortid = require('shortid');

 const bcrypt = require('bcrypt')
 const argon2 = require('argon2');
const nodemailer = require('nodemailer');
const session = require('express-session');
const config = require('../config/config')
const CategoryModel = require('../models/categoryModel')

 
 

let dontenv = require('dotenv')
dontenv.config()

 
let registerTimeEmail;
let registerTimeName;
let otp;




// function to be called inorder tobcrypt password
 const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        console.log(error.message);
    }
}
 
 

// function to be called TO SEND MAIL - to verify user mail
 sendVerifyMail = async (name, email, otp) => {
    registerTimeEmail = email;
    registerTimeName = name;
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.myEmail,
                pass: process.env.myEmailPassword
            }
        })

        const mailOptions = {
            from: config.myEmail,
            to: email,
            subject: 'For mail verification',
            html: `Hi ${name}, OTP for verifying your email is ${otp}`
        }
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error)
            } else {
                console.log('Mail has been sent succesfully', info.response)
            }

        })
    } catch (error) {
        console.log(error.message);
    }
}
 


// To load /home  '/'
 const getHome = async function (req, res) {
    const session = req.session.user_id
    const userData = await users.findOne({ _id: session })
    const productData = await products.find({is_blocked: false}).limit(8)
    const bannerData = await banners.find({ status: 'true' })

     try {
        if (session) {
            res.render('home', { userData, session, productData ,bannerData });
        }
        else {
            res.render('home', { userData, session, productData,bannerData})
        }
    } catch (error) {
        console.log(error);
    }
}
 


// To load  /login
 const getLogin = async function (req, res) {
    try {
        res.render('login')
    } catch (error) {
        console.log(error);
    }
}
 


// POST LOGIN - To verify the login credentials and if yes redirect to home
 const postLogin = async (req, res) => {
    try {
        const emailEntered = req.body.email;
        const passwordEntered = req.body.password;
        const userDb = await users.findOne({ email: emailEntered });

        if (userDb) {
            if (userDb.is_verified === 1 && userDb.is_block === 0) {
                let passwordMatch = false;

                if (userDb.password.startsWith('$argon2')) {
                    // Password hashed using argon2
                    passwordMatch = await argon2.verify(userDb.password, passwordEntered);
                } else {
                    // Password hashed using bcrypt
                    passwordMatch = await bcrypt.compare(passwordEntered, userDb.password);
                }

                if (passwordMatch) {
                    const user_id = await userDb._id;
                    req.session.user_id = user_id;
                    res.redirect('/');
                } else {
                    res.render('login', { message: 'Incorrect password' });
                }
            } else {
                res.render('login', { message: 'Your account is either blocked or not verified' });
            }
        } else {
            res.render('login', { message: 'Incorrect email' });
        }
    } catch (error) {
        console.log(error);
    }
};



// To load /register
 const getRegister = async function (req, res) {
    try {
        res.render('register')
    } catch (error) {
        console.log(error);
    }
}
 


const postRegister = async (req, res) => {
    try {
        const emailExists = await users.findOne({ email: req.body.email });

        if (emailExists) {
            res.render('register', { message: 'Email ID already registered' });
        } else {
            if (req.body.password == req.body.confirmPassword) {
                const password = req.body.password.trim();
                const bcryptedPassword = await securePassword(password);

                // Generate a referral code for the new user
                const referralCode = shortid.generate();

                // Check if the referring user's code is provided
                const referrerCode = req.body.referralCode;

                // Find the referrer using the provided referral code
                const referrer = await users.findOne({ referralCode: referrerCode });

                // Create the new user
                const newUser = new User({
                    name: req.body.name,
                    email: req.body.email,
                    mobile: req.body.mobile,
                    password: bcryptedPassword,
                    is_admin: 0,
                    is_verified: 0,
                    is_block: 0,
                    referralCode: referralCode,
                    wallet: 0, // Initialize the wallet balance for the new user
                });

                // Award bonus if a valid referrer is found
                if (referrer) {
                    // Credit 100 rupees to the new user's wallet
                    newUser.wallet += 100;

                    // Save the wallet transaction for the new user
                    const newUserTransaction = new walletTransaction({
                        userId: newUser._id,
                        transactionType: 'credit',
                        amount: 100,
                        description:'Referral Bonus',
                    });
                    await newUserTransaction.save();

                    // Credit 3% of the bonus to the referrer's wallet
                    const referralBonus = Math.floor(0.03 * 100); // 3% of the bonus
                    referrer.wallet += referralBonus;

                    // Save the wallet transaction for the referrer
                    const referralTransaction = new walletTransaction({
                        userId: referrer._id,
                        transactionType: 'credit',
                        amount: referralBonus,
                        description: 'Referral Bonus',
                    });
                    await referralTransaction.save();

                    // Save the updated referrer's wallet transaction
                    await referrer.save();
                }

                // Save the new user
                const userDoc = await newUser.save();

                if (userDoc) {
                    var randomNumber = Math.floor(Math.random() * 9000) + 1000;
                    otp = randomNumber;
                    sendVerifyMail(req.body.name, req.body.email, otp);
                    res.redirect('/otp-page');
                } else {
                    res.render('register', { message: 'Registration Failed' });
                }
            } else {
                res.render('register', { message: 'Passwords do not match' });
            }
        }
    } catch (error) {
        console.log(error.message);
    }
};





// TO LOGOUT A USER
 const userLogout = async (req, res) => {
    try {
        req.session.destroy()
        res.redirect('/')
    } catch (error) {
        console.log(error.mesage);
    }
}
 



// TO get OTP ENTERING PAGE 
 const getOtpPage = async (req, res) => {
    try {
        res.render('otp-page')
    } catch (error) {
        console.log(error);
    }
}
 


// POST OTP PAGE ---------- Verifying user entered OTP and updating is_verified:1 
 const verifyOtp = async (req, res) => {
    try {
        let userotp = req.body.otp
        if (userotp == otp) {
            const updateInfo = await users.updateOne({ email: registerTimeEmail }, { $set: { is_verified: 1 } })
            // console.log(updateInfo);
            res.redirect('/login')
        }
        else {
            res.render('otp-page', { message: 'Entered otp is wrong' })
        }

    } catch (error) {
        console.log(console.error.mesage)
    }
}
 

//Get product Page
 const getProductPage = async (req, res) => {
    try {
        const session = req.session.user_id
        const userData = await users.findOne({ _id: session })
        const id = req.query.id
        const product = await products.findOne({ _id: id ,is_blocked: false })
        if (session) {
            res.render('product', { userData, session, product });
        }
        else {
            res.render('product', { userData, session, product })
        }
    } catch (error) {
        console.log(error);
    }
}
 

// SENDING OTP 2nd TIMe after timer out
 const resendOtp = async (req, res) => {
    try {
        randomNumber = Math.floor(Math.random() * 9000) + 1000;
        otp = randomNumber
        sendVerifyMail(registerTimeName, registerTimeEmail, otp)
        res.redirect('otp-page')

    } catch (error) {
        console.log(error);
    }

}
 

// get profile
 const getProfile = async (req, res) => {
    try {
        const id = req.session.user_id
        const userData = await users.findById({ _id: id })
        const addressData = await address.findOne({ user: id })

        res.render('profile', { userData, addressData,session:id })

    } catch (error) {
        console.log(error);
    }

}
const deleteAddress = async (req, res) => {
    try {
      const userId = req.session.user_id;
      const addressIndex = req.params.index; // Extract index from the URL parameter
      const addressData = await address.findOne({ user: userId });
  
      if (addressData && addressData.address.length > 0) {
        // Remove the address at the specified index
        addressData.address.splice(addressIndex, 1);
        await addressData.save();
  
        res.redirect('/profile');  
      } else {
        res.redirect('/profile'); 
      }
    } catch (error) {
      console.log(error);
      res.redirect('/profile');  
    }
  };
  
 
const editProfile = async (req, res) => {
    try {
        const id = req.session.user_id
        const userData = await users.findById({ _id: id })
   
      if (userData) {
        res.render('edit', { userData});
      } else {
        res.redirect('/profile');
      }
    } catch (error) {
      console.error(error.message);
    }
  };

  const updateProfile = async (req, res) => {
    try {
      const id = req.session.user_id;
      const { name, mobile} = req.body;
  
      // Update user data
      await users.findByIdAndUpdate(id, { name, mobile});

  
      // Redirect to the profile page after updating
      res.redirect('/profile');
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Internal Server Error');
    }
  };


// To view all ORDERS from Profile
 const getMyOrders = async (req, res) => {
    try {
        const userData = await users.findOne({ _id: req.session.user_id })

        const userid = req.session.user_id
        const orderData = await orders.find({ userId: userid })
        // console.log(orderData.product.productId.name);
        res.render('my-orders', { message: orderData,session:userid,userData})


    } catch (error) {
        console.log(error);
    }
}
 

// To view single order details
 const getSingleOrderView = async (req, res) => {
    try {
        const userData = await users.findOne({ _id: req.session.user_id })
        const id = req.query.id
        const session = req.session.user_id
        const orderData = await orders.findById(id).populate("product.productId")
       
        const product = orderData.product
       
        res.render('single-orderview', { product, orderData, session, userData })
    } catch (error) {
        console.log(error.message);
    }
}

 


// To view all ORDERS from Profile
 const getShopPage = async (req, res) => {
    try {
        const session = req?.session?.user_id;
        let userData;
        if (session) {
            userData = await users.findById({ _id: session });
        }

        var page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page); // Parse the page parameter to an integer
        }
        const limit = 9;

        let price = req?.query?.value;
        let Category = req?.query?.category || "All";
        let Search = req?.query?.search || "";
        Search = Search.trim();

        const categoryData = await category.find({ is_block: false }, { name: 1, _id: 0 });
        let cat = [];
        for (let i = 0; i < categoryData.length; i++) {
            cat[i] = categoryData[i].name;
        }

        let sort;
        Category === "All" ? (Category = [...cat]) : (Category = req.query.category.split(','));
        price === "High" ? (sort = -1) : (sort = 1);

        const productData = await products.aggregate([
            { $match: { name: { $regex: new RegExp(Search, 'i') }, category: { $in: Category }, is_blocked: false  } },
            { $sort: { price: sort } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ]).exec();
        

        // Calculate total count of products that match the aggregation criteria
        const totalCount = await products.countDocuments({ name: { $regex: new RegExp(Search, 'i') }, category: { $in: Category } });

        const totalPages = Math.ceil(totalCount / limit);

        const categories = await CategoryModel.find();
        const activeCategory = req.query.category || '';

        res.render('shop', {
            session,
            userData,
            categoryData,
            productData,
            price,
            Category,
            Search,
            totalPages,
            currentPage: page,
            categories,
            activeCategory
        });
    } catch (error) {
        console.log(error);
    }
};

 // Load wallet history page
 const loadwallet = async (req, res) => {
    try {
        // Fetch the user's wallet transactions
        const userId = req.session.user_id;
        const wallets = await walletTransaction.find({ userId: userId });
        const userData = await users.findOne({ _id: req.session.user_id })

        console.log(wallets);

        // Render the wallet page with user data and wallet transactions
        res.render('wallet', { user: req.session.user, wallets,session:userId,userData});
    } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        res.status(500).send('Internal Server Error');
    }
};

const getEditAddress = async (req, res) => {
    try {
      const userId = req.session.user_id;
      const addressIndex = req.params.index; // Extract index from the URL parameter
      const addressData = await address.findOne({ user: userId });
  
      if (addressData && addressData.address.length > 0) {
        const editedAddress = addressData.address[addressIndex];
        res.render('edit-address', { editedAddress, index: addressIndex }); // Pass index to the template
      } else {
        res.redirect('/profile'); // Redirect to the profile page if no addresses are found
      }
    } catch (error) {
      console.log(error);
      res.redirect('/profile'); // Redirect to the profile page in case of an error
    }
  };
  
  const postEditAddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const addressIndex = req.params.index;
        const { state, city, address, pin, country } = req.body;

        // Log the user ID to verify it is correct
        console.log('UserID:', userId);

        // Find the user's address data using the model directly
        const userAddress = await Address.findOne({ user: userId }).lean();

        // Log the userAddress to see if it is fetched correctly
        console.log('User Address:', userAddress);

        if (userAddress && userAddress.address.length > 0) {
            // Update the specific address at the given index
            userAddress.address[addressIndex].state = state;
            userAddress.address[addressIndex].city = city;
            userAddress.address[addressIndex].address = address;
            userAddress.address[addressIndex].pin = pin;
            userAddress.address[addressIndex].country = country;

            // Save the updated user address data using the model directly
            await Address.findOneAndUpdate({ user: userId }, { address: userAddress.address });

            res.redirect('/profile');
        } else {
            res.redirect('/profile');
        }
    } catch (error) {
        console.error(error.message);
        res.redirect('/profile');
    }
};




//change pasword
const loadChangePassword = async (req, res) => {
    try {

        res.render('changepassword');
    } catch (error) {
        console.log(error.message);
    }
}

 const changePassword = async (req, res) => {
    const userId = req.session.user_id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    try {
        const user = await users.findById(userId);

        const passwordMatch = await argon2.verify(user.password, currentPassword);

        if (passwordMatch) {
            if (newPassword === confirmPassword) {
                // Hash the new password
                const hashedPassword = await argon2.hash(newPassword);

                // Update the user's password in the database
                await users.findByIdAndUpdate(userId, { $set: { password: hashedPassword } });

                res.redirect('/profile');  
            } else {
                res.render('changepassword', { message: 'New passwords do not match' });
            }
        } else {
            res.render('changepassword', { message: 'Incorrect current password' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}




module.exports = {
    getHome,
    getLogin,
    postLogin,

    getRegister,
    postRegister,

    getOtpPage,
    verifyOtp,
    resendOtp,

    userLogout,
    getProductPage,
    getShopPage,

    getProfile,
    editProfile,
    updateProfile,

    getMyOrders,
    getSingleOrderView,
    loadwallet,
    loadChangePassword,
    changePassword,
    deleteAddress,
    getEditAddress,
    postEditAddress
}









