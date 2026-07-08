const express = require('express');
const router = express.Router();
const pool = require('../src/db/db');

function validateId(id, res) {
    if (!id || id.length > 255 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        res.status(400).json({ error: 'Invalid listing ID format'});
        return false;
    }
    return true;
}
// IMPORTANT: /openhouses must be registered BEFORE /:id
// If /:id is first, Express matches "openhouses" as the id param

// router returns open house events for a property
router.get('/:id/openhouses', async (req, res) => {
    const { id } = req.params;
    if (!validateId(id, res)) return;

    try {
        //first verify the property exists 
        const [[property]] = await pool.query(
            'SELECT id, L_ListingID FROM rets_property where L_ListingID = ? LIMIT 1', 
            [id]
        );
        if (!property) {
            return res.status(404).json({ error: `No property found with listing ID: ${id}`});
        }

        //Fetch Open Houses
        const [openhouses] = await pool.query(
            `SELECT
                id, L_ListingID, L_DisplayId, 
                OpenHouseDate, OH_StartTime,  OH_EndTime,
                OH_StartDate, OH_EndDate,  all_data, 
                API_OH_StartDate, API_OH_EndDate
            FROM rets_openhouse
            WHERE L_ListingID = ?
            ORDER BY OpenHouseDate ASC, OH_StartTime ASC`,
            [id]
        );

        res.json({ total: openhouses.length, results: openhouses });
    } catch (err) {
        console.error(`GET /api/properties/${id}/openhouses error:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (!validateId(id, res)) return;

    try {
        const [[property]] = await pool.query(
            `SELECT * FROM rets_property WHERE L_ListingID = ? LIMIT 1`, [id]
        );
        if (!property) {
            return res.status(404).json({ error: `No property found with Listing ID: ${id}` });
        }
        res.json(property);
    } catch (err) {
        console.error(`GET /api/properties/${id} error:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

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
        console.log('minPrice raw:', minPrice, 'parsed:', Number(minPrice));
        conditions.push('L_SystemPrice >= ?');
        values.push(minPrice);
    }
    if (maxPrice !== undefined) {
        conditions.push('L_SystemPrice <= ?');
        values.push(maxPrice);
    }
    //TO DO: return the properties with at least that many beds or baths.
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
        `; //TO DO add all the property details
        const [results] = await pool.query(dataSql, [...values, limit, offset]);

        res.json({ total, limit, offset, results });
        } catch (err){
        console.error('GET /api/properties error:', err);
        res.status(500).json({error: 'Internal server error'});
    }
});

module.exports = router;