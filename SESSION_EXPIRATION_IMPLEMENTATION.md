# Session Expiration Implementation

## Overview
This document explains how the session expiration feature has been implemented to ensure users must reconnect after each server restart for security purposes.

## Implementation Details

### Backend Implementation
The backend server already had a mechanism in place to detect server restarts and invalidate sessions:

1. **Server Boot Time Tracking**: The server captures the startup time in the `SERVER_BOOT_TIME` constant:
   ```javascript
   const SERVER_BOOT_TIME = Math.floor(Date.now() / 1000);
   ```

2. **Token Validation**: The [verifyToken](file:///I:/Travaux_ade/backend/server.js#L427-L457) middleware checks if a token was issued before the server started:
   ```javascript
   if (decoded.iat && decoded.iat < SERVER_BOOT_TIME) {
     return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
   }
   ```

### Frontend Implementation
The frontend was modified to properly handle the "Session expirée" error and redirect users to the login page:

1. **API Interceptor Update**: The response interceptor in [api.js](file:///I:/Travaux_ade/frontend/src/services/api.js) was updated to detect session expiration errors:
   ```javascript
   // Si l'erreur est une erreur 401 avec le message "Session expirée", 
   // déconnecter l'utilisateur et le rediriger vers la page de login
   if (error.response && error.response.status === 401) {
     const message = error.response.data?.error || '';
     if (message.includes('Session expirée')) {
       // Supprimer les données de session
       localStorage.removeItem('token');
       localStorage.removeItem('user');
       
       // Rediriger vers la page de login
       if (typeof window !== 'undefined') {
         window.location.href = '/'; // Redirige vers la racine qui affichera le login
       }
     }
   }
   ```

## Security Benefits
This implementation ensures that:
1. Users must re-authenticate after each server restart
2. No stale sessions can be used to access the system
3. Security is enhanced by forcing re-authentication after server maintenance

## Testing
A test suite was created in [api.test.js](file:///I:/Travaux_ade/frontend/src/services/api.test.js) to verify the functionality:
1. Login functionality stores token and user data
2. Logout functionality removes token and user data
3. Session expiration redirects to login page and clears local storage

## How It Works
1. When the server restarts, `SERVER_BOOT_TIME` is set to the current time
2. Any existing JWT tokens in client browsers have an `iat` (issued at) timestamp from before the restart
3. When the client makes an API request, the backend checks if `iat < SERVER_BOOT_TIME`
4. If true, the backend returns a 401 error with "Session expirée" message
5. The frontend interceptor detects this specific error message
6. Local storage is cleared (token and user data)
7. User is redirected to the login page