# Career Objective

To build my career as a DevOps Engineer by working on cloud infrastructure, Kubernetes, CI/CD, and automation while continuously improving my technical skills.

# Production-Ready Node.js Deployment on AWS EKS

## Overview

This project demonstrates how a stateless Node.js application can be packaged, deployed, and managed in a production-style Kubernetes environment using AWS EKS.

The solution includes:

* Production-ready Docker image
* Jenkins CI/CD pipeline
* Helm-based deployment
* Kubernetes Ingress
* Horizontal Pod Autoscaler (HPA)
* Prometheus monitoring integration
* ELK logging integration

---

## Repository Structure

```text
nodejs-production-api/
├── src/
│   └── index.js
├── tests/
│   └── app.test.js
├── helm-chart/
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       ├── hpa.yaml
│       ├── configmap.yaml
│       └── servicemonitor.yaml
├── monitoring/
│   ├── prometheus.yaml
│   └── grafana.yaml
├── elk/
│   ├── elasticsearch.yaml
│   ├── logstash.yaml
│   ├── filebeat.yaml
│   └── kibana.yaml
├── Dockerfile
├── Jenkinsfile
└── README.md
```

---

## Architecture Decisions

### Docker

I used a multi-stage Docker build to keep the final image smaller and include only the files required to run the application.

The Docker image also includes:

* Non-root user
* Health check support
* Node.js Alpine base image

### AWS ECR

AWS ECR is used to store Docker images. It integrates well with EKS and supports private image repositories.

Example image URL:

```text
123456789012.dkr.ecr.ap-south-1.amazonaws.com/nodejs-production-api:latest
```

### Jenkins CI/CD

The Jenkins pipeline performs the following tasks:

1. Checkout source code
2. Install dependencies
3. Run tests
4. Build Docker image
5. Run Trivy security scan
6. Push image to ECR
7. Deploy using Helm

Trivy is used to scan Docker images for critical vulnerabilities before they are pushed to ECR.

### Helm

I chose Helm because it makes deployment management easier and allows configuration changes through values files without modifying manifests.

The Helm chart includes:

* Deployment
* Service
* Ingress
* Horizontal Pod Autoscaler
* ServiceMonitor

The application container port is configured with the required name:

```yaml
name: api-web
```

---

## Monitoring and Logging

### Monitoring

Prometheus is used to collect application metrics.

Grafana can be used to visualize those metrics through dashboards.

### Logging

Application logs can be forwarded to the ELK stack using Filebeat.

Components used:

* Elasticsearch
* Logstash
* Kibana

---

## Assumptions

* An AWS EKS cluster already exists.
* Jenkins has access to AWS credentials.
* An Amazon ECR repository is available.
* The application exposes a `/health` endpoint.
* An Ingress Controller is already installed in the cluster.
* Prometheus Operator is available for ServiceMonitor support.

---

## Assignment Note

As mentioned in the assignment, a live deployment to AWS EKS was not performed.

The Jenkins pipeline, Helm chart, and ECR configuration are provided as deployment-ready templates and can be used in an existing AWS environment.

---

## Setup Instructions

### Build Docker Image

```bash
docker build -t nodejs-production-api .
```

### Run Tests

```bash
npm test
```

### Deploy Using Helm

```bash
helm upgrade --install nodejs-api ./helm-chart
```

### Verify Deployment

```bash
kubectl get pods
kubectl get svc
kubectl get ingress
```

---

## API Endpoints

| Method | Endpoint | Purpose                 |
| ------ | -------- | ----------------------- |
| GET    | /        | Application information |
| GET    | /health  | Health check            |
| GET    | /metrics | Prometheus metrics      |

---

## Limitations

* AWS infrastructure was not provisioned as part of this assignment.
* Grafana dashboards were not created.
* ELK components were not deployed.
* The application source code was assumed to be production-ready.

---

## Future Improvements

If this were deployed in a real production environment, I would additionally:

* Use AWS Secrets Manager for secret management
* Implement GitOps using ArgoCD
* Configure Alertmanager notifications
* Add automated rollback workflows
* Enable image signing and verification
