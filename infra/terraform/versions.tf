terraform {
  required_version = ">= 1.6.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.31"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.15"
    }
  }

  # Бэкенд состояния (заполнить под выбранного облачного провайдера).
  # backend "s3" {
  #   bucket = "nurtaxi-tf-state"
  #   key    = "staging/terraform.tfstate"
  #   region = "eu-central-1"
  # }
}
