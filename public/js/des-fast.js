/**
 * TripleDES-ECB decryption specialised for the portal answers (used by magis-worker.js).
 *
 * CryptoJS looks its S-box tables up in objects with sparse integer keys (slow dictionary
 * accesses), copies words through WordArray objects and runs the initial/final permutation around
 * every one of the three DES passes. This version uses the same tables as dense typed arrays
 * (des-tables.js), flat subkey arrays, and applies the initial and final permutation only once
 * per block (the final permutation of one pass cancels the initial permutation of the next).
 * The subkeys still come from CryptoJS, so only the block loop is new; its output is checked
 * against CryptoJS before release.
 */

/** Flattens CryptoJS DES subkeys (16 x 8 words) into an Int32Array */
function desFlatKeys(subKeys) {
  var out = new Int32Array(128);
  for (var r = 0; r < 16; r++) {
    for (var i = 0; i < 8; i++) out[r * 8 + i] = subKeys[r][i] | 0;
  }
  return out;
}

/**
 * Decrypt stages of a TripleDES key (CryptoJS instance created with createDecryptor): DES3
 * decrypt, DES2 encrypt, DES1 decrypt
 */
function desStages(tdes) {
  return [
    desFlatKeys(tdes._des3._invSubKeys),
    desFlatKeys(tdes._des2._subKeys),
    desFlatKeys(tdes._des1._invSubKeys)
  ];
}

/** Decrypts `bytes` (a multiple of 8, big-endian blocks) in place */
function desDecryptBytes(bytes, stages) {
  var T0 = DES_SP[0], T1 = DES_SP[1], T2 = DES_SP[2], T3 = DES_SP[3];
  var T4 = DES_SP[4], T5 = DES_SP[5], T6 = DES_SP[6], T7 = DES_SP[7];
  var n = bytes.length;
  for (var p = 0; p < n; p += 8) {
    var l = (bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3];
    var r = (bytes[p + 4] << 24) | (bytes[p + 5] << 16) | (bytes[p + 6] << 8) | bytes[p + 7];
    var t;

    // Initial permutation
    t = ((l >>> 4) ^ r) & 0x0f0f0f0f; r ^= t; l ^= t << 4;
    t = ((l >>> 16) ^ r) & 0x0000ffff; r ^= t; l ^= t << 16;
    t = ((r >>> 2) ^ l) & 0x33333333; l ^= t; r ^= t << 2;
    t = ((r >>> 8) ^ l) & 0x00ff00ff; l ^= t; r ^= t << 8;
    t = ((l >>> 1) ^ r) & 0x55555555; r ^= t; l ^= t << 1;

    for (var s = 0; s < 3; s++) {
      var k = stages[s];
      for (var round = 0, o = 0; round < 16; round++, o += 8) {
        var x0 = r ^ k[o], x1 = r ^ k[o + 1], x2 = r ^ k[o + 2], x3 = r ^ k[o + 3];
        var x4 = r ^ k[o + 4], x5 = r ^ k[o + 5], x6 = r ^ k[o + 6], x7 = r ^ k[o + 7];
        var f = T0[((x0 >>> 26) & 0x3e) | (x0 & 1)] |
                T1[(x1 >>> 23) & 0x3f] |
                T2[(x2 >>> 19) & 0x3f] |
                T3[(x3 >>> 15) & 0x3f] |
                T4[(x4 >>> 11) & 0x3f] |
                T5[(x5 >>> 7) & 0x3f] |
                T6[(x6 >>> 3) & 0x3f] |
                T7[((x7 >>> 26) & 0x20) | (x7 & 0x1f)];
        t = l ^ f;
        l = r;
        r = t;
      }
      // Undo the swap of the last round
      t = l; l = r; r = t;
    }

    // Final permutation
    t = ((l >>> 1) ^ r) & 0x55555555; r ^= t; l ^= t << 1;
    t = ((r >>> 8) ^ l) & 0x00ff00ff; l ^= t; r ^= t << 8;
    t = ((r >>> 2) ^ l) & 0x33333333; l ^= t; r ^= t << 2;
    t = ((l >>> 16) ^ r) & 0x0000ffff; r ^= t; l ^= t << 16;
    t = ((l >>> 4) ^ r) & 0x0f0f0f0f; r ^= t; l ^= t << 4;

    bytes[p] = l >>> 24; bytes[p + 1] = l >>> 16; bytes[p + 2] = l >>> 8; bytes[p + 3] = l;
    bytes[p + 4] = r >>> 24; bytes[p + 5] = r >>> 16; bytes[p + 6] = r >>> 8; bytes[p + 7] = r;
  }
}

/** Hex pairs of ASCII base64 text -> raw bytes (the portal wraps base64 in hex) */
var B64_VAL = (function () {
  var t = new Int8Array(128);
  for (var i = 0; i < 128; i++) t[i] = -1;
  var a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (var j = 0; j < 64; j++) t[a.charCodeAt(j)] = j;
  return t;
})();

var HEX_VAL = (function () {
  var t = new Int8Array(128);
  for (var i = 0; i < 128; i++) t[i] = -1;
  for (var d = 0; d < 10; d++) t[48 + d] = d;
  for (var h = 0; h < 6; h++) { t[97 + h] = 10 + h; t[65 + h] = 10 + h; }
  return t;
})();

/** `hex` slice (a multiple of 64 chars) -> ciphertext bytes, without building intermediate strings */
function desHexToBytes(hex) {
  var chars = hex.length >>> 1;
  var out = new Uint8Array((chars >>> 2) * 3);
  var o = 0;
  var acc = 0, bits = 0;
  for (var i = 0; i < hex.length; i += 2) {
    var c = (HEX_VAL[hex.charCodeAt(i)] << 4) | HEX_VAL[hex.charCodeAt(i + 1)];
    if (c === 61) break; // '=' padding
    var v = c < 128 ? B64_VAL[c] : -1;
    if (v < 0) continue;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >>> bits) & 0xff;
    }
  }
  return out.subarray(0, o);
}
