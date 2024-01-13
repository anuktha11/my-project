const express = require('express')
const user_route = express()
const config = require('../config/config')


const userController = require('../controllers/userController')
const cartController = require('../controllers/cartController')
const orderController = require('../controllers/orderController')
const wishlistController = require('../controllers/wishlistController')
const couponController = require('../controllers/couponController')
const forgotController = require('../controllers/forgotController')

const session = require('express-session')
const auth = require('../middlewares/auth')

user_route.set('view engine','ejs')
user_route.set('views','./views/users')

user_route.use(session({
    secret:config.sessionSecret,
    saveUninitialized:true,
    resave:false,
    Cookie:{maxAge : 600000},
}))

user_route.use(express.json())
user_route.use(express.urlencoded({extended:true}))


  
// USER CONTROLLER
user_route.get('/',userController.getHome)

user_route.get('/login',auth.isLogout,userController.getLogin)
user_route.post('/login',userController.postLogin)

user_route.get('/register',auth.isLogout,userController.getRegister)
user_route.post('/register',userController.postRegister)



// OTP VERIFICATION
user_route.get('/otp-page',userController.getOtpPage)
user_route.post('/otp-page',userController.verifyOtp)
user_route.get('/resend-otp',userController.resendOtp)


// FORGOT PASSWORD
user_route.get('/forgotpassword', auth.isLogout, forgotController.loadforgotpassword)
user_route.post('/forgotpassword', forgotController.verifymail)
user_route.get('/forgotpassword/otp', forgotController.loadforgototp)
user_route.post('/forgotpassword/otp', forgotController.verifyforgototp)
user_route.get('/restpassword', forgotController.loadresetpassword)
user_route.post('/restpassword', forgotController.resetpassword)

//change pasword
user_route.get('/changepassword', userController.loadChangePassword);
user_route.post('/changepassword', userController.changePassword);

//Logout
user_route.get('/user-logout',userController.userLogout)


//Shop page
user_route.get('/shop', userController.getShopPage)


 //Product Detail page
user_route.get('/product',userController.getProductPage)


//Profile
user_route.get('/profile',userController.getProfile)
user_route.get('/edit', auth.isLogin, userController.editProfile);
user_route.post('/edit',userController.updateProfile)
user_route.post('/delete-address/:index', userController.deleteAddress);

user_route.get('/edit-address/:index', userController.getEditAddress);
user_route.post('/edit-address/:index', userController.postEditAddress);

// cart Controller
user_route.get('/cart',auth.isLogin,cartController.getCart)
user_route.post('/addToCart',cartController.addToCart)
user_route.get('/add-address',auth.isLogin,cartController.getAddAddress)
user_route.post('/add-address',cartController.postAddAddress)
user_route.get('/removeproduct',auth.isLogin,cartController.removeProduct)

//   ajx in cart to increase count
user_route.delete('/removeproduct',auth.isLogin,cartController.postremoveProduct)
user_route.patch('/cartqntyincrese',auth.isLogin,cartController.cartQuantityIncrese,cartController.totalproductprice)

user_route.get('/checkout',auth.isLogin,cartController.getCheckout)

// order Controller
user_route.post('/checkout',orderController.placeOrder)

user_route.get('/myorders',userController.getMyOrders)
user_route.get('/singleorderview',userController.getSingleOrderView)

user_route.get('/editorder',orderController.editOrder)
user_route.get('/order-place',orderController.orderplaced)


user_route.post('/verifyPayment',orderController.verifyOnlinePayment)
user_route.get('/order-place',orderController.orderplaced)



// wishlist Controller
user_route.get('/wishlist',auth.isLogin,wishlistController.getWishlist)
user_route.post('/addtowhishlist',auth.isLogin,wishlistController.addtowhishlist)
user_route.get('/wishlistitemdelete',auth.isLogin,wishlistController.removeProduct)
user_route.post('/whishToCart',auth.isLogin,wishlistController.addToCartFromWishlist)



// coupon Controller
user_route.post('/applyCoupon',couponController.applyCoupon)


// wallet Controller
user_route.get('/wallet',userController.loadwallet)




module.exports = user_route
