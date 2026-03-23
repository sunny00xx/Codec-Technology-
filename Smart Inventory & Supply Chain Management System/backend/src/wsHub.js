/**
 * WebSocket Hub — in-memory pub/sub per tenant
 * No Redis dependency needed; pure ws for real-time events.
 */
const { WebSocketServer } = require("ws");
const { v4: uuidv4 } = require("uuid");

class WsHub {
    constructor() {
        this.clients = new Map(); // tenantId -> Set<ws>
        this.notifications = new Map(); // tenantId -> notification[]
    }

    attach(server) {
        this.wss = new WebSocketServer({ server, path: "/ws" });
        this.wss.on("connection", (ws, req) => {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const tenantId = url.searchParams.get("tenant_id");
            const token = url.searchParams.get("token");

            if (!tenantId) { ws.close(4001, "tenant_id required"); return; }

            // Register client
            if (!this.clients.has(tenantId)) this.clients.set(tenantId, new Set());
            this.clients.get(tenantId).add(ws);
            ws._tenantId = tenantId;
            ws._clientId = uuidv4();

            // Send buffered notifications
            const buffered = this.notifications.get(tenantId) || [];
            if (buffered.length > 0) {
                ws.send(JSON.stringify({ type: "BUFFERED_NOTIFICATIONS", data: buffered }));
            }

            ws.on("close", () => {
                const set = this.clients.get(tenantId);
                if (set) { set.delete(ws); if (set.size === 0) this.clients.delete(tenantId); }
            });

            ws.on("error", () => { });
            ws.send(JSON.stringify({ type: "CONNECTED", data: { client_id: ws._clientId, tenant_id: tenantId }, timestamp: new Date().toISOString() }));
        });

        console.log("[WS] WebSocket hub attached on /ws");
    }

    broadcast(tenantId, message) {
        const payload = JSON.stringify(message);
        const set = this.clients.get(tenantId);
        let sent = 0;
        if (set && set.size > 0) {
            for (const ws of set) {
                if (ws.readyState === 1) { ws.send(payload); sent++; }
            }
        }
        // Buffer notification for offline clients (max 50 per tenant)
        if (["SHIPMENT_EXCEPTION", "SHIPMENT_DELAYED", "STOCK_LOW", "SUPPLIER_LATE", "PRICE_VARIANCE"].includes(message.type)) {
            if (!this.notifications.has(tenantId)) this.notifications.set(tenantId, []);
            const list = this.notifications.get(tenantId);
            list.unshift({ ...message, id: uuidv4(), read: false });
            if (list.length > 50) list.pop();
        }
        return sent;
    }

    getNotifications(tenantId) {
        return this.notifications.get(tenantId) || [];
    }

    markRead(tenantId, notificationId) {
        const list = this.notifications.get(tenantId) || [];
        const notif = list.find((n) => n.id === notificationId);
        if (notif) notif.read = true;
        return !!notif;
    }

    markAllRead(tenantId) {
        const list = this.notifications.get(tenantId) || [];
        list.forEach((n) => (n.read = true));
    }
}

module.exports = new WsHub();
