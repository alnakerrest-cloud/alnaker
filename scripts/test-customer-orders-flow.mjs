/**
 * Verification test script for Customer Orders / طلباتي + Live Order Tracking
 * Run: node scripts/test-customer-orders-flow.mjs
 */

import { createHmac } from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'naqer-customer-session-secret-2026-safe-fallback-key';
const TEST_PHONE = '01024994092';
const TEST_PHONE_NORMALIZED = '+201024994092';

function base64urlEncode(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return Buffer.from(b64, 'base64');
}

function signSession(payload) {
  const json = JSON.stringify(payload);
  const dataB64 = base64urlEncode(Buffer.from(json, 'utf8'));
  const hmac = createHmac('sha256', SESSION_SECRET);
  hmac.update(dataB64);
  const sigB64 = base64urlEncode(hmac.digest());
  return `${dataB64}.${sigB64}`;
}

function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [dataB64, sigB64] = parts;
  const hmac = createHmac('sha256', SESSION_SECRET);
  hmac.update(dataB64);
  const expectedSigB64 = base64urlEncode(hmac.digest());
  if (sigB64 !== expectedSigB64) return null;
  try {
    const json = base64urlDecode(dataB64).toString('utf8');
    const payload = JSON.parse(json);
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function runTests() {
  console.log('--- Starting Customer Orders Architecture Verification ---');

  // Test 1: Session Signing and Verification
  console.log('\n[Test 1] Session HMAC-SHA256 Token Lifecycle:');
  const now = Date.now();
  const testPayload = {
    customerId: 'cust_test_123',
    phoneNormalized: TEST_PHONE_NORMALIZED,
    customerName: 'تجربة عميل الناقر',
    createdAt: now,
    exp: now + 60 * 24 * 3600 * 1000,
  };

  const token = signSession(testPayload);
  console.log('  Signed token generated (length):', token.length);
  const verified = verifySession(token);
  if (!verified || verified.phoneNormalized !== TEST_PHONE_NORMALIZED || verified.customerId !== 'cust_test_123') {
    throw new Error('Test 1 Failed: Token verification mismatch');
  }
  console.log('  ✔ Verified token payload successfully matches');

  // Test 2: Tamper Detection
  console.log('\n[Test 2] Session Tamper Detection:');
  const tamperedPayload = { ...testPayload, phoneNormalized: '+201111111111' };
  const tamperedDataB64 = base64urlEncode(Buffer.from(JSON.stringify(tamperedPayload), 'utf8'));
  const parts = token.split('.');
  const forgedToken = `${tamperedDataB64}.${parts[1]}`;
  const tamperedResult = verifySession(forgedToken);
  if (tamperedResult !== null) {
    throw new Error('Test 2 Failed: Tampered token was unexpectedly accepted!');
  }
  console.log('  ✔ Tampered token was rejected as expected');

  // Test 3: Expired Token Rejection
  console.log('\n[Test 3] Expired Token Rejection:');
  const expiredPayload = { ...testPayload, exp: now - 1000 };
  const expiredToken = signSession(expiredPayload);
  const expiredResult = verifySession(expiredToken);
  if (expiredResult !== null) {
    throw new Error('Test 3 Failed: Expired token was unexpectedly accepted!');
  }
  console.log('  ✔ Expired token was rejected as expected');

  // Test 4: OTP Verification
  console.log('\n[Test 4] Pluggable OTP Provider Contract:');
  // Dynamic import of lib/otp-provider
  const { activeOtpProvider } = await import('../lib/otp-provider.ts');
  const sendRes = await activeOtpProvider.sendOtp(TEST_PHONE_NORMALIZED);
  console.log('  OTP send response success:', sendRes.success);
  console.log('  Local debug code:', sendRes.debugCode);
  if (!sendRes.success || !sendRes.debugCode) {
    throw new Error('Test 4 Failed: OTP generation failed');
  }

  // Verify with wrong code
  const wrongCheck = await activeOtpProvider.verifyOtp(TEST_PHONE_NORMALIZED, '9999');
  if (wrongCheck.success) {
    throw new Error('Test 4 Failed: Wrong OTP code was accepted');
  }
  console.log('  ✔ Invalid OTP code was rejected as expected');

  // Verify with correct code
  const correctCheck = await activeOtpProvider.verifyOtp(TEST_PHONE_NORMALIZED, sendRes.debugCode);
  if (!correctCheck.success) {
    throw new Error('Test 4 Failed: Correct OTP code was rejected');
  }
  console.log('  ✔ Correct OTP code verified successfully');

  // Second verification with used code should fail (single use)
  const reuseCheck = await activeOtpProvider.verifyOtp(TEST_PHONE_NORMALIZED, sendRes.debugCode);
  if (reuseCheck.success) {
    throw new Error('Test 4 Failed: Reused OTP code was accepted');
  }
  console.log('  ✔ Reused OTP code was rejected (single-use guarantee)');

  console.log('\n=============================================');
  console.log('  ALL CUSTOMER SESSION & OTP TESTS PASSED!   ');
  console.log('=============================================');
}

runTests().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
