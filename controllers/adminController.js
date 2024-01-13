const users = require('../models/userModel')
const category = require('../models/categoryModel')
const order = require('../models/orderModel')
const productModel = require('../models/productModel')
const walletTransactionCollection = require('../models/walletTransactionModel');
const json2csv = require('json2csv');
const fs = require('fs');

const session = require('express-session')
const bcrypt = require('bcrypt')
 

async function recordWalletTransaction(userId, transactionType, amount, description) {
    try {
      const transaction = new walletTransactionCollection({
        userId,
        transactionType,
        amount,
        description,
      });
  
      await transaction.save();
      console.log('Wallet transaction recorded successfully.');
    } catch (error) {
      console.error('Error recording wallet transaction:', error);
    }
  }




// GET ADMIN PANEL - get /admin
 const getAdminPanel = async (req, res) => {
    try {
        const total = await order.aggregate([
            {
                $match: {
                    status: { $nin: ["cancelled", "returned"] }  
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$paid" }
                }
            }
        ]);

  // Use Promise.all  

        const [user_count, order_count, product_count] = await Promise.all([
            users.find({ is_admin: 0 }).count(),
            order.find({}).count(),
            productModel.find({}).count()
        ]);

        const payment = await order.aggregate([{ $group: { _id: "$paymentMethod", totalPayment: { $count: {} } } }]);

        let sales = [];
        var date = new Date();
        var year = date.getFullYear();
        var currentyear = new Date(year, 0, 1);
        let salesByYear = await order.aggregate([
            {
                $match: {
                    createdAt: { $gte: currentyear },
                    status: { $nin: ["cancelled", "returned"] }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%m", date: "$createdAt" } },
                    total: { $sum: "$paid" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        for (let i = 1; i <= 12; i++) {
            let result = true;
            for (let k = 0; k < salesByYear.length; k++) {
                result = false;
                if (salesByYear[k]._id == i) {
                    sales.push(salesByYear[k])
                    break;
                } else {
                    result = true
                }
            }
            if (result) sales.push({ _id: i, total: 0 });
        }
        let salesData = [];
        for (let i = 0; i < sales.length; i++) {
            salesData.push(sales[i].total);
        }
        // console.log(salesData);

        res.render('admin-panel', { total, user_count, order_count, product_count, payment, month: salesData })
    } catch (error) {
        console.log(error)
    }
}

// GET LOGIN  - get /admin/login
 const getLogin = async (req, res) => {
    try {

        res.render('login')
    } catch (error) {
        console.log(error)
    }
}
 



// POST LOGIN    - To verify Admin credentials
 const postLogin = async (req, res) => {
    try {
        const emailEntered = req.body.email
        const passwordEntered = req.body.password
        const adminDb = await users.findOne({ email: emailEntered })

        if (adminDb) {
            const matchPassword = await bcrypt.compare(passwordEntered, adminDb.password)
            if (matchPassword) {
                if (adminDb.is_admin === 0) {
                    res.render('login', { message: 'You are not ADMIN' })
                }
                else {
                    req.session.admin_id = adminDb._id
                    res.redirect('/admin')
                }
            }
            else {
                res.render('login', { message: 'Entered password is wrong' })
            }
        }
        else {
            res.render('login', { message: 'Entered email ID is wrong' })
        }
    } catch (error) {
        console.log(error.message);
    }
}
 


// GET LOGOUT - session destroy
 const getLogout = async (req, res) => {
    try {
        req.session.destroy()
        res.redirect('/admin/login')
    } catch (error) {
        console.log(error)
    }
}
 



// GET USER MANAGEMENT - /admin/users
 const getUserManagement = async (req, res) => {
    try {
        const userDatas = await users.find({ $and: [{ is_verified: 1 }, { is_admin: 0 }] })
        res.render('users', { message: userDatas })
    } catch (error) {
        console.log(error)
    }
}
 



// TO BLOCK USER - /admin/users/block
 const blockUser = async (req, res) => {
    try {
        const id = req.query.id
        await users.updateOne({ _id: id }, { $set: { is_block: 1 } })
        res.redirect('/admin/users')
    } catch (error) {
        console.log(error)
    }
}
 



// TO un BLOCK USER - /admin/users/block
 const unBlockUser = async (req, res) => {
    try {
        const id = req.query.id
        await users.updateOne({ _id: id }, { $set: { is_block: 0 } })
        res.redirect('/admin/users')
    } catch (error) {
        console.log(error)
    }
}
 


// GET CATEGORY PAGE - /admin/categories
 const getCategory = async (req, res) => {
    try {
        const categoryDatas = await category.find()
        res.render('category', { message: categoryDatas })
    } catch (error) {
        console.log(error)
    }
}
 


// GET ADD CATEGORY PAGE - /admin/categories/add
 const getAddCategoryPage = async (req, res) => {
    try {
        res.render('add-category')
    } catch (error) {
        console.log(error)
    }
}
 


// POST - ADD CATEGORY TO DB 
 const addCategory = async (req, res) => {
    try {
        const newCategory = req.body.category
        if (newCategory.trim().length == 0) {
            res.render('add-category', { message: 'Enter category name' })
        }
        const categoryExists = await category.findOne({ name: new RegExp('^' + newCategory + '$', 'i') })

        if (categoryExists) {
            res.render('add-category', { message: 'Category already registered' })
        }
        else {
            const categoryData = new category({
                name: req.body.category,
                is_block: 0
            })
            const categoryDoc = await categoryData.save()
            res.redirect('/admin/category')
        }
    }
    catch (error) {
        console.log(error.message);
    }
}
 


// TO BLOCK A CATEGORY 
 const blockCategory = async (req, res) => {
    try {
        const id = req.query.id
        await category.updateOne({ _id: id }, { $set: { is_block: 1 } })
        res.redirect('/admin/category')
    } catch (error) {
        console.log(error)
    }
}
 


// TO UN BLOCK A CATEGORY
 const unBlockCategory = async (req, res) => {
    try {
        const id = req.query.id
        await category.updateOne({ _id: id }, { $set: { is_block: 0 } })
        res.redirect('/admin/category')
    } catch (error) {
        console.log(error)
    }
}
 

// get ORDERS
 const getOrders = async (req, res) => {
    try {
        const orders = await order.find({})
        res.render('order', { message: orders })
    } catch (error) {
        console.log(error)
    }
}
 
// get single ORDERS details
 const getSingleOrder = async (req, res) => {
    try {
       
        const id = req.query.id
        
        const orderData = await order.findById(id).populate("product.productId")
       
        const product = orderData.product
       
        res.render('singleorder', { product, orderData})
    } catch (error) {
        console.log(error.message);
    }
}
 

// edit ORDERS
 const editOrder = async (req, res) => {
    try {
        const id = req.query.id
        const orderData = await order.findById({ _id: id })
        const totalBillAmount = orderData.totalAmount

        if (orderData.status === 'placed') {
            await order.updateOne({ _id: id }, { $set: { status: 'delivered' } })
            res.redirect('/admin/orders')
        }


        if (orderData.status === 'req-for-cancellation') {

            const walletAmountUsed = orderData.wallet
            const userid = req.session.user_id
            const userData = await users.findById({ _id: userid })

            const newWallet = parseInt(userData.wallet + walletAmountUsed)
            if (orderData.paymentMethod === 'COD') {
                await users.findByIdAndUpdate({ _id: userid }, { $set: { wallet: newWallet } })
            } else {
                await users.findByIdAndUpdate({ _id: userid }, { $set: { wallet: totalBillAmount } })
            }

            const userId = userid;
        const transactionType = 'credit';
        const transactionAmount = walletAmountUsed;
        const transactionDescription = 'Order cancelled';
        await recordWalletTransaction(userId, transactionType, transactionAmount, transactionDescription);


            await order.updateOne({ _id: id }, { $set: { status: 'cancelled' } })

            // to increase the stock
            const product = orderData.product
            for (let i = 0; i < product.length; i++) {
                const productId = product[i].productId
                const productData = await productModel.findById({ _id: productId })
                if (productData.stock === 0) {
                    await productModel.findByIdAndUpdate(productId, { $set: { status: 'In Stock' } })
                }
                const quantity = product[i].count
                await productModel.findByIdAndUpdate(productId, { $inc: { stock: +quantity } })
            }
 
            res.redirect('/admin/orders')
        }

        if (orderData.status === 'req-for-return') {


            const userid = req.session.user_id
            await users.findByIdAndUpdate({ _id: userid }, { $set: { wallet: totalBillAmount } })

            const userId = userid;
            const transactionType = 'credit';
            const transactionAmount =totalBillAmount;
            const transactionDescription = 'Order returned';
            await recordWalletTransaction(userId, transactionType, transactionAmount, transactionDescription);


            await order.updateOne({ _id: id }, { $set: { status: 'returned' } })

            // to increase the stock
            const product = orderData.product
            for (let i = 0; i < product.length; i++) {
                const productId = product[i].productId
                const productData = await productModel.findById({ _id: productId })
                if (productData.stock === 0) {
                    await productModel.findByIdAndUpdate(productId, { $set: { status: 'In Stock' } })
                }
                const quantity = product[i].count
                await productModel.findByIdAndUpdate(productId, { $inc: { stock: +quantity } })

            }
            // -----
            res.redirect('/admin/orders')
        }

    } catch (error) {
        console.log(error)
    }
}
// ---------------------------------------------------------------------------------
 
const parseDateMiddleware = (req, res, next) => {
    const { from, to } = req.query;

    if (from) req.query.from = moment.utc(from);
    if (to) req.query.to = moment.utc(to);

    next();
};

 //sales report
 const moment = require("moment-timezone");

 const getSalesReport = async (req, res) => {
    try {
        let from = req.query.from ? moment.utc(req.query.from) : "ALL";
        let to = req.query.to ? moment.utc(req.query.to) : "ALL";

        if (from !== "ALL" && to !== "ALL") {
            const orderdetails = await order.aggregate([
                {
                    $match: {
                        date: {
                            $gte: new Date(from),
                            $lte: new Date(to.endOf("day"))
                        },
                        status: {
                            $nin: ["cancelled", "returned"]
                        }
                    }
                }
            ]);
            req.session.Orderdtls = orderdetails
            res.render("sales-report", { message: orderdetails, from, to });
        } else {
            const orderdetails = await order.find({
                status: { $nin: ["cancelled", "returned"] }
            });
            // console.log(orderdetails);
            req.session.Orderdtls = orderdetails
            res.render('sales-report', { message: orderdetails, from, to });

        }
    } catch (error) {
        console.log(error);
    }
};
const excel = require('exceljs');

const downloadSalesReport = async (req, res) => {
    try {
        const { Orderdtls } = req.session;

        // Create a new Excel workbook and worksheet
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Define the columns in the worksheet
        worksheet.columns = [
            { header: 'User', key: 'user', width: 20 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 },
            { header: 'Total Amount', key: 'totalAmount', width: 20 },
            { header: 'Status', key: 'status', width: 20 },
        ];

        // Add data to the worksheet
        worksheet.addRows(Orderdtls.map(order => ({
            user: order.user,
            date: moment(order.date).format('YYYY-MM-DD'), // Use moment for formatting
            paymentMethod: order.paymentMethod,
            totalAmount: order.totalAmount,
            status: order.status,
        })));

        // Set response headers for file download
        const fileName = 'sales_report.xlsx';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        // Stream the Excel content to the response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error in downloadSalesReport:', error);
        res.status(500).send('Internal Server Error');
    }
};



module.exports = {
    getAdminPanel,
    getLogin,
    postLogin,
    getLogout,
    getUserManagement,
    unBlockUser,
    getCategory,
    getAddCategoryPage,
    addCategory,
    blockCategory,
    unBlockCategory,
    blockUser,
    getOrders,
    editOrder,
    getSalesReport,
    getSingleOrder,
    parseDateMiddleware,
    downloadSalesReport
}