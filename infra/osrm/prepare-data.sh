#!/usr/bin/env bash
# Скачивает OSM-данные СКФО (Ингушетия и соседние регионы) и готовит их для OSRM.
# Запуск из корня репозитория:
#   bash infra/osrm/prepare-data.sh
# После подготовки:
#   docker compose --profile osrm up -d osrm

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/data"
DATASET_NAME="north-caucasus-fed-district-latest.osm.pbf"
DATASET_PATH="${DATA_DIR}/${DATASET_NAME}"
DOWNLOAD_URL="https://download.geofabrik.de/russia/${DATASET_NAME}"
OSRM_IMAGE="ghcr.io/project-osrm/osrm-backend"

mkdir -p "${DATA_DIR}"

if [[ ! -f "${DATASET_PATH}" ]]; then
  echo "Downloading ${DOWNLOAD_URL} ..."
  curl -L -o "${DATASET_PATH}" "${DOWNLOAD_URL}"
else
  echo "Dataset already exists: ${DATASET_PATH}"
fi

run_osrm() {
  docker run --rm -t -v "${DATA_DIR}:/data" "${OSRM_IMAGE}" "$@"
}

echo "Running osrm-extract ..."
run_osrm osrm-extract -p /opt/car.lua "/data/${DATASET_NAME}"

echo "Running osrm-partition ..."
run_osrm osrm-partition "/data/${DATASET_NAME}"

echo "Running osrm-customize ..."
run_osrm osrm-customize "/data/${DATASET_NAME}"

echo "OSRM data is ready."
echo "Start routing server: docker compose --profile osrm up -d osrm"
echo "Backend env: MAP_ROUTING_PROVIDER=osrm OSRM_BASE_URL=http://localhost:5001"
