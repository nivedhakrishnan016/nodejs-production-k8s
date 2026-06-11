# Career Objective

To build a career as a DevOps Engineer by creating reliable, secure, and scalable cloud infrastructure while continuously improving my skills in AWS, Kubernetes, CI/CD, and automation.

# Node.js Production Deployment on AWS EKS

## Overview

This project demonstrates a production-ready deployment setup for a stateless Node.js application on AWS EKS.

The solution includes:

* Production-ready Docker image
* Jenkins CI/CD pipeline
* Helm-based Kubernetes deployment
* Ingress configuration
* Horizontal Pod Autoscaler (HPA)
* Prometheus monitoring integration
* ELK logging integration

## Architecture Decisions

### Docker

I used a multi-stage Docker build to keep the final image small and include only the files required to run the application.

Additional improvements include:

* Non-root container user
* Health check support
* Lightweight Alpine-based image

### Helm

I chose Helm instead of raw Kubernetes manifests because it simplifies deployment management and makes configuration changes easier across environments.

### CI/CD

The Jenkins pipeline performs the following steps:

1. Checkout source code
2. Install dependencies
3. Run tests
4. Build Docker image
5. Run security scan
6. Push image to Amazon ECR
7. Deploy using Helm

## Assumptions

* AWS EKS cluster already exists.
* Jenkins has access to AWS credentials.
* An Amazon ECR repository is available.
* The application exposes a health endpoint.
* DNS configuration for ingress is managed separately.
* Live deployment was not performed as part of this assignment.

## Repository Structure

```text
nodejs-production-k8s/
│
├── Dockerfile
├── Jenkinsfile
├── README.md
│
├── helm/
│   └── nodejs-api/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
│           ├── deployment.yaml
│           ├── service.yaml
│           ├── ingress.yaml
│           ├── hpa.yaml
│           ├── servicemonitor.yaml
│           ├── _helpers.tpl
│           └── NOTES.txt
│
└── docs/
    └── architecture-diagram.png
```

## Deployment Components

The Helm chart contains the following resources:

* Deployment
* Service
* Ingress
* Horizontal Pod Autoscaler (HPA)
* ServiceMonitor

The application container port is configured with the required name:

```yaml
name: api-web
```

## Monitoring and Logging

### Monitoring

Prometheus is used for collecting application metrics, and Grafana can be used to visualize those metrics through dashboards.

### Logging

Application logs can be forwarded to the ELK stack using Filebeat or Fluent Bit.

Components:

* Elasticsearch
* Logstash
* Kibana

## Assignment Note

As specified in the assignment, a live deployment to AWS EKS was not performed.

The Helm chart, Jenkins pipeline, and ECR configuration are provided as production-ready templates and can be deployed in an existing AWS environment with minimal changes.

## Limitations

* AWS infrastructure was not provisioned as part of this assignment.
* Grafana dashboards were not created.
* ELK components were not deployed.
* The application source code was assumed to be production-ready.

## Future Improvements

For a real production environment, I would additionally:

* Use AWS Secrets Manager for secrets management
* Implement GitOps using ArgoCD
* Configure Alertmanager notifications
* Add automated rollback for failed deployments
* Enable image signing and verification

## Setup Instructions

### Build Docker Image

```bash
docker build -t nodejs-api .
```

### Deploy Using Helm

```bash
helm install nodejs-api ./helm/nodejs-api
```

### Upgrade Deployment

```bash
helm upgrade nodejs-api ./helm/nodejs-api
```

### Uninstall Deployment

```bash
helm uninstall nodejs-api
```
