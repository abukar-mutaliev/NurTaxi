variable "environment" {
  description = "Имя окружения (staging/production)"
  type        = string
  default     = "staging"
}

variable "kube_config_path" {
  description = "Путь к kubeconfig для доступа к кластеру"
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Контекст kubeconfig"
  type        = string
  default     = ""
}

variable "namespace" {
  description = "Namespace приложения в кластере"
  type        = string
  default     = "nurtaxi-staging"
}

variable "backend_image" {
  description = "Docker-образ backend (repository:tag)"
  type        = string
  default     = "ghcr.io/nurtaxi/nurtaxi-backend:0.1.0"
}
