terraform {
  required_version = ">= 1.6.0"
  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = "~> 0.141"
    }
  }
}

variable "cloud_region" {
  description = "Российская зона размещения (FZ-01.1)"
  type        = string
  default     = "ru-central1-a"
}

variable "folder_id" {
  type    = string
  default = ""
}

variable "cloud_id" {
  type    = string
  default = ""
}

provider "yandex" {
  cloud_id  = var.cloud_id
  folder_id = var.folder_id
  zone      = var.cloud_region
}

# Сеть, кластер, управляемая PostgreSQL, Object Storage и Container Registry
# создаются только при заданных cloud_id/folder_id. Это каркас C0.2: смена
# оператора ЦОД (B.6) не требует переписывать приложение.

resource "yandex_vpc_network" "nurtaxi" {
  count = var.folder_id == "" ? 0 : 1
  name  = "nurtaxi"
}

resource "yandex_vpc_subnet" "nurtaxi" {
  count          = var.folder_id == "" ? 0 : 1
  name           = "nurtaxi-${var.cloud_region}"
  zone           = var.cloud_region
  network_id     = yandex_vpc_network.nurtaxi[0].id
  v4_cidr_blocks = ["10.10.0.0/16"]
}

output "region" {
  value = var.cloud_region
}

output "note" {
  value = "Кластер, БД и бакеты включаются после выдачи folder_id оператора ЦОД (B.6)."
}
