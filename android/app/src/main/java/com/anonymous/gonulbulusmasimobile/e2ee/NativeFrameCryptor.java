package com.anonymous.gonulbulusmasimobile.e2ee;

import org.webrtc.E2EESession;
import org.webrtc.FrameDecryptor;
import org.webrtc.FrameEncryptor;

/**
 * Native WebRTC frame cryptor adapter.
 *
 * Actual encryption and decryption are implemented by E2EESession
 * in the custom WebRTC AAR.
 */
public final class NativeFrameCryptor
        implements FrameEncryptor, FrameDecryptor, AutoCloseable {

    private final E2EESession session;
    private boolean closed = false;

    public NativeFrameCryptor() {
        this.session = new E2EESession();
    }

    public synchronized byte[] getPublicKey() {
        ensureOpen();
        return session.getPublicKey();
    }

    public synchronized boolean initialize(
            byte[] peerPublicKey,
            byte[] salt,
            byte[] transcriptHash,
            boolean isInitiator
    ) {
        ensureOpen();

        if (peerPublicKey == null
                || salt == null
                || transcriptHash == null) {
            throw new IllegalArgumentException(
                    "E2EE anahtar malzemeleri eksik."
            );
        }

        if (peerPublicKey.length != 32
                || salt.length != 32
                || transcriptHash.length != 32) {
            throw new IllegalArgumentException(
                    "E2EE anahtar malzemeleri 32 byte olmalı."
            );
        }

        return session.initialize(
                peerPublicKey,
                salt,
                transcriptHash,
                isInitiator
        );
    }

    @Override
    public synchronized long getNativeFrameEncryptor() {
        ensureOpen();
        return session.getNativeFrameEncryptor();
    }

    @Override
    public synchronized long getNativeFrameDecryptor() {
        ensureOpen();
        return session.getNativeFrameDecryptor();
    }

    private void ensureOpen() {
        if (closed) {
            throw new IllegalStateException(
                    "E2EE cryptor oturumu kapatılmış."
            );
        }
    }

    @Override
    public synchronized void close() {
        if (closed) {
            return;
        }

        closed = true;
        session.close();
    }
}
