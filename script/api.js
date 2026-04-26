const API_BASE_URL = "https://fullstack-project-backend-seven.vercel.app"
// const API_BASE_URL = "http://localhost:8000";

/* =========================
   HELPER FUNCTION
========================= */
async function request(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: { "Content-Type": "application/json" },
            ...options
        });

        if (response.status === 204) return null;

        const data = await response.json().catch(() => null);

        if (!response.ok) throw new Error(data?.detail || "Request failed");

        return data;
    } catch (err) {
        if (err.message === "Failed to fetch") throw new Error("Cannot connect to server.");
        throw err;
    }
}

/* =========================
   AUTH
========================= */
const auth = {
    login: (email, password) => request(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password })
    }),
    signup: (userData) => request(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        body: JSON.stringify(userData)
    }),
    getMe: (userId) => request(`${API_BASE_URL}/auth/me/${userId}?user_id=${userId}`),
    updateProfile: (userId, updates) => request(`${API_BASE_URL}/auth/me/${userId}?user_id=${userId}`, {
        method: "PUT",
        body: JSON.stringify(updates)
    }),
    changePassword: (currentPassword, newPassword, userId) => request(`${API_BASE_URL}/settings/me/password?user_id=${userId}`, {
        method: "PUT",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    })
};

/* =========================
   PERSONS
========================= */
const persons = {
    getAll: (userId, search = "", status = "") => {
        let url = `${API_BASE_URL}/persons/?user_id=${userId}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status) url += `&status_filter=${status}`;
        return request(url);
    },
    getOne: (personId, userId) => request(`${API_BASE_URL}/persons/${personId}?user_id=${userId}`),
    create: (userId, personData) => request(`${API_BASE_URL}/persons/?user_id=${userId}`, {
        method: "POST",
        body: JSON.stringify(personData)
    }),
    update: (personId, userId, updates) => request(`${API_BASE_URL}/persons/${personId}?user_id=${userId}`, {
        method: "PUT",
        body: JSON.stringify(updates)
    }),
    delete: (personId, userId) => request(`${API_BASE_URL}/persons/${personId}?user_id=${userId}`, {
        method: "DELETE"
    })
};

/* =========================
   PAYMENTS
========================= */
const payments = {
    getAll: (userId, personId = "", limit = "") => {
        let url = `${API_BASE_URL}/payments/?user_id=${userId}`;
        if (personId) url += `&person_id=${personId}`;
        if (limit) url += `&limit=${limit}`;
        return request(url);
    },
    getUpcoming: (userId, days = 30) => request(`${API_BASE_URL}/payments/upcoming?user_id=${userId}&days=${days}`),
    create: (userId, paymentData) => request(`${API_BASE_URL}/payments/?user_id=${userId}`, {
        method: "POST",
        body: JSON.stringify(paymentData)
    }),
    delete: (paymentId, userId) => request(`${API_BASE_URL}/payments/${paymentId}?user_id=${userId}`, {
        method: "DELETE"
    })
};

/* =========================
   REPORTS
========================= */
const reports = {
    getSummary: (userId) => request(`${API_BASE_URL}/reports/summary?user_id=${userId}`),
    getMonthlyTrends: (userId) => request(`${API_BASE_URL}/reports/trends/monthly?user_id=${userId}`),
    getTopBorrowers: (userId) => request(`${API_BASE_URL}/reports/top-borrowers?user_id=${userId}`),
    getInterestDistribution: (userId) => request(`${API_BASE_URL}/reports/distribution/interest?user_id=${userId}`)
};

/* =========================
   SETTINGS
========================= */
const settings = {
    get: (userId) => request(`${API_BASE_URL}/settings/me?user_id=${userId}`),
    update: (userId, updates) => request(`${API_BASE_URL}/settings/me?user_id=${userId}`, {
        method: "PUT",
        body: JSON.stringify(updates)
    })
};

/* =========================
   EXPORT API OBJECT
========================= */
const API = { auth, persons, payments, reports, settings };