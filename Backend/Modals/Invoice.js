const mongoose = require('mongoose')

const Invoice= new mongoose.Schema({
     photo: { type: String, required: true },
});
module.exports=mongoose.model('Invoice',Invoice)