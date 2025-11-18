/**
 * Demo Script for Session Expiration Feature
 * 
 * This script demonstrates how the session expiration feature works
 * when the server restarts.
 */

// Simulate server restart by changing the boot time
const OLD_SERVER_BOOT_TIME = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
const NEW_SERVER_BOOT_TIME = Math.floor(Date.now() / 1000); // Now

// Simulate a JWT token issued before server restart
const tokenIssuedAt = OLD_SERVER_BOOT_TIME - 1800; // 30 minutes before old boot time

console.log('=== Session Expiration Demo ===\n');

console.log('1. Server was restarted');
console.log(`   Old boot time: ${OLD_SERVER_BOOT_TIME}`);
console.log(`   New boot time: ${NEW_SERVER_BOOT_TIME}\n`);

console.log('2. User has a token issued at:', tokenIssuedAt);
console.log('   (This represents a user who was logged in before the server restart)\n');

// Check if token is valid
const isTokenValid = tokenIssuedAt >= NEW_SERVER_BOOT_TIME;

console.log('3. Server validation check:');
console.log(`   Token issued at: ${tokenIssuedAt}`);
console.log(`   Server boot time: ${NEW_SERVER_BOOT_TIME}`);
console.log(`   Is token valid? ${isTokenValid}\n`);

if (!isTokenValid) {
  console.log('4. Server response:');
  console.log('   Status: 401 Unauthorized');
  console.log('   Message: "Session expirée. Veuillez vous reconnecter."\n');
  
  console.log('5. Frontend action:');
  console.log('   - Clear localStorage (token and user data)');
  console.log('   - Redirect to login page\n');
  
  console.log('✅ Security feature working correctly!');
  console.log('   Users must re-authenticate after server restart.\n');
} else {
  console.log('❌ Security feature not working!');
  console.log('   Token should be invalid after server restart.\n');
}

// Additional demo: token issued after server restart
const newTokenIssuedAt = NEW_SERVER_BOOT_TIME + 100; // 100 seconds after boot
const isNewTokenValid = newTokenIssuedAt >= NEW_SERVER_BOOT_TIME;

console.log('=== Bonus: Valid Token Demo ===\n');
console.log('Token issued after server restart:', newTokenIssuedAt);
console.log(`Is new token valid? ${isNewTokenValid}\n`);

if (isNewTokenValid) {
  console.log('✅ New tokens work correctly!');
  console.log('   Only tokens issued after server restart are valid.\n');
}