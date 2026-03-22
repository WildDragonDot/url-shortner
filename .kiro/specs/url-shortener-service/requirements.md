# Requirements Document

## Introduction

A URL shortener service that converts long URLs into short, shareable 7-character base62 identifiers. The service exposes a REST API for creating short URLs and redirecting users to the original destination. It supports custom aliases, tracks redirect analytics, and is designed to handle high read throughput (8000 reads/s) with caching and horizontal scalability. The backend is built with TypeScript and Node.js, backed by PostgreSQL for persistence.

## Glossary

- **System**: The URL shortener service as a whole
- **API**: The HTTP REST interface exposed by the Node.js backend
- **Short_URL**: A 7-character base62 string uniquely identifying a long URL (characters: a-z, A-Z, 0-9)
- **Long_URL**: The original full URL submitted by the user
- **Alias**: A user-defined custom short identifier, up to 16 characters, composed of base62 characters
- **Encoder**: The component responsible for generating Short_URLs from Long_URLs
- **Redirect_Handler**: The component that resolves a Short_URL or Alias to a Long_URL and issues the HTTP redirect
- **Cache**: An in-memory LRU cache layer sitting in front of the database for read acceleration
- **Analytics_Emitter**: The component that publishes redirect events to the analytics pipeline
- **KGS**: Key Generation Service — a pre-generation strategy that produces unique Short_URLs offline and stores them in a pool
- **Base62**: The encoding alphabet consisting of characters [a-zA-Z0-9], yielding 62^7 ≈ 3.5 trillion unique keys

## Requirements

### Requirement 1: Create Short URL

**User Story:** As a developer or end user, I want to submit a long URL and receive a short URL, so that I can share compact links.

#### Acceptance Criteria

1. WHEN a POST request is made to `/create` with a valid Long_URL in the request body, THE API SHALL return a Short_URL and the original Long_URL in the response with HTTP 201.
2. WHEN a POST request is made to `/create`, THE Encoder SHALL generate a unique 7-character base62 Short_URL.
3. WHEN a POST request is made to `/create` with a Long_URL that already exists in the database, THE API SHALL return the existing Short_URL rather than creating a duplicate entry.
4. THE System SHALL store the mapping between Short_URL and Long_URL in PostgreSQL with a creation timestamp.
5. IF the Long_URL in the request body is missing or malformed (not a valid URL), THEN THE API SHALL return HTTP 400 with a descriptive error message.

### Requirement 2: Custom Alias

**User Story:** As a user, I want to provide a custom alias for my short URL, so that the link is human-readable and memorable.

#### Acceptance Criteria

1. WHEN a POST request to `/create` includes a custom `alias` field, THE API SHALL use that alias as the Short_URL identifier instead of a generated one.
2. THE System SHALL accept aliases composed only of base62 characters (a-z, A-Z, 0-9) with a maximum length of 16 characters.
3. IF the requested alias is already in use, THEN THE API SHALL return HTTP 409 with an error message indicating the alias is taken.
4. IF the requested alias contains characters outside the base62 alphabet or exceeds 16 characters, THEN THE API SHALL return HTTP 400 with a descriptive validation error.

### Requirement 3: URL Redirect

**User Story:** As a user clicking a short link, I want to be redirected to the original URL, so that I reach the intended destination.

#### Acceptance Criteria

1. WHEN a GET request is made to `/{short_url}` with a valid Short_URL or Alias, THE Redirect_Handler SHALL respond with HTTP 302 and a `Location` header set to the corresponding Long_URL.
2. WHEN a GET request is made to `/{short_url}`, THE Redirect_Handler SHALL first check the Cache before querying PostgreSQL.
3. WHEN a Short_URL is resolved from PostgreSQL, THE Cache SHALL store the mapping using LRU eviction policy for subsequent requests.
4. IF the Short_URL or Alias does not exist in the Cache or PostgreSQL, THEN THE Redirect_Handler SHALL return HTTP 404 with a descriptive error message.
5. THE System SHALL use HTTP 302 (temporary redirect) rather than HTTP 301 (permanent redirect) to ensure redirect requests always pass through the server for analytics tracking.

### Requirement 4: Caching

**User Story:** As a system operator, I want frequently accessed short URLs to be served from cache, so that read throughput scales to 8000 requests per second without overloading the database.

#### Acceptance Criteria

1. THE Cache SHALL hold up to a configurable maximum number of entries (default: sufficient to cover ~70GB of working set).
2. WHEN the Cache reaches its maximum capacity, THE Cache SHALL evict the least recently used entry to make room for a new one.
3. WHEN a Short_URL mapping is written to PostgreSQL, THE Cache SHALL be populated with the new mapping.
4. WHILE the Cache contains a mapping for a Short_URL, THE Redirect_Handler SHALL serve the redirect without querying PostgreSQL.

### Requirement 5: Analytics Tracking

**User Story:** As a service operator, I want every redirect event to be recorded, so that I can analyze usage patterns and traffic per short URL.

#### Acceptance Criteria

1. WHEN a redirect is successfully served, THE Analytics_Emitter SHALL publish a redirect event containing the Short_URL, timestamp, and request metadata (IP address, user-agent).
2. THE Analytics_Emitter SHALL publish events asynchronously so that analytics processing does not block the redirect response.
3. IF the analytics pipeline is unavailable, THEN THE Analytics_Emitter SHALL log the failure and allow the redirect to complete without error.

### Requirement 6: Key Generation

**User Story:** As a system architect, I want Short_URLs to be generated reliably without collisions, so that every short link is unique.

#### Acceptance Criteria

1. THE Encoder SHALL generate Short_URLs using one of the following strategies: random base62 sampling, counter-based base62 encoding, MD5 hash truncation, or KGS pre-generated key pool.
2. WHEN using random base62 generation, THE Encoder SHALL retry with a new random value IF a collision is detected in PostgreSQL (up to 5 retries).
3. WHEN using the KGS strategy, THE System SHALL pre-generate a pool of unique Short_URLs and mark each key as used upon assignment.
4. THE Encoder SHALL guarantee that no two Long_URLs are assigned the same Short_URL at the same time.

### Requirement 7: URL Expiration

**User Story:** As a user, I want to optionally set an expiration time on my short URL, so that the link becomes inactive after a defined period.

#### Acceptance Criteria

1. WHEN a POST request to `/create` includes an `expires_at` field (ISO 8601 datetime), THE System SHALL store the expiration timestamp alongside the URL mapping.
2. WHEN a GET request is made to `/{short_url}` and the mapping has an `expires_at` value in the past, THEN THE Redirect_Handler SHALL return HTTP 410 (Gone) with a descriptive message.
3. WHILE a URL mapping has not yet reached its `expires_at` timestamp, THE Redirect_Handler SHALL serve the redirect normally.

### Requirement 8: API Input Validation and Security

**User Story:** As a system operator, I want all API inputs to be validated and sanitized, so that the service is protected from malformed or malicious requests.

#### Acceptance Criteria

1. THE API SHALL validate that Long_URLs conform to the RFC 3986 URI standard before persisting them.
2. THE API SHALL enforce a maximum Long_URL length of 2048 characters.
3. IF a request body exceeds the defined size limit, THEN THE API SHALL return HTTP 413 with an error message.
4. THE API SHALL return all error responses in a consistent JSON structure containing `error` and `message` fields.

### Requirement 9: Health and Observability

**User Story:** As a system operator, I want health check and metrics endpoints, so that I can monitor service availability and performance.

#### Acceptance Criteria

1. THE API SHALL expose a `GET /health` endpoint that returns HTTP 200 with a JSON body indicating service status and database connectivity.
2. WHEN the PostgreSQL connection is unavailable, THE `GET /health` endpoint SHALL return HTTP 503 with a status indicating degraded service.
3. THE System SHALL log all incoming requests with method, path, status code, and response time.
