const express = require('express')
const { connectMongoDB } = require('./config/db-config')
const cookieParser = require('cookie-parser')
const app = express()
require('dotenv').config()
connectMongoDB()

app.use(express.json())
app.use(cookieParser())
app.use("/api/users", require("./routes/users-route"))

const port = process.env.PORT || 5000

app.listen(port, () => {
    console.log(`server listen on port ${port}`);
})