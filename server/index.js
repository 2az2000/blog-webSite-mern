require('dotenv').config()
const express = require('express')
const { connectMongoDB } = require('./config/db-config')
const cookieParser = require('cookie-parser')
const app = express()
connectMongoDB()

app.use(express.json())
app.use(cookieParser())
app.use("/api/users", require("./routes/users-route"))

// Vercel imports this file as a serverless function and calls the exported app;
// locally (`node index.js`) it listens on a port as before.
if (require.main === module) {
    const port = process.env.PORT || 5000
    app.listen(port, () => {
        console.log(`server listen on port ${port}`);
    })
}

module.exports = app
