const db = require('./src/database');

const tid = '1';

const totalProducts = db.prepare(`SELECT COUNT(*) as c FROM products WHERE tenant_id = ?`).get(tid);
console.log("totalProducts", totalProducts);

const totalInventory = db.prepare(`SELECT COALESCE(SUM(quantity), 0) as total FROM inventory_ledgers WHERE tenant_id = ?`).get(tid);
console.log("totalInventory", totalInventory);

const stockValue = db.prepare(`
    SELECT COALESCE(SUM(il.quantity * COALESCE(p.cost_price, 0)), 0) as val
    FROM inventory_ledgers il JOIN products p ON il.product_id = p.id WHERE il.tenant_id = ?
`).get(tid);
console.log("stockValue", stockValue);

const topSKUs = db.prepare(`
    SELECT p.name, p.sku, SUM(sm.quantity) as total_moved
    FROM stock_movements sm JOIN products p ON sm.product_id = p.id
    WHERE sm.tenant_id = ? AND sm.created_at >= date('now', '-3 months')
    GROUP BY p.id ORDER BY total_moved DESC LIMIT 8
`).all(tid);
console.log("topSKUs", topSKUs);

const suppliers = db.prepare("SELECT id, name, supplier_code, city, country, email FROM suppliers WHERE tenant_id = ?").all(tid);
console.log("suppliers", suppliers);

let a = suppliers[0]?.name;
let b = suppliers[1]?.name;
if (a && b) {
    a = a.toLowerCase().replace(/[^a-z0-9]/g, "");
    b = b.toLowerCase().replace(/[^a-z0-9]/g, "");
}
