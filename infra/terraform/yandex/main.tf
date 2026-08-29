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

# Управляемая PostgreSQL в РФ: основное и реплика, ночное окно бэкапа, 14 дней хранения (C0.3, C3.4).
resource "yandex_mdb_postgresql_cluster" "nurtaxi" {
  count       = var.folder_id == "" ? 0 : 1
  name        = "nurtaxi"
  environment = "PRODUCTION"
  network_id  = yandex_vpc_network.nurtaxi[0].id
  folder_id   = var.folder_id

  config {
    version = 15
    resources {
      resource_preset_id = "s2.micro"
      disk_type_id       = "network-ssd"
      disk_size          = 50
    }
    backup_window_start {
      hours   = 3
      minutes = 0
    }
    backup_retain_period_days = 14
  }

  host {
    zone             = var.cloud_region
    subnet_id        = yandex_vpc_subnet.nurtaxi[0].id
    assign_public_ip = false
  }

  host {
    zone             = var.cloud_region
    subnet_id        = yandex_vpc_subnet.nurtaxi[0].id
    assign_public_ip = false
  }
}

resource "yandex_storage_bucket" "backups" {
  count     = var.folder_id == "" ? 0 : 1
  bucket    = "nurtaxi-backups-${var.folder_id}"
  folder_id = var.folder_id
  max_size  = 1099511627776
  anonymous_access_flags {
    read = false
    list = false
  }
}

resource "yandex_storage_bucket" "logs" {
  count     = var.folder_id == "" ? 0 : 1
  bucket    = "nurtaxi-logs-${var.folder_id}"
  folder_id = var.folder_id
  anonymous_access_flags {
    read = false
    list = false
  }
}

output "region" {
  value = var.cloud_region
}

output "postgres_cluster_id" {
  value = try(yandex_mdb_postgresql_cluster.nurtaxi[0].id, null)
}

output "backup_bucket" {
  value = try(yandex_storage_bucket.backups[0].bucket, null)
}

output "note" {
  value = "Кластер PostgreSQL, реплика и бакеты бэкапов/логов создаются после выдачи folder_id (B.6)."
}
