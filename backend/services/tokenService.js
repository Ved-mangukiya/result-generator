const { v4: uuidv4 } = require('uuid');

// In-memory token store: Map of tokenString -> { expiresAt, adminId }
const tokenStore = new Map();

/**
 * Generate a short-lived, single-use download token
 * @param {number|string} adminId
 * @returns {string} token
 */
function generateToken(adminId) {
  const token = uuidv4();
  const expiresAt = Date.now() + 60 * 1000; // valid for 60 seconds
  tokenStore.set(token, { expiresAt, adminId });
  
  // Clean up token after expiration
  setTimeout(() => {
    tokenStore.delete(token);
  }, 65 * 1000);

  return token;
}

/**
 * Verify if a token is valid, and delete it (single-use)
 * @param {string} token
 * @returns {boolean} isValid
 */
function verifyToken(token) {
  if (!token) return false;
  
  const tokenData = tokenStore.get(token);
  if (!tokenData) return false;
  
  // Delete immediately to enforce single-use
  tokenStore.delete(token);

  if (Date.now() > tokenData.expiresAt) {
    return false; // Expired
  }

  return true;
}

module.exports = {
  generateToken,
  verifyToken
};
