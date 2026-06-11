# Career Objective

To establish myself as a skilled DevOps and Cloud Infrastructure Engineer by designing and
operating production-grade, cloud-native systems on Kubernetes — combining strong fundamentals
in CI/CD, containerisation, observability, and security to deliver reliable platforms that
engineering teams can build on confidently.

---

# nodejs-production-api

A production-ready, stateless Node.js REST API containerised with Docker and deployed to
AWS EKS using Helm. The project includes a Jenkins CI/CD pipeline with Trivy image scanning,
AWS ECR as the container registry, and full observability through Prometheus, Grafana, and
the ELK Stack (Elasticsearch, Logstash, Kibana).

---

## Repository Structure

```
nodejs-production-api/
├── src/
│   └── index.js                          # Express application
├── tests/
│   └── app.test.js                       # Jest unit and integration tests
├── helm-chart/
│   ├── Chart.yaml                        # Helm chart metadata
│   ├── values.yaml                       # Default configuration values
│   └── templates/
│       ├── deployment.yaml               # Kubernetes Deployment
│       ├── service.yaml                  # Kubernetes Service
│       ├── ingress.yaml                  # Kubernetes Ingress
│       ├── hpa.yaml                      # Horizontal Pod Autoscaler
│       ├── configmap.yaml                # Environment variable config
│       └── servicemonitor.yaml           # Prometheus ServiceMonitor
├── monitoring/
│   ├── prometheus.yaml                   # Prometheus deployment + RBAC
│   └── grafana.yaml                      # Grafana deployment + Ingress
├── elk/
│   ├── namespace.yaml                    # Logging namespace
│   ├── elasticsearch.yaml                # Elasticsearch StatefulSet
│   ├── logstash.yaml                     # Logstash Deployment + pipeline
│   ├── filebeat.yaml                     # Filebeat DaemonSet (log collector)
│   └── kibana.yaml                       # Kibana Deployment + Ingress
├── Dockerfile                            # Multi-stage production build
├── .dockerignore
├── .gitignore
├── Jenkinsfile                           # CI/CD pipeline definition
└── package.json
```

---

## Architectural Decisions

### Docker — Multi-Stage Build

The original Dockerfile had several issues that make it unsuitable for production:

| Issue | Original | Fixed |
|---|---|---|
| Unpinned base image | `node:latest` | `node:20-alpine` |
| Runs as root | No user specified | Dedicated `appuser` created |
| No layer caching | `COPY . .` before `npm install` | `package.json` copied first |
| Uses `npm install` | Non-deterministic | `npm ci` for reproducible installs |
| Single stage | Everything in one image | Two stages — builder and production |
| No health check | Missing | `HEALTHCHECK` instruction added |

A two-stage build is used so that build tooling, dev dependencies, and intermediate
artefacts never reach the production image. The final image contains only the runtime
files, keeping it small and minimising the attack surface.

### Container Registry — AWS ECR

AWS Elastic Container Registry (ECR) is used instead of Docker Hub because:

- **Same AWS account** — EKS pulls from ECR without any external credentials; IAM roles
  handle authentication natively, eliminating long-lived registry passwords
- **Private by default** — images are never publicly accessible
- **Integrated scanning** — ECR has built-in vulnerability scanning powered by Amazon
  Inspector (and we also run Trivy in the pipeline before the push)
- **No rate limits** — Docker Hub enforces pull rate limits on free accounts;
  ECR has no such restriction, which matters for production workloads

ECR image URL format:
```
<aws-account-id>.dkr.ecr.<region>.amazonaws.com/<repository-name>:<tag>
```

### CI/CD — Jenkins Pipeline

The `Jenkinsfile` defines a seven-stage pipeline:

| Stage | Description |
|---|---|
| Checkout | Pulls the latest source from SCM |
| Install Dependencies | Runs `npm ci` for a clean, lock-file-based install |
| Run Tests | Executes the Jest test suite; pipeline fails fast if tests fail |
| Build Docker Image | Builds and tags the image with the Jenkins build number |
| Image Scan (Trivy) | Scans the built image for CRITICAL CVEs before pushing |
| Push to ECR | Authenticates via AWS credentials and pushes both tags |
| Deploy to EKS | Runs `helm upgrade --install` with `--atomic` for safe rollout |

**Why Trivy?**
Trivy is an open-source vulnerability scanner by Aqua Security. It scans the Docker image
for known CVEs in OS packages and application libraries. The pipeline is configured with
`--exit-code 1 --severity CRITICAL` — if any critical vulnerability is found, the pipeline
stops and the image is never pushed to ECR. This ensures no vulnerable images ever reach
the cluster.

The `--atomic` flag on the Helm deploy step ensures that a failed deployment
automatically rolls back, preventing a broken release from staying in the cluster.

### Kubernetes — Helm Chart

Helm was chosen over raw Kubernetes manifests because:

- **Templating** — a single chart works across dev, staging, and production by
  overriding values at deploy time
- **Versioned releases** — every `helm upgrade` is tracked and can be rolled back
  with a single command (`helm rollback`)
- **Atomic deployments** — the `--atomic` flag rolls back automatically on failure

Key configuration decisions:

- **Port named `api-web`** — the container port is explicitly named `api-web` in the
  Deployment, Service, and Ingress as required by the assignment specification
- **Rolling update strategy** — `maxUnavailable: 0` ensures the deployment never drops
  below the desired replica count during an update
- **HorizontalPodAutoscaler** — automatically scales between 2 and 10 replicas based
  on CPU utilisation (threshold: 70%)
- **Liveness probe** — Kubernetes restarts a container that stops responding on `/health`
- **Readiness probe** — traffic is only routed to a pod once it passes `/health`,
  preventing requests from reaching pods that are still warming up
- **ConfigMap** — environment variables are decoupled from the image, making it easy
  to change configuration without rebuilding

### Metrics and Monitoring — Prometheus and Grafana

- The Node.js API exposes a `/metrics` endpoint in Prometheus text format
- A `ServiceMonitor` resource (Prometheus Operator CRD) is included in the Helm chart
  so that Prometheus automatically discovers and scrapes the service
- Grafana is provisioned with Prometheus as the default data source via a ConfigMap,
  removing the need to configure it manually after deployment
- Both components are deployed to a dedicated `monitoring` namespace

### Logging and APM — ELK Stack

The ELK Stack is deployed to a dedicated `logging` namespace:

| Component | Role |
|---|---|
| **Filebeat** | DaemonSet — runs on every EKS node, collects container log files and ships to Logstash |
| **Logstash** | Receives log events, parses JSON, enriches with metadata, forwards to Elasticsearch |
| **Elasticsearch** | StatefulSet — stores all log data on a persistent volume (AWS `gp2`) |
| **Kibana** | Web UI — search, filter, and visualise logs; exposed via Ingress |

A StatefulSet is used for Elasticsearch (rather than a Deployment) because it requires
stable network identities and durable storage that survives pod restarts.

---

## Assumptions

- An AWS EKS cluster is already provisioned and `kubectl` is configured to reach it
- An AWS ECR repository named `nodejs-production-api` already exists in the target region
- The Jenkins agent has Docker, Trivy, AWS CLI, `kubectl`, and Helm installed
- An NGINX Ingress Controller is installed in the cluster
- The Prometheus Operator is installed for `ServiceMonitor` CRD support
- The `gp2` storage class is available in EKS (it is the AWS default)

---

## Setup Instructions

### 1. Create the ECR Repository (one-time setup)

```bash
aws ecr create-repository \
  --repository-name nodejs-production-api \
  --region ap-south-1
```

This gives you a URL like:
```
123456789012.dkr.ecr.ap-south-1.amazonaws.com/nodejs-production-api
```

Update this URL in `helm-chart/values.yaml` → `image.repository`.

### 2. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/nodejs-production-api.git
cd nodejs-production-api
```

### 3. Run the application locally

```bash
npm install
npm test      # Run tests
npm start     # Start the server on http://localhost:3000
```

### 4. Build and scan the Docker image locally

```bash
# Build
docker build -t nodejs-production-api:local .

# Scan for vulnerabilities (install Trivy: https://aquasecurity.github.io/trivy)
trivy image --severity CRITICAL nodejs-production-api:local

# Run locally
docker run -p 3000:3000 nodejs-production-api:local
```

### 5. Push to ECR manually (optional — Jenkins does this automatically)

```bash
# Authenticate
aws ecr get-login-password --region ap-south-1 \
  | docker login --username AWS --password-stdin \
    123456789012.dkr.ecr.ap-south-1.amazonaws.com

# Tag and push
docker tag nodejs-production-api:local \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com/nodejs-production-api:latest

docker push \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com/nodejs-production-api:latest
```

### 6. Deploy to Kubernetes with Helm

```bash
# Confirm kubectl is pointing at the correct cluster
kubectl config current-context

# Deploy
helm upgrade --install nodejs-api ./helm-chart \
  --namespace production \
  --create-namespace \
  --set image.repository=123456789012.dkr.ecr.ap-south-1.amazonaws.com/nodejs-production-api \
  --set image.tag=latest

# Verify
kubectl get pods    -n production
kubectl get svc     -n production
kubectl get ingress -n production
```

### 7. Deploy the monitoring stack

```bash
kubectl apply -f monitoring/prometheus.yaml
kubectl apply -f monitoring/grafana.yaml
# Grafana UI → http://grafana.yourdomain.com  (admin / admin123)
```

### 8. Deploy the ELK Stack

```bash
kubectl apply -f elk/namespace.yaml
kubectl apply -f elk/elasticsearch.yaml
kubectl apply -f elk/logstash.yaml
kubectl apply -f elk/filebeat.yaml
kubectl apply -f elk/kibana.yaml
# Kibana UI → http://kibana.yourdomain.com
```

### 9. Jenkins Setup

1. Install Jenkins with the **Pipeline**, **Docker Pipeline**, **AWS Credentials**,
   and **Kubernetes CLI** plugins
2. Add the following credentials in **Manage Jenkins → Credentials**:

| Credential ID | Type | Value |
|---|---|---|
| `aws-account-id` | Secret Text | Your AWS account ID (12-digit number) |
| `aws-ecr-credentials` | AWS Credentials | IAM access key + secret key with ECR permissions |
| `eks-kubeconfig` | Secret File | Your EKS kubeconfig file |

3. Create a new **Pipeline** job and point it at this repository
4. Jenkins auto-detects the `Jenkinsfile` and runs the full pipeline on each push

---

## API Endpoints

| Method | Endpoint   | Description                             |
|--------|------------|-----------------------------------------|
| GET    | `/`        | Service metadata (name, version, env)   |
| GET    | `/health`  | Liveness and readiness probe target     |
| GET    | `/metrics` | Prometheus metrics in text format       |

---

## Environment Variables

| Variable    | Default        | Description                         |
|-------------|----------------|-------------------------------------|
| `PORT`      | `3000`         | Port the HTTP server listens on     |
| `NODE_ENV`  | `development`  | Runtime environment                 |
| `LOG_LEVEL` | `info`         | Application log verbosity           |
