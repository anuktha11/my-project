const session = require('express-session')
const users = require('../models/userModel')
const product = require('../models/productModel')
const cart = require('../models/cartModel')
const address = require('../models/addressModel')
const coupon = require("../models/couponModel")



// Add user clicked product to his cart db, if new create a new cart db for user and store
 const addToCart = async (req, res) => {
    try {
        const productId = req.body.id;
        const productData = await product.findById({ _id: productId });

        const productStock = productData.stock
        if (productStock < 1) {
            return res.status(400).json({ success: false, message: 'Out of stock, keep it added in wishlist' });
        } else {

            if (req.session.user_id) {
                const userid = req.session.user_id;
                const userData = await users.findById({ _id: userid });
                const cartData = await cart.findOne({ userId: userid })

                if (cartData) {
                    const productExist = cartData.products.findIndex((product) => product.productId == productId)
                    if (productExist != -1) {
                        await cart.updateOne({ userId: userid, "products.productId": productId }, { $inc: { "products.$.count": 1 } });
                        res.json({ success: true });
                    } else {
                        await cart.findOneAndUpdate({ userId: req.session.user_id }, { $push: { products: { productId: productId, productPrice: productData.price } } })
                        res.json({ success: true });
                    }


                } else {
                    const Cart = new cart({
                        userId: userData._id,
                        userName: userData.name,
                        products: [{
                            productId: productId,
                            productPrice: productData.price
                        }]

                    });
                    const cartData = await Cart.save();
                    if (cartData) {
                        res.json({ success: true })
                    } else {
                        res.redirect('/home')
                    }
                }

            } else {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }

        }


    } catch (error) {
        console.log(error.message);
    }

}
 


// Load CART
 const getCart = async (req, res) => {
    try {
        const session = req.session.user_id;

        const userData = await users.findOne({ _id: session });
        const cartData = await cart.findOne({ userId: session }).populate("products.productId");

        if (cartData) {

            if (cartData.products.length > 0) {
                const products = cartData.products;

                let Total = 0;
                let outOfStockProducts = [];
                for (let i = 0; i < products.length; i++) {
                    const product = products[i].productId;
                    const productStock = product.stock;
                    const cartQuantity = products[i].count;
                    if (productStock >= cartQuantity) {
                        Total += products[i].productPrice * cartQuantity;
                    } else {
                        outOfStockProducts.push(product._id);
                    }
                }
                // console.log(Total);
                const userCartId = userData._id;

                res.render("cart", { userData, session, Total, userCartId, products, outOfStockProducts });
            }
            else {

                res.render("cartEmpty", { session, userData, message: "No product added" });
            }
        } else {

            res.render("cartEmpty", { session, userData, message: "No product added" });
        }
    } catch (error) {
        console.log(error.message);
    }
};


// To load  Checkout
const getCheckout = async function (req, res) {
    try {
        const availableCoupons = await coupon.find({});
        const session = req.session.user_id;
        const userData = await users.findById({ _id: session });
        let cartData = await cart.findOne({ userId: session }).populate("products.productId");
        const products = cartData.products;

        // Initialize discount amounts
        let orchidDiscount = 0;
        let indoorPlantsDiscount = 0;
        let couponDiscount = 0;

        // Check if the product is a violet orchid plant and apply discount
        for (let i = 0; i < products.length; i++) {
            const product = products[i].productId;

            if (product.name === 'Violet Orchid Plant') {
                // Assuming the discount is 50 rupees for each violet orchid plant
                orchidDiscount += 50 * products[i].count;
            }

            if (product.category === 'INDOOR PLANTS') {
                // Assuming the discount is 20% for each indoor plant
                indoorPlantsDiscount += (product.price * 0.2) * products[i].count;
            }
        }

        // Calculate the total amount after applying the orchid discount
        const totalAfterOrchidDiscount = await cart.aggregate([
            { $match: { userId: userData._id } },
            { $unwind: "$products" },
            { $project: { productPrice: "$products.productPrice", count: "$products.count" } },
            { $group: { _id: null, total: { $sum: { $multiply: ["$productPrice", "$count"] } } } }
        ]);

        const totalOrchidDiscount = totalAfterOrchidDiscount.length > 0 ? totalAfterOrchidDiscount[0].total - orchidDiscount : 0;

        // Calculate the total amount after applying the indoor plant discount
        const totalAfterIndoorPlantsDiscount = totalOrchidDiscount - indoorPlantsDiscount;

        // Calculate the total amount after applying the coupon discount
        const totalCouponDiscount = totalAfterIndoorPlantsDiscount; // Add your coupon logic here

        // Check if addressdata is defined before using it
        const addressdata = await address.findOne({ user: session });

        res.render('checkout', {
            session,
            userData,
            addressdata: addressdata || {}, // Provide a default value if addressdata is not defined
            products: cartData.products,
            Total: totalCouponDiscount,
            orchidDiscount,
            indoorPlantsDiscount,
            couponDiscount,
            availableCoupons
        });
    } catch (error) {
        console.log(error);
    }
};
 
 


// To load  add address Table
 const getAddAddress = async function (req, res) {
    try {
        const session = req.session.user_id
        const userData = await users.findById({ _id: session })
        res.render('add-address', { userData, session })
    } catch (error) {
        console.log(error);
    }
}
// const deleteAdderss = async (req, res) => {
//     try {
//         const id = req.query.id
//         await products.deleteOne({ _id: id })
//         res.redirect('/admin/products')
//     } catch (error) {
//         console.log(error)
//     }
// } 

// post  add address Table
 const postAddAddress = async function (req, res) {
    try {
        const user = req.session.user_id
        const userexist = await address.findOne({ user: user })
        if (userexist) {
            const user = req.session.user_id
            await address.updateOne({ user: user }, {
                $push: {
                    address: {
                        firstname: req.body.fname,
                        lastname: req.body.lname,
                        country: req.body.country,
                        state: req.body.state,
                        city: req.body.city,
                        address: req.body.address,
                        pin: req.body.pin,
                        phone: req.body.phone,
                        // email: req.body.email
                    }
                }
            })
        }
        else {
            const Address = new address({
                user: req.session.user_id,
                address: [{
                    firstname: req.body.fname,
                    lastname: req.body.lname,
                    country: req.body.country,
                    state: req.body.state,
                    city: req.body.city,
                    address: req.body.address,
                    pin: req.body.pin,
                    phone: req.body.phone,
                    // email: req.body.email

                }]
            })
            const addressdata2 = await Address.save()
        }
        res.redirect("/profile")
    } catch (error) {

        console.log(error);

    }
}
 


// Remove product from cart
 const removeProduct = async function (req, res) {
    try {
        const productid = req.query.id
        const session = req.session.user_id
        await cart.findOneAndUpdate({ userId: session }, { $pull: { products: { productId: productid } } })
        res.redirect('/cart')

    } catch (error) {
        console.log(error);
    }
}
 


// Remove product from cart (decreasing)
 const postremoveProduct = async function (req, res) {
    try {
        const productid = req.body.product
        const session = req.session.user_id
        await cart.findOneAndUpdate({ userId: session }, { $pull: { products: { productId: productid } } })
        res.json({ remove: true })

    } catch (error) {
        console.log(error);
    }
}
 


// cartQuantityIncrese
 const cartQuantityIncrese = async (req, res, next) => {
    try {

        let cartId = req.body.cart;
        const proId = req.body.product;
        let quantity = parseInt(req.body.quantity)
        let count = parseInt(req.body.count)


        const Product = await product.findById({ _id: proId });

        const productStock = Product.stock;

        if (count === 1 && (quantity + 1) > productStock) {

            return res.status(400).json({ success: false, message: 'Stock limit will be exceeded' });
        }

        if ((count == -1) && (quantity == 1)) {
            res.json({ remove: true })
        } else {
            await cart.updateOne({ userId: req.session.user_id, "products.productId": proId }, { $inc: { "products.$.count": count } });
        }
        next();
    } catch (error) {
        console.log(error.message);
    }
}






const totalproductprice = async (req, res, proId) => {
    try {




        const userd = await users.findOne({ _id: req.session.user_id })
        let total = await cart.aggregate([
            {
                $match: {
                    userId: userd._id,
                },
            },
            {
                $unwind: "$products",
            },
            {
                $project: {
                    price: "$products.productPrice",
                    quantity: "$products.count",
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $multiply: ["$price", "$quantity"] } },
                },
            },
        ]);
        let Total = total[0].total;
        res.json({ success: true, Total });
    } catch (error) {
        console.log(error.message);
    }
};
// --------------------------------------------------------------







module.exports = {
    
    addToCart,
    getCart,
    getCheckout,
    getAddAddress,
    postAddAddress,
    removeProduct,
    cartQuantityIncrese,
    totalproductprice,
    postremoveProduct
}