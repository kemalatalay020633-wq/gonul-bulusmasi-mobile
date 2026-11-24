
package com.anonymous.gonulbulusmasimobile.e2ee;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.security.KeyFactory;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.PublicKey;
import java.security.Signature;
import java.security.SecureRandom;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.X509EncodedKeySpec;

public final class E2EEModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "AramaKimlikModulu";

    private static final String KEY_ALIAS =
            "gonul_bulusmasi_device_identity_v1";

    private static final int MAX_PAYLOAD_LENGTH = 16384;

    private static final SecureRandom SECURE_RANDOM =
            new SecureRandom();

    public E2EEModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    // =====================================================
    // ANDROID KEYSTORE
    // =====================================================

    private synchronized KeyStore loadKeyStore() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        return keyStore;
    }

    private synchronized KeyStore.PrivateKeyEntry getOrCreateIdentity()
            throws Exception {

        KeyStore keyStore = loadKeyStore();

        if (keyStore.containsAlias(KEY_ALIAS)) {
            KeyStore.Entry entry = keyStore.getEntry(KEY_ALIAS, null);

            if (!(entry instanceof KeyStore.PrivateKeyEntry)) {
                throw new IllegalStateException(
                        "Cihaz kimlik anahtarı geçersiz."
                );
            }

            return (KeyStore.PrivateKeyEntry) entry;
        }

        KeyPairGenerator generator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC,
                "AndroidKeyStore"
        );

        KeyGenParameterSpec spec =
                new KeyGenParameterSpec.Builder(
                        KEY_ALIAS,
                        KeyProperties.PURPOSE_SIGN
                                | KeyProperties.PURPOSE_VERIFY
                )
                .setAlgorithmParameterSpec(
                        new ECGenParameterSpec("secp256r1")
                )
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setUserAuthenticationRequired(false)
                .build();

        generator.initialize(spec);
        generator.generateKeyPair();

        KeyStore.Entry entry = keyStore.getEntry(KEY_ALIAS, null);

        if (!(entry instanceof KeyStore.PrivateKeyEntry)) {
            throw new IllegalStateException(
                    "Cihaz kimlik anahtarı oluşturulamadı."
            );
        }

        return (KeyStore.PrivateKeyEntry) entry;
    }

    // =====================================================
    // BASE64 VALIDATION
    // =====================================================

    private byte[] decodeBase64(String value, int maxLength)
            throws Exception {

        if (value == null
                || value.isEmpty()
                || value.length() > maxLength
                || value.length() % 4 != 0
                || !value.matches("[A-Za-z0-9+/]*={0,2}")) {

            throw new IllegalArgumentException(
                    "Geçersiz veya kanonik olmayan Base64 verisi."
            );
        }

        byte[] decoded = Base64.decode(value, Base64.DEFAULT);

        String canonical = Base64.encodeToString(
                decoded,
                Base64.NO_WRAP
        );

        if (!canonical.equals(value)) {
            java.util.Arrays.fill(decoded, (byte) 0);

            throw new IllegalArgumentException(
                    "Base64 verisi kanonik biçimde değil."
            );
        }

        return decoded;
    }

    // =====================================================
    // DEVICE IDENTITY PUBLIC KEY
    // =====================================================

    @ReactMethod
    public void getOrCreateIdentityPublicKey(Promise promise) {

        try {
            KeyStore.PrivateKeyEntry entry = getOrCreateIdentity();

            PublicKey publicKey =
                    entry.getCertificate().getPublicKey();

            String encoded = Base64.encodeToString(
                    publicKey.getEncoded(),
                    Base64.NO_WRAP
            );

            promise.resolve(encoded);

        } catch (Exception e) {
            promise.reject(
                    "IDENTITY_KEY_CREATE_FAILED",
                    "Cihaz kimlik anahtarı oluşturulamadı.",
                    e
            );
        }
    }

    // =====================================================
    // DEVICE FINGERPRINT
    // SHA-256 + HEX
    // Backend ile aynı format
    // =====================================================

    @ReactMethod
    public void getIdentityFingerprint(
            String publicKeyBase64,
            Promise promise
    ) {

        byte[] encodedKey = null;
        byte[] hash = null;

        try {
            encodedKey = decodeBase64(
                    publicKeyBase64,
                    4096
            );

            if (encodedKey.length == 0) {
                throw new IllegalArgumentException(
                        "Açık anahtar boş."
                );
            }

            KeyFactory keyFactory = KeyFactory.getInstance("EC");

            PublicKey publicKey = keyFactory.generatePublic(
                    new X509EncodedKeySpec(encodedKey)
            );

            if (!"EC".equalsIgnoreCase(publicKey.getAlgorithm())) {
                throw new IllegalArgumentException(
                        "Cihaz açık anahtarı EC türünde olmalıdır."
                );
            }

            java.security.MessageDigest digest =
                    java.security.MessageDigest.getInstance("SHA-256");

            hash = digest.digest(encodedKey);

            StringBuilder hex =
                    new StringBuilder(hash.length * 2);

            for (byte value : hash) {
                hex.append(String.format(
                        java.util.Locale.ROOT,
                        "%02x",
                        value & 0xff
                ));
            }

            promise.resolve(hex.toString());

        } catch (Exception e) {
            promise.reject(
                    "IDENTITY_FINGERPRINT_FAILED",
                    "Cihaz parmak izi hesaplanamadı.",
                    e
            );

        } finally {
            if (encodedKey != null) {
                java.util.Arrays.fill(encodedKey, (byte) 0);
            }

            if (hash != null) {
                java.util.Arrays.fill(hash, (byte) 0);
            }
        }
    }

    // =====================================================
    // HANDSHAKE SIGNATURE
    // SHA256withECDSA
    // =====================================================

    @ReactMethod
    public void signHandshake(
            String payloadBase64,
            Promise promise
    ) {

        byte[] payload = null;
        byte[] signature = null;

        try {
            payload = decodeBase64(
                    payloadBase64,
                    MAX_PAYLOAD_LENGTH * 2
            );

            if (payload.length == 0
                    || payload.length > MAX_PAYLOAD_LENGTH) {

                throw new IllegalArgumentException(
                        "Handshake verisi geçersiz."
                );
            }

            KeyStore.PrivateKeyEntry entry =
                    getOrCreateIdentity();

            Signature signer =
                    Signature.getInstance("SHA256withECDSA");

            signer.initSign(entry.getPrivateKey());
            signer.update(payload);

            signature = signer.sign();

            promise.resolve(
                    Base64.encodeToString(
                            signature,
                            Base64.NO_WRAP
                    )
            );

        } catch (Exception e) {
            promise.reject(
                    "HANDSHAKE_SIGN_FAILED",
                    "Handshake imzalanamadı.",
                    e
            );

        } finally {
            if (payload != null) {
                java.util.Arrays.fill(payload, (byte) 0);
            }

            if (signature != null) {
                java.util.Arrays.fill(signature, (byte) 0);
            }
        }
    }

    // =====================================================
    // SIGNATURE VERIFICATION
    // =====================================================

    @ReactMethod
    public void verifySignature(
            String publicKeyBase64,
            String payloadBase64,
            String signatureBase64,
            Promise promise
    ) {

        byte[] publicKeyBytes = null;
        byte[] payload = null;
        byte[] signatureBytes = null;

        try {
            publicKeyBytes = decodeBase64(
                    publicKeyBase64,
                    4096
            );

            payload = decodeBase64(
                    payloadBase64,
                    MAX_PAYLOAD_LENGTH * 2
            );

            signatureBytes = decodeBase64(
                    signatureBase64,
                    1024
            );

            if (payload.length == 0
                    || payload.length > MAX_PAYLOAD_LENGTH) {

                throw new IllegalArgumentException(
                        "İmza doğrulama verisi geçersiz."
                );
            }

            KeyFactory keyFactory =
                    KeyFactory.getInstance("EC");

            PublicKey publicKey = keyFactory.generatePublic(
                    new X509EncodedKeySpec(publicKeyBytes)
            );

            if (!(publicKey instanceof
                    java.security.interfaces.ECPublicKey)) {

                throw new IllegalArgumentException(
                        "Cihaz kimlik anahtarı EC türünde değil."
                );
            }

            java.security.interfaces.ECPublicKey ecPublicKey =
                    (java.security.interfaces.ECPublicKey) publicKey;

            java.security.spec.ECParameterSpec params =
                    ecPublicKey.getParams();

            if (params == null
                    || params.getCurve().getField().getFieldSize() != 256
                    || params.getOrder().bitLength() != 256) {

                throw new IllegalArgumentException(
                        "Cihaz kimlik anahtarı P-256 değil."
                );
            }

            Signature verifier =
                    Signature.getInstance("SHA256withECDSA");

            verifier.initVerify(publicKey);
            verifier.update(payload);

            promise.resolve(
                    verifier.verify(signatureBytes)
            );

        } catch (Exception e) {
            promise.reject(
                    "SIGNATURE_VERIFY_FAILED",
                    "İmza doğrulanamadı.",
                    e
            );

        } finally {
            if (publicKeyBytes != null) {
                java.util.Arrays.fill(publicKeyBytes, (byte) 0);
            }

            if (payload != null) {
                java.util.Arrays.fill(payload, (byte) 0);
            }

            if (signatureBytes != null) {
                java.util.Arrays.fill(signatureBytes, (byte) 0);
            }
        }
    }

    // =====================================================
    // SECURE RANDOM GENERATOR
    // =====================================================

    @ReactMethod
    public void getSecureRandomBytes(
            int length,
            Promise promise
    ) {

        if (length < 1 || length > 1024) {
            promise.reject(
                    "SECURE_RANDOM_INVALID_LENGTH",
                    "Rastgele veri uzunluğu geçersiz."
            );

            return;
        }

        byte[] randomBytes = new byte[length];

        try {
            SECURE_RANDOM.nextBytes(randomBytes);

            String encoded = Base64.encodeToString(
                    randomBytes,
                    Base64.NO_WRAP
            );

            promise.resolve(encoded);

        } catch (Exception e) {
            promise.reject(
                    "SECURE_RANDOM_FAILED",
                    "Güvenli rastgele veri üretilemedi.",
                    e
            );

        } finally {
            java.util.Arrays.fill(randomBytes, (byte) 0);
        }
    }

    // =====================================================
    // SHA-256 BASE64
    // =====================================================

    @ReactMethod
    public void sha256Base64(
            String payloadBase64,
            Promise promise
    ) {

        byte[] payload = null;
        byte[] hash = null;

        try {
            payload = decodeBase64(
                    payloadBase64,
                    MAX_PAYLOAD_LENGTH * 2
            );

            if (payload.length == 0
                    || payload.length > MAX_PAYLOAD_LENGTH) {

                throw new IllegalArgumentException(
                        "Transcript verisi geçersiz."
                );
            }

            java.security.MessageDigest digest =
                    java.security.MessageDigest.getInstance("SHA-256");

            hash = digest.digest(payload);

            promise.resolve(
                    Base64.encodeToString(
                            hash,
                            Base64.NO_WRAP
                    )
            );

        } catch (Exception e) {
            promise.reject(
                    "E2EE_TRANSCRIPT_HASH_FAILED",
                    "Handshake transcript özeti üretilemedi.",
                    e
            );

        } finally {
            if (payload != null) {
                java.util.Arrays.fill(payload, (byte) 0);
            }

            if (hash != null) {
                java.util.Arrays.fill(hash, (byte) 0);
            }
        }
    }
}
