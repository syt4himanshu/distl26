/* Shared frontend auth utilities for guarding protected pages */
(function () {
    const API_BASE = 'http://localhost:5002';
    const STORAGE_KEYS = {
        accessToken: 'access_token',
        userRole: 'user_role',
    };


    async function verifyToken(accessToken) {
        try {
            const res = await fetch(`${API_BASE}/api/auth/verify`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (!res.ok) return { valid: false };
            return await res.json();
        } catch (e) {
            return { valid: false };
        }
    }

    async function guardRoute(requiredRoles) {
        const token = localStorage.getItem(STORAGE_KEYS.accessToken);
        if (!token) {
            redirectToLogin();
            return;
        }
        const result = await verifyToken(token);
        if (!result.valid) {
            localStorage.removeItem(STORAGE_KEYS.accessToken);
            localStorage.removeItem(STORAGE_KEYS.userRole);
            redirectToLogin();
            return;
        }
        const currentRole = result.user?.role || localStorage.getItem(STORAGE_KEYS.userRole);
        if (requiredRoles && requiredRoles.length && !requiredRoles.includes(currentRole)) {
            // Wrong panel: redirect to correct one based on role
            redirectToRoleHome(currentRole);
            return;
        }
        // keep role in storage fresh
        if (result.user?.role) localStorage.setItem(STORAGE_KEYS.userRole, result.user.role);
    }

    function redirectToRoleHome(role) {
        if (role === 'admin') {
            window.location.replace('../Admin/a.html');
        } else if (role === 'faculty') {
            window.location.replace('../Teacher/t.html');
        } else if (role === 'student') {
            window.location.replace('../Student/s.html');
        } else {
            redirectToLogin();
        }
    }

    function redirectToLogin() {
        // From nested directories, always send to root login
        const to = window.location.pathname.includes('/Admin/') || window.location.pathname.includes('/Teacher/') || window.location.pathname.includes('/Student/')
            ? '../login.html'
            : './login.html';
        window.location.replace(to);
    }

    function getApiBase() {
        return API_BASE;
    }

    // Expose minimal API
    window.AuthGuard = {
        guardRoute,
        redirectToRoleHome,
        getApiBase,
    };
})();


