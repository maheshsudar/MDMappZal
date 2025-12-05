const Database = require('better-sqlite3');
const db = new Database('db.sqlite');

try {
    const drafts = db.prepare("PRAGMA table_info(MDMService_BusinessPartnerRequests_drafts)").all();
    console.log("Draft Table Columns:");
    drafts.forEach(col => {
        if (col.name.includes('aeb') || col.name.includes('vies')) {
            console.log(`- ${col.name} (${col.type})`);
        }
    });

    const active = db.prepare("PRAGMA table_info(MDMService_BusinessPartnerRequests)").all();
    console.log("\nActive Table Columns:");
    active.forEach(col => {
        if (col.name.includes('aeb') || col.name.includes('vies')) {
            console.log(`- ${col.name} (${col.type})`);
        }
    });

    // Check if table exists at all
    if (drafts.length === 0) console.log("Draft table not found or empty schema!");
    else {
        // Try to insert a dummy record
        try {
            const stmt = db.prepare("INSERT INTO MDMService_BusinessPartnerRequests_drafts (ID, aebStatus) VALUES (?, ?)");
            stmt.run('dummy-id-' + Date.now(), 'NotChecked');
            console.log("Successfully inserted into aebStatus column!");
        } catch (err) {
            console.error("Failed to insert:", err.message);
        }
    }

} catch (e) {
    console.error(e);
}
