# Security Guidelines

## 1. Secure Coding
Never trust client input. The server is the ultimate authority for all game logic and state.

## 2. Input Validation
Sanitize and validate all data crossing the network boundary. Disconnect clients sending malformed packets immediately.

## 3. Networking Security
* Prevent buffer overflows in packet parsing.
* Implement rate limiting on packet reception.

## 4. Cheat Prevention Philosophy
* **Server Authority**: Movement, combat, and inventory are resolved server-side.
* Avoid client-side trust models. Predict client-side, verify server-side.

## 5. Serialization Safety
Ensure deserialization routines strictly check buffer bounds and data validity.

## 6. Encryption Philosophy
Use secure connections (TLS/DTLS) for authentication, account management, and sensitive data transfers.
