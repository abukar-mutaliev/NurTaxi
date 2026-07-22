{{- define "nurtaxi-backend.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "nurtaxi-backend.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "nurtaxi-backend.labels" -}}
app.kubernetes.io/name: {{ include "nurtaxi-backend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}

{{- define "nurtaxi-backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "nurtaxi-backend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
