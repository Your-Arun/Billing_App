const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./Routes/auth'); 
const tenantRoutes = require('./Routes/tenantRoutes'); 
const dgroutes = require('./Routes/dgroutes'); 
const solarroutes = require('./Routes/solarroutes'); 
const readingroutes = require('./Routes/readingRoutes'); 
const billroutes = require('./Routes/billRoutes'); 
const reconcileroutes = require('./Routes/reconcileRoutes'); 
const invoiceroutes = require('./Routes/invoiceroutes'); 

const app = express();

app.use(cors());
app.use(express.json()); 


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.use('', authRoutes); 
app.use('/tenants', tenantRoutes); 
app.use('/dg', dgroutes); 
app.use('/solar', solarroutes); 
app.use('/readings', readingroutes); 
app.use('/bill', billroutes); 
app.use('/reconcile', reconcileroutes); 
app.use('/invoices', invoiceroutes); 





app.get('/', (req, res) => {
  res.send("Electricity Billing App Server is Running...");
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});