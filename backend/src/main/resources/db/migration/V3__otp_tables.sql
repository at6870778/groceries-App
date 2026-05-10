-- OTP records: DB-backed, replaces in-memory ConcurrentHashMap
CREATE TABLE otp_records (
    id           BIGINT       PRIMARY KEY AUTO_INCREMENT,
    phone        VARCHAR(20)  NOT NULL,
    otp_hash     VARCHAR(255) NOT NULL,
    expires_at   TIMESTAMP    NOT NULL,
    attempt_count INT         NOT NULL DEFAULT 0,
    is_used      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_invalidated BOOLEAN    NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_records_phone_created ON otp_records(phone, created_at DESC);

-- Audit log: OTP request/verify events for fraud detection and compliance
CREATE TABLE otp_audit_logs (
    id           BIGINT       PRIMARY KEY AUTO_INCREMENT,
    phone        VARCHAR(20)  NOT NULL,
    event_type   VARCHAR(50)  NOT NULL,
    ip_address   VARCHAR(45),
    message      VARCHAR(500),
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_audit_phone_created ON otp_audit_logs(phone, created_at DESC);
