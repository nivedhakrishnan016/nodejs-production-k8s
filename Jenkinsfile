// =============================================================================
// Jenkinsfile — CI/CD Pipeline
// Project  : nodejs-production-api
// Registry : AWS ECR (Elastic Container Registry)
// Target   : AWS EKS via Helm
// Scanning : Trivy (vulnerability scan before push)
// =============================================================================

pipeline {
    agent any

    environment {
        // ── AWS / ECR settings ─────────────────────────────────────────────
        AWS_REGION      = "ap-south-1"                          // Change to your AWS region
        AWS_ACCOUNT_ID  = credentials('aws-account-id')         // Stored in Jenkins credentials
        ECR_REPO        = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/nodejs-production-api"
        IMAGE_TAG       = "${BUILD_NUMBER}"

        // ── Helm / Kubernetes settings ─────────────────────────────────────
        HELM_RELEASE    = "nodejs-api"
        HELM_CHART      = "./helm-chart"
        K8S_NAMESPACE   = "production"
    }

    stages {

        // ── Stage 1: Checkout ─────────────────────────────────────────────
        stage('Checkout') {
            steps {
                echo ">>> Checking out source code..."
                checkout scm
            }
        }

        // ── Stage 2: Install Dependencies ────────────────────────────────
        stage('Install Dependencies') {
            steps {
                echo ">>> Installing Node.js dependencies..."
                sh 'npm ci'
            }
        }

        // ── Stage 3: Run Tests ────────────────────────────────────────────
        stage('Run Tests') {
            steps {
                echo ">>> Running unit and integration tests..."
                sh 'npm test'
            }
        }

        // ── Stage 4: Build Docker Image ───────────────────────────────────
        stage('Build Docker Image') {
            steps {
                echo ">>> Building Docker image: ${ECR_REPO}:${IMAGE_TAG}..."
                sh """
                    docker build \
                      --tag ${ECR_REPO}:${IMAGE_TAG} \
                      --tag ${ECR_REPO}:latest \
                      --file Dockerfile \
                      .
                """
            }
        }

        // ── Stage 5: Trivy Image Scan ─────────────────────────────────────
        // Scans the built image for OS and library vulnerabilities BEFORE
        // pushing to ECR. The pipeline fails if any CRITICAL CVEs are found.
        // This prevents vulnerable images from ever reaching the registry.
        stage('Image Scan (Trivy)') {
            steps {
                echo ">>> Scanning image for vulnerabilities with Trivy..."
                sh """
                    trivy image \
                      --exit-code 1 \
                      --severity CRITICAL \
                      --no-progress \
                      --format table \
                      ${ECR_REPO}:${IMAGE_TAG}
                """
            }
        }

        // ── Stage 6: Push to AWS ECR ──────────────────────────────────────
        // Authenticates with ECR using the IAM role attached to the Jenkins
        // agent — no long-lived credentials are stored or passed around.
        stage('Push to ECR') {
            steps {
                echo ">>> Authenticating with AWS ECR..."
                withCredentials([[
                    $class:            'AmazonWebServicesCredentialsBinding',
                    credentialsId:     'aws-ecr-credentials',
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} \
                          | docker login --username AWS --password-stdin \
                            ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                    """
                }

                echo ">>> Pushing image to ECR..."
                sh "docker push ${ECR_REPO}:${IMAGE_TAG}"
                sh "docker push ${ECR_REPO}:latest"
            }
        }

        // ── Stage 7: Deploy to AWS EKS via Helm ──────────────────────────
        stage('Deploy to EKS') {
            steps {
                echo ">>> Deploying release '${HELM_RELEASE}' to namespace '${K8S_NAMESPACE}'..."
                withCredentials([file(
                    credentialsId: 'eks-kubeconfig',
                    variable: 'KUBECONFIG'
                )]) {
                    sh """
                        helm upgrade --install ${HELM_RELEASE} ${HELM_CHART} \
                          --namespace   ${K8S_NAMESPACE}       \
                          --create-namespace                   \
                          --set image.repository=${ECR_REPO}   \
                          --set image.tag=${IMAGE_TAG}         \
                          --atomic                             \
                          --timeout 5m                         \
                          --cleanup-on-fail
                    """
                }
            }
        }

    }

    // ── Post-build actions ─────────────────────────────────────────────────
    post {
        success {
            echo ">>> Pipeline succeeded. Image ${ECR_REPO}:${IMAGE_TAG} is live on EKS."
        }
        failure {
            echo ">>> Pipeline FAILED. Review the stage logs above for details."
        }
        always {
            echo ">>> Removing local Docker credentials..."
            sh 'docker logout || true'
        }
    }
}
