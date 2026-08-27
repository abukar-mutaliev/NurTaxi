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

  # Состояние хранится в российском объектном хранилище выбранного оператора.
  # backend "s3" {
  #   bucket   = "nurtaxi-tf-state"
  #   key      = "staging/terraform.tfstate"
  #   region   = "ru-central-1"
  #   endpoint = "https://storage.yandexcloud.net"
  #   skip_region_validation      = true
  #   skip_credentials_validation = true
  # }
}
