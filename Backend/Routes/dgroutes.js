const { DGSet, DGLog } = require('../Modals/DG');

// 1. नया DG सेट रजिस्टर करना (Add DG Option)
router.post('/create-set', async (req, res) => {
    try {
        const { adminId, dgName } = req.body;
        const newSet = new DGSet({ adminId, dgName });
        await newSet.save();
        res.status(201).json(newSet);
    } catch (err) { res.status(400).json({ msg: err.message }); }
});

// 2. सभी DG सेट्स की लिस्ट मंगवाना
router.get('/list/:adminId', async (req, res) => {
    try {
        const sets = await DGSet.find({ adminId: req.params.adminId });
        res.json(sets);
    } catch (err) { res.status(500).json({ msg: err.message }); }
});

// 3. किसी तारीख और DG का पुराना डेटा फेच करना
router.get('/fetch-log', async (req, res) => {
    try {
        const { adminId, dgName, date } = req.query;
        const searchDate = new Date(date);
        searchDate.setHours(0, 0, 0, 0); // सिर्फ तारीख मैच करने के लिए समय जीरो करें

        const log = await DGLog.findOne({ 
            adminId, 
            dgName, 
            date: searchDate 
        });
        res.json(log);
    } catch (err) { res.status(500).json({ msg: err.message }); }
});

// 4. रोज़ का डेटा सेव या अपडेट करना (Upsert)
router.post('/add-log', async (req, res) => {
    try {
        const { adminId, dgName, date, unitsProduced, fuelCost, month } = req.body;
        const logDate = new Date(date);
        logDate.setHours(0,0,0,0);

        const updatedLog = await DGLog.findOneAndUpdate(
            { adminId, dgName, date: logDate }, // ढूँढो इस तारीख और नाम से
            { adminId, dgName, date: logDate, month, unitsProduced, fuelCost }, // ये डेटा डालो
            { upsert: true, new: true } // अगर नहीं है तो नया बनाओ, है तो अपडेट करो
        );
        res.json(updatedLog);
    } catch (err) { res.status(400).json({ msg: err.message }); }
});

// 5. महीने का टोटल (Aggregate) निकालना
router.get('/monthly-total', async (req, res) => {
    try {
        const { adminId, month } = req.query;
        const totals = await DGLog.aggregate([
            { $match: { adminId: new mongoose.Types.ObjectId(adminId), month: month } },
            { $group: { 
                _id: "$dgName", 
                totalUnits: { $sum: "$unitsProduced" }, 
                totalCost: { $sum: "$fuelCost" } 
            }}
        ]);
        res.json(totals);
    } catch (err) { res.status(500).json({ msg: err.message }); }
});