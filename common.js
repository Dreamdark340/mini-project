// Shared utilities for login event recording and admin viewing

(function () {
    const MAX_EVENTS_STORED = 1000;

    function withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
        ]);
    }

    async function fetchIpAddress() {
        try {
            const res = await withTimeout(fetch("https://api.ipify.org?format=json"), 4000);
            const data = await res.json();
            return data && data.ip ? data.ip : "Unknown";
        } catch (_) {
            return "Unknown";
        }
    }

    async function fetchLocation() {
        try {
            const res = await withTimeout(fetch("https://ipapi.co/json/"), 5000);
            const data = await res.json();
            const city = data.city || "";
            const region = data.region || data.region_code || "";
            const country = data.country_name || data.country || "";
            const parts = [city, region, country].filter(Boolean);
            return parts.length ? parts.join(", ") : "Unknown";
        } catch (_) {
            return "Unknown";
        }
    }

    function readEvents() {
        try {
            return JSON.parse(localStorage.getItem("loginEvents") || "[]");
        } catch (e) {
            return [];
        }
    }

    function writeEvents(events) {
        try {
            localStorage.setItem("loginEvents", JSON.stringify(events));
        } catch (e) {
            // ignore quota errors
        }
    }

    async function recordLoginEventInternal(status, extra) {
        const username = localStorage.getItem("username") || extra.username || "Unknown";
        const role = localStorage.getItem("userRole") || extra.role || "Unknown";
        const userAgent = navigator.userAgent || "Unknown";

        const [ipAddress, location] = await Promise.all([fetchIpAddress(), fetchLocation()]);

        const event = {
            username,
            role,
            timestamp: new Date().toISOString(),
            ipAddress,
            browser: userAgent,
            status: status || "Success",
            location,
        };

        const events = readEvents();
        events.push(event);
        if (events.length > MAX_EVENTS_STORED) {
            events.splice(0, events.length - MAX_EVENTS_STORED);
        }
        writeEvents(events);

        if (window.addAuditLog) {
            try {
                window.addAuditLog(username, "Login Event", `Recorded login (${event.status}) from ${event.ipAddress}`, "medium");
            } catch (_) {}
        }
    }

    function migrateLegacyLoginHistory() {
        try {
            const keys = Object.keys(localStorage).filter((k) => k.startsWith("loginHistory_"));
            if (keys.length === 0) return 0;
            const events = readEvents();
            let imported = 0;
            keys.forEach((key) => {
                try {
                    const arr = JSON.parse(localStorage.getItem(key) || "[]");
                    arr.forEach((entry) => {
                        events.push({
                            username: key.replace("loginHistory_", ""),
                            role: "Employee",
                            timestamp: entry.timestamp || new Date().toISOString(),
                            ipAddress: entry.ipAddress || "Unknown",
                            browser: entry.device || "Unknown",
                            status: entry.status || "Success",
                            location: entry.location || "Unknown",
                        });
                        imported++;
                    });
                    localStorage.removeItem(key);
                } catch (_) {}
            });
            writeEvents(events);
            return imported;
        } catch (_) {
            return 0;
        }
    }

    function getAllLoginEvents() {
        const events = readEvents();
        return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    function recordSessionLoginOnce() {
        const token = localStorage.getItem("authToken");
        if (!token) return;
        const flagKey = `loginRecorded_${token}`;
        if (localStorage.getItem(flagKey)) return;
        localStorage.setItem(flagKey, "1");
        // Fire and forget; no need to await
        recordLoginEventInternal("Success", {});
    }

    // Expose APIs
    window.recordLoginEvent = function (status, extra = {}) {
        return recordLoginEventInternal(status, extra);
    };
    window.getAllLoginEvents = getAllLoginEvents;
    window.migrateLegacyLoginHistory = migrateLegacyLoginHistory;
    window.recordSessionLoginOnce = recordSessionLoginOnce;
})();

