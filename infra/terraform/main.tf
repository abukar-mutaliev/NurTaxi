provider "kubernetes" {
  config_path    = var.kube_config_path
  config_context = var.kube_context != "" ? var.kube_context : null
}

provider "helm" {
  kubernetes {
    config_path    = var.kube_config_path
    config_context = var.kube_context != "" ? var.kube_context : null
  }
}

resource "kubernetes_namespace" "app" {
  metadata {
    name = var.namespace
    labels = {
      "app.kubernetes.io/part-of" = "nurtaxi"
      environment                 = var.environment
    }
  }
}

# Развёртывание backend через Helm chart из этого репозитория.
# Секреты (Secret nurtaxi-backend-secrets) создаются отдельно из Vault,
# не хранятся в состоянии Terraform (Des §14).
resource "helm_release" "backend" {
  name      = "nurtaxi"
  namespace = kubernetes_namespace.app.metadata[0].name
  chart     = "${path.module}/../helm/nurtaxi-backend"

  set {
    name  = "image.repository"
    value = split(":", var.backend_image)[0]
  }

  set {
    name  = "image.tag"
    value = split(":", var.backend_image)[1]
  }

  set {
    name  = "config.NODE_ENV"
    value = var.environment
  }
}
