const express = require('express');
const router = express.Router();
const pool = require('../src/db/db');

// Add filter support for: city (L_City), zipcode (L_Zip), minPrice/maxPrice (L_SystemPrice), beds (L_Keyword2), baths (LM_Dec_3)
router.get('/', async (req, res) =>  {
    const { city, zipcode, minPrice, maxPrice, beds, baths } = req.query;

    // Pagination defaults & validation
    let limit = req.query.limit !== undefined ? Number(req.query.limit) : 20;
    let offset = req.query.limit !== undefined ? Number(req.query.offset) : 0;

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
        return res.status(400).json({ error: 'limit must be an integer between 1 and 100'});
    }
    if (!Number.isInteger(offset) || offset < 0) {
        return res.status(400).json({ error: 'offset must be a non-negative integer'});
    }

    // Filter validation
    if (minPrice !== undefined && (isNaN(Number(minPrice)) || Number(minPrice) < 0)) {
        return res.status(400).json({ error: 'minPrice must be a non-negative number'});
    }
    if (maxPrice !== undefined && (isNaN(Number(maxPrice)) || Number(maxPrice)) < 0) {
        return res.status(400).json({ error: 'maxPrice must be a non-negative number'});
    }
    if (beds !== undefined && (!Number.isInteger(Number(beds)) || Number(beds)) < 0) {
        return res.status(400).json({ error: 'beds must be a non-negative integer'});
    }
    if (baths !== undefined && (isNaN(Number(baths)) || Number(baths)) < 0) {
        return res.status(400).json({ error: 'baths must be a non-negative number'});
    }

    // Dynamic WHERE clause
    const conditions = [];
    const values = [];

    if (city) {
        conditions.push('LOWER(TRIM(L_City)) = LOWER(TRIM(?))');
        values.push(city);
    }
    if (zipcode) {
        conditions.push('L_ZIP = ?');
        values.push(zipcode);
    }
    if (minPrice !== undefined) {
        conditions.push('L_SystemPrice <= ?');
        values.push(minPrice);
    }
    if (maxPrice !== undefined) {
        conditions.push('L_SystemPrice <= ?');
        values.push(maxPrice);
    }
    if (beds !== undefined) {
        conditions.push('L_Keyword2 = ?');
        values.push(Number(beds));
    }
    if (baths !== undefined) {
        conditions.push('LM_Dec_3 = ?');
        values.push(baths);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
        //COUNT query -> same values array, no limit/offset
        const countSql = `SELECT COUNT(*) as total FROM rets_property ${where}`;
        const [[{total}]] = await pool.query(countSql, values);

        //DATA query -> append limit /offset values AFTER the filter values
        const dataSql = `
            SELECT 
                id, L_City, L_Zip,
                L_SystemPrice, L_Keyword2, LM_Dec_3
            FROM rets_property
            ${where}
            ORDER BY id
            LIMIT ? OFFSET ?
        `;
        const [results] = await pool.query(dataSql, [...values, limit, offset]);

        res.json({ total, limit, offset, results });
        } catch (err){
        console.error('GET /api/properties error:', err);
        res.status(500).json({error: 'Internal server error'});
    }
});

module.exports = router;