# =============================================================================
# Stage 1 — Builder
# Installs all dependencies (including devDependencies) and runs the build.
# This stage is discarded after the build; it never reaches production.
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first.
# Docker caches this layer separately — npm ci only re-runs when package
# files actually change, which significantly speeds up repeat builds.
COPY package*.json ./

# npm ci is preferred over npm install in CI/CD:
#   - Installs exact versions from package-lock.json
#   - Fails if lock file is out of sync (catches drift early)
#   - Faster and more deterministic than npm install
RUN npm ci

# Copy the rest of the source after installing dependencies
COPY . .

# Run the build step (transpile, bundle, etc.)
RUN npm run build


# =============================================================================
# Stage 2 — Production
# A minimal, hardened image containing only what is needed to run the service.
# =============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Create a dedicated non-root system user and group.
# Running as root inside a container is a serious security risk — if the
# process is compromised, the attacker gains root on the host node.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only the runtime artefacts from the builder stage.
# devDependencies and build tooling are intentionally excluded.
COPY --from=builder /app/package*.json    ./
COPY --from=builder /app/node_modules     ./node_modules
COPY --from=builder /app/src              ./src

# Drop privileges — all subsequent instructions and the CMD run as appuser
USER appuser

# Document the port the service listens on (does not publish it)
EXPOSE 3000

# Native Docker health check.
# Kubernetes also has its own liveness/readiness probes, but this check is
# useful when running the container outside of Kubernetes (e.g. locally).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Use exec form (JSON array) — avoids spawning a shell, so SIGTERM is
# delivered directly to the Node.js process for graceful shutdown.
CMD ["node", "src/index.js"]
